<?php
/** Records an idempotent request awaiting manual SPEI verification. No sale or stock mutation. */
header('Content-Type: application/json; charset=utf-8');
require_once dirname(__DIR__) . '/includes/tenant_resolver.php';
require_once dirname(__DIR__) . '/includes/pending_order_contract.php';

function qxOrderError($code, $message) {
    http_response_code($code);
    echo json_encode(['Status' => 'Error', 'Error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') qxOrderError(405, 'Usa POST para registrar una solicitud.');
$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data) || empty($data['items']) || !is_array($data['items']) || count($data['items']) > 100) qxOrderError(400, 'Agrega entre 1 y 100 productos válidos.');
$tenant = StorefrontTenant::resolve($data);
if (!$tenant->isStoreActive || !$tenant->emisorId) qxOrderError(403, $tenant->resolutionError ?: 'La tienda no está activa.');
if (!QuantixBusinessProfile::canShop($tenant->apexConfig)) qxOrderError(403, 'Esta tienda atiende por consulta o cita. Contacta al asesor para continuar.');
$payments = $tenant->paymentSettings;
if (($data['paymentMethod'] ?? '') !== 'SPEI') qxOrderError(422, 'Este método de pago todavía no está integrado.');
if (empty($payments['spei_ready'])) qxOrderError(422, 'La tienda aún no tiene instrucciones SPEI válidas.');
$key = isset($data['idempotencyKey']) && is_string($data['idempotencyKey']) ? $data['idempotencyKey'] : '';
if (!preg_match('/^[a-zA-Z0-9_-]{16,64}$/D', $key)) qxOrderError(400, 'Falta el identificador del intento. Actualiza la página e intenta nuevamente.');
try { $customer = QuantixPendingOrderContract::customer($data); }
catch (InvalidArgumentException $e) { qxOrderError(400, $e->getMessage()); }
if ($customer['customerName'] === '' || !filter_var($customer['customerEmail'], FILTER_VALIDATE_EMAIL) || $customer['shippingAddress'] === '') qxOrderError(400, 'Completa nombre, correo válido y dirección de entrega.');
$invoice = !empty($data['requireCfdi']);
if ($invoice && empty($payments['invoice_request_enabled'])) qxOrderError(422, 'La tienda no recibe solicitudes de factura desde este formulario.');
if ($invoice && (!preg_match('/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/uD', $customer['rfc']) || !preg_match('/^[0-9]{5}$/D', $customer['cp']) || !preg_match('/^[0-9]{3}$/D', $customer['regimen']) || !preg_match('/^[A-Z][0-9]{2}$/D', $customer['usoCfdi']) || $customer['razonSocial'] === '')) qxOrderError(400, 'Completa los datos fiscales válidos para solicitar la factura.');

