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

    <div class="qx-cart-footer">
      <div class="qx-summary-row">
        <span>Subtotal</span>
        <span id="qx_cart_subtotal">$ 0.00</span>
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
      <!-- Left Column: Gallery with Touch-Swipeable Track & Dots -->
      <div class="qx-pmodal-gallery">
        <div class="qx-pmodal-stage" id="qx_pmodal_stage">
          <div class="qx-pmodal-swipe-track" id="qx_pmodal_swipe_track">
            <img id="qx_pmodal_main_img" src="" alt="Vista previa del producto">
          </div>
          <span class="qx-pmodal-badge" id="qx_pmodal_badge" style="display:none;">★ Edición Destacada</span>
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

        <!-- Adaptive Spec Matrix & Performance Indicators -->
        <div class="qx-pmodal-section">
          <h3 class="qx-pmodal-sec-title">Especificaciones & Detalles</h3>
          <div id="qx_pmodal_adaptive_specs"></div>
          <div class="qx-pmodal-desc" id="qx_pmodal_desc" style="margin-top:6px;">Descripción detallada...</div>
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
    <button type="button" class="qx-dock-item" id="qx_dock_search" aria-label="Buscar">
      <span class="qx-dock-icon">🔍</span>
      <span class="qx-dock-label">Buscar</span>
    </button>
    <button type="button" class="qx-dock-item highlight" id="qx_dock_concierge" aria-label="Concierge Quiz">
      <span class="qx-dock-icon">✨</span>
      <span class="qx-dock-label">Concierge</span>
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
