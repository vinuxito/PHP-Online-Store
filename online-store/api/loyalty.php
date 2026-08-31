<?php
/**
 * online-store/api/loyalty.php
 * REST API for Sensory Loyalty Vault & Olfactory Refill Club
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
$action = trim((string)($_GET['action'] ?? $_POST['action'] ?? 'vault_status'));

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
    if ($action === 'vault_status') {
        $code = trim((string)($_GET['code'] ?? 'VAULT-2026-VIP'));

        $stmt = $db->prepare("SELECT * FROM loyalty_members WHERE EmisorID = ? AND (AccessCode = ? OR AccessCode = 'VAULT-2026-VIP') LIMIT 1");
        $stmt->execute([$tenantParam, $code]);
        $member = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$member) {
            $stmt = $db->prepare("SELECT * FROM loyalty_members WHERE EmisorID = ? LIMIT 1");
            $stmt->execute([$tenantParam]);
            $member = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        if (!$member) {
            echo json_encode([
                'Status' => 'OK',
                'Member' => null,
                'Subscriptions' => [],
                'Rewards' => []
            ]);
            exit;
        }

        // Calculate Tier Progression
        $bottles = (int)$member['LifetimeBottles'];
        $tier = $member['Tier'] ?: 'Aficionado';
        $nextTier = 'Connoisseur';
        $targetBottles = 3;
        $progressPct = 33;

        if ($tier === 'Aficionado') {
            $nextTier = 'Connoisseur';
            $targetBottles = 3;
            $progressPct = min(100, (int)(($bottles / 3) * 100));
        } elseif ($tier === 'Connoisseur') {
            $nextTier = 'Master Perfumer';
            $targetBottles = 6;
            $progressPct = min(100, (int)(($bottles / 6) * 100));
        } else {
            $nextTier = 'Iconic Legend';
            $targetBottles = 12;
            $progressPct = 100;
        }

        // Fetch Subscriptions & Calculate Smart Depletion
        $stmtSubs = $db->prepare("SELECT * FROM refill_subscriptions WHERE MemberID = ? ORDER BY CreatedAt DESC");
        $stmtSubs->execute([$member['MemberID']]);
        $rawSubs = $stmtSubs->fetchAll(PDO::FETCH_ASSOC);

        $subscriptions = [];
        foreach ($rawSubs as $s) {
            $capacityMl = (int)($s['BottleCapacityMl'] ?: 100);
            $totalSprays = $capacityMl * 10; // ~1,000 sprays per 100ml
            $dailySprays = (int)($s['DailySpraysAvg'] ?: 8);
            $estimatedTotalDays = $totalSprays / $dailySprays; // ~125 days

            $lastDelivery = strtotime($s['LastDeliveryDate'] ?: date('Y-m-d'));
            $daysSinceDelivery = max(0, (int)floor((time() - $lastDelivery) / 86400));

            $consumedSprays = min($totalSprays, $daysSinceDelivery * $dailySprays);
            $remainingSprays = max(0, $totalSprays - $consumedSprays);
            $daysRemaining = max(0, (int)ceil($remainingSprays / $dailySprays));
            $pctRemaining = max(0, min(100, (int)round(($remainingSprays / $totalSprays) * 100)));

            // Fetch product cover photo from productos_archivos
            $stmtP = $db->prepare("
                SELECT pa.RutaRelativa, pa.RutaMiniatura 
                FROM productos p 
                LEFT JOIN productos_archivos pa ON p.ProductoID = pa.ProductoID AND pa.EsPrincipal = 'SI' AND pa.Activo = 1 
                WHERE p.ProductoID = ? LIMIT 1
            ");
            $stmtP->execute([$s['ProductID']]);
            $pData = $stmtP->fetch(PDO::FETCH_ASSOC);

            $photo = $pData['RutaRelativa'] ?? $pData['RutaMiniatura'] ?? '';

            $subscriptions[] = [
                'subscriptionId'   => $s['SubscriptionID'],
                'productId'        => $s['ProductID'],
                'productName'      => $s['ProductName'],
                'photo'            => $photo,
                'frequencyMonths'  => (int)$s['FrequencyMonths'],
                'bottleCapacityMl' => $capacityMl,
                'dailySprays'      => $dailySprays,
                'lastDeliveryDate' => $s['LastDeliveryDate'],
                'nextRefillDate'   => $s['NextRefillDate'],
                'discountPct'      => (float)$s['DiscountPct'],
                'giftAtomizer'     => $s['GiftAtomizer'] === 'SI',
                'status'           => $s['Status'],
                'depletion' => [
                    'totalSprays'      => $totalSprays,
                    'consumedSprays'   => $consumedSprays,
                    'remainingSprays'  => $remainingSprays,
                    'daysElapsed'      => $daysSinceDelivery,
                    'daysRemaining'    => $daysRemaining,
                    'pctRemaining'     => $pctRemaining,
                    'urgency'          => $pctRemaining < 20 ? 'CRITICAL' : ($pctRemaining < 50 ? 'MEDIUM' : 'NORMAL')
                ]
            ];
        }

        // Fetch Rewards Catalog
        $stmtR = $db->prepare("SELECT * FROM loyalty_rewards_catalog WHERE EmisorID = ? ORDER BY PointsCost ASC");
        $stmtR->execute([$tenantParam]);
        $rawRewards = $stmtR->fetchAll(PDO::FETCH_ASSOC);

        $rewards = [];
        foreach ($rawRewards as $r) {
            $rewards[] = [
                'rewardId'     => $r['RewardID'],
                'title'        => $r['Title'],
                'pointsCost'   => (int)$r['PointsCost'],
                'description'  => $r['Description'],
                'tierRequired' => $r['TierRequired'],
                'badgeIcon'    => $r['BadgeIcon'] ?: '🎁',
                'canAfford'    => (int)$member['PointsBalance'] >= (int)$r['PointsCost']
            ];
        }

        echo json_encode([
            'Status' => 'OK',
            'Member' => [
                'memberId'        => $member['MemberID'],
                'code'            => $member['AccessCode'],
                'clientName'      => $member['ClientName'],
                'clientEmail'     => $member['ClientEmail'],
                'clientPhone'     => $member['ClientPhone'],
                'tier'            => $tier,
                'lifetimeBottles' => $bottles,
                'pointsBalance'   => (int)$member['PointsBalance'],
                'laserInitials'   => $member['LaserInitials'] ?: 'AVH',
                'progression' => [
                    'currentTier'   => $tier,
                    'nextTier'      => $nextTier,
                    'currentCount'  => $bottles,
                    'targetCount'   => $targetBottles,
                    'progressPct'   => $progressPct
                ]
            ],
            'Subscriptions' => $subscriptions,
            'Rewards'       => $rewards
        ]);
        exit;
    }

    if ($action === 'create_subscription') {
        $memberCode = trim((string)($_POST['memberCode'] ?? 'VAULT-2026-VIP'));
        $productId = trim((string)($_POST['productId'] ?? ''));
        $frequencyMonths = max(1, min(12, (int)($_POST['frequencyMonths'] ?? 3)));
        $dailySprays = max(1, min(30, (int)($_POST['dailySprays'] ?? 8)));

        if (empty($productId)) {
            echo json_encode(['Status' => 'Error', 'Error' => 'ProductID is required']);
            exit;
        }

        // Get or Create Member
        $stmtM = $db->prepare("SELECT * FROM loyalty_members WHERE EmisorID = ? AND AccessCode = ? LIMIT 1");
        $stmtM->execute([$tenantParam, $memberCode]);
        $member = $stmtM->fetch(PDO::FETCH_ASSOC);

        if (!$member) {
            $memberId = generateUuid();
            $stmtInsM = $db->prepare("
                INSERT INTO loyalty_members (MemberID, EmisorID, AccessCode, ClientName, ClientEmail, ClientPhone, Tier, LifetimeBottles, PointsBalance, LaserInitials, CreatedAt)
                VALUES (?, ?, ?, 'Alexander von Humboldt', 'alexander@humboldt-expeditions.org', '+523318954700', 'Connoisseur', 4, 250, 'AVH', NOW())
            ");
            $stmtInsM->execute([$memberId, $tenantParam, $memberCode]);
        } else {
            $memberId = $member['MemberID'];
        }

        // Fetch Product Info
        $stmtP = $db->prepare("SELECT Descripcion FROM productos WHERE ProductoID = ? LIMIT 1");
        $stmtP->execute([$productId]);
        $p = $stmtP->fetch(PDO::FETCH_ASSOC);
        $pName = $p ? $p['Descripcion'] : 'Perfume Signature 100ml';

        $subId = generateUuid();
        $lastDeliv = date('Y-m-d');
        $nextRefill = date('Y-m-d', strtotime("+{$frequencyMonths} months"));

        $stmtInsSub = $db->prepare("
            INSERT INTO refill_subscriptions (SubscriptionID, MemberID, ProductID, ProductName, FrequencyMonths, BottleCapacityMl, DailySpraysAvg, LastDeliveryDate, NextRefillDate, DiscountPct, GiftAtomizer, Status, CreatedAt)
            VALUES (?, ?, ?, ?, ?, 100, ?, ?, ?, 12.00, 'SI', 'ACTIVE', NOW())
        ");
        $stmtInsSub->execute([$subId, $memberId, $productId, $pName, $frequencyMonths, $dailySprays, $lastDeliv, $nextRefill]);

        // Add 50 bonus loyalty points
        $stmtPts = $db->prepare("UPDATE loyalty_members SET PointsBalance = PointsBalance + 50, LifetimeBottles = LifetimeBottles + 1 WHERE MemberID = ?");
        $stmtPts->execute([$memberId]);

        echo json_encode([
            'Status' => 'OK',
            'SubscriptionID' => $subId,
            'Message' => 'Suscripción de auto-recarga activada con 12% de descuento y atomizador de regalo.'
        ]);
        exit;
    }

    if ($action === 'update_subscription_status') {
        $subId = trim((string)($_POST['subscriptionId'] ?? ''));
        $newStatus = strtoupper(trim((string)($_POST['status'] ?? 'ACTIVE')));

        if (!in_array($newStatus, ['ACTIVE', 'PAUSED', 'CANCELLED'])) {
            $newStatus = 'ACTIVE';
        }

        $stmt = $db->prepare("UPDATE refill_subscriptions SET Status = ? WHERE SubscriptionID = ?");
        $stmt->execute([$newStatus, $subId]);

        echo json_encode([
            'Status' => 'OK',
            'SubscriptionID' => $subId,
            'NewStatus' => $newStatus,
            'Message' => "Estado de suscripción actualizado a $newStatus"
        ]);
        exit;
    }

    if ($action === 'redeem_reward') {
        $memberCode = trim((string)($_POST['memberCode'] ?? 'VAULT-2026-VIP'));
        $rewardId = trim((string)($_POST['rewardId'] ?? ''));

        $stmtM = $db->prepare("SELECT * FROM loyalty_members WHERE EmisorID = ? AND AccessCode = ? LIMIT 1");
        $stmtM->execute([$tenantParam, $memberCode]);
        $member = $stmtM->fetch(PDO::FETCH_ASSOC);

        $stmtR = $db->prepare("SELECT * FROM loyalty_rewards_catalog WHERE RewardID = ? LIMIT 1");
        $stmtR->execute([$rewardId]);
        $reward = $stmtR->fetch(PDO::FETCH_ASSOC);

        if (!$member || !$reward) {
            echo json_encode(['Status' => 'Error', 'Error' => 'Miembro o recompensa no encontrados']);
            exit;
        }

        if ((int)$member['PointsBalance'] < (int)$reward['PointsCost']) {
            echo json_encode(['Status' => 'Error', 'Error' => 'Saldo de puntos insuficiente']);
            exit;
        }

        // Deduct points
        $newBalance = (int)$member['PointsBalance'] - (int)$reward['PointsCost'];
        $stmtUp = $db->prepare("UPDATE loyalty_members SET PointsBalance = ? WHERE MemberID = ?");
        $stmtUp->execute([$newBalance, $member['MemberID']]);

        $voucherCode = 'REWARD-' . strtoupper(substr(md5(uniqid()), 0, 6));

        echo json_encode([
            'Status' => 'OK',
            'RewardTitle' => $reward['Title'],
            'PointsDeducted' => (int)$reward['PointsCost'],
            'NewBalance' => $newBalance,
            'RewardVoucherCode' => $voucherCode,
            'Message' => "¡Recompensa '{$reward['Title']}' canjeada con éxito!"
        ]);
        exit;
    }

    if ($action === 'generate_wa_refill_link') {
        $subId = trim((string)($_GET['subscriptionId'] ?? ''));
        $phone = preg_replace('/[^0-9]/', '', $tenant->whatsappPhone ?: '523318954700');

        $stmt = $db->prepare("
            SELECT s.*, m.ClientName, m.AccessCode, m.Tier 
            FROM refill_subscriptions s 
            JOIN loyalty_members m ON s.MemberID = m.MemberID 
            WHERE s.SubscriptionID = ? LIMIT 1
        ");
        $stmt->execute([$subId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        $pName = $row['ProductName'] ?? 'Fragancia de Autor';
        $cName = $row['ClientName'] ?? 'Alexander';
        $code = $row['AccessCode'] ?? 'VAULT-2026-VIP';

        $msg = "Hola Concierge VIP Quantix 👑, soy {$cName} (Bóveda {$code}). Deseo solicitar mi recarga programada de {$pName} (100ml) con mi 12% de descuento VIP y mi atomizador de regalo de cortesía.";
        $waUrl = "https://wa.me/{$phone}?text=" . urlencode($msg);

        echo json_encode([
            'Status' => 'OK',
            'WhatsAppUrl' => $waUrl,
            'MessageText' => $msg
        ]);
        exit;
    }

    echo json_encode(['Status' => 'Error', 'Error' => 'Acción no válida']);
} catch (Exception $e) {
    echo json_encode(['Status' => 'Error', 'Error' => $e->getMessage()]);
}
