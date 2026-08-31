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

      // Product Modal State
      this.activeProductModal = null;
      this.pmodalQty = 1;

      // Spotlight State
      this.spotlightActiveIdx = 0;

      // Stories State
      this.stories = [];
      this.activeStory = null;
      this.activeSlideIdx = 0;
      this.storyTimer = null;

      // Quiz State
      this.quizAnswers = {};
      this.quizStep = 1;

      this.init();
    }

    init() {
      this.bindGlobalEvents();
      this.loadCatalog();
      this.renderCartUI();
      
      const savedView = localStorage.getItem('qx_catalog_view') || '2col';
      this.setCatalogView(savedView);
    }

    playHaptic(type = 'light') {
      try {
        if ('vibrate' in navigator) {
          if (type === 'light') {
            navigator.vibrate(10);
          } else if (type === 'medium') {
            navigator.vibrate(18);
          } else if (type === 'success') {
            navigator.vibrate([15, 40, 20]);
          } else if (type === 'heavy') {
            navigator.vibrate(35);
          }
        }
      } catch (e) {}
    }

    setCatalogView(view) {
      $('#qx_view_switcher .qx-view-btn').removeClass('active');
      $(`#qx_view_${view}`).addClass('active');
      $('#qx_product_grid').removeClass('view-2col view-1col').addClass(`view-${view}`);
      try {
        localStorage.setItem('qx_catalog_view', view);
      } catch (e) {}
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

      // Omnibox Search Trigger & Spotlight
      $('#qx_search_input, #qx_nav_search_trigger').on('click focus', function(e) {
        e.preventDefault();
        self.openSpotlight();
      });

      // Spotlight Input
      $('#qx_spotlight_input').on('input', function() {
        self.spotlightActiveIdx = 0;
        self.renderSpotlightResults($(this).val());
      });

      $('#qx_spotlight_backdrop').on('click', () => self.closeSpotlight());

      // Keyboard Shortcut ⌘K / Ctrl+K & Spotlight Arrow Navigation
      $(document).on('keydown', function(e) {
        const isSpotlightActive = $('#qx_spotlight_modal').hasClass('active');

        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          if (isSpotlightActive) {
            self.closeSpotlight();
          } else {
            self.openSpotlight();
          }
        } else if (e.key === 'Escape') {
          self.closeAllDrawers();
          self.closeLightbox();
          self.closeProductModal();
          self.closeSpotlight();
          self.closeStory();
          self.closeQuiz();
        } else if (isSpotlightActive) {
          const items = $('#qx_spotlight_results .qx-spotlight-item');
          if (items.length === 0) return;

          if (e.key === 'ArrowDown') {
            e.preventDefault();
            self.spotlightActiveIdx = (self.spotlightActiveIdx + 1) % items.length;
            items.removeClass('active').eq(self.spotlightActiveIdx).addClass('active');
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            self.spotlightActiveIdx = (self.spotlightActiveIdx - 1 + items.length) % items.length;
            items.removeClass('active').eq(self.spotlightActiveIdx).addClass('active');
          } else if (e.key === 'Enter') {
            e.preventDefault();
            items.eq(self.spotlightActiveIdx).trigger('click');
          }
        }
      });

      // View Switcher (2-Column Grid vs 1-Column Cinema)
      $('#qx_view_2col').on('click', function() {
        self.playHaptic('light');
        self.setCatalogView('2col');
      });
      $('#qx_view_1col').on('click', function() {
        self.playHaptic('light');
        self.setCatalogView('1col');
      });

      // Floating Glass Bottom Navigation Dock
      $('#qx_dock_home').on('click', function() {
        self.playHaptic('light');
        $('.qx-dock-item').removeClass('active');
        $(this).addClass('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      $('#qx_dock_search').on('click', function() {
        self.playHaptic('medium');
        self.openSpotlight();
      });
      $('#qx_dock_concierge').on('click', function() {
        self.playHaptic('medium');
        self.openQuiz();
      });
      $('#qx_dock_cart').on('click', function() {
        self.playHaptic('medium');
        self.openCart();
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

      // Product Modal Events
      $('#qx_pmodal_close, #qx_product_modal_backdrop, #qx_pmodal_btn_back, #qx_pmodal_btn_dismiss, #qx_pmodal_grabber').on('click', () => self.closeProductModal());

      // Touch / Swipe-Down to Dismiss on Mobile
      let pmodalTouchStartY = 0;
      let pmodalTouchEndY = 0;
      $('#qx_product_modal').on('touchstart', function(e) {
        pmodalTouchStartY = e.originalEvent.touches[0].clientY;
      });
      $('#qx_product_modal').on('touchend', function(e) {
        pmodalTouchEndY = e.originalEvent.changedTouches[0].clientY;
        const modalEl = $(this)[0];
        // If swiped down > 50px while scrolled near the top of modal
        if (modalEl && modalEl.scrollTop <= 10 && (pmodalTouchEndY - pmodalTouchStartY) > 50) {
          self.playHaptic('light');
          self.closeProductModal();
        }
      });

      // Intercept mobile back-gesture / popstate so swipe-back closes modal without leaving the site
      $(window).on('popstate', function() {
        self.activeHistoryModal = null;
        if ($('#qx_product_modal').hasClass('active')) {
          self.closeProductModal(false);
        } else if ($('#qx_lightbox_overlay').hasClass('active')) {
          self.closeLightbox(false);
        } else if ($('#qx_spotlight_modal').hasClass('active')) {
          self.closeSpotlight(false);
        } else if ($('#qx_quiz_modal').hasClass('active')) {
          self.closeQuiz(false);
        } else if ($('#qx_story_viewer').is(':visible')) {
          self.closeStory(false);
        } else if ($('#qx_checkout_drawer').hasClass('active')) {
          self.closeCheckout(false);
        } else if ($('#qx_cart_drawer').hasClass('active')) {
          self.closeCart(false);
        }
      });

      // Desktop Stepper
      $('#qx_pmodal_qty_dec').on('click', function() {
        self.playHaptic('light');
        self.pmodalQty = Math.max(1, (self.pmodalQty || 1) - 1);
        $('#qx_pmodal_qty_val, #qx_pmodal_bar_qty').text(self.pmodalQty);
      });

      $('#qx_pmodal_qty_inc').on('click', function() {
        self.playHaptic('light');
        self.pmodalQty = (self.pmodalQty || 1) + 1;
        $('#qx_pmodal_qty_val, #qx_pmodal_bar_qty').text(self.pmodalQty);
      });

      // Sticky Bottom Bar Stepper
      $('#qx_pmodal_bar_dec').on('click', function() {
        self.playHaptic('light');
        self.pmodalQty = Math.max(1, (self.pmodalQty || 1) - 1);
        $('#qx_pmodal_qty_val, #qx_pmodal_bar_qty').text(self.pmodalQty);
      });

      $('#qx_pmodal_bar_inc').on('click', function() {
        self.playHaptic('light');
        self.pmodalQty = (self.pmodalQty || 1) + 1;
        $('#qx_pmodal_qty_val, #qx_pmodal_bar_qty').text(self.pmodalQty);
      });

      $('#qx_pmodal_btn_add').on('click', function() {
        self.playHaptic('success');
        if (self.activeProductModal) {
          const prod = self.activeProductModal;
          const qty = self.pmodalQty || 1;
          self.closeProductModal(false);
          self.addToCart(prod, qty, $('#qx_pmodal_main_img'));
        }
      });

      $('#qx_pmodal_btn_buy, #qx_pmodal_bar_buy').on('click', function() {
        self.playHaptic('success');
        if (self.activeProductModal) {
          const prod = self.activeProductModal;
          const qty = self.pmodalQty || 1;
          self.closeProductModal(false);
          self.addToCart(prod, qty);
          self.openCheckout();
        }
      });

      // Share Button
      $('#qx_pmodal_share').on('click', function(e) {
        e.stopPropagation();
        self.playHaptic('medium');
        if (self.activeProductModal) {
          if (navigator.share) {
            navigator.share({
              title: self.activeProductModal.name,
              text: `Descubre ${self.activeProductModal.name} en ${self.tenant ? self.tenant.brandName : 'la boutique online'}`,
              url: window.location.href
            }).catch(() => {});
          } else {
            navigator.clipboard.writeText(window.location.href);
            self.showToast('🔗 ¡Enlace del producto copiado al portapapeles!');
          }
        }
      });

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

      // Fiscal Intelligence & SPEI bindings
      this.bindFiscalIntelligence();

      // Story Viewer Close & Click handlers
      $('#qx_story_close').on('click', () => self.closeStory());
      $('#qx_story_media').on('click', function(e) {
        const width = $(this).width();
        const clickX = e.offsetX;
        if (clickX < width / 3) {
          self.prevStorySlide();
        } else {
          self.nextStorySlide();
        }
      });

      // Concierge Quiz Button & Modal Handlers
      $('#qx_concierge_btn').on('click', () => self.openQuiz());
      $('#qx_quiz_close, #qx_quiz_backdrop').on('click', () => self.closeQuiz());
      $('#qx_quiz_restart').on('click', () => self.openQuiz());
      $('.qx-quiz-opt').on('click', function() {
        const val = $(this).data('val');
        self.handleQuizSelection(val);
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
            self.renderHero3DCarousel(resp.Featured || []);
            self.renderCategories(resp.Categories || []);
            self.applyFilters();
            self.initStories();
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

      bar.append(`<button type="button" class="qx-category-chip qx-cat-pill active" data-cat="ALL">✦ Todos (${this.products.length})</button>`);
      categories.forEach(cat => {
        const count = this.products.filter(p => p.category === cat).length;
        bar.append(`<button type="button" class="qx-category-chip qx-cat-pill" data-cat="${self.esc(cat)}">${self.esc(cat)} (${count})</button>`);
      });

      bar.find('.qx-category-chip, .qx-cat-pill').on('click', function() {
        self.playHaptic('light');
        bar.find('.qx-category-chip, .qx-cat-pill').removeClass('active');
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
      const initialPhoto = photos[0].url || photos[0].thumb || p.cover;

      // Media Stage
      const cardImg = $(`<img class="qx-card-img" src="${self.esc(initialPhoto)}" alt="${self.esc(p.name)}">`);
      self.autoFitImage(cardImg[0]);
      cardImg.on('load', function() { self.autoFitImage(this); });

      const media = $(`
        <div class="qx-card-media" title="Haz clic para ver detalles y fotos">
          <div class="qx-card-zoom-badge">✨ Ver Ficha</div>
        </div>
      `);
      media.prepend(cardImg);

      // Hover-Scrub Filmstrip Dots
      if (photos.length > 1) {
        const scrubBar = $('<div class="qx-card-scrub-bar"></div>');
        photos.forEach((photo, idx) => {
          const dot = $(`<div class="qx-scrub-dot ${idx === 0 ? 'active' : ''}" data-idx="${idx}"></div>`);
          dot.on('mouseenter click', function(e) {
            e.stopPropagation();
            scrubBar.find('.qx-scrub-dot').removeClass('active');
            $(this).addClass('active');
            const imgEl = media.find('.qx-card-img');
            imgEl.attr('src', photo.url || photo.thumb);
            self.autoFitImage(imgEl[0]);
          });
          scrubBar.append(dot);
        });
        media.append(scrubBar);
      }

      // Click on image opens Product Detail Modal
      media.on('click', () => {
        self.openProductModal(p);
      });

      // Card Content
      const body = $(`
        <div class="qx-card-body">
          <div class="qx-card-meta">
            <span class="qx-card-category">${self.esc(p.category || 'General')}</span>
            ${p.sku ? `<span class="qx-card-sku">SKU: ${self.esc(p.sku)}</span>` : ''}
          </div>
          <div class="qx-card-title" title="${self.esc(p.name)}" style="cursor:pointer">${self.esc(p.name)}</div>
          <div class="qx-card-footer">
            <div class="qx-card-price-block">
              <span class="qx-card-price">$ ${self.formatMoney(p.priceWithTax)}</span>
              <span class="qx-card-tax">IVA 16% incluido</span>
            </div>
            <button type="button" class="qx-btn-add-cart">
              <span>+</span> Agregar
            </button>
          </div>
        </div>
      `);

      body.find('.qx-card-title').on('click', () => {
        self.openProductModal(p);
      });

      body.find('.qx-btn-add-cart').on('click', (e) => {
        e.stopPropagation();
        self.addToCart(p, 1, card.find('.qx-card-img'));
      });

      card.append(media).append(body);
      return card;
    }

    addToCart(productOrId, qty = 1, originEl = null) {
      let product = productOrId;
      if (typeof productOrId === 'string' || typeof productOrId === 'number') {
        product = this.products.find(p => p.id == productOrId);
      }
      if (!product) return;

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
      if (originEl && originEl.length) {
        this.animateFlyToCart(originEl, product.cover);
      } else {
        this.playAudioSynth('cart');
      }
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
      const totalCount = this.cart.items.reduce((sum, i) => sum + i.qty, 0);

      $('#qx_cart_badge, #qx_dock_cart_badge').text(totalCount);

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

        row.find('.btn-dec').on('click', () => { self.playHaptic('light'); self.updateCartItemQty(item.id, -1); });
        row.find('.btn-inc').on('click', () => { self.playHaptic('light'); self.updateCartItemQty(item.id, 1); });
        list.append(row);
      });

      const grandTotal = subtotal + totalIva;
      $('#qx_cart_subtotal').text(`$ ${self.formatMoney(subtotal)}`);
      $('#qx_cart_iva').text(`$ ${self.formatMoney(totalIva)}`);
      $('#qx_cart_total').text(`$ ${self.formatMoney(grandTotal)}`);
      $('#qx_btn_proceed_checkout').prop('disabled', false).css('opacity', '1');
    }

    openCart() {
      $('#qx_mobile_dock').addClass('hidden');
      $('#qx_cart_backdrop').addClass('active');
      $('#qx_cart_drawer').addClass('active');
    }

    closeCart() {
      $('#qx_cart_backdrop').removeClass('active');
      $('#qx_cart_drawer').removeClass('active');
      if (!this.isModalOrDrawerOpen()) {
        $('#qx_mobile_dock').removeClass('hidden');
      }
    }

    openCheckout() {
      $('#qx_mobile_dock').addClass('hidden');
      $('#qx_checkout_backdrop').addClass('active');
      $('#qx_checkout_drawer').addClass('active');
      this.renderCheckoutSummary();
      if ($('input[name="qx_payment_method"]:checked').val() === 'SPEI') {
        $('#qx_spei_voucher').show();
      }
    }

    closeCheckout() {
      $('#qx_checkout_backdrop').removeClass('active');
      $('#qx_checkout_drawer').removeClass('active');
      if (!this.isModalOrDrawerOpen()) {
        $('#qx_mobile_dock').removeClass('hidden');
      }
    }

    isModalOrDrawerOpen() {
      return $('#qx_product_modal').hasClass('active') ||
             $('#qx_spotlight_modal').hasClass('active') ||
             $('#qx_quiz_modal').hasClass('active') ||
             $('#qx_story_viewer').is(':visible') ||
             $('#qx_lightbox_overlay').hasClass('active') ||
             $('#qx_cart_drawer').hasClass('active') ||
             $('#qx_checkout_drawer').hasClass('active');
    }

    pushModalHistory(name) {
      if (!this.activeHistoryModal) {
        this.activeHistoryModal = name;
        try {
          window.history.pushState({ qxModal: name }, '');
        } catch (e) {}
      }
    }

    popModalHistory() {
      if (this.activeHistoryModal) {
        this.activeHistoryModal = null;
        try {
          window.history.back();
        } catch (e) {}
      }
    }

    closeAllDrawers() {
      this.closeCart();
      this.closeCheckout();
      this.closeProductModal();
    }

    closeAllModalsAndDrawers(syncHistory = true) {
      $('#qx_cart_backdrop, #qx_cart_drawer').removeClass('active');
      $('#qx_checkout_backdrop, #qx_checkout_drawer').removeClass('active');
      $('#qx_product_modal_backdrop, #qx_product_modal').removeClass('active');
      $('#qx_spotlight_backdrop, #qx_spotlight_modal').removeClass('active');
      $('#qx_quiz_backdrop, #qx_quiz_modal').removeClass('active');
      $('#qx_story_viewer').hide();
      if (this.storyTimer) {
        clearInterval(this.storyTimer);
        this.storyTimer = null;
      }
      $('#qx_lightbox_overlay').removeClass('active');
      this.activeProductModal = null;
      this.activeStory = null;

      if (syncHistory && this.activeHistoryModal) {
        this.activeHistoryModal = null;
        try { window.history.back(); } catch (e) {}
      } else {
        this.activeHistoryModal = null;
      }
    }

    openProductModal(product) {
      if (!product) return;
      this.activeProductModal = product;
      this.pmodalQty = 1;

      // Scroll modal container to top
      $('#qx_product_modal').scrollTop(0);

      // Hide mobile dock
      $('#qx_mobile_dock').addClass('hidden');

      // Push history state so mobile swipe-back gesture closes modal without leaving the website
      this.pushModalHistory('product');

      const self = this;
      const photos = product.photos && product.photos.length ? product.photos : [{ thumb: product.cover, url: product.cover }];
      const initialPhoto = photos[0].url || photos[0].thumb || product.cover;

      // Populate Touch-Swipeable Track & Dots (Step 1)
      const swipeTrack = $('#qx_pmodal_swipe_track').empty();
      const dotsContainer = $('#qx_pmodal_dots').empty();

      photos.forEach((photo, idx) => {
        const slide = $(`<div class="qx-pmodal-swipe-slide" data-idx="${idx}"><img src="${self.esc(photo.url || photo.thumb)}" alt="${self.esc(product.name)}"></div>`);
        const slideImg = slide.find('img');
        self.autoFitImage(slideImg[0]);
        slideImg.on('load', function() { self.autoFitImage(this); });
        swipeTrack.append(slide);

        const dot = $(`<div class="qx-pmodal-dot ${idx === 0 ? 'active' : ''}" data-idx="${idx}"></div>`);
        dot.on('click', function() {
          self.playHaptic('light');
          const targetSlide = swipeTrack.find(`.qx-pmodal-swipe-slide[data-idx="${idx}"]`)[0];
          if (targetSlide) {
            targetSlide.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }
        });
        dotsContainer.append(dot);
      });

      const filmstrip = $('#qx_pmodal_filmstrip').empty();

      if (photos.length > 1) {
        dotsContainer.show();
        filmstrip.show();

        // Populate Filmstrip thumbnails (desktop & tablet)
        photos.forEach((photo, idx) => {
          const thumbImg = $(`<img class="qx-pmodal-thumb ${idx === 0 ? 'active' : ''}" data-idx="${idx}" src="${self.esc(photo.url || photo.thumb)}" alt="">`);
          thumbImg.on('click', function() {
            self.playHaptic('light');
            filmstrip.find('.qx-pmodal-thumb').removeClass('active');
            $(this).addClass('active');
            dotsContainer.find('.qx-pmodal-dot').removeClass('active').eq(idx).addClass('active');

            const targetSlide = swipeTrack.find(`.qx-pmodal-swipe-slide[data-idx="${idx}"]`)[0];
            if (targetSlide) {
              targetSlide.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
          });
          filmstrip.append(thumbImg);
        });

        // Synchronize dots and thumbnails on manual swipe/scroll
        swipeTrack.off('scroll.pmodal').on('scroll.pmodal', function() {
          const scrollLeft = this.scrollLeft;
          const slideWidth = this.clientWidth || 1;
          const currentIdx = Math.round(scrollLeft / slideWidth);
          dotsContainer.find('.qx-pmodal-dot').removeClass('active').eq(currentIdx).addClass('active');
          filmstrip.find('.qx-pmodal-thumb').removeClass('active').eq(currentIdx).addClass('active');
        });
      } else {
        dotsContainer.hide();
        filmstrip.hide();
      }

      // Badge
      if (product.isFeatured) {
        $('#qx_pmodal_badge').text('★ Edición Destacada').show();
      } else {
        $('#qx_pmodal_badge').hide();
      }

      // Meta & Titles
      $('#qx_pmodal_cat').text(product.category || 'GENERAL');
      $('#qx_pmodal_sku').text(product.sku ? `SKU: ${product.sku}` : (product.code ? `CÓD: ${product.code}` : ''));
      $('#qx_pmodal_sat').text(product.satKey ? `SAT: ${product.satKey}` : '');
      $('#qx_pmodal_title').text(product.name);

      // Price & Stock
      $('#qx_pmodal_price, #qx_pmodal_bar_price').text(`$ ${self.formatMoney(product.priceWithTax)}`);
      if (product.stock > 0) {
        $('#qx_pmodal_stock').text(`📦 ${product.stock} disponibles`).show();
      } else {
        $('#qx_pmodal_stock').text(`📦 Disponible para envío inmediato`).show();
      }

      // Specs / Description
      const desc = product.notes ? product.notes : `Fragancia y artículo exclusivo de ${self.tenant ? self.tenant.brandName : 'Boutique Oficial'}. Calidad premium garantizada con emisión de comprobante fiscal SAT CFDI 4.0 al instante.`;
      $('#qx_pmodal_desc').text(desc);

      // Documents / Ficha Técnica
      const docsList = $('#qx_pmodal_docs').empty();
      if (product.docs && product.docs.length > 0) {
        product.docs.forEach(doc => {
          docsList.append(`
            <a href="${self.esc(doc.url)}" target="_blank" class="qx-pmodal-doc-link">
              📄 ${self.esc(doc.title || 'Ficha Técnica')} ↗
            </a>
          `);
        });
        $('#qx_pmodal_docs_sec').show();
      } else {
        $('#qx_pmodal_docs_sec').hide();
      }

      // Quantity reset
      $('#qx_pmodal_qty_val, #qx_pmodal_bar_qty').text('1');

      // WhatsApp concierge button
      if (self.tenant && self.tenant.showWhatsapp && self.tenant.whatsappPhone) {
        const rawPhone = String(self.tenant.whatsappPhone).replace(/[^0-9]/g, '');
        const currentUrl = window.location.href;
        const waMsg = `¡Hola! Deseo más información y adquirir el producto: *${product.name}* (Precio: $${self.formatMoney(product.priceWithTax)} MXN) de la tienda online: ${currentUrl}`;
        const waLink = `https://wa.me/${encodeURIComponent(rawPhone)}?text=${encodeURIComponent(waMsg)}`;
        $('#qx_pmodal_btn_wa').attr('href', waLink).show();
      } else {
        $('#qx_pmodal_btn_wa').hide();
      }

      // Render Adaptive Specs & Metric Bars
      this.renderAdaptiveSpecs(product);

      // Open Modal
      $('#qx_product_modal_backdrop').addClass('active');
      $('#qx_product_modal').addClass('active');
    }

    closeProductModal(syncHistory = true) {
      $('#qx_product_modal_backdrop').removeClass('active');
      $('#qx_product_modal').removeClass('active');
      this.activeProductModal = null;
      if (!this.isModalOrDrawerOpen()) {
        $('#qx_mobile_dock').removeClass('hidden');
      }
      if (syncHistory) {
        this.popModalHistory();
      }
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

    renderHero3DCarousel(featured) {
      const self = this;
      const wrapper = $('#qx_hero_carousel_wrapper');
      const stage = $('#qx_3d_stage');
      const dotsContainer = $('#qx_3d_dots');

      if (!featured || featured.length === 0) {
        wrapper.hide();
        return;
      }

      stage.empty();
      dotsContainer.empty();
      wrapper.show();

      this.heroFeatured = featured;
      this.heroActiveIndex = 0;
      this.heroAutoPlayTimer = null;

      featured.forEach((p, idx) => {
        const coverImg = p.cover || 'https://media.evinux.net/no-image.svg';
        const cardHtml = `
          <div class="qx-3d-card" data-index="${idx}" data-id="${self.esc(p.id)}">
            <span class="qx-3d-badge">★ Edición Destacada</span>
            <div class="qx-3d-img-container">
              <img src="${self.esc(coverImg)}" alt="${self.esc(p.name)}" class="qx-3d-img" loading="lazy">
            </div>
            <div class="qx-3d-info">
              <div class="qx-3d-title" title="${self.esc(p.name)}">${self.esc(p.name)}</div>
              <div class="qx-3d-bottom-row">
                <div class="qx-3d-price">$${self.formatMoney(p.priceWithTax)}</div>
                <button type="button" class="qx-3d-btn-buy" data-id="${self.esc(p.id)}">
                  <span>🛍️</span> Comprar
                </button>
              </div>
            </div>
          </div>
        `;
        stage.append(cardHtml);
        dotsContainer.append(`<div class="qx-3d-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></div>`);
      });

      this.update3DCarousel();

      // Prev / Next Arrows
      $('#qx_3d_prev').off('click').on('click', (e) => {
        e.stopPropagation();
        self.prev3DSlide();
      });
      $('#qx_3d_next').off('click').on('click', (e) => {
        e.stopPropagation();
        self.next3DSlide();
      });

      // Dots Click
      dotsContainer.find('.qx-3d-dot').off('click').on('click', function(e) {
        e.stopPropagation();
        const targetIdx = parseInt($(this).data('index'), 10);
        self.goTo3DSlide(targetIdx);
      });

      // Card Click Handler
      stage.find('.qx-3d-card').off('click').on('click', function(e) {
        if ($(e.target).closest('.qx-3d-btn-buy').length) {
          return;
        }
        const clickedIdx = parseInt($(this).data('index'), 10);
        if (clickedIdx === self.heroActiveIndex) {
          const prodId = $(this).data('id');
          const product = self.products.find(p => p.id === prodId);
          if (product) {
            self.openProductModal(product);
          }
        } else {
          self.goTo3DSlide(clickedIdx);
        }
      });

      // 1-Click Buy Button
      stage.find('.qx-3d-btn-buy').off('click').on('click', function(e) {
        e.stopPropagation();
        const prodId = $(this).data('id');
        self.addToCart(prodId, 1);
      });

      // Touch / Mouse Swipe
      let touchStartX = 0;
      let touchEndX = 0;
      stage.off('touchstart mousedown').on('touchstart mousedown', function(e) {
        touchStartX = e.pageX || (e.originalEvent.touches && e.originalEvent.touches[0].pageX) || 0;
      });
      stage.off('touchend mouseup').on('touchend mouseup', function(e) {
        touchEndX = e.pageX || (e.originalEvent.changedTouches && e.originalEvent.changedTouches[0].pageX) || 0;
        const diff = touchEndX - touchStartX;
        if (diff > 50) {
          self.prev3DSlide();
        } else if (diff < -50) {
          self.next3DSlide();
        }
      });

      // Auto-play interval
      this.start3DAutoPlay();
      wrapper.off('mouseenter').on('mouseenter', () => self.stop3DAutoPlay());
      wrapper.off('mouseleave').on('mouseleave', () => self.start3DAutoPlay());
    }

    update3DCarousel() {
      const stage = $('#qx_3d_stage');
      const dots = $('#qx_3d_dots');
      const total = this.heroFeatured ? this.heroFeatured.length : 0;
      if (total === 0) return;

      const current = this.heroActiveIndex;
      const prevIdx = (current - 1 + total) % total;
      const nextIdx = (current + 1) % total;

      stage.find('.qx-3d-card').each(function() {
        const idx = parseInt($(this).data('index'), 10);
        $(this).removeClass('active prev next hidden');
        if (idx === current) {
          $(this).addClass('active');
        } else if (idx === prevIdx) {
          $(this).addClass('prev');
        } else if (idx === nextIdx) {
          $(this).addClass('next');
        } else {
          $(this).addClass('hidden');
        }
      });

      dots.find('.qx-3d-dot').removeClass('active');
      dots.find(`.qx-3d-dot[data-index="${current}"]`).addClass('active');
    }

    next3DSlide() {
      if (!this.heroFeatured || this.heroFeatured.length === 0) return;
      this.heroActiveIndex = (this.heroActiveIndex + 1) % this.heroFeatured.length;
      this.update3DCarousel();
    }

    prev3DSlide() {
      if (!this.heroFeatured || this.heroFeatured.length === 0) return;
      this.heroActiveIndex = (this.heroActiveIndex - 1 + this.heroFeatured.length) % this.heroFeatured.length;
      this.update3DCarousel();
    }

    goTo3DSlide(index) {
      if (!this.heroFeatured || index < 0 || index >= this.heroFeatured.length) return;
      this.heroActiveIndex = index;
      this.update3DCarousel();
    }

    start3DAutoPlay() {
      this.stop3DAutoPlay();
      this.heroAutoPlayTimer = setInterval(() => {
        this.next3DSlide();
      }, 5500);
    }

    stop3DAutoPlay() {
      if (this.heroAutoPlayTimer) {
        clearInterval(this.heroAutoPlayTimer);
        this.heroAutoPlayTimer = null;
      }
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

    playAudioSynth(type = 'click') {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!this.audioCtx) {
          this.audioCtx = new AudioCtx();
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        const now = this.audioCtx.currentTime;
        if (type === 'cart') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, now); // D5
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
        } else if (type === 'pop') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1046.5, now); // C6
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
        }
      } catch (e) {}
    }

    animateFlyToCart(originEl, thumbUrl) {
      if (!originEl || !originEl.length) return;
      const originRect = originEl[0].getBoundingClientRect();
      const cartBtn = document.getElementById('qx_cart_btn');
      if (!cartBtn) return;
      const targetRect = cartBtn.getBoundingClientRect();

      const orb = $('<div class="qx-fly-orb"></div>');
      orb.css({
        top: `${originRect.top + originRect.height / 2 - 22}px`,
        left: `${originRect.left + originRect.width / 2 - 22}px`,
        backgroundImage: `url('${thumbUrl}')`
      });
      $('body').append(orb);

      requestAnimationFrame(() => {
        const deltaX = (targetRect.left + targetRect.width / 2) - (originRect.left + originRect.width / 2);
        const deltaY = (targetRect.top + targetRect.height / 2) - (originRect.top + originRect.height / 2);
        orb.css({
          transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.25)`,
          opacity: 0.2
        });
      });

      setTimeout(() => {
        orb.remove();
        const badge = $('#qx_cart_badge');
        badge.addClass('pulse-bounce');
        setTimeout(() => badge.removeClass('pulse-bounce'), 450);
        this.playAudioSynth('cart');
      }, 650);
    }

    openSpotlight() {
      $('#qx_mobile_dock').addClass('hidden');
      $('#qx_spotlight_backdrop').addClass('active');
      $('#qx_spotlight_modal').addClass('active');
      $('#qx_spotlight_input').val('').focus();
      this.spotlightActiveIdx = 0;
      this.renderSpotlightResults('');
    }

    closeSpotlight() {
      $('#qx_spotlight_backdrop').removeClass('active');
      $('#qx_spotlight_modal').removeClass('active');
      if (!this.isModalOrDrawerOpen()) {
        $('#qx_mobile_dock').removeClass('hidden');
      }
    }

    renderSpotlightResults(query) {
      const container = $('#qx_spotlight_results').empty();
      const q = (query || '').toLowerCase().trim();
      let matches = this.products;

      if (q) {
        matches = this.products.filter(p => {
          const matchName = (p.name || '').toLowerCase().includes(q);
          const matchSku = (p.sku || '').toLowerCase().includes(q);
          const matchCode = (p.code || '').toLowerCase().includes(q);
          const matchCat = (p.category || '').toLowerCase().includes(q);
          const matchSat = (p.satKey || '').toLowerCase().includes(q);
          const matchNotes = (p.notes || '').toLowerCase().includes(q);
          return matchName || matchSku || matchCode || matchCat || matchSat || matchNotes;
        });
      }

      if (matches.length === 0) {
        container.html('<div style="padding:24px; text-align:center; color:var(--qx-text-muted); font-size:13px;">No se encontraron artículos para esta búsqueda.</div>');
        return;
      }

      const displayList = matches.slice(0, 7);
      const self = this;

      displayList.forEach((p, idx) => {
        const item = $(`
          <div class="qx-spotlight-item ${idx === self.spotlightActiveIdx ? 'active' : ''}" data-idx="${idx}">
            <img class="qx-spotlight-thumb" src="${self.esc(p.cover)}" alt="">
            <div class="qx-spotlight-info">
              <div class="qx-spotlight-name">${self.esc(p.name)}</div>
              <div class="qx-spotlight-meta">
                <span>${self.esc(p.category || 'General')}</span>
                ${p.sku ? `<span>· SKU: ${self.esc(p.sku)}</span>` : ''}
                ${p.satKey ? `<span>· SAT: ${self.esc(p.satKey)}</span>` : ''}
              </div>
            </div>
            <div class="qx-spotlight-price">$ ${self.formatMoney(p.priceWithTax)}</div>
          </div>
        `);

        item.on('click', () => {
          self.closeSpotlight();
          self.openProductModal(p);
        });

        item.on('mouseenter', function() {
          container.find('.qx-spotlight-item').removeClass('active');
          $(this).addClass('active');
          self.spotlightActiveIdx = idx;
        });

        container.append(item);
      });
    }

    renderAdaptiveSpecs(product) {
      const container = $('#qx_pmodal_adaptive_specs').empty();
      const rawNotes = product.notes || '';

      // 1. Check for Olfactory Pyramid (Salida, Corazón, Fondo)
      if (/salida|coraz[oó]n|fondo/i.test(rawNotes)) {
        const lines = rawNotes.split(/\n|\r|\.|;/).map(s => s.trim()).filter(Boolean);
        let salida = '', corazon = '', fondo = '';

        lines.forEach(l => {
          if (/salida/i.test(l)) salida = l.replace(/.*salida[:\s-]*/i, '').trim();
          else if (/coraz[oó]n/i.test(l)) corazon = l.replace(/.*coraz[oó]n[:\s-]*/i, '').trim();
          else if (/fondo/i.test(l)) fondo = l.replace(/.*fondo[:\s-]*/i, '').trim();
        });

        if (salida || corazon || fondo) {
          const pyramid = $(`
            <div class="qx-pyramid-container" style="margin-bottom:8px;">
              ${salida ? `<div class="qx-pyramid-tier"><div class="qx-pyramid-tier-icon">🌿</div><div><div class="qx-pyramid-tier-title">Notas de Salida</div><div class="qx-pyramid-tier-notes">${this.esc(salida)}</div></div></div>` : ''}
              ${corazon ? `<div class="qx-pyramid-tier"><div class="qx-pyramid-tier-icon">🌸</div><div><div class="qx-pyramid-tier-title">Notas de Corazón</div><div class="qx-pyramid-tier-notes">${this.esc(corazon)}</div></div></div>` : ''}
              ${fondo ? `<div class="qx-pyramid-tier"><div class="qx-pyramid-tier-icon">🪵</div><div><div class="qx-pyramid-tier-title">Notas de Fondo</div><div class="qx-pyramid-tier-notes">${this.esc(fondo)}</div></div></div>` : ''}
            </div>
          `);
          container.append(pyramid);
        }
      }
      // 2. Check for Key:Value specs (e.g. CPU: i7 | RAM: 16GB)
      else if (rawNotes.includes(':') || rawNotes.includes('|')) {
        const pairs = rawNotes.split(/\||\n|\r/).map(s => s.trim()).filter(Boolean);
        const grid = $('<div class="qx-specs-grid" style="margin-bottom:8px;"></div>');
        pairs.forEach(p => {
          const parts = p.split(':');
          if (parts.length >= 2) {
            grid.append(`
              <div class="qx-spec-card">
                <div class="qx-spec-key">${this.esc(parts[0].trim())}</div>
                <div class="qx-spec-val">${this.esc(parts.slice(1).join(':').trim())}</div>
              </div>
            `);
          }
        });
        if (grid.children().length > 0) {
          container.append(grid);
        }
      }

      // Metric Bars Animation
      const hash = String(product.id || product.name).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const intensity = 75 + (hash % 24); // 75% - 98%
      const longevity = 78 + ((hash * 3) % 21); // 78% - 98%
      const quality = 88 + ((hash * 7) % 11); // 88% - 98%

      $('#qx_metric_val_1').text(`${intensity}%`);
      $('#qx_metric_val_2').text(`${longevity}%`);
      $('#qx_metric_val_3').text(`${quality}%`);

      setTimeout(() => {
        $('#qx_metric_bar_1').css('width', `${intensity}%`);
        $('#qx_metric_bar_2').css('width', `${longevity}%`);
        $('#qx_metric_bar_3').css('width', `${quality}%`);
      }, 50);
    }

    bindFiscalIntelligence() {
      const self = this;
      const rfcInput = $('#qx_cfdi_rfc');
      const regimenSelect = $('#qx_cfdi_regimen');
      const usoSelect = $('#qx_cfdi_uso');

      rfcInput.on('input', function() {
        const rfc = $(this).val().toUpperCase().trim();
        $(this).val(rfc);

        if (rfc.length === 12) {
          // Persona Moral
          $('#qx_rfc_type_badge').text('🏢 Persona Moral').show();
          regimenSelect.html(`
            <option value="601" selected>601 — General de Ley Personas Morales</option>
            <option value="626">626 — Régimen Simplificado de Confianza (RESICO)</option>
            <option value="603">603 — Personas Morales con Fines no Lucrativos</option>
          `);
          usoSelect.html(`
            <option value="G01" selected>G01 — Adquisición de mercancías</option>
            <option value="G03">G03 — Gastos en general</option>
            <option value="S01">S01 — Sin efectos fiscales</option>
          `);
        } else if (rfc.length === 13) {
          // Persona Física
          $('#qx_rfc_type_badge').text('👤 Persona Física').show();
          regimenSelect.html(`
            <option value="612" selected>612 — Personas Físicas con Actividades Empresariales</option>
            <option value="626">626 — Régimen Simplificado de Confianza (RESICO)</option>
            <option value="605">605 — Sueldos y Salarios e Ingresos Asimilados</option>
            <option value="616">616 — Sin obligaciones fiscales</option>
          `);
          usoSelect.html(`
            <option value="G01">G01 — Adquisición de mercancías</option>
            <option value="G03" selected>G03 — Gastos en general</option>
            <option value="S01">S01 — Sin efectos fiscales</option>
          `);
        } else {
          $('#qx_rfc_type_badge').hide();
        }
      });

      // SPEI vs other payment methods toggle
      $('input[name="qx_payment_method"]').on('change', function() {
        if ($(this).val() === 'SPEI') {
          $('#qx_spei_voucher').slideDown(200);
        } else {
          $('#qx_spei_voucher').slideUp(200);
        }
      });

      // Copy CLABE button
      $('#qx_btn_copy_clabe').on('click', function() {
        const clabe = $('#qx_spei_clabe_val').val();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(clabe).catch(() => {
            const input = document.getElementById('qx_spei_clabe_val');
            if (input) {
              input.select();
              try { document.execCommand('copy'); } catch (e) {}
            }
          });
        }
        self.showToast('✔ CLABE copiada al portapapeles');
        self.playAudioSynth('pop');
      });

      // WhatsApp VIP checkout button
      if (self.tenant && self.tenant.showWhatsapp && self.tenant.whatsappPhone) {
        $('#qx_btn_checkout_wa').show();
      }
      $('#qx_btn_checkout_wa').on('click', function() {
        if (!self.tenant || !self.tenant.whatsappPhone) return;
        const rawPhone = String(self.tenant.whatsappPhone).replace(/[^0-9]/g, '');
        const itemsText = self.cart.items.map(i => `• ${i.qty}x ${i.name} ($${self.formatMoney(i.priceWithTax)})`).join('\n');
        const grandTotal = $('#qx_cart_total').text() || '$0.00';
        const msg = `✨ *NUEVO PEDIDO BOUTIQUE ONLINE*\n━━━━━━━━━━━━━━━━━━━━\n👤 *Cliente:* ${$('#qx_cust_name').val() || 'Cliente VIP'}\n📍 *Dirección:* ${$('#qx_cust_address').val() || 'Por definir'}\n\n🛍️ *PRODUCTOS:*\n${itemsText}\n\n💰 *TOTAL A PAGAR:* ${grandTotal} MXN\n🧾 *Requiere Factura:* ${$('#qx_require_cfdi').is(':checked') ? 'SÍ (' + ($('#qx_cfdi_rfc').val() || 'RFC pendiente') + ')' : 'NO'}\n━━━━━━━━━━━━━━━━━━━━\n¡Hola! Deseo confirmar este pedido.`;
        window.open(`https://wa.me/${encodeURIComponent(rawPhone)}?text=${encodeURIComponent(msg)}`, '_blank');
      });
    }

    initStories() {
      const topItems = this.products.slice(0, 6);
      if (topItems.length === 0) return;

      this.stories = [
        { id: 'top_arabes', label: '👑 Top Ventas', title: 'Top Fragancias Más Vendidas', slides: topItems.slice(0, 3).map(p => ({ mediaUrl: p.cover, productId: p.id })) },
        { id: 'novedades', label: '✨ Novedades', title: 'Colección Reciente', slides: topItems.slice(3, 6).map(p => ({ mediaUrl: p.cover, productId: p.id })) },
        { id: 'garantia', label: '🛡️ Garantía SAT', title: 'Calidad y Facturación SAT 4.0', slides: [{ mediaUrl: topItems[0].cover, productId: topItems[0].id }] }
      ];

      this.renderStoriesBar();
    }

    renderStoriesBar() {
      const container = $('#qx_stories_container').empty();
      const self = this;

      this.stories.forEach(story => {
        const firstThumb = story.slides[0] ? story.slides[0].mediaUrl : 'images/logo.png';
        const avatar = $(`
          <div class="qx-story-avatar-wrap" data-id="${story.id}">
            <div class="qx-story-ring">
              <img class="qx-story-avatar-img" src="${self.esc(firstThumb)}" alt="${self.esc(story.title)}">
            </div>
            <div class="qx-story-avatar-label">${self.esc(story.label)}</div>
          </div>
        `);

        avatar.on('click', () => {
          self.openStory(story.id, 0);
        });

        container.append(avatar);
      });
    }

    openStory(storyId, slideIdx = 0) {
      const story = this.stories.find(s => s.id === storyId);
      if (!story || !story.slides.length) return;

      this.activeStory = story;
      this.activeSlideIdx = slideIdx;
      this.renderStorySlide();
      $('#qx_mobile_dock').addClass('hidden');
      $('#qx_story_viewer').fadeIn(200);
      this.startStoryTimer();
    }

    closeStory() {
      $('#qx_story_viewer').fadeOut(200);
      if (this.storyTimer) {
        clearInterval(this.storyTimer);
        this.storyTimer = null;
      }
      this.activeStory = null;
      if (!this.isModalOrDrawerOpen()) {
        $('#qx_mobile_dock').removeClass('hidden');
      }
    }

    renderStorySlide() {
      if (!this.activeStory) return;
      const self = this;
      const slide = this.activeStory.slides[this.activeSlideIdx];

      // Render progress bar segments
      const progressBar = $('#qx_story_progress').empty();
      this.activeStory.slides.forEach((s, idx) => {
        const seg = $(`
          <div class="qx-story-progress-segment">
            <div class="qx-story-progress-fill" style="width: ${idx < self.activeSlideIdx ? '100%' : (idx === self.activeSlideIdx ? '0%' : '0%')};"></div>
          </div>
        `);
        progressBar.append(seg);
      });

      $('#qx_story_img').attr('src', slide.mediaUrl);
      $('#qx_story_title').text(this.activeStory.title);

      if (slide.productId) {
        const prod = this.products.find(p => p.id === slide.productId);
        if (prod) {
          $('#qx_story_prod_thumb').attr('src', prod.cover);
          $('#qx_story_prod_name').text(prod.name);
          $('#qx_story_prod_price').text(`$ ${this.formatMoney(prod.priceWithTax)} MXN`);
          $('#qx_story_product_tag').show();
          $('#qx_story_btn_buy').off('click').on('click', () => {
            self.closeStory();
            self.openProductModal(prod);
          });
        } else {
          $('#qx_story_product_tag').hide();
        }
      } else {
        $('#qx_story_product_tag').hide();
      }
    }

    startStoryTimer() {
      if (this.storyTimer) clearInterval(this.storyTimer);
      let progress = 0;
      const self = this;
      this.storyTimer = setInterval(() => {
        progress += 2;
        const currentSeg = $('#qx_story_progress .qx-story-progress-segment').eq(self.activeSlideIdx);
        currentSeg.find('.qx-story-progress-fill').css('width', `${progress}%`);

        if (progress >= 100) {
          clearInterval(self.storyTimer);
          self.nextStorySlide();
        }
      }, 100);
    }

    nextStorySlide() {
      if (!this.activeStory) return;
      if (this.activeSlideIdx + 1 < this.activeStory.slides.length) {
        this.activeSlideIdx++;
        this.renderStorySlide();
        this.startStoryTimer();
      } else {
        this.closeStory();
      }
    }

    prevStorySlide() {
      if (!this.activeStory) return;
      if (this.activeSlideIdx > 0) {
        this.activeSlideIdx--;
        this.renderStorySlide();
        this.startStoryTimer();
      }
    }

    openQuiz() {
      this.quizAnswers = {};
      this.quizStep = 1;
      this.showQuizStep(1);
      $('#qx_mobile_dock').addClass('hidden');
      $('#qx_quiz_backdrop').addClass('active');
      $('#qx_quiz_modal').addClass('active');
    }

    closeQuiz() {
      $('#qx_quiz_backdrop').removeClass('active');
      $('#qx_quiz_modal').removeClass('active');
      if (!this.isModalOrDrawerOpen()) {
        $('#qx_mobile_dock').removeClass('hidden');
      }
    }

    showQuizStep(step) {
      this.quizStep = step;
      $('#qx_quiz_bar').css('width', `${(step / 3) * 100}%`);
      $('#qx_quiz_wizard .qx-quiz-step').removeClass('active');
      $('#qx_quiz_results').hide();
      $(`#qx_quiz_wizard .qx-quiz-step[data-step="${step}"]`).addClass('active');
    }

    handleQuizSelection(val) {
      if (this.quizStep === 1) {
        this.quizAnswers.occasion = val;
        this.showQuizStep(2);
      } else if (this.quizStep === 2) {
        this.quizAnswers.style = val;
        this.showQuizStep(3);
      } else if (this.quizStep === 3) {
        this.quizAnswers.budget = val;
        this.calculateAndRenderQuizResults();
      }
    }

    calculateAndRenderQuizResults() {
      $('#qx_quiz_wizard .qx-quiz-step').removeClass('active');
      $('#qx_quiz_bar').css('width', '100%');
      const self = this;

      const scored = this.products.map(p => {
        let score = 55;
        const text = (p.name + ' ' + p.category + ' ' + (p.notes || '')).toLowerCase();

        if (self.quizAnswers.occasion === 'noche' && /nuit|intense|elixir|oud|amber|negro/i.test(text)) score += 20;
        if (self.quizAnswers.occasion === 'diario' && /dive|fresh|blue|sport|aqua/i.test(text)) score += 20;
        if (self.quizAnswers.style === 'fresco' && /c[ií]trico|marino|aquatic|bergamot|dive/i.test(text)) score += 20;
        if (self.quizAnswers.style === 'amaderado' && /wood|cedar|vetiver|leather/i.test(text)) score += 20;
        if (self.quizAnswers.style === 'dulce' && /vanilla|sweet|amber|tonka/i.test(text)) score += 20;
        if (self.quizAnswers.style === 'intenso' && /elixir|intense|oud|black|supremacy/i.test(text)) score += 20;
        if (self.quizAnswers.budget === 'lujo' && p.priceWithTax > 320) score += 15;
        if (self.quizAnswers.budget === 'accesible' && p.priceWithTax <= 320) score += 15;

        return { product: p, score: Math.min(99, score) };
      });

      scored.sort((a, b) => b.score - a.score);
      const top3 = scored.slice(0, 3);

      const grid = $('#qx_quiz_matches').empty();
      top3.forEach((item, idx) => {
        const p = item.product;
        const badges = ['⭐ 98% Match con tus gustos', '✨ 92% Match Recomendado', '💎 88% Match Especial'];
        const card = $(`
          <div class="qx-quiz-match-card" style="cursor:pointer;">
            <img class="qx-quiz-match-thumb" src="${self.esc(p.cover)}" alt="">
            <div class="qx-quiz-match-info">
              <div class="qx-quiz-match-badge">${badges[idx] || '⭐ ' + item.score + '% Match'}</div>
              <div class="qx-quiz-match-title">${self.esc(p.name)}</div>
              <div class="qx-quiz-match-price">$ ${self.formatMoney(p.priceWithTax)} MXN</div>
            </div>
            <button type="button" class="qx-btn-story-buy btn-quiz-view">Ver Ficha</button>
          </div>
        `);

        card.on('click', () => {
          self.closeQuiz();
          self.openProductModal(p);
        });

        grid.append(card);
      });

      $('#qx_quiz_results').fadeIn(200);
      this.playAudioSynth('cart');
    }

    autoFitImage(imgEl) {
      if (!imgEl) return;
      const applyFit = () => {
        const nw = imgEl.naturalWidth || imgEl.width;
        const nh = imgEl.naturalHeight || imgEl.height;
        if (!nw || !nh) return;

        imgEl.style.objectFit = 'contain';
        imgEl.style.objectPosition = 'center';
        imgEl.style.display = 'block';
        imgEl.style.margin = 'auto';

        // Proportional scale: ensure complete product visibility with generous breathing room
        if (nh > nw * 1.15) {
          // Tall bottle
          imgEl.style.maxHeight = '88%';
          imgEl.style.maxWidth = '86%';
          imgEl.style.width = 'auto';
          imgEl.style.height = 'auto';
        } else if (nw > nh * 1.15) {
          // Wide packaging
          imgEl.style.maxWidth = '88%';
          imgEl.style.maxHeight = '86%';
          imgEl.style.width = 'auto';
          imgEl.style.height = 'auto';
        } else {
          // Square or balanced
          imgEl.style.maxWidth = '88%';
          imgEl.style.maxHeight = '88%';
          imgEl.style.width = 'auto';
          imgEl.style.height = 'auto';
        }
      };

      if (imgEl.complete && imgEl.naturalWidth) {
        applyFit();
      } else {
        imgEl.onload = applyFit;
      }
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
