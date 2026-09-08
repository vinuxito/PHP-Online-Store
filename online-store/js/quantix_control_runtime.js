/** Same control contract in the public page and its mounted Director preview. */
(function(root) {
  'use strict';
  var heroFields = ['headline','subheadline','kicker','kicker_enabled','kicker_icon','shader','typography','letter_spacing','shimmer'];
  function resolveHero(base, now, sceneId) {
    var out = Object.assign({}, base), selected = null, circadian=base.circadian || {};
    if (circadian.enabled) {
      var hour=0;
      try { hour=Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hourCycle:'h23',timeZone:circadian.maison_timezone || 'America/Mexico_City'}).format(new Date(now))); } catch(e) { hour=new Date(now).getUTCHours(); }
      var fields=(circadian.phases || {})[phaseAt(hour)] || {};
      heroFields.forEach(function(key){if(fields[key]!==undefined)out[key]=fields[key];});
    }
    (base.runway_defile || []).some(function(scene) {
      var active = sceneId ? scene.id === sceneId : Date.parse(scene.start_at) <= now && now < Date.parse(scene.end_at);
      if (active) { selected = scene; return true; }
      return false;
    });
    if (selected) heroFields.forEach(function(key) { if (Object.prototype.hasOwnProperty.call(selected,key)) out[key] = selected[key]; });
    out._scene_id = selected ? selected.id : null;
    return out;
  }
  function validClabe(value) {
    value=String(value || '');
    if (!/^[0-9]{18}$/.test(value) || /^0{18}$/.test(value)) return false;
    var sum=0, weights=[3,7,1];
    for(var i=0;i<17;i++) sum+=(Number(value[i])*weights[i%3])%10;
    return (10-sum%10)%10===Number(value[17]);
  }
  function phaseAt(hour) { return hour >= 6 && hour < 12 ? 'aube' : hour >= 12 && hour < 18 ? 'zenith' : hour >= 18 && hour < 22 ? 'crepuscule' : 'nuit'; }
  if (typeof module === 'object' && module.exports) { module.exports = {resolveHero:resolveHero,phaseAt:phaseAt,validClabe:validClabe}; return; }
  var state = {hero:{},sceneId:null,solar:null,contact:{},payments:{},timer:null,lastRender:''};
  var $ = root.jQuery;
  function textHtml(text) {
    var element=document.createElement('div'); element.textContent=String(text == null ? '' : text);
    return element.innerHTML.replace(/\{([^}]+)\}/g,'<span class="qx-title-accent">$1</span>').replace(/(\s)&amp;(\s)/g,'$1<span class="qx-title-amp">&amp;</span>$2');
  }
  function renderHero(force) {
    var hero=resolveHero(state.hero,Date.now(),state.sceneId), circadian=hero.circadian || {};
    var hour=0;
    try { hour=Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hourCycle:'h23',timeZone:circadian.maison_timezone || 'America/Mexico_City'}).format(new Date())); } catch(e) { hour=new Date().getHours(); }
    var phase=state.solar ? state.solar.phase || phaseAt(Number(state.solar.hour)) : phaseAt(hour);
    var active=Boolean(circadian.enabled || state.solar);
    if (state.solar && circadian.phases && circadian.phases[phase]) {
      heroFields.forEach(function(key) { if (circadian.phases[phase][key] !== undefined && !hero._scene_id) hero[key]=circadian.phases[phase][key]; });
    }
    if (state.solar && state.solar.shader) hero.shader=state.solar.shader;
    var signature=JSON.stringify([hero,active,phase]);
    if (!force && signature===state.lastRender) return;
    state.lastRender=signature;
    ['aube','zenith','crepuscule','nuit'].forEach(function(key) { document.body.classList.toggle('qx-circadian-'+key,active && key===phase); });
    document.body.setAttribute('data-campaign',hero._scene_id || 'baseline');
    if (hero.headline !== undefined) $('#qx_hero_title').html(textHtml(hero.headline));
    if (hero.subheadline !== undefined) $('.qx-hero-subtitle').text(hero.subheadline);
    if (hero.kicker !== undefined) $('#qx_hero_kicker_text').text(hero.kicker);
    if (hero.kicker_enabled !== undefined) $('#qx_hero_kicker_wrap').toggle(Boolean(hero.kicker_enabled));
    var icons={sparkle:'✦',crown:'👑',gem:'💎',lightning:'⚡',feather:'🪶',none:''};
    if (hero.kicker_icon !== undefined) $('#qx_hero_kicker_icon').text(icons[hero.kicker_icon] || '');
    var title=document.getElementById('qx_hero_title');
    if (title) {
      [['shader','qx-shader-'],['typography','qx-typo-'],['letter_spacing','qx-track-']].forEach(function(pair) {
        if (!hero[pair[0]]) return;
        Array.from(title.classList).filter(function(c){return c.indexOf(pair[1])===0;}).forEach(function(c){title.classList.remove(c);});
        title.classList.add(pair[1]+hero[pair[0]]);
      });
      if (hero.shimmer !== undefined) title.classList.toggle('qx-shimmer-active',Boolean(hero.shimmer));
    }
    if (root.QuantixStoreDesigns && root.QuantixStoreDesigns.applyHeroSettings) root.QuantixStoreDesigns.applyHeroSettings(Object.assign({},hero,{circadian:Object.assign({},circadian,{enabled:active})}));
  }
  function applyContact(payload) {
    state.contact=Object.assign({},state.contact,payload);
    var c=state.contact, phone=String(c.whatsapp_phone || '').replace(/[^0-9]/g,''), show=Boolean(c.show_whatsapp && phone);
    var mapped={showWhatsapp:show,whatsappPhone:phone,whatsappGreeting:c.whatsapp_message || ''};
    Object.assign(root.QX_TENANT || {},mapped);
    if (root.quantixStore) {
      root.quantixStore.tenant=Object.assign(root.quantixStore.tenant || {},mapped);
      if (root.QuantixStoreDesigns) root.QuantixStoreDesigns.refresh(root.quantixStore);
      var contact=root.quantixStore.getStoreContact('Hola, solicito información.');
      $('.qx-re-broker-wa-btn').each(function(){ if(contact) $(this).attr('href',contact.url).text(contact.label).show(); else $(this).hide(); });
    }
    $('#qx_whatsapp_float').toggle(show).attr('href',show ? 'https://wa.me/'+phone+'?text='+encodeURIComponent(c.whatsapp_message || '') : '#');
  }
  function applyPayments(payload) {
    state.payments=Object.assign({},state.payments,payload);
    var p=state.payments, ready=Boolean(p.spei_bank && p.spei_beneficiary && validClabe(p.spei_clabe));
    $('#qx_spei_bank').text(p.spei_bank || ''); $('#qx_spei_beneficiary').text(p.spei_beneficiary || ''); $('#qx_spei_clabe_val').val(p.spei_clabe || '');
    $('#qx_spei_voucher').toggle(ready); $('#qx_payment_unavailable').prop('hidden',ready).toggle(!ready);
    $('input[name="qx_payment_method"][value="SPEI"]').prop('disabled',!ready).prop('checked',ready);
    $('#qx_btn_place_order').prop('disabled',!ready);
    $('#qx_cfdi_request_wrap').toggle(Boolean(p.auto_cfdi));
    if (!p.auto_cfdi) $('#qx_require_cfdi').prop('checked',false).trigger('change');
    if (root.quantixStore) root.quantixStore.tenant.paymentSettings=Object.assign({},p,{spei_ready:ready,invoice_request_enabled:Boolean(p.auto_cfdi)});
  }
  var runtime={
    init:function(config) {
      state.hero=config.hero || {}; state.contact=config.contact || {}; state.payments=config.payments || {};
      renderHero(true); applyContact(state.contact); applyPayments(state.payments);
      if (Array.isArray(state.hero.featured_products) && root.QuantixStoreDesigns) root.QuantixStoreDesigns.setFeatured(state.hero.featured_products,root.quantixStore);
      clearInterval(state.timer); state.timer=setInterval(function(){renderHero(false);},1000);
    },
    handle:function(type,payload) {
      if (type==='SYNC_TITLE_MOTION_PREVIEW') {
        // The outer listener validates the Director origin, source and preview mode.
        // Rehearsal is local to this embedded document; never saved or applied publicly.
        if (root.parent !== root) {
          if (payload && payload.enabled === true) document.body.setAttribute('data-title-motion-preview','true');
          else document.body.removeAttribute('data-title-motion-preview');
        }
        return true;
      }
      if (type==='SYNC_HERO_CURATION') {
        state.hero=Object.assign({},state.hero,payload); state.sceneId=null; state.solar=null; renderHero(true);
        if (Array.isArray(payload.featured_products) && root.QuantixStoreDesigns) root.QuantixStoreDesigns.setFeatured(payload.featured_products,root.quantixStore);
        return true;
      }
      if (type==='SYNC_HERO_PREVIEW') { state.sceneId=payload && payload.scene_id || null; state.solar=null; renderHero(true); return true; }
      if (type==='SYNC_CIRCADIAN_HOUR') { state.solar=payload && payload.live ? null : payload; renderHero(true); return true; }
      if (type==='SYNC_CONTACT_SETTINGS') { applyContact(payload || {}); return true; }
      if (type==='SYNC_PAYMENT_SETTINGS') { applyPayments(payload || {}); return true; }
      return false;
    },
    refreshContact:function(){applyContact(state.contact);applyPayments(state.payments);},
    resolveHero:resolveHero
  };
  root.QuantixControlRuntime=runtime;
  $(function(){runtime.init(root.QX_CONTROL_STATE || {});});
})(typeof window !== 'undefined' ? window : globalThis);
