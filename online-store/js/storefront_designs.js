/** Quantix visual projections. Merchant content and business capabilities stay independent. */
(function(window, document) {
  'use strict';
  var keys = ['nordic', 'maison', 'titan', 'social'];
  var preview = new URLSearchParams(window.location.search).get('preview_mode') === '1';
  var inspectorEnabled = false;
  var parentOrigin = '';
  var lastDetailFocus = null;
  var Surface = {
    normalize: function(key) {
      key = String(key || '').toLowerCase();
      return window.QuantixDesignContract ? window.QuantixDesignContract.normalize(key) : (keys.indexOf(key) >= 0 ? key : 'maison');
    },
    isTrustedPreviewMessage: function(event) {
      if (!preview || window.parent === window || event.source !== window.parent) return false;
      try {
        var origin = new URL(event.origin);
        var own = new URL(window.location.href);
        return event.origin === own.origin || (origin.protocol === 'https:' && /(^|\.)evinux\.net$/.test(origin.hostname));
      } catch (error) { return false; }
    },
    setInspectorMode: function(enabled, origin) {
      if (!preview) return;
      inspectorEnabled = Boolean(enabled);
      parentOrigin = origin || parentOrigin;
      document.body.classList.toggle('qx-inspector-enabled', inspectorEnabled);
      if (window.quantixStore) {
        if (inspectorEnabled) window.quantixStore.stop3DAutoPlay();
        else window.quantixStore.start3DAutoPlay();
      }
      if (!inspectorEnabled) document.querySelectorAll('.qx-inspector-hover').forEach(function(el) { el.classList.remove('qx-inspector-hover'); });
    },
    focusSection: function(section) {
      var selectors = { hero: '#qx_hero_section', catalog: '#qx_catalog_start', identity: '.qx-navbar', contact: '#qx_design_contact' };
      if (!preview || !Object.prototype.hasOwnProperty.call(selectors, section)) return;
      var target = document.querySelector(selectors[section]);
      if (target) target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    },
    ready: function() {
      if (!preview || window.parent === window) return;
      try {
        var referrer = new URL(document.referrer);
        if (referrer.origin === window.location.origin || (referrer.protocol === 'https:' && /(^|\.)evinux\.net$/.test(referrer.hostname))) window.parent.postMessage({ source: 'QUANTIX_STOREFRONT_READY', type: 'QUANTIX_STOREFRONT_READY' }, referrer.origin);
      } catch (error) {}
    },
    applyHeroSettings: function(payload) {
      if (!payload || typeof payload !== 'object') return;
      var body = document.body;
      var modes = ['static', 'circadian'];
      if (modes.indexOf(String(payload.background_mode || '').toLowerCase()) !== -1) {
        body.setAttribute('data-hero-background', String(payload.background_mode).toLowerCase());
      }
      var circadian = payload.circadian;
      if (circadian && Object.prototype.hasOwnProperty.call(circadian, 'enabled')) {
        body.setAttribute('data-hero-background', circadian.enabled === true || circadian.enabled === 1 || circadian.enabled === '1' ? 'circadian' : 'static');
      }
      var phase = payload.phase || (circadian && (circadian.phase || circadian.current_phase));
      var phases = ['aube', 'zenith', 'crepuscule', 'nuit'];
      if (phases.indexOf(phase) !== -1) {
        phases.forEach(function(key) { body.classList.toggle('qx-circadian-' + key, key === phase); });
        body.setAttribute('data-circadian-phase', phase);
      }
    },
    featuredSelection: null,
    setFeatured: function(records, store) {
      if (!Array.isArray(records)) return;
      Surface.featuredSelection = records.slice().sort(function(a,b) { return Number(a.slot || 0) - Number(b.slot || 0); });
      if (!store || !store.products || !store.products.length) return;
      var selection = Surface.resolveFeatured(store);
      var unchanged = (store.heroFeatured || []).map(function(p) { return String(p.id); }).join('|') === selection.map(function(p) { return String(p.id); }).join('|');
      store.heroFeatured = selection;
      if (!unchanged) store.renderHero3DCarousel(selection);
      Surface.refresh(store, selection);
    },
    resolveFeatured: function(store) {
      return (Surface.featuredSelection || []).map(function(record) { return (store.products || []).find(function(p) { return String(p.id) === String(record.product_id); }); }).filter(Boolean);
    },
    refresh: function(store, featured) {
      var key = Surface.normalize(store.currentArchetype || document.body.getAttribute('data-archetype'));
      document.body.setAttribute('data-design', key);
      document.body.setAttribute('data-archetype', key);
      var products = store.products || [];
      if (Surface.featuredSelection !== null) { featured = Surface.resolveFeatured(store); store.heroFeatured = featured; }
      // An explicit empty selection is intentional; only absent curation may fall back.
      var candidates = Array.isArray(featured) ? featured : (Array.isArray(store.heroFeatured) ? store.heroFeatured : products);
      var selected = candidates[0];
      var image = document.getElementById('qx_design_hero_image');
      var button = document.getElementById('qx_design_hero_open');
      var media = document.getElementById('qx_design_hero_media');
      if (media) media.hidden = !selected;
      if (image && selected) {
        var photo = selected.photos && selected.photos[0];
        var url = photo && (photo.url || photo.thumb) || selected.cover;
        image.onerror = function() { image.hidden = true; media.classList.add('qx-image-unavailable'); };
        if (url) { if (image.getAttribute('src') !== url) image.src = url; image.alt = selected.name || ''; image.hidden = false; media.classList.remove('qx-image-unavailable'); }
        else { image.hidden = true; media.classList.add('qx-image-unavailable'); }
        button.disabled = false;
        button.setAttribute('aria-label', (store.isRealEstateBusiness() ? 'Ver propiedad: ' : 'Ver detalle: ') + selected.name);
        button.onclick = function() { store.openProductModal(selected); };
        document.getElementById('qx_design_hero_caption').textContent = selected.name || '';
        document.getElementById('qx_design_hero_price').textContent = Number(selected.priceWithTax) > 0 ? '$ ' + store.formatMoney(selected.priceWithTax) + ' MXN' : 'Consultar precio';
      }
      if (!selected && button) {
        button.disabled = true; button.onclick = null; image.hidden = true;
        document.getElementById('qx_design_hero_caption').textContent = '';
        document.getElementById('qx_design_hero_price').textContent = '';
      }
      var count = document.getElementById('qx_design_collection_count');
      if (count) count.textContent = products.length ? String(products.length).padStart(2, '0') + ' ' + (store.isRealEstateBusiness() ? (products.length === 1 ? 'propiedad' : 'propiedades') : (products.length === 1 ? 'artículo' : 'artículos')) : '';
      var contact = document.getElementById('qx_design_contact');
      var tenant = store.tenant || {};
      var hasAgenda = Boolean(tenant.featureMatrix && tenant.featureMatrix.royal_agenda && tenant.featureMatrix.royal_agenda.enabled);
      var contactDetails = store.getStoreContact('Hola, solicito información sobre ' + (tenant.brandName || 'su catálogo') + '.');
      if (contact) {
        contact.hidden = !contactDetails && !hasAgenda;
        contact.onclick = function() {
          if (hasAgenda) { store.openAgendaModal(); return; }
          if (!contactDetails) return;
          if (contactDetails.external) window.open(contactDetails.url, '_blank', 'noopener,noreferrer');
          else window.location.href = contactDetails.url;
        };
      }
      var concierge = document.getElementById('qx_concierge_btn');
      if (concierge && !tenant.isPerfumery) concierge.hidden = !contactDetails && !hasAgenda;
      Surface.modules(store);
    },
    modules: function(store) {
      var carousel = document.getElementById('qx_hero_carousel_wrapper');
      if (carousel && !document.getElementById('qx_design_showcase')) {
        var more = document.createElement('details'); more.id = 'qx_design_showcase'; more.className = 'qx-design-showcase';
        var summary = document.createElement('summary'); summary.textContent = 'Explorar la selección destacada'; more.appendChild(summary);
        var hero = document.getElementById('qx_hero_section');
        hero.parentNode.insertBefore(more, hero.nextSibling); more.appendChild(carousel);
        more.addEventListener('toggle', function() { if (more.open) store.start3DAutoPlay(); else store.stop3DAutoPlay(); });
        document.addEventListener('visibilitychange', function() { if (document.hidden) store.stop3DAutoPlay(); else store.start3DAutoPlay(); });
      }
      var details = document.getElementById('qx_design_showcase');
      if (details) {
        var noFeatured = Surface.featuredSelection !== null ? !Surface.resolveFeatured(store).length : (Array.isArray(store.heroFeatured) && !store.heroFeatured.length);
        details.hidden = noFeatured || Boolean(store.tenant && store.tenant.modules && store.tenant.modules.hero_vitrina === false);
        if (details.hidden || !details.open) store.stop3DAutoPlay();
      }
    },
    detail: function(store, product) {
      var modal = document.getElementById('qx_product_modal');
      modal.setAttribute('data-design', Surface.normalize(store.currentArchetype));
      lastDetailFocus = document.activeElement;
      var price = Number(product.priceWithTax);
      if (!(price > 0)) {
        document.getElementById('qx_pmodal_price').textContent = 'Consultar precio';
        document.getElementById('qx_pmodal_bar_price').textContent = 'Consultar precio';
      }
      var barSub = document.getElementById('qx_pmodal_bar_sub');
      if (barSub) barSub.textContent = store.isRealEstateBusiness() ? 'MXN · Consulta condiciones' : (Number(product.vatRate) > 0 ? 'IVA ' + Number(product.vatRate) + '% incluido' : 'MXN');
      if (store.isRealEstateBusiness()) document.querySelector('#qx_pmodal_bar_buy span').textContent = 'Consultar';
      document.querySelectorAll('.qx-pmodal-currency').forEach(function(el) { el.hidden = !(price > 0); });
      if (!product.satKey) document.getElementById('qx_pmodal_sat').hidden = true;
      else document.getElementById('qx_pmodal_sat').hidden = false;
      window.requestAnimationFrame(function() { var close = document.getElementById('qx_pmodal_close'); if (close) close.focus({ preventScroll: true }); });
    }
  };
  window.QuantixStoreDesigns = Surface;

  document.addEventListener('DOMContentLoaded', function() {
    document.body.setAttribute('data-design', Surface.normalize(document.body.getAttribute('data-archetype')));
    var sections = [
      ['.qx-navbar', 'identity'], ['#qx_hero_section', 'hero'],
      ['#qx_catalog_start', 'catalog'], ['.qx-catalog-controls', 'catalog'], ['.qx-main-container', 'catalog'],
      ['#qx_design_contact', 'contact'], ['#qx_btn_nav_agenda', 'contact'], ['.qx-concierge-float-pill', 'contact']
    ];
    sections.forEach(function(entry) { document.querySelectorAll(entry[0]).forEach(function(el) { el.setAttribute('data-qx-edit-section', entry[1]); }); });
    if (preview) {
      document.addEventListener('click', function(event) {
        if (!inspectorEnabled || !parentOrigin) return;
        var target = event.target.closest('[data-qx-edit-section]');
        if (!target) return;
        event.preventDefault(); event.stopImmediatePropagation();
        window.parent.postMessage({ source: 'QUANTIX_STOREFRONT_SELECTION', type: 'QUANTIX_STOREFRONT_SELECTION', payload: { section: target.getAttribute('data-qx-edit-section') } }, parentOrigin);
      }, true);
      document.addEventListener('pointerover', function(event) {
        if (!inspectorEnabled) return;
        var selected = event.target.closest('[data-qx-edit-section]');
        document.querySelectorAll('.qx-inspector-hover').forEach(function(el) { if (el !== selected) el.classList.remove('qx-inspector-hover'); });
        if (selected) selected.classList.add('qx-inspector-hover');
      });
    }
    document.addEventListener('keydown', function(event) {
      var modal = document.getElementById('qx_product_modal');
      if (!modal || !modal.classList.contains('active')) return;
      if (event.key === 'Escape' && lastDetailFocus && lastDetailFocus.isConnected) {
        window.setTimeout(function() { lastDetailFocus.focus({ preventScroll: true }); }, 0);
      }
      if (event.key !== 'Tab') return;
      var focusable = Array.from(modal.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex="0"]')).filter(function(el) { return el.getClientRects().length > 0; });
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    var close = document.getElementById('qx_pmodal_close');
    if (close) close.addEventListener('click', function() { if (lastDetailFocus && lastDetailFocus.isConnected) lastDetailFocus.focus({ preventScroll: true }); });
  });
})(window, document);
