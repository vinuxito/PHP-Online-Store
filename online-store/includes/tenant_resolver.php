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
    public $cartTitle = 'Carrito de Compras';
    public $quantixFrontStore = 'NO';
    public $quantixStorePerfums = 'NO';
    public $isStoreActive = false;
    public $studio3DConfig = null;

    public function isPerfumery() {
        return ($this->quantixStorePerfums === 'SI' || $this->slug === 'mistiq' || stripos($this->brandName, 'MISTIQ') !== false);
    }

    public function isStudio3DEnabled() {
        return !empty($this->studio3DConfig['enabled']);
    }

    public function getStudio3DConfig() {
        $cfg = $this->studio3DConfig ?: [];
        if (!isset($cfg['enabled'])) $cfg['enabled'] = false;
        if (!isset($cfg['auto_orbit'])) $cfg['auto_orbit'] = true;
        if (!isset($cfg['auto_orbit_speed'])) $cfg['auto_orbit_speed'] = 1.2;
        if (!isset($cfg['allow_zoom'])) $cfg['allow_zoom'] = true;
        if (!isset($cfg['allow_explode'])) $cfg['allow_explode'] = true;

        if ($this->isPerfumery()) {
            if (empty($cfg['archetype_model'])) {
                $cfg['archetype_model'] = 'perfume_flacon_imperial';
            }
            if (empty($cfg['lighting_preset'])) {
                $cfg['lighting_preset'] = 'studio_softbox';
            }
            if (empty($cfg['finishes'])) {
                $cfg['finishes'] = [
                    ['id' => 'obsidian_stealth', 'name' => 'Obsidian Stealth', 'color' => '#111827', 'roughness' => 0.20, 'metalness' => 0.80, 'clearcoat' => 0.90, 'price_delta' => 0],
                    ['id' => 'liquid_gold', 'name' => 'Liquid Gold 24k', 'color' => '#D4AF37', 'roughness' => 0.10, 'metalness' => 0.95, 'clearcoat' => 1.00, 'price_delta' => 350],
                    ['id' => 'titanium_frost', 'name' => 'Titanium Frost', 'color' => '#E2E8F0', 'roughness' => 0.35, 'metalness' => 0.60, 'clearcoat' => 0.50, 'price_delta' => 0],
                    ['id' => 'rose_champagne', 'name' => 'Rose Champagne', 'color' => '#FDA4AF', 'roughness' => 0.15, 'metalness' => 0.85, 'clearcoat' => 0.80, 'price_delta' => 200]
                ];
            }
            if (empty($cfg['hotspots'])) {
                $cfg['hotspots'] = [
                    ['id' => 'hs_cap', 'label' => 'Tapa Zamak Magnética', 'description' => 'Aleación pesada pulida a mano con sellado hermético al vacío.', 'position' => [0.0, 0.85, 0.0], 'camera_target' => [0.0, 0.85, 1.2]],
                    ['id' => 'hs_heart', 'label' => 'Concentración Extrait 35%', 'description' => 'Formulación de alta maceración artesanal con aceites puros.', 'position' => [0.0, 0.15, 0.25], 'camera_target' => [0.0, 0.15, 1.4]],
                    ['id' => 'hs_base', 'label' => 'Autenticidad & Batch SAT', 'description' => 'Grabado láser al ácido con número de lote e invoice fiscal SAT.', 'position' => [0.0, -0.65, 0.0], 'camera_target' => [0.0, -0.65, 1.2]]
                ];
            }
        } else {
            if (empty($cfg['archetype_model']) || $cfg['archetype_model'] === 'perfume_flacon_imperial') {
                $cfg['archetype_model'] = 'industrial_solenoid_valve';
            }
            if (empty($cfg['lighting_preset'])) {
                $cfg['lighting_preset'] = 'studio_softbox';
            }
            if (empty($cfg['finishes'])) {
                $cfg['finishes'] = [
                    ['id' => 'danfoss_blue', 'name' => 'Danfoss Blue Enamel', 'color' => '#0284c7', 'roughness' => 0.3, 'metalness' => 0.7, 'clearcoat' => 0.8, 'price_delta' => 0],
                    ['id' => 'cast_iron_gray', 'name' => 'Cast Iron Slate', 'color' => '#334155', 'roughness' => 0.6, 'metalness' => 0.5, 'clearcoat' => 0.2, 'price_delta' => 0],
                    ['id' => 'brass_valve', 'name' => 'Forged Brass Alloy', 'color' => '#b45309', 'roughness' => 0.25, 'metalness' => 0.9, 'clearcoat' => 0.6, 'price_delta' => 150]
                ];
            }
            if (empty($cfg['hotspots'])) {
                $cfg['hotspots'] = [
                    ['id' => 'hs_seal', 'label' => 'Junta Hermética IP67', 'description' => 'Resistencia certificada contra polvos finos y humedad extrema.', 'position' => [0.0, 0.6, 0.0], 'camera_target' => [0.0, 0.6, 1.2]],
                    ['id' => 'hs_coil', 'label' => 'Bobinado de Cobre Clase H', 'description' => 'Aislamiento térmico continuo hasta 180°C bajo carga inductiva.', 'position' => [0.0, 0.1, 0.25], 'camera_target' => [0.0, 0.1, 1.4]],
                    ['id' => 'hs_sat', 'label' => 'Clave SAT 40141600', 'description' => 'Válvulas y solenoides industriales con timbrado CFDI 4.0 inmediato.', 'position' => [0.0, -0.5, 0.0], 'camera_target' => [0.0, -0.5, 1.2]]
                ];
            }
        }
        return $cfg;
    }

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
                            if (!empty($hc['circadian']) && is_array($hc['circadian'])) {
                                $tenant->heroCircadian = $hc['circadian'];
                            }
                            if (!empty($hc['runway_defile']) && is_array($hc['runway_defile'])) {
                                $tenant->heroRunwayDefile = $hc['runway_defile'];
                            }
                            if (!empty($hc['allocation_vault']) && is_array($hc['allocation_vault'])) {
                                $tenant->heroAllocationVault = $hc['allocation_vault'];
                            }
                            if (!empty($hc['wax_seal']) && is_array($hc['wax_seal'])) {
                                $tenant->heroWaxSeal = $hc['wax_seal'];
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
                        $tenant->studio3DConfig = $decodedApex['studio_3d'] ?? ($decodedApex['hero_curation']['studio_3d'] ?? null);
                    }
                }
            } catch (\Exception $e) {}
        }

        if (isset($_GET['studio_3d'])) {
            if (!is_array($tenant->studio3DConfig)) $tenant->studio3DConfig = [];
            $tenant->studio3DConfig['enabled'] = ($_GET['studio_3d'] === '1' || $_GET['studio_3d'] === 'true');
        }

        // Industry-Aware Defaults (Zero Perfume Leak for Non-Perfumery Tenants)
        if ($tenant->isPerfumery()) {
            $tenant->cartTitle = 'Bolsa de Compras';
            if (empty($tenant->heroKicker)) {
                $tenant->heroKicker = 'HAUTE COSECHA ' . date('Y');
            }
            if (empty($tenant->headline)) {
                $tenant->headline = 'COLECCIÓN IMPERIAL & {ALTA COSECHA ' . date('Y') . '}';
            }
        } else {
            $tenant->cartTitle = 'Carrito de Compras';
            if (empty($tenant->heroKicker) || trim($tenant->heroKicker) === 'HAUTE COSECHA 2026') {
                $tenant->heroKicker = 'ALTA DISPONIBILIDAD & ENVÍO EXPRESS';
            }
            if (empty($tenant->headline) || trim($tenant->headline) === 'COLECCIÓN IMPERIAL & {ALTA COSECHA 2026}') {
                $tenant->headline = strtoupper($tenant->brandName) . ' & {CATÁLOGO OFICIAL}';
            }
            if (empty($tenant->heroSubheadline) || strpos($tenant->heroSubheadline, 'Grasse') !== false) {
                $tenant->heroSubheadline = 'Catálogo de alta disponibilidad con timbrado CFDI 4.0 SAT inmediato y garantía directa.';
            }
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
        // 1. Escape entire text first so any HTML tags or malicious entities are neutralized
        $safeText = htmlspecialchars($rawText, ENT_QUOTES, 'UTF-8');
        // 2. Safely transform escaped brackets {word} into accent spans
        $formatted = preg_replace('/\{([^}]+)\}/', '<span class="qx-title-accent">$1</span>', $safeText);
        // 3. Format ampersands (&amp;) into italic script spans
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

if (!function_exists('qxResolveCircadianState')) {
    function qxResolveCircadianState($heroCuration, $clientHour = null) {
        if (empty($heroCuration) || !is_array($heroCuration)) return null;

        $tzName = !empty($heroCuration['circadian']['maison_timezone']) 
            ? $heroCuration['circadian']['maison_timezone'] 
            : 'America/Mexico_City';
        try {
            $tz = new DateTimeZone($tzName);
        } catch (Exception $e) {
            $tz = new DateTimeZone('America/Mexico_City');
        }
        $now = new DateTime('now', $tz);
        $currentHour = ($clientHour !== null) ? intval($clientHour) : intval($now->format('G'));
        $currentTimestamp = $now->getTimestamp();

        // 1. Check Runway Défilé for active scheduled scene override
        if (!empty($heroCuration['runway_defile']) && is_array($heroCuration['runway_defile'])) {
            foreach ($heroCuration['runway_defile'] as $scene) {
                if (!empty($scene['start_at']) && !empty($scene['end_at'])) {
                    $startTs = strtotime($scene['start_at']);
                    $endTs = strtotime($scene['end_at']);
                    if ($startTs && $endTs && $currentTimestamp >= $startTs && $currentTimestamp <= $endTs) {
                        return [
                            'type' => 'runway_scene',
                            'scene' => $scene,
                            'phase_key' => 'runway',
                            'hour' => $currentHour
                        ];
                    }
                }
            }
        }

        // 2. If Circadian mode is active, resolve solar phase
        if (!empty($heroCuration['circadian']['enabled'])) {
            $phases = $heroCuration['circadian']['phases'] ?? [];
            if ($currentHour >= 6 && $currentHour <= 11) {
                $phaseKey = 'aube';
            } else if ($currentHour >= 12 && $currentHour <= 17) {
                $phaseKey = 'zenith';
            } else if ($currentHour >= 18 && $currentHour <= 21) {
                $phaseKey = 'crepuscule';
            } else {
                $phaseKey = 'nuit';
            }
            return [
                'type' => 'circadian',
                'phase_key' => $phaseKey,
                'phase_data' => $phases[$phaseKey] ?? null,
                'hour' => $currentHour
            ];
        }

        // 3. Fallback to Baseline
        return [
            'type' => 'baseline',
            'phase_key' => 'baseline',
            'hour' => $currentHour
        ];
    }
}