// Prices and names are deliberately excluded from request identity and computed from the catalog.
$requestItems = [];
foreach ($data['items'] as $item) {
    if (!is_array($item) || !isset($item['id']) || !is_scalar($item['id'])) qxOrderError(400, 'Producto inválido.');
    $requestItems[] = ['id' => (string)$item['id'], 'qty' => $item['qty'] ?? null, 'decant' => !empty($item['isDecant']), 'subscription' => !empty($item['isSubscription']), 'bundle' => !empty($item['isDuoPack']), 'gift' => !empty($item['isGift']), 'finish' => !empty($item['customFinish'])];
}
$requestHash = hash('sha256', json_encode([$customer, $invoice, $requestItems], JSON_UNESCAPED_UNICODE));
$db = get_store_db();
try {
    $lookup = $db->prepare('SELECT RequestHash, ResponseJSON FROM quantix_pending_orders WHERE EmisorID = ? AND IdempotencyKey = ? LIMIT 1');
    $lookup->execute([$tenant->emisorId, $key]);
    if ($existing = $lookup->fetch(PDO::FETCH_ASSOC)) {
        if (!hash_equals($existing['RequestHash'], $requestHash)) qxOrderError(409, 'Este intento ya corresponde a otros datos. Inicia una solicitud nueva.');
        echo $existing['ResponseJSON'];
        exit;
    }
    $lines = [];
    $quantities = [];
    $subtotal = $iva = $ieps = $total = 0;
    $productQuery = $db->prepare("SELECT p.ProductoID, p.descripcion, p.valorUnitario, p.IVAtasa, p.IEPStasa, p.cantidad, p.EnInventario, ps.TieneDecant, ps.PrecioDecant FROM productos p LEFT JOIN productos_sensorial ps ON ps.ProductoID = p.ProductoID AND ps.EmisorID = p.EmisorID WHERE p.EmisorID = ? AND p.ProductoID = ? AND (p.EnTiendaOnline = 'SI' OR p.EnTiendaOnline IS NULL) AND (p.TiendaInicio IS NULL OR p.TiendaInicio <= NOW()) AND (p.TiendaFin IS NULL OR p.TiendaFin >= NOW()) LIMIT 1");
    foreach ($data['items'] as $item) {
        $id = (string)$item['id'];
        $baseId = !empty($item['isDecant']) ? preg_replace('/__decant$/D', '', $id) : $id;
        if (!preg_match('/^[a-zA-Z0-9_-]{1,80}$/D', $baseId)) throw new InvalidArgumentException('Identificador de producto inválido.');
        $productQuery->execute([$tenant->emisorId, $baseId]);
        $product = $productQuery->fetch(PDO::FETCH_ASSOC);
        $line = QuantixPendingOrderContract::line($item, $product, $tenant->isPerfumery());
        $quantities[$baseId] = ($quantities[$baseId] ?? 0) + ($line['format'] === 'full' ? $line['qty'] : 0);
        if ($product['EnInventario'] === 'SI' && $line['format'] === 'full' && $quantities[$baseId] > (float)$product['cantidad']) throw new InvalidArgumentException('La cantidad solicitada supera la disponibilidad del catálogo.');
        $lines[] = $line;
        $subtotal += $line['subtotal']; $iva += $line['iva']; $ieps += $line['ieps']; $total += $line['total'];
    }
    $id = bin2hex(random_bytes(16));
    $folio = 'QX-' . date('Ymd') . '-' . strtoupper(substr($id, 0, 12));
    $response = [
        'Status' => 'OK', 'OrderStatus' => 'PENDING_PAYMENT', 'PaymentStatus' => 'UNVERIFIED',
        'OrderFolio' => $folio, 'CustomerName' => $customer['customerName'],
        'Total' => round($total, 2), 'Subtotal' => round($subtotal, 2), 'IVA' => round($iva, 2), 'IEPS' => round($ieps, 2),
        'PaymentMethod' => 'SPEI', 'CfdiStatus' => $invoice ? 'REQUESTED' : null,
        'InvoiceSeries' => $invoice ? $payments['cfdi_serie'] : '', 'NotificationStatus' => 'unavailable',
        'Message' => 'Solicitud registrada. El pago y la disponibilidad requieren confirmación de la tienda. No se ha emitido una factura ni enviado una notificación.'
    ];
    $responseJson = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    $payload = json_encode(['customer' => $customer, 'items' => $lines, 'invoice_requested' => $invoice, 'invoice_series' => $payments['cfdi_serie']], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    $insert = $db->prepare("INSERT INTO quantix_pending_orders (OrderID, EmisorID, IdempotencyKey, RequestHash, OrderFolio, Status, PaymentMethod, Total, InvoiceRequested, InvoiceSeries, NotificationStatus, PayloadJSON, ResponseJSON, CreatedAt) VALUES (?, ?, ?, ?, ?, 'PENDING_PAYMENT', 'SPEI', ?, ?, ?, 'unavailable', ?, ?, NOW())");
    try {
        $insert->execute([$id, $tenant->emisorId, $key, $requestHash, $folio, round($total, 2), $invoice ? 1 : 0, $invoice ? $payments['cfdi_serie'] : '', $payload, $responseJson]);
    } catch (PDOException $e) {
        if ((string)$e->getCode() !== '23000') throw $e;
        $lookup->execute([$tenant->emisorId, $key]);
        $existing = $lookup->fetch(PDO::FETCH_ASSOC);
        if (!$existing || !hash_equals($existing['RequestHash'], $requestHash)) qxOrderError(409, 'El intento ya fue utilizado con otros datos.');
        $responseJson = $existing['ResponseJSON'];
    }
    echo $responseJson;
} catch (InvalidArgumentException $e) {
    qxOrderError(422, $e->getMessage());
} catch (Exception $e) {
    // No database detail or customer payload is exposed in public responses/logs.
    qxOrderError(503, 'No se pudo registrar la solicitud. La tienda debe revisar la disponibilidad del registro de pedidos; puedes reintentar sin duplicarla.');
}
