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

$tenant = StorefrontTenant::resolve();

$db = get_store_db();

$rawQuery = trim((string)($_GET['q'] ?? $_POST['q'] ?? ''));
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
        LEFT JOIN productos_archivos pa ON (pa.ProductoID = p.ProductoID AND pa.EsPrincipal = 'SI' AND pa.Activo = 1)
        WHERE p.EmisorID = ?
          AND (p.EnTiendaOnline = 'SI' OR p.EnTiendaOnline IS NULL)
          AND (p.TiendaInicio IS NULL OR p.TiendaInicio <= NOW())
          AND (p.TiendaFin IS NULL OR p.TiendaFin >= NOW())
    ");
    $stmt->execute([$tenant->emisorId]);
    $rows = $stmt->fetchAll();

    $resolveCdn = function($path) {
        if (empty($path)) return 'https://media.evinux.net/no-image.svg';
        if (strpos($path, 'http://') === 0 || strpos($path, 'https://') === 0) return $path;
        $clean = preg_replace('#^/?(cfdadmin/)?uploads/productos/#i', '', $path);
        return 'https://media.evinux.net/' . ltrim($clean, '/');
    };

    $scored = [];

    foreach ($rows as $r) {
        $score = 65.0; // Baseline
        $pDescNorm = normalizeText((string)$r['descripcion']);
        $acordes = json_decode($r['AcordesPrincipales'] ?? '[]', true) ?: [];
        $acordesNorm = array_map('normalizeText', $acordes);

        // 1. Text direct match bonus
        if (!empty($rawQuery)) {
            $tokens = array_filter(explode(' ', $qNorm), fn($t) => strlen($t) > 2);
            foreach ($tokens as $tok) {
                if (strpos($pDescNorm, $tok) !== false) $score += 8.0;
                foreach ($acordesNorm as $acc) {
                    if (strpos($acc, $tok) !== false) $score += 10.0;
                }
            }
        }

        // 2. Occasion matching
        if (in_array('playa', $detected['occasions'])) $score += ($r['OcasionPlaya'] ?? 5) * 2.8;
        if (in_array('cita', $detected['occasions'])) $score += ($r['OcasionCita'] ?? 5) * 2.8;
        if (in_array('formal', $detected['occasions'])) $score += ($r['OcasionFormal'] ?? 5) * 2.8;
        if (in_array('fiesta', $detected['occasions'])) $score += ($r['OcasionFiesta'] ?? 5) * 2.8;
        if (in_array('diario', $detected['occasions'])) $score += ($r['OcasionDiario'] ?? 5) * 2.8;

        // 3. Season matching
        if (in_array('verano', $detected['seasons'])) $score += ($r['TemporadaVerano'] ?? 5) * 2.2;
        if (in_array('invierno', $detected['seasons'])) $score += ($r['TemporadaInvierno'] ?? 5) * 2.2;

        // 4. Accord matching
        if (in_array('citrico', $detected['accords']) && (in_array('citrico', $acordesNorm) || strpos($pDescNorm, 'citric') !== false)) $score += 16.0;
        if (in_array('acuatico', $detected['accords']) && (in_array('acuatico marino', $acordesNorm) || strpos($pDescNorm, 'dive') !== false || strpos($pDescNorm, 'hawas') !== false)) $score += 20.0;
        if (in_array('dulce', $detected['accords']) && (in_array('vainilla gourmand', $acordesNorm) || strpos($pDescNorm, 'vainilla') !== false || strpos($pDescNorm, 'khamrah') !== false)) $score += 20.0;
        if (in_array('amaderado', $detected['accords']) && (in_array('amaderado', $acordesNorm) || strpos($pDescNorm, 'cedro') !== false || strpos($pDescNorm, 'iconic') !== false)) $score += 15.0;
        if (in_array('especiado', $detected['accords']) && (in_array('calido especiado', $acordesNorm) || strpos($pDescNorm, 'elixir') !== false)) $score += 16.0;
        if (in_array('cuero', $detected['accords']) && (in_array('cuero & humo', $acordesNorm) || strpos($pDescNorm, 'supremacy') !== false)) $score += 18.0;

        // 5. Intensity / Longevity
        if ($detected['intensity'] === 'bestia' && (($r['Estela'] ?? 2) >= 3 || ($r['LongevidadHoras'] ?? 8.0) >= 9.0)) {
            $score += 12.0;
        }

        // 6. Gender match
        if ($detected['gender'] && (($r['GeneroTarget'] ?? 'UNISEX') === $detected['gender'] || ($r['GeneroTarget'] ?? 'UNISEX') === 'UNISEX')) {
            $score += 8.0;
        }

        // Calculate final psychological affinity (clamped 78% to 99%)
        $affinity = min(99, max(78, intval(round($score / 1.5))));

        $price = floatval($r['valorUnitario'] ?? 0);
        $vat = floatval($r['IVAtasa'] ?? 16);
        $finalPrice = $price * (1 + $vat / 100);

        $topAccordsStr = !empty($acordes) ? implode(', ', array_slice($acordes, 0, 2)) : 'acordes selectos';
        $customNote = !empty($r['NotaSommelier']) ? $r['NotaSommelier'] : "Creación de perfil exclusivo con notas de $topAccordsStr, ideal para proyectar distinción absoluta.";

        if (in_array('playa', $detected['occasions']) || in_array('verano', $detected['seasons'])) {
            $customNote = "Recomendado por su estela fresca y chispeante de $topAccordsStr que proyecta vitalidad impecable bajo el calor y clima soleado.";
        } elseif (in_array('cita', $detected['occasions']) || in_array('dulce', $detected['accords'])) {
            $customNote = "Elección estelar: su cuerpo envolvente con matices de $topAccordsStr crea una presencia magnética y seductora para momentos íntimos.";
        } elseif (in_array('formal', $detected['occasions'])) {
            $customNote = "Perfección ejecutiva: su estructura noble de $topAccordsStr proyecta distinción sobria y respetable en cualquier evento formal o de gala.";
        }

        $scored[] = [
            'id' => $r['ProductoID'],
            'code' => $r['noIdentificacion'] ?? '',
            'sku' => $r['SKU'] ?? '',
            'name' => $r['descripcion'],
            'price' => $price,
            'finalPrice' => round($finalPrice, 2),
            'image' => $resolveCdn($r['CoverRuta'] ?? ''),
            'affinity' => $affinity,
            'family' => $r['FamiliaOlfativa'] ?: 'Amaderada Cítrica',
            'accords' => $acordes,
            'notes' => [
                'top' => json_decode($r['NotasSalida'] ?? '[]', true) ?: ['Bergamota'],
                'heart' => json_decode($r['NotasCorazon'] ?? '[]', true) ?: ['Lavanda'],
                'base' => json_decode($r['NotasFondo'] ?? '[]', true) ?: ['Cedro']
            ],
            'sillage' => intval($r['Estela'] ?? 2),
            'longevity' => floatval($r['LongevidadHoras'] ?? 8.0),
            'sommelierNote' => $customNote
        ];
    }

    // Sort by affinity descending
    usort($scored, fn($a, $b) => $b['affinity'] <=> $a['affinity']);

    $topMatches = array_slice($scored, 0, $limit);

    echo json_encode([
        'status' => 'OK',
        'query' => $rawQuery,
        'detected' => $detected,
        'count' => count($topMatches),
        'matches' => $topMatches
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
