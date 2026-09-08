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

$tenantParam = $tenant->emisorId;
if (!$tenant->isStoreActive || !$tenantParam || !$tenant->isPerfumery() || (isset($tenant->apexConfig['feature_matrix']['tasting_room']['enabled']) && !$tenant->apexConfig['feature_matrix']['tasting_room']['enabled'])) { http_response_code(403); echo json_encode(['Status' => 'Error', 'Error' => 'La sala de cata no está disponible para esta tienda.']); exit; }
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
                'name' => 'Equipo de la tienda',
                'title' => 'Atención sujeta a confirmación',
                'avatar' => '',
                'rating' => null,
                'completedTastings' => null
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
                $pStmt = $db->prepare("SELECT ProductoID, descripcion, valorUnitario FROM productos WHERE EmisorID = ? AND ProductoID IN ($inQuery)");
                $pStmt->execute(array_merge([$tenantParam], $prodIds));
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
                'cashBackGuarantee' => '',
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

        if (!$clientName || !filter_var($clientEmail, FILTER_VALIDATE_EMAIL) || !$clientPhone) {
            echo json_encode(['Status' => 'Error', 'Error' => 'Por favor completa nombre, email y teléfono.']);
            exit;
        }

        $sessionId = 'SESS-' . strtoupper(bin2hex(random_bytes(12)));
        $bookingCode = 'TASTE-' . strtoupper(bin2hex(random_bytes(12)));
        $voucherCode = '';

        $stmt = $db->prepare("
            INSERT INTO tasting_sessions 
            (SessionID, EmisorID, BookingCode, ClientName, ClientEmail, ClientPhone, ClientCity, ScheduledDate, ScheduledTime, DurationMinutes, SommelierName, Channel, Status, DiscoveryBoxStatus, CashBackVoucherCode, CashBackAmount, Notes, CreatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 20, 'Pendiente de asignación', ?, 'SCHEDULED', 'PENDING', ?, 0.00, ?, NOW())
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

        // A new session has no product projection or delivered discovery box until the store supplies it.

        echo json_encode([
            'Status' => 'OK',
            'Message' => 'Horario registrado; confirma la atención con la tienda. No se ha enviado una notificación.',
            'NotificationStatus' => 'unavailable',
            'Session' => [
                'sessionId' => $sessionId,
                'bookingCode' => $bookingCode,
                'clientName' => $clientName,
                'clientCity' => $clientCity,
                'scheduledDate' => $scheduledDate,
                'scheduledTime' => $scheduledTime,
                'durationMinutes' => 20,
                'channel' => $channel,
                'sommelier' => 'Pendiente de asignación',
                'cashBackVoucher' => $voucherCode,
                'cashBackAmount' => 0,
                'status' => 'SCHEDULED'
            ]
        ]);
        exit;
    }

    if ($action === 'get_session_status') {
        $code = trim((string)($_GET['code'] ?? ''));
        if (!preg_match('/^[a-zA-Z0-9_-]{1,36}$/D', $code)) { http_response_code(400); echo json_encode(['Status' => 'Error', 'Error' => 'Código de sesión inválido.']); exit; }

        $stmt = $db->prepare("SELECT * FROM tasting_sessions WHERE EmisorID = ? AND (BookingCode = ? OR SessionID = ?) LIMIT 1");
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

        $sessionId = trim((string)($input['sessionId'] ?? ''));
        $owner = $db->prepare('SELECT SessionID FROM tasting_sessions WHERE EmisorID = ? AND SessionID = ? LIMIT 1');
        $owner->execute([$tenantParam, $sessionId]);
        if (!$owner->fetch()) { http_response_code(404); echo json_encode(['Status' => 'Error', 'Error' => 'Sesión no encontrada en esta tienda.']); exit; }
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
        $sessionId = trim((string)($_GET['sessionId'] ?? ''));
        $owner = $db->prepare('SELECT SessionID FROM tasting_sessions WHERE EmisorID = ? AND SessionID = ? LIMIT 1');
        $owner->execute([$tenantParam, $sessionId]);
        if (!$owner->fetch()) { http_response_code(404); echo json_encode(['Status' => 'Error', 'Error' => 'Sesión no encontrada en esta tienda.']); exit; }
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
        $code = trim((string)($_GET['code'] ?? ''));
        if (!preg_match('/^[a-zA-Z0-9_-]{1,36}$/D', $code)) { http_response_code(400); echo json_encode(['Status' => 'Error', 'Error' => 'Código de sesión inválido.']); exit; }

        $stmt = $db->prepare("SELECT * FROM tasting_sessions WHERE EmisorID = ? AND (BookingCode = ? OR SessionID = ?) LIMIT 1");
        $stmt->execute([$tenantParam, $code, $code]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$session) {
            echo json_encode(['Status' => 'Error', 'Error' => 'Sesión no encontrada']);
            exit;
        }

        $phone = $tenant->showWhatsapp ? preg_replace('/[^0-9]/', '', $tenant->whatsappPhone) : '';
        if (!$phone) { http_response_code(422); echo json_encode(['Status' => 'Error', 'Error' => 'WhatsApp no está configurado en esta tienda.']); exit; }
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
    echo json_encode(['Status' => 'Error', 'Error' => 'No se pudo completar la operación de la sala de cata.']);
}
