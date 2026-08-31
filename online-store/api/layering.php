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

$action = trim((string)($_GET['action'] ?? $_POST['action'] ?? 'match'));
$baseId = trim((string)($_GET['baseId'] ?? $_POST['baseId'] ?? ''));
$accentId = trim((string)($_GET['accentId'] ?? $_POST['accentId'] ?? ''));

// Helper to fetch complete product info with sensory data
function getProductData($db, string $emisorId, string $prodId): ?array {
    $stmt = $db->prepare("
        SELECT 
            p.ProductoID, p.noIdentificacion, p.SKU, p.descripcion as nombre,
            p.valorUnitario, p.IVAtasa, p.IEPStasa,
            pa.RutaRelativa as CoverRuta, pa.RutaMiniatura as CoverMiniatura,
            s.FamiliaOlfativa, s.GeneroTarget, s.AcordesPrincipales,
            s.NotasSalida, s.NotasCorazon, s.NotasFondo,
            s.TemporadaVerano, s.TemporadaInvierno,
            s.OcasionCita, s.OcasionPlaya, s.OcasionFormal, s.OcasionDiario,
            s.Estela, s.LongevidadHoras, s.NotaSommelier,
            s.TieneDecant, s.PrecioDecant, s.AuraColor, s.AuraParticulas
        FROM productos p
        LEFT JOIN productos_archivos pa 
            ON p.ProductoID = pa.ProductoID AND pa.EsPrincipal = 'SI' AND pa.Activo = 1
        LEFT JOIN productos_sensorial s 
            ON s.ProductoID = p.ProductoID AND s.EmisorID = p.EmisorID
        WHERE p.EmisorID = ? AND p.ProductoID = ?
        LIMIT 1
    ");
    $stmt->execute([$emisorId, $prodId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) return null;

    $valUnit = floatval($row['valorUnitario'] ?? 0);
    $ivaRate = floatval($row['IVAtasa'] ?? 16);
    $iepsRate = floatval($row['IEPStasa'] ?? 0);
    $priceWithTax = round($valUnit * (1 + $ivaRate / 100) * (1 + $iepsRate / 100), 2);

    $hasDecant = ($row['TieneDecant'] ?? 'SI') !== 'NO';
    $decPrice = !empty($row['PrecioDecant']) ? floatval($row['PrecioDecant']) : round(max(150, $priceWithTax * 0.18), 2);

    $acordes = !empty($row['AcordesPrincipales']) ? json_decode($row['AcordesPrincipales'], true) : [];
    if (!is_array($acordes)) $acordes = array_filter(array_map('trim', explode(',', (string)$row['AcordesPrincipales'])));

    $salida = !empty($row['NotasSalida']) ? json_decode($row['NotasSalida'], true) : [];
    if (!is_array($salida)) $salida = array_filter(array_map('trim', explode(',', (string)$row['NotasSalida'])));

    $corazon = !empty($row['NotasCorazon']) ? json_decode($row['NotasCorazon'], true) : [];
    if (!is_array($corazon)) $corazon = array_filter(array_map('trim', explode(',', (string)$row['NotasCorazon'])));

    $fondo = !empty($row['NotasFondo']) ? json_decode($row['NotasFondo'], true) : [];
    if (!is_array($fondo)) $fondo = array_filter(array_map('trim', explode(',', (string)$row['NotasFondo'])));

    $cover = !empty($row['CoverRuta']) ? $row['CoverRuta'] : 'https://media.evinux.net/perfumes/default.jpg';
    if (!preg_match('/^https?:\/\//i', $cover)) {
        $cover = 'https://media.evinux.net/perfumes/' . ltrim($cover, '/');
    }

    return [
        'id' => $row['ProductoID'],
        'name' => $row['nombre'],
        'code' => $row['noIdentificacion'] ?: '',
        'sku' => $row['SKU'] ?: '',
        'cover' => $cover,
        'priceWithTax' => $priceWithTax,
        'hasDecant' => $hasDecant,
        'decantPrice' => $decPrice,
        'family' => $row['FamiliaOlfativa'] ?: 'Amaderada Noble',
        'gender' => $row['GeneroTarget'] ?: 'UNISEX',
        'accords' => $acordes ?: ['Fresco', 'Amaderado'],
        'topNotes' => $salida ?: ['Bergamota Fresca'],
        'heartNotes' => $corazon ?: ['Lavanda Noble'],
        'baseNotes' => $fondo ?: ['Cedro', 'Ámbar'],
        'summer' => intval($row['TemporadaVerano'] ?? 5),
        'winter' => intval($row['TemporadaInvierno'] ?? 5),
        'dateOcc' => intval($row['OcasionCita'] ?? 5),
        'beach' => intval($row['OcasionPlaya'] ?? 5),
        'formal' => intval($row['OcasionFormal'] ?? 5),
        'daily' => intval($row['OcasionDiario'] ?? 5),
        'sillage' => intval($row['Estela'] ?? 2),
        'longevity' => floatval($row['LongevidadHoras'] ?? 8.0),
        'auraColor' => $row['AuraColor'] ?: 'cyan',
        'auraParticles' => $row['AuraParticulas'] ?: 'breeze'
    ];
}

// Function to compute layering synergy between two products
function evaluateSynergy(array $base, array $accent): array {
    $score = 72; // baseline

    $denseFamilies = ['Amaderada Noble', 'Oriental / Ámbar Cálido', 'Gourmand / Vainilla'];
    $freshFamilies = ['Cítrica Fresca', 'Acuática / Marina', 'Aromática / Fougère'];

    $isBaseDense = in_array($base['family'], $denseFamilies);
    $isAccentFresh = in_array($accent['family'], $freshFamilies);

    $isBaseFresh = in_array($base['family'], $freshFamilies);
    $isAccentDense = in_array($accent['family'], $denseFamilies);

    // Rule 1: Dense Base + Fresh Accent (Magisterial Polarity)
    if (($isBaseDense && $isAccentFresh) || ($isBaseFresh && $isAccentDense)) {
        $score += 24;
        $synergyType = "Contraste Magisterial (Densidad & Chispa Fresca)";
    } 
    // Rule 2: Oriental + Amaderada
    elseif (($base['family'] === 'Oriental / Ámbar Cálido' && $accent['family'] === 'Amaderada Noble') ||
            ($base['family'] === 'Amaderada Noble' && $accent['family'] === 'Oriental / Ámbar Cálido')) {
        $score += 20;
        $synergyType = "Armonía de Maderas Nobles & Ámbar Resinoso";
    }
    // Rule 3: Gourmand + Floral
    elseif (($base['family'] === 'Gourmand / Vainilla' && $accent['family'] === 'Floral Sofisticada') ||
            ($base['family'] === 'Floral Sofisticada' && $accent['family'] === 'Gourmand / Vainilla')) {
        $score += 18;
        $synergyType = "Seducción Terciopelo (Vainilla & Pétalos Blancos)";
    }
    // Rule 4: Cítrica + Acuática
    elseif ($isBaseFresh && $isAccentFresh) {
        $score += 15;
        $synergyType = "Explosión Cítrica & Marina Ultra-Luminosa";
    }
    // Conflict rule: Both ultra heavy/dense
    elseif ($base['family'] === $accent['family'] && $isBaseDense) {
        $score -= 10;
        $synergyType = "Fusión Monolítica Intensa";
    } else {
        $score += 10;
        $synergyType = "Sinergia Polivalente Equilibrada";
    }

    // Accords overlap / synergy
    $baseAccords = array_map('mb_strtolower', $base['accords']);
    $accentAccords = array_map('mb_strtolower', $accent['accords']);
    $common = array_intersect($baseAccords, $accentAccords);
    $score += min(6, count($common) * 2);

    $score = max(60, min(99, $score));

    // Hybrid Blend Name
    $blendName = "Alquimia {$base['family']} × {$accent['family']}";

    // Hybrid Pyramid
    $hybridTop = array_values(array_unique(array_merge(
        array_slice($accent['topNotes'], 0, 2),
        array_slice($base['topNotes'], 0, 1)
    )));
    $hybridHeart = array_values(array_unique(array_merge(
        array_slice($base['heartNotes'], 0, 2),
        array_slice($accent['heartNotes'], 0, 2)
    )));
    $hybridBase = array_values(array_unique(array_merge(
        array_slice($base['baseNotes'], 0, 2),
        array_slice($accent['baseNotes'], 0, 1)
    )));

    // Occasion & Performance
    $topOccasion = 'Noche de Gala & Citas';
    $maxOccVal = $base['dateOcc'] + $accent['dateOcc'];
    if (($base['beach'] + $accent['beach']) > $maxOccVal) {
        $topOccasion = 'Verano, Playa & Climas Cálidos';
        $maxOccVal = $base['beach'] + $accent['beach'];
    }
    if (($base['formal'] + $accent['formal']) > $maxOccVal) {
        $topOccasion = 'Eventos Formales, Negocios & Galas';
    }

    $hybridSillage = min(4, max($base['sillage'], $accent['sillage']) + ($score > 90 ? 1 : 0));
    $hybridLongevity = round(max($base['longevity'], $accent['longevity']) + 1.5, 1);

    // Pricing Economics (15% Bundle Discount)
    $regTotal = $base['priceWithTax'] + $accent['priceWithTax'];
    $bundleDiscount = 15;
    $bundlePrice = round($regTotal * (1 - $bundleDiscount / 100), 2);
    $savings = round($regTotal - $bundlePrice, 2);

    $decantRegTotal = $base['decantPrice'] + $accent['decantPrice'];
    $decantBundlePrice = round($decantRegTotal * (1 - $bundleDiscount / 100), 2);
    $decantSavings = round($decantRegTotal - $decantBundlePrice, 2);

    return [
        'affinityScore' => $score,
        'synergyType' => $synergyType,
        'blendName' => $blendName,
        'hybridPyramid' => [
            'top' => $hybridTop,
            'heart' => $hybridHeart,
            'base' => $hybridBase
        ],
        'recommendedOccasion' => $topOccasion,
        'hybridSillage' => $hybridSillage,
        'hybridLongevity' => $hybridLongevity,
        'bundle' => [
            'discountPercent' => $bundleDiscount,
            'fullRegularPrice' => $regTotal,
            'fullBundlePrice' => $bundlePrice,
            'fullSavings' => $savings,
            'decantRegularPrice' => $decantRegTotal,
            'decantBundlePrice' => $decantBundlePrice,
            'decantSavings' => $decantSavings
        ]
    ];
}

// -------------------------------------------------------------
// ACTION: MATCH (Calculate synergy between base and accent)
// -------------------------------------------------------------
if ($action === 'match') {
    if (empty($baseId) || empty($accentId)) {
        http_response_code(400);
        echo json_encode(['Status' => 'ERROR', 'Message' => 'Faltan parámetros baseId y accentId']);
        exit;
    }

    $base = getProductData($db, $tenant->emisorId, $baseId);
    $accent = getProductData($db, $tenant->emisorId, $accentId);

    if (!$base || !$accent) {
        http_response_code(404);
        echo json_encode(['Status' => 'ERROR', 'Message' => 'Uno o ambos productos no fueron encontrados']);
        exit;
    }

    $synergy = evaluateSynergy($base, $accent);

    echo json_encode([
        'Status' => 'OK',
        'base' => $base,
        'accent' => $accent,
        'synergy' => $synergy
    ], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
    exit;
}

// -------------------------------------------------------------
// ACTION: RECOMMEND (Find top companion fragrances for a base)
// -------------------------------------------------------------
if ($action === 'recommend') {
    if (empty($baseId)) {
        http_response_code(400);
        echo json_encode(['Status' => 'ERROR', 'Message' => 'Falta parámetro baseId']);
        exit;
    }

    $base = getProductData($db, $tenant->emisorId, $baseId);
    if (!$base) {
        http_response_code(404);
        echo json_encode(['Status' => 'ERROR', 'Message' => 'Producto base no encontrado']);
        exit;
    }

    // Fetch all active products
    $stmt = $db->prepare("
        SELECT ProductoID 
        FROM productos 
        WHERE EmisorID = ? 
          AND ProductoID != ?
          AND (EnTiendaOnline = 'SI' OR EnTiendaOnline IS NULL)
          AND (TiendaInicio IS NULL OR TiendaInicio <= NOW())
          AND (TiendaFin IS NULL OR TiendaFin >= NOW())
    ");
    $stmt->execute([$tenant->emisorId, $baseId]);
    $candidates = [];
    while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $pData = getProductData($db, $tenant->emisorId, $r['ProductoID']);
        if ($pData) {
            $syn = evaluateSynergy($base, $pData);
            $candidates[] = [
                'product' => $pData,
                'affinityScore' => $syn['affinityScore'],
                'synergyType' => $syn['synergyType'],
                'bundle' => $syn['bundle']
            ];
        }
    }

    // Sort by affinity descending
    usort($candidates, function($a, $b) {
        return $b['affinityScore'] <=> $a['affinityScore'];
    });

    $topCompanions = array_slice($candidates, 0, 6);

    echo json_encode([
        'Status' => 'OK',
        'base' => $base,
        'companions' => $topCompanions
    ], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
    exit;
}

// -------------------------------------------------------------
// ACTION: CURATED (Returns master alchemical recipes)
// -------------------------------------------------------------
if ($action === 'curated') {
    // Get top 2 featured pairs
    $stmt = $db->prepare("
        SELECT ProductoID 
        FROM productos 
        WHERE EmisorID = ? AND (EnTiendaOnline = 'SI' OR EnTiendaOnline IS NULL)
        ORDER BY descripcion ASC 
        LIMIT 6
    ");
    $stmt->execute([$tenant->emisorId]);
    $ids = [];
    while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) $ids[] = $r['ProductoID'];

    $curatedList = [];
    if (count($ids) >= 2) {
        $p1 = getProductData($db, $tenant->emisorId, $ids[0]);
        $p2 = getProductData($db, $tenant->emisorId, $ids[1]);
        if ($p1 && $p2) {
            $syn = evaluateSynergy($p1, $p2);
            $curatedList[] = [
                'title' => 'Elixir de la Noche Imperial',
                'description' => 'La combinación definitiva de ámbar resinoso y cítricos chispeantes.',
                'base' => $p1,
                'accent' => $p2,
                'synergy' => $syn
            ];
        }
    }

    echo json_encode([
        'Status' => 'OK',
        'curated' => $curatedList
    ], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo json_encode(['Status' => 'ERROR', 'Message' => 'Acción no reconocida']);
