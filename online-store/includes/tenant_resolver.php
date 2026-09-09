<?php
require_once __DIR__.'/../../../cfdadmin/lib/QuantixBusinessProfile.php';
require_once __DIR__.'/../../../cfdadmin/lib/QuantixStoreText.php';
/**
 * includes/tenant_resolver.php — Dynamic Multi-Tenant Subdomain & Emisor Context Resolver
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/storefront_control_contract.php';

class StorefrontTenant {
    public $emisorId = '';
    public $resolutionError = '';
    public $bankName = '';
    public $bankClabe = '';
    public $bankBeneficiary = '';
    public $paymentSettings = [];
    public $apexConfig = [];
    public $brandName = 'Tienda';
    public $rfc = '';
    public $slug = '';
    public $logo = 'images/mistiq_logo.png';
    public $theme = 'obsidian'; // 'obsidian' (dark luxury), 'light' (clean), 'gold'
    public $primaryColor = '#3b82f6';
    public $email = '';
    public $phone = '';
    public $address = '';
    public $description = '';
    public $headline = '';
    public $heroKicker = '';
    public $heroKickerEnabled = true;
    public $heroKickerIcon = 'sparkle';
    public $heroTypography = 'imperial_serif';
    public $heroShader = 'liquid_gold';
    public $heroShimmer = true;
    public $heroLetterSpacing = 'wide';
    public $heroSubheadline = '';
    public $cartTitle = 'Carrito de Compras';
    public $quantixFrontStore = 'NO';
    public $quantixStorePerfums = 'NO';
    public $isStoreActive = false;
    public $studio3DConfig = null;
    public $showWhatsapp = false;
    public $whatsappPhone = '';
    public $whatsappGreeting = '';

    public function getIndustry() {
        $hint = $this->quantixStorePerfums === 'SI';
        return QuantixIndustryContract::resolve($this->apexConfig ?: [], $this->brandName . ' ' . $this->description . ' ' . $this->slug, $hint);
    }

    public function getBusinessProfile() {
        $config=$this->apexConfig ?: []; $config['_industria']=$this->getIndustry();
        return QuantixBusinessProfile::resolve($config);
    }

    public function isPerfumery() {
        return $this->getIndustry() === 'perfumery';
    }

    public function isStudio3DEnabled() {
        return !empty($this->studio3DConfig['enabled']);
    }

    public function isAREnabled() {
        $cfg = $this->getStudio3DConfig();
        return !empty($cfg['enabled']) && !empty($cfg['ar_calibration']['enabled']);
    }

    public function getARCalibration() {
        $cfg = $this->getStudio3DConfig();
        return $cfg['ar_calibration'] ?? [];
    }

    public function getStudio3DConfig() {
        $cfg = is_array($this->studio3DConfig) ? $this->studio3DConfig : [];
        $property = StorefrontControlContract::isRealEstate($this->apexConfig ?: [], $this->description);
        $defaults = [
            'enabled' => false, 'auto_orbit' => true, 'auto_orbit_speed' => 1.2,
            'allow_zoom' => true, 'allow_explode' => false,
            'archetype_model' => $property ? 'architectural_space' : ($this->isPerfumery() ? 'perfume_flacon_imperial' : 'industrial_solenoid_valve'),
            'lighting_preset' => 'studio_softbox',
            'finishes' => [
                ['id' => 'neutral_light', 'name' => 'Claro', 'color' => '#E2E8F0', 'roughness' => 0.5, 'metalness' => 0.1, 'clearcoat' => 0.2, 'price_delta' => 0],
                ['id' => 'neutral_dark', 'name' => 'Oscuro', 'color' => '#334155', 'roughness' => 0.5, 'metalness' => 0.1, 'clearcoat' => 0.2, 'price_delta' => 0]
            ],
            'hotspots' => []
        ];
        $cfg = array_replace($defaults, $cfg);
        if ($property && in_array($cfg['archetype_model'], ['perfume_flacon_imperial', 'industrial_solenoid_valve'], true)) $cfg['archetype_model'] = 'architectural_space';
        $cfg['model_source'] = !empty($cfg['custom_model_url']) ? 'custom_gltf' : 'procedural';
        if (isset($cfg['custom_model_url'])) $cfg['custom_model_url'] = html_entity_decode(trim((string)$cfg['custom_model_url']), ENT_QUOTES, 'UTF-8');
        if (isset($cfg['custom_model_name'])) $cfg['custom_model_name'] = html_entity_decode(trim((string)$cfg['custom_model_name']), ENT_QUOTES, 'UTF-8');
        if (!empty($cfg['custom_hotspots']) && is_array($cfg['custom_hotspots'])) $cfg['custom_hotspots'] = array_values($cfg['custom_hotspots']);
        $calibration = isset($cfg['ar_calibration']) && is_array($cfg['ar_calibration']) ? $cfg['ar_calibration'] : [];
        $cfg['ar_calibration'] = array_replace([
            'enabled' => false, 'anchor' => 'surface', 'height_mm' => 150,
            'width_mm' => 65, 'depth_mm' => 65, 'lock_scale' => true
        ], $calibration);
        return $cfg;
    }

    private static function rowBySlug($db, $slug) {
        $emisorId = '';
        try {
            $stmt = $db->prepare("SELECT EmisorID FROM config_tienda_tenants WHERE JSON_UNQUOTE(JSON_EXTRACT(ConfigJSON, '$.subdomain_slug')) = ? LIMIT 1");
            $stmt->execute([$slug]);
            if ($row = $stmt->fetch()) $emisorId = $row['EmisorID'];
        } catch (Exception $e) {}
        if (!$emisorId) {
            try {
                $stmt = $db->prepare("SELECT note FROM quantix_subdomains.subdomain WHERE label = ? AND zone = 'evinux.net' LIMIT 1");
                $stmt->execute([$slug]);
                if (($row = $stmt->fetch()) && preg_match('/(?:^|\s)Tenant:\s*([a-zA-Z0-9_-]+)(?:\s|$)/', (string)$row['note'], $match)) $emisorId = $match[1];
            } catch (Exception $e) {}
        }
        // Exact legacy aliases only; never guess a tenant from a partial business name.
        if (!$emisorId && $slug === 'mistiq') $emisorId = '00163e311ce9a3e711f1591962781ba6';
        if (!$emisorId && $slug === 'beskolab') $emisorId = '00155d3c42c29a0411e9a4c358646c44';
        if (!$emisorId) return null;
        $stmt = $db->prepare('SELECT * FROM emisores WHERE EmisorID = ? LIMIT 1');
        $stmt->execute([$emisorId]);
        return $stmt->fetch() ?: null;
    }

    public static function resolve($requestBody = null) {
        $tenant = new self();
        $db = get_store_db();

        if ($requestBody === null) {
            $requestBody = json_decode(file_get_contents('php://input'), true);
        }
        try {
            $context = StorefrontControlContract::context($_GET, $_POST, $requestBody, $_SERVER['HTTP_HOST'] ?? '');
            $slugRow = $context['slug'] !== '' ? self::rowBySlug($db, $context['slug']) : null;
            $row = null;
            if ($context['id'] !== '') {
                $stmt = $db->prepare('SELECT * FROM emisores WHERE EmisorID = ? LIMIT 1');
                $stmt->execute([$context['id']]);
                $row = $stmt->fetch();
                if (!$row || ($context['slug'] !== '' && (!$slugRow || (string)$slugRow['EmisorID'] !== (string)$row['EmisorID']))) throw new InvalidArgumentException('La tienda solicitada no coincide con este dominio.');
            } elseif ($slugRow) {
                $row = $slugRow;
            } elseif (!$context['explicit']) {
                // Preserve the original base URL entry only when no tenant was requested.
                $stmt = $db->prepare("SELECT * FROM emisores WHERE EmisorID = '00163e311ce9a3e711f1591962781ba6' LIMIT 1");
                $stmt->execute();
                $row = $stmt->fetch();
            }
            if (!$row) throw new InvalidArgumentException('La tienda solicitada no está disponible.');
        } catch (InvalidArgumentException $e) {
            $tenant->resolutionError = $e->getMessage();
            $tenant->isStoreActive = false;
            http_response_code(404);
            return $tenant;
        }
        $explicitHero = [];
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
            $tenant->showStock = ($deMap['STORE_SHOW_STOCK'] ?? 'SI') !== 'NO';
            $tenant->lowStockThreshold = intval($deMap['STORE_LOW_STOCK_THRESHOLD'] ?? 5);
            $tenant->modules = json_decode($deMap['STORE_COMMERCIAL_MODULES'] ?? '{}', true) ?: [
                'flash_deals' => true,
                'horizontal_rails' => true,
                'cfdi_trust' => true,
                'hero_vitrina' => true
            ];
            $tenant->showWhatsapp = ($deMap['STORE_SHOW_WHATSAPP'] ?? 'NO') === 'SI';
            $tenant->whatsappPhone = $deMap['STORE_WHATSAPP_PHONE'] ?? '';
            $tenant->whatsappGreeting = $deMap['STORE_WHATSAPP_GREETING'] ?? '¡Hola! Requiero asistencia.';

            // Load Quantix Apex Command Tower configuration
            $tenant->apexConfig = [];
            try {
                $stmtApex = $db->prepare("SELECT ConfigJSON, Industria FROM config_tienda_tenants WHERE EmisorID = ? LIMIT 1");
                $stmtApex->execute([$tenant->emisorId]);
                if ($rowApex = $stmtApex->fetch()) {
                    $decodedApex = json_decode($rowApex['ConfigJSON'], true);
                    if (is_array($decodedApex)) {
                        if (QuantixIndustryContract::kind($rowApex['Industria'] ?? null) !== null) $decodedApex['_industria'] = $rowApex['Industria'];
                        $tenant->apexConfig = $decodedApex;
                        if (!empty($decodedApex['tenant_name'])) {
                            $tenant->brandName = $decodedApex['tenant_name'];
                        }
                        if (!empty($decodedApex['hero_curation']) && is_array($decodedApex['hero_curation'])) {
                            $hc = $decodedApex['hero_curation'];
                            if (array_key_exists('headline', $hc)) {
                                $explicitHero['headline'] = true;
                                $tenant->headline = $hc['headline'];
                            }
                            if (array_key_exists('subheadline', $hc)) {
                                $explicitHero['subheadline'] = true;
                                $tenant->description = $hc['subheadline'];
                                $tenant->heroSubheadline = $hc['subheadline'];
                            }
                            if (array_key_exists('kicker', $hc)) {
                                $explicitHero['kicker'] = true;
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
            $tenant->paymentSettings = StorefrontControlContract::payments($tenant->apexConfig, $deMap);
            $tenant->bankName = $tenant->paymentSettings['spei_bank'];
            $tenant->bankClabe = $tenant->paymentSettings['spei_clabe'];
            $tenant->bankBeneficiary = $tenant->paymentSettings['spei_beneficiary'];
        }

        if (isset($_GET['studio_3d'])) {
            if (!is_array($tenant->studio3DConfig)) $tenant->studio3DConfig = [];
            $tenant->studio3DConfig['enabled'] = ($_GET['studio_3d'] === '1' || $_GET['studio_3d'] === 'true');
        }

        if (!empty($_GET['archetype'])) {
            $reqArch = strtolower(trim($_GET['archetype']));
            if (in_array($reqArch, ['maison', 'titan', 'nordic', 'social', 'atelier'])) {
                $tenant->archetype = $reqArch;
            }
        }

        // Only absent fields receive neutral defaults; intentionally empty copy stays empty.
        $tenant->cartTitle = $tenant->isPerfumery() ? 'Bolsa de Compras' : 'Carrito de Compras';
        if (!isset($explicitHero['headline']) && $tenant->headline === '') $tenant->headline = $tenant->brandName;
        if (!isset($explicitHero['kicker']) && $tenant->heroKicker === '') $tenant->heroKicker = 'NUESTRA SELECCIÓN';
        if (!isset($explicitHero['subheadline']) && $tenant->heroSubheadline === '') $tenant->heroSubheadline = 'Explora la colección y consulta los detalles.';

        if (!empty($_GET['theme'])) {
            $tenant->theme = strtolower(trim($_GET['theme']));
        }

        return $tenant;
    }
}

if (!function_exists('renderHeroHeadlineFormatted')) {
    function renderHeroHeadlineFormatted($rawText) {
        return QuantixStoreText::headline($rawText);
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

