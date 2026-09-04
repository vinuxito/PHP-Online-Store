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
    public $headline = 'COLECCIÓN IMPERIAL & {ALTA COSECHA 2026}';
    public $heroKicker = 'HAUTE COSECHA 2026';
    public $heroKickerEnabled = true;
    public $heroKickerIcon = 'sparkle';
    public $heroTypography = 'imperial_serif';
    public $heroShader = 'liquid_gold';
    public $heroShimmer = true;
    public $heroLetterSpacing = 'wide';
    public $heroSubheadline = 'Extractos puros de perfumería nicho elaborados artesanalmente en Grasse.';
    public $quantixFrontStore = 'NO';
    public $quantixStorePerfums = 'NO';
    public $isStoreActive = false;

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
            // 1. Direct match by subdomain_slug in config_tienda_tenants
            try {
                $stmtSlug = $db->prepare("SELECT EmisorID FROM config_tienda_tenants WHERE JSON_UNQUOTE(JSON_EXTRACT(ConfigJSON, '$.subdomain_slug')) = ? LIMIT 1");
                $stmtSlug->execute([$targetSlug]);
                if ($rowSlug = $stmtSlug->fetch()) {
                    $stmt = $db->prepare("SELECT * FROM emisores WHERE EmisorID = ? LIMIT 1");
                    $stmt->execute([$rowSlug['EmisorID']]);
                    $row = $stmt->fetch();
                }
            } catch (\Exception $eSlug) {}

            // 2. Check quantix_subdomains.subdomain note if still not resolved
            if (!$row) {
                try {
                    $stmtSub = $db->prepare("SELECT note FROM quantix_subdomains.subdomain WHERE label = ? LIMIT 1");
                    $stmtSub->execute([$targetSlug]);
                    if ($rowSub = $stmtSub->fetch()) {
                        if (!empty($rowSub['note']) && preg_match('/Tenant:\s*([a-zA-Z0-9_-]+)/', $rowSub['note'], $mSub)) {
                            $stmt = $db->prepare("SELECT * FROM emisores WHERE EmisorID = ? LIMIT 1");
                            $stmt->execute([$mSub[1]]);
                            $row = $stmt->fetch();
                        }
                    }
                } catch (\Exception $eSub) {}
            }

            // 3. Heuristics fallback
            if (!$row) {
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

            // Load all QUANTIX* and STORE_* settings from emisoresde
            $stmtDeAll = $db->prepare("SELECT Variable, Valor FROM emisoresde WHERE EmisorID = ? AND (Variable LIKE 'QUANTIX%' OR Variable LIKE 'STORE_%')");
            $stmtDeAll->execute([$tenant->emisorId]);
            $deMap = [];
            while ($r = $stmtDeAll->fetch()) {
                $deMap[$r['Variable']] = $r['Valor'];
            }

            // Gating
            $tenant->quantixFrontStore = (isset($deMap['QUANTIXFRONTSTORE']) && strtoupper(trim($deMap['QUANTIXFRONTSTORE'])) === 'SI') ? 'SI' : 'NO';
            $tenant->quantixStorePerfums = (isset($deMap['QUANTIXSTOREPERFUMS']) && strtoupper(trim($deMap['QUANTIXSTOREPERFUMS'])) === 'SI') ? 'SI' : 'NO';
            $tenant->isStoreActive = ($tenant->quantixFrontStore === 'SI');

            // Dynamic Maître D' customizations
            if (!empty($deMap['STORE_TITLE'])) {
                $tenant->brandName = $deMap['STORE_TITLE'];
            }
            if (!empty($deMap['STORE_TAGLINE'])) {
                $tenant->description = $deMap['STORE_TAGLINE'];
            }
            if (!empty($deMap['STORE_THEME'])) {
                $tenant->theme = $deMap['STORE_THEME'];
            }
            if (!empty($deMap['STORE_PRIMARY_COLOR'])) {
                $tenant->primaryColor = $deMap['STORE_PRIMARY_COLOR'];
            }
            if (!empty($deMap['STORE_LOGO_URL'])) {
                $tenant->logo = $deMap['STORE_LOGO_URL'];
            }
            $tenant->heroBg = $deMap['STORE_HERO_BG'] ?? 'obsidian';
            $tenant->archetype = strtolower($deMap['STORE_ARCHETYPE'] ?? 'maison');
            $tenant->density = floatval($deMap['STORE_COMMERCIAL_DENSITY'] ?? 0.5);
            $tenant->modules = json_decode($deMap['STORE_COMMERCIAL_MODULES'] ?? '{}', true) ?: [
                'flash_deals' => true,
                'horizontal_rails' => true,
                'cfdi_trust' => true,
                'hero_vitrina' => true
            ];

            // Load Quantix Apex Command Tower configuration
            $tenant->apexConfig = null;
            try {
                $stmtApex = $db->prepare("SELECT ConfigJSON FROM config_tienda_tenants WHERE EmisorID = ? LIMIT 1");
                $stmtApex->execute([$tenant->emisorId]);
                if ($rowApex = $stmtApex->fetch()) {
                    $decodedApex = json_decode($rowApex['ConfigJSON'], true);
                    if (is_array($decodedApex)) {
                        $tenant->apexConfig = $decodedApex;
                        if (!empty($decodedApex['tenant_name'])) {
                            $tenant->brandName = $decodedApex['tenant_name'];
                        }
                        if (!empty($decodedApex['hero_curation']) && is_array($decodedApex['hero_curation'])) {
                            $hc = $decodedApex['hero_curation'];
                            if (!empty($hc['headline'])) {
                                $tenant->headline = $hc['headline'];
                            }
                            if (!empty($hc['subheadline'])) {
                                $tenant->description = $hc['subheadline'];
                                $tenant->heroSubheadline = $hc['subheadline'];
                            }
                            if (isset($hc['kicker'])) {
                                $tenant->heroKicker = $hc['kicker'];
                            }
                            if (isset($hc['kicker_enabled'])) {
                                $tenant->heroKickerEnabled = (bool)$hc['kicker_enabled'];
                            }
                            if (!empty($hc['kicker_icon'])) {
                                $tenant->heroKickerIcon = $hc['kicker_icon'];
                            }
                            if (!empty($hc['typography'])) {
                                $tenant->heroTypography = $hc['typography'];
                            }
                            if (!empty($hc['shader'])) {
                                $tenant->heroShader = $hc['shader'];
                            }
                            if (isset($hc['shimmer'])) {
                                $tenant->heroShimmer = (bool)$hc['shimmer'];
                            }
                            if (!empty($hc['letter_spacing'])) {
                                $tenant->heroLetterSpacing = $hc['letter_spacing'];
                            }
                        }
                        if (!empty($decodedApex['theme']['atmosphere_mode'])) {
                            $tenant->theme = strtolower($decodedApex['theme']['atmosphere_mode']);
                        }
                        if (!empty($decodedApex['theme']['primary_color'])) {
                            $tenant->primaryColor = $decodedApex['theme']['primary_color'];
                        }
                        if (!empty($decodedApex['archetype'])) {
                            $tenant->archetype = strtolower($decodedApex['archetype']);
                        } else {
                            $tenant->archetype = $deMap['STORE_ARCHETYPE'] ?? 'maison';
                        }
                        $tenant->density = floatval($decodedApex['density'] ?? ($deMap['STORE_COMMERCIAL_DENSITY'] ?? 0.5));
                        $tenant->modules = $decodedApex['modules'] ?? (json_decode($deMap['STORE_COMMERCIAL_MODULES'] ?? '{}', true) ?: [
                            'flash_deals' => true,
                            'horizontal_rails' => true,
                            'cfdi_trust' => true,
                            'hero_vitrina' => true
                        ]);
                        $tenant->isStoreActive = true; // Enabled when configured via Apex
                    }
                }
            } catch (\Exception $e) {}
        }

        if (!empty($_GET['theme'])) {
            $tenant->theme = strtolower(trim($_GET['theme']));
        }

        return $tenant;
    }
}

