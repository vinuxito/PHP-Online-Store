/* Shared shopping facts and continuity. Capability secrets remain transient. */
(function () {
  'use strict';

  // A one-use handoff belongs in the fragment, never in request or referrer URLs.
  let incomingHandoff = null;
  const fragment = new URLSearchParams(location.hash.slice(1));
  if (fragment.has('qx_handoff')) {
    incomingHandoff = fragment.get('qx_handoff');
    fragment.delete('qx_handoff');
    history.replaceState(history.state, '', location.pathname + location.search + (fragment.toString() ? '#' + fragment : ''));
  }
  const copy = value => JSON.parse(JSON.stringify(value));
  const freshId = () => {
    if (!window.crypto || !crypto.getRandomValues) throw new Error('Tu navegador necesita una actualización para guardar esta selección.');
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('');
  };

  class ShopperWorkspace {
    constructor(store) {
      this.store = store;
      this.tenant = String(store.tenant.emisorId);
      this.workspace = null;
      this.csrf = '';
      this.state = { intent: { query: '', budget: null }, shortlist: [], cart: copy(store.cart) };
      this.dirty = false;
      this.generation = 0;
      this.pending = null;
      this.busy = false;
      this.conflict = false;
      this.status = 'loading';
      this.secret = null;
      this.formDraft = false;
      try { const raw = localStorage.getItem('qx_pending_cart:' + this.tenant); this.pendingCart = raw && raw.length <= 32768 ? JSON.parse(raw) : null; } catch (e) { this.pendingCart = null; }
      this.build();
      this.ready = this.initialize();
    }

    build() {
      this.dialog = document.createElement('dialog');
      this.dialog.id = 'qx_workspace_dialog';
      this.dialog.className = 'qx-workspace';
      this.dialog.setAttribute('aria-labelledby', 'qx_workspace_title');
      this.dialog.innerHTML = `
        <header class="qx-workspace-header"><div><span class="qx-workspace-kicker">Tu espacio en esta tienda</span><h2 id="qx_workspace_title">Una selección que sigue contigo.</h2></div><button type="button" id="qx_workspace_close" class="qx-workspace-icon" aria-label="Cerrar selección">×</button></header>
        <div class="qx-workspace-body">
          <div class="qx-workspace-proof"><span id="qx_workspace_status" role="status" aria-live="polite">Abriendo tu selección…</span><button type="button" id="qx_workspace_retry" hidden>Reintentar guardado</button><button type="button" id="qx_workspace_refresh">Actualizar selección</button></div>
          <div id="qx_workspace_conflict" class="qx-workspace-warning" hidden><p>Hay dos versiones de tu selección. Tu edición sigue aquí. Elige cuál conservar antes de continuar.</p><button type="button" id="qx_workspace_use_server">Usar la selección guardada</button><button type="button" id="qx_workspace_use_draft">Guardar mi edición sobre ella</button></div>
          <form id="qx_workspace_intent" class="qx-workspace-intent"><label for="qx_workspace_query">¿Qué estás buscando?<input id="qx_workspace_query" maxlength="500" placeholder="Un regalo, algo para diario, una referencia…" autocomplete="off"></label><label for="qx_workspace_budget">Presupuesto total (MXN)<input id="qx_workspace_budget" type="number" min="0" max="100000000" step="0.01" inputmode="decimal" placeholder="Opcional"></label><p class="qx-workspace-help">Guarda preferencias de compra. Los datos de entrega y facturación van al registrar la solicitud.</p><button type="submit" class="qx-workspace-primary">Encontrar opciones</button></form>
          <section><div class="qx-workspace-section-title"><h3>Tu selección</h3><button type="button" id="qx_workspace_compare">Comparar datos</button></div><p class="qx-workspace-help">Guarda las opciones que te interesan y compáralas con los datos publicados por la tienda.</p><div id="qx_workspace_selected" class="qx-workspace-products"></div></section>
          <section id="qx_workspace_candidates_section"><h3>Opciones del catálogo</h3><p class="qx-workspace-help">Coincidencias de nombre, descripción y categoría. Los datos que faltan aparecen como no especificados.</p><div id="qx_workspace_candidates" class="qx-workspace-products"></div></section>
          <section class="qx-workspace-conditions"><div class="qx-workspace-section-title"><h3>Tu carrito, con datos actuales</h3><button type="button" id="qx_workspace_quote_refresh">Consultar condiciones</button></div><div id="qx_workspace_quote" aria-live="polite">Consulta el precio y la disponibilidad actuales de tu carrito.</div><div id="qx_workspace_order_receipt"></div></section>
          <details class="qx-workspace-continuity"><summary>Continuar en otro dispositivo o con tu agente</summary><p>Tu selección y tus preferencias siguen juntas. El agente puede leer o editar esta selección; registrar solicitudes, pagar y facturar quedan fuera de su acceso.</p><div class="qx-workspace-transfer-actions"><button type="button" id="qx_workspace_handoff">Continuar en otro dispositivo</button><button type="button" id="qx_workspace_grant">Dar acceso a mi agente · 30 min</button><button type="button" id="qx_workspace_revoke" hidden>Retirar accesos temporales</button></div><div id="qx_workspace_secret_box" hidden><label for="qx_workspace_secret" id="qx_workspace_secret_label">Acceso temporal</label><textarea id="qx_workspace_secret" readonly spellcheck="false"></textarea><p id="qx_workspace_secret_help"></p><button type="button" id="qx_workspace_copy">Copiar acceso</button><button type="button" id="qx_workspace_hide_secret">Ocultar acceso</button></div><p id="qx_workspace_access_status" role="status"></p></details>
        </div><footer class="qx-workspace-footer"><span id="qx_workspace_count">Elige con calma. Retoma cuando quieras.</span><button type="button" id="qx_workspace_continue" class="qx-workspace-primary">Ver mi carrito</button></footer>`;
      document.body.appendChild(this.dialog);
      this.$ = id => this.dialog.querySelector('#qx_workspace_' + id);
      document.getElementById('qx_workspace_launch').addEventListener('click', () => this.open());
      this.$('close').addEventListener('click', () => this.close());
      this.dialog.addEventListener('click', e => { if (e.target === this.dialog && (e.clientX < this.dialog.getBoundingClientRect().left || e.clientX > this.dialog.getBoundingClientRect().right)) this.close(); });
      this.dialog.addEventListener('close', () => { document.body.classList.remove('qx-workspace-open'); this.hideSecret(); });
      this.$('intent').addEventListener('submit', e => {
        e.preventDefault();
        const raw = this.$('budget').value;
        this.formDraft = false;
        this.edit({ intent: { query: this.$('query').value.trim(), budget: raw === '' ? null : Number(raw) } });
        this.renderCandidates();
      });
      ['query', 'budget'].forEach(id => this.$(id).addEventListener('input', () => { this.formDraft = true; this.message('Tu selección está guardada. Pulsa Encontrar opciones para guardar esta búsqueda.', 'pending'); }));
      this.$('retry').addEventListener('click', () => { if (this.claimExpired) { this.claimExpired = false; this.$('retry').textContent = 'Reintentar guardado'; } this.sync(); });
      this.$('refresh').addEventListener('click', () => this.refresh());
      this.$('quote_refresh').addEventListener('click', () => this.quote());
      this.$('compare').addEventListener('click', () => {
        const products = this.selectedProducts();
        if (products.length < 2) { this.message('Guarda al menos dos opciones para compararlas.', 'notice'); return; }
        const comparison = this.store.comparisonStudio;
        comparison.selected = products.slice(0, 4);
        comparison.renderDock();
        comparison.updateCardToggleButtons();
        this.close();
        comparison.openCrucible(products[0].id, products[1].id);
      });
      this.$('continue').addEventListener('click', () => {
        const products = this.selectedProducts();
        if (this.canShop() && this.state.cart.items.length) { this.close(); this.store.openCart(); }
        else if (products.length >= 2) this.$('compare').click();
        else if (products.length === 1) { this.close(); this.store.openProductModal(products[0]); }
        else { this.close(); document.getElementById('qx_product_grid').scrollIntoView({ behavior: 'smooth' }); }
      });
      this.$('handoff').addEventListener('click', () => this.access('handoff'));
      this.$('grant').addEventListener('click', () => this.access('grant'));
      this.$('revoke').addEventListener('click', () => this.revoke());
      this.$('copy').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(this.$('secret').value); this.$('access_status').textContent = 'Acceso copiado. Compártelo solo con quien quieras continuar.'; }
        catch (e) { this.$('secret').focus(); this.$('secret').select(); this.$('access_status').textContent = 'Seleccionamos el acceso para que puedas copiarlo.'; }
      });
      this.$('hide_secret').addEventListener('click', () => this.hideSecret());
      this.$('use_server').addEventListener('click', () => {
        this.state = copy(this.workspace.state); this.dirty = false; this.conflict = false; this.pending = null;
        this.clearPendingCart();
        this.hydrateCart(); this.render(true); this.message('Estás usando la selección guardada.', 'saved');
      });
      this.$('use_draft').addEventListener('click', () => { this.conflict = false; this.pending = null; this.generation++; this.sync(); });
      this.dialog.addEventListener('click', e => {
        if (e.target.closest('#qx_workspace_accept_prices')) { this.acceptPrices(); return; }
        if (e.target.closest('[data-qx-cart-remove]')) { const id = e.target.closest('[data-qx-cart-remove]').dataset.qxCartRemove; this.store.removeCartItem(id); return; }
        const target = e.target.closest('[data-qx-shortlist], [data-qx-remove], [data-qx-detail], [data-qx-cart]');
        if (!target) return;
        const id = target.dataset.qxShortlist || target.dataset.qxRemove || target.dataset.qxDetail || target.dataset.qxCart;
        if (target.hasAttribute('data-qx-shortlist')) this.addSelection(id);
        if (target.hasAttribute('data-qx-remove')) this.edit({ shortlist: this.state.shortlist.filter(x => String(x) !== id) });
        if (target.hasAttribute('data-qx-detail')) { const p = this.product(id); if (p) { this.close(); this.store.openProductModal(p); } }
        if (target.hasAttribute('data-qx-cart')) { const p = this.product(id); if (p) { this.close(); p.hasDecant ? this.store.openProductModal(p) : this.store.addToCart(p, 1); } }
      });
      window.addEventListener('focus', () => { if (this.workspace && !this.dirty && !this.busy && !this.formDraft) this.refresh(false); });
      this.freshnessTimer = window.setInterval(() => {
        if (this.dialog.open && document.visibilityState === 'visible' && this.workspace && !this.dirty && !this.pending && !this.busy && !this.formDraft && this.$('secret_box').hidden) this.refresh(false);
      }, 10000);
      this.renderCandidates();
    }

    canShop() { return window.QuantixDesignContract.capabilities(this.store.tenant).shop; }
    product(id) {
      const local = this.store.products.find(p => String(p.id) === String(id));
      const fresh = this.workspace && (this.workspace.products || []).find(p => String(p.id) === String(id)) || (this.recommendations || []).find(p => String(p.id) === String(id));
      const requested = this.workspace && this.workspace.state.shortlist.concat(this.workspace.state.cart.items.map(i => i.baseId || String(i.id).split('__')[0]));
      if (requested && requested.map(String).includes(String(id)) && !fresh) return null;
      if (!local && !fresh) return null;
      const product = Object.assign({}, local || {}, fresh || {});
      if (fresh && typeof fresh.stockTracked === 'boolean') product.inInventory = fresh.stockTracked;
      if (fresh && Object.prototype.hasOwnProperty.call(fresh, 'description')) { product.storeDesc = fresh.description; product.notes = fresh.description; }
      return product;
    }
    selectedProducts() { return (this.state.shortlist || []).map(id => this.product(id)).filter(Boolean); }
    escape(value) { const el = document.createElement('span'); el.textContent = String(value == null ? '' : value); return el.innerHTML; }
    money(value) { return value != null && value !== '' && Number.isFinite(Number(value)) ? '$ ' + this.store.formatMoney(Number(value)) + ' MXN' : 'Consultar precio'; }
    message(text, status) {
      this.status = status || this.status;
      this.$('status').textContent = text;
      this.$('status').dataset.state = this.status;
      this.$('retry').hidden = this.status !== 'error';
    }

    async request(action, payload, method) {
      const verb = method || 'POST';
      const data = Object.assign({ action: action, tenant: this.tenant }, payload || {});
      const query = new URLSearchParams(data).toString();
      const options = { method: verb, credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store' };
      if (verb === 'POST') { options.headers['Content-Type'] = 'application/json'; if (this.csrf) options.headers['X-QX-CSRF'] = this.csrf; options.body = JSON.stringify(data); }
      const response = await fetch('api/shopper_workspace.php' + (verb === 'GET' ? '?' + query : ''), options);
      const result = await response.json();
      if (!response.ok || result.Status !== 'OK') { const err = new Error(result.Error || result.message || 'No pudimos confirmar el guardado. Tu edición sigue en esta pantalla.'); err.response = result; err.httpStatus = response.status; throw err; }
      return result;
    }

    accept(result) {
      if (this.workspace && result.workspace && this.workspace.id === result.workspace.id && Number(result.workspace.revision) < Number(this.workspace.revision)) return false;
      this.workspace = result.workspace;
      if (this.store._repeatOrderApproval) {
        const receipt = this.workspace.last_order;
        if (!receipt || receipt.OrderFolio !== this.store._repeatOrderApproval.folio || JSON.stringify(this.orderCartIdentity(this.workspace.state.cart)) !== this.store._repeatOrderApproval.identity) delete this.store._repeatOrderApproval;
      }
      this.csrf = result.csrf || result.csrf_token || this.csrf;
      this.lastQuote = result.quote || this.workspace.quote || null;
      this.lastReceipt = result.receipt || this.workspace.receipt || this.lastReceipt;
      this.activeGrants = (this.workspace.grants || []).filter(g => (g.scopes || []).length);
      this.otherOwnersCount = Number(this.workspace.other_owners_count || 0);
      this.$('revoke').hidden = !this.activeGrants.length && !this.otherOwnersCount;
      try { localStorage.setItem('qx_workspace:' + this.tenant, String(this.workspace.id)); } catch (e) {}
      return true;
    }

    async initialize() {
      if (this.initializing) return this.initializing;
      this.initializing = this.initializeRequest();
      try { return await this.initializing; } finally { this.initializing = null; }
    }

    async initializeRequest() {
      try {
        let result;
        if (incomingHandoff && !this.claimAttempt) { this.claimAttempt = { token: incomingHandoff, operation_id: freshId() }; incomingHandoff = null; }
        if (this.claimAttempt) {
          result = await this.request('claim', this.claimAttempt);
          this.claimAttempt = null;
        } else {
          if (!this.createAttempt) this.createAttempt = { operation_id: freshId() };
          result = await this.request('create', this.createAttempt);
          this.createAttempt = null;
        }
        this.accept(result);
        const existingCart = this.state.cart;
        const localEdited = this.dirty;
        if (!localEdited) this.state = copy(this.workspace.state);
        if (!localEdited && this.pendingCart && this.pendingCart.workspace_id === this.workspace.id && this.pendingCart.cart && Array.isArray(this.pendingCart.cart.items)) {
          if (this.cartIdentity(this.pendingCart.cart) === this.cartIdentity(this.workspace.state.cart)) this.clearPendingCart();
          else { this.state.cart = copy(this.pendingCart.cart); this.dirty = true; this.conflict = true; this.generation++; }
        }
        // An existing local cart is scoped to this tenant and is adopted only by an empty workspace.
        if (!localEdited && existingCart.items.length && !(this.workspace.state.cart.items || []).length && result.created === true) {
          this.state.cart = existingCart; this.dirty = true; this.generation++;
        }
        this.hydrateCart(); this.render(true);
        if (this.conflict) this.message('Recuperamos cambios del carrito que no tenían confirmación. Elige qué versión conservar.', 'conflict');
        else if (this.dirty) await this.sync(); else this.savedMessage();
        this.recommend();
      } catch (e) {
        if (e.httpStatus === 401 || e.httpStatus === 403 || e.httpStatus === 410) {
          this.claimAttempt = null;
          this.claimExpired = true;
          this.message('Este acceso ya no está disponible. Pide un enlace nuevo desde el dispositivo donde guardaste la selección.', 'error');
          this.$('retry').textContent = 'Empezar una selección nueva';
        } else this.message('No pudimos confirmar que abrimos tu selección. Puedes reintentar el mismo acceso; tu trabajo sigue aquí.', 'error');
      }
    }

    savedMessage() {
      if (this.formDraft) { this.message('Tu selección está guardada. Pulsa Encontrar opciones para guardar esta búsqueda.', 'pending'); return; }
      const date = this.lastReceipt && this.lastReceipt.created_at;
      let time = '';
      if (date && !isNaN(Date.parse(date))) time = ' · ' + new Date(date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      const actor = this.lastReceipt && this.lastReceipt.actor === 'agent' ? ' por tu agente' : '';
      this.message('Selección guardada' + actor + ' en la tienda' + time + ' · versión ' + this.workspace.revision, 'saved');
      if (this.lastReceipt && this.lastReceipt.id) this.$('status').title = 'Comprobante de guardado: ' + this.lastReceipt.id;
    }

    edit(patch) {
      Object.assign(this.state, copy(patch)); this.dirty = true; this.generation++;
      this.lastQuote = null;
      this.recommendations = null;
      this.message('Tu edición está aquí. Guardando en la tienda…', 'pending'); this.render();
      this.sync();
    }

    async sync() {
      if (this.busy || this.conflict) return;
      if (!this.workspace) { await this.initialize(); return; }
      if (!this.dirty && !this.pending) return;
      this.busy = true;
      try {
        do {
          if (!this.pending) this.pending = { generation: this.generation, payload: { workspace_id: this.workspace.id, expected_revision: this.workspace.revision, operation_id: freshId(), state: copy(this.state) } };
          this.message('Tu edición está aquí. Guardando en la tienda…', 'pending');
          const sent = this.pending;
          const result = await this.request('update', sent.payload);
          this.accept(result); this.pending = null;
          if (this.pendingCart && this.cartIdentity(this.pendingCart.cart) === this.cartIdentity(this.workspace.state.cart)) this.clearPendingCart();
          if (sent.generation === this.generation) { this.state = copy(this.workspace.state); this.dirty = false; this.hydrateCart(); }
          this.render();
        } while (this.dirty);
        this.savedMessage();
        this.recommend();
      } catch (e) {
        if (e.httpStatus === 409) {
          try {
            const current = e.response.workspace ? e.response : await this.request('read', { workspace_id: this.workspace.id }, 'GET');
            this.accept(current); this.conflict = true; this.pending = null;
            this.message('Hay una selección más reciente. Conservamos tu edición para que puedas elegir.', 'conflict'); this.render();
          } catch (readError) { this.message('Tu selección cambió y aún no pudimos consultarla. Tu edición sigue aquí; vuelve a intentar.', 'error'); }
        }
        else if (e.httpStatus === 400 || e.httpStatus === 422) { this.pending = null; this.message(e.message + ' Tu edición sigue aquí; corrígela y vuelve a guardar.', 'error'); }
        else this.message('No se confirmó el guardado. Tu edición sigue aquí. Reintenta para consultar el mismo intento.', 'error');
      } finally { this.busy = false; }
    }

    async refresh(showPending = true) {
      if (this.dirty || this.pending || this.busy) { if (showPending) this.message('Primero guarda tu edición o resuelve el cambio de otra sesión.', this.conflict ? 'conflict' : 'error'); return; }
      if (!this.workspace) { await this.initialize(); return; }
      this.busy = true;
      if (showPending) this.message('Consultando tu selección guardada…', 'pending');
      try { const result = await this.request('read', { workspace_id: this.workspace.id }, 'GET'); this.accept(result); this.state = copy(this.workspace.state); this.hydrateCart(); this.render(true); this.savedMessage(); this.recommend(); }
      catch (e) { this.message('No pudimos actualizar tu selección. La última selección consultada sigue aquí.', 'error'); }
      finally { this.busy = false; }
    }

    async quote() {
      await this.sync();
      if (this.dirty || this.busy || this.conflict || !this.workspace) return;
      this.busy = true;
      const generation = this.generation;
      this.message('Consultando precios y disponibilidad en la tienda…', 'pending');
      try { const result = await this.request('quote', { workspace_id: this.workspace.id }, 'GET'); if (generation === this.generation && !this.dirty) { this.accept(result); this.state = copy(this.workspace.state); this.hydrateCart(); this.render(true); this.savedMessage(); } }
      catch (e) { this.message('No pudimos consultar las condiciones. Puedes reintentar; tu selección sigue aquí.', 'error'); }
      finally { this.busy = false; if (this.dirty) this.sync(); }
    }

    captureCart() {
      const cart = copy(this.store.cart);
      cart.items.forEach(item => { delete item.unavailable; if (item.priceWithTax == null) delete item.priceWithTax; });
      if (this.store._repeatOrderApproval && JSON.stringify(this.orderCartIdentity(cart)) !== this.store._repeatOrderApproval.identity) delete this.store._repeatOrderApproval;
      const safeCart = { items: cart.items.map(item => {
        const safe = {};
        ['id','baseId','accentId','qty','isDecant','isSubscription','isDuoPack','isGift','customFinish','priceWithTax','frequencyMonths','discountPct','bundleDiscountPercent'].forEach(key => { if (Object.prototype.hasOwnProperty.call(item, key)) safe[key] = item[key]; });
        return safe;
      }) };
      this.pendingCart = { workspace_id: this.workspace && this.workspace.id, cart: safeCart };
      try { localStorage.setItem('qx_pending_cart:' + this.tenant, JSON.stringify(this.pendingCart)); } catch (e) {}
      this.edit({ cart: cart });
    }
    cartIdentity(cart) { return JSON.stringify((cart.items || []).map(item => [String(item.id), Number(item.qty || item.quantity || 1), Boolean(item.isDecant), Boolean(item.isSubscription), Boolean(item.isDuoPack), Boolean(item.isGift), item.customFinish || '', item.priceWithTax == null ? null : Number(item.priceWithTax)])); }
    orderCartIdentity(cart = this.store.cart) {
      return (cart.items || []).map(item => [String(item.id), Number(item.qty || item.quantity || 1), Boolean(item.isDecant), Boolean(item.isSubscription), Boolean(item.isDuoPack), Boolean(item.isGift), item.customFinish || '']).sort((a, b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0);
    }
    registeredSelectionReceipt(cart = this.store.cart) {
      const receipt = this.workspace && this.workspace.last_order;
      if (!receipt || !receipt.OrderFolio) return null;
      // A historical receipt with unavailable item identity needs human review, never an assumption of a new request.
      return !Array.isArray(receipt.cart_identity) || JSON.stringify(this.orderCartIdentity(cart)) === JSON.stringify(receipt.cart_identity) ? receipt : null;
    }
    repeatOrderApproved(receipt, cart = this.store.cart) {
      const approval = this.store._repeatOrderApproval;
      return Boolean(receipt && approval && receipt.OrderFolio === approval.folio && JSON.stringify(this.orderCartIdentity(cart)) === approval.identity);
    }
    clearPendingCart() { this.pendingCart = null; try { localStorage.removeItem('qx_pending_cart:' + this.tenant); } catch (e) {} }
    captureShortlist(ids) { this.edit({ shortlist: ids.map(String).slice(0, 4) }); }
    addSelection(id) {
      if ((this.state.shortlist || []).map(String).includes(String(id))) { this.message('Esta opción ya está en tu selección.', 'notice'); return; }
      if (this.state.shortlist.length >= 4) { this.message('Puedes guardar cuatro opciones. Quita una para elegir otra.', 'notice'); return; }
      this.edit({ shortlist: this.state.shortlist.concat(String(id)) });
      if (this.dialog.open) {
        const next = this.$('selected').querySelector('[data-qx-detail="' + CSS.escape(String(id)) + '"]');
        if (next) next.focus({ preventScroll: true });
        this.$('selected').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
    }

    hydrateCart() {
      const quoteLines = (this.lastQuote && this.lastQuote.lines) || [];
      this.store.cart = { items: (this.state.cart.items || []).map(item => {
        const base = item.baseId || String(item.id).split('__')[0];
        const product = this.product(base);
        const format = item.isDecant ? 'decant' : 'full';
        const line = quoteLines.find(l => String(l.item_id || l.id) === String(item.id) || (String(l.base_id || l.id) === String(base) && l.format === format));
        if (!product) return Object.assign({}, item, { baseId: base, qty: Number(item.qty || item.quantity || 1), name: 'Artículo pendiente de disponibilidad', thumb: '', priceWithTax: null, unitPrice: null, vatRate: 0, unavailable: true });
        const changed = this.lastQuote && (this.lastQuote.price_changes || []).length && item.priceWithTax != null;
        const rawPrice = changed ? item.priceWithTax : line ? line.priceWithTax : item.priceWithTax == null ? product.priceWithTax : item.priceWithTax;
        const price = rawPrice == null ? null : Number(rawPrice);
        const vatRate = line ? Number(line.vatRate) : Number(product.vatRate == null ? 16 : product.vatRate);
        return Object.assign({}, item, { baseId: product.id, qty: Number(item.qty || item.quantity || 1), code: product.code, sku: product.sku, name: line && line.name || product.name, thumb: product.cover, priceWithTax: price, unitPrice: price == null ? null : line ? Number(line.unitPrice) : price / (1 + vatRate / 100), vatRate: vatRate, unavailable: price == null });
      }) };
      this.store.saveCart({ fromWorkspace: true });
    }

    render(setInputs = false) {
      this.$('conflict').hidden = !this.conflict;
      if (setInputs && !this.formDraft) { this.$('query').value = this.state.intent.query || ''; this.$('budget').value = this.state.intent.budget == null ? '' : this.state.intent.budget; }
      const products = this.selectedProducts();
      const visibleSelection = (this.state.shortlist || []).map(id => this.product(id) || { id: id, name: 'Opción no disponible en el catálogo actual', priceWithTax: null, unavailable: true });
      const selectionHTML = visibleSelection.length ? visibleSelection.map(p => this.card(p, true)).join('') : '<p class="qx-workspace-empty">Guarda una opción desde su ficha o elige una del catálogo de abajo.</p>';
      if (this.$('selected').innerHTML !== selectionHTML) this.$('selected').innerHTML = selectionHTML;
      this.$('compare').disabled = products.length < 2;
      this.$('count').textContent = products.length + ' opciones · ' + (this.state.cart.items || []).reduce((n, i) => n + Number(i.qty || i.quantity || 1), 0) + ' artículos en tu carrito';
      this.$('continue').textContent = this.canShop() && this.state.cart.items.length ? 'Ver mi carrito' : products.length >= 2 ? 'Comparar opciones' : products.length === 1 ? (products[0].hasDecant && this.canShop() ? 'Elegir formato' : 'Ver esta opción') : 'Explorar catálogo';
      const launcher = document.getElementById('qx_workspace_launch');
      launcher.setAttribute('aria-label', 'Tu selección · ' + products.length + ' opciones');
      const badge = launcher.querySelector('[data-workspace-count]'); if (badge) badge.textContent = products.length || '';
      this.renderCandidates(); this.renderQuote();
    }

    card(product, selected) {
      const id = this.escape(product.id), budget = this.state.intent.budget;
      if (product.unavailable) return '<article class="qx-workspace-product"><div><h4>' + this.escape(product.name) + '</h4><p>Consulta la disponibilidad con la tienda.</p><button type="button" data-qx-remove="' + id + '">Quitar opción</button></div></article>';
      const reason = product.workspaceReasons || (budget != null && Number(product.priceWithTax) > 0 && Number(product.priceWithTax) <= budget ? 'Precio del artículo dentro de tu presupuesto.' : product.category || 'Datos publicados por la tienda.');
      return `<article class="qx-workspace-product">${product.cover ? '<img alt="" loading="lazy" src="' + this.escape(product.cover) + '">' : '<span class="qx-workspace-placeholder" aria-hidden="true">◇</span>'}<div><h4>${this.escape(product.name)}</h4><p>${Number(product.priceWithTax) > 0 ? this.money(product.priceWithTax) : 'Consultar precio'}</p><small>${this.escape(reason)}</small><div class="qx-workspace-product-actions"><button type="button" data-qx-detail="${id}">Ver detalle</button>${selected ? '<button type="button" data-qx-remove="' + id + '" aria-label="Quitar ' + this.escape(product.name) + ' de tu selección">Quitar</button>' : '<button type="button" data-qx-shortlist="' + id + '">Guardar opción</button>'}${selected && this.canShop() && Number(product.priceWithTax) > 0 ? '<button type="button" data-qx-cart="' + id + '">' + (product.hasDecant ? 'Elegir formato' : 'Agregar al carrito') + '</button>' : ''}</div></div></article>`;
    }

    renderCandidates() {
      const words = String(this.state.intent.query || '').toLocaleLowerCase('es').split(/\s+/).filter(Boolean);
      const budget = this.state.intent.budget;
      const selected = (this.state.shortlist || []).map(String);
      let products = this.store.products.map(p => this.product(p.id)).filter(p => p && !selected.includes(String(p.id)));
      if (this.recommendations) {
        products = this.recommendations.map(r => { const p = this.product(r.id); return p ? Object.assign({}, p, r, { workspaceReasons: (r.matchReasons || []).join(' · ') }) : null; }).filter(p => p && !selected.includes(String(p.id)));
        this.$('candidates').innerHTML = products.slice(0, 6).map(p => this.card(p, false)).join('') || '<p class="qx-workspace-empty">No encontramos otras opciones con esos datos publicados. Cambia las palabras o el presupuesto.</p>';
        return;
      }
      if (words.length) products = products.filter(p => {
        const facts = [p.name, p.storeDesc, p.notes, p.category, p.sku, p.family, (p.accords || []).join(' ')].join(' ').toLocaleLowerCase('es');
        return words.some(word => word.length > 1 && facts.includes(word));
      });
      if (budget != null) products = products.filter(p => Number(p.priceWithTax) > 0 && Number(p.priceWithTax) <= budget);
      this.$('candidates').innerHTML = products.slice(0, 6).map(p => this.card(p, false)).join('') || '<p class="qx-workspace-empty">No encontramos opciones con esos datos publicados. Cambia las palabras o el presupuesto; también puedes guardar opciones desde sus fichas.</p>';
    }

    async recommend() {
      if (!this.workspace || this.dirty || this.conflict) return;
      const revision = this.workspace.revision;
      try { const result = await this.request('recommend', { workspace_id: this.workspace.id }, 'GET'); if (!this.dirty && this.workspace.revision === revision && result.workspace.revision === revision) { this.recommendations = result.recommendations || []; this.renderCandidates(); } }
      catch (e) { /* The factual local catalog remains available when suggestions cannot be fetched. */ }
    }

    renderQuote() {
      const order = this.workspace && (this.workspace.last_order || this.workspace.order_receipt || this.workspace.state.last_order || this.workspace.state.order_receipt);
      this.$('order_receipt').textContent = order ? 'Solicitud ' + (order.OrderFolio || order.folio || '') + ' · al registrarse: pago sin verificar y factura sin emitir. Consulta el estado actual con la tienda.' : '';
      const quote = this.lastQuote;
      if (!quote || this.dirty) { this.$('quote').textContent = this.dirty ? 'Guarda tu selección para consultar sus condiciones actuales.' : 'Consulta el precio y la disponibilidad actuales de tu carrito.'; return; }
      if (!(quote.lines || []).length && !(this.state.cart.items || []).length) { this.$('quote').textContent = this.canShop() ? 'Agrega artículos al carrito para consultar el total.' : 'Consulta las condiciones y la disponibilidad desde la ficha de cada opción.'; return; }
      const lines = (quote.lines || []).map(line => '<li><span>' + this.escape(line.name) + ' × ' + this.escape(line.qty) + '</span><strong>' + this.money(line.total) + '</strong></li>').join('');
      let time = quote.checked_at && !isNaN(Date.parse(quote.checked_at)) ? new Date(quote.checked_at).toLocaleString('es-MX') : 'en esta consulta';
      this.$('quote').innerHTML = '<ul class="qx-workspace-quote-lines">' + lines + '</ul><div class="qx-workspace-total"><span>Total actual</span><strong>' + this.money(quote.total) + '</strong></div><p>Consultado ' + this.escape(time) + '. La tienda debe confirmar la disponibilidad. No hay reserva de inventario ni pago registrado.</p>' + (quote.within_budget === false ? '<p class="qx-workspace-warning">El total supera tu presupuesto. Ajusta la selección antes de continuar.</p>' : '') + (quote.price_changes && quote.price_changes.length ? '<p class="qx-workspace-warning">Cambió el precio publicado de uno o más artículos. Revisa el total actual antes de registrar una solicitud.</p><button type="button" id="qx_workspace_accept_prices">Aceptar precios actuales</button>' : '') + (quote.blockers || []).map(b => '<div class="qx-workspace-warning">' + this.escape(b.message) + (b.id ? '<button type="button" data-qx-cart-remove="' + this.escape(b.item_id || b.id) + '">Quitar este artículo</button>' : '') + '</div>').join('');
    }

    async access(action) {
      await this.sync();
      if (!this.workspace || this.dirty || this.conflict || this.busy || this.formDraft) { this.$('access_status').textContent = 'Guarda tu selección y tu búsqueda antes de compartirlas.'; return; }
      this.$('access_status').textContent = 'Preparando el acceso temporal…';
      const button = this.$(action); button.disabled = true;
      try {
        if (!this.pendingAccess || this.pendingAccess.action !== action) this.pendingAccess = { action: action, payload: { workspace_id: this.workspace.id, expected_revision: this.workspace.revision, operation_id: freshId(), scopes: ['read', 'write'], ttl_seconds: action === 'grant' ? 1800 : 600 } };
        const result = await this.request(action, this.pendingAccess.payload);
        this.pendingAccess = null;
        if (result.workspace) this.accept(result);
        if (!result.token) throw new Error('El acceso ya se creó. Solicita uno nuevo para compartirlo.');
        const expiry = new Date(result.expires_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        if (action === 'grant') {
          this.latestGrant = result.grant_id;
          const endpoint = new URL('api/shopper_workspace.php', location.href).href;
          this.$('secret').value = JSON.stringify({ endpoint: endpoint, tenant: this.tenant, workspace_id: this.workspace.id, authorization: 'Bearer ' + result.token, allowed_actions: ['read', 'update', 'quote', 'recommend'], expires_at: result.expires_at }, null, 2);
          this.$('secret_label').textContent = 'Acceso para tu agente';
          this.$('secret_help').textContent = 'Este acceso permite leer y editar tu selección hasta las ' + expiry + '. Tu agente debe consultar la versión antes de editar. No permite solicitudes, pagos ni facturas.';
          this.$('revoke').hidden = false;
        } else {
          this.latestGrant = result.grant_id;
          const link = new URL(location.href); link.hash = new URLSearchParams({ qx_handoff: result.token }).toString();
          this.$('secret').value = link.href;
          this.$('secret_label').textContent = 'Enlace para tu otro dispositivo';
          this.$('secret_help').textContent = 'Abre este enlace una sola vez antes de las ' + expiry + '. Quien lo abra tendrá acceso a tu selección de esta tienda.';
          this.$('revoke').hidden = false;
        }
        this.$('secret_box').hidden = false;
        this.$('access_status').textContent = 'Acceso temporal creado. Cópialo para continuar.';
      } catch (e) { this.$('access_status').textContent = 'No pudimos confirmar el acceso temporal. Puedes consultar tu selección y volver a intentarlo.'; }
      finally { button.disabled = false; }
    }

    async revoke() {
      if (((!this.activeGrants || !this.activeGrants.length) && !this.otherOwnersCount && !this.pendingRevoke) || !this.workspace) return;
      this.$('revoke').disabled = true;
      try {
        do {
          const nextGrantId = (this.activeGrants && this.activeGrants.length) ? this.activeGrants[0].grant_id : 'all';
          if (!this.pendingRevoke) this.pendingRevoke = { workspace_id: this.workspace.id, expected_revision: this.workspace.revision, operation_id: freshId(), grant_id: nextGrantId };
          const result = await this.request('revoke', this.pendingRevoke);
          this.pendingRevoke = null;
          if (result.workspace) this.accept(result);
        } while (this.activeGrants.length || this.otherOwnersCount > 0);
        this.latestGrant = null; this.hideSecret(); this.$('revoke').hidden = true; this.$('access_status').textContent = 'Accesos retirados. Los agentes y enlaces anteriores ya no pueden abrir esta selección.';
      } catch (e) { this.$('access_status').textContent = 'No se confirmó que retiramos el acceso. Reintenta antes de compartir más información.'; }
      finally { this.$('revoke').disabled = false; }
    }
    hideSecret() { this.$('secret').value = ''; this.$('secret_box').hidden = true; }
    acceptPrices() {
      if (!this.lastQuote || this.dirty || this.conflict) return;
      const lines = this.lastQuote.lines || [];
      const items = (this.state.cart.items || []).map(item => {
        const base = item.baseId || String(item.id).split('__')[0], format = item.isDecant ? 'decant' : 'full';
        const line = lines.find(l => String(l.item_id || l.id) === String(item.id) || (String(l.base_id || l.id) === String(base) && l.format === format));
        return line ? Object.assign({}, item, { priceWithTax: Number(line.priceWithTax) }) : item;
      });
      this.edit({ cart: { items: items } });
    }
    recordOrder() { if (!this.dirty && !this.busy) this.refresh(); }
    open() { this.dialog.showModal(); document.body.classList.add('qx-workspace-open'); if (!this.dirty && !this.busy) this.refresh(false); this.$('query').focus({ preventScroll: true }); }
    close() { this.dialog.close(); }
  }

  window.QuantixShopperWorkspace = ShopperWorkspace;
})();
