<?php
/**
 * api/order.php — Secure Order Processing & CFDI Invoicing Bridge
 */

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__) . '/includes/tenant_resolver.php';

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data || empty($data['items']) || !is_array($data['items']) || count($data['items']) > 100) {
    http_response_code(400);
    echo json_encode([
        'Status' => 'Error',
        'Error'  => 'Datos de la orden inválidos o carrito excede el límite permitido (100 productos).'
    ], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
    exit;
}

$db = get_store_db();
$tenant = StorefrontTenant::resolve();

if (!$tenant->isStoreActive) {
    http_response_code(403);
    echo json_encode([
        'Status' => 'ServiceInactive',
        'Error'  => 'El servicio de tienda en línea no se encuentra activo para este emisor (Requiere QUANTIXFRONTSTORE = SI).'
    ], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
    exit;
}

$customerName = trim($data['customerName'] ?? 'Cliente General');
$customerEmail = trim($data['customerEmail'] ?? '');
$customerPhone = trim($data['customerPhone'] ?? '');
$shippingAddress = trim($data['shippingAddress'] ?? '');
$paymentMethod = trim($data['paymentMethod'] ?? 'SPEI');
$requireCfdi = !empty($data['requireCfdi']);
$rfc = strtoupper(trim($data['rfc'] ?? 'XAXX010101000'));
$razonSocial = trim($data['razonSocial'] ?? $customerName);
$cp = trim($data['cp'] ?? '01000');
$regimen = trim($data['regimen'] ?? '616');
$usoCfdi = trim($data['usoCfdi'] ?? 'G03');

if (empty($customerEmail) || !filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'Status' => 'Error',
        'Error'  => 'Ingresa un correo electrónico válido para recibir tu confirmación.'
    ], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
    exit;
}

if (empty($shippingAddress)) {
    http_response_code(400);
    echo json_encode([
        'Status' => 'Error',
        'Error'  => 'La dirección de entrega es requerida para el envío.'
    ], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
    exit;
}

if ($requireCfdi) {
    if (!preg_match('/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/u', $rfc)) {
        http_response_code(400);
        echo json_encode([
            'Status' => 'Error',
            'Error'  => 'El RFC proporcionado no cumple con el formato fiscal oficial del SAT (12 o 13 caracteres).'
        ], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!preg_match('/^[0-9]{5}$/', $cp)) {
        http_response_code(400);
        echo json_encode([
            'Status' => 'Error',
            'Error'  => 'El Código Postal fiscal debe ser de 5 dígitos numéricos.'
        ], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
        exit;
    }
}

$items = $data['items'];
$subtotal = 0;
$totalIva = 0;

foreach ($items as $item) {
    $qty = max(1, (int)($item['qty'] ?? 1));
    $unitPrice = (float)($item['unitPrice'] ?? 0);
    $vatRate = (float)($item['vatRate'] ?? 16);
    $lineSub = $unitPrice * $qty;
    $lineIva = $lineSub * ($vatRate / 100);
    $subtotal += $lineSub;
    $totalIva += $lineIva;
}

$grandTotal = $subtotal + $totalIva;
$orderFolio = 'QX-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));

// Attempt recording inventory movements in productos_kardex if table exists
try {
    foreach ($items as $item) {
        $pId = $item['id'] ?? '';
        $qty = max(1, (int)($item['qty'] ?? 1));
        if (!empty($pId)) {
            // Decrement stock in productos
            $stmtUp = $db->prepare("UPDATE productos SET cantidad = GREATEST(0, cantidad - ?) WHERE ProductoID = ? AND EmisorID = ?");
            $stmtUp->execute([$qty, $pId, $tenant->emisorId]);

            // Insert Kardex row
            $kardexId = md5(uniqid(rand(), true));
            $stmtK = $db->prepare("
                INSERT INTO productos_kardex (
                    MovimientoID, ProductoID, EmisorID, Fecha, TipoMovimiento,
                    Cantidad, CostoUnitario, DocumentoTipo, DocumentoFolio, Usuario, DetalleHTML
                ) VALUES (
                    ?, ?, ?, NOW(), 'SALIDA_VENTA',
                    ?, ?, 'STORE_ORDER', ?, 'Storefront', ?
                )
            ");
            $stmtK->execute([
                $kardexId,
                $pId,
                $tenant->emisorId,
                $qty,
                $item['unitPrice'] ?? 0,
                $orderFolio,
                "Venta Storefront Online #{$orderFolio} a {$customerName}"
            ]);
        }
    }
} catch (Exception $e) {
    error_log('[Storefront Order Warning] ' . $e->getMessage());
}

$qfsResult = null;
try {
    require_once '/lamp/www/cfdadmin/lib/nota_qfs.php';
    $qfsConceptos = [];
    foreach ($items as $it) {
        $qfsConceptos[] = [
            'sku'            => $it['sku'] ?? 'QFS-PROD',
            'productoID'     => $it['id'] ?? '',
            'descripcion'    => $it['title'] ?? 'Producto QuantiX Storefront',
            'cantidad'       => $it['qty'] ?? 1,
            'precioUnitario' => $it['unitPrice'] ?? 0,
            'descuento'      => 0,
            'claveProdServ'  => '53131600',
            'claveUnidad'    => 'H87'
        ];
    }
    $qfsResult = NotaQFSManager::emitirNotaQFS($tenant->emisorId, [
        'clienteNombre'    => $customerName,
        'clienteEmail'     => $customerEmail,
        'clienteTelefono'  => $customerPhone,
        'rfc'              => $rfc,
        'conceptos'        => $qfsConceptos,
        'formaDePago'      => $paymentMethod === 'SPEI' ? '03' : '04',
        'origen'           => 'QUANTIXFRONTSTORE',
        'origenReferencia' => $orderFolio
    ]);
} catch (Exception $e) {
    error_log('[QFS Note Warning] ' . $e->getMessage());
}

$logLine = sprintf(
    "[%s] ORDER_CREATED Folio=%s QFS=%s EmisorID=%s Customer='%s' Email='%s' Total=%.2f Items=%d CFDI=%s\n",
    date('Y-m-d H:i:s'),
    $orderFolio,
    $qfsResult['folioCompleto'] ?? 'NONE',
    $tenant->emisorId,
    $customerName,
    $customerEmail,
    $grandTotal,
    count($items),
    $requireCfdi ? 'SI' : 'NO'
);
@file_put_contents('/lamp/www/cfdadmin/logs/storefront.log', $logLine, FILE_APPEND | LOCK_EX);

echo json_encode([
    'Status'        => 'OK',
    'OrderFolio'    => $orderFolio,
    'folioQFS'      => $qfsResult['folioCompleto'] ?? null,
    'receiptUrl'    => !empty($qfsResult['receiptUrl']) ? '/cfdadmin/' . $qfsResult['receiptUrl'] : null,
    'facturarUrl'   => !empty($qfsResult['facturarUrl']) ? '/cfdadmin/' . $qfsResult['facturarUrl'] : null,
    'CustomerName'  => $customerName,
    'CustomerEmail' => $customerEmail,
    'Total'         => round($grandTotal, 2),
    'Subtotal'      => round($subtotal, 2),
    'IVA'           => round($totalIva, 2),
    'PaymentMethod' => $paymentMethod,
    'CfdiStatus'    => $requireCfdi ? 'SOLICITADO_CFDI40' : null,
    'RFC'           => $requireCfdi ? $rfc : null,
    'Message'       => 'Orden registrada exitosamente.'
], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
