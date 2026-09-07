/**
 * filemon_cockpit.js
 *
 * Controlador de Frontend para Filemón Prime Copilot.
 * Basado en la arquitectura formal de NANORED_CODE_FIRST_CHATBOT_ARCHITECTURE.md.
 * Proporciona conciencia ambiental, atajos de teclado, audio sinestésico Web Audio y Action Chips.
 *
 * @author Filemón Coder
 * @version 1.0.0 (Septiembre 2026)
 */

(function(window, document) {
  'use strict';

  if (window.FilemonCockpit) {
    return;
  }

  const FilemonCockpit = {
    isOpen: false,
    audioMuted: false,
    audioCtx: null,
    endpoint: '/api/filemon_assistant_api.php',
    avatarUrl: '/images/filemon/avatar-filemon.png',
    options: {},

    /**
     * Inicializa el copiloto en la vista activa.
     */
    init: function(opts) {
      this.options = opts || {};
      
      const isSubpath = window.location.pathname.includes('/quantix-stores/online-store');
      const basePath = isSubpath ? '/quantix-stores/online-store' : '';

      this.endpoint = this.options.endpoint || (basePath + '/api/filemon_assistant_api.php');
      this.avatarUrl = this.options.avatarUrl || (basePath + '/images/filemon/avatar-filemon.png');

      this.audioMuted = localStorage.getItem('filemon_audio_muted') === 'true';

      this.injectDOM();
      this.bindEvents();
      this.bindHotkeys();

      // Saludo contextual automático inicial
      this.sendContextualGreeting();
    },

    /**
     * Inyecta el Badge y la Tarjeta Cockpit en el DOM si no existen.
     */
    injectDOM: function() {
      if (document.getElementById('filemon_trigger_badge')) {
        return;
      }

      const badgeHtml = `
        <div id="filemon_trigger_badge" class="filemon-trigger-badge" role="button" aria-label="Abrir Filemón Prime Copilot [Ctrl + /]" tabindex="0" title="Filemón Prime [Ctrl + /]">
          <div class="filemon-halo-ring"></div>
          <img src="${this.avatarUrl}" alt="Filemón Prime" class="filemon-avatar-img">
          <span class="filemon-pulse-dot" id="filemon_status_dot"></span>
        </div>

        <aside id="filemon_cockpit_card" class="filemon-cockpit-card" style="display:none;" role="dialog" aria-labelledby="filemon_title">
          <header class="filemon-header">
            <div class="filemon-profile">
              <img src="${this.avatarUrl}" alt="Filemón" class="filemon-header-avatar">
              <div>
                <h3 id="filemon_title" class="filemon-name">Filemón Prime</h3>
                <p class="filemon-subtitle">Concierge Fiscal & Espacial • <span class="filemon-lat-badge">0.01 ms</span></p>
              </div>
            </div>
            <div class="filemon-controls">
              <button type="button" class="filemon-icon-btn" id="filemon_audio_toggle" title="Alternar Sonido">${this.audioMuted ? '🔇' : '🔊'}</button>
              <button type="button" class="filemon-icon-btn" id="filemon_close_btn" title="Cerrar [Esc]">✕</button>
            </div>
          </header>

          <div class="filemon-radar-bar" id="filemon_radar_bar">
            <span class="filemon-radar-tag" id="filemon_radar_screen">Cargando radar...</span>
            <span class="filemon-radar-tag" id="filemon_radar_chapter" style="display:none;"></span>
          </div>

          <div class="filemon-chat-stream" id="filemon_chat_stream"></div>

          <div class="filemon-chips-bar" id="filemon_chips_bar"></div>

          <form id="filemon_form" class="filemon-form">
            <input type="text" id="filemon_input" class="filemon-input" placeholder="Pregúntale a Filemón o escribe una orden..." autocomplete="off">
            <button type="submit" class="filemon-send-btn" id="filemon_send_btn" aria-label="Enviar">➤</button>
          </form>
        </aside>
      `;

      const container = document.createElement('div');
      container.id = 'filemon_root_container';
      container.innerHTML = badgeHtml;
      document.body.appendChild(container);

      // [Iter 3 Hardening] Race Condition Shield: If modal/drawer is already active upon injection, dock immediately
      if (window.quantixStore && typeof window.quantixStore.isModalOrDrawerOpen === 'function' && window.quantixStore.isModalOrDrawerOpen()) {
        const bEl = document.getElementById('filemon_trigger_badge');
        if (bEl) bEl.classList.add('docked-hidden');
      }
    },

    /**
     * Vincula los escuchadores de eventos del DOM.
     */
    bindEvents: function() {
      const badge = document.getElementById('filemon_trigger_badge');
      const closeBtn = document.getElementById('filemon_close_btn');
      const audioToggle = document.getElementById('filemon_audio_toggle');
      const form = document.getElementById('filemon_form');

      if (badge) {
        badge.addEventListener('click', () => this.toggleCockpit());
      }
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeCockpit());
      }
      if (audioToggle) {
        audioToggle.addEventListener('click', () => this.toggleAudio());
      }
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const input = document.getElementById('filemon_input');
          const query = input ? input.value.trim() : '';
          if (query) {
            this.sendUserMessage(query);
            input.value = '';
          }
        });
      }

      // Escuchar clics en Action Chips
      const chipsBar = document.getElementById('filemon_chips_bar');
      if (chipsBar) {
        chipsBar.addEventListener('click', (e) => {
          const btn = e.target.closest('.filemon-chip-btn');
          if (btn) {
            const action = btn.dataset.action;
            const val = btn.dataset.value;
            this.executeActionChip(action, val);
          }
        });
      }
    },

    /**
     * Atajos de teclado universales: Ctrl + / o Cmd + K para abrir, Esc para cerrar.
     */
    bindHotkeys: function() {
      document.addEventListener('keydown', (e) => {
        // Ctrl + / o Cmd + K
        if ((e.ctrlKey && e.key === '/') || (e.metaKey && e.key.toLowerCase() === 'k')) {
          e.preventDefault();
          this.toggleCockpit();
        }
        // Esc para cerrar
        if (e.key === 'Escape' && this.isOpen) {
          this.closeCockpit();
        }
      });
    },

    /**
     * Abre o cierra la cabina.
     */
    toggleCockpit: function() {
      if (this.isOpen) {
        this.closeCockpit();
      } else {
        this.openCockpit();
      }
    },

    openCockpit: function() {
      const card = document.getElementById('filemon_cockpit_card');
      if (card) {
        card.style.display = 'flex';
        this.isOpen = true;
        this.updateRadarBar();
        this.playChime('ready');
        setTimeout(() => {
          const input = document.getElementById('filemon_input');
          if (input) input.focus();
        }, 150);
      }
    },

    closeCockpit: function() {
      const card = document.getElementById('filemon_cockpit_card');
      if (card) {
        card.style.display = 'none';
        this.isOpen = false;
      }
    },

    /**
     * Audio sinestésico Web Audio API (Cero dependencias de archivos externos).
     */
    playChime: function(type) {
      if (this.audioMuted) return;
      try {
        if (!this.audioCtx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            this.audioCtx = new AudioContext();
          }
        }
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        const now = this.audioCtx.currentTime;
        gain.gain.setValueAtTime(0.04, now);

        if (type === 'ready') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(528, now); // 528 Hz Solfeggio
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
        } else if (type === 'success') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(432, now);
          osc.frequency.exponentialRampToValueAtTime(864, now + 0.25);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
        } else if (type === 'alert') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(220, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
          osc.start(now);
          osc.stop(now + 0.4);
        }
      } catch (err) {
        // Silencioso si el navegador bloquea audio
      }
    },

    toggleAudio: function() {
      this.audioMuted = !this.audioMuted;
      localStorage.setItem('filemon_audio_muted', this.audioMuted ? 'true' : 'false');
      const btn = document.getElementById('filemon_audio_toggle');
      if (btn) {
        btn.textContent = this.audioMuted ? '🔇' : '🔊';
      }
      this.showToast(this.audioMuted ? 'Audio silenciado' : 'Audio activado');
    },

    /**
     * Recolecta la telemetría del contexto ambiental actual.
     */
    getContext: function() {
      const path = window.location.pathname;
      let screen = path.split('/').pop() || 'index.php';

      // Detectar si estamos en CFDAdmin o en Storefront
      const isCfdadmin = (window.QX_ENVIRONMENT && window.QX_ENVIRONMENT.isCfdadmin) ||
                         path.includes('/cfdadmin/') ||
                         window.location.hostname.startsWith('panel.') ||
                         window.location.hostname.startsWith('cfdadmin.');

      const isStorefront = !isCfdadmin && (
        (window.QX_TENANT && window.QX_TENANT.isStorefront) ||
        (window.location.hostname.endsWith('.evinux.net') && !isCfdadmin) ||
        path.includes('/quantix-stores/online-store')
      );

      // Detectar Capítulo activo en Store Director
      let activeChapter = '';
      const activeCard = document.querySelector('.qx-chapter-panel.active, [data-chapter-active="true"], .qx-chapter-plate.active');
      if (activeCard) {
        activeChapter = activeCard.id || activeCard.dataset.chapter || '';
      } else if (document.getElementById('qx_ch4_studio_3d') && document.getElementById('qx_ch4_studio_3d').style.display !== 'none') {
        activeChapter = 'chapter_4';
      }

      // Detectar modelo 3D activo
      const sourceBadge = document.getElementById('qx_3d_source_badge');
      const isCustomModel = sourceBadge && sourceBadge.textContent.includes('PERSONALIZADO');

      // Industria, arquetipo y marca
      let isPerfume = false;
      let industry = 'fiscal_backoffice';
      let archetype = 'fiscal';
      let brandName = '';

      if (isStorefront) {
        const bodyPerfumery = document.body ? document.body.dataset.perfumery : null;
        const bodyArchetype = document.body ? document.body.dataset.archetype : null;

        if (window.QX_TENANT) {
          isPerfume = !!window.QX_TENANT.isPerfumery;
          industry = window.QX_TENANT.industry || (isPerfume ? 'perfumery' : 'retail');
          archetype = window.QX_TENANT.archetype || bodyArchetype || 'maison';
          brandName = window.QX_TENANT.brandName || '';
        } else {
          isPerfume = (bodyPerfumery === '1') || window.location.hostname.includes('mistiq');
          archetype = bodyArchetype || 'maison';

          const pageText = (document.title + ' ' + (document.body ? document.body.innerText.substring(0, 1500) : '')).toLowerCase();
          if (isPerfume) {
            industry = 'perfumery';
            brandName = 'Mistiq';
          } else if (window.location.hostname.includes('bracsa') || pageText.includes('bienes raíces') || pageText.includes('residencias') || pageText.includes('inmobiliari') || pageText.includes('espacios corporativos')) {
            industry = 'real_estate';
            brandName = 'BRACSA Y GAMA';
          } else if (window.location.hostname.includes('gersol') || pageText.includes('industrial') || pageText.includes('válvula') || pageText.includes('automatiz')) {
            industry = 'industrial';
            brandName = 'Gersol';
          } else {
            industry = 'retail';
            brandName = document.title ? document.title.split('—')[0].trim() : 'Boutique';
          }
        }
      } else {
        isPerfume = false;
        industry = 'fiscal_backoffice';
        archetype = screen.replace('.php', '');
      }

      return {
        screen: screen,
        chapter: activeChapter,
        is_custom_3d: isCustomModel,
        is_perfume: isPerfume,
        industry: industry,
        archetype: archetype,
        brand_name: brandName,
        is_cfdadmin: isCfdadmin,
        is_showroom: isStorefront,
        url: window.location.href
      };
    },

    /**
     * Actualiza la barra de radar de contexto.
     */
    updateRadarBar: function() {
      const ctx = this.getContext();
      const screenTag = document.getElementById('filemon_radar_screen');
      const chapterTag = document.getElementById('filemon_radar_chapter');
      const subtitleEl = document.querySelector('.filemon-subtitle');

      // Nombre legible para humanos en pantalla
      let displayScreen = ctx.screen;
      if (ctx.is_cfdadmin) {
        if (ctx.screen === 'consultacfdemitidos.php') displayScreen = 'CFDIs Emitidos';
        else if (ctx.screen === 'consultacfd.php') displayScreen = 'Consulta CFDIs';
        else if (ctx.screen === 'nvocfd.php' || ctx.screen === 'nvocfd40.php') displayScreen = 'Nueva Factura 4.0';
        else if (ctx.screen === 'nvopagoacfd.php') displayScreen = 'Complementos REP 2.0';
        else if (ctx.screen === 'consultacfdrecibidos.php' || ctx.screen === 'ingestacompras.php') displayScreen = 'Compras & EFOS';
        else if (ctx.screen === 'storefront_master.php') displayScreen = 'Store Director';
        else displayScreen = ctx.screen;
      } else {
        if (ctx.industry === 'real_estate') displayScreen = `Bienes Raíces (${ctx.brand_name || 'BRACSA'})`;
        else if (ctx.industry === 'industrial') displayScreen = `Industrial (${ctx.brand_name || 'Gersol'})`;
        else if (ctx.industry === 'perfumery') displayScreen = `Alta Perfumería (${ctx.brand_name || 'Mistiq'})`;
        else displayScreen = ctx.brand_name || 'Showroom';
      }

      if (screenTag) {
        screenTag.textContent = displayScreen;
      }

      if (subtitleEl) {
        let subText = 'Concierge Fiscal & Espacial';
        if (ctx.is_cfdadmin) {
          subText = 'Concierge Fiscal SAT';
        } else if (ctx.industry === 'real_estate') {
          subText = 'Concierge Inmobiliario VIP';
        } else if (ctx.industry === 'industrial') {
          subText = 'Concierge Técnico Industrial';
        } else if (ctx.industry === 'perfumery') {
          subText = 'Concierge Sensorial';
        } else {
          subText = 'Concierge de Tienda';
        }
        subtitleEl.innerHTML = `${subText} • <span class="filemon-lat-badge">0.01 ms</span>`;
      }

      if (chapterTag) {
        if (ctx.chapter) {
          chapterTag.textContent = ctx.chapter.toUpperCase().replace('_', ' ');
          chapterTag.style.display = 'inline-block';
        } else {
          chapterTag.style.display = 'none';
        }
      }
    },

    /**
     * Saludo contextual al inicializar.
     */
    sendContextualGreeting: function() {
      const ctx = this.getContext();
      this.sendQuery('', ctx);
    },

    /**
     * Envía mensaje del usuario y consulta al motor.
     */
    sendUserMessage: function(msg) {
      this.appendMessage('user', msg);
      const ctx = this.getContext();
      this.sendQuery(msg, ctx);
    },

    /**
     * Consulta al endpoint de Filemón Prime.
     */
    sendQuery: function(query, ctx) {
      fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query, context: ctx || this.getContext() })
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.ok) {
          this.appendMessage('bot', data.reply);
          this.renderActionChips(data.action_chips || []);
          this.playChime('success');
        }
      })
      .catch(err => {
        this.appendMessage('bot', '### ⚠️ Conexión en Reserva Local\nNo pude enlazar con el endpoint, pero el sistema continúa blindado por las Reglas de Oro del Master Codex.');
      });
    },

    /**
     * Añade mensaje al flujo de conversación.
     */
    appendMessage: function(sender, text) {
      const stream = document.getElementById('filemon_chat_stream');
      if (!stream) return;

      const msgEl = document.createElement('div');
      msgEl.className = `filemon-msg ${sender}`;
      msgEl.innerHTML = this.renderMarkdown(text);
      stream.appendChild(msgEl);
      stream.scrollTop = stream.scrollHeight;
    },

    /**
     * Renderizador Markdown ligero y seguro.
     */
    renderMarkdown: function(text) {
      if (!text) return '';
      let html = text
        .replace(/### (.*?)\n/g, '<h3>$1</h3>')
        .replace(/## (.*?)\n/g, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n- (.*?)/g, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

      return `<p>${html}</p>`;
    },

    /**
     * Renderiza los botones ejecutables (Action Chips).
     */
    renderActionChips: function(chips) {
      const bar = document.getElementById('filemon_chips_bar');
      if (!bar) return;
      bar.innerHTML = '';

      chips.forEach(chip => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filemon-chip-btn';
        btn.dataset.action = chip.action;
        btn.dataset.value = chip.value;
        btn.innerHTML = `<span>${chip.icon || '⚡'}</span> ${chip.label}`;
        bar.appendChild(btn);
      });
    },

    /**
     * Despacha y ejecuta la acción del chip en el cliente.
     */
    executeActionChip: function(action, val) {
      switch (action) {
        case 'navigate_chapter':
          const spineBtn = document.querySelector(`#tab_ch_${val}, #qx_spine_btn_ch${val}`);
          if (spineBtn) {
            spineBtn.click();
            this.showToast(`Navegando a Capítulo ${val}`);
            this.playChime('success');
          }
          break;

        case 'open_ar_bridge':
          if (window.QuantixSpatialStudio) {
            window.QuantixSpatialStudio.openARBridge();
            this.showToast('Puente Holográfico AR abierto');
          } else {
            const arBtn = document.querySelector('#qx_btn_3d_ar, #qx_btn_ar_pill');
            if (arBtn) arBtn.click();
          }
          this.closeCockpit();
          break;

        case 'reset_procedural':
          const resetBtn = document.querySelector('#qx_btn_reset_custom_model');
          if (resetBtn) {
            resetBtn.click();
          } else {
            this.showToast('Restauración solicitada');
          }
          break;

        case 'toggle_exploded_view':
          const explodeBtn = document.querySelector('#qx_btn_explode');
          if (explodeBtn) {
            explodeBtn.click();
            this.showToast('Vista desglosada alternada');
          }
          break;

        case 'scroll_to':
          const target = document.querySelector(val);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('filemon-highlight-pulse');
            setTimeout(() => target.classList.remove('filemon-highlight-pulse'), 2000);
            this.showToast(`Enfocando ${val}`);
          }
          break;

        case 'open_agenda':
          const agendaBtn = document.querySelector('#qx_agenda_btn, .qx-agenda-nav-btn, [data-action="open_agenda"]');
          if (agendaBtn) {
            agendaBtn.click();
            this.showToast('Abriendo Agenda VIP');
          } else if (window.quantixStore && typeof window.quantixStore.openAgendaModal === 'function') {
            window.quantixStore.openAgendaModal();
            this.showToast('Abriendo Agenda VIP');
          } else {
            const modal = document.getElementById('qx_agenda_modal');
            const backdrop = document.getElementById('qx_agenda_backdrop');
            if (modal) modal.classList.add('active');
            if (backdrop) backdrop.classList.add('active');
            this.showToast('Abriendo Agenda VIP');
          }
          this.closeCockpit();
          break;

        case 'open_whatsapp':
          const waBtn = document.querySelector('#qx_btn_vip_whatsapp, #qx_whatsapp_concierge, .qx-whatsapp-btn');
          if (waBtn) {
            waBtn.click();
          } else if (window.QX_TENANT && window.QX_TENANT.whatsappPhone) {
            window.open(`https://wa.me/${window.QX_TENANT.whatsappPhone}?text=${encodeURIComponent('Hola, me gustaría agendar una cita o consultar información.')}`, '_blank');
          } else {
            this.showToast('Enlazando con Asesor...');
          }
          break;

        case 'open_fiscal_lounge':
          const fisBtn = document.querySelector('#qx_btn_fiscal_lounge, #qx_btn_fiscal_nav, [data-action="open_fiscal"]');
          if (fisBtn) {
            fisBtn.click();
          } else {
            const drawer = document.querySelector('#qx_fiscal_lounge_drawer, #qx_fiscal_drawer');
            if (drawer) drawer.classList.add('active');
          }
          this.showToast('Lounge Fiscal SAT abierto');
          this.closeCockpit();
          break;

        case 'open_drawer':
          const drw = document.querySelector(val);
          if (drw) {
            drw.classList.add('active');
            this.showToast(`Abriendo ${val}`);
          }
          this.closeCockpit();
          break;

        case 'set_archetype':
          if (window.quantixStore && typeof window.quantixStore.setArchetype === 'function') {
            window.quantixStore.setArchetype(val);
            this.showToast(`Arquetipo: ${val}`);
          }
          break;

        case 'set_theme':
          if (window.quantixStore && typeof window.quantixStore.setAtmosphere === 'function') {
            window.quantixStore.setAtmosphere(val);
            this.showToast(`Atmósfera: ${val}`);
          }
          break;

        case 'open_url':
          window.location.href = val;
          break;

        case 'send_query':
          this.sendUserMessage(val);
          break;

        case 'run_health_check':
          this.sendUserMessage('diagnostico de salud');
          break;

        default:
          this.showToast(`Acción: ${action} (${val})`);
          break;
      }
    },

    /**
     * Muestra notificación toast temporal.
     */
    showToast: function(msg) {
      const card = document.getElementById('filemon_cockpit_card') || document.body;
      const toast = document.createElement('div');
      toast.className = 'filemon-toast';
      toast.textContent = msg;
      card.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    }
  };

  window.FilemonCockpit = FilemonCockpit;

  // Auto-montar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FilemonCockpit.init());
  } else {
    FilemonCockpit.init();
  }

})(window, document);
