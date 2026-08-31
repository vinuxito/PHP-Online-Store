<?php
/**
 * index.php — Quantix Luxury Storefront Showroom
 * Powered by Evinux Engine
 */

require_once __DIR__ . '/includes/tenant_resolver.php';
$tenant = StorefrontTenant::resolve();
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?php echo htmlspecialchars($tenant->brandName); ?> — Boutique Oficial</title>
  <meta name="description" content="<?php echo htmlspecialchars($tenant->description); ?>">
  <link rel="stylesheet" href="css/storefront_luxury.css?v=20260830_01">
  <style>
    :root {
      --qx-accent: <?php echo htmlspecialchars($tenant->primaryColor); ?>;
    }
  </style>
  <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
</head>
<body>

<?php if (!$tenant->isStoreActive): ?>
  <div style="min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:30px; text-align:center; background:radial-gradient(circle at 50% 30%, rgba(56, 189, 248, 0.08), transparent 70%);">
    <div style="background:var(--qx-surface); border:1px solid var(--qx-border); border-radius:var(--qx-radius-xl); padding:48px 36px; max-width:540px; width:100%; box-shadow:var(--qx-shadow-card);">
      <div style="font-size:42px; margin-bottom:16px;">✨</div>
      <h1 style="font-size:24px; font-weight:800; color:#ffffff; margin-bottom:8px;"><?php echo htmlspecialchars($tenant->brandName); ?></h1>
      <div style="display:inline-block; background:rgba(244, 63, 94, 0.12); color:#f43f5e; border:1px solid rgba(244, 63, 94, 0.3); font-size:11px; font-weight:700; text-transform:uppercase; padding:3px 10px; border-radius:999px; margin-bottom:20px; letter-spacing:0.5px;">
        🔒 Servicio Storefront No Activo
      </div>
      <p style="font-size:14px; color:var(--qx-text-muted); line-height:1.6; margin-bottom:24px;">
        Esta boutique en línea oficial se encuentra actualmente en preparación o requiere la activación del servicio <strong>Quantix Storefront</strong> en el Catálogo de Datos Extra (<code>QUANTIXFRONTSTORE = SI</code>).
      </p>
      <?php if (!empty($tenant->email) || !empty($tenant->phone)): ?>
        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--qx-border); border-radius:var(--qx-radius-md); padding:16px; font-size:13px; color:var(--qx-text-muted); margin-bottom:24px; text-align:left;">
          <?php if (!empty($tenant->email)): ?><div>✉️ <strong>Contacto:</strong> <?php echo htmlspecialchars($tenant->email); ?></div><?php endif; ?>
          <?php if (!empty($tenant->phone)): ?><div style="margin-top:4px;">📞 <strong>Teléfono:</strong> <?php echo htmlspecialchars($tenant->phone); ?></div><?php endif; ?>
        </div>
      <?php endif; ?>
      <a href="https://evinux.net/cfdadmin/" style="display:inline-flex; align-items:center; gap:8px; padding:10px 20px; background:rgba(255,255,255,0.06); border:1px solid var(--qx-border); color:#ffffff; font-size:13px; font-weight:700; border-radius:var(--qx-radius-md); text-decoration:none; transition:all 0.2s ease;">
        ← Volver al Panel Evinux
      </a>
    </div>
  </div>
