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

// Inferir arquetipo si no vino explícito
if (!isset($context['archetype'])) {
    $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '';
    if (strpos($host, 'gersol') !== false || (isset($_GET['slug']) && $_GET['slug'] === 'gersol')) {
        $context['archetype'] = 'industrial_automation';
        $context['is_perfume'] = false;
    } else {
        $context['archetype'] = 'haute_perfumerie';
        $context['is_perfume'] = true;
    }
}

$response = FilemonAssistantEngine::answer($query, $context);

echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit;
