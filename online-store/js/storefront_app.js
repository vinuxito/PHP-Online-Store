/**
 * js/storefront_app.js — Quantix Storefront Luxury Showroom Engine
 */

(function(window, $) {
  'use strict';

  class QuantixStorefront {
    constructor() {
      this.tenant = null;
      this.products = [];
      this.filteredProducts = [];
      this.activeCategory = 'ALL';
      this.searchQuery = '';
      this.cart = this.loadCart();
      
      // Lightbox State
      this.lightboxPhotos = [];
      this.lightboxIndex = 0;
      this.zoomScale = 1;
      this.zoomRotation = 0;
      this.isPanning = false;
      this.panStartX = 0;
      this.panStartY = 0;
      this.panCurrentX = 0;
      this.panCurrentY = 0;

      this.init();
    }

    init() {
      this.bindGlobalEvents();
      this.loadCatalog();
      this.renderCartUI();
    }

    loadCart() {
      try {
        const stored = localStorage.getItem('qx_store_cart');
        return stored ? JSON.parse(stored) : { items: [] };
      } catch (e) {
        return { items: [] };
      }
    }

    saveCart() {
      try {
        localStorage.setItem('qx_store_cart', JSON.stringify(this.cart));
      } catch (e) {}
      this.renderCartUI();
    }

    bindGlobalEvents() {
      const self = this;

      // Omnibox Search
      $('#qx_search_input').on('input', function() {
        self.searchQuery = $(this).val().toLowerCase().trim();
        self.applyFilters();
      });

      // Keyboard Shortcut ⌘K / Ctrl+K
      $(document).on('keydown', function(e) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          $('#qx_search_input').focus().select();
        } else if (e.key === 'Escape') {
          self.closeAllDrawers();
          self.closeLightbox();
        }
      });

      // Cart Drawer Toggle
      $('#qx_cart_btn').on('click', () => self.openCart());
      $('#qx_cart_close, #qx_cart_backdrop').on('click', () => self.closeCart());

      // Checkout Drawer Toggle
      $('#qx_btn_proceed_checkout').on('click', () => {
        self.closeCart();
        self.openCheckout();
      });
      $('#qx_checkout_close, #qx_checkout_backdrop').on('click', () => self.closeCheckout());

      // CFDI 4.0 Checkbox Toggle
      $('#qx_require_cfdi').on('change', function() {
        if ($(this).is(':checked')) {
          $('#qx_cfdi_fields').slideDown(200);
        } else {
          $('#qx_cfdi_fields').slideUp(200);
        }
      });

      // Order Submit Form
      $('#qx_checkout_form').on('submit', function(e) {
        e.preventDefault();
        self.submitOrder();
      });

      // Lightbox Controls
      $('#qx_lightbox_close, #qx_lightbox_overlay').on('click', function(e) {
        if (e.target === this || $(e.target).hasClass('qx-lightbox-close')) {
          self.closeLightbox();
        }
      });
      $('#qx_zoom_in').on('click', () => self.adjustZoom(0.3));
      $('#qx_zoom_out').on('click', () => self.adjustZoom(-0.3));
      $('#qx_zoom_reset').on('click', () => self.resetZoom());
      $('#qx_zoom_rotate').on('click', () => self.rotateZoom());
      $('#qx_lightbox_prev').on('click', () => self.navigateLightbox(-1));
      $('#qx_lightbox_next').on('click', () => self.navigateLightbox(1));
    }

    loadCatalog() {
      const self = this;
      const urlParams = new URLSearchParams(window.location.search);
      const apiUrl = 'api/catalog.php?' + urlParams.toString();

      $('#qx_product_grid').html('<div style="grid-column:1/-1; text-align:center; padding:60px 0; color:var(--qx-text-muted)">Cargando catálogo exclusivo...</div>');

      $.getJSON(apiUrl)
        .done(function(resp) {
          if (resp.Status === 'OK') {
            self.tenant = resp.Tenant;
            self.products = resp.Products || [];
            self.renderCategories(resp.Categories || []);
            self.applyFilters();
          } else {
            $('#qx_product_grid').html(`<div style="grid-column:1/-1; text-align:center; padding:60px 0; color:var(--qx-rose)">Error: ${resp.Error || 'No se pudo cargar el catálogo'}</div>`);
          }
        })
        .fail(function(xhr) {
          $('#qx_product_grid').html('<div style="grid-column:1/-1; text-align:center; padding:60px 0; color:var(--qx-rose)">Error al conectar con la tienda.</div>');
        });
    }

    renderCategories(categories) {
      const self = this;
      const bar = $('#qx_categories_bar');
      bar.empty();

      bar.append(`<button type="button" class="qx-cat-pill active" data-cat="ALL">✦ Todos (${this.products.length})</button>`);
      categories.forEach(cat => {
        const count = this.products.filter(p => p.category === cat).length;
        bar.append(`<button type="button" class="qx-cat-pill" data-cat="${self.esc(cat)}">${self.esc(cat)} (${count})</button>`);
      });

      bar.find('.qx-cat-pill').on('click', function() {
        bar.find('.qx-cat-pill').removeClass('active');
        $(this).addClass('active');
        self.activeCategory = $(this).data('cat');
        self.applyFilters();
      });
    }

    applyFilters() {
      const q = this.searchQuery;
      const cat = this.activeCategory;

      this.filteredProducts = this.products.filter(p => {
        const matchCat = (cat === 'ALL' || p.category === cat);
        const matchQ = !q || (
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.code && p.code.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q))
        );
        return matchCat && matchQ;
      });

      this.renderGrid();
    }

    renderGrid() {
      const self = this;
      const grid = $('#qx_product_grid');
      grid.empty();

      if (this.filteredProducts.length === 0) {
        grid.html('<div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--qx-text-muted)">No se encontraron productos coincidentes.</div>');
        return;
      }

      this.filteredProducts.forEach(p => {
        const card = self.createCardElement(p);
        grid.append(card);
      });
    }

    createCardElement(p) {
      const self = this;
      const card = $('<div class="qx-card"></div>');
      const photos = p.photos && p.photos.length ? p.photos : [{ thumb: p.cover, url: p.cover }];
      const initialPhoto = photos[0].thumb || photos[0].url;

      // Media Stage
      const media = $(`
        <div class="qx-card-media" title="Haz clic para Quick Look 4K">
          <img class="qx-card-img" src="${self.esc(initialPhoto)}" alt="${self.esc(p.name)}">
          <div class="qx-card-zoom-badge">🔍 Zoom 4K</div>
        </div>
      `);

      // Hover-Scrub Filmstrip Dots
      if (photos.length > 1) {
        const scrubBar = $('<div class="qx-card-scrub-bar"></div>');
        photos.forEach((photo, idx) => {
          const dot = $(`<div class="qx-scrub-dot ${idx === 0 ? 'active' : ''}" data-idx="${idx}"></div>`);
          dot.on('mouseenter click', function(e) {
            e.stopPropagation();
            scrubBar.find('.qx-scrub-dot').removeClass('active');
            $(this).addClass('active');
            media.find('.qx-card-img').attr('src', photo.thumb || photo.url);
          });
          scrubBar.append(dot);
        });
        media.append(scrubBar);
      }

      // Click on image opens Lightbox
      media.on('click', () => {
        self.openLightbox(photos, 0);
      });

      // Card Content
      const body = $(`
        <div class="qx-card-body">
          <div class="qx-card-meta">
            <span class="qx-card-category">${self.esc(p.category || 'General')}</span>
            ${p.sku ? `<span class="qx-card-sku">SKU: ${self.esc(p.sku)}</span>` : ''}
          </div>
          <div class="qx-card-title" title="${self.esc(p.name)}">${self.esc(p.name)}</div>
          <div class="qx-card-footer">
            <div class="qx-card-price-block">
              <span class="qx-card-price">$ ${self.formatMoney(p.priceWithTax)}</span>
              <span class="qx-card-tax">+ IVA 16% incluido</span>
            </div>
            <button type="button" class="qx-btn-add-cart">
              <span>+</span> Agregar
            </button>
          </div>
        </div>
      `);

      body.find('.qx-btn-add-cart').on('click', (e) => {
        e.stopPropagation();
        self.addToCart(p);
      });

      card.append(media).append(body);
      return card;
    }

    addToCart(product, qty = 1) {
      const existing = this.cart.items.find(item => item.id === product.id);
      if (existing) {
        existing.qty += qty;
      } else {
        this.cart.items.push({
          id: product.id,
          code: product.code,
          sku: product.sku,
          name: product.name,
          thumb: product.cover,
          unitPrice: product.unitPrice,
          vatRate: product.vatRate,
          priceWithTax: product.priceWithTax,
          qty: qty
        });
      }
      this.saveCart();
      this.showToast(`✔ ${product.name} agregado al carrito`);
      this.openCart();
    }

    updateCartItemQty(id, delta) {
      const item = this.cart.items.find(i => i.id === id);
      if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
          this.cart.items = this.cart.items.filter(i => i.id !== id);
        }
        this.saveCart();
      }
    }

    removeCartItem(id) {
      this.cart.items = this.cart.items.filter(i => i.id !== id);
      this.saveCart();
    }

    renderCartUI() {
      const self = this;
      const list = $('#qx_cart_list');
      const badge = $('#qx_cart_badge');
      const totalCount = this.cart.items.reduce((sum, i) => sum + i.qty, 0);

      badge.text(totalCount);

      if (this.cart.items.length === 0) {
        list.html(`
          <div class="qx-cart-empty">
            <div style="font-size:38px; margin-bottom:12px">🛍️</div>
            <div style="font-weight:700; color:#fff; margin-bottom:6px">Tu carrito está vacío</div>
            <div style="font-size:13px">Explora el catálogo y agrega tus productos favoritos.</div>
          </div>
        `);
        $('#qx_cart_subtotal').text('$ 0.00');
        $('#qx_cart_iva').text('$ 0.00');
        $('#qx_cart_total').text('$ 0.00');
        $('#qx_btn_proceed_checkout').prop('disabled', true).css('opacity', '0.5');
        return;
      }

      list.empty();
      let subtotal = 0;
      let totalIva = 0;

      this.cart.items.forEach(item => {
        const itemSubtotal = item.unitPrice * item.qty;
        const itemIva = itemSubtotal * (item.vatRate / 100);
        subtotal += itemSubtotal;
        totalIva += itemIva;

        const row = $(`
          <div class="qx-cart-item">
            <img class="qx-cart-item-img" src="${self.esc(item.thumb)}" alt="">
            <div class="qx-cart-item-info">
              <div class="qx-cart-item-name">${self.esc(item.name)}</div>
              <div class="qx-cart-item-price">$ ${self.formatMoney(item.priceWithTax)} c/u</div>
            </div>
            <div class="qx-cart-stepper">
              <button type="button" class="qx-step-btn btn-dec">-</button>
              <span style="font-size:12px; font-weight:700">${item.qty}</span>
              <button type="button" class="qx-step-btn btn-inc">+</button>
            </div>
          </div>
        `);

        row.find('.btn-dec').on('click', () => self.updateCartItemQty(item.id, -1));
        row.find('.btn-inc').on('click', () => self.updateCartItemQty(item.id, 1));
        list.append(row);
      });

      const grandTotal = subtotal + totalIva;
      $('#qx_cart_subtotal').text(`$ ${self.formatMoney(subtotal)}`);
      $('#qx_cart_iva').text(`$ ${self.formatMoney(totalIva)}`);
      $('#qx_cart_total').text(`$ ${self.formatMoney(grandTotal)}`);
      $('#qx_btn_proceed_checkout').prop('disabled', false).css('opacity', '1');
    }

    openCart() {
      $('#qx_cart_backdrop').addClass('active');
      $('#qx_cart_drawer').addClass('active');
    }

    closeCart() {
      $('#qx_cart_backdrop').removeClass('active');
      $('#qx_cart_drawer').removeClass('active');
    }

    openCheckout() {
      $('#qx_checkout_backdrop').addClass('active');
      $('#qx_checkout_drawer').addClass('active');
      this.renderCheckoutSummary();
    }

    closeCheckout() {
      $('#qx_checkout_backdrop').removeClass('active');
      $('#qx_checkout_drawer').removeClass('active');
    }

    closeAllDrawers() {
      this.closeCart();
      this.closeCheckout();
    }

    renderCheckoutSummary() {
      const subtotal = this.cart.items.reduce((s, i) => s + (i.unitPrice * i.qty), 0);
      const iva = this.cart.items.reduce((s, i) => s + (i.unitPrice * i.qty * (i.vatRate / 100)), 0);
      const total = subtotal + iva;

      $('#qx_checkout_summary').html(`
        <div style="font-size:13px; color:var(--qx-text-muted); margin-bottom:6px">${this.cart.items.length} producto(s) en tu orden</div>
        <div style="font-size:20px; font-weight:800; color:#fff">$ ${this.formatMoney(total)} MXN</div>
      `);
    }

    submitOrder() {
      const self = this;
      const submitBtn = $('#qx_btn_place_order');
      submitBtn.prop('disabled', true).text('Procesando Pedido...');

      const orderData = {
        emisorId: this.tenant ? this.tenant.emisorId : '58',
        customerName: $('#qx_cust_name').val(),
        customerEmail: $('#qx_cust_email').val(),
        customerPhone: $('#qx_cust_phone').val(),
        shippingAddress: $('#qx_cust_address').val(),
        paymentMethod: $('input[name="qx_payment_method"]:checked').val() || 'SPEI',
        requireCfdi: $('#qx_require_cfdi').is(':checked'),
        rfc: $('#qx_cfdi_rfc').val(),
        razonSocial: $('#qx_cfdi_razon').val(),
        cp: $('#qx_cfdi_cp').val(),
        regimen: $('#qx_cfdi_regimen').val(),
        usoCfdi: $('#qx_cfdi_uso').val(),
        items: this.cart.items
      };

      $.ajax({
        url: 'api/order.php',
        method: 'POST',
        data: JSON.stringify(orderData),
        contentType: 'application/json',
        dataType: 'json'
      })
      .done(function(resp) {
        if (resp.Status === 'OK') {
          self.cart.items = [];
          self.saveCart();
          self.closeCheckout();
          self.showOrderSuccessModal(resp);
        } else {
          alert('Error al procesar pedido: ' + (resp.Error || 'Intente nuevamente'));
          submitBtn.prop('disabled', false).text('Confirmar y Pagar Orden');
        }
      })
      .fail(function() {
        alert('Error de conexión al procesar la orden.');
        submitBtn.prop('disabled', false).text('Confirmar y Pagar Orden');
      });
    }

    showOrderSuccessModal(orderResp) {
      const modal = $(`
        <div style="position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:39999; display:flex; align-items:center; justify-content:center; padding:20px;">
          <div style="background:var(--qx-surface); border:1px solid var(--qx-border); border-radius:var(--qx-radius-lg); max-width:500px; width:100%; padding:32px; text-align:center; box-shadow:0 20px 50px rgba(0,0,0,0.7);">
            <div style="font-size:48px; margin-bottom:12px">🎉</div>
            <h2 style="font-size:22px; font-weight:800; color:#fff; margin-bottom:8px">¡Pedido Confirmado!</h2>
            <p style="font-size:14px; color:var(--qx-text-muted); margin-bottom:20px">Folio de Orden: <strong style="color:var(--qx-accent)">#${orderResp.OrderFolio || '1001'}</strong></p>
            <div style="background:rgba(255,255,255,0.04); border:1px solid var(--qx-border); border-radius:var(--qx-radius-md); padding:16px; text-align:left; font-size:13px; margin-bottom:24px;">
              <div><strong>Cliente:</strong> ${this.esc(orderResp.CustomerName || '')}</div>
              <div><strong>Total:</strong> $ ${this.formatMoney(orderResp.Total || 0)} MXN</div>
              <div><strong>Método:</strong> ${this.esc(orderResp.PaymentMethod || '')}</div>
              ${orderResp.CfdiStatus ? `<div style="margin-top:8px; color:var(--qx-emerald)">✔ Factura Fiscal CFDI 4.0 timbrada con éxito</div>` : ''}
            </div>
            <button type="button" class="qx-btn-checkout" id="qx_btn_finish_success">Entendido, Volver a la Tienda</button>
          </div>
        </div>
      `);

      modal.find('#qx_btn_finish_success').on('click', () => modal.remove());
      $('body').append(modal);
    }

    // Lightbox 4K Engine
    openLightbox(photos, index) {
      this.lightboxPhotos = photos;
      this.lightboxIndex = index || 0;
      this.resetZoom();
      this.updateLightboxImage();
      $('#qx_lightbox_overlay').addClass('active');
    }

    closeLightbox() {
      $('#qx_lightbox_overlay').removeClass('active');
    }

    navigateLightbox(delta) {
      if (!this.lightboxPhotos.length) return;
      this.lightboxIndex = (this.lightboxIndex + delta + this.lightboxPhotos.length) % this.lightboxPhotos.length;
      this.resetZoom();
      this.updateLightboxImage();
    }

    updateLightboxImage() {
      const p = this.lightboxPhotos[this.lightboxIndex];
      if (p) {
        $('#qx_lightbox_img').attr('src', p.url || p.thumb);
        $('#qx_lightbox_counter').text(`${this.lightboxIndex + 1} / ${this.lightboxPhotos.length}`);
      }
    }

    adjustZoom(delta) {
      this.zoomScale = Math.max(0.5, Math.min(5, this.zoomScale + delta));
      this.applyImageTransform();
    }

    rotateZoom() {
      this.zoomRotation = (this.zoomRotation + 90) % 360;
      this.applyImageTransform();
    }

    resetZoom() {
      this.zoomScale = 1;
      this.zoomRotation = 0;
      this.panCurrentX = 0;
      this.panCurrentY = 0;
      this.applyImageTransform();
    }

    applyImageTransform() {
      $('#qx_lightbox_img').css({
        transform: `translate(${this.panCurrentX}px, ${this.panCurrentY}px) scale(${this.zoomScale}) rotate(${this.zoomRotation}deg)`
      });
    }

    showToast(msg) {
      const toast = $('#qx_toast');
      toast.text(msg).addClass('active');
      setTimeout(() => toast.removeClass('active'), 2600);
    }

    formatMoney(amount) {
      return (parseFloat(amount) || 0).toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    esc(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }

  $(function() {
    window.quantixStore = new QuantixStorefront();
  });

})(window, jQuery);
