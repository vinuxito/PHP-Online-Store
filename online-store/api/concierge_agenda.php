<?php
/**
 * online-store/api/concierge_agenda.php
 * REST API for Feature 8: The Royal Concierge Agenda & Haute Parfumerie Atelier Booking Suite
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
    echo json_encode(['Status' => 'ERROR', 'Error' => 'Database connection failed']);
    exit;
}

$action = trim((string)($_GET['action'] ?? $_POST['action'] ?? ''));
$tenantId = $tenant->emisorId ?: ($_GET['tenant'] ?? $_POST['tenant'] ?? '00163e311ce9a3e711f1591962781ba6');

switch ($action) {
    // -------------------------------------------------------------------------
    // 1. QUICK SCAN ROYAL KEYCARD (Soft-Gate Identity Intake)
    // -------------------------------------------------------------------------
    case 'quick_scan_keycard':
        $input = isset($_GET['input']) ? trim($_GET['input']) : '';
        if (empty($input)) {
            $input = 'alexander@humboldt-expeditions.org';
        }

        // Search in appointments first using PDO prepared statement
        $stmt = $db->prepare("SELECT * FROM concierge_appointments WHERE ClientEmail = ? OR ClientPhone = ? ORDER BY AppointmentID DESC LIMIT 1");
        $stmt->execute([$input, $input]);
        $appRow = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($appRow || strpos(strtolower($input), 'alexander') !== false || strpos($input, '3318259000') !== false) {
            $name = $appRow ? $appRow['ClientName'] : 'Alexander von Humboldt';
            $email = $appRow ? $appRow['ClientEmail'] : 'alexander@humboldt-expeditions.org';
            $phone = $appRow ? $appRow['ClientPhone'] : '+52 33 1825 9000';
            $tier = $appRow ? $appRow['ClientTier'] : 'MASTER_PERFUMER';
            $lastCode = $appRow ? $appRow['AppointmentCode'] : 'AGENDA-2026-VIP';

            // Extract initials
            $parts = explode(' ', $name);
            $initials = '';
            foreach ($parts as $p) {
                if (!empty($p)) $initials .= strtoupper(substr($p, 0, 1));
            }
            if (strlen($initials) > 3) $initials = substr($initials, 0, 3);
            if (empty($initials)) $initials = 'AVH';

            $tierLabels = [
                'MASTER_PERFUMER' => 'Master Perfumer (Oro 24K)',
                'CONNOISSEUR' => 'Connoisseur VIP',
                'AFICIONADO' => 'Aficionado Noble',
                'GUEST' => 'Pase de Invitado de Cortesía'
            ];

            echo json_encode([
                'Status' => 'OK',
                'IsRegistered' => true,
                'Member' => [
                    'name' => $name,
                    'email' => $email,
                    'phone' => $phone,
                    'initials' => $initials,
                    'tier' => $tier,
                    'tierLabel' => isset($tierLabels[$tier]) ? $tierLabels[$tier] : 'Miembro VIP',
                    'points' => 250,
                    'totalPurchases' => 12,
                    'activeAppointmentsCount' => 1,
                    'lastAppointmentCode' => $lastCode,
                    'signatureScent' => 'Rasasi Hawas / Oud Royal'
                ]
            ]);
        } else {
            // New Guest Keycard Minting
            $guestInitials = 'VIP';
            if (strpos($input, '@') !== false) {
                $prefix = explode('@', $input)[0];
                $guestInitials = strtoupper(substr($prefix, 0, 2));
            }

            echo json_encode([
                'Status' => 'OK',
                'IsRegistered' => false,
                'Member' => [
                    'name' => 'Invitado Distinguido',
                    'email' => strpos($input, '@') !== false ? $input : '',
                    'phone' => strpos($input, '@') === false ? $input : '',
                    'initials' => $guestInitials,
                    'tier' => 'GUEST',
                    'tierLabel' => 'Pase de Invitado de Cortesía',
                    'points' => 50,
                    'totalPurchases' => 0,
                    'activeAppointmentsCount' => 0,
                    'lastAppointmentCode' => null,
                    'signatureScent' => 'Descubrimiento Inicial'
                ]
            ]);
        }
        break;

    // -------------------------------------------------------------------------
    // 2. GET ATMOSPHERIC SLOTS (Chronos & Scent Horizon)
    // -------------------------------------------------------------------------
    case 'get_atmospheric_slots':
        $date = isset($_GET['date']) ? trim($_GET['date']) : date('Y-m-d');

        // Fetch booked appointments for this date using PDO
        $bookedTimes = [];
        $stmtBooked = $db->prepare("SELECT ScheduledTime FROM concierge_appointments WHERE ScheduledDate = ? AND Status NOT IN ('CANCELLED')");
        $stmtBooked->execute([$date]);
        while ($b = $stmtBooked->fetch(PDO::FETCH_ASSOC)) {
            $timeShort = substr($b['ScheduledTime'], 0, 5);
            $bookedTimes[] = $timeShort;
        }

        $bands = [
            'SOLARIUM' => [
                'id' => 'SOLARIUM',
                'name' => 'The Daylight Solarium',
                'timeRange' => '10:00 – 13:00 hrs',
                'icon' => '☀️',
                'atmosphere' => 'Frescura Cítrica, Neroli, Acordes Marinos & Signature Diario',
                'sommelier' => [
                    'id' => 'SOMM-CLAIRE',
                    'name' => 'Claire Dupont',
                    'title' => 'Haute Parfumerie & Layering Alchemist',
                    'avatar' => 'assets/sommelier_claire.png',
                    'rating' => 4.96
                ],
                'slots' => [
                    ['time' => '10:00', 'isAvailable' => !in_array('10:00', $bookedTimes)],
                    ['time' => '11:30', 'isAvailable' => !in_array('11:30', $bookedTimes)],
                    ['time' => '12:45', 'isAvailable' => !in_array('12:45', $bookedTimes)]
                ]
            ],
            'GOLDEN_HOUR' => [
                'id' => 'GOLDEN_HOUR',
                'name' => 'The Golden Hour Atelier',
                'timeRange' => '14:00 – 18:00 hrs',
                'icon' => '🌇',
                'atmosphere' => 'Firmas Olfativas, Maderas Nobles, Ámbar Cálido & Presencia',
                'sommelier' => [
                    'id' => 'SOMM-JEAN-LUC',
                    'name' => 'Jean-Luc Moreau',
                    'title' => 'Master Perfumer & Chief Sommelier',
                    'avatar' => 'assets/sommelier_avatar.png',
                    'rating' => 4.98
                ],
                'slots' => [
                    ['time' => '14:15', 'isAvailable' => !in_array('14:15', $bookedTimes)],
                    ['time' => '15:45', 'isAvailable' => !in_array('15:45', $bookedTimes)],
                    ['time' => '17:15', 'isAvailable' => !in_array('17:15', $bookedTimes)]
                ]
            ],
            'MIDNIGHT' => [
                'id' => 'MIDNIGHT',
                'name' => 'The Midnight Salon',
                'timeRange' => '19:00 – 22:00 hrs',
                'icon' => '🌙',
                'atmosphere' => 'Ouds Raros, Cuero Ahumado, Gourmands de Seducción & Gala',
                'sommelier' => [
                    'id' => 'SOMM-JEAN-LUC',
                    'name' => 'Jean-Luc Moreau',
                    'title' => 'Master Perfumer & Chief Sommelier',
                    'avatar' => 'assets/sommelier_avatar.png',
                    'rating' => 4.98
                ],
                'slots' => [
                    ['time' => '19:00', 'isAvailable' => !in_array('19:00', $bookedTimes)],
                    ['time' => '20:30', 'isAvailable' => !in_array('20:30', $bookedTimes)],
                    ['time' => '21:45', 'isAvailable' => !in_array('21:45', $bookedTimes)]
                ]
            ]
        ];

        echo json_encode([
            'Status' => 'OK',
            'Date' => $date,
            'Bands' => array_values($bands)
        ]);
        break;

    // -------------------------------------------------------------------------
    // 3. SUBMIT APPOINTMENT REQUEST (With Olfactory Intake Briefing)
    // -------------------------------------------------------------------------
    case 'submit_appointment_request':
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        if (!$data) $data = $_POST;

        $clientName = isset($data['clientName']) ? trim($data['clientName']) : 'Alexander von Humboldt';
        $clientEmail = isset($data['clientEmail']) ? trim($data['clientEmail']) : 'alexander@humboldt-expeditions.org';
        $clientPhone = isset($data['clientPhone']) ? trim($data['clientPhone']) : '+523318259000';
        $clientTier = isset($data['clientTier']) ? trim($data['clientTier']) : 'MASTER_PERFUMER';
        $experienceType = isset($data['experienceType']) ? trim($data['experienceType']) : 'TASTING_MASTERCLASS';
        $atmosphericBand = isset($data['atmosphericBand']) ? trim($data['atmosphericBand']) : 'GOLDEN_HOUR';
        $scheduledDate = isset($data['scheduledDate']) ? trim($data['scheduledDate']) : date('Y-m-d');
        $scheduledTime = isset($data['scheduledTime']) ? trim($data['scheduledTime']) : '15:45';
        $channel = isset($data['channel']) ? trim($data['channel']) : 'WEBRTC';
        $sommelierId = ($atmosphericBand === 'SOLARIUM') ? 'SOMM-CLAIRE' : 'SOMM-JEAN-LUC';

        // Intake Briefing Data
        $occasionMood = isset($data['occasionMood']) ? trim($data['occasionMood']) : 'Presencia Ejecutiva & Seducción';
        $intensityDial = isset($data['intensityDial']) ? intval($data['intensityDial']) : 50;
        $projectionMode = isset($data['projectionMode']) ? trim($data['projectionMode']) : 'BEAST_MODE';
        $referenceFragrances = isset($data['referenceFragrances']) ? trim($data['referenceFragrances']) : 'Rasasi Hawas, Afnan 9AM Dive';
        $clientNotes = isset($data['clientNotes']) ? trim($data['clientNotes']) : 'Preferencia por acordes especiados y marinos de larga duración.';

        // Generate Codes
        $randomSuffix = strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 4));
        $appointmentCode = "AGENDA-2026-{$randomSuffix}";
        $voucherCode = "ROYALPASS-2026-{$randomSuffix}";
        $meetingUrl = "https://evinux.net/tasting/{$appointmentCode}";

        $stmt = $db->prepare("INSERT INTO concierge_appointments
            (EmisorID, AppointmentCode, ClientName, ClientEmail, ClientPhone, ClientTier, ExperienceType, AtmosphericBand, ScheduledDate, ScheduledTime, Channel, Status, SommelierID, MeetingRoomUrl, CashBackVoucherCode, CashBackAmount)
            VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, 499.00)");

        $success = $stmt->execute([
            $tenantId, $appointmentCode, $clientName, $clientEmail, $clientPhone,
            $clientTier, $experienceType, $atmosphericBand, $scheduledDate, $scheduledTime,
            $channel, $sommelierId, $meetingUrl, $voucherCode
        ]);

        if ($success) {
            $stmtBrief = $db->prepare("INSERT INTO concierge_intake_briefings
                (AppointmentCode, OccasionMood, IntensityDial, ProjectionMode, ReferenceFragrances, ClientNotes)
                VALUES
                (?, ?, ?, ?, ?, ?)");
            $stmtBrief->execute([
                $appointmentCode, $occasionMood, $intensityDial, $projectionMode, $referenceFragrances, $clientNotes
            ]);

            echo json_encode([
                'Status' => 'OK',
                'Message' => 'Cita VIP agendada exitosamente con Pase de Gala emitido.',
                'Appointment' => [
                    'code' => $appointmentCode,
                    'clientName' => $clientName,
                    'clientEmail' => $clientEmail,
                    'clientPhone' => $clientPhone,
                    'tier' => $clientTier,
                    'experienceType' => $experienceType,
                    'atmosphericBand' => $atmosphericBand,
                    'scheduledDate' => $scheduledDate,
                    'scheduledTime' => $scheduledTime,
                    'channel' => $channel,
                    'sommelierId' => $sommelierId,
                    'sommelierName' => ($sommelierId === 'SOMM-CLAIRE') ? 'Claire Dupont' : 'Jean-Luc Moreau',
                    'status' => 'CONFIRMED',
                    'meetingUrl' => $meetingUrl,
                    'voucherCode' => $voucherCode,
                    'cashBackAmount' => 499.00
                ]
            ]);
        } else {
            echo json_encode(['Status' => 'ERROR', 'Error' => 'Error al guardar la cita en base de datos.']);
        }
        break;

    // -------------------------------------------------------------------------
    // 4. GET APPOINTMENT STATUS & PRE-SESSION LOUNGE DETAILS
    // -------------------------------------------------------------------------
    case 'get_appointment_status':
        $code = isset($_GET['code']) ? trim($_GET['code']) : 'AGENDA-2026-VIP';

        $stmt = $db->prepare("SELECT a.*, s.Nombre as SommelierNombre, s.Titulo as SommelierTitulo, s.AvatarUrl as SommelierAvatar, s.Rating as SommelierRating,
                       b.OccasionMood, b.IntensityDial, b.ProjectionMode, b.ReferenceFragrances, b.ClientNotes
                FROM concierge_appointments a
                LEFT JOIN concierge_sommeliers s ON a.SommelierID = s.SommelierID
                LEFT JOIN concierge_intake_briefings b ON a.AppointmentCode = b.AppointmentCode
                WHERE a.AppointmentCode = ?
                LIMIT 1");

        $stmt->execute([$code]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            echo json_encode([
                'Status' => 'OK',
                'Appointment' => [
                    'appointmentId' => (int)$row['AppointmentID'],
                    'code' => $row['AppointmentCode'],
                    'clientName' => $row['ClientName'],
                    'clientEmail' => $row['ClientEmail'],
                    'clientPhone' => $row['ClientPhone'],
                    'tier' => $row['ClientTier'],
                    'experienceType' => $row['ExperienceType'],
                    'atmosphericBand' => $row['AtmosphericBand'],
                    'scheduledDate' => $row['ScheduledDate'],
                    'scheduledTime' => substr($row['ScheduledTime'], 0, 5),
                    'channel' => $row['Channel'],
                    'status' => $row['Status'],
                    'meetingUrl' => $row['MeetingRoomUrl'],
                    'voucherCode' => $row['CashBackVoucherCode'],
                    'cashBackAmount' => (float)$row['CashBackAmount'],
                    'sommelier' => [
                        'id' => $row['SommelierID'],
                        'name' => $row['SommelierNombre'] ?: 'Jean-Luc Moreau',
                        'title' => $row['SommelierTitulo'] ?: 'Master Perfumer & Chief Sommelier',
                        'avatar' => $row['SommelierAvatar'] ?: 'assets/sommelier_avatar.png',
                        'rating' => (float)($row['SommelierRating'] ?: 4.98)
                    ],
                    'briefing' => [
                        'occasionMood' => $row['OccasionMood'] ?: 'Presencia de Alto Impacto',
                        'intensityDial' => (int)($row['IntensityDial'] ?: 50),
                        'projectionMode' => $row['ProjectionMode'] ?: 'BEAST_MODE',
                        'referenceFragrances' => $row['ReferenceFragrances'] ?: 'Rasasi Hawas, Afnan 9AM Dive',
                        'clientNotes' => $row['ClientNotes'] ?: ''
                    ]
                ]
            ]);
        } else {
            echo json_encode(['Status' => 'ERROR', 'Error' => 'Cita no encontrada']);
        }
        break;

    // -------------------------------------------------------------------------
    // 5. GENERATE .ICS CALENDAR FILE (Apple Wallet / Google Calendar / Outlook)
    // -------------------------------------------------------------------------
    case 'generate_ics_calendar':
        $code = isset($_GET['code']) ? trim($_GET['code']) : 'AGENDA-2026-VIP';

        $stmt = $db->prepare("SELECT a.*, s.Nombre as SommelierNombre FROM concierge_appointments a 
                LEFT JOIN concierge_sommeliers s ON a.SommelierID = s.SommelierID 
                WHERE a.AppointmentCode = ? LIMIT 1");
        $stmt->execute([$code]);
        $app = $stmt->fetch(PDO::FETCH_ASSOC);

        $dateStr = $app ? $app['ScheduledDate'] : date('Y-m-d');
        $timeStr = $app ? substr($app['ScheduledTime'], 0, 5) : '15:45';
        $sommName = $app ? ($app['SommelierNombre'] ?: 'Jean-Luc Moreau') : 'Jean-Luc Moreau';
        $clientName = $app ? $app['ClientName'] : 'Alexander von Humboldt';

        $dtStart = date('Ymd\THis', strtotime("{$dateStr} {$timeStr}"));
        $dtEnd = date('Ymd\THis', strtotime("{$dateStr} {$timeStr} +20 minutes"));
        $dtStamp = gmdate('Ymd\THis\Z');

        $ics = "BEGIN:VCALENDAR\r\n";
        $ics .= "VERSION:2.0\r\n";
        $ics .= "PRODID:-//Quantix Haute Parfumerie//Royal Concierge Agenda//ES\r\n";
        $ics .= "CALSCALE:GREGORIAN\r\n";
        $ics .= "METHOD:REQUEST\r\n";
        $ics .= "BEGIN:VEVENT\r\n";
        $ics .= "UID:{$code}@quantix-parfumerie.com\r\n";
        $ics .= "DTSTAMP:{$dtStamp}\r\n";
        $ics .= "DTSTART:{$dtStart}\r\n";
        $ics .= "DTEND:{$dtEnd}\r\n";
        $ics .= "SUMMARY:🍷 Masterclass Privada de Alta Perfumería con {$sommName}\r\n";
        $ics .= "DESCRIPTION:Sesión privada 1-a-1 de cata olfativa y selección de fragancias de autor para {$clientName}. Código de Cita: {$code}. Bono de cata: $499.00 MXN aplicable a tu frasco de 100ml.\r\n";
        $ics .= "LOCATION:Salón Privado Virtual (Quantix Live Atelier)\r\n";
        $ics .= "STATUS:CONFIRMED\r\n";
        $ics .= "BEGIN:VALARM\r\n";
        $ics .= "TRIGGER:-PT15M\r\n";
        $ics .= "ACTION:DISPLAY\r\n";
        $ics .= "DESCRIPTION:Recordatorio: Tu cata privada con {$sommName} comienza en 15 minutos.\r\n";
        $ics .= "END:VALARM\r\n";
        $ics .= "END:VEVENT\r\n";
        $ics .= "END:VCALENDAR\r\n";

        header('Content-Type: text/calendar; charset=utf-8');
        header("Content-Disposition: attachment; filename=\"Maison-Tasting-{$code}.ics\"");
        echo $ics;
        exit;

    // -------------------------------------------------------------------------
    // 6. GENERATE WHATSAPP VIP CONCIERGE LINK
    // -------------------------------------------------------------------------
    case 'generate_wa_concierge_link':
        $code = isset($_GET['code']) ? trim($_GET['code']) : 'AGENDA-2026-VIP';

        $stmt = $db->prepare("SELECT a.*, s.Nombre as SommelierNombre FROM concierge_appointments a 
                LEFT JOIN concierge_sommeliers s ON a.SommelierID = s.SommelierID 
                WHERE a.AppointmentCode = ? LIMIT 1");
        $stmt->execute([$code]);
        $app = $stmt->fetch(PDO::FETCH_ASSOC);

        $clientName = $app ? $app['ClientName'] : 'Alexander von Humboldt';
        $date = $app ? $app['ScheduledDate'] : date('Y-m-d');
        $time = $app ? substr($app['ScheduledTime'], 0, 5) : '15:45';
        $sommName = $app ? ($app['SommelierNombre'] ?: 'Jean-Luc Moreau') : 'Jean-Luc Moreau';

        $phone = '523318259000';
        $msg = "👑 *MAISON QUANTIX — CONFIRMACIÓN DE CATA VIP*\n\n"
             . "Estimado/a *{$clientName}*,\n\n"
             . "Tu Masterclass Privada 1-a-1 ha sido confirmada:\n"
             . "🗓️ *Fecha:* {$date}\n"
             . "⏰ *Horario:* {$time} hrs\n"
             . "🍷 *Maestro Perfumista:* {$sommName}\n"
             . "🎫 *Código de Cita:* {$code}\n"
             . "💎 *Bono Deducible:* $499.00 MXN en tu frasco de 100ml\n\n"
             . "¿Deseas agregar alguna nota olfativa adicional antes de iniciar?";

        $url = "https://wa.me/{$phone}?text=" . rawurlencode($msg);
        echo json_encode([
            'Status' => 'OK',
            'WhatsAppUrl' => $url,
            'Message' => $msg
        ]);
        break;

    default:
        echo json_encode(['Status' => 'ERROR', 'Error' => 'Acción no reconocida en concierge_agenda.php']);
        break;
}
