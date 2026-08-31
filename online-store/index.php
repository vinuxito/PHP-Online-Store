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

      <div class="qx-nav-search">
        <span class="qx-search-icon">🔍</span>
        <input type="text" id="qx_search_input" class="qx-search-input" placeholder="Buscar por nombre, código o SKU... (⌘K)" autocomplete="off">
      </div>

      <div class="qx-nav-actions">
        <button type="button" class="qx-cart-btn" id="qx_cart_btn">
          <span>🛍️</span>
          <span>Carrito</span>
          <span class="qx-cart-badge" id="qx_cart_badge">0</span>
        </button>
      </div>
    </div>
  </header>

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

    <!-- Category Filter Pills -->
    <nav class="qx-categories-bar" id="qx_categories_bar"></nav>
  </section>

  <!-- Main Product Showroom Grid -->
  <main class="qx-main-container">
    <div class="qx-grid" id="qx_product_grid"></div>
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
        <span>Total a Pagar (MXN)</span>
        <span id="qx_cart_total">$ 0.00</span>
      </div>
      <button type="button" class="qx-btn-checkout" id="qx_btn_proceed_checkout">Proceder al Pago &rarr;</button>
    </div>
  </aside>

  <!-- Checkout & CFDI 4.0 Invoicing Drawer -->
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

      <!-- CFDI 4.0 Native Invoicing Gate -->
      <div class="qx-cfdi-card">
        <label class="qx-cfdi-toggle">
          <input type="checkbox" id="qx_require_cfdi">
          <span>🏛️ ¿Requieres Factura Fiscal Electrónica (CFDI 4.0)?</span>
        </label>

        <div id="qx_cfdi_fields" style="display:none; margin-top:14px;">
          <div class="qx-form-group">
            <label class="qx-form-label">RFC Receptor *</label>
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
            <select class="qx-form-select" id="qx_cfdi_regimen">
              <option value="601">601 — General de Ley Personas Morales</option>
              <option value="612">612 — Personas Físicas con Actividades Empresariales</option>
              <option value="626">626 — Régimen Simplificado de Confianza (RESICO)</option>
              <option value="605">605 — Sueldos y Salarios e Ingresos Asimilados</option>
              <option value="616" selected>616 — Sin obligaciones fiscales</option>
            </select>
          </div>
          <div class="qx-form-group">
            <label class="qx-form-label">Uso de CFDI</label>
            <select class="qx-form-select" id="qx_cfdi_uso">
              <option value="G01">G01 — Adquisición de mercancías</option>
              <option value="G03" selected>G03 — Gastos en general</option>
              <option value="S01">S01 — Sin efectos fiscales</option>
              <option value="CP01">CP01 — Pagos</option>
            </select>
          </div>
        </div>
      </div>

      <div style="margin-top:auto; padding-top:16px;">
        <button type="submit" class="qx-btn-checkout" id="qx_btn_place_order">Confirmar y Pagar Orden &rarr;</button>
      </div>
    </form>
  </aside>

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

  <script src="js/storefront_app.js?v=20260830_01"></script>
</body>
</html>
