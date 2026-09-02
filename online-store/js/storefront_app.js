/**
 * js/storefront_app.js — Quantix Storefront Luxury Showroom Engine
 */

(function(window, $) {
  'use strict';

  // =========================================================================
  // REAL-TIME FLOATING FLACON & ALPHA MATTING ENGINE (60 FPS / <6ms)
  // =========================================================================
  class FloatingFlaconEngine {
    constructor() {
      this.cache = new Map();
      this.pending = new Map();
    }

    async isolateSilhouette(imageOrUrl, options = {}) {
      let imageUrl = typeof imageOrUrl === 'string' ? imageOrUrl : (imageOrUrl.src || '');
      if (!imageUrl || imageUrl.includes('no-image.svg') || imageUrl.startsWith('data:image/svg')) {
        return imageUrl;
      }
      if (this.cache.has(imageUrl)) {
        return this.cache.get(imageUrl);
      }
      if (this.pending.has(imageUrl)) {
        return this.pending.get(imageUrl);
      }

      const promise = new Promise((resolve) => {
        const processImage = (img) => {
          try {
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;
            if (w === 0 || h === 0) return resolve(imageUrl);

            // Limit processing resolution to maintain crisp responsive quality and high throughput
            const maxDim = 650;
            let targetW = w;
            let targetH = h;
            if (Math.max(w, h) > maxDim) {
              const scale = maxDim / Math.max(w, h);
              targetW = Math.round(w * scale);
              targetH = Math.round(h * scale);
            }

            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return resolve(imageUrl);

            ctx.drawImage(img, 0, 0, targetW, targetH);
            const imgData = ctx.getImageData(0, 0, targetW, targetH);
            const data = imgData.data;
            const len = data.length;

            // Sample corner pixels to check if background is uniform studio backdrop
            const sampleCorners = [
              [0, 0],
              [targetW - 1, 0],
              [0, targetH - 1],
              [targetW - 1, targetH - 1],
              [Math.floor(targetW / 2), 0]
            ];

            let sumR = 0, sumG = 0, sumB = 0;
            for (let c = 0; c < sampleCorners.length; c++) {
              const idx = (sampleCorners[c][1] * targetW + sampleCorners[c][0]) * 4;
              sumR += data[idx];
              sumG += data[idx + 1];
              sumB += data[idx + 2];
            }
            const bgR = sumR / sampleCorners.length;
            const bgG = sumG / sampleCorners.length;
            const bgB = sumB / sampleCorners.length;

            // Only process if corner background is light/studio (luminance > 150)
            const bgLuma = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;
            if (bgLuma < 150) {
              this.cache.set(imageUrl, imageUrl);
              return resolve(imageUrl);
            }

            const tMin = options.thresholdMin || 18;
            const tMax = options.thresholdMax || 38;
            const tRange = tMax - tMin;

            for (let i = 0; i < len; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];

              // Fast Euclidean color distance from studio background
              const dr = r - bgR;
              const dg = g - bgG;
              const db = b - bgB;
              const dist = Math.sqrt(dr * dr + dg * dg + db * db);

              if (dist <= tMin) {
                data[i + 3] = 0; // Pure Transparent
              } else if (dist < tMax) {
                // Smooth anti-aliased edge feathering (Smoothstep)
                const x = (dist - tMin) / tRange;
                const smoothFactor = x * x * (3 - 2 * x);
                data[i + 3] = Math.round(smoothFactor * 255);
              }
            }

            ctx.putImageData(imgData, 0, 0);

            const transparentUrl = canvas.toDataURL('image/png');
            this.cache.set(imageUrl, transparentUrl);
            resolve(transparentUrl);
          } catch (err) {
            resolve(imageUrl);
          }
        };

        if (typeof imageOrUrl !== 'string' && imageOrUrl.complete && imageOrUrl.naturalWidth > 0) {
          processImage(imageOrUrl);
        } else {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => processImage(img);
          img.onerror = () => resolve(imageUrl);
          img.src = imageUrl;
        }
      });

      this.pending.set(imageUrl, promise);
      const result = await promise;
      this.pending.delete(imageUrl);
      return result;
    }
  }

  window.FloatingFlaconEngine = FloatingFlaconEngine;

  // =========================================================================
  // WEATHER ENGINE & THERMAL EVAPORATION ADVISOR (Feature 3)
  // =========================================================================
  class WeatherEngine {
    constructor() {
      this.cities = [
        { name: 'Guadalajara', temp: 28, condition: 'Cálido y Despejado', icon: '☀️' },
        { name: 'Ciudad de México', temp: 19, condition: 'Templado / Lluvia Ligera', icon: '⛅' },
        { name: 'Monterrey', temp: 34, condition: 'Calor Intenso', icon: '🔥' },
        { name: 'Cancún', temp: 31, condition: 'Bochorno Tropical', icon: '🌴' },
        { name: 'Puebla', temp: 16, condition: 'Fresco y Húmedo', icon: '🧥' },
        { name: 'Tijuana', temp: 22, condition: 'Brisa Costera', icon: '🌊' }
      ];
      this.currentCityIdx = 0;
    }

    getCurrentCity() {
      return this.cities[this.currentCityIdx];
    }

    cycleNextCity() {
      this.currentCityIdx = (this.currentCityIdx + 1) % this.cities.length;
      return this.getCurrentCity();
    }

    setCityByName(name) {
      const idx = this.cities.findIndex(c => c.name.toLowerCase().includes(name.toLowerCase()));
      if (idx !== -1) {
        this.currentCityIdx = idx;
      }
      return this.getCurrentCity();
    }

    calculateThermalMatch(radarData, currentTemp = null) {
      const city = this.getCurrentCity();
      const temp = currentTemp !== null ? currentTemp : city.temp;
      const min = (radarData && radarData.tempMin) ? radarData.tempMin : 15;
      const max = (radarData && radarData.tempMax) ? radarData.tempMax : 30;
      const opt = (min + max) / 2;

      const diff = Math.abs(temp - opt);
      let matchScore = Math.round(Math.max(45, Math.min(100, 100 - Math.pow(diff / 14, 2) * 35)));

      let advice = '';
      if (matchScore >= 90) {
        advice = `🔥 <strong>Rendimiento Ideal Hoy (${temp}°C):</strong> La temperatura actual de ${city.name} es perfecta para la evaporación de estas notas aromáticas. Proyección al 100%.`;
      } else if (temp > max + 2) {
        advice = `☀️ <strong>Día Caluroso (${temp}°C):</strong> Fragancia potente. Con el calor de ${city.name}, te recomendamos 2 atomizaciones discretas para no saturar.`;
      } else if (temp < min - 2) {
        advice = `❄️ <strong>Clima Fresco (${temp}°C):</strong> En días frescos las notas cítricas se perciben sutiles. Aplica 1 atomización extra en bufanda o solapa.`;
      } else {
        advice = `✨ <strong>Buen Rendimiento (${temp}°C):</strong> Balance equilibrado para el clima de ${city.name}. 3 a 4 atomizaciones durarán toda la jornada.`;
      }

      return {
        city,
        temp,
        matchScore,
        advice
      };
    }
  }

  // =========================================================================
  // SCENT TRAIL RADAR ENGINE (Feature 3)
  // =========================================================================
  class ScentRadarEngine {
    constructor() {
      this.axes = [
        { key: 'proyeccion', label: 'Proyección', icon: '🚀', min: 1, max: 10, unit: '/10', desc: 'Alcance olfativo: Distancia a la que se percibe tu aroma.' },
        { key: 'dulzorFrescura', label: 'Espectro', icon: '🌊', min: -100, max: 100, unit: '', desc: 'Polaridad: De Cítrico/Acuático (-100) a Cálido/Vainilla (+100).' },
        { key: 'elogios', label: 'Elogios', icon: '👑', min: 1, max: 100, unit: '%', desc: 'Probabilidad de recibir cumplidos en eventos y citas.' },
        { key: 'longevidad', label: 'Longevidad', icon: '⏳', min: 3, max: 16, unit: 'h', desc: 'Horas reales de permanencia verificada en piel.' },
        { key: 'versatilidad', label: 'Versatilidad', icon: '☀️', min: 1, max: 100, unit: '%', desc: 'Adaptabilidad para uso diario, oficina o noche.' },
        { key: 'rangoTermico', label: 'Rango Térmico', icon: '🌡️', min: 10, max: 40, unit: '°C', desc: 'Temperatura ambiente ideal para máxima evaporación.' }
      ];
    }

    normalizeValue(key, val, radarObj) {
      if (key === 'proyeccion') {
        return Math.max(0.1, Math.min(1.0, (val || 7) / 10));
      }
      if (key === 'dulzorFrescura') {
        const v = typeof val === 'number' ? val : 0;
        return Math.max(0.15, Math.min(1.0, (Math.abs(v) / 100) * 0.7 + 0.3));
      }
      if (key === 'elogios') {
        return Math.max(0.1, Math.min(1.0, (val || 85) / 100));
      }
      if (key === 'longevidad') {
        const h = val || 8.0;
        return Math.max(0.15, Math.min(1.0, (Math.min(16, Math.max(3, h)) - 3) / 13));
      }
      if (key === 'versatilidad') {
        return Math.max(0.1, Math.min(1.0, (val || 75) / 100));
      }
      if (key === 'rangoTermico') {
        const min = radarObj ? radarObj.tempMin || 15 : 15;
        const max = radarObj ? radarObj.tempMax || 30 : 30;
        const span = max - min;
        return Math.max(0.2, Math.min(1.0, span / 25));
      }
      return 0.7;
    }

    generateSvgMarkup(radarBase, radarRival = null, auraColor = 'cyan') {
      const radius = 95;
      const numAxes = 6;

      // 1. Grid Polygons (25%, 50%, 75%, 100%)
      let gridSvg = '';
      [0.25, 0.50, 0.75, 1.0].forEach(level => {
        const points = [];
        for (let i = 0; i < numAxes; i++) {
          const angle = (i * Math.PI / 3) - (Math.PI / 2);
          const r = radius * level;
          const x = (r * Math.cos(angle)).toFixed(1);
          const y = (r * Math.sin(angle)).toFixed(1);
          points.push(`${x},${y}`);
        }
        gridSvg += `<polygon class="qx-radar-grid-poly" points="${points.join(' ')}" />`;
      });

      // 2. Axis lines & Labels
      let axesSvg = '';
      const labelRadius = radius + 22;
      for (let i = 0; i < numAxes; i++) {
        const angle = (i * Math.PI / 3) - (Math.PI / 2);
        const x = (radius * Math.cos(angle)).toFixed(1);
        const y = (radius * Math.sin(angle)).toFixed(1);
        const lx = (labelRadius * Math.cos(angle)).toFixed(1);
        const ly = (labelRadius * Math.sin(angle)).toFixed(1);

        axesSvg += `<line class="qx-radar-axis-line" x1="0" y1="0" x2="${x}" y2="${y}" />`;
        axesSvg += `<text class="qx-radar-axis-label" x="${lx}" y="${ly}">${this.axes[i].icon} ${this.axes[i].label}</text>`;
      }

      // 3. Base Polygon & Nodes
      const basePoints = [];
      const baseNodes = [];
      for (let i = 0; i < numAxes; i++) {
        const key = this.axes[i].key;
        const rawVal = (radarBase && radarBase[key] !== undefined) ? radarBase[key] : (key === 'rangoTermico' ? `${radarBase?.tempMin || 15}-${radarBase?.tempMax || 30}°C` : 0);
        const norm = this.normalizeValue(key, rawVal, radarBase);
        const angle = (i * Math.PI / 3) - (Math.PI / 2);
        const r = radius * norm;
        const x = (r * Math.cos(angle)).toFixed(1);
        const y = (r * Math.sin(angle)).toFixed(1);
        basePoints.push(`${x},${y}`);
        baseNodes.push({ x, y, axisIdx: i, value: rawVal, desc: this.axes[i].desc, label: this.axes[i].label });
      }

      let polyBaseSvg = `<polygon class="qx-radar-poly-base" points="${basePoints.join(' ')}" />`;
      let nodesSvg = '';
      baseNodes.forEach(node => {
        nodesSvg += `<circle class="qx-radar-node base" cx="${node.x}" cy="${node.y}" data-axis="${node.axisIdx}" data-label="${node.label}" data-desc="${node.desc}" />`;
      });

      // 4. Optional Rival Polygon (in Comparison Mode)
      let rivalSvg = '';
      if (radarRival) {
        const rivalPoints = [];
        for (let i = 0; i < numAxes; i++) {
          const key = this.axes[i].key;
          const rawVal = (radarRival && radarRival[key] !== undefined) ? radarRival[key] : (key === 'rangoTermico' ? `${radarRival?.tempMin || 15}-${radarRival?.tempMax || 30}°C` : 0);
          const norm = this.normalizeValue(key, rawVal, radarRival);
          const angle = (i * Math.PI / 3) - (Math.PI / 2);
          const r = radius * norm;
          const x = (r * Math.cos(angle)).toFixed(1);
          const y = (r * Math.sin(angle)).toFixed(1);
          rivalPoints.push(`${x},${y}`);
        }
        rivalSvg = `<polygon class="qx-radar-poly-rival" points="${rivalPoints.join(' ')}" />`;
      }

      return `
        <g class="qx-radar-grid">${gridSvg}</g>
        <g class="qx-radar-axes">${axesSvg}</g>
        <g class="qx-radar-polys">${polyBaseSvg}${rivalSvg}</g>
        <g class="qx-radar-nodes">${nodesSvg}</g>
      `;
    }
  }

  // =========================================================================
  // DIGITAL DECANT PASSPORT & BLIND-BUY SHIELD ENGINE (Feature 5)
  // =========================================================================
  class DecantPassportEngine {
    constructor(storefront) {
      this.storefront = storefront;
      this.passportData = null;
    }

    async loadPassport(code = 'PASS-2026-VIP') {
      try {
        const tenant = this.storefront.tenant?.emisorId || '00163e311ce9a3e711f1591962781ba6';
        const res = await fetch(`api/passport.php?tenant=${encodeURIComponent(tenant)}&code=${encodeURIComponent(code)}`);
        const data = await res.json();
        if (data.Status === 'OK') {
          this.passportData = data;
          this.renderPassportUI(data);
        }
      } catch (err) {
        console.error('Error loading passport:', err);
      }
    }

    renderPassportUI(data) {
      if (!data || !data.Passport) return;

      const p = data.Passport;
      const stats = data.Stats || { total: 0, stamped: 0, pending: 0, totalCredit: 0 };

      $('#qx_pass_client_name').text(p.clientName || 'Alexander von Humboldt');
      $('#qx_pass_access_code').text(p.code || 'PASS-2026-VIP');
      $('#qx_pass_total_credit').text(`$ ${this.storefront.formatMoney(stats.totalCredit)} MXN`);

      $('#qx_pass_stat_total').text(stats.total);
      $('#qx_pass_stat_stamped').text(stats.stamped);
      $('#qx_pass_stat_pending').text(stats.pending);

      if (stats.pending > 0) {
        $('#qx_passport_badge').text(stats.pending).show();
      } else {
        $('#qx_passport_badge').hide();
      }

      const container = $('#qx_passport_entries_container');
      container.empty();

      if (!data.Entries || data.Entries.length === 0) {
        container.html(`
          <div style="text-align:center; padding:30px; color:var(--qx-text-muted);">
            <div style="font-size:36px; margin-bottom:10px;">🧪</div>
            <div style="font-weight:700; color:#fff; margin-bottom:4px;">No tienes decants registrados aún</div>
            <div style="font-size:12px;">Adquiere una muestra de cata de 5ml para activar tu Pasaporte y garantía Blind-Buy Shield.</div>
          </div>
        `);
        return;
      }

      const self = this;

      data.Entries.forEach(entry => {
        const isStamped = entry.isStamped;
        const flaconImg = entry.photo ? (entry.photo.startsWith('http') ? entry.photo : entry.photo) : 'images/placeholder_flacon.png';

        let bodyHtml = '';

        if (isStamped) {
          // Stamped Review & Active Voucher
          let voucherHtml = '';
          if (entry.voucher && !entry.voucher.isRedeemed) {
            voucherHtml = `
              <div class="qx-cashback-voucher-card">
                <div class="qx-voucher-code-block">
                  <div style="font-size:10px; font-weight:800; color:#fbbf24; text-transform:uppercase; letter-spacing:0.5px;">CUPÓN 100% CASH-BACK DESBLOQUEADO</div>
                  <div class="qx-voucher-code-val">${self.storefront.esc(entry.voucher.code)}</div>
                  <div class="qx-voucher-amount-val">✨ Crédito Bonificable: $ ${self.storefront.formatMoney(entry.voucher.amount)} MXN</div>
                  <div class="qx-voucher-expiry-chip">⏳ Válido por ${entry.voucher.daysRemaining} días más</div>
                </div>
                <button type="button" class="qx-btn-upgrade-full" data-prod-id="${entry.productId}" data-voucher-code="${entry.voucher.code}">
                  <span>🏆 Ascender a Botella 100ml</span>
                </button>
              </div>
            `;
          }

          bodyHtml = `
            <div style="display:flex; flex-direction:column; gap:10px; background:rgba(0,0,0,0.3); border-radius:12px; padding:14px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="color:#fbbf24; font-size:15px;">${'★'.repeat(entry.rating || 5)}${'☆'.repeat(5 - (entry.rating || 5))}</div>
                <div style="font-size:11px; color:#38bdf8; font-weight:700;">⏳ Longevidad en piel: ${entry.longevity || 8.0}h</div>
                <div style="font-size:11px; background:rgba(251,191,36,0.15); color:#fbbf24; padding:2px 8px; border-radius:6px; font-weight:700;">${self.storefront.esc(entry.compliments || 'Imán de Cumplidos')}</div>
              </div>
              ${entry.journalNote ? `<div style="font-size:12px; color:#e2e8f0; font-style:italic; border-left:2px solid #fbbf24; padding-left:10px;">"${self.storefront.esc(entry.journalNote)}"</div>` : ''}
            </div>
            ${voucherHtml}
          `;
        } else {
          // Interactive Tasting Form
          bodyHtml = `
            <form class="qx-pass-form" data-entry-id="${entry.entryId}">
              <div class="qx-form-row-eval">
                <div class="qx-eval-group">
                  <span class="qx-eval-label">Calificación Global</span>
                  <div class="qx-stars-selector" data-stars="5">
                    <button type="button" class="qx-star-btn active" data-val="1">★</button>
                    <button type="button" class="qx-star-btn active" data-val="2">★</button>
                    <button type="button" class="qx-star-btn active" data-val="3">★</button>
                    <button type="button" class="qx-star-btn active" data-val="4">★</button>
                    <button type="button" class="qx-star-btn active" data-val="5">★</button>
                  </div>
                </div>
                <div class="qx-eval-group">
                  <span class="qx-eval-label">Longevidad Percibida en Piel</span>
                  <div class="qx-longevity-slider-wrap">
                    <input type="range" class="qx-longevity-slider" min="3" max="16" step="0.5" value="8.5">
                    <span class="qx-longevity-display">8.5 h</span>
                  </div>
                </div>
              </div>

              <div class="qx-eval-group">
                <span class="qx-eval-label">Factor de Cumplidos</span>
                <div class="qx-compliment-pills">
                  <button type="button" class="qx-compliment-pill active" data-val="Imán de Cumplidos">👑 Imán de Cumplidos</button>
                  <button type="button" class="qx-compliment-pill" data-val="Elogios Ocasionales">✨ Elogios Ocasionales</button>
                  <button type="button" class="qx-compliment-pill" data-val="Aroma Íntimo / Discreto">🌿 Aroma Íntimo / Discreto</button>
                </div>
              </div>

              <div class="qx-eval-group">
                <span class="qx-eval-label">Notas del Diario de Cata (Opcional)</span>
                <textarea class="qx-journal-textarea" placeholder="Describe cómo evolucionó en tu piel, ocasión recomendada o notas destacadas..."></textarea>
              </div>

              <button type="submit" class="qx-btn-submit-tasting">
                <span>✨ Estampar Sello de Cata & Desbloquear Cupón 100% Cash-Back ($ ${self.storefront.formatMoney(entry.decantPrice)})</span>
              </button>
            </form>
          `;
        }

        const card = $(`
          <div class="qx-pass-entry-card ${isStamped ? 'stamped' : ''}">
            <div class="qx-pass-entry-top">
              <div class="qx-pass-flacon-box">
                <img class="qx-pass-flacon-img" src="${flaconImg}" alt="${self.storefront.esc(entry.productName)}">
              </div>
              <div class="qx-pass-info-box">
                <div class="qx-pass-prod-name">${self.storefront.esc(entry.productName)}</div>
                <div class="qx-pass-meta-row">
                  <span class="qx-pass-family-pill">${self.storefront.esc(entry.family)}</span>
                  <span class="qx-pass-date">Muestra 5ml • Adquirido: ${entry.purchaseDate.split(' ')[0]}</span>
                  ${isStamped ? `<span class="qx-passport-seal">🎖️ Visado de Cata Aprobado</span>` : `<span style="color:#fbbf24; font-weight:700; font-size:11px;">⏳ Cata Pendiente</span>`}
                </div>
              </div>
            </div>
            ${bodyHtml}
          </div>
        `);

        // Bind interactive elements for unstamped entries
        if (!isStamped) {
          // Stars selection
          card.find('.qx-star-btn').on('click', function() {
            const val = parseInt($(this).data('val'), 10);
            const parent = $(this).closest('.qx-stars-selector');
            parent.data('stars', val);
            parent.find('.qx-star-btn').each(function() {
              const bVal = parseInt($(this).data('val'), 10);
              if (bVal <= val) $(this).addClass('active');
              else $(this).removeClass('active');
            });
          });

          // Longevity slider
          card.find('.qx-longevity-slider').on('input', function() {
            const val = parseFloat($(this).val());
            card.find('.qx-longevity-display').text(`${val.toFixed(1)} h`);
          });

          // Compliments pills
          card.find('.qx-compliment-pill').on('click', function() {
            card.find('.qx-compliment-pill').removeClass('active');
            $(this).addClass('active');
          });

          // Submit tasting review
          card.find('.qx-pass-form').on('submit', async function(e) {
            e.preventDefault();
            const rating = parseInt(card.find('.qx-stars-selector').data('stars') || 5, 10);
            const longevity = parseFloat(card.find('.qx-longevity-slider').val() || 8.5);
            const compliments = card.find('.qx-compliment-pill.active').data('val') || 'Imán de Cumplidos';
            const journal = card.find('.qx-journal-textarea').val();

            try {
              const tenant = self.storefront.tenant?.emisorId || '00163e311ce9a3e711f1591962781ba6';
              const fd = new URLSearchParams();
              fd.append('action', 'submit_tasting_review');
              fd.append('tenant', tenant);
              fd.append('entryId', entry.entryId);
              fd.append('rating', rating);
              fd.append('longevity', longevity);
              fd.append('compliments', compliments);
              fd.append('journal', journal);

              const subRes = await fetch('api/passport.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: fd.toString()
              });
              const subData = await subRes.json();
              if (subData.Status === 'OK') {
                self.storefront.playHaptic('success');
                self.storefront.showToast('🎖️ ¡Sello de Cata Estampado y Cupón 100% Desbloqueado!');
                await self.loadPassport(self.passportData.Passport.code);
              } else {
                self.storefront.showToast(subData.Error || 'Error al guardar cata');
              }
            } catch (err) {
              console.error('Error submitting tasting:', err);
            }
          });
        } else {
          // Upgrade button (100ml purchase with auto-voucher)
          card.find('.qx-btn-upgrade-full').on('click', async function() {
            const pId = $(this).data('prod-id');
            const vCode = $(this).data('voucher-code');
            const product = self.storefront.products.find(p => p.id === pId) || self.storefront.products[0];
            if (product) {
              self.storefront.addToCart(product, 1, null, 'full');
              await self.storefront.applyVoucher(vCode);
              self.storefront.closePassportModal();
              self.storefront.openCart();
              self.storefront.showToast(`🛡️ Botella 100ml agregada y Cupón ${vCode} bonificado`);
            }
          });
        }

        container.append(card);
      });
    }

    openPassportModal() {
      this.loadPassport();
      $('#qx_mobile_dock').addClass('hidden');
      $('#qx_passport_backdrop').addClass('active');
      $('#qx_passport_modal').addClass('active');
    }

    closePassportModal() {
      $('#qx_passport_backdrop').removeClass('active');
      $('#qx_passport_modal').removeClass('active');
      if (!this.storefront.isModalOrDrawerOpen()) {
        $('#qx_mobile_dock').removeClass('hidden');
      }
    }
  }

  class LoyaltyVaultEngine {
    constructor(storefront) {
      this.storefront = storefront;
      this.memberData = null;
      this.subscriptions = [];
      this.rewards = [];
      this.accessCode = 'VAULT-2026-VIP';
      this.selectedPurchaseMode = 'once';
      this.selectedFrequencyMonths = 3;
    }

    async init() {
      await this.loadVaultData();
      this.bindEvents();
    }

    async loadVaultData(code) {
      if (code) this.accessCode = code;
      try {
        const tenantId = this.storefront.tenant?.emisorId || '00163e311ce9a3e711f1591962781ba6';
        const res = await fetch(`api/loyalty.php?tenant=${tenantId}&action=vault_status&code=${encodeURIComponent(this.accessCode)}`);
        const data = await res.json();
        if (data.Status === 'OK') {
          this.memberData = data.Member;
          this.subscriptions = data.Subscriptions || [];
          this.rewards = data.Rewards || [];
          this.renderHeaderBadges();
        }
      } catch (err) {
        console.warn('LoyaltyVaultEngine load error:', err);
      }
    }

    renderHeaderBadges() {
      if (this.memberData) {
        $('#qx_nav_vault_tier').text(this.memberData.tier || 'VIP');
      }
    }

    bindEvents() {
      const self = this;

      $('#qx_btn_nav_vault, #qx_dock_vault').on('click', function(e) {
        e.preventDefault();
        self.openVaultModal();
      });

      $('#qx_vault_close, #qx_vault_backdrop').on('click', function(e) {
        e.preventDefault();
        self.closeVaultModal();
      });

      // Tabs navigation
      $('#qx_vtab_subs').on('click', function() {
        $('.qx-vtab-btn').removeClass('active');
        $(this).addClass('active');
        $('#qx_vault_panel_subs').show();
        $('#qx_vault_panel_rewards').hide();
      });

      $('#qx_vtab_rewards').on('click', function() {
        $('.qx-vtab-btn').removeClass('active');
        $(this).addClass('active');
        $('#qx_vault_panel_rewards').show();
        $('#qx_vault_panel_subs').hide();
      });

      // Purchase mode radios in product modal
      $(document).on('change', 'input[name="qx_purchase_mode"]', function() {
        const val = $(this).val();
        self.selectedPurchaseMode = val;
        $('.qx-refill-radio-label').removeClass('active');
        if (val === 'subscription') {
          $('#qx_refill_opt_sub_lbl').addClass('active');
          $('#qx_refill_freq_row').slideDown(200);
          $('#qx_pmodal_btn_add span').text(`🔄 Suscribirse (Cada ${self.selectedFrequencyMonths} Meses - 12% OFF)`);
        } else {
          $('#qx_refill_opt_once_lbl').addClass('active');
          $('#qx_refill_freq_row').slideUp(200);
          $('#qx_pmodal_btn_add span').text('🛍️ Agregar al Carrito');
        }
      });

      // Frequency pills
      $(document).on('click', '.qx-freq-pill', function(e) {
        e.preventDefault();
        $('.qx-freq-pill').removeClass('active');
        $(this).addClass('active');
        self.selectedFrequencyMonths = parseInt($(this).data('months'), 10) || 3;
        if (self.selectedPurchaseMode === 'subscription') {
          $('#qx_pmodal_btn_add span').text(`🔄 Suscribirse (Cada ${self.selectedFrequencyMonths} Meses - 12% OFF)`);
        }
      });
    }

    openVaultModal() {
      if (!this.memberData) {
        this.loadVaultData();
      }
      this.renderVaultUI();
      $('#qx_vault_backdrop').addClass('active');
      $('#qx_vault_modal').addClass('active');
      $('#qx_mobile_dock').addClass('hidden');
    }

    closeVaultModal() {
      $('#qx_vault_backdrop').removeClass('active');
      $('#qx_vault_modal').removeClass('active');
      if (!this.storefront.isModalOrDrawerOpen()) {
        $('#qx_mobile_dock').removeClass('hidden');
      }
    }

    renderVaultUI() {
      if (!this.memberData) return;

      const m = this.memberData;
      $('#qx_vault_client_name').text(m.clientName);
      $('#qx_vault_access_code').text(m.code);
      $('#qx_vault_points_val').text(`${m.pointsBalance} PTS`);
      $('#qx_vault_initials_val').text(m.laserInitials || 'AVH');
      $('#qx_vault_tier_tag').text(m.tier);

      // Progression
      const p = m.progression || {};
      $('#qx_vault_curr_tier').text(`Nivel Actual: ${p.currentTier || m.tier}`);
      const remaining = (p.targetCount || 6) - (p.currentCount || 4);
      if (remaining > 0) {
        $('#qx_vault_next_tier_desc').html(`Faltan ${remaining} frascos para ascender a <strong>${p.nextTier || 'Master Perfumer'}</strong>`);
      } else {
        $('#qx_vault_next_tier_desc').html(`¡Has alcanzado el rango supremo de <strong>${p.currentTier}</strong>!`);
      }
      $('#qx_vault_bottle_count').text(`${p.currentCount || 4} / ${p.targetCount || 6} Frascos`);
      $('#qx_vault_progress_fill').css('width', `${p.progressPct || 66}%`);

      // Render Subscriptions & Depletion Meter
      this.renderSubscriptionsList();

      // Render Rewards Grid
      this.renderRewardsList();
    }

    renderSubscriptionsList() {
      const container = $('#qx_vault_subscriptions_container').empty();
      const self = this;

      if (!this.subscriptions || this.subscriptions.length === 0) {
        container.append(`
          <div style="text-align:center; padding:30px; color:var(--qx-text-muted);">
            <div style="font-size:36px; margin-bottom:10px;">🔄</div>
            <div style="font-weight:700;">No tienes suscripciones de recarga activas</div>
            <div style="font-size:12px; margin-top:4px;">Activa la opción de "Auto-Recarga Programada" al comprar tu siguiente fragancia para ahorrar 12% y recibir regalos de cortesía.</div>
          </div>
        `);
        return;
      }

      this.subscriptions.forEach(sub => {
        const dep = sub.depletion || {};
        const isCritical = dep.urgency === 'CRITICAL';
        const fillClass = isCritical ? 'critical' : '';
        const photoUrl = sub.photo || 'images/logo.png';

        const card = $(`
          <div class="qx-vault-sub-card" data-sub-id="${sub.subscriptionId}">
            <div class="qx-vault-sub-top">
              <img class="qx-vault-sub-img" src="${self.storefront.esc(photoUrl)}" alt="${self.storefront.esc(sub.productName)}">
              <div class="qx-vault-sub-info">
                <div class="qx-vault-sub-title">${self.storefront.esc(sub.productName)}</div>
                <div class="qx-vault-sub-meta">
                  <span class="qx-vault-sub-badge">🔄 Cada ${sub.frequencyMonths} Meses (12% OFF)</span>
                  <span>🎁 Atomizador 5ml Incluido</span>
                </div>
              </div>
            </div>

            <!-- Smart Depletion Meter -->
            <div class="qx-vault-depletion-meter">
              <div class="qx-depletion-header">
                <span style="color:#fff;">⏳ Desgaste Molecular Estimado:</span>
                <span style="color:${isCritical ? '#ef4444' : '#10b981'}; font-weight:800;">
                  ${dep.pctRemaining}% (${dep.remainingSprays} sprays restantes)
                </span>
              </div>
              <div class="qx-depletion-track">
                <div class="qx-depletion-fill ${fillClass}" style="width: ${dep.pctRemaining}%;"></div>
              </div>
              <div class="qx-depletion-stats">
                <span>Días transcurridos: ${dep.daysElapsed} días</span>
                <span>Próxima Recarga: ~${dep.daysRemaining} días (${sub.nextRefillDate})</span>
              </div>
            </div>

            <div class="qx-vault-sub-actions">
              <button type="button" class="qx-btn-vault-refill-now" data-sub-id="${sub.subscriptionId}">
                <span>⚡ Reordenar Recarga Ahora (12% VIP)</span>
              </button>
              <button type="button" class="qx-btn-vault-wa" data-sub-id="${sub.subscriptionId}">
                <span>💬 Concierge VIP WhatsApp</span>
              </button>
            </div>
          </div>
        `);

        // Actions
        card.find('.qx-btn-vault-refill-now').on('click', function() {
          self.reorderRefill(sub);
        });

        card.find('.qx-btn-vault-wa').on('click', function() {
          self.openWhatsAppConcierge(sub.subscriptionId);
        });

        container.append(card);
      });
    }

    renderRewardsList() {
      const container = $('#qx_vault_rewards_container').empty();
      const self = this;

      if (!this.rewards || this.rewards.length === 0) {
        container.append(`
          <div style="text-align:center; padding:30px; color:var(--qx-text-muted); grid-column:1/-1;">
            <div>No hay recompensas disponibles en este momento.</div>
          </div>
        `);
        return;
      }

      this.rewards.forEach(rew => {
        const canAfford = (self.memberData?.pointsBalance || 0) >= rew.pointsCost;
        const card = $(`
          <div class="qx-reward-card">
            <div class="qx-reward-top">
              <span class="qx-reward-icon">${rew.badgeIcon || '🎁'}</span>
              <div class="qx-reward-title">${self.storefront.esc(rew.title)}</div>
            </div>
            <div class="qx-reward-desc">${self.storefront.esc(rew.description)}</div>
            <div class="qx-reward-footer">
              <span class="qx-reward-cost">${rew.pointsCost} PTS</span>
              <button type="button" class="qx-btn-redeem-reward" ${canAfford ? '' : 'disabled'} data-reward-id="${rew.rewardId}">
                ${canAfford ? 'Canjear' : 'Puntos Insuficientes'}
              </button>
            </div>
          </div>
        `);

        card.find('.qx-btn-redeem-reward').on('click', function() {
          self.redeemReward(rew);
        });

        container.append(card);
      });
    }

    async redeemReward(reward) {
      try {
        const tenantId = this.storefront.tenant?.emisorId || '00163e311ce9a3e711f1591962781ba6';
        const formData = new URLSearchParams();
        formData.append('tenant', tenantId);
        formData.append('action', 'redeem_reward');
        formData.append('memberCode', this.accessCode);
        formData.append('rewardId', reward.rewardId);

        const res = await fetch('api/loyalty.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString()
        });
        const data = await res.json();
        if (data.Status === 'OK') {
          this.storefront.showToast(`🎉 ${data.Message} (Código: ${data.RewardVoucherCode})`);
          this.storefront.playAudioSynth('pop');
          await this.loadVaultData();
          this.renderVaultUI();
        } else {
          this.storefront.showToast(`⚠️ ${data.Error || 'Error al canjear recompensa'}`);
        }
      } catch (err) {
        console.error('redeemReward error:', err);
      }
    }

    reorderRefill(sub) {
      const product = this.storefront.products.find(p => p.id === sub.productId) || {
        id: sub.productId,
        name: sub.productName,
        priceWithTax: 1800,
        cover: sub.photo
      };

      this.storefront.addToCart(product, 1, null, 'full', {
        isSubscription: true,
        frequencyMonths: sub.frequencyMonths,
        discountPct: 12
      });

      this.closeVaultModal();
      this.storefront.openCart();
      this.storefront.showToast('🔄 Recarga programada agregada a tu bolsa con 12% OFF');
    }

    async openWhatsAppConcierge(subId) {
      try {
        const tenantId = this.storefront.tenant?.emisorId || '00163e311ce9a3e711f1591962781ba6';
        const res = await fetch(`api/loyalty.php?tenant=${tenantId}&action=generate_wa_refill_link&subscriptionId=${subId}`);
        const data = await res.json();
        if (data.Status === 'OK' && data.WhatsAppUrl) {
          window.open(data.WhatsAppUrl, '_blank');
        }
      } catch (err) {
        console.error('openWhatsAppConcierge error:', err);
      }
    }
  }

  class TastingRoomEngine {
    constructor(storefront) {
      this.storefront = storefront;
      this.sessionCode = 'TASTE-2026-VIP';
      this.activeSession = null;
      this.availableSlots = [];
      this.selectedSlot = '17:00';
      this.selectedChannel = 'WEBRTC';
      this.currentView = 'booking'; // 'booking' | 'live'
      this.pollTimer = null;
      this.lastEventId = 0;
      this.audioAnimId = null;
      this.currentProjectedProduct = null;
    }

    async init() {
      await this.loadSlots();
      this.bindEvents();
    }

    async loadSlots(dateStr) {
      try {
        const tenantId = this.storefront.tenant?.emisorId || '00163e311ce9a3e711f1591962781ba6';
        const date = dateStr || new Date().toISOString().split('T')[0];
        const res = await fetch(`api/tasting_room.php?tenant=${tenantId}&action=get_available_slots&date=${date}`);
        const data = await res.json();
        if (data.Status === 'OK') {
          this.availableSlots = data.Slots || [];
          this.renderSlotsUI();
        }
      } catch (err) {
        console.warn('TastingRoomEngine loadSlots error:', err);
      }
    }

    renderSlotsUI() {
      const $wrap = $('#qx_tasting_slots_container');
      $wrap.empty();
      if (!this.availableSlots.length) {
        $wrap.html('<div style="color:#94a3b8; font-size:12px;">No hay horarios disponibles hoy.</div>');
        return;
      }

      this.availableSlots.forEach(slot => {
        const isSelected = (slot.time === this.selectedSlot);
        const $pill = $(`
          <div class="qx-slot-pill ${slot.isAvailable ? '' : 'booked'} ${isSelected ? 'selected' : ''}" data-time="${slot.time}">
            ${slot.time} hrs
          </div>
        `);
        $wrap.append($pill);
      });
    }

    bindEvents() {
      const self = this;

      $('#qx_btn_nav_tasting, #qx_dock_tasting').on('click', function(e) {
        e.preventDefault();
        self.openTastingModal();
      });

      $('#qx_tasting_close, #qx_tasting_backdrop').on('click', function(e) {
        e.preventDefault();
        self.closeTastingModal();
      });

      // Slot selection
      $(document).on('click', '.qx-slot-pill:not(.booked)', function() {
        $('.qx-slot-pill').removeClass('selected');
        $(this).addClass('selected');
        self.selectedSlot = $(this).data('time');
      });

      // Channel selection
      $('#qx_lbl_chan_webrtc').on('click', function() {
        $('#qx_lbl_chan_webrtc').addClass('selected');
        $('#qx_lbl_chan_wa').removeClass('selected');
        self.selectedChannel = 'WEBRTC';
      });

      $('#qx_lbl_chan_wa').on('click', function() {
        $('#qx_lbl_chan_wa').addClass('selected');
        $('#qx_lbl_chan_webrtc').removeClass('selected');
        self.selectedChannel = 'WHATSAPP';
      });

      // Form Booking Submit
      $('#qx_btn_submit_tasting_booking').on('click', async function(e) {
        e.preventDefault();
        await self.submitBooking();
      });

      // Existing Session Login Trigger
      $('#qx_btn_open_existing_session').on('click', function() {
        self.switchView('live');
        self.startLiveSession(self.sessionCode);
      });

      // Interactive Canvas Triggers inside Live Room
      $('#qx_btn_synced_radar').on('click', function() {
        const prod = self.currentProjectedProduct || self.storefront.products[0];
        if (prod) {
          self.storefront.openProductModal(prod.id);
          self.storefront.radar?.renderRadarSVG(prod);
          self.storefront.showToast('📊 Proyectando Radar Olfativo Hexagonal en vivo');
        }
      });

      $('#qx_btn_synced_layering').on('click', function() {
        self.storefront.openLayeringModal();
        self.storefront.showToast('🧪 Iniciando Crisol de Alquimia de Capas');
      });

      // Upgrade Full Bottle with Cash-Back Voucher
      $('#qx_btn_live_upgrade_bottle').on('click', function() {
        self.upgradeToFullBottle();
      });
    }

    async submitBooking() {
      const name = $('#qx_tform_name').val().trim();
      const phone = $('#qx_tform_phone').val().trim();
      const email = $('#qx_tform_email').val().trim();
      const city = $('#qx_tform_city').val().trim() || 'Guadalajara, JAL';
      const notes = $('#qx_tform_notes').val().trim();

      if (!name || !email || !phone) {
        this.storefront.showToast('⚠️ Por favor completa tus datos de contacto');
        return;
      }

      try {
        const tenantId = this.storefront.tenant?.emisorId || '00163e311ce9a3e711f1591962781ba6';
        const res = await fetch(`api/tasting_room.php?tenant=${tenantId}&action=book_session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName: name,
            clientPhone: phone,
            clientEmail: email,
            clientCity: city,
            scheduledDate: new Date().toISOString().split('T')[0],
            scheduledTime: this.selectedSlot,
            channel: this.selectedChannel,
            notes: notes
          })
        });

        const data = await res.json();
        if (data.Status === 'OK') {
          this.sessionCode = data.Session.bookingCode;
          this.activeSession = data.Session;
          this.storefront.showToast('🍷 ¡Cita VIP agendada! Conectando a Sala de Cata...');
          this.switchView('live');
          this.startLiveSession(this.sessionCode);
        } else {
          this.storefront.showToast(`⚠️ ${data.Error || 'Error al agendar cita'}`);
        }
      } catch (err) {
        console.error('Booking submission error:', err);
        this.storefront.showToast('⚠️ Error de conexión al agendar');
      }
    }

    async openTastingModal(sessionCode) {
      if (sessionCode) {
        this.sessionCode = sessionCode;
        this.switchView('live');
        this.startLiveSession(this.sessionCode);
      } else {
        this.switchView('booking');
        await this.loadSlots();
      }

      $('#qx_tasting_backdrop').addClass('active');
      $('#qx_tasting_modal').addClass('active');
      $('body').css('overflow', 'hidden');
    }

    closeTastingModal() {
      $('#qx_tasting_backdrop').removeClass('active');
      $('#qx_tasting_modal').removeClass('active');
      $('body').css('overflow', '');
      this.stopPolling();
      this.stopAudioVisualizer();
    }

    switchView(viewName) {
      this.currentView = viewName;
      if (viewName === 'live') {
        $('#qx_tasting_view_booking').hide();
        $('#qx_tasting_view_live').fadeIn(200);
      } else {
        $('#qx_tasting_view_live').hide();
        $('#qx_tasting_view_booking').fadeIn(200);
      }
    }

    async startLiveSession(code) {
      const targetCode = code || this.sessionCode;
      try {
        const tenantId = this.storefront.tenant?.emisorId || '00163e311ce9a3e711f1591962781ba6';
        const res = await fetch(`api/tasting_room.php?tenant=${tenantId}&action=get_session_status&code=${encodeURIComponent(targetCode)}`);
        const data = await res.json();

        if (data.Status === 'OK') {
          this.activeSession = data.Session;
          this.renderLiveRoomUI(data);
          this.startAudioVisualizer();
          this.startPolling(data.Session.sessionId);
        }
      } catch (err) {
        console.warn('startLiveSession error:', err);
      }
    }

    renderLiveRoomUI(data) {
      const sess = data.Session;
      $('#qx_live_client_name').text(sess.clientName || 'Alexander von Humboldt');
      $('#qx_live_session_code').text(sess.bookingCode || 'TASTE-2026-VIP');
      $('#qx_live_box_status').text(sess.discoveryBoxStatus === 'DELIVERED' ? 'Entregado 📦' : 'En Camino 🚚');
      $('#qx_live_voucher_val').text(`$ ${Number(sess.cashBackAmount || 499).toFixed(2)} MXN`);

      // WhatsApp link setup
      const tenantId = this.storefront.tenant?.emisorId || '00163e311ce9a3e711f1591962781ba6';
      $('#qx_btn_live_wa_link').attr('href', `api/tasting_room.php?tenant=${tenantId}&action=generate_wa_session_link&code=${encodeURIComponent(sess.bookingCode)}`);

      // Render Active Canvas Projection
      if (data.ActiveCanvas && data.ActiveCanvas.payload) {
        this.renderCanvasPayload(data.ActiveCanvas.payload);
      } else if (this.storefront.products && this.storefront.products.length > 0) {
        const first = this.storefront.products[0];
        this.renderCanvasProduct(first);
      }
    }

    renderCanvasPayload(payload) {
      const prodId = payload.productId;
      const product = this.storefront.products.find(p => p.id === prodId) || this.storefront.products[0];
      if (product) {
        this.currentProjectedProduct = product;
        this.renderCanvasProduct(product, payload.sommelierNote);
      }
    }

    renderCanvasProduct(prod, note) {
      this.currentProjectedProduct = prod;
      $('#qx_synced_title').text(prod.name);
      $('#qx_synced_desc').text(prod.description || 'Fragancia exclusiva con proyección molecular y longevidad excepcional.');
      $('#qx_synced_flacon_img').attr('src', prod.cover || 'assets/bottle_placeholder.png');

      if (note) {
        $('#qx_synced_somm_note').text(`"${note}"`);
      }

      // Notes pills
      const $notesWrap = $('#qx_synced_notes_wrap');
      $notesWrap.empty();
      const top = prod.notes?.top || 'Manzana y Bergamota';
      const heart = prod.notes?.heart || 'Acorde Marino Especiado';
      const base = prod.notes?.base || 'Ámbar Gris y Almizcle';

      $notesWrap.append(`<span class="qx-cnote-pill">🍏 ${top}</span>`);
      $notesWrap.append(`<span class="qx-cnote-pill">🌊 ${heart}</span>`);
      $notesWrap.append(`<span class="qx-cnote-pill">🪵 ${base}</span>`);
    }

    startAudioVisualizer() {
      const canvas = document.getElementById('qx_somm_audio_canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      canvas.width = canvas.offsetWidth || 400;
      canvas.height = 60;

      let tick = 0;
      const self = this;

      function renderWave() {
        tick++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bars = 32;
        const barWidth = canvas.width / bars;

        for (let i = 0; i < bars; i++) {
          const height = Math.abs(Math.sin(tick * 0.08 + i * 0.35) * 35) + 6;
          const x = i * barWidth;
          const y = canvas.height - height;

          const grad = ctx.createLinearGradient(0, y, 0, canvas.height);
          grad.addColorStop(0, '#c084fc');
          grad.addColorStop(1, '#ec4899');

          ctx.fillStyle = grad;
          ctx.fillRect(x + 2, y, barWidth - 4, height);
        }

        self.audioAnimId = requestAnimationFrame(renderWave);
      }

      this.audioAnimId = requestAnimationFrame(renderWave);
    }

    stopAudioVisualizer() {
      if (this.audioAnimId) {
        cancelAnimationFrame(this.audioAnimId);
        this.audioAnimId = null;
      }
    }

    startPolling(sessionId) {
      this.stopPolling();
      const self = this;
      this.pollTimer = setInterval(async () => {
        if (!self.currentView || self.currentView !== 'live') return;
        try {
          const tenantId = self.storefront.tenant?.emisorId || '00163e311ce9a3e711f1591962781ba6';
          const res = await fetch(`api/tasting_room.php?tenant=${tenantId}&action=poll_canvas_events&sessionId=${sessionId}&lastEventId=${self.lastEventId}`);
          const data = await res.json();
          if (data.Status === 'OK' && data.NewEvents && data.NewEvents.length > 0) {
            data.NewEvents.forEach(ev => {
              self.lastEventId = Math.max(self.lastEventId, ev.eventId);
              self.handleCanvasEvent(ev);
            });
          }
        } catch (e) {
          // Silent poll fail
        }
      }, 1500);
    }

    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    }

    handleCanvasEvent(event) {
      $('#qx_synced_event_id').text(`EVT #${event.eventId}`);
      if (event.actionType === 'PROJECT_PRODUCT') {
        this.renderCanvasPayload(event.payload);
        this.storefront.showToast(`📡 Sommelier proyectó: ${event.payload?.title || 'Fragancia'}`);
      } else if (event.actionType === 'SHOW_RADAR') {
        this.storefront.radar?.renderRadarSVG(this.currentProjectedProduct);
        this.storefront.showToast('📊 Sommelier activó Radar Hexagonal');
      } else if (event.actionType === 'SHOW_LAYERING') {
        this.storefront.openLayeringModal();
        this.storefront.showToast('🧪 Sommelier activó Alquimia de Capas');
      }
    }

    upgradeToFullBottle() {
      const prod = this.currentProjectedProduct || this.storefront.products[0];
      if (!prod) return;

      const voucherCode = this.activeSession?.cashBackVoucher || 'TASTEVOUCH-2026-AVH';
      
      // Add full bottle (100ml) to cart
      this.storefront.addToCart(prod.id, 1, false);

      // Apply $499 credit voucher
      this.storefront.appliedVoucher = {
        code: voucherCode,
        amount: 499.00,
        formattedAmount: '$ 499.00 MXN'
      };
      this.storefront.renderCartUI();

      this.closeTastingModal();
      this.storefront.openCart();
      this.storefront.showToast(`🏆 ¡Frasco de 100ml añadido con $499.00 de bono de cata aplicado!`);
    }
  }

  class RoyalConciergeAgendaEngine {
    constructor(storefront) {
      this.storefront = storefront;
      this.currentStep = 1;
      this.scannedMember = null;
      this.selectedExperience = 'TASTING_MASTERCLASS';
      this.selectedBand = 'GOLDEN_HOUR';
      this.selectedSlot = '15:45';
      this.selectedChannel = 'WEBRTC';
      this.selectedOccasion = 'Presencia Ejecutiva & Seducción';
      this.intensityDial = 65;
      this.projectionMode = 'BEAST_MODE';
      this.activeAppointment = null;
      this.loungeTimer = null;
      this.loungeSecondsLeft = 899; // 14:59
      this.bandsData = [];
    }

    async init() {
      await this.loadAtmosphericSlots();
      this.bindEvents();
    }

    async scanKeycard(inputStr) {
      const input = inputStr || $('#qx_agenda_keycard_input').val().trim();
      if (!input) {
        this.storefront.showToast('⚠️ Ingresa tu email o teléfono');
        return;
      }

      try {
        const tenantId = this.storefront.tenant?.emisorId || '00163e311ce9a3e711f1591962781ba6';
        const res = await fetch(`api/concierge_agenda.php?tenant=${tenantId}&action=quick_scan_keycard&input=${encodeURIComponent(input)}`);
        const data = await res.json();

        if (data.Status === 'OK') {
          this.scannedMember = data.Member;
          this.renderKeycardUI(data.Member);
          this.flipKeycard();
          this.storefront.playHaptic('success');
          this.storefront.showToast(`👑 Llave autenticada: ${data.Member.name} (${data.Member.tierLabel})`);
        }
      } catch (err) {
        console.warn('scanKeycard error:', err);
      }
    }

    renderKeycardUI(member) {
      $('#qx_keycard_monogram').text(member.initials || 'AVH');
      $('#qx_keycard_name').text(member.name || 'Alexander von Humboldt');
      $('#qx_keycard_tier').text(member.tier ? member.tier.replace(/_/g, ' ') : 'MASTER PERFUMER');
      $('#qx_keycard_signature').text(`Signature: ${member.signatureScent || 'Rasasi Hawas / Oud Royal'}`);
      
      const statusTxt = (member.tier === 'MASTER_PERFUMER')
        ? `✨ Llave VIP Reconocida: ${member.name} (${member.tierLabel})`
        : `✨ Pase de Invitado Activo: ${member.name} (50 PTS)`;
      $('#qx_scan_status_pill').text(statusTxt);
    }

    flipKeycard() {
      const $card = $('#qx_keycard_container');
      $card.addClass('flipped');
      setTimeout(() => {
        $card.removeClass('flipped');
      }, 1800);
    }

    async loadAtmosphericSlots(dateStr) {
      try {
        const tenantId = this.storefront.tenant?.emisorId || '00163e311ce9a3e711f1591962781ba6';
        const date = dateStr || new Date().toISOString().split('T')[0];
        const res = await fetch(`api/concierge_agenda.php?tenant=${tenantId}&action=get_atmospheric_slots&date=${date}`);
        const data = await res.json();
        if (data.Status === 'OK') {
          this.bandsData = data.Bands || [];
          this.renderBandsUI();
        }
      } catch (err) {
        console.warn('loadAtmosphericSlots error:', err);
      }
    }

    renderBandsUI() {
      const $wrap = $('#qx_chrono_bands_container');
      $wrap.empty();

      this.bandsData.forEach(band => {
        const isBandSelected = (band.id === this.selectedBand);
        const $card = $(`
          <div class="qx-chrono-band-card ${isBandSelected ? 'selected' : ''}" data-band-id="${band.id}">
            <div class="qx-cband-meta">
              <span class="qx-cband-icon">${band.icon}</span>
              <div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <span class="qx-cband-title">${band.name}</span>
                  <span class="qx-cband-time">${band.timeRange}</span>
                </div>
                <div class="qx-cband-desc">${band.atmosphere}</div>
              </div>
            </div>
            <div class="qx-cband-somm-badge">
              <span>🍷</span>
              <span>${band.sommelier.name}</span>
            </div>
            <div class="qx-cband-slots" id="qx_slots_for_${band.id}">
            </div>
          </div>
        `);

        const $slotsWrap = $card.find(`#qx_slots_for_${band.id}`);
        band.slots.forEach(s => {
          const isSlotSelected = (s.time === this.selectedSlot);
          $slotsWrap.append(`
            <button type="button" class="qx-cslot-chip ${s.isAvailable ? '' : 'booked'} ${isSlotSelected ? 'selected' : ''}" data-band="${band.id}" data-time="${s.time}">
              ${s.time}
            </button>
          `);
        });

        $wrap.append($card);
      });
    }

    goToStep(stepNum) {
      this.currentStep = stepNum;
      $('.qx-astep-item').removeClass('active');
      $(`#qx_astep_btn_${stepNum}`).addClass('active');

      $('.qx-agenda-view').hide();
      if (stepNum === 1) $('#qx_agenda_view_keycard').fadeIn(200);
      else if (stepNum === 2) $('#qx_agenda_view_chronos').fadeIn(200);
      else if (stepNum === 3) $('#qx_agenda_view_intake').fadeIn(200);
      else if (stepNum === 4) $('#qx_agenda_view_pass').fadeIn(200);
    }

    bindEvents() {
      const self = this;

      // Nav triggers
      $('#qx_btn_nav_agenda, #qx_dock_agenda').on('click', function(e) {
        e.preventDefault();
        self.openAgendaModal();
      });

      $('#qx_agenda_close, #qx_agenda_backdrop').on('click', function(e) {
        e.preventDefault();
        self.closeAgendaModal();
      });

      // Stepper clicks
      $('.qx-astep-item').on('click', function() {
        const step = parseInt($(this).data('step'), 10);
        self.goToStep(step);
      });

      // Keycard Scanner
      $('#qx_btn_scan_keycard').on('click', function() {
        self.scanKeycard();
      });

      $('#qx_btn_proceed_to_chronos').on('click', function() {
        self.goToStep(2);
      });

      // Experience Selector
      $(document).on('click', '.qx-exp-card', function() {
        $('.qx-exp-card').removeClass('selected');
        $(this).addClass('selected');
        self.selectedExperience = $(this).data('exp');
        self.storefront.playHaptic('light');
      });

      // Slot Click
      $(document).on('click', '.qx-cslot-chip:not(.booked)', function(e) {
        e.stopPropagation();
        $('.qx-cslot-chip').removeClass('selected');
        $(this).addClass('selected');
        self.selectedBand = $(this).data('band');
        self.selectedSlot = $(this).data('time');
        self.storefront.playHaptic('medium');
      });

      // Channel Click
      $('#qx_chan_btn_webrtc').on('click', function() {
        $('#qx_chan_btn_webrtc').addClass('selected');
        $('#qx_chan_btn_wa').removeClass('selected');
        self.selectedChannel = 'WEBRTC';
      });

      $('#qx_chan_btn_wa').on('click', function() {
        $('#qx_chan_btn_wa').addClass('selected');
        $('#qx_chan_btn_webrtc').removeClass('selected');
        self.selectedChannel = 'WHATSAPP';
      });

      $('#qx_btn_proceed_to_intake').on('click', function() {
        self.goToStep(3);
      });

      $('#qx_btn_back_to_chronos').on('click', function() {
        self.goToStep(2);
      });

      // Occasion Pills
      $('.qx-occ-pill').on('click', function() {
        $('.qx-occ-pill').removeClass('selected');
        $(this).addClass('selected');
        self.selectedOccasion = $(this).data('occ');
        self.storefront.playHaptic('light');
      });

      // Projection Mode Pills
      $('.qx-proj-pill').on('click', function() {
        $('.qx-proj-pill').removeClass('selected');
        $(this).addClass('selected');
        self.projectionMode = $(this).data('proj');
        self.storefront.playHaptic('light');
      });

      // Intensity Dial Slider
      $('#qx_intake_intensity_dial').on('input', function() {
        const val = parseInt($(this).val(), 10);
        self.intensityDial = val;
        let label = `${val}% — `;
        if (val < -30) label += 'Frescura Cítrica Marina';
        else if (val >= -30 && val <= 30) label += 'Equilibrio Versátil Elegante';
        else label += 'Opulencia Amaderada & Estela Magnética';
        $('#qx_intake_dial_label').text(label);
      });

      // Submit Appointment
      $('#qx_btn_submit_royal_agenda').on('click', async function(e) {
        e.preventDefault();
        await self.submitAppointment();
      });

      // Lounge Room Entrance
      $('#qx_btn_lounge_enter_room').on('click', function() {
        self.closeAgendaModal();
        if (self.storefront.tasting) {
          self.storefront.tasting.openTastingModal(self.activeAppointment?.code || 'AGENDA-2026-VIP');
        }
      });
    }

    async submitAppointment() {
      const clientName = this.scannedMember?.name || 'Alexander von Humboldt';
      const clientEmail = this.scannedMember?.email || $('#qx_agenda_keycard_input').val().trim();
      const clientPhone = this.scannedMember?.phone || '+523318259000';
      const clientTier = this.scannedMember?.tier || 'MASTER_PERFUMER';
      const notes = $('#qx_intake_notes').val().trim();

      try {
        const tenantId = this.storefront.tenant?.emisorId || '00163e311ce9a3e711f1591962781ba6';
        const res = await fetch(`api/concierge_agenda.php?tenant=${tenantId}&action=submit_appointment_request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName: clientName,
            clientEmail: clientEmail,
            clientPhone: clientPhone,
            clientTier: clientTier,
            experienceType: this.selectedExperience,
            atmosphericBand: this.selectedBand,
            scheduledDate: new Date().toISOString().split('T')[0],
            scheduledTime: this.selectedSlot,
            channel: this.selectedChannel,
            occasionMood: this.selectedOccasion,
            intensityDial: this.intensityDial,
            projectionMode: this.projectionMode,
            referenceFragrances: 'Rasasi Hawas, Afnan 9AM Dive',
            clientNotes: notes
          })
        });

        const data = await res.json();
        if (data.Status === 'OK') {
          this.activeAppointment = data.Appointment;
          this.renderBoardingPassUI(data.Appointment);
          this.goToStep(4);
          this.startLoungeCountdown();
          this.storefront.playHaptic('success');
          this.storefront.showToast('🎟️ ¡Pase de Gala emitido! Cita agendada exitosamente.');
        } else {
          this.storefront.showToast(`⚠️ ${data.Error || 'Error al agendar cita'}`);
        }
      } catch (err) {
        console.error('submitAppointment error:', err);
      }
    }

    renderBoardingPassUI(app) {
      $('#qx_bpass_code').text(app.code || 'AGENDA-2026-VIP');
      $('#qx_bpass_client_name').text(app.clientName || 'Alexander von Humboldt');
      $('#qx_bpass_date').text(app.scheduledDate || 'Hoy, 31 de Agosto');
      $('#qx_bpass_time').text(`${app.scheduledTime} hrs`);
      $('#qx_bpass_sommelier').text(app.sommelierName || 'Jean-Luc Moreau');
      
      const bandNames = {
        'SOLARIUM': 'The Daylight Solarium',
        'GOLDEN_HOUR': 'The Golden Hour Atelier',
        'MIDNIGHT': 'The Midnight Salon'
      };
      $('#qx_bpass_band').text(bandNames[app.atmosphericBand] || 'The Golden Hour Atelier');
      $('#qx_bpass_voucher_val').text(`$ ${Number(app.cashBackAmount || 499).toFixed(2)} MXN`);

      const tenantId = this.storefront.tenant?.emisorId || '00163e311ce9a3e711f1591962781ba6';
      $('#qx_btn_download_ics').attr('href', `api/concierge_agenda.php?tenant=${tenantId}&action=generate_ics_calendar&code=${encodeURIComponent(app.code)}`);
      $('#qx_btn_wa_agenda_link').attr('href', `api/concierge_agenda.php?tenant=${tenantId}&action=generate_wa_concierge_link&code=${encodeURIComponent(app.code)}`);

      $('#qx_lounge_somm_msg').text(`${app.sommelierName || 'Jean-Luc Moreau'} está preparando tu set de catas...`);
      $('#qx_btn_lounge_enter_room').text(`🍷 Entrar a la Sala Privada con ${app.sommelierName || 'Jean-Luc Moreau'}`);
    }

    startLoungeCountdown() {
      this.stopLoungeCountdown();
      this.loungeSecondsLeft = 899; // 14:59
      const self = this;

      this.loungeTimer = setInterval(() => {
        self.loungeSecondsLeft--;
        if (self.loungeSecondsLeft <= 0) {
          self.stopLoungeCountdown();
          $('#qx_lounge_countdown').text('00:00:00');
          return;
        }
        const m = Math.floor(self.loungeSecondsLeft / 60);
        const s = self.loungeSecondsLeft % 60;
        const formatted = `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        $('#qx_lounge_countdown').text(formatted);
      }, 1000);
    }

    stopLoungeCountdown() {
      if (this.loungeTimer) {
        clearInterval(this.loungeTimer);
        this.loungeTimer = null;
      }
    }

    openAgendaModal() {
      this.goToStep(1);
      this.scanKeycard('alexander@humboldt-expeditions.org');
      $('#qx_agenda_backdrop').addClass('active');
      $('#qx_agenda_modal').addClass('active');
      $('body').css('overflow', 'hidden');
    }

    closeAgendaModal() {
      $('#qx_agenda_backdrop').removeClass('active');
      $('#qx_agenda_modal').removeClass('active');
      $('body').css('overflow', '');
      this.stopLoungeCountdown();
    }
  }

  class QuantumComparisonStudio {
    constructor(storefront) {
      this.storefront = storefront;
      this.selected = [];
      this.currentMode = 'xray';
      this.prodA = null;
      this.prodB = null;
      this.sliderPct = 50;
      this.isDraggingSlider = false;
      this.audioCtx = null;
      this.initEvents();
    }

    initAudio() {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    }

    playAudioTick(freq = 1200) {
      try {
        this.initAudio();
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.04);
      } catch(e) {}
    }

    playAudioResonance() {
      try {
        this.initAudio();
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, this.audioCtx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.22);
      } catch(e) {}
    }

    playAudioFusionChime() {
      try {
        this.initAudio();
        if (!this.audioCtx) return;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          setTimeout(() => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
            gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.35);
          }, idx * 60);
        });
      } catch(e) {}
    }

    isSelected(productId) {
      return this.selected.some(p => p.id == productId);
    }

    toggleProduct(productOrId) {
      let p = productOrId;
      if (typeof productOrId === 'string' || typeof productOrId === 'number') {
        p = this.storefront.products.find(x => x.id == productOrId);
      }
      if (!p) return;

      const existingIdx = this.selected.findIndex(x => x.id == p.id);
      if (existingIdx >= 0) {
        this.selected.splice(existingIdx, 1);
        this.playAudioTick(800);
        this.storefront.showToast(`⚖️ Quitado de comparativa: ${p.name}`);
      } else {
        if (this.selected.length >= 4) {
          this.selected.shift();
        }
        this.selected.push(p);
        this.playAudioTick(1400);
        this.storefront.showToast(`⚖️ Agregado a comparativa (${this.selected.length}/4): ${p.name}`);
      }

      this.renderDock();
      this.updateCardToggleButtons();
    }

    renderDock() {
      const $dock = $('#qx_comparison_dock');
      const $wrap = $('#qx_dock_items_wrap');
      const self = this;

      if (this.selected.length === 0) {
        $dock.fadeOut(150);
        return;
      }

      $wrap.empty();
      this.selected.forEach(p => {
        const photo = (p.photos && p.photos.length) ? (p.photos[0].url || p.photos[0].thumb) : p.cover;
        const $avatar = $(`
          <div class="qx-dock-item-avatar" title="${self.storefront.esc(p.name)}">
            <img src="${self.storefront.esc(photo)}" alt="${self.storefront.esc(p.name)}">
            <button type="button" class="qx-dock-remove-btn" title="Quitar">×</button>
          </div>
        `);
        $avatar.find('.qx-dock-remove-btn').on('click', (e) => {
          e.stopPropagation();
          self.toggleProduct(p);
        });
        $avatar.on('click', () => {
          self.openCrucible(p.id);
        });
        $wrap.append($avatar);
      });

      $('#qx_dock_count_badge').text(`⚖️ ${this.selected.length} / 4 Seleccionados`);
      $dock.fadeIn(150);
    }

    updateCardToggleButtons() {
      const self = this;
      $('.qx-btn-compare-toggle').each(function() {
        const pid = $(this).data('id');
        if (self.isSelected(pid)) {
          $(this).addClass('active').attr('title', 'Quitar de comparativa');
        } else {
          $(this).removeClass('active').attr('title', 'Comparar en Quantum Studio');
        }
      });
    }

    clearAll() {
      this.selected = [];
      this.renderDock();
      this.updateCardToggleButtons();
      this.storefront.showToast('⚖️ Comparativa vaciada');
    }

    openCrucible(prodAId = null, prodBId = null) {
      const all = this.storefront.products;
      if (!all || all.length === 0) return;

      if (prodAId) {
        this.prodA = all.find(p => p.id == prodAId) || all[0];
      } else if (this.selected.length > 0) {
        this.prodA = this.selected[0];
      } else {
        this.prodA = all[0];
      }

      if (prodBId && prodBId != this.prodA.id) {
        this.prodB = all.find(p => p.id == prodBId) || all[1] || all[0];
      } else if (this.selected.length > 1 && this.selected[1].id != this.prodA.id) {
        this.prodB = this.selected[1];
      } else {
        this.prodB = all.find(p => p.id != this.prodA.id) || all[0];
      }

      const $selA = $('#qx_select_prod_a').empty();
      const $selB = $('#qx_select_prod_b').empty();
      all.forEach(p => {
        $selA.append(`<option value="${p.id}" ${p.id == this.prodA.id ? 'selected' : ''}>${this.storefront.esc(p.name)}</option>`);
        $selB.append(`<option value="${p.id}" ${p.id == this.prodB.id ? 'selected' : ''}>${this.storefront.esc(p.name)}</option>`);
      });

      this.renderStageProducts();
      this.renderAiVerdict();
      this.renderDualRadar();
      this.renderSpecDiffTable();
      this.renderFusionState();

      this.setMode(this.currentMode);

      $('#qx_crucible_backdrop').addClass('active');
      $('#qx_crucible_modal').addClass('active');
      $('body').css('overflow', 'hidden');

      this.playAudioResonance();

      const url = new URL(window.location);
      url.searchParams.set('compare', `${this.prodA.id},${this.prodB.id}`);
      window.history.replaceState({}, '', url);
    }

    closeCrucible() {
      $('#qx_crucible_backdrop').removeClass('active');
      $('#qx_crucible_modal').removeClass('active');
      $('body').css('overflow', '');

      const url = new URL(window.location);
      url.searchParams.delete('compare');
      window.history.replaceState({}, '', url);
    }

    setMode(mode) {
      this.currentMode = mode;
      $('.qx-crucible-tab-btn').removeClass('active');
      $(`.qx-crucible-tab-btn[data-mode="${mode}"]`).addClass('active');

      const $stage = $('#qx_crucible_stage');
      const $fusion = $('#qx_fusion_overlay');

      if (mode === 'xray') {
        $stage.removeClass('split-mode');
        $fusion.hide();
        this.updateSliderPosition(this.sliderPct);
      } else if (mode === 'split') {
        $stage.addClass('split-mode');
        $fusion.hide();
      } else if (mode === 'fusion') {
        $stage.removeClass('split-mode');
        $fusion.css('display', 'flex').show();
        this.playAudioFusionChime();
      }
    }

    renderStageProducts() {
      const self = this;
      const pA = this.prodA;
      const pB = this.prodB;

      const photoA = (pA.photos && pA.photos.length) ? (pA.photos[0].url || pA.photos[0].thumb) : pA.cover;
      const photoB = (pB.photos && pB.photos.length) ? (pB.photos[0].url || pB.photos[0].thumb) : pB.cover;

      $('#qx_stage_img_a').attr('src', photoA);
      $('#qx_stage_img_b').attr('src', photoB);

      self.storefront.flaconEngine.isolateSilhouette(photoA).then(transUrl => {
        $('#qx_stage_img_a').attr('src', transUrl);
      });
      self.storefront.flaconEngine.isolateSilhouette(photoB).then(transUrl => {
        $('#qx_stage_img_b').attr('src', transUrl);
      });

      $('#qx_stage_name_a').text(pA.name);
      $('#qx_stage_price_a').text(`$ ${self.storefront.formatMoney(pA.priceWithTax)} MXN`);

      $('#qx_stage_name_b').text(pB.name);
      $('#qx_stage_price_b').text(`$ ${self.storefront.formatMoney(pB.priceWithTax)} MXN`);

      $('#qx_legend_label_a').text(pA.name);
      $('#qx_legend_label_b').text(pB.name);
    }

    updateSliderPosition(pct) {
      this.sliderPct = Math.max(5, Math.min(95, pct));
      $('#qx_xray_slider').css('left', `${this.sliderPct}%`);
      $('#qx_stage_layer_b').css('clip-path', `polygon(${this.sliderPct}% 0, 100% 0, 100% 100%, ${this.sliderPct}% 100%)`);
    }

    renderAiVerdict() {
      const pA = this.prodA;
      const pB = this.prodB;

      const catA = (pA.category || '').toUpperCase();
      const isPerfume = catA.includes('PERFUM') || this.storefront.tenant?.quantixStorePerfums === 'SI';

      let verdictText = '';
      let badges = [];

      if (isPerfume) {
        verdictText = `Si buscas una firma olfativa de proyección imponente y estela magnética para veladas y eventos formales, elije <strong>${pA.name}</strong>. Si tu preferencia se inclina hacia versatilidad diurna, frescura y elegancia cotidiana, elije <strong>${pB.name}</strong>. Combinados en layering generan un acorde único de más de 14 horas de longevidad.`;
        badges = [
          `<span class="qx-verdict-pill">👑 ${pA.name}: Estela & Opulencia</span>`,
          `<span class="qx-verdict-pill">⚡ ${pB.name}: Versatilidad Diurna</span>`,
          `<span class="qx-verdict-pill">🔮 Sinergia: 14h Dry-Down Layering</span>`
        ];
      } else {
        verdictText = `<strong>${pA.name}</strong> ofrece rendimiento de grado profesional y máxima robustez para uso intensivo. <strong>${pB.name}</strong> destaca por su balance insuperable de portabilidad, versatilidad y eficiencia de costo.`;
        badges = [
          `<span class="qx-verdict-pill">⚡ ${pA.name}: Máxima Potencia</span>`,
          `<span class="qx-verdict-pill">💎 ${pB.name}: Mejor Inversión</span>`
        ];
      }

      $('#qx_crucible_verdict_text').html(verdictText);
      $('#qx_crucible_verdict_badges').html(badges.join(''));
    }

    renderDualRadar() {
      const pA = this.prodA;
      const pB = this.prodB;

      const getMetrics = (p, defaultBias) => {
        const name = (p.name || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        let c = 75, w = 70, sp = 65, sw = 60, m = 50, l = 55;
        if (name.includes('dive') || name.includes('aqua') || name.includes('blue') || cat.includes('fresco')) {
          c = 92; m = 96; sp = 60; w = 65; sw = 70; l = 45;
        } else if (name.includes('oud') || name.includes('black') || name.includes('amber') || name.includes('obsidian')) {
          w = 95; l = 90; sp = 85; sw = 60; c = 50; m = 35;
        } else {
          c = 70 + defaultBias; w = 80 - defaultBias; sp = 75; sw = 70 + defaultBias; m = 60; l = 65;
        }
        return [c, w, sp, sw, m, l];
      };

      const valsA = getMetrics(pA, 10);
      const valsB = getMetrics(pB, -10);

      const radius = 90;
      const totalAxes = 6;
      let gridSvg = '';
      let polyA = [];
      let polyB = [];

      [0.25, 0.5, 0.75, 1.0].forEach(rPct => {
        let ringPoints = [];
        for (let i = 0; i < totalAxes; i++) {
          const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
          const x = Math.cos(angle) * radius * rPct;
          const y = Math.sin(angle) * radius * rPct;
          ringPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
        }
        gridSvg += `<polygon points="${ringPoints.join(' ')}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
      });

      const labels = ['Cítrico', 'Amaderado', 'Especiado', 'Dulce', 'Marino', 'Cuero'];
      for (let i = 0; i < totalAxes; i++) {
        const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        gridSvg += `<line x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>`;
        
        const lx = Math.cos(angle) * (radius + 20);
        const ly = Math.sin(angle) * (radius + 14);
        gridSvg += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" fill="#94a3b8" font-size="9" font-weight="700" text-anchor="middle" dominant-baseline="central">${labels[i]}</text>`;

        const valA = (valsA[i] / 100) * radius;
        polyA.push(`${(Math.cos(angle) * valA).toFixed(1)},${(Math.sin(angle) * valA).toFixed(1)}`);

        const valB = (valsB[i] / 100) * radius;
        polyB.push(`${(Math.cos(angle) * valB).toFixed(1)},${(Math.sin(angle) * valB).toFixed(1)}`);
      }

      const svg = `
        ${gridSvg}
        <polygon points="${polyA.join(' ')}" fill="rgba(245, 158, 11, 0.25)" stroke="#f59e0b" stroke-width="2.5" />
        <polygon points="${polyB.join(' ')}" fill="rgba(56, 189, 248, 0.25)" stroke="#38bdf8" stroke-width="2.5" />
      `;

      $('#qx_dual_radar_svg').html(svg);
    }

    renderFusionState() {
      const pA = this.prodA;
      const pB = this.prodB;

      const totalRaw = pA.priceWithTax + pB.priceWithTax;
      const discount = totalRaw * 0.15;
      const bundlePrice = totalRaw - discount;

      $('#qx_fusion_title').text(`Dúo Maestro: ${pA.name} + ${pB.name}`);
      $('#qx_fusion_old_price').text(`$ ${this.storefront.formatMoney(totalRaw)}`);
      $('#qx_fusion_new_price').text(`$ ${this.storefront.formatMoney(bundlePrice)} MXN`);

      const radius = 55;
      const totalAxes = 6;
      let gridSvg = '';
      let polyFusion = [];

      [0.5, 1.0].forEach(rPct => {
        let ringPoints = [];
        for (let i = 0; i < totalAxes; i++) {
          const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
          ringPoints.push(`${(Math.cos(angle) * radius * rPct).toFixed(1)},${(Math.sin(angle) * radius * rPct).toFixed(1)}`);
        }
        gridSvg += `<polygon points="${ringPoints.join(' ')}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;
      });

      for (let i = 0; i < totalAxes; i++) {
        const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
        const hybridVal = Math.min(100, 75 + (i * 4)) / 100 * radius;
        polyFusion.push(`${(Math.cos(angle) * hybridVal).toFixed(1)},${(Math.sin(angle) * hybridVal).toFixed(1)}`);
      }

      const svg = `
        ${gridSvg}
        <polygon points="${polyFusion.join(' ')}" fill="rgba(192, 132, 252, 0.35)" stroke="#c084fc" stroke-width="2" />
      `;
      $('#qx_fusion_radar_svg').html(svg);
    }

    renderSpecDiffTable() {
      const pA = this.prodA;
      const pB = this.prodB;
      const self = this;

      const rows = [
        { label: 'Categoría', a: pA.category || 'General', b: pB.category || 'General' },
        { label: 'Precio Lista (IVA Incluido)', a: `$ ${self.storefront.formatMoney(pA.priceWithTax)} MXN`, b: `$ ${self.storefront.formatMoney(pB.priceWithTax)} MXN`, winner: pA.priceWithTax < pB.priceWithTax ? 'a' : 'b' },
        { label: 'Longevidad Estimada', a: '12 - 14 Horas', b: '8 - 10 Horas', winner: 'a' },
        { label: 'Estela / Proyección', a: 'Intensa (Room-Filler)', b: 'Moderada / Elegante', winner: 'a' },
        { label: 'Ocasión Ideal', a: 'Gala / Noche / Clima Frío', b: 'Diario / Oficina / Calor', winner: 'both' },
        { label: 'Garantía Blind-Buy Shield', a: '100% Bonificable', b: '100% Bonificable', winner: 'both' },
        { label: 'Facturación CFDI 4.0', a: 'Disponible al Instante', b: 'Disponible al Instante', winner: 'both' },
        { label: 'Código SAT', a: pA.satCode || '53131600', b: pB.satCode || '53131600' }
      ];

      let html = `
        <thead>
          <tr>
            <th>Atributo</th>
            <th>${self.storefront.esc(pA.name)}</th>
            <th>${self.storefront.esc(pB.name)}</th>
          </tr>
        </thead>
        <tbody>
      `;

      rows.forEach(r => {
        const winA = r.winner === 'a' || r.winner === 'both';
        const winB = r.winner === 'b' || r.winner === 'both';
        html += `
          <tr>
            <td style="color:var(--qx-text-muted); font-weight:700;">${r.label}</td>
            <td class="${winA ? 'winner-cell' : ''}">${r.a} ${r.winner === 'a' ? '★' : ''}</td>
            <td class="${winB ? 'winner-cell' : ''}">${r.b} ${r.winner === 'b' ? '★' : ''}</td>
          </tr>
        `;
      });

      html += '</tbody>';
      $('#qx_diff_table').html(html);
    }

    shareWhatsApp() {
      const pA = this.prodA;
      const pB = this.prodB;
      const shareUrl = `${window.location.origin}${window.location.pathname}?emisor=${encodeURIComponent(this.storefront.tenant?.emisorId || '')}&compare=${pA.id},${pB.id}`;
      const text = `👑 *Comparativa Exclusiva de Productos*:
1️⃣ *${pA.name}* ($${this.storefront.formatMoney(pA.priceWithTax)} MXN)
2️⃣ *${pB.name}* ($${this.storefront.formatMoney(pB.priceWithTax)} MXN)

Explora la comparativa interactiva y el veredicto en vivo aquí:
${shareUrl}`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }

    initEvents() {
      const self = this;

      $('#qx_btn_launch_crucible').on('click', () => {
        self.openCrucible();
      });

      $('#qx_btn_dock_clear').on('click', () => {
        self.clearAll();
      });

      $('#qx_crucible_close, #qx_crucible_backdrop').on('click', () => {
        self.closeCrucible();
      });

      $('.qx-crucible-tab-btn').on('click', function() {
        const mode = $(this).data('mode');
        self.setMode(mode);
      });

      $('#qx_select_prod_a').on('change', function() {
        self.openCrucible($(this).val(), self.prodB.id);
      });
      $('#qx_select_prod_b').on('change', function() {
        self.openCrucible(self.prodA.id, $(this).val());
      });

      $('#qx_btn_choose_a').on('click', () => {
        self.storefront.addToCart(self.prodA, 1);
        self.closeCrucible();
      });
      $('#qx_btn_choose_b').on('click', () => {
        self.storefront.addToCart(self.prodB, 1);
        self.closeCrucible();
      });

      $('#qx_btn_fusion_add_pack').on('click', () => {
        self.storefront.addToCart(self.prodA, 1);
        self.storefront.addToCart(self.prodB, 1);
        self.storefront.showToast('✨ ¡Paquete Dúo agregado al carrito con 15% OFF!');
        self.closeCrucible();
        self.storefront.openCartDrawer();
      });

      $('#qx_crucible_btn_share').on('click', () => {
        self.shareWhatsApp();
      });

      $('#qx_pmodal_btn_compare').on('click', () => {
        if (self.storefront.currentModalProduct) {
          self.toggleProduct(self.storefront.currentModalProduct);
          self.storefront.closeProductModal();
          self.openCrucible(self.storefront.currentModalProduct.id);
        }
      });

      const $stage = $('#qx_crucible_stage');
      const $slider = $('#qx_xray_slider');

      $slider.on('mousedown touchstart', (e) => {
        self.isDraggingSlider = true;
        self.initAudio();
      });

      $(window).on('mousemove touchmove', (e) => {
        if (!self.isDraggingSlider) return;
        const pageX = e.pageX || (e.originalEvent.touches && e.originalEvent.touches[0].pageX);
        const stageOffset = $stage.offset();
        const stageWidth = $stage.width();
        if (!stageOffset || stageWidth <= 0) return;

        const relX = pageX - stageOffset.left;
        const pct = (relX / stageWidth) * 100;
        self.updateSliderPosition(pct);
        self.playAudioTick(1000 + Math.round(pct * 8));
      });

      $(window).on('mouseup touchend', () => {
        self.isDraggingSlider = false;
      });

      $(window).on('keydown', (e) => {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;

        if ((e.key === 'v' || e.key === 'V' || e.key === 'c' || e.key === 'C') && !$('#qx_crucible_modal').hasClass('active')) {
          self.openCrucible();
        } else if (e.key === 'Escape' && $('#qx_crucible_modal').hasClass('active')) {
          self.closeCrucible();
        } else if ((e.key === 'f' || e.key === 'F') && $('#qx_crucible_modal').hasClass('active')) {
          self.setMode('fusion');
        } else if (e.key === 'ArrowLeft' && $('#qx_crucible_modal').hasClass('active')) {
          self.updateSliderPosition(self.sliderPct - 5);
          self.playAudioTick(900);
        } else if (e.key === 'ArrowRight' && $('#qx_crucible_modal').hasClass('active')) {
          self.updateSliderPosition(self.sliderPct + 5);
          self.playAudioTick(1300);
        }
      });

      setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const compareParam = urlParams.get('compare');
        if (compareParam) {
          const ids = compareParam.split(',');
          if (ids.length >= 2) {
            self.openCrucible(ids[0], ids[1]);
          }
        }
      }, 500);
    }
  }

  window.WeatherEngine = WeatherEngine;
  window.ScentRadarEngine = ScentRadarEngine;
  window.DecantPassportEngine = DecantPassportEngine;
  window.LoyaltyVaultEngine = LoyaltyVaultEngine;
  window.TastingRoomEngine = TastingRoomEngine;
  window.RoyalConciergeAgendaEngine = RoyalConciergeAgendaEngine;
  window.QuantumComparisonStudio = QuantumComparisonStudio;

  class QuantixStorefront {
    constructor() {
      this.flaconEngine = new FloatingFlaconEngine();
      this.weatherEngine = new WeatherEngine();
      this.radarEngine = new ScentRadarEngine();
      this.passportEngine = new DecantPassportEngine(this);
      this.loyalty = new LoyaltyVaultEngine(this);
      this.tasting = new TastingRoomEngine(this);
      this.royalAgenda = new RoyalConciergeAgendaEngine(this);
      this.comparisonStudio = new QuantumComparisonStudio(this);
      this.appliedVoucher = null;
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

      // Layering Alchemy State
      this.layeringBaseProd = null;
      this.layeringAccentProd = null;
      this.layeringSynergyData = null;
      this.fusionAnimId = null;
      this.fusionParticles = [];

      this.init();
    }

    init() {
      this.bindGlobalEvents();
      this.initSensoryAtelier();
      this.loadCatalog();
      this.renderCartUI();
      this.passportEngine.loadPassport();
      this.loyalty.init();
      this.tasting.init();
      this.royalAgenda.init();
      
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
        self.openSommelier();
      });
      $('#qx_dock_sommelier').on('click', function() {
        self.playHaptic('medium');
        self.openSommelier();
      });
      $('#qx_btn_sommelier_trigger').on('click', function(e) {
        e.preventDefault();
        self.playHaptic('medium');
        self.openSommelier();
      });
      $('#qx_dock_cart').on('click', function() {
        self.playHaptic('medium');
        self.openCart();
      });

      // Aura AI Sommelier Modal Events
      $('#qx_somm_close, #qx_sommelier_backdrop').on('click', () => self.closeSommelier());

      $('#qx_somm_chips .qx-somm-chip').on('click', function() {
        self.playHaptic('light');
        $('#qx_somm_chips .qx-somm-chip').removeClass('active');
        $(this).addClass('active');
        const prompt = $(this).data('prompt');
        $('#qx_somm_input').val(prompt);
        self.querySommelier(prompt);
      });

      let sommDebounce = null;
      $('#qx_somm_input').on('input', function() {
        const val = $(this).val().trim();
        clearTimeout(sommDebounce);
        sommDebounce = setTimeout(() => {
          self.querySommelier(val);
        }, 300);
      });

      $('#qx_somm_voice_btn').on('click', function() {
        self.toggleVoiceSearch();
      });

      // Cart Drawer Toggle
      $('#qx_cart_btn').on('click', () => self.openCart());
      $('#qx_cart_close, #qx_cart_backdrop').on('click', () => self.closeCart());

      // Digital Decant Passport Toggle
      $('#qx_btn_nav_passport, #qx_dock_passport').on('click', () => self.openPassportModal());
      $('#qx_passport_close, #qx_passport_backdrop').on('click', () => self.closePassportModal());

      // Cart Voucher Apply & Remove
      $('#qx_btn_apply_voucher').on('click', () => {
        const code = $('#qx_voucher_input').val().trim();
        self.applyVoucher(code);
      });
      $('#qx_btn_remove_voucher').on('click', () => self.removeVoucher());
      $('#qx_voucher_input').on('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          self.applyVoucher($(this).val().trim());
        }
      });

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

      // Format Selector in Product Modal
      $('#qx_format_full').on('click', function() {
        self.playHaptic('light');
        self.setModalFormat('full');
      });

      $('#qx_format_decant').on('click', function() {
        self.playHaptic('light');
        self.setModalFormat('decant');
      });

      // Smart Upsell Add in Cart Drawer
      $('#qx_btn_upsell_add').on('click', function() {
        self.playHaptic('success');
        const prodId = $(this).data('prod-id');
        if (prodId) {
          self.addToCart(prodId, 1, null, 'decant');
          self.showToast('🧪 ¡Decant de viaje agregado a tu bolsa!');
        }
      });

      $('#qx_pmodal_btn_add').on('click', function() {
        self.playHaptic('success');
        if (self.activeProductModal) {
          const prod = self.activeProductModal;
          const qty = self.pmodalQty || 1;
          const format = self.activeProductFormat || 'full';
          const isSub = format === 'full' && self.loyalty?.selectedPurchaseMode === 'subscription';
          const subOptions = isSub ? {
            isSubscription: true,
            frequencyMonths: self.loyalty.selectedFrequencyMonths || 3,
            discountPct: 12
          } : {};
          self.closeProductModal(false);
          self.addToCart(prod, qty, $('#qx_pmodal_main_img'), format, subOptions);
        }
      });

      $('#qx_pmodal_btn_buy, #qx_pmodal_bar_buy').on('click', function() {
        self.playHaptic('success');
        if (self.activeProductModal) {
          const prod = self.activeProductModal;
          const qty = self.pmodalQty || 1;
          const format = self.activeProductFormat || 'full';
          const isSub = format === 'full' && self.loyalty?.selectedPurchaseMode === 'subscription';
          const subOptions = isSub ? {
            isSubscription: true,
            frequencyMonths: self.loyalty.selectedFrequencyMonths || 3,
            discountPct: 12
          } : {};
          self.closeProductModal(false);
          self.addToCart(prod, qty, null, format, subOptions);
          self.openCheckout();
        }
      });

      // Layering Alchemy Atelier Triggers & Actions
      $('#qx_btn_nav_layering, #qx_dock_layering').on('click', function() {
        self.playHaptic('light');
        self.openLayeringModal();
      });

      $('#qx_pmodal_btn_layering').on('click', function() {
        self.playHaptic('light');
        const prod = self.activeProductModal || self.products[0];
        self.closeProductModal(false);
        self.openLayeringModal(prod);
      });

      $('#qx_layering_close, #qx_layering_backdrop').on('click', function() {
        self.playHaptic('light');
        self.closeLayeringModal();
      });

      $('#qx_btn_swap_layering').on('click', function() {
        self.playHaptic('medium');
        self.swapLayeringFlacons();
      });

      $('#qx_btn_buy_duo_pack').on('click', function() {
        self.playHaptic('success');
        self.addDuoPackToCart('full');
      });

      $('#qx_btn_buy_duo_decants').on('click', function() {
        self.playHaptic('success');
        self.addDuoPackToCart('decant');
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

      // Feature 3: Radar Comparison & Weather Triggers
      $('#btn_open_radar_compare').on('click', () => {
        self.playHaptic('light');
        self.openRadarCompareModal();
      });
      $('#qx_compare_close, #qx_radar_compare_backdrop').on('click', () => {
        self.playHaptic('light');
        self.closeRadarCompareModal();
      });
      $('#qx_compare_rival_select').on('change', function() {
        self.playHaptic('light');
        self.selectRadarRival($(this).val());
      });
      $('#btn_change_weather_city').on('click', function() {
        self.playHaptic('light');
        self.weatherEngine.cycleNextCity();
        self.updateWeatherMatchDisplay();
      });
      $('#btn_buy_duo_from_compare').on('click', function() {
        self.playHaptic('success');
        if (self.compareBaseProduct && self.compareRivalProduct) {
          self.closeRadarCompareModal();
          self.closeProductModal(false);
          self.openLayeringModal(self.compareBaseProduct, self.compareRivalProduct);
        }
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

    renderGrid(reset = true) {
      const self = this;
      const grid = $('#qx_product_grid');

      if (reset) {
        grid.empty();
        this.renderedCount = 0;
      }

      if (!this.filteredProducts || this.filteredProducts.length === 0) {
        grid.html('<div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--qx-text-muted)">No se encontraron productos coincidentes.</div>');
        $('#qx_infinite_sentinel').remove();
        return;
      }

      const pageSize = (this.tenant && this.tenant.initialProductCount) ? parseInt(this.tenant.initialProductCount, 10) : 13;
      const startIdx = this.renderedCount;
      const endIdx = Math.min(startIdx + pageSize, this.filteredProducts.length);
      const batch = this.filteredProducts.slice(startIdx, endIdx);

      // Clean sentinel before appending new batch
      $('#qx_infinite_sentinel').remove();

      batch.forEach(p => {
        const card = self.createCardElement(p);
        grid.append(card);
      });

      this.renderedCount = endIdx;

      // Infinite Scroll Sentinel
      if (this.renderedCount < this.filteredProducts.length) {
        const sentinel = $(`
          <div id="qx_infinite_sentinel" style="grid-column:1/-1; text-align:center; padding:32px 16px; color:var(--qx-text-muted); font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; gap:10px;">
            <span style="display:inline-block; width:16px; height:16px; border:2px solid rgba(56,189,248,0.3); border-top-color:var(--qx-accent); border-radius:50%; animation:qx-spin 0.8s linear infinite;"></span>
            <span>✦ Desliza para cargar más fragancias (${this.renderedCount} de ${this.filteredProducts.length})...</span>
          </div>
        `);
        grid.append(sentinel);
        self.setupInfiniteScrollObserver(sentinel[0]);
      } else if (this.filteredProducts.length > pageSize) {
        const endIndicator = $(`
          <div id="qx_infinite_sentinel" style="grid-column:1/-1; text-align:center; padding:28px 16px; color:var(--qx-text-muted); font-size:12px; opacity:0.7;">
            ✦ Has explorado la colección completa (${this.filteredProducts.length} piezas)
          </div>
        `);
        grid.append(endIndicator);
      }
    }

    setupInfiniteScrollObserver(sentinelEl) {
      const self = this;
      if (this.infiniteObserver) {
        this.infiniteObserver.disconnect();
      }

      if ('IntersectionObserver' in window) {
        this.infiniteObserver = new IntersectionObserver((entries) => {
          if (entries[0] && entries[0].isIntersecting) {
            self.infiniteObserver.disconnect();
            setTimeout(() => {
              self.renderGrid(false);
            }, 100);
          }
        }, { rootMargin: '300px 0px' });

        this.infiniteObserver.observe(sentinelEl);
      } else {
        $(window).off('scroll.qxInfinite').on('scroll.qxInfinite', function() {
          if ($(window).scrollTop() + $(window).height() >= $(document).height() - 400) {
            $(window).off('scroll.qxInfinite');
            self.renderGrid(false);
          }
        });
      }
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

      // Real-Time Floating Flacon Isolation for Catalog Card
      self.flaconEngine.isolateSilhouette(initialPhoto).then(transUrl => {
        cardImg.attr('src', transUrl);
      });

      const media = $(`
        <div class="qx-card-media" title="Haz clic para ver detalles y fotos">
          <div class="qx-card-zoom-badge">✨ Ver Ficha</div>
          ${(self.tenant?.quantixStorePerfums === 'SI' && p.hasDecant !== false && self.tenant?.featureMatrix?.decant_passport?.enabled !== false) ? `<div class="qx-shield-badge" title="Garantía Blind-Buy Shield: 100% bonificable">🛡️ Shield</div>` : ''}
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
            <div class="qx-card-actions">
              <button type="button" class="qx-btn-compare-toggle ${self.comparisonStudio && self.comparisonStudio.isSelected(p.id) ? 'active' : ''}" data-id="${p.id}" title="Comparar en Quantum Studio">
                <span>⚖️</span>
              </button>
              <button type="button" class="qx-btn-add-cart">
                <span>+</span> Agregar
              </button>
            </div>
          </div>
        </div>
      `);

      body.find('.qx-card-title').on('click', () => {
        self.openProductModal(p);
      });

      body.find('.qx-btn-compare-toggle').on('click', (e) => {
        e.stopPropagation();
        if (self.comparisonStudio) {
          self.comparisonStudio.toggleProduct(p);
        }
      });

      body.find('.qx-btn-add-cart').on('click', (e) => {
        e.stopPropagation();
        self.addToCart(p, 1, card.find('.qx-card-img'));
      });

      // 3D Parallax Micro-Tilt on Card Hover (Desktop)
      card.on('mousemove', function(e) {
        if (window.innerWidth <= 768) return;
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rx = ((y - cy) / cy) * -8;
        const ry = ((x - cx) / cx) * 10;
        card.css('transform', `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale3d(1.025, 1.025, 1.025)`);
      });

      card.on('mouseleave', function() {
        card.css('transform', '');
      });

      card.append(media).append(body);
      return card;
    }

    addToCart(productOrId, qty = 1, originEl = null, format = 'full', options = {}) {
      let product = productOrId;
      if (typeof productOrId === 'string' || typeof productOrId === 'number') {
        product = this.products.find(p => p.id == productOrId);
      }
      if (!product) return;

      const isDecant = format === 'decant';
      const isSubscription = options.isSubscription || false;
      const freqMonths = options.frequencyMonths || 3;
      const discountPct = options.discountPct || 12;

      let itemId = product.id;
      let itemName = product.name;
      let itemPriceWithTax = product.priceWithTax;

      if (isDecant) {
        itemId = `${product.id}__decant`;
        itemName = `${product.name} (Decant 5ml)`;
        itemPriceWithTax = product.decantPrice || Math.round(product.priceWithTax * 0.18);
      } else if (isSubscription) {
        itemId = `${product.id}__sub_${freqMonths}m`;
        itemName = `${product.name} (Auto-Recarga Cada ${freqMonths} Meses)`;
        itemPriceWithTax = Math.round(product.priceWithTax * (1 - discountPct / 100));
      }

      const vatRate = product.vatRate || 16;
      const unitPrice = itemPriceWithTax / (1 + vatRate / 100);

      const existing = this.cart.items.find(item => item.id === itemId);
      if (existing) {
        existing.qty += qty;
      } else {
        this.cart.items.push({
          id: itemId,
          baseId: product.id,
          code: product.code,
          sku: isDecant ? (product.sku ? `${product.sku}-DEC5` : 'DEC-5ML') : (isSubscription ? `${product.sku}-SUB${freqMonths}M` : product.sku),
          name: itemName,
          thumb: product.cover,
          unitPrice: unitPrice,
          vatRate: vatRate,
          priceWithTax: itemPriceWithTax,
          isDecant: isDecant,
          isSubscription: isSubscription,
          frequencyMonths: freqMonths,
          discountPct: discountPct,
          qty: qty
        });
      }

      // If subscription, append free gift travel atomizer
      if (isSubscription) {
        const giftId = `gift_atomizer_${product.id}`;
        if (!this.cart.items.some(i => i.id === giftId)) {
          this.cart.items.push({
            id: giftId,
            baseId: product.id,
            code: 'GIFT-ATOMIZER',
            sku: 'GIFT-TRAV-5ML',
            name: '🎁 Atomizador de Bolsillo 5ml de Cortesía',
            thumb: product.cover,
            unitPrice: 0,
            vatRate: 16,
            priceWithTax: 0,
            isGift: true,
            qty: 1
          });
        }
      }

      this.saveCart();
      this.showToast(`✔ ${itemName} agregado a la bolsa`);
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
        $('#qx_cart_upsell').hide();
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

        const decantBadge = (item.isDecant && !item.isDuoPack) ? `<span style="display:inline-block; font-size:10px; font-weight:800; background:rgba(236,72,153,0.18); color:#f472b6; border:1px solid rgba(236,72,153,0.4); padding:1px 6px; border-radius:999px; margin-left:4px;">🧪 Decant 5ml</span>` : '';
        const duoBadge = item.isDuoPack ? (item.isDecant ? `<span style="display:inline-block; font-size:10px; font-weight:800; background:linear-gradient(135deg,rgba(168,85,247,0.25),rgba(236,72,153,0.25)); color:#f5d0fe; border:1px solid rgba(216,180,254,0.4); padding:1px 6px; border-radius:999px; margin-left:4px;">🧪 Dueto Decants (15% OFF)</span>` : `<span style="display:inline-block; font-size:10px; font-weight:800; background:linear-gradient(135deg,rgba(168,85,247,0.25),rgba(236,72,153,0.25)); color:#f5d0fe; border:1px solid rgba(216,180,254,0.4); padding:1px 6px; border-radius:999px; margin-left:4px;">🎁 Duo Pack (15% OFF)</span>`) : '';
        const subBadge = item.isSubscription ? `<span class="qx-cart-item-refill-badge">🔄 Auto-Recarga (12% OFF)</span>` : '';
        const giftBadge = item.isGift ? `<span class="qx-cart-free-atomizer-badge">🎁 CORTESÍA $0.00</span>` : '';

        const row = $(`
          <div class="qx-cart-item">
            <img class="qx-cart-item-img" src="${self.esc(item.thumb)}" alt="">
            <div class="qx-cart-item-info">
              <div class="qx-cart-item-name">${self.esc(item.name)} ${decantBadge} ${duoBadge} ${subBadge} ${giftBadge}</div>
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

      // Render Smart Decant Upsell if applicable
      const fullBottleItem = this.cart.items.find(i => !i.isDecant);
      if (fullBottleItem) {
        const fullProd = this.products.find(p => p.id === (fullBottleItem.baseId || fullBottleItem.id));
        const hasDecantInCart = this.cart.items.some(i => i.isDecant && (i.baseId === fullProd?.id || i.id === `${fullProd?.id}__decant`));
        if (fullProd && fullProd.hasDecant && !hasDecantInCart) {
          const decPrice = fullProd.decantPrice || Math.round(fullProd.priceWithTax * 0.18);
          $('#qx_upsell_img').attr('src', fullProd.cover);
          $('#qx_upsell_name').text(`${fullProd.name} (5ml)`);
          $('#qx_upsell_price').text(`+ $ ${self.formatMoney(decPrice)} MXN`);
          $('#qx_btn_upsell_add').data('prod-id', fullProd.id);
          $('#qx_cart_upsell').show();
        } else {
          $('#qx_cart_upsell').hide();
        }
      }

      // Handle Decant Passport Cash-Back Voucher Discount
      let discountAmount = 0;
      if (this.appliedVoucher) {
        discountAmount = Math.min(subtotal + totalIva, this.appliedVoucher.amount);
        $('#qx_cart_discount_row').show();
        $('#qx_cart_discount_amount').text(`- $ ${self.formatMoney(discountAmount)}`);
        $('#qx_voucher_applied_pill').show();
        $('#qx_voucher_applied_label').text(`🛡️ ${this.appliedVoucher.code} (-$${self.formatMoney(discountAmount)})`);
        $('#qx_voucher_input').hide();
        $('#qx_btn_apply_voucher').hide();
      } else {
        $('#qx_cart_discount_row').hide();
        $('#qx_voucher_applied_pill').hide();
        $('#qx_voucher_input').show().val('');
        $('#qx_btn_apply_voucher').show();
      }

      const grandTotal = Math.max(0, subtotal + totalIva - discountAmount);
      $('#qx_cart_subtotal').text(`$ ${self.formatMoney(subtotal)}`);
      $('#qx_cart_iva').text(`$ ${self.formatMoney(totalIva)}`);
      $('#qx_cart_total').text(`$ ${self.formatMoney(grandTotal)}`);
      $('#qx_btn_proceed_checkout').prop('disabled', false).css('opacity', '1');
    }

    async applyVoucher(code) {
      if (!code) return;
      try {
        const tenant = this.tenant?.emisorId || '00163e311ce9a3e711f1591962781ba6';
        const res = await fetch(`api/passport.php?action=apply_voucher&tenant=${encodeURIComponent(tenant)}&code=${encodeURIComponent(code)}`);
        const data = await res.json();
        if (data.Status === 'OK' && data.Valid) {
          this.appliedVoucher = data.Voucher;
          this.playHaptic('success');
          this.showToast(`🛡️ Cupón ${data.Voucher.code} aplicado (-$${this.formatMoney(data.Voucher.amount)})`);
          this.renderCartUI();
        } else {
          this.showToast(data.Error || 'Cupón inválido o expirado');
        }
      } catch (err) {
        console.error('Error applying voucher:', err);
      }
    }

    removeVoucher() {
      this.appliedVoucher = null;
      this.playHaptic('light');
      this.showToast('Cupón removido');
      this.renderCartUI();
    }

    openPassportModal() {
      this.passportEngine.openPassportModal();
    }

    closePassportModal() {
      this.passportEngine.closePassportModal();
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
             $('#qx_vault_modal').hasClass('active') ||
             $('#qx_tasting_modal').hasClass('active') ||
             $('#qx_agenda_modal').hasClass('active') ||
             $('#qx_passport_modal').hasClass('active') ||
             $('#qx_radar_compare_modal').hasClass('active') ||
             $('#qx_layering_modal').hasClass('active') ||
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

        // Real-Time Floating Flacon Isolation
        const originalSrc = photo.url || photo.thumb;
        self.flaconEngine.isolateSilhouette(originalSrc).then(transUrl => {
          slide.find('img').attr('src', transUrl);
        });
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

      const isPerfums = (self.tenant?.quantixStorePerfums === 'SI');

      // Specs / Description
      const defaultGenericDesc = `Artículo garantizado de ${self.tenant ? self.tenant.brandName : 'Boutique Oficial'}. Calidad garantizada con emisión de comprobante fiscal SAT CFDI 4.0 al instante.`;
      const defaultPerfumeDesc = `Fragancia y artículo exclusivo de ${self.tenant ? self.tenant.brandName : 'Boutique Oficial'}. Calidad premium garantizada con emisión de comprobante fiscal SAT CFDI 4.0 al instante.`;
      const desc = product.notes ? product.notes : (isPerfums ? defaultPerfumeDesc : defaultGenericDesc);
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

      // Reset & Populate Format Selector (Full Bottle vs Decant)
      this.activeProductFormat = 'full';
      $('#qx_format_full').addClass('active');
      $('#qx_format_decant').removeClass('active');
      $('#qx_format_price_full').text(`$ ${self.formatMoney(product.priceWithTax)}`);
      
      const decPrice = product.decantPrice || Math.round(product.priceWithTax * 0.18);
      $('#qx_format_price_decant').text(`$ ${self.formatMoney(decPrice)}`);

      if (isPerfums && product.hasDecant !== false && self.tenant?.featureMatrix?.decant_passport?.enabled !== false) {
        $('#qx_format_selector').show();
        $('#qx_shield_guarantee_card').show();
      } else {
        $('#qx_format_selector').hide();
        $('#qx_shield_guarantee_card').hide();
      }

      // Reset Refill Subscription Selector
      if (this.loyalty) {
        this.loyalty.selectedPurchaseMode = 'once';
        this.loyalty.selectedFrequencyMonths = 3;
      }
      $('#qx_refill_opt_once').prop('checked', true);
      $('#qx_refill_opt_once_lbl').addClass('active');
      $('#qx_refill_opt_sub_lbl').removeClass('active');
      $('#qx_refill_freq_row').hide();
      $('.qx-freq-pill').removeClass('active').eq(0).addClass('active');

      if (isPerfums && self.tenant?.featureMatrix?.loyalty_refill_vault?.enabled !== false) {
        $('#qx_refill_subscription_card').show();
      } else {
        $('#qx_refill_subscription_card').hide();
      }

      $('#qx_pmodal_btn_add span').text('🛍️ Agregar al Carrito');
      $('#qx_pmodal_btn_buy span').text('⚡ Comprar Ahora');

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

      // Layering Button
      if (isPerfums && self.tenant?.featureMatrix?.layering_crucible?.enabled !== false) {
        $('#qx_pmodal_btn_layering').show();
      } else {
        $('#qx_pmodal_btn_layering').hide();
      }

      // Render Adaptive Specs & Metric Bars
      this.renderAdaptiveSpecs(product);

      // Render Scent Trail Radar & Live Weather (Feature 3)
      if (isPerfums && self.tenant?.featureMatrix?.scent_radar?.enabled !== false) {
        $('#qx_pmodal_radar_section').show();
        this.renderProductRadarSection(product);
      } else {
        $('#qx_pmodal_radar_section').hide();
      }

      // Set dynamic aura colors & living float
      if (isPerfums) {
        const auraColor = product.auraColor || 'cyan';
        const auraGlowMap = {
          cyan: { bg: 'rgba(56, 189, 248, 0.18)', core: 'rgba(56, 189, 248, 0.45)', halo: 'rgba(56, 189, 248, 0.35)' },
          gold: { bg: 'rgba(251, 191, 36, 0.18)', core: 'rgba(251, 191, 36, 0.45)', halo: 'rgba(251, 191, 36, 0.35)' },
          amber: { bg: 'rgba(249, 115, 22, 0.18)', core: 'rgba(249, 115, 22, 0.45)', halo: 'rgba(249, 115, 22, 0.35)' },
          emerald: { bg: 'rgba(52, 211, 153, 0.18)', core: 'rgba(52, 211, 153, 0.45)', halo: 'rgba(52, 211, 153, 0.35)' },
          rose: { bg: 'rgba(244, 114, 182, 0.18)', core: 'rgba(244, 114, 182, 0.45)', halo: 'rgba(244, 114, 182, 0.35)' },
          violet: { bg: 'rgba(167, 139, 250, 0.18)', core: 'rgba(167, 139, 250, 0.45)', halo: 'rgba(167, 139, 250, 0.35)' }
        };
        const glow = auraGlowMap[auraColor] || auraGlowMap.cyan;
        $('#qx_pmodal_stage').css({
          '--qx-aura-glow-bg': glow.bg,
          '--qx-aura-core': glow.core,
          '--qx-aura-halo': glow.halo
        });
        $('#qx_pmodal_swipe_track').addClass('qx-living-float');
        this.startScentAura(auraColor, product.auraParticles || 'breeze');
      } else {
        this.stopScentAura();
        $('#qx_pmodal_swipe_track').removeClass('qx-living-float');
        $('#qx_pmodal_stage').css({
          '--qx-aura-glow-bg': 'transparent',
          '--qx-aura-core': 'transparent',
          '--qx-aura-halo': 'transparent'
        });
      }

      // Open Modal
      $('#qx_product_modal_backdrop').addClass('active');
      $('#qx_product_modal').addClass('active');
    }

    setModalFormat(format) {
      if (!this.activeProductModal) return;
      this.activeProductFormat = format;
      const product = this.activeProductModal;
      const decPrice = product.decantPrice || Math.round(product.priceWithTax * 0.18);

      if (format === 'decant') {
        $('#qx_format_decant').addClass('active');
        $('#qx_format_full').removeClass('active');
        $('#qx_pmodal_price, #qx_pmodal_bar_price').text(`$ ${this.formatMoney(decPrice)}`);
        $('#qx_pmodal_btn_add span').text('🧪 Agregar Decant (5ml)');
        $('#qx_pmodal_btn_buy span').text('⚡ Comprar Decant Ahora');
        $('#qx_refill_subscription_card').slideUp(200);
        if (navigator.vibrate) navigator.vibrate([15]);
      } else {
        $('#qx_format_full').addClass('active');
        $('#qx_format_decant').removeClass('active');
        $('#qx_pmodal_price, #qx_pmodal_bar_price').text(`$ ${this.formatMoney(product.priceWithTax)}`);
        $('#qx_pmodal_btn_add span').text(this.loyalty?.selectedPurchaseMode === 'subscription' ? `🔄 Suscribirse (Cada ${this.loyalty?.selectedFrequencyMonths || 3} Meses - 12% OFF)` : '🛍️ Agregar al Carrito');
        $('#qx_pmodal_btn_buy span').text('⚡ Comprar Ahora');
        $('#qx_refill_subscription_card').slideDown(200);
        if (navigator.vibrate) navigator.vibrate([15]);
      }
    }

    closeProductModal(syncHistory = true) {
      this.stopScentAura();
      $('#qx_pmodal_swipe_track').removeClass('qx-living-float').css({ '--tilt-rx': '0deg', '--tilt-ry': '0deg' });
      $('#qx_pmodal_glass_sheen').css('--sheen-x', '-140%');

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
      const self = this;
      const isPerfums = (self.tenant?.quantixStorePerfums === 'SI');
      const container = $('#qx_pmodal_adaptive_specs').empty();
      const rawNotes = product.notes || '';

      // 1. Check for Olfactory Pyramid (Only for Perfume Tenants)
      if (isPerfums && /salida|coraz[oó]n|fondo/i.test(rawNotes)) {
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
      // 2. Check for Key:Value specs (e.g. CPU: i7 | RAM: 16GB, Voltaje: 220V)
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

      // Contextual Metric Labels
      if (isPerfums) {
        $('#qx_metric_label_1').text('Intensidad / Potencia');
        $('#qx_metric_label_2').text('Duración / Longevidad');
        $('#qx_metric_label_3').text('Versatilidad & Calidad');
      } else {
        $('#qx_metric_label_1').text('Disponibilidad Inmediata');
        $('#qx_metric_label_2').text('Garantía & Autenticidad');
        $('#qx_metric_label_3').text('Satisfacción de Clientes');
      }

      // Metric Bars Animation
      const hash = String(product.id || product.name).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const intensity = 80 + (hash % 19); // 80% - 98%
      const longevity = 85 + ((hash * 3) % 14); // 85% - 98%
      const quality = 90 + ((hash * 7) % 9); // 90% - 98%

      $('#qx_metric_val_1').text(`${intensity}%`);
      $('#qx_metric_val_2').text(`${longevity}%`);
      $('#qx_metric_val_3').text(`${quality}%`);

      setTimeout(() => {
        $('#qx_metric_bar_1').css('width', `${intensity}%`);
        $('#qx_metric_bar_2').css('width', `${longevity}%`);
        $('#qx_metric_bar_3').css('width', `${quality}%`);
      }, 50);
    }

    // =========================================================================
    // FEATURE 3: RADAR OLFATIVO & LIVE WEATHER PROFILER METHODS
    // =========================================================================
    renderProductRadarSection(product) {
      if (!product) return;
      const radar = product.radar || {
        proyeccion: 8,
        longevidad: 8.5,
        elogios: 94,
        versatilidad: 90,
        dulzorFrescura: -70,
        tempMin: 18,
        tempMax: 38
      };

      // 1. Generate & Insert SVG markup
      const svgMarkup = this.radarEngine.generateSvgMarkup(radar, null, product.auraColor || 'cyan');
      $('#qx_pmodal_radar_svg').html(svgMarkup);

      // 2. Populate 6 Tactical Metric Chips
      $('#qx_chip_proyeccion').text(`${radar.proyeccion || 7}/10`);
      
      const df = (radar.dulzorFrescura !== undefined) ? radar.dulzorFrescura : 0;
      let dfText = 'Balanceado';
      if (df <= -40) dfText = 'Cítrico / Marino';
      else if (df < 0) dfText = 'Fresco';
      else if (df >= 40) dfText = 'Gourmand / Dulce';
      else if (df > 0) dfText = 'Cálido';
      $('#qx_chip_espectro').text(dfText);

      $('#qx_chip_elogios').text(`${radar.elogios || 85}%`);
      $('#qx_chip_longevidad').text(`${radar.longevidad || 8.0}h`);
      $('#qx_chip_versatilidad').text(`${radar.versatilidad || 75}%`);
      $('#qx_chip_temperatura').text(`${radar.tempMin || 15}-${radar.tempMax || 30}°C`);

      // 3. Update Weather Match Card
      this.updateWeatherMatchDisplay(product);

      // 4. Attach Node Hover Tooltips
      const tooltip = $('#qx_radar_tooltip');
      const stage = $('#qx_radar_stage');
      $('#qx_pmodal_radar_svg .qx-radar-node').off('mouseenter mouseleave click').on('mouseenter click', function(e) {
        const desc = $(this).attr('data-desc');
        const label = $(this).attr('data-label');
        tooltip.html(`<strong>${label}</strong><br>${desc}`).show();
        const nodeX = parseFloat($(this).attr('cx'));
        const nodeY = parseFloat($(this).attr('cy'));
        const stageW = stage.width() || 340;
        const stageH = stage.height() || 280;
        const screenX = (nodeX / 320) * stageW + (stageW / 2);
        const screenY = (nodeY / 300) * stageH + (stageH / 2);
        tooltip.css({ left: `${screenX}px`, top: `${screenY}px` });
      }).on('mouseleave', function() {
        tooltip.hide();
      });

      // 5. Wire Chip Click Handlers
      const self = this;
      $('.qx-radar-chip').off('click').on('click', function() {
        self.playHaptic('light');
        const axisIdx = parseInt($(this).attr('data-axis'), 10);
        const targetNode = $(`#qx_pmodal_radar_svg .qx-radar-node[data-axis="${axisIdx}"]`);
        if (targetNode.length) {
          targetNode.trigger('click');
        }
      });
    }

    updateWeatherMatchDisplay(product = null) {
      const prod = product || this.activeProductModal;
      if (!prod) return;
      const radar = prod.radar || { tempMin: 18, tempMax: 38 };
      const thermal = this.weatherEngine.calculateThermalMatch(radar);

      $('#qx_weather_city_icon').text(thermal.city.icon);
      $('#qx_weather_city_name').text(thermal.city.name);
      $('#qx_weather_city_temp').text(`${thermal.temp}°C`);
      $('#qx_weather_match_score').text(`${thermal.matchScore}%`);
      $('#qx_weather_match_fill').css('width', `${thermal.matchScore}%`);
      $('#qx_weather_advice_text').html(thermal.advice);
    }

    openRadarCompareModal(baseProduct = null) {
      const base = baseProduct || this.activeProductModal || this.products[0];
      if (!base) return;
      this.compareBaseProduct = base;

      $('#qx_compare_base_name').text(base.name);

      // Populate rival select with all other products
      const select = $('#qx_compare_rival_select').empty();
      const rivals = this.products.filter(p => p.id !== base.id);
      
      rivals.forEach((p, idx) => {
        select.append(`<option value="${p.id}" ${idx === 0 ? 'selected' : ''}>${this.esc(p.name)}</option>`);
      });

      const initialRivalId = rivals.length ? rivals[0].id : null;
      if (initialRivalId) {
        this.selectRadarRival(initialRivalId);
      }

      $('#qx_radar_compare_backdrop').addClass('active');
      $('#qx_radar_compare_modal').addClass('active');
    }

    selectRadarRival(rivalId) {
      const rival = this.products.find(p => p.id === rivalId);
      if (!rival || !this.compareBaseProduct) return;
      this.compareRivalProduct = rival;

      const baseRadar = this.compareBaseProduct.radar || { proyeccion: 8, longevidad: 8.5, elogios: 94, versatilidad: 90, dulzorFrescura: -70, tempMin: 18, tempMax: 38 };
      const rivalRadar = rival.radar || { proyeccion: 9, longevidad: 11.5, elogios: 96, versatilidad: 70, dulzorFrescura: 80, tempMin: 10, tempMax: 23 };

      // Render dual radar SVG
      const svgMarkup = this.radarEngine.generateSvgMarkup(baseRadar, rivalRadar, this.compareBaseProduct.auraColor || 'cyan');
      $('#qx_compare_radar_svg').html(svgMarkup);

      // Populate delta comparison matrix
      const matrix = $('#qx_compare_delta_matrix').empty();

      // Proyección
      const projDiff = (rivalRadar.proyeccion || 7) - (baseRadar.proyeccion || 7);
      let projText = projDiff === 0 ? 'Misma proyección' : (projDiff > 0 ? `+${projDiff} pts superior en ${rival.name}` : `+${Math.abs(projDiff)} pts superior en ${this.compareBaseProduct.name}`);
      matrix.append(`
        <div class="qx-delta-row">
          <span class="qx-delta-metric-title">🚀 Proyección / Estela</span>
          <span class="qx-delta-comparison ${projDiff > 0 ? 'qx-delta-win-rival' : (projDiff < 0 ? 'qx-delta-win-base' : '')}">${projText}</span>
        </div>
      `);

      // Longevidad
      const longDiff = ((rivalRadar.longevidad || 8.0) - (baseRadar.longevidad || 8.0)).toFixed(1);
      let longText = Math.abs(parseFloat(longDiff)) < 0.1 ? 'Misma fijación' : (parseFloat(longDiff) > 0 ? `+${longDiff}h más fijación en ${rival.name}` : `+${Math.abs(parseFloat(longDiff))}h más fijación en ${this.compareBaseProduct.name}`);
      matrix.append(`
        <div class="qx-delta-row">
          <span class="qx-delta-metric-title">⏳ Longevidad en Piel</span>
          <span class="qx-delta-comparison ${parseFloat(longDiff) > 0 ? 'qx-delta-win-rival' : (parseFloat(longDiff) < 0 ? 'qx-delta-win-base' : '')}">${longText}</span>
        </div>
      `);

      // Elogios
      const elogDiff = (rivalRadar.elogios || 85) - (baseRadar.elogios || 85);
      let elogText = elogDiff === 0 ? 'Afinidad idéntica' : (elogDiff > 0 ? `+${elogDiff}% en ${rival.name}` : `+${Math.abs(elogDiff)}% en ${this.compareBaseProduct.name}`);
      matrix.append(`
        <div class="qx-delta-row">
          <span class="qx-delta-metric-title">👑 Factor de Elogios</span>
          <span class="qx-delta-comparison ${elogDiff > 0 ? 'qx-delta-win-rival' : (elogDiff < 0 ? 'qx-delta-win-base' : '')}">${elogText}</span>
        </div>
      `);

      // Versatilidad
      const versDiff = (rivalRadar.versatilidad || 75) - (baseRadar.versatilidad || 75);
      let versText = versDiff === 0 ? 'Misma versatilidad' : (versDiff > 0 ? `+${versDiff}% en ${rival.name}` : `+${Math.abs(versDiff)}% en ${this.compareBaseProduct.name}`);
      matrix.append(`
        <div class="qx-delta-row">
          <span class="qx-delta-metric-title">☀️ Versatilidad</span>
          <span class="qx-delta-comparison ${versDiff > 0 ? 'qx-delta-win-rival' : (versDiff < 0 ? 'qx-delta-win-base' : '')}">${versText}</span>
        </div>
      `);
    }

    closeRadarCompareModal() {
      $('#qx_radar_compare_backdrop').removeClass('active');
      $('#qx_radar_compare_modal').removeClass('active');
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

    openSommelier(initialPrompt) {
      this.playHaptic('medium');
      $('#qx_mobile_dock').addClass('hidden');
      $('#qx_sommelier_backdrop').addClass('active');
      $('#qx_sommelier_modal').addClass('active');
      const input = $('#qx_somm_input');
      if (initialPrompt) {
        input.val(initialPrompt);
        this.querySommelier(initialPrompt);
      } else if (!input.val()) {
        const defaultPrompt = 'algo fresco para la playa y clima de calor';
        $('#qx_somm_chips .qx-somm-chip').first().addClass('active');
        input.val(defaultPrompt);
        this.querySommelier(defaultPrompt);
      }
      setTimeout(() => input.focus(), 150);
    }

    closeSommelier() {
      $('#qx_sommelier_backdrop').removeClass('active');
      $('#qx_sommelier_modal').removeClass('active');
      if (!this.isModalOrDrawerOpen()) {
        $('#qx_mobile_dock').removeClass('hidden');
      }
      if (this.speechRecognition) {
        try { this.speechRecognition.stop(); } catch(e) {}
        $('#qx_somm_voice_btn').removeClass('recording');
      }
    }

    toggleVoiceSearch() {
      const self = this;
      const btn = $('#qx_somm_voice_btn');
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRec) {
        this.showToast('Reconocimiento de voz no disponible en este navegador. Escribe tu búsqueda.');
        return;
      }

      if (btn.hasClass('recording')) {
        if (this.speechRecognition) {
          try { this.speechRecognition.stop(); } catch(e) {}
        }
        btn.removeClass('recording');
        return;
      }

      try {
        const rec = new SpeechRec();
        rec.lang = 'es-MX';
        rec.continuous = false;
        rec.interimResults = false;

        rec.onstart = function() {
          btn.addClass('recording');
          self.playHaptic('medium');
          self.showToast('🎙️ Escuchando... Habla ahora');
        };

        rec.onresult = function(event) {
          btn.removeClass('recording');
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            $('#qx_somm_input').val(transcript);
            self.querySommelier(transcript);
          }
        };

        rec.onerror = function() {
          btn.removeClass('recording');
        };

        rec.onend = function() {
          btn.removeClass('recording');
        };

        this.speechRecognition = rec;
        rec.start();
      } catch (e) {
        btn.removeClass('recording');
      }
    }

    querySommelier(queryStr) {
      const self = this;
      const resultsContainer = $('#qx_somm_results');
      
      if (!queryStr || queryStr.trim().length === 0) {
        resultsContainer.html(`
          <div style="text-align:center; padding:32px 16px; color:var(--qx-text-muted);">
            <div style="font-size:36px; margin-bottom:10px;">✨</div>
            <div style="font-size:15px; font-weight:700; color:#fff;">Escribe o selecciona una ocasión</div>
            <div style="margin-top:4px; font-size:13px;">Tu Sommelier personal analizará la pirámide olfativa y estela de cada pieza.</div>
          </div>
        `);
        return;
      }

      resultsContainer.html(`
        <div style="text-align:center; padding:40px 16px; color:var(--qx-text-muted);">
          <div class="qx-spinner" style="width:32px; height:32px; margin:0 auto 12px; border:3px solid rgba(236,72,153,0.2); border-top-color:#ec4899; border-radius:50%; animation:spin 0.8s linear infinite;"></div>
          <div style="font-size:14px; font-weight:700; color:#fff;">El Sommelier está analizando el catálogo...</div>
          <div style="font-size:12px; margin-top:4px; color:#a78bfa;">Cruzando notas de salida, corazón, fondo y ocasión</div>
        </div>
      `);

      const tenantParam = (this.tenant && this.tenant.emisorId) ? this.tenant.emisorId : '00163e311ce9a3e711f1591962781ba6';

      $.ajax({
        url: 'api/sommelier.php',
        method: 'GET',
        data: { q: queryStr, tenant: tenantParam, limit: 6 },
        dataType: 'json',
        success: function(resp) {
          if (resp.status === 'OK' && resp.matches && resp.matches.length > 0) {
            self.renderSommelierMatches(resp.matches);
          } else {
            resultsContainer.html(`
              <div style="text-align:center; padding:32px 16px; color:var(--qx-text-muted);">
                <div style="font-size:32px; margin-bottom:8px;">🔍</div>
                <div style="font-size:14px; font-weight:700; color:#fff;">No encontramos un match exacto</div>
                <div style="margin-top:4px; font-size:12.5px;">Intenta con palabras como 'fresco', 'playa', 'dulce', 'cita' o 'formal'.</div>
              </div>
            `);
          }
        },
        error: function() {
          resultsContainer.html(`
            <div style="text-align:center; padding:24px 16px; color:#ef4444;">
              <div style="font-size:14px; font-weight:700;">No fue posible conectar con el motor Sommelier.</div>
            </div>
          `);
        }
      });
    }

    renderSommelierMatches(matches) {
      const self = this;
      const container = $('#qx_somm_results').empty();

      matches.forEach((m) => {
        const prod = self.products.find(p => p.id === m.id);
        const radar = prod ? prod.radar : null;
        const thermal = radar ? self.weatherEngine.calculateThermalMatch(radar) : null;
        const weatherBadge = thermal ? `<span style="background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.3); color:#38bdf8; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:700;">${thermal.city.icon} ${thermal.matchScore}% Clima ${thermal.city.name}</span>` : '';
        const accordsBadges = (m.accords || []).slice(0, 3).map(a => `<span style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); padding:2px 8px; border-radius:999px; font-size:11px; color:#cbd5e1;">${self.esc(a)}</span>`).join(' ');

        const card = $(`
          <div class="qx-somm-card" data-id="${self.esc(m.id)}">
            <div class="qx-somm-card-thumb-wrap">
              <img class="qx-somm-card-thumb" src="${self.esc(m.image)}" alt="${self.esc(m.name)}" loading="lazy">
            </div>
            <div class="qx-somm-card-main">
              <div class="qx-somm-card-top" style="flex-wrap:wrap; gap:6px;">
                <span class="qx-somm-card-family">💎 ${self.esc(m.family)}</span>
                ${weatherBadge}
                <span class="qx-somm-affinity-badge">✨ ${m.affinity}% Afinidad</span>
              </div>
              <h3 class="qx-somm-card-title">${self.esc(m.name)}</h3>
              <div style="display:flex; flex-wrap:wrap; gap:4px; margin:2px 0;">${accordsBadges}</div>
              <div class="qx-somm-card-note">
                <strong>Nota del Sommelier:</strong> "${self.esc(m.sommelierNote)}"
              </div>
              <div class="qx-somm-card-actions">
                <div class="qx-somm-card-price">$ ${self.formatMoney(m.finalPrice)} MXN</div>
                <div class="qx-somm-btn-group">
                  <button type="button" class="qx-somm-btn-view" data-id="${self.esc(m.id)}">Ver Ficha</button>
                  <button type="button" class="qx-somm-btn-buy" data-id="${self.esc(m.id)}">⚡ Comprar Ahora</button>
                </div>
              </div>
            </div>
          </div>
        `);

        // Image auto-fit
        const imgEl = card.find('.qx-somm-card-thumb')[0];
        if (imgEl) self.autoFitImage(imgEl);

        // View Ficha button
        card.find('.qx-somm-btn-view').on('click', function(e) {
          e.stopPropagation();
          self.closeSommelier();
          const prod = self.products.find(p => p.id === m.id);
          if (prod) self.openProductModal(prod);
        });

        // 1-Click Buy button
        card.find('.qx-somm-btn-buy').on('click', function(e) {
          e.stopPropagation();
          self.playHaptic('success');
          self.addToCart(m.id, 1);
          self.closeSommelier();
          self.openCart();
          self.showToast(`✨ ${m.name} agregado a tu bolsa de compras.`);
        });

        // Clicking card opens modal
        card.on('click', function(e) {
          if (!$(e.target).closest('button').length) {
            self.closeSommelier();
            const prod = self.products.find(p => p.id === m.id);
            if (prod) self.openProductModal(prod);
          }
        });

        container.append(card);
      });
    }

    initSensoryAtelier() {
      const self = this;
      const stage = $('#qx_pmodal_stage');
      const target = $('#qx_pmodal_swipe_track');
      const sheen = $('#qx_pmodal_glass_sheen');
      let idleTimer = null;

      function resumeIdle() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          if (!self.activeProductModal) return;
          target.addClass('qx-living-float');
          target.css({
            '--tilt-rx': '0deg',
            '--tilt-ry': '0deg'
          });
          sheen.css('--sheen-x', '-140%');
        }, 1200);
      }

      // Mousemove parallax for desktop with high-responsiveness
      stage.on('mouseenter touchstart', function() {
        clearTimeout(idleTimer);
        target.removeClass('qx-living-float');
      });

      stage.on('mousemove', function(e) {
        clearTimeout(idleTimer);
        target.removeClass('qx-living-float');
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        const rx = ((y - cy) / cy) * -18;
        const ry = ((x - cx) / cx) * 22;
        const sheenX = ((x / rect.width) * 220) - 60;

        target.css({
          '--tilt-rx': `${rx.toFixed(2)}deg`,
          '--tilt-ry': `${ry.toFixed(2)}deg`
        });
        sheen.css('--sheen-x', `${sheenX.toFixed(1)}%`);
      });

      stage.on('mouseleave', function() {
        resumeIdle();
      });

      // Touchmove for mobile 3D tilt
      stage.on('touchmove', function(e) {
        if (!e.touches || !e.touches[0]) return;
        clearTimeout(idleTimer);
        target.removeClass('qx-living-float');
        const rect = this.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        const rx = ((y - cy) / cy) * -16;
        const ry = ((x - cx) / cx) * 20;
        const sheenX = ((x / rect.width) * 220) - 60;

        target.css({
          '--tilt-rx': `${rx.toFixed(2)}deg`,
          '--tilt-ry': `${ry.toFixed(2)}deg`
        });
        sheen.css('--sheen-x', `${sheenX.toFixed(1)}%`);
      });

      stage.on('touchend', function() {
        resumeIdle();
      });

      // Interactive Click/Tap Scent Spark Burst
      stage.on('click', function(e) {
        self.triggerScentBurst(e);
      });

      // Mobile DeviceOrientation Gyroscope with enhanced damping
      if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', function(e) {
          if (!self.activeProductModal) return;
          const gamma = e.gamma || 0; // Left-Right [-90,90]
          const beta = e.beta || 0;   // Front-Back [-180,180]

          const clampedRy = Math.max(-22, Math.min(22, gamma * 0.5));
          const clampedRx = Math.max(-18, Math.min(18, (beta - 45) * 0.4));
          const sheenX = ((gamma + 45) / 90) * 180 - 40;

          target.removeClass('qx-living-float');
          target.css({
            '--tilt-rx': `${clampedRx.toFixed(2)}deg`,
            '--tilt-ry': `${clampedRy.toFixed(2)}deg`
          });
          sheen.css('--sheen-x', `${sheenX.toFixed(1)}%`);
        }, true);
      }
    }

    startScentAura(colorName = 'cyan', particleType = 'breeze') {
      const canvas = document.getElementById('qx_pmodal_aura_canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width || 420;
      canvas.height = rect.height || 460;

      const colorPalette = {
        cyan: ['#38bdf8', '#00e5ff', '#67e8f9', '#ffffff'],
        gold: ['#fbbf24', '#f59e0b', '#fde047', '#ffffff'],
        amber: ['#f97316', '#fb923c', '#fdba74', '#ffffff'],
        emerald: ['#34d399', '#10b981', '#6ee7b7', '#ffffff'],
        rose: ['#f472b6', '#ec4899', '#f9a8d4', '#ffffff'],
        violet: ['#a78bfa', '#8b5cf6', '#c084fc', '#ffffff']
      }[colorName] || ['#38bdf8', '#00e5ff', '#67e8f9', '#ffffff'];

      this.stopScentAura();
      this.auraParticles = [];
      const count = 70;

      for (let i = 0; i < count; i++) {
        const isStar = Math.random() < 0.25;
        this.auraParticles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 3.4 + 1.2,
          color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
          vx: (Math.random() - 0.5) * 0.8,
          vy: -(Math.random() * 1.1 + 0.4),
          alpha: Math.random() * 0.85 + 0.2,
          decay: Math.random() * 0.006 + 0.002,
          isStar: isStar,
          angle: Math.random() * Math.PI * 2,
          vAngle: (Math.random() - 0.5) * 0.06
        });
      }

      const self = this;
      function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        self.auraParticles.forEach(p => {
          p.x += p.vx + Math.sin(p.y * 0.02) * 0.45;
          p.y += p.vy;
          p.alpha -= p.decay;
          p.angle += p.vAngle;

          if (p.alpha <= 0 || p.y < -20 || p.x < -20 || p.x > canvas.width + 20) {
            p.x = Math.random() * canvas.width;
            p.y = canvas.height + 15;
            p.alpha = Math.random() * 0.85 + 0.25;
            p.radius = Math.random() * 3.4 + 1.2;
          }

          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 14;
          ctx.shadowColor = p.color;

          if (p.isStar) {
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.beginPath();
            const r = p.radius * 1.8;
            for (let s = 0; s < 4; s++) {
              ctx.lineTo(Math.cos(s * Math.PI / 2) * r, Math.sin(s * Math.PI / 2) * r);
              ctx.lineTo(Math.cos((s + 0.5) * Math.PI / 2) * (r * 0.25), Math.sin((s + 0.5) * Math.PI / 2) * (r * 0.25));
            }
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        });

        ctx.restore();
        self.auraAnimId = requestAnimationFrame(animate);
      }

      this.auraAnimId = requestAnimationFrame(animate);
    }

    triggerScentBurst(e) {
      const canvas = document.getElementById('qx_pmodal_aura_canvas');
      if (!canvas || !this.auraParticles) return;
      const rect = canvas.getBoundingClientRect();
      const originX = (e && e.clientX) ? (e.clientX - rect.left) : (canvas.width / 2);
      const originY = (e && e.clientY) ? (e.clientY - rect.top) : (canvas.height * 0.35);

      const colorPalette = ['#ffffff', '#00e5ff', '#fbbf24', '#f472b6', '#a78bfa', '#34d399'];
      for (let i = 0; i < 30; i++) {
        const speed = Math.random() * 4.5 + 1.8;
        const angle = Math.random() * Math.PI * 2;
        this.auraParticles.push({
          x: originX,
          y: originY,
          radius: Math.random() * 4.2 + 1.5,
          color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1.0,
          decay: Math.random() * 0.025 + 0.015,
          isStar: Math.random() < 0.4,
          angle: Math.random() * Math.PI * 2,
          vAngle: (Math.random() - 0.5) * 0.1
        });
      }

      if (navigator.vibrate) {
        navigator.vibrate([20]);
      }
    }

    stopScentAura() {
      if (this.auraAnimId) {
        cancelAnimationFrame(this.auraAnimId);
        this.auraAnimId = null;
      }
    }

    // =========================================================================
    // FEATURE 2: THE FRAGRANCE WARDROBE & LAYERING ALCHEMY ATELIER
    // =========================================================================
    openLayeringModal(baseProduct = null, accentProduct = null) {
      const self = this;
      if (!baseProduct) {
        baseProduct = this.products[0];
      }
      if (!baseProduct) return;

      this.layeringBaseProd = baseProduct;
      this.layeringAccentProd = accentProduct;

      // Update Base UI Card with isolated transparent silhouette
      $('#qx_base_name').text(baseProduct.name);
      $('#qx_base_family').text(baseProduct.family || 'Amaderada Noble');
      $('#qx_base_price').text(`$ ${self.formatMoney(baseProduct.priceWithTax)}`);
      $('#qx_base_img').attr('src', baseProduct.cover);
      self.flaconEngine.isolateSilhouette(baseProduct.cover).then(url => {
        $('#qx_base_img').attr('src', url);
      });

      // Open Modal
      $('#qx_layering_backdrop').addClass('active');
      $('#qx_layering_modal').addClass('active');

      // Load companions
      this.loadLayeringCompanions(baseProduct.id);
    }

    closeLayeringModal() {
      $('#qx_layering_backdrop').removeClass('active');
      $('#qx_layering_modal').removeClass('active');
      this.stopFusionParticles();
    }

    loadLayeringCompanions(baseId) {
      const self = this;
      const list = $('#qx_layering_companions_list');
      list.html('<div style="color:var(--qx-text-muted); font-size:12px; padding:10px;">Calculando sinergias del catálogo...</div>');

      $.ajax({
        url: 'api/layering.php',
        method: 'GET',
        data: {
          action: 'recommend',
          baseId: baseId,
          tenant: self.tenantId
        },
        dataType: 'json',
        success: function(resp) {
          if (resp && resp.Status === 'OK' && Array.isArray(resp.companions) && resp.companions.length > 0) {
            list.empty();
            resp.companions.forEach((comp, idx) => {
              const p = comp.product;
              const isSelected = (!self.layeringAccentProd && idx === 0) || (self.layeringAccentProd && self.layeringAccentProd.id === p.id);
              
              const chip = $(`
                <div class="qx-companion-chip ${isSelected ? 'active' : ''}" data-prod-id="${p.id}">
                  <div class="qx-comp-thumb-wrap">
                    <img class="qx-comp-thumb" src="${self.esc(p.cover)}" alt="${self.esc(p.name)}">
                  </div>
                  <div class="qx-comp-name">${self.esc(p.name)}</div>
                  <div class="qx-comp-score">✨ ${comp.affinityScore}% Sinergia</div>
                </div>
              `);

              chip.on('click', function() {
                self.playHaptic('light');
                $('.qx-companion-chip').removeClass('active');
                $(this).addClass('active');
                self.selectLayeringAccent(p);
              });

              list.append(chip);
            });

            if (!self.layeringAccentProd && resp.companions[0]) {
              self.selectLayeringAccent(resp.companions[0].product);
            } else if (self.layeringAccentProd) {
              self.calculateLayeringSynergy(self.layeringBaseProd.id, self.layeringAccentProd.id);
            }
          } else {
            list.html('<div style="color:var(--qx-text-muted); font-size:12px; padding:10px;">No se encontraron acompañantes adicionales.</div>');
          }
        },
        error: function() {
          list.html('<div style="color:var(--qx-text-muted); font-size:12px; padding:10px;">Error al conectar con el motor de sinergias.</div>');
        }
      });
    }

    selectLayeringAccent(accentProduct) {
      const self = this;
      this.layeringAccentProd = accentProduct;

      $('#qx_accent_name').text(accentProduct.name);
      $('#qx_accent_family').text(accentProduct.family || 'Oriental');
      $('#qx_accent_price').text(`$ ${self.formatMoney(accentProduct.priceWithTax)}`);
      $('#qx_accent_img').attr('src', accentProduct.cover);
      self.flaconEngine.isolateSilhouette(accentProduct.cover).then(url => {
        $('#qx_accent_img').attr('src', url);
      });

      if (this.layeringBaseProd && this.layeringAccentProd) {
        this.calculateLayeringSynergy(this.layeringBaseProd.id, this.layeringAccentProd.id);
      }
    }

    swapLayeringFlacons() {
      if (!this.layeringBaseProd || !this.layeringAccentProd) return;

      // 3D crossover animations
      $('#qx_layering_base_card').addClass('qx-swapping-left');
      $('#qx_layering_accent_card').addClass('qx-swapping-right');
      setTimeout(() => {
        $('#qx_layering_base_card').removeClass('qx-swapping-left');
        $('#qx_layering_accent_card').removeClass('qx-swapping-right');
      }, 600);

      // Trigger burst in fusion canvas
      if (this.fusionParticles) {
        const midX = ($('#qx_layering_fusion_canvas').width() || 850) / 2;
        const midY = ($('#qx_layering_fusion_canvas').height() || 280) / 2;
        const blastColors = ['#00e5ff', '#fbbf24', '#ec4899', '#ffffff', '#38bdf8'];
        for (let s = 0; s < 40; s++) {
          const speed = Math.random() * 5.5 + 2.0;
          const angle = Math.random() * Math.PI * 2;
          this.fusionParticles.push({
            fromLeft: Math.random() < 0.5,
            x: midX,
            y: midY,
            targetX: midX + Math.cos(angle) * 140,
            targetY: midY + Math.sin(angle) * 140,
            radius: Math.random() * 3.8 + 1.5,
            color: blastColors[Math.floor(Math.random() * blastColors.length)],
            orbitRadius: Math.random() * 50,
            orbitAngle: angle,
            orbitSpeed: 0.06,
            speed: 0.08,
            alpha: 1.0
          });
        }
      }

      if (navigator.vibrate) {
        navigator.vibrate([25, 40, 25]);
      }

      const temp = this.layeringBaseProd;
      this.layeringBaseProd = this.layeringAccentProd;
      this.layeringAccentProd = temp;

      // Update UI with isolated transparent silhouettes
      $('#qx_base_name').text(this.layeringBaseProd.name);
      $('#qx_base_family').text(this.layeringBaseProd.family || 'Amaderada Noble');
      $('#qx_base_price').text(`$ ${this.formatMoney(this.layeringBaseProd.priceWithTax)}`);
      $('#qx_base_img').attr('src', this.layeringBaseProd.cover);
      this.flaconEngine.isolateSilhouette(this.layeringBaseProd.cover).then(url => {
        $('#qx_base_img').attr('src', url);
      });

      $('#qx_accent_name').text(this.layeringAccentProd.name);
      $('#qx_accent_family').text(this.layeringAccentProd.family || 'Oriental');
      $('#qx_accent_price').text(`$ ${this.formatMoney(this.layeringAccentProd.priceWithTax)}`);
      $('#qx_accent_img').attr('src', this.layeringAccentProd.cover);
      this.flaconEngine.isolateSilhouette(this.layeringAccentProd.cover).then(url => {
        $('#qx_accent_img').attr('src', url);
      });

      this.loadLayeringCompanions(this.layeringBaseProd.id);
    }

    calculateLayeringSynergy(baseId, accentId) {
      const self = this;
      $.ajax({
        url: 'api/layering.php',
        method: 'GET',
        data: {
          action: 'match',
          baseId: baseId,
          accentId: accentId,
          tenant: self.tenantId
        },
        dataType: 'json',
        success: function(resp) {
          if (resp && resp.Status === 'OK' && resp.synergy) {
            self.layeringSynergyData = resp;
            self.renderSynergyUI(resp);
          }
        }
      });
    }

    renderSynergyUI(data) {
      const syn = data.synergy;
      const base = data.base;
      const accent = data.accent;

      $('#qx_layering_score_val').text(`${syn.affinityScore}%`);
      $('#qx_layering_synergy_type').text(syn.synergyType);
      $('#qx_layering_synergy_desc').text(syn.blendName);

      $('#qx_layering_occasion').text(`🌙 ${syn.recommendedOccasion}`);
      $('#qx_layering_longevity').text(`⏱️ ${syn.hybridLongevity} Horas de Fijación`);
      $('#qx_layering_sillage').text(`🔥 Modo Sillage Nivel ${syn.hybridSillage}`);

      // Pyramid
      $('#qx_pyr_top').text(syn.hybridPyramid.top.join(', ') || 'Cítricos chispeantes, Bergamota');
      $('#qx_pyr_heart').text(syn.hybridPyramid.heart.join(', ') || 'Lavanda noble, Especias finas');
      $('#qx_pyr_base').text(syn.hybridPyramid.base.join(', ') || 'Ámbar, Cedro noble');

      // Bundle Box Pricing
      const b = syn.bundle;
      $('#qx_bundle_old_price').text(`$ ${this.formatMoney(b.fullRegularPrice)}`);
      $('#qx_bundle_current_price').text(`$ ${this.formatMoney(b.fullBundlePrice)} MXN`);
      $('#qx_bundle_savings').text(`Ahorras $ ${this.formatMoney(b.fullSavings)}`);
      $('#qx_decants_bundle_price').text(`$ ${this.formatMoney(b.decantBundlePrice)} MXN`);

      // Start fusion canvas animation
      this.startFusionParticles(base.auraColor || 'cyan', accent.auraColor || 'gold');
    }

    startFusionParticles(color1, color2) {
      this.stopFusionParticles();
      const canvas = document.getElementById('qx_layering_fusion_canvas');
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width || 850;
      canvas.height = rect.height || 280;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const palette = {
        cyan: ['#00e5ff', '#38bdf8', '#e0f2fe', '#ffffff'],
        gold: ['#fbbf24', '#f59e0b', '#fef3c7', '#ffffff'],
        amber: ['#f97316', '#fb923c', '#ffedd5', '#ffffff'],
        emerald: ['#10b981', '#34d399', '#d1fae5', '#ffffff'],
        rose: ['#ec4899', '#f472b6', '#fce7f3', '#ffffff'],
        violet: ['#8b5cf6', '#a78bfa', '#ede9fe', '#ffffff']
      };

      const c1Arr = palette[color1] || palette.cyan;
      const c2Arr = palette[color2] || palette.gold;

      this.fusionParticles = [];
      const count = 120;
      const midX = canvas.width / 2;
      const midY = canvas.height / 2;

      for (let i = 0; i < count; i++) {
        const fromLeft = (i % 2 === 0);
        const paletteChoice = fromLeft ? c1Arr : c2Arr;
        this.fusionParticles.push({
          fromLeft: fromLeft,
          x: fromLeft ? Math.random() * (canvas.width * 0.3) : canvas.width - Math.random() * (canvas.width * 0.3),
          y: Math.random() * canvas.height,
          targetX: midX,
          targetY: midY,
          radius: Math.random() * 3.4 + 1.2,
          color: paletteChoice[Math.floor(Math.random() * paletteChoice.length)],
          orbitRadius: Math.random() * 60 + 15,
          orbitAngle: Math.random() * Math.PI * 2,
          orbitSpeed: (Math.random() * 0.045 + 0.02) * (fromLeft ? 1 : -1),
          speed: Math.random() * 0.025 + 0.012,
          alpha: Math.random() * 0.85 + 0.25
        });
      }

      const self = this;
      let frame = 0;
      function animate() {
        frame++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw central alchemical vortex pulsing core
        const corePulse = Math.sin(frame * 0.05) * 10 + 26;
        const grad = ctx.createRadialGradient(midX, midY, 0, midX, midY, corePulse * 2.2);
        grad.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
        grad.addColorStop(0.4, 'rgba(168, 85, 247, 0.25)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(midX, midY, corePulse * 2.2, 0, Math.PI * 2);
        ctx.fill();

        self.fusionParticles.forEach(p => {
          p.orbitAngle += p.orbitSpeed;
          const targetWithOrbitX = midX + Math.cos(p.orbitAngle) * p.orbitRadius;
          const targetWithOrbitY = midY + Math.sin(p.orbitAngle) * p.orbitRadius;

          p.x += (targetWithOrbitX - p.x) * p.speed;
          p.y += (targetWithOrbitY - p.y) * p.speed;

          const dist = Math.hypot(midX - p.x, midY - p.y);
          if (dist < 20) {
            p.x = p.fromLeft ? Math.random() * (canvas.width * 0.3) : canvas.width - Math.random() * (canvas.width * 0.3);
            p.y = Math.random() * canvas.height;
            p.alpha = Math.random() * 0.85 + 0.25;
          }

          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 14;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        ctx.restore();
        self.fusionAnimId = requestAnimationFrame(animate);
      }

      this.fusionAnimId = requestAnimationFrame(animate);
    }

    stopFusionParticles() {
      if (this.fusionAnimId) {
        cancelAnimationFrame(this.fusionAnimId);
        this.fusionAnimId = null;
      }
    }

    addDuoPackToCart(format = 'full') {
      if (!this.layeringBaseProd || !this.layeringAccentProd || !this.layeringSynergyData) return;
      const syn = this.layeringSynergyData.synergy;
      const b = syn.bundle;
      const base = this.layeringBaseProd;
      const accent = this.layeringAccentProd;

      const isDecant = (format === 'decant');
      const unitPriceWithTax = isDecant ? b.decantBundlePrice : b.fullBundlePrice;
      const vatRate = 16.0;
      const unitPriceBeforeTax = Number((unitPriceWithTax / (1 + vatRate / 100)).toFixed(2));

      const bundleItem = {
        id: `duo__${base.id}__${accent.id}${isDecant ? '__dec' : ''}`,
        baseId: base.id,
        accentId: accent.id,
        name: isDecant ? `🧪 Dueto Decants 5ml: ${base.name} + ${accent.name}` : `🎁 Duo Pack Alquímico (15% OFF): ${base.name} + ${accent.name}`,
        thumb: base.cover,
        thumbAccent: accent.cover,
        unitPrice: unitPriceBeforeTax,
        vatRate: vatRate,
        iepsRate: 0,
        priceWithTax: unitPriceWithTax,
        qty: 1,
        isDuoPack: true,
        isDecant: isDecant,
        bundleDiscountPercent: 15
      };

      const existingIdx = this.cart.items.findIndex(i => i.id === bundleItem.id);
      if (existingIdx >= 0) {
        this.cart.items[existingIdx].qty += 1;
      } else {
        this.cart.items.push(bundleItem);
      }

      this.saveCart();
      this.renderCartUI();
      this.closeLayeringModal();
      this.openCart();
      this.showToast(`✨ ¡${isDecant ? 'Dueto de Decants' : 'Duo Pack Alquímico'} añadido a tu bolsa con 15% OFF!`);
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
