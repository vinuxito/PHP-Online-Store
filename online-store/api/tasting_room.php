<?php
/**
 * online-store/api/tasting_room.php
 * REST API for The Private Tasting Room & Live Virtual Sommelier Atelier
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
$action = trim((string)($_GET['action'] ?? $_POST['action'] ?? 'get_available_slots'));

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
    if ($action === 'get_available_slots') {
        $date = trim((string)($_GET['date'] ?? date('Y-m-d')));
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $date = date('Y-m-d');
        }

        $allSlots = ['11:00', '12:30', '14:00', '15:30', '17:00', '18:30', '20:00'];
        
        $stmt = $db->prepare("SELECT ScheduledTime FROM tasting_sessions WHERE EmisorID = ? AND ScheduledDate = ? AND Status IN ('SCHEDULED', 'IN_PROGRESS')");
        $stmt->execute([$tenantParam, $date]);
        $booked = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $slots = [];
        foreach ($allSlots as $slot) {
            $isAvailable = !in_array($slot, $booked);
            $slots[] = [
                'time' => $slot,
                'durationMinutes' => 20,
                'isAvailable' => $isAvailable,
                'label' => $slot . ' hrs (' . ($isAvailable ? 'Disponible' : 'Reservado') . ')'
            ];
        }

        echo json_encode([
            'Status' => 'OK',
            'Date' => $date,
            'Sommelier' => [
                'name' => 'Jean-Luc Moreau',
                'title' => 'Master Perfumer & Chief Sommelier',
                'avatar' => 'assets/sommelier_avatar.jpg',
                'rating' => 4.98,
                'completedTastings' => 342
            ],
            'Slots' => $slots
        ]);
        exit;
    }

    if ($action === 'get_box_templates') {
        $stmt = $db->prepare("SELECT * FROM tasting_box_templates WHERE EmisorID = ? AND Active = 1");
        $stmt->execute([$tenantParam]);
        $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $formatted = [];
        foreach ($templates as $tmpl) {
            $prodIds = json_decode($tmpl['ProductIDs'] ?? '[]', true) ?: [];
            
            $prodDetails = [];
            if (!empty($prodIds)) {
                $inQuery = implode(',', array_fill(0, count($prodIds), '?'));
                $pStmt = $db->prepare("SELECT ProductoID, descripcion, valorUnitario FROM productos WHERE ProductoID IN ($inQuery)");
                $pStmt->execute($prodIds);
                while ($p = $pStmt->fetch(PDO::FETCH_ASSOC)) {
                    $prodDetails[] = [
                        'productId' => $p['ProductoID'],
                        'title' => $p['descripcion'],
                        'price' => (float)$p['valorUnitario'],
                        'format' => 'Decant 5ml'
                    ];
                }
            }

            $formatted[] = [
                'templateId' => $tmpl['TemplateID'],
                'title' => $tmpl['Title'],
                'price' => (float)$tmpl['Price'],
                'cashBackGuarantee' => '100% Bonificable en Frasco 100ml',
                'description' => $tmpl['Description'],
                'products' => $prodDetails
            ];
        }

        echo json_encode([
            'Status' => 'OK',
            'Templates' => $formatted
        ]);
        exit;
    }

    if ($action === 'book_session') {
        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $clientName = trim((string)($input['clientName'] ?? ''));
        $clientEmail = trim((string)($input['clientEmail'] ?? ''));
        $clientPhone = trim((string)($input['clientPhone'] ?? ''));
        $clientCity = trim((string)($input['clientCity'] ?? 'Guadalajara, JAL'));
        $scheduledDate = trim((string)($input['scheduledDate'] ?? date('Y-m-d')));
        $scheduledTime = trim((string)($input['scheduledTime'] ?? '17:00'));
        $channel = in_array(strtoupper($input['channel'] ?? ''), ['WEBRTC', 'WHATSAPP']) ? strtoupper($input['channel']) : 'WEBRTC';
        $notes = trim((string)($input['notes'] ?? ''));

        if (!$clientName || !$clientEmail || !$clientPhone) {
            echo json_encode(['Status' => 'Error', 'Error' => 'Por favor completa nombre, email y teléfono.']);
            exit;
        }

        $sessionId = 'SESS-' . strtoupper(substr(md5(uniqid('', true)), 0, 8));
        $bookingCode = 'TASTE-' . strtoupper(substr(md5(uniqid('', true)), 0, 6)) . '-VIP';
        $voucherCode = 'TASTEVOUCH-' . strtoupper(substr(md5(uniqid('', true)), 0, 6));

        $stmt = $db->prepare("
            INSERT INTO tasting_sessions 
            (SessionID, EmisorID, BookingCode, ClientName, ClientEmail, ClientPhone, ClientCity, ScheduledDate, ScheduledTime, DurationMinutes, SommelierName, Channel, Status, DiscoveryBoxStatus, CashBackVoucherCode, CashBackAmount, Notes, CreatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 20, 'Jean-Luc Moreau (Master Perfumer)', ?, 'SCHEDULED', 'DELIVERED', ?, 499.00, ?, NOW())
        ");
        $stmt->execute([
            $sessionId,
            $tenantParam,
            $bookingCode,
            $clientName,
            $clientEmail,
            $clientPhone,
            $clientCity,
            $scheduledDate,
            $scheduledTime,
            $channel,
            $voucherCode,
            $notes
        ]);

        // Insert initial canvas projection event
        $firstProdStmt = $db->prepare("SELECT ProductoID, descripcion FROM productos WHERE EmisorID = ? AND EnTiendaOnline = 1 LIMIT 1");
        $firstProdStmt->execute([$tenantParam]);
        $firstProd = $firstProdStmt->fetch(PDO::FETCH_ASSOC);

        $payload = json_encode([
            'productId' => $firstProd['ProductoID'] ?? 'PROD-001',
            'action' => 'PROJECT_PRODUCT',
            'title' => $firstProd['descripcion'] ?? 'Fragancia Exclusiva',
            'sommelierNote' => 'Bienvenido a tu sesión privada de cata.',
            'auraColor' => 'purple'
        ]);

        $evStmt = $db->prepare("INSERT INTO tasting_canvas_events (SessionID, ActionType, PayloadJson, CreatedAt) VALUES (?, 'PROJECT_PRODUCT', ?, NOW())");
        $evStmt->execute([$sessionId, $payload]);

        echo json_encode([
            'Status' => 'OK',
            'Message' => 'Cita de cata virtual agendada con éxito',
            'Session' => [
                'sessionId' => $sessionId,
                'bookingCode' => $bookingCode,
                'clientName' => $clientName,
                'clientCity' => $clientCity,
                'scheduledDate' => $scheduledDate,
                'scheduledTime' => $scheduledTime,
                'durationMinutes' => 20,
                'channel' => $channel,
                'sommelier' => 'Jean-Luc Moreau (Master Perfumer)',
                'cashBackVoucher' => $voucherCode,
                'cashBackAmount' => 499.00,
                'status' => 'SCHEDULED'
            ]
        ]);
        exit;
    }

    if ($action === 'get_session_status') {
        $code = trim((string)($_GET['code'] ?? 'TASTE-2026-VIP'));

        $stmt = $db->prepare("SELECT * FROM tasting_sessions WHERE EmisorID = ? AND (BookingCode = ? OR SessionID = ? OR BookingCode = 'TASTE-2026-VIP') LIMIT 1");
        $stmt->execute([$tenantParam, $code, $code]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$session) {
            echo json_encode(['Status' => 'Error', 'Error' => 'Sesión de cata no encontrada']);
            exit;
        }

        // Get latest canvas event
        $evStmt = $db->prepare("SELECT * FROM tasting_canvas_events WHERE SessionID = ? ORDER BY EventID DESC LIMIT 1");
        $evStmt->execute([$session['SessionID']]);
        $lastEvent = $evStmt->fetch(PDO::FETCH_ASSOC);

        $activePayload = null;
        if ($lastEvent) {
            $activePayload = json_decode($lastEvent['PayloadJson'], true);
        }

        echo json_encode([
            'Status' => 'OK',
            'Session' => [
                'sessionId' => $session['SessionID'],
                'bookingCode' => $session['BookingCode'],
                'clientName' => $session['ClientName'],
                'clientEmail' => $session['ClientEmail'],
                'clientPhone' => $session['ClientPhone'],
                'clientCity' => $session['ClientCity'],
                'scheduledDate' => $session['ScheduledDate'],
                'scheduledTime' => $session['ScheduledTime'],
                'durationMinutes' => (int)$session['DurationMinutes'],
                'sommelier' => $session['SommelierName'],
                'channel' => $session['Channel'],
                'status' => $session['Status'],
                'discoveryBoxStatus' => $session['DiscoveryBoxStatus'],
                'cashBackVoucher' => $session['CashBackVoucherCode'],
                'cashBackAmount' => (float)$session['CashBackAmount'],
                'notes' => $session['Notes']
            ],
            'ActiveCanvas' => [
                'eventId' => $lastEvent ? (int)$lastEvent['EventID'] : 0,
                'actionType' => $lastEvent['ActionType'] ?? 'PROJECT_PRODUCT',
                'payload' => $activePayload,
                'timestamp' => $lastEvent['CreatedAt'] ?? date('Y-m-d H:i:s')
            ]
        ]);
        exit;
    }

    if ($action === 'sync_canvas_event') {
        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $sessionId = trim((string)($input['sessionId'] ?? 'SESS-2026-AVH-VIP'));
        $actionType = trim((string)($input['actionType'] ?? 'PROJECT_PRODUCT'));
        $payload = $input['payload'] ?? [];

        $payloadJson = is_string($payload) ? $payload : json_encode($payload);

        $stmt = $db->prepare("INSERT INTO tasting_canvas_events (SessionID, ActionType, PayloadJson, CreatedAt) VALUES (?, ?, ?, NOW())");
        $stmt->execute([$sessionId, $actionType, $payloadJson]);
        $eventId = (int)$db->lastInsertId();

        echo json_encode([
            'Status' => 'OK',
            'EventID' => $eventId,
            'ActionType' => $actionType,
            'Message' => 'Evento de lienzo sincronizado en vivo'
        ]);
        exit;
    }

    if ($action === 'poll_canvas_events') {
        $sessionId = trim((string)($_GET['sessionId'] ?? 'SESS-2026-AVH-VIP'));
        $lastEventId = (int)($_GET['lastEventId'] ?? 0);

        $stmt = $db->prepare("SELECT * FROM tasting_canvas_events WHERE SessionID = ? AND EventID > ? ORDER BY EventID ASC");
        $stmt->execute([$sessionId, $lastEventId]);
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $formatted = [];
        foreach ($events as $ev) {
            $formatted[] = [
                'eventId' => (int)$ev['EventID'],
                'actionType' => $ev['ActionType'],
                'payload' => json_decode($ev['PayloadJson'], true),
                'createdAt' => $ev['CreatedAt']
            ];
        }

        echo json_encode([
            'Status' => 'OK',
            'SessionID' => $sessionId,
            'NewEvents' => $formatted,
            'Count' => count($formatted)
        ]);
        exit;
    }

    if ($action === 'generate_wa_session_link') {
        $code = trim((string)($_GET['code'] ?? 'TASTE-2026-VIP'));

        $stmt = $db->prepare("SELECT * FROM tasting_sessions WHERE EmisorID = ? AND (BookingCode = ? OR SessionID = ? OR BookingCode = 'TASTE-2026-VIP') LIMIT 1");
        $stmt->execute([$tenantParam, $code, $code]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$session) {
            echo json_encode(['Status' => 'Error', 'Error' => 'Sesión no encontrada']);
            exit;
        }

        $phone = '523318259000';
        $msg = "🍷 *CATA VIRTUAL PRIVADA 1-A-1*\n\n"
             . "¡Hola Master Perfumer! Soy *{$session['ClientName']}*.\n"
             . "📌 Código de Sesión: *{$session['BookingCode']}*\n"
             . "📅 Cita Programada: *{$session['ScheduledDate']}* a las *{$session['ScheduledTime']} hrs*\n"
             . "🎁 Discovery Box: *{$session['DiscoveryBoxStatus']}*\n"
             . "💎 Crédito Cash-Back: *\$" . number_format($session['CashBackAmount'], 2) . " MXN*\n\n"
             . "Estoy listo para iniciar nuestra videollamada de cata olfativa.";

        $url = "https://wa.me/{$phone}?text=" . rawurlencode($msg);

        echo json_encode([
            'Status' => 'OK',
            'WhatsAppUrl' => $url,
            'BookingCode' => $session['BookingCode']
        ]);
        exit;
    }

    echo json_encode(['Status' => 'Error', 'Error' => 'Invalid action']);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['Status' => 'Error', 'Error' => $e->getMessage()]);
}
