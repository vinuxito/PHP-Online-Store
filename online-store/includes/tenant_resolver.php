<?php
/**
 * includes/tenant_resolver.php — Dynamic Multi-Tenant Subdomain & Emisor Context Resolver
 */

require_once __DIR__ . '/db.php';

class StorefrontTenant {
    public $emisorId = '58';
    public $brandName = 'MISTIQ GLOBAL BRANDS';
    public $rfc = 'CAAV800329JZ8';
    public $slug = 'mistiq';
    public $logo = 'images/mistiq_logo.png';
    public $theme = 'obsidian'; // 'obsidian' (dark luxury), 'light' (clean), 'gold'
    public $primaryColor = '#3b82f6';
    public $email = 'contacto@mistiq.com';
    public $phone = '';
    public $address = '';
    public $description = 'Alta Perfumería & Fragancias Exclusivas';

    public static function resolve() {
        $tenant = new self();
        $db = get_store_db();

        $reqEmisor = trim($_GET['emisor'] ?? '');
        $reqSlug = trim($_GET['slug'] ?? '');
        $host = strtolower($_SERVER['HTTP_HOST'] ?? '');

        // 1. Detect subdomain slug if running on *.evinux.net or similar
        $detectedSlug = '';
        if (preg_match('/^([a-z0-9\-]+)\.evinux\.net$/i', $host, $m)) {
            $sub = strtolower($m[1]);
            if (!in_array($sub, ['www', 'speed', 'quantix-panel', 'mail', 'api'])) {
                $detectedSlug = $sub;
            }
        }

        $targetSlug = $reqSlug ?: ($detectedSlug ?: '');
        $targetId = $reqEmisor;

        // Query database to find Emisor
        $row = null;
        if (!empty($targetId)) {
            $stmt = $db->prepare("SELECT * FROM emisores WHERE EmisorID = ? LIMIT 1");
            $stmt->execute([$targetId]);
            $row = $stmt->fetch();
        } elseif (!empty($targetSlug)) {
            // Slug resolution heuristics
            if ($targetSlug === 'mistiq' || strpos($targetSlug, 'mistiq') !== false) {
                $stmt = $db->prepare("SELECT * FROM emisores WHERE EmisorID = '00163e311ce9a3e711f1591962781ba6' OR nombre LIKE '%MISTIQ%' LIMIT 1");
                $stmt->execute();
                $row = $stmt->fetch();
            } elseif ($targetSlug === 'beskolab' || strpos($targetSlug, 'besko') !== false) {
                $stmt = $db->prepare("SELECT * FROM emisores WHERE EmisorID = '00155d3c42c29a0411e9a4c358646c44' OR nombre LIKE '%BESKOLAB%' LIMIT 1");
                $stmt->execute();
                $row = $stmt->fetch();
            } else {
                $stmt = $db->prepare("SELECT * FROM emisores WHERE nombre LIKE ? OR rfc LIKE ? LIMIT 1");
                $stmt->execute(["%{$targetSlug}%", "%{$targetSlug}%"]);
                $row = $stmt->fetch();
            }
        }

        // Default fallback to MISTIQ GLOBAL BRANDS if nothing found
        if (!$row) {
            $stmt = $db->prepare("SELECT * FROM emisores WHERE EmisorID = '00163e311ce9a3e711f1591962781ba6' OR EmisorID = '58' LIMIT 1");
            $stmt->execute();
            $row = $stmt->fetch();
        }

        if ($row) {
            $tenant->emisorId = $row['EmisorID'];
            $tenant->brandName = !empty($row['nombre']) ? $row['nombre'] : 'Tienda Oficial';
            $tenant->rfc = $row['rfc'] ?? '';
            $tenant->email = $row['EmailContacto'] ?? $row['email'] ?? '';
            $tenant->phone = $row['TelContacto'] ?? $row['telefono'] ?? '';
            $tenant->address = trim(($row['calle'] ?? '') . ' ' . ($row['noExterior'] ?? '') . ', ' . ($row['colonia'] ?? ''));

            // Slug and branding customisation
            if ($tenant->emisorId === '00163e311ce9a3e711f1591962781ba6' || stripos($tenant->brandName, 'MISTIQ') !== false) {
                $tenant->slug = 'mistiq';
                $tenant->brandName = 'MISTIQ GLOBAL BRANDS';
                $tenant->theme = 'obsidian';
                $tenant->primaryColor = '#38bdf8';
                $tenant->description = 'Luxury Perfume Atelier & Exclusive Fragrance Collection';
            } elseif (stripos($tenant->brandName, 'BESKOLAB') !== false) {
                $tenant->slug = 'beskolab';
                $tenant->theme = 'emerald';
                $tenant->primaryColor = '#10b981';
                $tenant->description = 'Soluciones Químicas, Sanitización e Insumos Industriales';
            } else {
                $tenant->slug = strtolower(preg_replace('/[^a-z0-9]/i', '', $tenant->brandName));
                $tenant->theme = 'obsidian';
                $tenant->primaryColor = '#3b82f6';
                $tenant->description = 'Catálogo y Tienda Oficial';
            }

            if (!empty($row['logoJPG']) && file_exists('/lamp/www/cfdadmin/' . $row['logoJPG'])) {
                $tenant->logo = '/cfdadmin/' . $row['logoJPG'];
            } else {
                $tenant->logo = '';
            }
        }

        return $tenant;
    }
}