</body>
</html>
<?php exit; endif; ?>

  <!-- Navigation Bar -->
  <header class="qx-navbar">
    <div class="qx-nav-container">
      <a href="index.php?emisor=<?php echo urlencode($tenant->emisorId); ?>" class="qx-brand">
        <?php if (!empty($tenant->logo)): ?>
          <img src="<?php echo htmlspecialchars($tenant->logo); ?>" alt="Logo" class="qx-brand-logo" onerror="this.style.display='none'">
        <?php endif; ?>
        <div>
          <div class="qx-brand-title"><?php echo htmlspecialchars($tenant->brandName); ?></div>
        </div>
        <span class="qx-brand-badge">Boutique Oficial</span>
      </a>

      <div class="qx-nav-search" id="qx_nav_search_trigger" style="cursor:pointer" title="Haz clic o presiona ⌘K para buscar">
        <span class="qx-search-icon">🔍</span>
        <input type="text" id="qx_search_input" class="qx-search-input" placeholder="Buscar por nombre, código o SKU... (⌘K)" autocomplete="off">
      </div>

      <div class="qx-nav-actions">
        <button type="button" class="qx-tasting-nav-btn" id="qx_btn_nav_tasting" title="Masterclass VIP & Sala Privada de Cata 1-a-1">
          <span class="qx-tasting-sparkle">🍷</span>
          <span>Cata Virtual</span>
          <span class="qx-tasting-live-dot" title="Sommelier en Línea"></span>
        </button>
        <button type="button" class="qx-vault-nav-btn" id="qx_btn_nav_vault" title="Bóveda de Fidelidad & Club de Recargas VIP">
          <span class="qx-vault-sparkle">👑</span>
          <span>Bóveda VIP</span>
          <span class="qx-vault-tier-badge" id="qx_nav_vault_tier">VIP</span>
        </button>
        <button type="button" class="qx-passport-nav-btn" id="qx_btn_nav_passport" title="Pasaporte Digital de Cata & Blind-Buy Shield">
          <span class="qx-passport-sparkle">🛡️</span>
          <span>Pasaporte</span>
          <span class="qx-passport-badge" id="qx_passport_badge" style="display:none">0</span>
        </button>
        <button type="button" class="qx-layering-nav-btn" id="qx_btn_nav_layering" title="Atelier de Alquimia de Capas & Layering">
          <span class="qx-layering-sparkle">🧪</span>
          <span>Alquimia</span>
        </button>
        <button type="button" class="qx-somm-nav-btn" id="qx_btn_sommelier_trigger" title="Asesor Sensorial Aura AI Sommelier">
          <span class="qx-somm-sparkle">✨</span>
          <span>Aura Sommelier</span>
        </button>
        <button type="button" class="qx-cart-btn" id="qx_cart_btn">
          <span>🛍️</span>
          <span>Carrito</span>
          <span class="qx-cart-badge" id="qx_cart_badge">0</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Boutique Stories Bar (Social Commerce) -->
  <section class="qx-stories-section">
    <div class="qx-stories-container" id="qx_stories_container"></div>
  </section>

  <!-- Hero Showcase Banner -->
  <section class="qx-hero">
    <h1 class="qx-hero-title"><?php echo htmlspecialchars($tenant->brandName); ?></h1>
    <p class="qx-hero-subtitle"><?php echo htmlspecialchars($tenant->description); ?></p>
    
    <!-- Hero 3D Star Carousel -->
    <div class="qx-hero-carousel-3d-wrapper" id="qx_hero_carousel_wrapper" style="display:none;">
      <button class="qx-3d-nav-arrow prev" id="qx_3d_prev" aria-label="Anterior">‹</button>
      <div class="qx-3d-stage" id="qx_3d_stage"></div>
      <button class="qx-3d-nav-arrow next" id="qx_3d_next" aria-label="Siguiente">›</button>
      <div class="qx-3d-dots" id="qx_3d_dots"></div>
    </div>
    <!-- Category Filter Chips & View Switcher Bar -->
    <div class="qx-catalog-controls">
      <nav class="qx-categories-bar" id="qx_categories_bar"></nav>
      <div class="qx-view-switcher" id="qx_view_switcher">
        <button type="button" class="qx-view-btn active" data-view="2col" id="qx_view_2col" title="Vista Cuadrícula 2 Columnas">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>
        </button>
        <button type="button" class="qx-view-btn" data-view="1col" id="qx_view_1col" title="Vista Cinema 1 Columna">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/></svg>
        </button>
      </div>
    </div>
  </section>

  <!-- Main Product Showroom Grid -->
  <main class="qx-main-container">
    <div class="qx-grid view-2col" id="qx_product_grid"></div>
  </main>

  <!-- Slide-Over Shopping Cart Drawer -->
  <div class="qx-drawer-backdrop" id="qx_cart_backdrop"></div>
  <aside class="qx-drawer" id="qx_cart_drawer">
    <div class="qx-drawer-header">
      <div class="qx-drawer-title">
        <span>🛍️</span>
        <span>Bolsa de Compras</span>
      </div>
      <button type="button" class="qx-drawer-close" id="qx_cart_close">&times;</button>
    </div>

    <div class="qx-cart-list" id="qx_cart_list"></div>

    <!-- Sensory Atelier: Smart Decant Upsell Card -->
    <div class="qx-cart-upsell" id="qx_cart_upsell" style="display:none;">
      <div class="qx-upsell-header">
        <span class="qx-upsell-badge">🧪 Cata & Viaje</span>
        <span class="qx-upsell-title">Descubre el Decant de Bolsillo (5ml)</span>
      </div>
      <div class="qx-upsell-body">
        <img class="qx-upsell-img" id="qx_upsell_img" src="" alt="Decant Muestra">
        <div class="qx-upsell-details">
          <div class="qx-upsell-name" id="qx_upsell_name">Decant Atomizador 5ml</div>
          <div class="qx-upsell-price" id="qx_upsell_price">+ $ 150.00 MXN</div>
        </div>
        <button type="button" class="qx-btn-upsell-add" id="qx_btn_upsell_add">+ Agregar</button>
      </div>
    </div>

    <div class="qx-cart-footer">
      <!-- Decant Passport Cash-Back Voucher Row -->
      <div class="qx-voucher-apply-box" id="qx_cart_voucher_box">
        <div class="qx-voucher-input-wrap">
          <input type="text" id="qx_voucher_input" class="qx-voucher-input" placeholder="🛡️ Código Cupón Pasaporte (ej. SHIELD-...)">
          <button type="button" id="qx_btn_apply_voucher" class="qx-btn-apply-voucher">Aplicar</button>
        </div>
        <div class="qx-voucher-applied-pill" id="qx_voucher_applied_pill" style="display:none;">
          <span id="qx_voucher_applied_label">🛡️ Bono Blind-Buy Shield (-$150.00)</span>
          <button type="button" id="qx_btn_remove_voucher" class="qx-btn-remove-voucher" title="Quitar cupón">✕</button>
        </div>
      </div>

      <div class="qx-summary-row">
        <span>Subtotal</span>
        <span id="qx_cart_subtotal">$ 0.00</span>
      </div>
      <div class="qx-summary-row discount" id="qx_cart_discount_row" style="display:none;">
        <span style="color:#fbbf24; font-weight:700;">🛡️ Bono Decant Passport</span>
        <span id="qx_cart_discount_amount" style="color:#fbbf24; font-weight:700;">- $ 0.00</span>
      </div>
      <div class="qx-summary-row discount refill" id="qx_cart_refill_discount_row" style="display:none;">
        <span style="color:#c084fc; font-weight:700;">🔄 Descuento Club Recargas (-12%)</span>
        <span id="qx_cart_refill_discount_amount" style="color:#c084fc; font-weight:700;">- $ 0.00</span>
      </div>
      <div class="qx-summary-row">
        <span>IVA Trasladado (16%)</span>
        <span id="qx_cart_iva">$ 0.00</span>
      </div>
      <div class="qx-summary-row total">
        <span>Total a Pagar</span>
        <span id="qx_cart_total">$ 0.00</span>
      </div>
      <button type="button" class="qx-btn-checkout" id="qx_btn_proceed_checkout">
        <span>⚡ Proceder al Pago</span>
      </button>
    </div>
  </aside>

  <!-- Slide-Over Checkout Drawer -->
  <div class="qx-drawer-backdrop" id="qx_checkout_backdrop"></div>
  <aside class="qx-drawer qx-checkout-drawer" id="qx_checkout_drawer">
    <div class="qx-drawer-header">
      <div class="qx-drawer-title">
        <span>💳</span>
        <span>Finalizar Pedido</span>
      </div>
      <button type="button" class="qx-drawer-close" id="qx_checkout_close">&times;</button>
    </div>

    <form id="qx_checkout_form" style="display:flex; flex-direction:column; flex:1; overflow-y:auto; padding:20px 24px;">
      <div id="qx_checkout_summary" style="background:rgba(255,255,255,0.04); border:1px solid var(--qx-border); border-radius:var(--qx-radius-md); padding:14px; margin-bottom:16px;"></div>

      <div class="qx-form-group">
        <label class="qx-form-label">Nombre Completo *</label>
        <input type="text" class="qx-form-input" id="qx_cust_name" required placeholder="Ej: Juan Pérez Morales">
      </div>

      <div class="qx-form-group">
        <label class="qx-form-label">Correo Electrónico *</label>
        <input type="email" class="qx-form-input" id="qx_cust_email" required placeholder="para enviar confirmación y factura">
      </div>

      <div class="qx-form-group">
        <label class="qx-form-label">Teléfono / WhatsApp</label>
        <input type="tel" class="qx-form-input" id="qx_cust_phone" placeholder="Ej: 55 1234 5678">
      </div>

      <div class="qx-form-group">
        <label class="qx-form-label">Dirección de Entrega *</label>
        <input type="text" class="qx-form-input" id="qx_cust_address" required placeholder="Calle, Número, Colonia, C.P., Ciudad">
      </div>

      <!-- Payment Method -->
      <div class="qx-form-group">
        <label class="qx-form-label">Método de Pago</label>
        <div style="display:flex; gap:10px; margin-top:6px;">
          <label style="display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer;">
            <input type="radio" name="qx_payment_method" value="SPEI" checked> Transferencia SPEI
          </label>
          <label style="display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer;">
            <input type="radio" name="qx_payment_method" value="CARD"> Tarjeta (Stripe)
          </label>
          <label style="display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer;">
            <input type="radio" name="qx_payment_method" value="PAYPAL"> PayPal
          </label>
        </div>
      </div>

      <!-- SPEI Voucher with 1-Click Copy (Module 3) -->
      <div class="qx-spei-voucher" id="qx_spei_voucher">
        <div class="qx-spei-title">
          <span>🏦</span>
          <span>Instrucciones de Transferencia SPEI</span>
        </div>
        <div class="qx-spei-row">
          <span class="qx-spei-label">Banco Receptor:</span>
          <span class="qx-spei-val" id="qx_spei_bank"><?php echo htmlspecialchars($tenant->bankName ?? 'BBVA Bancomer'); ?></span>
        </div>
        <div class="qx-spei-row">
          <span class="qx-spei-label">Beneficiario:</span>
          <span class="qx-spei-val" id="qx_spei_beneficiary"><?php echo htmlspecialchars($tenant->brandName); ?></span>
        </div>
        <div class="qx-spei-row">
          <span class="qx-spei-label">CLABE Interbancaria:</span>
          <div class="qx-spei-clabe-box">
            <input type="text" readonly id="qx_spei_clabe_val" value="<?php echo htmlspecialchars($tenant->bankClabe ?? '012180001234567890'); ?>" class="qx-clabe-text">
            <button type="button" class="qx-btn-copy-clabe" id="qx_btn_copy_clabe" title="Copiar CLABE">Copiar</button>
          </div>
        </div>
        <div style="font-size:11.5px; color:var(--qx-text-muted); margin-top:8px;">
          ⚡ Tu pedido se procesará de inmediato al registrarse la transferencia interbancaria.
        </div>
      </div>

      <!-- CFDI 4.0 Native Invoicing Gate -->
      <div class="qx-cfdi-card">
        <label class="qx-cfdi-toggle">
          <input type="checkbox" id="qx_require_cfdi">
          <span>🏛️ ¿Requieres Factura Fiscal Electrónica (CFDI 4.0)?</span>
        </label>

        <div id="qx_cfdi_fields" style="display:none; margin-top:14px;">
          <div class="qx-form-group">
            <span id="qx_rfc_type_badge" style="display:none;"></span>
            <label class="qx-form-label">RFC del Receptor *</label>
            <input type="text" class="qx-form-input" id="qx_cfdi_rfc" placeholder="Ej: XAXX010101000" maxlength="13" style="text-transform:uppercase;">
          </div>

          <div class="qx-form-group">
            <label class="qx-form-label">Razón Social / Nombre Fiscal *</label>
            <input type="text" class="qx-form-input" id="qx_cfdi_razon" placeholder="Como aparece en la Constancia CSF">
          </div>

          <div class="qx-form-group">
            <label class="qx-form-label">Código Postal Fiscal *</label>
            <input type="text" class="qx-form-input" id="qx_cfdi_cp" placeholder="Ej: 01000" maxlength="5">
          </div>

          <div class="qx-form-group">
            <label class="qx-form-label">Régimen Fiscal</label>
            <select class="qx-form-input" id="qx_cfdi_regimen">
              <option value="601">601 - General de Ley Personas Morales</option>
              <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
              <option value="626" selected>626 - Régimen Simplificado de Confianza (RESICO)</option>
              <option value="605">605 - Sueldos y Salarios</option>
              <option value="616">616 - Sin obligaciones fiscales</option>
            </select>
          </div>

          <div class="qx-form-group">
            <label class="qx-form-label">Uso de CFDI</label>
            <select class="qx-form-input" id="qx_cfdi_uso">
              <option value="G03" selected>G03 - Gastos en general</option>
              <option value="G01">G01 - Adquisición de mercancías</option>
              <option value="S01">S01 - Sin efectos fiscales</option>
              <option value="CP01">CP01 - Pagos</option>
            </select>
          </div>
        </div>
      </div>

      <button type="submit" class="qx-btn-place-order" id="qx_btn_place_order">
        <span>Confirmar y Pagar Orden</span>
      </button>
    </form>
  </aside>

  <!-- Executive Product Detail Modal (Atelier Showcase & Mobile Bottom-Sheet) -->
  <div class="qx-product-modal-backdrop" id="qx_product_modal_backdrop"></div>
  <div class="qx-product-modal" id="qx_product_modal" role="dialog" aria-modal="true" aria-labelledby="qx_pmodal_title">
    <!-- Top Grabber Indicator with Drag-to-Dismiss -->
    <div class="qx-pmodal-grabber" id="qx_pmodal_grabber" title="Toca o desliza hacia abajo para cerrar"></div>
    
    <!-- Floating Minimalist Header -->
    <div class="qx-pmodal-float-header">
      <button type="button" class="qx-pmodal-close-circle" id="qx_pmodal_close" aria-label="Cerrar ficha" title="Cerrar ficha">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      <button type="button" class="qx-pmodal-share-btn" id="qx_pmodal_share" aria-label="Compartir producto" title="Compartir producto">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
      </button>
    </div>
    
    <div class="qx-pmodal-layout">
      <!-- Left Column: Gallery with Touch-Swipeable Track, Scent Aura Canvas & 3D Tilt -->
      <div class="qx-pmodal-gallery">
        <div class="qx-pmodal-stage qx-tilt-container" id="qx_pmodal_stage">
          <canvas class="qx-aura-canvas" id="qx_pmodal_aura_canvas"></canvas>
          <div class="qx-pmodal-swipe-track qx-tilt-target" id="qx_pmodal_swipe_track">
            <img id="qx_pmodal_main_img" class="qx-tilt-img" src="" alt="Vista previa del producto">
          </div>
          <div class="qx-glass-sheen" id="qx_pmodal_glass_sheen"></div>
          <span class="qx-pmodal-badge" id="qx_pmodal_badge" style="display:none;">★ Edición Destacada</span>
          <div class="qx-tilt-hint" id="qx_tilt_hint"><span>✨ Inclina o mueve para explorar en 3D</span></div>
        </div>
        <!-- Swipe Pagination Dots -->
        <div class="qx-pmodal-dots" id="qx_pmodal_dots"></div>
        <div class="qx-pmodal-filmstrip" id="qx_pmodal_filmstrip"></div>
      </div>

      <!-- Right Column: Details & Commercial Actions -->
      <div class="qx-pmodal-info">
        <div class="qx-pmodal-meta">
          <span class="qx-pmodal-cat" id="qx_pmodal_cat">PERFUME</span>
          <span class="qx-pmodal-sku" id="qx_pmodal_sku">SKU: 00163...</span>
          <span class="qx-pmodal-sat" id="qx_pmodal_sat">SAT: 53131600</span>
        </div>

        <h2 class="qx-pmodal-title" id="qx_pmodal_title">Nombre del Producto</h2>

        <div class="qx-pmodal-price-box">
          <div class="qx-pmodal-price-row">
            <span class="qx-pmodal-price" id="qx_pmodal_price">$ 0.00</span>
            <span class="qx-pmodal-currency">MXN</span>
          </div>
          <div class="qx-pmodal-badges">
            <span class="qx-pmodal-pill tax">✔ IVA 16% Incluido</span>
            <span class="qx-pmodal-pill cfdi">⚡ Facturación CFDI 4.0</span>
            <span class="qx-pmodal-pill stock" id="qx_pmodal_stock">📦 En Existencia</span>
          </div>
        </div>

        <!-- Sensory Atelier: Format Selector (100ml Bottle vs 5ml Decant) -->
        <div class="qx-format-selector" id="qx_format_selector">
          <div class="qx-format-header">
            <span class="qx-format-title">✨ Selecciona tu Formato</span>
            <span class="qx-format-sub">Prueba antes de abrir o llévate el frasco de autor</span>
          </div>
          <div class="qx-format-grid">
            <button type="button" class="qx-format-card active" id="qx_format_full" data-format="full">
              <div class="qx-format-card-badge">Tamaño Original</div>
              <div class="qx-format-card-title">🛍️ Frasco Completo (100ml)</div>
              <div class="qx-format-card-price" id="qx_format_price_full">$ 0.00</div>
            </button>
            <button type="button" class="qx-format-card" id="qx_format_decant" data-format="decant">
              <div class="qx-format-card-badge qx-badge-decant">🧪 Muestra de Cata</div>
              <div class="qx-format-card-title">Decant Atomizador (5ml)</div>
              <div class="qx-format-card-price" id="qx_format_price_decant">$ 180.00</div>
            </button>
          </div>
        </div>

        <!-- Blind-Buy Shield Guarantee Card -->
        <div class="qx-shield-guarantee-card" id="qx_shield_guarantee_card">
          <div class="qx-shield-card-icon">🛡️</div>
          <div class="qx-shield-card-body">
            <div class="qx-shield-card-title">Garantía Blind-Buy Shield (100% Bonificable)</div>
            <div class="qx-shield-card-desc">Prueba el Decant de 5ml sin riesgo. Si te enamora, el 100% de su valor se abona automáticamente a tu botella completa de 100ml.</div>
          </div>
          <div class="qx-shield-card-badge">Cero Riesgo</div>
        </div>

        <!-- Olfactory Refill Club: Auto-Replenishment Card -->
        <div class="qx-refill-subscription-card" id="qx_refill_subscription_card">
          <div class="qx-refill-card-header">
            <div class="qx-refill-badge-vip">🔄 CLUB DE RECARGAS VIP</div>
            <div class="qx-refill-savings-pill">Ahorra 12% + Regalo</div>
          </div>
          <div class="qx-refill-card-content">
            <div class="qx-refill-options-grid">
              <label class="qx-refill-radio-label active" id="qx_refill_opt_once_lbl">
                <input type="radio" name="qx_purchase_mode" value="once" checked id="qx_refill_opt_once">
                <span class="qx-refill-radio-custom"></span>
                <div class="qx-refill-opt-text">
                  <strong>Compra Única</strong>
                  <span class="qx-refill-opt-sub">Adquisición regular de una sola vez</span>
                </div>
              </label>
              <label class="qx-refill-radio-label" id="qx_refill_opt_sub_lbl">
                <input type="radio" name="qx_purchase_mode" value="subscription" id="qx_refill_opt_sub">
                <span class="qx-refill-radio-custom"></span>
                <div class="qx-refill-opt-text">
                  <strong>Auto-Recarga Programada (12% OFF)</strong>
                  <span class="qx-refill-opt-sub">🎁 Incluye Atomizador de Bolsillo 5ml GRATIS en cada recarga</span>
                </div>
              </label>
            </div>
            <div class="qx-refill-freq-row" id="qx_refill_freq_row" style="display:none;">
              <span class="qx-refill-freq-label">Frecuencia de Recarga:</span>
              <div class="qx-refill-freq-pills">
                <button type="button" class="qx-freq-pill active" data-months="3">Cada 3 Meses ⚡</button>
                <button type="button" class="qx-freq-pill" data-months="6">Cada 6 Meses</button>
                <button type="button" class="qx-freq-pill" data-months="12">Cada 12 Meses</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Adaptive Spec Matrix & Performance Indicators -->
        <div class="qx-pmodal-section">
          <h3 class="qx-pmodal-sec-title">Especificaciones & Detalles</h3>
          <div id="qx_pmodal_adaptive_specs"></div>
          <div class="qx-pmodal-desc" id="qx_pmodal_desc" style="margin-top:6px;">Descripción detallada...</div>
        </div>

        <!-- Radar Olfativo Hexagonal & Perfilador Climático en Vivo -->
        <div class="qx-pmodal-section" id="qx_pmodal_radar_section">
          <div class="qx-radar-header-row">
            <div>
              <h3 class="qx-pmodal-sec-title">📊 Radar de Estela & Rendimiento Olfativo</h3>
              <p class="qx-radar-subtitle">Física de proyección molecular y longevidad en piel</p>
            </div>
            <button type="button" class="qx-btn-radar-compare" id="btn_open_radar_compare">
              <span>⚔️ Comparar</span>
            </button>
          </div>

          <!-- Radar SVG Container -->
          <div class="qx-radar-stage" id="qx_radar_stage">
            <svg id="qx_pmodal_radar_svg" class="qx-radar-svg" viewBox="-160 -150 320 300"></svg>
            <div class="qx-radar-tooltip" id="qx_radar_tooltip" style="display:none;"></div>
          </div>

          <!-- 6 Tactical Metric Chips -->
          <div class="qx-radar-chips-grid" id="qx_radar_chips_grid">
            <div class="qx-radar-chip" data-axis="0">
              <span class="qx-chip-icon">🚀</span>
              <span class="qx-chip-label">Proyección</span>
              <span class="qx-chip-val" id="qx_chip_proyeccion">8/10</span>
            </div>
            <div class="qx-radar-chip" data-axis="1">
              <span class="qx-chip-icon">🌊</span>
              <span class="qx-chip-label">Espectro</span>
              <span class="qx-chip-val" id="qx_chip_espectro">Fresco</span>
            </div>
            <div class="qx-radar-chip" data-axis="2">
              <span class="qx-chip-icon">👑</span>
              <span class="qx-chip-label">Elogios</span>
              <span class="qx-chip-val" id="qx_chip_elogios">94%</span>
            </div>
            <div class="qx-radar-chip" data-axis="3">
              <span class="qx-chip-icon">⏳</span>
              <span class="qx-chip-label">Longevidad</span>
              <span class="qx-chip-val" id="qx_chip_longevidad">8.5h</span>
            </div>
            <div class="qx-radar-chip" data-axis="4">
              <span class="qx-chip-icon">☀️</span>
              <span class="qx-chip-label">Versatilidad</span>
              <span class="qx-chip-val" id="qx_chip_versatilidad">90%</span>
            </div>
            <div class="qx-radar-chip" data-axis="5">
              <span class="qx-chip-icon">🌡️</span>
              <span class="qx-chip-label">Rango Térmico</span>
              <span class="qx-chip-val" id="qx_chip_temperatura">18-38°C</span>
            </div>
          </div>

          <!-- Live Weather Match Card -->
          <div class="qx-weather-match-card" id="qx_weather_match_card">
            <div class="qx-weather-card-header">
              <div class="qx-weather-city-badge">
                <span id="qx_weather_city_icon">☀️</span>
                <span id="qx_weather_city_name">Guadalajara</span>
                <span class="qx-weather-temp-badge" id="qx_weather_city_temp">28°C</span>
              </div>
              <button type="button" class="qx-btn-change-city" id="btn_change_weather_city">📍 Cambiar Ciudad</button>
            </div>
            <div class="qx-weather-match-body">
              <div class="qx-weather-score-row">
                <span class="qx-weather-score-label">Eficacia Climática Hoy:</span>
                <span class="qx-weather-score-val" id="qx_weather_match_score">96%</span>
              </div>
              <div class="qx-weather-progress-track">
                <div class="qx-weather-progress-fill" id="qx_weather_match_fill" style="width: 96%;"></div>
              </div>
              <p class="qx-weather-advice-text" id="qx_weather_advice_text">
                🔥 <strong>Rendimiento Ideal Hoy:</strong> Las notas frescas proyectarán de forma óptima con la temperatura actual de tu ciudad.
              </p>
            </div>
          </div>
        </div>

        <!-- 3 Universal Satin Metric Bars -->
        <div class="qx-pmodal-section">
          <h3 class="qx-pmodal-sec-title">Métricas de Rendimiento</h3>
          <div class="qx-pmodal-metrics-box">
            <div class="qx-metric-item">
              <div class="qx-metric-header">
                <span id="qx_metric_label_1">Intensidad / Potencia</span>
                <span class="qx-metric-val" id="qx_metric_val_1">85%</span>
              </div>
              <div class="qx-metric-track"><div class="qx-metric-fill" id="qx_metric_bar_1"></div></div>
            </div>
            <div class="qx-metric-item">
              <div class="qx-metric-header">
                <span id="qx_metric_label_2">Duración / Longevidad</span>
                <span class="qx-metric-val" id="qx_metric_val_2">90%</span>
              </div>
              <div class="qx-metric-track"><div class="qx-metric-fill" id="qx_metric_bar_2"></div></div>
            </div>
            <div class="qx-metric-item">
              <div class="qx-metric-header">
                <span id="qx_metric_label_3">Versatilidad & Calidad</span>
                <span class="qx-metric-val" id="qx_metric_val_3">95%</span>
              </div>
              <div class="qx-metric-track"><div class="qx-metric-fill" id="qx_metric_bar_3"></div></div>
            </div>
          </div>
        </div>

        <!-- Documents / Fichas Técnicas if any -->
        <div class="qx-pmodal-section" id="qx_pmodal_docs_sec" style="display:none;">
          <h3 class="qx-pmodal-sec-title">Documentos & Ficha Técnica</h3>
          <div id="qx_pmodal_docs" class="qx-pmodal-docs-list"></div>
        </div>

        <!-- Desktop Action Buttons -->
        <div class="qx-pmodal-actions-box">
          <div class="qx-pmodal-qty-row">
            <span style="font-size:13px; font-weight:700; color:var(--qx-text-muted);">Cantidad:</span>
            <div class="pmodal-stepper">
              <button type="button" class="qx-step-btn" id="qx_pmodal_qty_dec">-</button>
              <span id="qx_pmodal_qty_val" style="font-size:13px; font-weight:800; min-width:24px; text-align:center;">1</span>
              <button type="button" class="qx-step-btn" id="qx_pmodal_qty_inc">+</button>
            </div>
          </div>

          <div class="qx-pmodal-buttons">
            <button type="button" class="qx-btn-pmodal-cart" id="qx_pmodal_btn_add">
              <span>🛍️</span>
              <span>Agregar al Carrito</span>
            </button>
            <button type="button" class="qx-btn-pmodal-buy" id="qx_pmodal_btn_buy">
              <span>⚡</span>
              <span>Comprar Ahora</span>
            </button>
          </div>

          <!-- Layering Alchemy Trigger Button -->
          <button type="button" class="qx-btn-pmodal-layering" id="qx_pmodal_btn_layering">
            <span>🧪 Probar Alquimia de Capas (Layering Studio)</span>
          </button>

          <!-- VIP WhatsApp inquiry button -->
          <a href="#" target="_blank" class="qx-btn-pmodal-wa" id="qx_pmodal_btn_wa" style="display:none;">
            <span>💬</span>
            <span>Consultar por WhatsApp con Concierge VIP</span>
          </a>

          <!-- Bottom Dismiss Action Button -->
          <button type="button" class="qx-btn-pmodal-dismiss" id="qx_pmodal_btn_dismiss">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            <span>Cerrar Ficha & Seguir Explorando</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Sticky Thumb-Zone Buy Bar (Mobile) -->
    <div class="qx-pmodal-bottom-bar" id="qx_pmodal_bottom_bar">
      <div class="qx-pmodal-bar-price">
        <div class="qx-pmodal-bar-num" id="qx_pmodal_bar_price">$ 0.00</div>
        <div class="qx-pmodal-bar-sub">IVA 16% Incluido</div>
      </div>
      <div class="qx-pmodal-bar-actions">
        <div class="pmodal-stepper compact">
          <button type="button" class="qx-step-btn" id="qx_pmodal_bar_dec">-</button>
          <span id="qx_pmodal_bar_qty" style="font-size:13px; font-weight:800; min-width:20px; text-align:center;">1</span>
          <button type="button" class="qx-step-btn" id="qx_pmodal_bar_inc">+</button>
        </div>
        <button type="button" class="qx-btn-bar-buy" id="qx_pmodal_bar_buy">
          <span>⚡ Comprar</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Spotlight Omnibox (⌘K) Modal -->
  <div class="qx-spotlight-backdrop" id="qx_spotlight_backdrop"></div>
  <div class="qx-spotlight-modal" id="qx_spotlight_modal" role="dialog" aria-modal="true">
    <div class="qx-spotlight-header">
      <span class="qx-spotlight-search-icon">🔍</span>
      <input type="text" id="qx_spotlight_input" class="qx-spotlight-input" placeholder="Buscar por producto, marca, SKU o clave SAT... (Esc para salir)" autocomplete="off">
      <kbd class="qx-spotlight-kbd">ESC</kbd>
    </div>
    <div class="qx-spotlight-body">
      <div class="qx-spotlight-results" id="qx_spotlight_results"></div>
    </div>
    <div class="qx-spotlight-footer">
      <span><kbd>↑</kbd> <kbd>↓</kbd> Navegar</span>
      <span><kbd>↵</kbd> Ver Ficha</span>
      <span><kbd>ESC</kbd> Cerrar</span>
    </div>
  </div>

  <!-- Aura AI Sommelier Modal (Sensory Natural Language Matchmaker) -->
  <div class="qx-sommelier-backdrop" id="qx_sommelier_backdrop"></div>
  <div class="qx-sommelier-modal" id="qx_sommelier_modal" role="dialog" aria-modal="true" aria-labelledby="qx_somm_title">
    <div class="qx-somm-modal-header">
      <div class="qx-somm-badge"><span>🧠</span> Aura AI Sensory Engine</div>
      <h2 class="qx-somm-title" id="qx_somm_title">Aura AI Sommelier</h2>
      <p class="qx-somm-subtitle">Describe lo que buscas por ocasión, clima, acordes o sensación deseada.</p>
      <button type="button" class="qx-somm-close" id="qx_somm_close" aria-label="Cerrar Sommelier">&times;</button>
    </div>

    <div class="qx-somm-modal-body">
      <!-- Conversational Search Wrap -->
      <div class="qx-somm-search-wrap">
        <span class="qx-somm-search-icon">✨</span>
        <input type="text" id="qx_somm_input" class="qx-somm-input" placeholder="Ej. 'Algo fresco para la playa y clima de calor' o 'Dulce con vainilla para cita'..." autocomplete="off">
        <button type="button" class="qx-somm-voice-btn" id="qx_somm_voice_btn" title="Búsqueda por voz (Web Speech)">🎙️</button>
      </div>

      <!-- Quick Occasion Chips -->
      <div class="qx-somm-chips-row" id="qx_somm_chips">
        <button type="button" class="qx-somm-chip" data-prompt="algo fresco para la playa y clima de calor">🏖️ Boda / Playa</button>
        <button type="button" class="qx-somm-chip" data-prompt="dulce con vainilla para cita de noche en invierno">🌙 Cita Romántica</button>
        <button type="button" class="qx-somm-chip" data-prompt="elegante y formal para oficina">💼 Oficina & Elegancia</button>
        <button type="button" class="qx-somm-chip" data-prompt="calido especiado con canela y ambar">🪵 Especiado & Ámbar</button>
        <button type="button" class="qx-somm-chip" data-prompt="fragancia duradera potente con alta estela modo bestia">🔥 Modo Bestia</button>
        <button type="button" class="qx-somm-chip" data-prompt="floral sofisticado femenino para regalo de mujer">🌸 Floral Dama</button>
      </div>

      <!-- Sommelier Results -->
      <div class="qx-somm-results-grid" id="qx_somm_results">
        <div style="text-align:center; padding:32px 16px; color:var(--qx-text-muted);">
          <div style="font-size:36px; margin-bottom:10px;">✨</div>
          <div style="font-size:15px; font-weight:700; color:#fff;">Escribe o selecciona una ocasión</div>
          <div style="font-size:13px; margin-top:4px;">Tu Sommelier personal analizará la pirámide olfativa y estela de cada pieza.</div>
        </div>
      </div>
    </div>
  </div>

  <!-- The Fragrance Wardrobe & Layering Alchemy Modal (Feature 2) -->
  <div class="qx-layering-backdrop" id="qx_layering_backdrop"></div>
  <div class="qx-layering-modal" id="qx_layering_modal" role="dialog" aria-modal="true" aria-labelledby="qx_layering_title">
    <div class="qx-layering-header">
      <div class="qx-layering-badge"><span>🧪</span> Atelier de Alquimia & Layering</div>
      <h2 class="qx-layering-title" id="qx_layering_title">Alquimia de Capas</h2>
      <p class="qx-layering-subtitle">Diseña tu firma olfativa única combinando dos fragancias complementarias.</p>
      <button type="button" class="qx-layering-close" id="qx_layering_close" aria-label="Cerrar Alquimia">&times;</button>
    </div>

    <div class="qx-layering-body">
      <!-- Dual Flacons Interactive Stage -->
      <div class="qx-layering-crucible">
        <canvas class="qx-fusion-canvas" id="qx_layering_fusion_canvas"></canvas>
        
        <!-- Base Bottle Card (Left) -->
        <div class="qx-flacon-card base" id="qx_layering_base_card">
          <div class="qx-flacon-role">🍾 Fragancia Base (Fijación)</div>
          <div class="qx-flacon-thumb-wrap">
            <img id="qx_base_img" class="qx-flacon-thumb" src="" alt="Fragancia Base">
          </div>
          <div class="qx-flacon-name" id="qx_base_name">Selecciona Base</div>
          <div class="qx-flacon-family" id="qx_base_family">Familia Olfativa</div>
          <div class="qx-flacon-price" id="qx_base_price">$ 0.00</div>
        </div>

        <!-- Swap / Fusion Center Node -->
        <div class="qx-crucible-center">
          <button type="button" class="qx-btn-swap-flacons" id="qx_btn_swap_layering" title="Intercambiar roles Base ⇄ Acento">
            <span>⇄</span>
          </button>
          <div class="qx-fusion-orb">⚡</div>
        </div>

        <!-- Accent Bottle Card (Right) -->
        <div class="qx-flacon-card accent" id="qx_layering_accent_card">
          <div class="qx-flacon-role">✨ Fragancia Acento (Salida)</div>
          <div class="qx-flacon-thumb-wrap">
            <img id="qx_accent_img" class="qx-flacon-thumb" src="" alt="Fragancia Acento">
          </div>
          <div class="qx-flacon-name" id="qx_accent_name">Selecciona Acento</div>
          <div class="qx-flacon-family" id="qx_accent_family">Familia Olfativa</div>
          <div class="qx-flacon-price" id="qx_accent_price">$ 0.00</div>
        </div>
      </div>

      <!-- Synergy Results Panel -->
      <div class="qx-layering-synergy-panel" id="qx_layering_synergy_panel">
        <div class="qx-synergy-top-row">
          <div class="qx-synergy-score-wrap">
            <div class="qx-synergy-score-val" id="qx_layering_score_val">96%</div>
            <div class="qx-synergy-score-lbl">Sinergia Alquímica</div>
          </div>
          <div class="qx-synergy-meta">
            <h3 class="qx-synergy-type" id="qx_layering_synergy_type">Contraste Magisterial</h3>
            <p class="qx-synergy-desc" id="qx_layering_synergy_desc">Cálida fijación de fondo realzada con acordes frescos de alta proyección.</p>
            <div class="qx-synergy-tags">
              <span class="qx-tag-item" id="qx_layering_occasion">🌙 Noches de Gala & Citas</span>
              <span class="qx-tag-item" id="qx_layering_longevity">⏱️ 12.0 Horas de Fijación</span>
              <span class="qx-tag-item" id="qx_layering_sillage">🔥 Modo Bestia (Nivel 4)</span>
            </div>
          </div>
        </div>

        <!-- Hybrid Olfactory Pyramid -->
        <div class="qx-hybrid-pyramid-box">
          <h4 class="qx-pyramid-title">Pirámide Olfativa Resultante</h4>
          <div class="qx-pyramid-levels">
            <div class="qx-pyramid-level top">
              <span class="lvl-label">Salida (Acento)</span>
              <span class="lvl-notes" id="qx_pyr_top">Bergamota Fresca, Manzana Crujiente</span>
            </div>
            <div class="qx-pyramid-level heart">
              <span class="lvl-label">Corazón (Armonía)</span>
              <span class="lvl-notes" id="qx_pyr_heart">Canela & Nuez Moscada, Lavanda Noble</span>
            </div>
            <div class="qx-pyramid-level base">
              <span class="lvl-label">Fondo (Fijación)</span>
              <span class="lvl-notes" id="qx_pyr_base">Ámbar Resinoso, Cedro de Virginia</span>
            </div>
          </div>
        </div>

        <!-- Duo Pack Bundle Purchase Box -->
        <div class="qx-layering-bundle-box">
          <div class="qx-bundle-pricing-row">
            <div class="qx-bundle-tag">🎁 Duo Pack Alquímico (15% OFF)</div>
            <div class="qx-bundle-prices">
              <span class="qx-bundle-old" id="qx_bundle_old_price">$ 751.68</span>
              <span class="qx-bundle-current" id="qx_bundle_current_price">$ 638.93 MXN</span>
              <span class="qx-bundle-savings" id="qx_bundle_savings">Ahorras $ 112.75</span>
            </div>
          </div>
          <div class="qx-bundle-actions">
            <button type="button" class="qx-btn-bundle-buy" id="qx_btn_buy_duo_pack">
              <span>⚡ Comprar Duo Pack (2 Frascos 100ml)</span>
            </button>
            <button type="button" class="qx-btn-bundle-decants" id="qx_btn_buy_duo_decants">
              <span>🧪 Probar Dueto Decants (5ml + 5ml) • <strong id="qx_decants_bundle_price">$ 306.00</strong></span>
            </button>
          </div>
        </div>
      </div>

      <!-- Suggested Companion Carousel -->
      <div class="qx-layering-companions-sec">
        <h4 class="qx-companions-title">Otras Fragancias Compatibles con esta Base</h4>
        <div class="qx-companions-scroll" id="qx_layering_companions_list">
          <!-- Dynamically populated -->
        </div>
      </div>
    </div>
  </div>

  <!-- Modal Comparador de Radares 1-vs-1 (Feature 3) -->
  <div class="qx-radar-compare-backdrop" id="qx_radar_compare_backdrop"></div>
  <div class="qx-radar-compare-modal" id="qx_radar_compare_modal" role="dialog" aria-modal="true" aria-labelledby="qx_compare_title">
    <div class="qx-compare-modal-header">
      <div class="qx-compare-modal-title" id="qx_compare_title">
        <span>⚔️ Comparador de Estela & Rendimiento Olfativo</span>
      </div>
      <button type="button" class="qx-btn-compare-close" id="qx_compare_close">✕</button>
    </div>
    <div class="qx-compare-modal-body">
      <div class="qx-compare-selectors-row">
        <div class="qx-compare-pill base">
          <span class="dot base"></span>
          <span id="qx_compare_base_name">Perfume A</span>
        </div>
        <span class="qx-compare-vs">VS</span>
        <div class="qx-compare-select-wrapper">
          <select id="qx_compare_rival_select" class="qx-compare-select">
            <!-- Populated dynamically -->
          </select>
        </div>
      </div>

      <div class="qx-compare-stage" id="qx_compare_stage">
        <svg id="qx_compare_radar_svg" class="qx-radar-svg" viewBox="-160 -150 320 300"></svg>
      </div>

      <div class="qx-compare-delta-matrix" id="qx_compare_delta_matrix">
        <!-- Dynamic Head-to-Head differences -->
      </div>

      <div class="qx-compare-actions">
        <button type="button" class="qx-btn-buy-duo-compare" id="btn_buy_duo_from_compare">
          <span>🎁 Comprar Ambos en Duo Pack (15% OFF)</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Boutique Story Viewer Modal (Fullscreen Reels) -->
  <div class="qx-story-viewer-modal" id="qx_story_viewer" style="display:none;">
    <div class="qx-story-stage-box">
      <div class="qx-story-progress-bar" id="qx_story_progress"></div>
      <div class="qx-story-header">
        <div class="qx-story-author">
          <img id="qx_story_avatar" src="<?php echo htmlspecialchars($tenant->logo ?: 'images/logo.png'); ?>" alt="Brand">
          <span id="qx_story_title">Boutique Reel</span>
        </div>
        <button type="button" class="qx-story-close" id="qx_story_close">&times;</button>
      </div>
      <div class="qx-story-media-stage" id="qx_story_media">
        <img id="qx_story_img" src="" alt="Story Slide">
      </div>
      <div class="qx-story-product-card" id="qx_story_product_tag" style="display:none;">
        <img id="qx_story_prod_thumb" class="qx-story-prod-thumb" src="" alt="">
        <div class="qx-story-prod-info">
          <div id="qx_story_prod_name" class="qx-story-prod-name">Nombre Producto</div>
          <div id="qx_story_prod_price" class="qx-story-prod-price">$ 0.00 MXN</div>
        </div>
        <button type="button" class="qx-btn-story-buy" id="qx_story_btn_buy">Comprar</button>
      </div>
    </div>
  </div>

  <!-- Universal Concierge Matchmaker Floating Pill & Wizard Modal -->
  <div class="qx-concierge-float-pill" id="qx_concierge_btn" title="Asistente de Selección Personalizada">
    <span>✨</span>
    <span>Matchmaker Concierge</span>
  </div>

  <div class="qx-quiz-backdrop" id="qx_quiz_backdrop"></div>
  <div class="qx-quiz-modal" id="qx_quiz_modal" role="dialog" aria-modal="true">
    <button type="button" class="qx-quiz-close" id="qx_quiz_close">&times;</button>
    
    <div class="qx-quiz-wizard" id="qx_quiz_wizard">
      <div class="qx-quiz-progress-track">
        <div class="qx-quiz-progress-bar" id="qx_quiz_bar" style="width:33%;"></div>
      </div>
      
      <div class="qx-quiz-step active" data-step="1">
        <h3 class="qx-quiz-question">¿Para qué ocasión o propósito buscas tu artículo?</h3>
        <div class="qx-quiz-options">
          <button type="button" class="qx-quiz-opt" data-val="diario">☀️ Uso Diario / Versátil</button>
          <button type="button" class="qx-quiz-opt" data-val="noche">🌙 Citas / Noche / Gala</button>
          <button type="button" class="qx-quiz-opt" data-val="regalo">🎁 Es un Regalo Especial</button>
          <button type="button" class="qx-quiz-opt" data-val="profesional">💼 Oficina / Negocios</button>
        </div>
      </div>

      <div class="qx-quiz-step" data-step="2">
        <h3 class="qx-quiz-question">¿Qué estilo o familia de notas prefieres?</h3>
        <div class="qx-quiz-options">
          <button type="button" class="qx-quiz-opt" data-val="fresco">🌊 Fresco / Cítrico / Marino</button>
          <button type="button" class="qx-quiz-opt" data-val="amaderado">🪵 Amaderado / Cedro / Vetiver</button>
          <button type="button" class="qx-quiz-opt" data-val="dulce">🍯 Dulce / Vainilla / Ámbar</button>
          <button type="button" class="qx-quiz-opt" data-val="intenso">👑 Intenso / Cuero / Oud Árabe</button>
        </div>
      </div>

      <div class="qx-quiz-step" data-step="3">
        <h3 class="qx-quiz-question">¿Qué rango o nivel de exclusividad buscas?</h3>
        <div class="qx-quiz-options">
          <button type="button" class="qx-quiz-opt" data-val="accesible">🏷️ Entrada / Best Seller</button>
          <button type="button" class="qx-quiz-opt" data-val="premium">⭐ Gama Media Alta</button>
          <button type="button" class="qx-quiz-opt" data-val="lujo">💎 Colección Privada / Alta Gama</button>
        </div>
      </div>

      <div class="qx-quiz-results" id="qx_quiz_results" style="display:none;">
        <div class="qx-quiz-results-header">
          <div style="font-size:32px; text-align:center; margin-bottom:8px;">✨</div>
          <h3 style="color:#fff; font-size:20px; font-weight:800; text-align:center;">Tus Matches Perfectos</h3>
          <p style="color:var(--qx-text-muted); font-size:13px; text-align:center;">Curados a tu medida por el Concierge Oficial</p>
        </div>
        <div class="qx-quiz-matches-grid" id="qx_quiz_matches"></div>
        <div style="text-align:center;">
          <button type="button" class="qx-btn-quiz-restart" id="qx_quiz_restart">↻ Probar de Nuevo</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Obsidian Lightbox 4K Modal Overlay -->
  <div class="qx-lightbox-overlay" id="qx_lightbox_overlay">
    <button type="button" class="qx-lightbox-close" id="qx_lightbox_close">&times;</button>
    
    <div class="qx-lightbox-canvas" id="qx_lightbox_canvas">
      <img id="qx_lightbox_img" class="qx-lightbox-img" src="" alt="4K Preview">
    </div>

    <div class="qx-lightbox-toolbar">
      <button type="button" class="qx-lightbox-btn" id="qx_lightbox_prev" title="Anterior (←)">◀</button>
      <span style="font-size:12px; font-weight:700; color:var(--qx-text-muted);" id="qx_lightbox_counter">1 / 1</span>
      <button type="button" class="qx-lightbox-btn" id="qx_lightbox_next" title="Siguiente (→)">▶</button>
      <span style="width:1px; height:16px; background:var(--qx-border);"></span>
      <button type="button" class="qx-lightbox-btn" id="qx_zoom_out" title="Reducir Zoom (-)">🔍-</button>
      <button type="button" class="qx-lightbox-btn" id="qx_zoom_reset" title="Restablecer (100%)">100%</button>
      <button type="button" class="qx-lightbox-btn" id="qx_zoom_in" title="Aumentar Zoom (+)">🔍+</button>
      <button type="button" class="qx-lightbox-btn" id="qx_zoom_rotate" title="Girar 90°">↻</button>
    </div>
  </div>

  <!-- Digital Decant Passport Modal (Feature 5: Blind-Buy Shield) -->
  <div class="qx-passport-backdrop" id="qx_passport_backdrop"></div>
  <div class="qx-passport-modal" id="qx_passport_modal" role="dialog" aria-modal="true" aria-labelledby="qx_passport_title">
    <div class="qx-passport-booklet-header">
      <div class="qx-passport-emblem">
        <span class="qx-passport-emblem-icon">🛡️</span>
        <div>
          <div class="qx-passport-sup">PASAPORTE DIGITAL DE CATA</div>
          <h2 class="qx-passport-title" id="qx_passport_title">Blind-Buy Shield Discovery</h2>
        </div>
      </div>
      <div class="qx-passport-header-right">
        <div class="qx-passport-tag">Coleccionista VIP</div>
        <button type="button" class="qx-passport-close" id="qx_passport_close" aria-label="Cerrar Pasaporte">&times;</button>
      </div>
    </div>

    <!-- Traveler Identity Bar -->
    <div class="qx-passport-id-bar">
      <div class="qx-pass-id-col">
        <span class="qx-pass-id-lbl">TITULAR</span>
        <span class="qx-pass-id-val" id="qx_pass_client_name">Alexander von Humboldt</span>
      </div>
      <div class="qx-pass-id-col">
        <span class="qx-pass-id-lbl">CÓDIGO DE ACCESO</span>
        <span class="qx-pass-id-val code" id="qx_pass_access_code">PASS-2026-VIP</span>
      </div>
      <div class="qx-pass-id-col">
        <span class="qx-pass-id-lbl">CRÉDITO VOUCHERS DISPONIBLE</span>
        <span class="qx-pass-id-val gold" id="qx_pass_total_credit">$ 150.00 MXN</span>
      </div>
    </div>

    <!-- Passport Stats Strip -->
    <div class="qx-passport-stats-strip">
      <div class="qx-pass-stat-item">
        <span class="qx-pass-stat-num" id="qx_pass_stat_total">2</span>
        <span class="qx-pass-stat-txt">Decants en Colección</span>
      </div>
      <div class="qx-pass-stat-item">
        <span class="qx-pass-stat-num green" id="qx_pass_stat_stamped">1</span>
        <span class="qx-pass-stat-txt">Sellos Estampados</span>
      </div>
      <div class="qx-pass-stat-item">
        <span class="qx-pass-stat-num amber" id="qx_pass_stat_pending">1</span>
        <span class="qx-pass-stat-txt">Catas Pendientes</span>
      </div>
    </div>

    <!-- Passport Tasting Entries Container -->
    <div class="qx-passport-entries-wrap" id="qx_passport_entries_container"></div>
  </div>

  <!-- Sensory Loyalty Vault & Olfactory Refill Club Modal (Feature 6) -->
  <div class="qx-vault-backdrop" id="qx_vault_backdrop"></div>
  <div class="qx-vault-modal" id="qx_vault_modal" role="dialog" aria-modal="true" aria-labelledby="qx_vault_title">
    <div class="qx-vault-booklet-header">
      <div class="qx-vault-emblem">
        <span class="qx-vault-emblem-icon">👑</span>
        <div>
          <div class="qx-vault-sup">BÓVEDA DE FIDELIDAD & CLUB DE RECARGAS</div>
          <h2 class="qx-vault-title" id="qx_vault_title">Sensory Loyalty Vault VIP</h2>
        </div>
      </div>
      <div class="qx-vault-header-right">
        <div class="qx-vault-tag" id="qx_vault_tier_tag">Connoisseur</div>
        <button type="button" class="qx-vault-close" id="qx_vault_close" aria-label="Cerrar Bóveda">&times;</button>
      </div>
    </div>

    <!-- Member Identity Bar -->
    <div class="qx-vault-id-bar">
      <div class="qx-vault-id-col">
        <span class="qx-vault-id-lbl">MIEMBRO TITULAR</span>
        <span class="qx-vault-id-val" id="qx_vault_client_name">Alexander von Humboldt</span>
      </div>
      <div class="qx-vault-id-col">
        <span class="qx-vault-id-lbl">CÓDIGO DE BÓVEDA</span>
        <span class="qx-vault-id-val code" id="qx_vault_access_code">VAULT-2026-VIP</span>
      </div>
      <div class="qx-vault-id-col">
        <span class="qx-vault-id-lbl">PUNTOS DE LEALTAD</span>
        <span class="qx-vault-id-val gold" id="qx_vault_points_val">250 PTS</span>
      </div>
      <div class="qx-vault-id-col">
        <span class="qx-vault-id-lbl">INICIALES GRABADO LÁSER</span>
        <span class="qx-vault-id-val cyan" id="qx_vault_initials_val">AVH</span>
      </div>
    </div>

    <!-- Tier Progression Strip -->
    <div class="qx-vault-tier-card">
      <div class="qx-vault-tier-header">
        <div class="qx-vault-tier-current">
          <span class="qx-tier-icon">🥈</span>
          <div>
            <div class="qx-tier-title" id="qx_vault_curr_tier">Nivel Actual: Connoisseur</div>
            <div class="qx-tier-sub" id="qx_vault_next_tier_desc">Faltan 2 frascos para ascender a <strong>Master Perfumer</strong></div>
          </div>
        </div>
        <div class="qx-vault-tier-metric" id="qx_vault_bottle_count">4 / 6 Frascos</div>
      </div>
      <div class="qx-vault-progress-track">
        <div class="qx-vault-progress-fill" id="qx_vault_progress_fill" style="width: 66%;"></div>
      </div>
      <div class="qx-vault-perks-row">
        <span class="qx-perk-badge active">🥉 Aficionado (Drops Anticipados)</span>
        <span class="qx-perk-badge active">🥈 Connoisseur (10% Cashback + Catas Privadas)</span>
        <span class="qx-perk-badge">🥇 Master Perfumer (Grabado Oro 24K + Concierge 24/7)</span>
      </div>
    </div>

    <!-- Navigation Tabs inside Vault: Suscripciones vs Recompensas -->
    <div class="qx-vault-tabs-nav">
      <button type="button" class="qx-vtab-btn active" id="qx_vtab_subs">🔄 Mis Recargas & Desgaste en Vivo</button>
      <button type="button" class="qx-vtab-btn" id="qx_vtab_rewards">🎁 Catálogo de Recompensas VIP</button>
    </div>

    <!-- Tab 1: Subscriptions & Depletion Meter -->
    <div class="qx-vault-tab-panel active" id="qx_vault_panel_subs">
      <div class="qx-vault-subscriptions-wrap" id="qx_vault_subscriptions_container"></div>
    </div>

    <!-- Tab 2: Rewards Catalog -->
    <div class="qx-vault-tab-panel" id="qx_vault_panel_rewards" style="display:none;">
      <div class="qx-vault-rewards-grid" id="qx_vault_rewards_container"></div>
    </div>
  </div>

  <!-- The Private Tasting Room & Live Virtual Sommelier Atelier Modal (Feature 7) -->
  <div class="qx-tasting-backdrop" id="qx_tasting_backdrop"></div>
  <div class="qx-tasting-modal" id="qx_tasting_modal" role="dialog" aria-modal="true" aria-labelledby="qx_tasting_title">
    <div class="qx-tasting-header">
      <div class="qx-tasting-emblem">
        <span class="qx-tasting-emblem-icon">🍷</span>
        <div>
          <div class="qx-tasting-sup">SALÓN PRIVADO DE ALTA PERFUMERÍA</div>
          <h2 class="qx-tasting-title" id="qx_tasting_title">The Private Tasting Room & Live Atelier</h2>
        </div>
      </div>
      <div class="qx-tasting-header-right">
        <div class="qx-somm-badge-tag" id="qx_somm_header_tag">Jean-Luc Moreau (Master Perfumer)</div>
        <button type="button" class="qx-tasting-close" id="qx_tasting_close" aria-label="Cerrar Sala">&times;</button>
      </div>
    </div>

    <div class="qx-tasting-body">
      <!-- VIEW 1: Reservation & Discovery Box Flow -->
      <div class="qx-tasting-view-booking" id="qx_tasting_view_booking">
        <div class="qx-tasting-banner">
          <span class="qx-tbanner-icon">💎</span>
          <div class="qx-tbanner-text">
            <strong>Masterclass Privada 1-a-1 de 20 Minutos</strong>
            <p>Incluye tu <em>Coffret Découverte (4x5ml)</em> con envío prioritario. El 100% de tu pago ($499 MXN) se bonifica íntegramente al adquirir tu frasco completo de 100ml.</p>
          </div>
        </div>

        <div class="qx-tbooking-grid">
          <!-- Step A: Slot Selection -->
          <div class="qx-tstep-card">
            <div class="qx-tstep-title">
              <span>📅</span> 1. Elige Fecha & Horario Disponible
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-size:12px; color:#94a3b8;">Horarios de cata (20 min):</span>
              <span style="font-size:11px; color:#c084fc; font-weight:700;" id="qx_tasting_curr_date_lbl">Hoy, 31 de Agosto</span>
            </div>
            <div class="qx-slots-container" id="qx_tasting_slots_container">
              <!-- Loaded dynamically via TastingRoomEngine -->
            </div>

            <div style="margin-top:20px;">
              <div class="qx-tstep-title">
                <span>📹</span> 2. Canal de Videollamada Preferido
              </div>
              <div class="qx-channel-options">
                <label class="qx-channel-pill selected" id="qx_lbl_chan_webrtc">
                  <input type="radio" name="qx_tasting_channel" value="WEBRTC" checked style="display:none;">
                  <span style="font-size:20px;">💻</span>
                  <div>
                    <strong>Sala In-App HD</strong>
                    <span>En tu navegador web</span>
                  </div>
                </label>
                <label class="qx-channel-pill" id="qx_lbl_chan_wa">
                  <input type="radio" name="qx_tasting_channel" value="WHATSAPP" style="display:none;">
                  <span style="font-size:20px;">💬</span>
                  <div>
                    <strong>WhatsApp VIP</strong>
                    <span>Llamada 1-a-1 directa</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <!-- Step B: Discovery Box & Client Info -->
          <div class="qx-tstep-card">
            <div class="qx-tstep-title">
              <span>🎁</span> 3. Discovery Tasting Box Asignada
            </div>
            <div class="qx-box-preview-card" id="qx_box_preview_card">
              <div class="qx-box-prev-header">
                <span class="qx-box-prev-title">Coffret Découverte: Joyas Orientales (4x5ml)</span>
                <span class="qx-box-prev-price">$ 499.00 MXN</span>
              </div>
              <span class="qx-box-cashback-badge">💎 100% Bonificable en Frasco 100ml</span>
              <p style="font-size:12px; color:#94a3b8; line-height:1.4; margin-bottom:6px;">
                Incluye 4 decants de 5ml de alta concentración, tiras olfativas de algodón egipcio y guía numerada.
              </p>
            </div>

            <div class="qx-tstep-title" style="margin-top:14px;">
              <span>👤</span> 4. Datos del Asistente
            </div>
            <form id="qx_tasting_booking_form" onsubmit="return false;">
              <div class="qx-tform-row">
                <input type="text" class="qx-tform-input" id="qx_tform_name" placeholder="Nombre Completo *" required value="Alexander von Humboldt">
                <input type="tel" class="qx-tform-input" id="qx_tform_phone" placeholder="Teléfono WhatsApp *" required value="+52 33 1825 9000">
              </div>
              <div class="qx-tform-row">
                <input type="email" class="qx-tform-input" id="qx_tform_email" placeholder="Correo Electrónico *" required value="alexander@humboldt-expeditions.org">
                <input type="text" class="qx-tform-input" id="qx_tform_city" placeholder="Ciudad / Estado" value="Guadalajara, JAL">
              </div>
              <input type="text" class="qx-tform-input" id="qx_tform_notes" placeholder="Tus acordes preferidos (ej. Acuático, Dulce, Maderas)">

              <button type="button" class="qx-btn-submit-tasting" id="qx_btn_submit_tasting_booking">
                🍷 Confirmar Reserva & Agendar Masterclass VIP
              </button>
            </form>

            <div style="text-align:center; margin-top:12px;">
              <button type="button" id="qx_btn_open_existing_session" style="background:none; border:none; color:#c084fc; font-size:12px; cursor:pointer; text-decoration:underline;">
                ¿Ya tienes un código de sesión? Ingresar a Sala en Vivo
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW 2: Live Tasting Room & Synchronized Scent Canvas -->
      <div class="qx-tasting-view-live" id="qx_tasting_view_live" style="display:none;">
        <!-- Identity & Status Bar -->
        <div class="qx-live-id-bar">
          <div class="qx-live-id-item">
            <span class="lbl">ASISTENTE:</span>
            <span class="val" id="qx_live_client_name">Alexander von Humboldt</span>
          </div>
          <div class="qx-live-id-item">
            <span class="lbl">CÓDIGO DE CATA:</span>
            <span class="val code" id="qx_live_session_code">TASTE-2026-VIP</span>
          </div>
          <div class="qx-live-id-item">
            <span class="lbl">ESTUCHE DISCOVERY:</span>
            <span class="val gold" id="qx_live_box_status">Entregado 📦</span>
          </div>
          <div class="qx-live-id-item">
            <span class="lbl">BONIFICACIÓN DISPONIBLE:</span>
            <span class="val gold" id="qx_live_voucher_val">$ 499.00 MXN</span>
          </div>
        </div>

        <!-- Dual Viewport -->
        <div class="qx-tasting-dual-viewport">
          <!-- Left: Live Sommelier Stream -->
          <div class="qx-somm-stream-card">
            <div class="qx-video-frame">
              <div class="qx-live-badge">
                <span class="qx-live-red-dot"></span>
                <span>● EN DIRECTO</span>
              </div>
              <div class="qx-somm-avatar-circle" id="qx_somm_avatar_circle">
                👨🏻‍💼
              </div>
              <canvas class="qx-audio-visualizer-canvas" id="qx_somm_audio_canvas"></canvas>
            </div>

            <div class="qx-somm-meta-box">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div class="qx-somm-name">Jean-Luc Moreau</div>
                  <div class="qx-somm-role">Master Perfumer & Chief Sommelier</div>
                </div>
                <span style="font-size:11px; color:#10b981; font-weight:800;">🎙️ Audio HD Activo</span>
              </div>

              <div class="qx-video-controls">
                <button type="button" class="qx-vctrl-btn active" id="qx_vctrl_mic">🎤 Micrófono</button>
                <button type="button" class="qx-vctrl-btn active" id="qx_vctrl_cam">📹 Cámara</button>
                <button type="button" class="qx-vctrl-btn" id="qx_vctrl_switch_view">🔄 Cambiar Vista</button>
              </div>
            </div>
          </div>

          <!-- Right: Synchronized Scent Canvas -->
          <div class="qx-synced-canvas-card" id="qx_synced_canvas">
            <div>
              <div class="qx-canvas-header">
                <div class="qx-canvas-tag">
                  <span>📡</span>
                  <span>Lienzo Olfativo Sincronizado en Tiempo Real</span>
                </div>
                <span style="font-size:11px; color:#94a3b8; font-family:monospace;" id="qx_synced_event_id">EVT #01</span>
              </div>

              <div class="qx-canvas-body">
                <div class="qx-canvas-flacon-box">
                  <img class="qx-canvas-flacon-img" id="qx_synced_flacon_img" src="" alt="Frasco Proyectado">
                </div>
                <div class="qx-canvas-info">
                  <h3 class="qx-canvas-title" id="qx_synced_title">Rasasi Hawas for Him Eau de Parfum</h3>
                  <div class="qx-canvas-note-strip" id="qx_synced_notes_wrap">
                    <span class="qx-cnote-pill">🍏 Manzana Italiana</span>
                    <span class="qx-cnote-pill">🌊 Acorde Marino</span>
                    <span class="qx-cnote-pill">🪵 Ámbar Gris</span>
                  </div>
                  <p style="font-size:12px; color:#cbd5e1; line-height:1.4;" id="qx_synced_desc">
                    Fragancia fresca y magnética con proyección molecular de alto impacto en climas cálidos y templados.
                  </p>
                </div>
              </div>

              <!-- Sommelier Live Commentary Note -->
              <div class="qx-somm-commentary-card">
                <div class="qx-scomm-lbl">Comentario en Vivo del Sommelier:</div>
                <div class="qx-scomm-txt" id="qx_synced_somm_note">
                  "Presta atención al secado amaderado tras los primeros 15 minutos en tu piel."
                </div>
              </div>

              <!-- Synchronized Interactive Triggers -->
              <div class="qx-canvas-interactive-bar">
                <button type="button" class="qx-btn-canvas-action" id="qx_btn_synced_radar">
                  📊 Proyectar Radar Hexagonal
                </button>
                <button type="button" class="qx-btn-canvas-action" id="qx_btn_synced_layering">
                  🧪 Probar Alquimia de Capas
                </button>
              </div>
            </div>

            <!-- Live Room Footer Actions -->
            <div class="qx-live-footer-actions">
              <button type="button" class="qx-btn-upgrade-voucher" id="qx_btn_live_upgrade_bottle">
                🏆 Adquirir Frasco 100ml (-$499.00 BONIFICADO)
              </button>
              <a href="#" target="_blank" class="qx-btn-wa-live" id="qx_btn_live_wa_link">
                💬 WhatsApp Concierge
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Toast Notification -->
  <div class="qx-toast" id="qx_toast"></div>

  <!-- Footer -->
  <footer style="border-top:1px solid var(--qx-border); padding:28px; text-align:center; color:var(--qx-text-dim); font-size:12px; margin-top:auto;">
    <div>&copy; <?php echo date('Y'); ?> <?php echo htmlspecialchars($tenant->brandName); ?>. Todos los derechos reservados.</div>
    <div style="margin-top:4px;">Powered by <strong>Quantix Storefront Showroom</strong> & <strong>Evinux Engine</strong></div>
  </footer>

  <!-- WhatsApp Concierge Float Button -->
  <?php if ($tenant->showWhatsapp && !empty($tenant->whatsappPhone)): ?>
    <?php
      $waUrl = "https://wa.me/" . urlencode(preg_replace('/[^0-9]/', '', $tenant->whatsappPhone)) . "?text=" . urlencode($tenant->whatsappGreeting);
    ?>
    <a href="<?php echo htmlspecialchars($waUrl); ?>" target="_blank" class="qx-whatsapp-float" title="Atención VIP WhatsApp" style="position:fixed; bottom:24px; left:24px; background:#25D366; color:#fff; width:52px; height:52px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:26px; box-shadow:0 8px 24px rgba(37,211,102,0.4); z-index:9999; text-decoration:none; transition:transform 0.2s ease;">
      💬
    </a>
  <?php endif; ?>

  <!-- Floating Glass Bottom Navigation Dock (Mobile Only) -->
  <nav class="qx-mobile-dock" id="qx_mobile_dock">
    <button type="button" class="qx-dock-item active" id="qx_dock_home" aria-label="Inicio">
      <span class="qx-dock-icon">🏠</span>
      <span class="qx-dock-label">Inicio</span>
    </button>
    <button type="button" class="qx-dock-item" id="qx_dock_tasting" aria-label="Cata Virtual">
      <span class="qx-dock-icon">🍷</span>
      <span class="qx-dock-label">Cata VIP</span>
    </button>
    <button type="button" class="qx-dock-item" id="qx_dock_vault" aria-label="Bóveda VIP">
      <span class="qx-dock-icon">👑</span>
      <span class="qx-dock-label">Bóveda</span>
    </button>
    <button type="button" class="qx-dock-item" id="qx_dock_passport" aria-label="Pasaporte de Cata">
      <span class="qx-dock-icon">🛡️</span>
      <span class="qx-dock-label">Pasaporte</span>
    </button>
    <button type="button" class="qx-dock-item highlight" id="qx_dock_concierge" aria-label="Concierge Quiz">
      <span class="qx-dock-icon">✨</span>
      <span class="qx-dock-label">Concierge</span>
    </button>
    <button type="button" class="qx-dock-item" id="qx_dock_layering" aria-label="Alquimia de Capas">
      <span class="qx-dock-icon">🧪</span>
      <span class="qx-dock-label">Alquimia</span>
    </button>
    <button type="button" class="qx-dock-item" id="qx_dock_cart" aria-label="Bolsa de Compras">
      <span class="qx-dock-icon-wrap">
        <span class="qx-dock-icon">🛍️</span>
        <span class="qx-dock-badge" id="qx_dock_cart_badge">0</span>
      </span>
      <span class="qx-dock-label">Bolsa</span>
    </button>
  </nav>

  <script src="js/storefront_app.js?v=20260831_01"></script>
</body>
</html>
