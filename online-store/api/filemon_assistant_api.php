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

// Marcar explícitamente contexto de vitrina y limpiar sesgos de backoffice
$context['is_showroom'] = true;
$context['is_cfdadmin'] = false;

// Inferir tenant, arquetipo e industria autoritariamente del servidor
require_once __DIR__ . '/../includes/tenant_resolver.php';
$tenant = StorefrontTenant::resolve();

$context['brand_name'] = $tenant->brandName;
$context['tenant_slug'] = $tenant->slug;
$context['tenant_desc'] = $tenant->description;
$context['tenant_headline'] = $tenant->headline;
$context['archetype'] = $tenant->archetype ?: 'maison';
$context['is_perfume'] = $tenant->isPerfumery();

// Clasificación determinista de la industria comercial
$textCorp = mb_strtolower($tenant->brandName . ' ' . $tenant->description . ' ' . $tenant->headline . ' ' . $tenant->slug, 'UTF-8');
if ($tenant->isPerfumery()) {
    $context['industry'] = 'perfumery';
} elseif ($tenant->slug === 'bracsa' || strpos($textCorp, 'bienes') !== false || strpos($textCorp, 'inmobiliari') !== false || strpos($textCorp, 'residencia') !== false || strpos($textCorp, 'espacios corporativos') !== false) {
    $context['industry'] = 'real_estate';
} elseif ($tenant->slug === 'gersol' || strpos($textCorp, 'industrial') !== false || strpos($textCorp, 'valvula') !== false || strpos($textCorp, 'automatiz') !== false) {
    $context['industry'] = 'industrial';
} else {
    $context['industry'] = 'retail';
}

$response = FilemonAssistantEngine::answer($query, $context);

echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit;
