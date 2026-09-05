<?php
/**
 * api/store_ar_qr.php — Quantix Holo-Studio 3D - Local AR QR Code Generator
 * Zero-CDN, self-hosted QR generator for AR session handoff on storefront.
 */

// Allow CORS
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $origin = $_SERVER['HTTP_ORIGIN'];
    if (preg_match('/^https?:\/\/([a-z0-9_-]+\.)?evinux\.net(:[0-9]+)?$/i', $origin) ||
        preg_match('/^https?:\/\/localhost(:[0-9]+)?$/i', $origin) ||
        preg_match('/^https?:\/\/127\.0\.0\.1(:[0-9]+)?$/i', $origin)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
        header("Access-Control-Allow-Credentials: true");
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$qrLibPath = '/lamp/www/cfdadmin/phpqrcode/qrlib.php';
if (!file_exists($qrLibPath)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'Local QR library missing']);
    exit;
}

require_once $qrLibPath;

$text = isset($_REQUEST['url']) ? trim($_REQUEST['url']) : (isset($_REQUEST['text']) ? trim($_REQUEST['text']) : '');
if (empty($text)) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'Missing url or text parameter']);
    exit;
}

if (preg_match('/^(javascript|data|vbscript|file):/i', $text)) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'Invalid protocol']);
    exit;
}

$size = isset($_REQUEST['size']) ? intval($_REQUEST['size']) : 5;
$size = max(1, min(10, $size));

$margin = isset($_REQUEST['margin']) ? intval($_REQUEST['margin']) : 2;
$margin = max(0, min(4, $margin));

$format = isset($_REQUEST['format']) ? strtolower(trim($_REQUEST['format'])) : 'json';

if ($format === 'image' || $format === 'png') {
    header('Content-Type: image/png');
    header('Cache-Control: public, max-age=3600');
    QRcode::png($text, null, QR_ECLEVEL_M, $size, $margin);
    exit;
}

ob_start();
QRcode::png($text, null, QR_ECLEVEL_M, $size, $margin);
$pngBytes = ob_get_clean();

$dataUrl = 'data:image/png;base64,' . base64_encode($pngBytes);

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => true,
    'data_url' => $dataUrl,
    'payload' => $text,
    'size' => $size,
    'margin' => $margin
], JSON_UNESCAPED_SLASHES);
