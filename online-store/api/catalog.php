<?php
/**
 * api/catalog.php — Public Catalog API for Quantix Storefront Engine
 */

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__) . '/includes/tenant_resolver.php';
if (file_exists('/lamp/www/cfdadmin/lib/media_cdn.php')) {
    require_once '/lamp/www/cfdadmin/lib/media_cdn.php';
}

$tenant = StorefrontTenant::resolve();

if (!$tenant->isStoreActive) {
    http_response_code(403);
    echo json_encode([
        'Status' => 'ServiceInactive',
        'Error'  => 'El servicio Quantix Storefront no está activo para este emisor (Requiere QUANTIXFRONTSTORE = SI).'
    ], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
    exit;
}

$db = get_store_db();

function format_catalog_product($p, $mediaByProduct) {
    $pId = $p['ProductoID'];
    $cat = trim($p['categoria'] ?: 'General');
    $prodMedia = $mediaByProduct[$pId] ?? ['fotos' => [], 'docs' => []];
    $fotos = $prodMedia['fotos'];
    $docs = $prodMedia['docs'];

    // Fallback cover using full uncropped image
    $cover = !empty($p['CoverRuta']) 
        ? MediaCDNResolver::resolve($p['CoverRuta']) 
        : (!empty($p['CoverMiniatura']) ? MediaCDNResolver::resolveThumb($p['CoverMiniatura']) : 'https://media.evinux.net/no-image.svg');
    if (empty($fotos) && !empty($p['CoverRuta'])) {
        $fotos[] = [
            'id' => $p['CoverArchivoID'] ?? 'cover',
            'url' => MediaCDNResolver::resolve($p['CoverRuta']),
            'thumb' => MediaCDNResolver::resolveThumb($p['CoverRuta']),
            'isCover' => true
        ];
    }
    if (empty($fotos)) {
        $fotos[] = [
            'id' => 'placeholder',
            'url' => 'https://media.evinux.net/no-image.svg',
            'thumb' => 'https://media.evinux.net/no-image.svg',
            'isCover' => true
        ];
    }

    $unitPrice = (float)($p['valorUnitario'] ?: 0);
    $vatRate = (float)($p['IVAtasa'] ?: 16);
    if ($vatRate > 0 && $vatRate <= 1) {
        $vatRate = $vatRate * 100;
    }
    $iepsRate = (float)($p['IEPStasa'] ?: 0);
    if ($iepsRate > 0 && $iepsRate <= 1) {
        $iepsRate = $iepsRate * 100;
    }
    $priceWithTax = $unitPrice * (1 + $vatRate / 100) * (1 + $iepsRate / 100);

    $cleanDesc = trim(strip_tags(str_replace(['<br>', '<br/>', '<br />', '&nbsp;'], [' ', ' ', ' ', ' '], $p['descripcion'] ?? '')));

    $hasDecant = ($p['TieneDecant'] ?? 'SI') !== 'NO';
    $decantPrice = !empty($p['PrecioDecant']) ? (float)$p['PrecioDecant'] : round(max(150.0, min(350.0, $priceWithTax * 0.18)), 2);
    $auraColor = !empty($p['AuraColor']) ? $p['AuraColor'] : 'cyan';
    $auraParticles = !empty($p['AuraParticulas']) ? $p['AuraParticulas'] : 'breeze';
    $autoIsolate = ($p['AutoIsolate'] ?? 'SI') !== 'NO';
    $family = $p['FamiliaOlfativa'] ?? '';
    $accords = json_decode($p['AcordesPrincipales'] ?? '[]', true) ?: [];

    $radar = [
        'proyeccion'     => (int)($p['RadarProyeccion'] ?: 7),
        'longevidad'     => (float)($p['RadarLongevidad'] ?: 8.0),
        'elogios'        => (int)($p['RadarElogios'] ?: 85),
        'versatilidad'   => (int)($p['RadarVersatilidad'] ?: 75),
        'dulzorFrescura' => (int)($p['RadarDulzorFrescura'] ?? 0),
        'tempMin'        => (int)($p['RadarTempMin'] ?: 15),
        'tempMax'        => (int)($p['RadarTempMax'] ?: 30)
    ];

    return [
        'id'           => $p['ProductoID'],
        'code'         => $p['noIdentificacion'] ?? '',
        'sku'          => $p['SKU'] ?? '',
        'name'         => $cleanDesc,
        'category'     => $cat,
        'unit'         => $p['unidad'] ?: 'PIEZA',
        'unitPrice'    => $unitPrice,
        'vatRate'      => $vatRate,
        'iepsRate'     => $iepsRate,
        'priceWithTax' => round($priceWithTax, 2),
        'stock'        => (float)($p['stock'] ?? 0),
        'satKey'       => $p['ClaveProdServ'] ?? '',
        'notes'        => $p['Observaciones'] ?? '',
        'cover'        => $cover,
        'photos'       => $fotos,
        'docs'         => $docs,
        'storeStart'   => $p['TiendaInicio'] ?? null,
        'storeEnd'     => $p['TiendaFin'] ?? null,
        'hasDecant'    => $hasDecant,
        'decantPrice'  => $decantPrice,
        'auraColor'    => $auraColor,
        'auraParticles'=> $auraParticles,
        'autoIsolate'  => $autoIsolate,
        'family'       => $family,
        'accords'      => $accords,
        'radar'        => $radar
    ];
}

$action = $_GET['action'] ?? '';

// 1. AJAX Autocomplete & Search Endpoint (Scalable for 100,000+ products)
if ($action === 'search' || $action === 'autocomplete') {
    $q = trim($_GET['q'] ?? '');
    $limit = min(30, max(5, (int)($_GET['limit'] ?? 15)));
    $excludeId = trim($_GET['exclude_id'] ?? '');

    $sql = "
        SELECT p.ProductoID, p.noIdentificacion, p.SKU, p.descripcion, p.categoria,
               p.unidad, p.valorUnitario, p.IVAtasa, p.IEPStasa, p.cantidad as stock,
               p.ClaveProdServ, p.Observaciones, p.TiendaInicio, p.TiendaFin,
               pa.ArchivoID as CoverArchivoID,
               pa.RutaRelativa as CoverRuta,
               pa.RutaMiniatura as CoverMiniatura,
               ps.FamiliaOlfativa, ps.AcordesPrincipales, ps.TieneDecant, ps.PrecioDecant, ps.AuraColor, ps.AuraParticulas,
               ps.RadarProyeccion, ps.RadarLongevidad, ps.RadarElogios, ps.RadarVersatilidad, ps.RadarDulzorFrescura, ps.RadarTempMin, ps.RadarTempMax
        FROM productos p
        LEFT JOIN productos_archivos pa ON p.ProductoID = pa.ProductoID AND pa.EsPrincipal = 'SI' AND pa.Activo = 1
        LEFT JOIN productos_sensorial ps ON p.ProductoID = ps.ProductoID AND p.EmisorID = ps.EmisorID
        WHERE p.EmisorID = ? 
          AND (p.EnTiendaOnline = 'SI' OR p.EnTiendaOnline IS NULL)
          AND (p.TiendaInicio IS NULL OR p.TiendaInicio <= NOW())
          AND (p.TiendaFin IS NULL OR p.TiendaFin >= NOW())
    ";
    $params = [$tenant->emisorId];

    if (!empty($excludeId)) {
        $sql .= " AND p.ProductoID != ? ";
        $params[] = $excludeId;
    }

    if ($q !== '') {
        $sql .= " AND (p.descripcion LIKE ? OR p.SKU LIKE ? OR p.noIdentificacion LIKE ? OR p.ClaveProdServ LIKE ? OR p.categoria LIKE ?) ";
        $term = "%{$q}%";
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;

        $sql .= " ORDER BY (CASE WHEN p.descripcion LIKE ? THEN 1 WHEN p.SKU LIKE ? THEN 2 ELSE 3 END), p.descripcion ASC ";
        $params[] = "{$q}%";
        $params[] = "{$q}%";
    } else {
        $sql .= " ORDER BY p.descripcion ASC ";
    }

    $sql .= " LIMIT " . (int)$limit;

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rawProducts = $stmt->fetchAll();

    $matchedIds = array_column($rawProducts, 'ProductoID');
    $mediaByProduct = [];
    if (!empty($matchedIds)) {
        $inPlaceholders = implode(',', array_fill(0, count($matchedIds), '?'));
        $stmtMedia = $db->prepare("
            SELECT ArchivoID, ProductoID, TipoArchivo, RutaRelativa, RutaMiniatura, EsPrincipal, Orden, Descripcion
            FROM productos_archivos
            WHERE EmisorID = ? AND ProductoID IN ($inPlaceholders) AND Activo = 1
            ORDER BY TipoArchivo ASC, (EsPrincipal = 'SI') DESC, Orden ASC, FechaAlta DESC
        ");
        $stmtMedia->execute(array_merge([$tenant->emisorId], $matchedIds));
        $allMedia = $stmtMedia->fetchAll();

        foreach ($allMedia as $m) {
            $pId = $m['ProductoID'];
            if (!isset($mediaByProduct[$pId])) {
                $mediaByProduct[$pId] = ['fotos' => [], 'docs' => []];
            }
            if ($m['TipoArchivo'] === 'DOCUMENTO') {
                $mediaByProduct[$pId]['docs'][] = [
                    'id' => $m['ArchivoID'],
                    'url' => MediaCDNResolver::resolve($m['RutaRelativa']),
                    'title' => $m['Descripcion'] ?: 'Ficha Técnica'
                ];
            } else {
                $mediaByProduct[$pId]['fotos'][] = [
                    'id' => $m['ArchivoID'],
                    'url' => MediaCDNResolver::resolve($m['RutaRelativa']),
                    'thumb' => MediaCDNResolver::resolveThumb($m['RutaRelativa'], $m['RutaMiniatura']),
                    'isCover' => ($m['EsPrincipal'] === 'SI')
                ];
            }
        }
    }

    $products = [];
    foreach ($rawProducts as $p) {
        $products[] = format_catalog_product($p, $mediaByProduct);
    }

    echo json_encode([
        'Status'   => 'OK',
        'Query'    => $q,
        'Count'    => count($products),
        'Products' => $products
    ], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
    exit;
}

// 2. Single Product Fetch Endpoint
if ($action === 'get_product') {
    $id = trim($_GET['id'] ?? '');
    if (empty($id)) {
        http_response_code(400);
        echo json_encode(['Status' => 'Error', 'Error' => 'Missing product id'], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
        exit;
    }
    $stmt = $db->prepare("
        SELECT p.ProductoID, p.noIdentificacion, p.SKU, p.descripcion, p.categoria,
               p.unidad, p.valorUnitario, p.IVAtasa, p.IEPStasa, p.cantidad as stock,
               p.ClaveProdServ, p.Observaciones, p.TiendaInicio, p.TiendaFin,
               pa.ArchivoID as CoverArchivoID,
               pa.RutaRelativa as CoverRuta,
               pa.RutaMiniatura as CoverMiniatura,
               ps.FamiliaOlfativa, ps.AcordesPrincipales, ps.TieneDecant, ps.PrecioDecant, ps.AuraColor, ps.AuraParticulas,
               ps.RadarProyeccion, ps.RadarLongevidad, ps.RadarElogios, ps.RadarVersatilidad, ps.RadarDulzorFrescura, ps.RadarTempMin, ps.RadarTempMax
        FROM productos p
        LEFT JOIN productos_archivos pa ON p.ProductoID = pa.ProductoID AND pa.EsPrincipal = 'SI' AND pa.Activo = 1
        LEFT JOIN productos_sensorial ps ON p.ProductoID = ps.ProductoID AND p.EmisorID = ps.EmisorID
        WHERE p.EmisorID = ? AND p.ProductoID = ?
        LIMIT 1
    ");
    $stmt->execute([$tenant->emisorId, $id]);
    $p = $stmt->fetch();
    if (!$p) {
        http_response_code(404);
        echo json_encode(['Status' => 'NotFound', 'Error' => 'Product not found'], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmtMedia = $db->prepare("
        SELECT ArchivoID, ProductoID, TipoArchivo, RutaRelativa, RutaMiniatura, EsPrincipal, Orden, Descripcion
        FROM productos_archivos
        WHERE EmisorID = ? AND ProductoID = ? AND Activo = 1
        ORDER BY TipoArchivo ASC, (EsPrincipal = 'SI') DESC, Orden ASC, FechaAlta DESC
    ");
    $stmtMedia->execute([$tenant->emisorId, $id]);
    $allMedia = $stmtMedia->fetchAll();
    $mediaByProduct = [$id => ['fotos' => [], 'docs' => []]];
    foreach ($allMedia as $m) {
        if ($m['TipoArchivo'] === 'DOCUMENTO') {
            $mediaByProduct[$id]['docs'][] = [
                'id' => $m['ArchivoID'],
                'url' => MediaCDNResolver::resolve($m['RutaRelativa']),
                'title' => $m['Descripcion'] ?: 'Ficha Técnica'
            ];
        } else {
            $mediaByProduct[$id]['fotos'][] = [
                'id' => $m['ArchivoID'],
                'url' => MediaCDNResolver::resolve($m['RutaRelativa']),
                'thumb' => MediaCDNResolver::resolveThumb($m['RutaRelativa'], $m['RutaMiniatura']),
                'isCover' => ($m['EsPrincipal'] === 'SI')
            ];
        }
    }

    $formatted = format_catalog_product($p, $mediaByProduct);
    echo json_encode([
        'Status'  => 'OK',
        'Product' => $formatted
    ], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $stmt = $db->prepare("
        SELECT p.ProductoID, p.noIdentificacion, p.SKU, p.descripcion, p.categoria,
               p.unidad, p.valorUnitario, p.IVAtasa, p.IEPStasa, p.cantidad as stock,
               p.ClaveProdServ, p.Observaciones, p.TiendaInicio, p.TiendaFin,
               pa.ArchivoID as CoverArchivoID,
               pa.RutaRelativa as CoverRuta,
               pa.RutaMiniatura as CoverMiniatura,
               ps.FamiliaOlfativa, ps.AcordesPrincipales, ps.TieneDecant, ps.PrecioDecant, ps.AuraColor, ps.AuraParticulas,
               ps.RadarProyeccion, ps.RadarLongevidad, ps.RadarElogios, ps.RadarVersatilidad, ps.RadarDulzorFrescura, ps.RadarTempMin, ps.RadarTempMax
        FROM productos p
        LEFT JOIN productos_archivos pa ON p.ProductoID = pa.ProductoID AND pa.EsPrincipal = 'SI' AND pa.Activo = 1
        LEFT JOIN productos_sensorial ps ON p.ProductoID = ps.ProductoID AND p.EmisorID = ps.EmisorID
        WHERE p.EmisorID = ? 
          AND (p.EnTiendaOnline = 'SI' OR p.EnTiendaOnline IS NULL)
          AND (p.TiendaInicio IS NULL OR p.TiendaInicio <= NOW())
          AND (p.TiendaFin IS NULL OR p.TiendaFin >= NOW())
        ORDER BY p.descripcion ASC
    ");
    $stmt->execute([$tenant->emisorId]);
    $rawProducts = $stmt->fetchAll();

    // Fetch all active media for this emisor in one efficient query
    $stmtMedia = $db->prepare("
        SELECT ArchivoID, ProductoID, TipoArchivo, RutaRelativa, RutaMiniatura, EsPrincipal, Orden, Descripcion
        FROM productos_archivos
        WHERE EmisorID = ? AND Activo = 1
        ORDER BY TipoArchivo ASC, (EsPrincipal = 'SI') DESC, Orden ASC, FechaAlta DESC
    ");
    $stmtMedia->execute([$tenant->emisorId]);
    $allMedia = $stmtMedia->fetchAll();

    $mediaByProduct = [];
    foreach ($allMedia as $m) {
        $pId = $m['ProductoID'];
        if (!isset($mediaByProduct[$pId])) {
            $mediaByProduct[$pId] = ['fotos' => [], 'docs' => []];
        }
        if ($m['TipoArchivo'] === 'DOCUMENTO') {
            $mediaByProduct[$pId]['docs'][] = [
                'id' => $m['ArchivoID'],
                'url' => MediaCDNResolver::resolve($m['RutaRelativa']),
                'title' => $m['Descripcion'] ?: 'Ficha Técnica'
            ];
        } else {
            $mediaByProduct[$pId]['fotos'][] = [
                'id' => $m['ArchivoID'],
                'url' => MediaCDNResolver::resolve($m['RutaRelativa']),
                'thumb' => MediaCDNResolver::resolveThumb($m['RutaRelativa'], $m['RutaMiniatura']),
                'isCover' => ($m['EsPrincipal'] === 'SI')
            ];
        }
    }

    $products = [];
    $categories = [];

    foreach ($rawProducts as $p) {
        $cat = trim($p['categoria'] ?: 'General');
        if (!in_array($cat, $categories)) {
            $categories[] = $cat;
        }
        $products[] = format_catalog_product($p, $mediaByProduct);
    }

    // Extract Featured Curated Products
    $stmtFeat = $db->prepare("SELECT Valor FROM emisoresde WHERE EmisorID = ? AND Variable = 'STORE_FEATURED_PRODS' LIMIT 1");
    $stmtFeat->execute([$tenant->emisorId]);
    $rowFeat = $stmtFeat->fetch();
    $featuredIds = [];
    if ($rowFeat && !empty($rowFeat['Valor'])) {
        $featuredIds = array_filter(array_map('trim', explode(',', $rowFeat['Valor'])));
    }

    $featuredProducts = [];
    foreach ($products as &$prod) {
        $prod['isFeatured'] = in_array($prod['id'], $featuredIds);
        if ($prod['isFeatured']) {
            $featuredProducts[] = $prod;
        }
    }
    unset($prod);

    // Fallback: if fewer than 3 featured products, take top 4 with photos
    if (count($featuredProducts) < 3) {
        $featuredProducts = [];
        foreach ($products as &$prod) {
            if (!empty($prod['photos']) && count($featuredProducts) < 5) {
                $prod['isFeatured'] = true;
                $featuredProducts[] = $prod;
            }
        }
        unset($prod);
    }

    echo json_encode([
        'Status'     => 'OK',
        'Tenant'     => [
            'emisorId'    => $tenant->emisorId,
            'brandName'   => $tenant->brandName,
            'slug'        => $tenant->slug,
            'logo'        => $tenant->logo,
            'theme'       => $tenant->theme,
            'primaryColor'=> $tenant->primaryColor,
            'description' => $tenant->description,
            'email'       => $tenant->email,
            'phone'       => $tenant->phone,
            'address'     => $tenant->address,
            'quantixStorePerfums' => $tenant->quantixStorePerfums,
            'featureMatrix'=> $tenant->apexConfig['feature_matrix'] ?? [],
            'initialProductCount' => !empty($tenant->apexConfig['speed_tuning']['initial_product_count']) ? (int)$tenant->apexConfig['speed_tuning']['initial_product_count'] : 13,
            'archetype'   => $tenant->archetype ?? 'maison',
            'density'     => $tenant->density ?? 0.5,
            'modules'     => $tenant->modules ?? [
                'flash_deals' => true,
                'horizontal_rails' => true,
                'cfdi_trust' => true,
                'hero_vitrina' => true
            ]
        ],
        'Categories' => $categories,
        'Featured'   => $featuredProducts,
        'Products'   => $products,
        'Total'      => count($products)
    ], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'Status' => 'Error',
        'Error'  => $e->getMessage()
    ], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
}
