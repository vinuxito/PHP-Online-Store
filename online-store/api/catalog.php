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
        $pId = $p['ProductoID'];
        $cat = trim($p['categoria'] ?: 'General');
        if (!in_array($cat, $categories)) {
            $categories[] = $cat;
        }

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

        $products[] = [
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
            'initialProductCount' => !empty($tenant->apexConfig['speed_tuning']['initial_product_count']) ? (int)$tenant->apexConfig['speed_tuning']['initial_product_count'] : 13
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
