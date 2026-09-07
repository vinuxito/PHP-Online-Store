<?php
/**
 * online-store/api/filemon_assistant_api.php
 *
 * Endpoint API en tiempo real para Filemón Prime Copilot en subdominios de tienda (Showroom).
 * Garantiza resolución local en subdominios de inquilinos (ej. mistiq.evinux.net) sin errores 404 ni CORS.
 *
 * @author Filemón Coder
 * @version 1.0.0 (Septiembre 2026)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '/lamp/www/cfdadmin/lib/FilemonAssistantEngine.php';

// Leer carga útil JSON o POST regular
$rawInput = file_get_contents('php://input');
$payload = array();

if (!empty($rawInput)) {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        $payload = $decoded;
    }
}

if (empty($payload)) {
    $payload = $_POST;
}

$query = isset($payload['query']) ? trim($payload['query']) : (isset($payload['message']) ? trim($payload['message']) : (isset($_GET['query']) ? trim($_GET['query']) : ''));
$context = isset($payload['context']) && is_array($payload['context']) ? $payload['context'] : array();

// Marcar explícitamente contexto de vitrina
$context['is_showroom'] = true;

// Inferir tenant y arquetipo dinámicamente
require_once __DIR__ . '/../includes/tenant_resolver.php';
$tenant = StorefrontTenant::resolve();
if (!isset($context['brand_name'])) {
    $context['brand_name'] = $tenant->brandName;
}
if (!isset($context['archetype'])) {
    $context['archetype'] = $tenant->archetype ?: 'maison';
}
if (!isset($context['is_perfume'])) {
    $context['is_perfume'] = $tenant->isPerfumery();
}

$response = FilemonAssistantEngine::answer($query, $context);

echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit;