if (!function_exists('renderHeroHeadlineFormatted')) {
    function renderHeroHeadlineFormatted($rawText) {
        if (empty($rawText)) return '';
        // 1. Accent brackets {word}
        $hasBrackets = preg_match('/\{([^}]+)\}/', $rawText);
        if ($hasBrackets) {
            $formatted = preg_replace_callback('/\{([^}]+)\}/', function($m) {
                return '<span class="qx-title-accent">' . htmlspecialchars($m[1]) . '</span>';
            }, $rawText);
        } else {
            $formatted = htmlspecialchars($rawText);
        }
        // 2. Format ampersands (& or &amp;) into italic script spans
        $formatted = preg_replace('/(\s)&(\s)/', '$1<span class="qx-title-amp">&</span>$2', $formatted);
        $formatted = preg_replace('/(\s)&amp;(\s)/', '$1<span class="qx-title-amp">&</span>$2', $formatted);
        return $formatted;
    }
}

if (!function_exists('getHeroKickerIconGlyph')) {
    function getHeroKickerIconGlyph($iconKey) {
        switch ($iconKey) {
            case 'crown': return '👑';
            case 'gem': return '💎';
            case 'lightning': return '⚡';
            case 'feather': return '🪶';
            case 'sparkle': return '✦';
            case 'none': return '';
            default: return '✦';
        }
    }
}

