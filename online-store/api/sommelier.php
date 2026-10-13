<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    exit(0);
}

error_reporting(E_ALL & ~E_WARNING & ~E_NOTICE & ~E_DEPRECATED);

require_once dirname(__DIR__) . '/includes/tenant_resolver.php';
require_once dirname(__DIR__) . '/includes/recommendation_contract.php';
if (file_exists('/lamp/www/cfdadmin/lib/media_cdn.php')) {
    require_once '/lamp/www/cfdadmin/lib/media_cdn.php';
}

$tenant = StorefrontTenant::resolve();

$db = get_store_db();

if (!is_string($_GET['q'] ?? $_POST['q'] ?? '')) { http_response_code(400); echo json_encode(['status'=>'error','message'=>'Describe tu búsqueda con texto.']); exit; }
$rawQuery = trim((string)($_GET['q'] ?? $_POST['q'] ?? ''));
if (strlen($rawQuery)>1200) { http_response_code(400); echo json_encode(['status'=>'error','message'=>'La búsqueda es demasiado larga.']); exit; }
$limit = max(1, min(20, intval($_GET['limit'] ?? $_POST['limit'] ?? 6)));

function normalizeText(string $str): string {
    $str = mb_strtolower($str, 'UTF-8');
    $unwanted = ['á'=>'a', 'é'=>'e', 'í'=>'i', 'ó'=>'o', 'ú'=>'u', 'ü'=>'u', 'ñ'=>'n'];
    return strtr($str, $unwanted);
}

$qNorm = normalizeText($rawQuery);

// Lexicon for Occasions, Seasons, Accords and Vibe
$lexicon = [
    'occasions' => [
        'playa' => ['playa', 'mar', 'vacaciones', 'alberca', 'piscina', 'calor', 'verano', 'tropical', 'brisa'],
        'cita' => ['cita', 'romance', 'pareja', 'novio', 'novia', 'seduccion', 'seductor', 'intimo', 'conquistar', 'sensual', 'noche', '9pm'],
        'formal' => ['boda', 'gala', 'formal', 'elegante', 'evento', 'traje', 'vestido', 'graduacion', 'reunion', 'cena', 'iconic'],
        'fiesta' => ['fiesta', 'antro', 'bar', 'club', 'celebracion', 'reventon', 'nocturno', 'cumpleanos'],
        'diario' => ['diario', 'oficina', 'trabajo', 'escuela', 'casual', 'gym', 'gimnasio', 'dia', 'fresco', 'versatil']
    ],
    'seasons' => [
        'verano' => ['verano', 'calor', 'primavera', 'caluroso', 'sol', 'mediodia'],
        'invierno' => ['invierno', 'frio', 'otono', 'helado', 'lluvia', 'templado']
    ],
    'accords' => [
        'citrico' => ['citrico', 'limon', 'bergamota', 'mandarina', 'naranja', 'fresco', 'toronja'],
        'acuatico' => ['acuatico', 'marino', 'oceano', 'agua', 'brisa', 'menta', 'dive', 'hawas'],
        'dulce' => ['dulce', 'vainilla', 'caramelo', 'chocolate', 'gourmand', 'azucar', 'miel', 'tonka', 'khamrah'],
        'amaderado' => ['amaderado', 'madera', 'cedro', 'sandalo', 'vetiver', 'bosque', 'roble'],
        'especiado' => ['especiado', 'canela', 'pimienta', 'cardamomo', 'calido', 'oriental', 'elixir'],
        'cuero' => ['cuero', 'tabaco', 'humo', 'oud', 'intenso', 'fuerte', 'cuero italiano', 'supremacy'],
        'floral' => ['floral', 'flores', 'rosa', 'jazmin', 'lavanda', 'azahar']
    ],
    'intensity' => [
        'bestia' => ['modo bestia', 'bestia', 'dure mucho', 'duradero', 'potente', 'fuerte', 'proyecte', 'estela', 'proyeccion'],
        'suave' => ['suave', 'discreto', 'intimo', 'ligero', 'sutil', 'no maree']
    ],
    'gender' => [
        'HOMBRE' => ['hombre', 'caballero', 'chico', 'masculino', 'varon', 'papa', 'novio'],
        'MUJER' => ['mujer', 'dama', 'chica', 'femenino', 'mama', 'novia']
    ]
];

