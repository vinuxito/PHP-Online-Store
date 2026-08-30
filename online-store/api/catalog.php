<?php
/**
 * api/catalog.php — Public Catalog API for Quantix Storefront Engine
 */

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__) . '/includes/tenant_resolver.php';

$tenant = StorefrontTenant::resolve();
$db = get_store_db();

try {
    $stmt = $db->prepare("
        SELECT p.ProductoID, p.noIdentificacion, p.SKU, p.descripcion, p.categoria,
               p.unidad, p.valorUnitario, p.IVAtasa, p.IEPStasa, p.cantidad as stock,
               p.ClaveProdServ, p.Observaciones,
               pa.ArchivoID as CoverArchivoID,
               pa.RutaRelativa as CoverRuta,
               pa.RutaMiniatura as CoverMiniatura
        FROM productos p
        LEFT JOIN productos_archivos pa ON p.ProductoID = pa.ProductoID AND pa.EsPrincipal = 'SI' AND pa.Activo = 1
        WHERE p.EmisorID = ?
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
                'url' => '/cfdadmin/' . $m['RutaRelativa'],
                'title' => $m['Descripcion'] ?: 'Ficha Técnica'
            ];
        } else {
            $mediaByProduct[$pId]['fotos'][] = [
                'id' => $m['ArchivoID'],
                'url' => '/cfdadmin/' . $m['RutaRelativa'],
                'thumb' => !empty($m['RutaMiniatura']) ? '/cfdadmin/' . $m['RutaMiniatura'] : '/cfdadmin/' . $m['RutaRelativa'],
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

        // Fallback cover if no photos
        $cover = !empty($p['CoverMiniatura']) ? '/cfdadmin/' . $p['CoverMiniatura'] : (!empty($p['CoverRuta']) ? '/cfdadmin/' . $p['CoverRuta'] : '/cfdadmin/images/no-image.svg');
        if (empty($fotos) && !empty($p['CoverRuta'])) {
            $fotos[] = [
                'id' => $p['CoverArchivoID'] ?? 'cover',
                'url' => '/cfdadmin/' . $p['CoverRuta'],
                'thumb' => $cover,
                'isCover' => true
            ];
        }
        if (empty($fotos)) {
            $fotos[] = [
                'id' => 'placeholder',
                'url' => '/cfdadmin/images/no-image.svg',
                'thumb' => '/cfdadmin/images/no-image.svg',
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
            'docs'         => $docs
        ];
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
            'address'     => $tenant->address
        ],
        'Categories' => $categories,
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
