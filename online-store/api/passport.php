<?php
/**
 * online-store/api/passport.php
 * REST API for Digital Decant Passport & Blind-Buy Shield Cash-Back Engine
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

error_reporting(E_ALL & ~E_WARNING & ~E_NOTICE & ~E_DEPRECATED);

require_once dirname(__DIR__) . '/includes/tenant_resolver.php';

$tenant = StorefrontTenant::resolve();
$db = get_store_db();

if (!$db) {
    echo json_encode(['Status' => 'Error', 'Error' => 'Database connection failed']);
    exit;
}

$tenantParam = $tenant->emisorId ?: ($_GET['tenant'] ?? $_POST['tenant'] ?? '00163e311ce9a3e711f1591962781ba6');
$action = trim((string)($_GET['action'] ?? $_POST['action'] ?? 'load_passport'));

function generateUuid(): string {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

try {
    if ($action === 'load_passport') {
        $code = trim((string)($_GET['code'] ?? 'PASS-2026-VIP'));
        $email = trim((string)($_GET['email'] ?? ''));

        if (!empty($email)) {
            $stmt = $db->prepare("SELECT p.* FROM decant_passports p WHERE p.EmisorID = ? AND p.ClienteEmail = ? LIMIT 1");
            $stmt->execute([$tenantParam, $email]);
        } else {
            $stmt = $db->prepare("SELECT p.* FROM decant_passports p WHERE p.EmisorID = ? AND (p.CodigoAcceso = ? OR p.CodigoAcceso = 'PASS-2026-VIP') LIMIT 1");
            $stmt->execute([$tenantParam, $code]);
        }

        $passport = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$passport) {
            // Fallback: load first passport for this tenant
            $stmt = $db->prepare("SELECT p.* FROM decant_passports p WHERE p.EmisorID = ? LIMIT 1");
            $stmt->execute([$tenantParam]);
            $passport = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        if (!$passport) {
            echo json_encode([
                'Status' => 'OK',
                'Passport' => null,
                'Entries' => [],
                'Stats' => ['total' => 0, 'stamped' => 0, 'pending' => 0, 'totalCredit' => 0]
            ], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
            exit;
        }

        $passportId = $passport['PassportID'];

        // Load entries joined with products & sensorial
        $sqlEntries = "SELECT e.*, 
            p.Descripcion AS NombreProducto, p.valorUnitario, p.IVAtasa, p.IEPStasa,
            pa.RutaRelativa AS CoverRuta, pa.RutaMiniatura AS CoverMiniatura,
            s.TieneDecant, s.PrecioDecant, s.AuraColor, s.AuraParticulas, s.FamiliaOlfativa,
            s.NotasSalida, s.NotasCorazon, s.NotasFondo, s.RadarProyeccion, s.RadarLongevidad
            FROM decant_passport_entries e
            JOIN productos p ON e.ProductoID = p.ProductoID AND e.EmisorID = p.EmisorID
            LEFT JOIN productos_archivos pa ON p.ProductoID = pa.ProductoID AND pa.EsPrincipal = 'SI' AND pa.Activo = 1
            LEFT JOIN productos_sensorial s ON e.ProductoID = s.ProductoID AND e.EmisorID = s.EmisorID
            WHERE e.PassportID = ?
            ORDER BY e.FechaCompra DESC";

        $stmtEntries = $db->prepare($sqlEntries);
        $stmtEntries->execute([$passportId]);
        $rawEntries = $stmtEntries->fetchAll(PDO::FETCH_ASSOC);

        $entries = [];
        $stampedCount = 0;
        $pendingCount = 0;

        foreach ($rawEntries as $row) {
            $entryId = $row['EntryID'];
            $pId = $row['ProductoID'];

            // Price calculation with tax
            $valUnit = floatval($row['valorUnitario'] ?? 0);
            $ivaRate = floatval($row['IVAtasa'] ?? 16);
            $iepsRate = floatval($row['IEPStasa'] ?? 0);
            $price100ml = round($valUnit * (1 + $ivaRate / 100) * (1 + $iepsRate / 100), 2);

            // Check active voucher
            $stmtV = $db->prepare("SELECT * FROM decant_cashback_vouchers WHERE EntryID = ? AND Canjeado = 'NO' AND FechaExpiracion > NOW() LIMIT 1");
            $stmtV->execute([$entryId]);
            $voucher = $stmtV->fetch(PDO::FETCH_ASSOC);
            $voucherData = null;

            if ($voucher) {
                $daysRemaining = max(0, (int)ceil((strtotime($voucher['FechaExpiracion']) - time()) / 86400));
                $voucherData = [
                    'voucherId' => $voucher['VoucherID'],
                    'code' => $voucher['CodigoVoucher'],
                    'amount' => floatval($voucher['MontoCredito']),
                    'expiry' => $voucher['FechaExpiracion'],
                    'daysRemaining' => $daysRemaining,
                    'isRedeemed' => ($voucher['Canjeado'] === 'SI')
                ];
            }

            if ($row['SelloEstampado'] === 'SI') {
                $stampedCount++;
            } else {
                $pendingCount++;
            }

            $imgUrl = '';
            if (!empty($row['CoverRuta'])) {
                $imgUrl = $row['CoverRuta'];
            } elseif (!empty($row['CoverMiniatura'])) {
                $imgUrl = $row['CoverMiniatura'];
            }

            $entries[] = [
                'entryId' => $row['EntryID'],
                'productId' => $pId,
                'productName' => $row['NombreProducto'],
                'fullPrice' => $price100ml ?: 1450.00,
                'decantPrice' => floatval($row['PrecioPagado'] ?: ($row['PrecioDecant'] ?: 195)),
                'purchaseDate' => $row['FechaCompra'],
                'rating' => $row['Calificacion'] ? intval($row['Calificacion']) : null,
                'longevity' => $row['LongevidadPercibida'] ? floatval($row['LongevidadPercibida']) : null,
                'compliments' => $row['ElogiosNivel'] ?: null,
                'journalNote' => $row['NotasDiario'] ?: '',
                'isStamped' => ($row['SelloEstampado'] === 'SI'),
                'tastingDate' => $row['FechaCata'],
                'auraColor' => $row['AuraColor'] ?: 'cyan',
                'family' => $row['FamiliaOlfativa'] ?: 'Aromática',
                'photo' => $imgUrl,
                'voucher' => $voucherData
            ];
        }

        // Sum active credit
        $stmtSum = $db->prepare("SELECT SUM(MontoCredito) AS TotalCredito FROM decant_cashback_vouchers WHERE PassportID = ? AND Canjeado = 'NO' AND FechaExpiracion > NOW()");
        $stmtSum->execute([$passportId]);
        $sumRow = $stmtSum->fetch(PDO::FETCH_ASSOC);
        $totalCredit = !empty($sumRow['TotalCredito']) ? floatval($sumRow['TotalCredito']) : 0.00;

        echo json_encode([
            'Status' => 'OK',
            'Passport' => [
                'id' => $passport['PassportID'],
                'code' => $passport['CodigoAcceso'],
                'clientName' => $passport['ClienteNombre'],
                'clientEmail' => $passport['ClienteEmail'],
                'clientPhone' => $passport['ClienteTelefono']
            ],
            'Entries' => $entries,
            'Stats' => [
                'total' => count($entries),
                'stamped' => $stampedCount,
                'pending' => $pendingCount,
                'totalCredit' => $totalCredit
            ]
        ], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'submit_tasting_review') {
        $entryId = trim((string)($_POST['entryId'] ?? ''));
        $rating = max(1, min(5, intval($_POST['rating'] ?? 5)));
        $longevity = max(1.0, min(24.0, floatval($_POST['longevity'] ?? 8.0)));
        $compliments = trim((string)($_POST['compliments'] ?? 'Imán de Cumplidos'));
        $journal = trim((string)($_POST['journal'] ?? ''));

        if (empty($entryId)) {
            echo json_encode(['Status' => 'Error', 'Error' => 'entryId is required']);
            exit;
        }

        $stmtE = $db->prepare("SELECT * FROM decant_passport_entries WHERE EntryID = ? LIMIT 1");
        $stmtE->execute([$entryId]);
        $entry = $stmtE->fetch(PDO::FETCH_ASSOC);

        if (!$entry) {
            echo json_encode(['Status' => 'Error', 'Error' => 'Entry not found']);
            exit;
        }

        $passportId = $entry['PassportID'];
        $productId = $entry['ProductoID'];
        $precioPagado = floatval($entry['PrecioPagado'] ?: 195.00);
        $now = date('Y-m-d H:i:s');
        $expiry = date('Y-m-d H:i:s', strtotime('+30 days'));

        // Update Entry
        $stmtUp = $db->prepare("UPDATE decant_passport_entries SET 
            `Calificacion` = ?,
            `LongevidadPercibida` = ?,
            `ElogiosNivel` = ?,
            `NotasDiario` = ?,
            `SelloEstampado` = 'SI',
            `FechaCata` = ?
            WHERE `EntryID` = ?");
        $stmtUp->execute([$rating, $longevity, $compliments, $journal, $now, $entryId]);

        // Generate 100% Cash-Back Voucher
        $voucherCode = 'SHIELD-' . strtoupper(substr(md5($productId . time()), 0, 6)) . '-' . intval($precioPagado);
        $voucherId = generateUuid();

        // Check if voucher already exists
        $stmtCheck = $db->prepare("SELECT VoucherID, CodigoVoucher FROM decant_cashback_vouchers WHERE EntryID = ? LIMIT 1");
        $stmtCheck->execute([$entryId]);
        $existingV = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$existingV) {
            $stmtVouch = $db->prepare("INSERT INTO `decant_cashback_vouchers`
                (`VoucherID`, `EmisorID`, `PassportID`, `EntryID`, `ProductoID`, `CodigoVoucher`, `MontoCredito`, `FechaExpiracion`, `Canjeado`, `CreadoEn`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'NO', ?)");
            $stmtVouch->execute([$voucherId, $tenantParam, $passportId, $entryId, $productId, $voucherCode, $precioPagado, $expiry, $now]);
        } else {
            $voucherId = $existingV['VoucherID'];
            $voucherCode = $existingV['CodigoVoucher'];
        }

        echo json_encode([
            'Status' => 'OK',
            'Message' => 'Cata registrada y Sello Dorado estampado con éxito',
            'Voucher' => [
                'id' => $voucherId,
                'code' => $voucherCode,
                'amount' => $precioPagado,
                'expiry' => $expiry,
                'daysRemaining' => 30
            ]
        ], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'apply_voucher') {
        $code = trim((string)($_POST['code'] ?? $_GET['code'] ?? ''));
        $productId = trim((string)($_POST['productId'] ?? $_GET['productId'] ?? ''));

        if (empty($code)) {
            echo json_encode(['Status' => 'Error', 'Error' => 'Código de cupón requerido']);
            exit;
        }

        $stmt = $db->prepare("SELECT v.*, p.Descripcion AS NombreProducto, p.valorUnitario, p.IVAtasa, p.IEPStasa
            FROM decant_cashback_vouchers v
            JOIN productos p ON v.ProductoID = p.ProductoID AND v.EmisorID = p.EmisorID
            WHERE v.CodigoVoucher = ? AND v.EmisorID = ? LIMIT 1");
        $stmt->execute([$code, $tenantParam]);
        $voucher = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$voucher) {
            echo json_encode(['Status' => 'Error', 'Error' => 'Cupón no encontrado o inválido']);
            exit;
        }

        if ($voucher['Canjeado'] === 'SI') {
            echo json_encode(['Status' => 'Error', 'Error' => 'Este cupón ya ha sido canjeado']);
            exit;
        }

        if (strtotime($voucher['FechaExpiracion']) < time()) {
            echo json_encode(['Status' => 'Error', 'Error' => 'El cupón ha expirado']);
            exit;
        }

        $amount = floatval($voucher['MontoCredito']);
        $targetProd = $voucher['ProductoID'];
        $prodName = $voucher['NombreProducto'];

        echo json_encode([
            'Status' => 'OK',
            'Valid' => true,
            'Voucher' => [
                'id' => $voucher['VoucherID'],
                'code' => $voucher['CodigoVoucher'],
                'amount' => $amount,
                'productId' => $targetProd,
                'productName' => $prodName,
                'discountLabel' => "🛡️ Bono Blind-Buy Shield (-$" . number_format($amount, 2) . ")"
            ]
        ], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'community_ratings') {
        $productId = trim((string)($_GET['productId'] ?? ''));
        if (empty($productId)) {
            echo json_encode(['Status' => 'Error', 'Error' => 'productId required']);
            exit;
        }

        $stmt = $db->prepare("SELECT 
            COUNT(*) AS TotalCatas,
            AVG(Calificacion) AS RatingAvg,
            AVG(LongevidadPercibida) AS LongevidadAvg
            FROM decant_passport_entries
            WHERE ProductoID = ? AND EmisorID = ? AND SelloEstampado = 'SI'");
        $stmt->execute([$productId, $tenantParam]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'Status' => 'OK',
            'Stats' => [
                'totalCatas' => intval($data['TotalCatas'] ?? 0),
                'ratingAvg' => round(floatval($data['RatingAvg'] ?? 4.9), 1),
                'longevidadAvg' => round(floatval($data['LongevidadAvg'] ?? 8.5), 1)
            ]
        ], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(['Status' => 'Error', 'Error' => "Acción '$action' no reconocida"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['Status' => 'Error', 'Error' => $e->getMessage()]);
}