$detected = [
    'occasions' => [],
    'seasons' => [],
    'accords' => [],
    'intensity' => 'normal',
    'gender' => null
];

foreach ($lexicon['occasions'] as $occ => $kws) {
    foreach ($kws as $kw) {
        if (strpos($qNorm, $kw) !== false) {
            $detected['occasions'][] = $occ;
            break;
        }
    }
}

foreach ($lexicon['seasons'] as $seas => $kws) {
    foreach ($kws as $kw) {
        if (strpos($qNorm, $kw) !== false) {
            $detected['seasons'][] = $seas;
            break;
        }
    }
}

foreach ($lexicon['accords'] as $acc => $kws) {
    foreach ($kws as $kw) {
        if (strpos($qNorm, $kw) !== false) {
            $detected['accords'][] = $acc;
            break;
        }
    }
}

foreach ($lexicon['gender'] as $g => $kws) {
    foreach ($kws as $kw) {
        if (strpos($qNorm, $kw) !== false) {
            $detected['gender'] = $g;
            break;
        }
    }
}

foreach ($lexicon['intensity']['bestia'] as $kw) {
    if (strpos($qNorm, $kw) !== false) {
        $detected['intensity'] = 'bestia';
        break;
    }
}

try {
    $stmt = $db->prepare("
        SELECT p.ProductoID, p.noIdentificacion, p.SKU, p.descripcion, p.valorUnitario, p.IVAtasa, p.IEPStasa,
               p.categoria, s.FamiliaOlfativa, s.AcordesPrincipales, s.NotasSalida, s.NotasCorazon, s.NotasFondo,
               s.TemporadaPrimavera, s.TemporadaVerano, s.TemporadaOtono, s.TemporadaInvierno,
               s.OcasionDiario, s.OcasionFormal, s.OcasionCita, s.OcasionFiesta, s.OcasionPlaya,
               s.Estela, s.LongevidadHoras, s.GeneroTarget, s.NotaSommelier,
               pa.RutaRelativa as CoverRuta
        FROM productos p
        LEFT JOIN productos_sensorial s ON (s.ProductoID = p.ProductoID AND s.EmisorID = p.EmisorID)
        LEFT JOIN productos_archivos pa ON (pa.ProductoID = p.ProductoID AND pa.EmisorID = p.EmisorID AND pa.EsPrincipal = 'SI' AND pa.Activo = 1)
        WHERE p.EmisorID = ?
          AND (p.EnTiendaOnline = 'SI' OR p.EnTiendaOnline IS NULL)
          AND (p.TiendaInicio IS NULL OR p.TiendaInicio <= NOW())
          AND (p.TiendaFin IS NULL OR p.TiendaFin >= NOW())
    ");
    $stmt->execute([$tenant->emisorId]);
    $rows = $stmt->fetchAll();

    $resolveCdn = function($path) {
        return MediaCDNResolver::resolve($path);
    };

    $scored = [];

    foreach ($rows as $r) {
        $projection = QuantixRecommendationContract::project($r, $rawQuery, $tenant->isPerfumery() ? $detected : []);
        if (!$tenant->isPerfumery()) {
            $projection['family']=''; $projection['accords']=[];
            $projection['notes']=['top'=>[],'heart'=>[],'base'=>[]];
            $projection['sillage']=null; $projection['longevity']=null;
        }
        $projection['image']=$resolveCdn($r['CoverRuta'] ?? '');
        $scored[]=$projection;
    }
    usort($scored, function($a,$b) { return ($b['match_score'] <=> $a['match_score']) ?: strcmp($a['id'],$b['id']); });

    $topMatches = array_slice($scored, 0, $limit);

    echo json_encode([
        'status' => 'OK',
        'query' => $rawQuery,
        'detected' => $tenant->isPerfumery() ? $detected : [],
        'ranking' => 'published_catalog_keywords',
        'probability' => null,
        'count' => count($topMatches),
        'matches' => $topMatches
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'No se pudo consultar el catálogo. Conserva tu búsqueda e intenta de nuevo.'
    ], JSON_UNESCAPED_UNICODE);
}
