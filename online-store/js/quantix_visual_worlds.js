/* World changes project presentation onto the mounted store. Catalogue remains authoritative. */
(function(window,document){
  'use strict';
  var contract=window.QuantixVisualWorlds, draft=null;
  var preview=new URLSearchParams(window.location.search).get('preview_mode')==='1';
  function apply(key,store){
    key=contract.normalize(key);
    document.body.setAttribute('data-visual-world',key);
    if(store)store.currentVisualWorld=key;
    var image=document.getElementById('qx_design_hero_image'),source=image&&image.dataset.sourceUrl;
    if(image&&source){
      if(key==='original'){if(image.getAttribute('src')!==source)image.src=source;}
      else if(store&&store.flaconEngine&&image.dataset.worldIsolation==='yes'){
        store.flaconEngine.isolateSilhouette(source).then(function(url){
          if(url&&image.dataset.sourceUrl===source&&document.body.getAttribute('data-visual-world')!=='original')image.src=url;
        }).catch(function(){});
      }
    }
    var hero=document.getElementById('qx_hero_section'),showcase=document.getElementById('qx_design_showcase');
    if(key!=='original'&&hero&&showcase&&showcase.parentNode===hero)hero.parentNode.insertBefore(showcase,hero.nextSibling);
    if(key==='original'&&store&&window.QuantixStoreDesigns)window.QuantixStoreDesigns.commerceLayout(store);
    var actions=document.querySelector('.qx-design-hero-actions'), selection=document.getElementById('qx_world_selection');
    if(actions&&!selection){
      selection=document.createElement('button');selection.id='qx_world_selection';selection.type='button';selection.className='qx-design-secondary';selection.textContent='Tu selección';
      selection.onclick=function(){if(window.quantixStore&&window.quantixStore.shopperWorkspace)window.quantixStore.shopperWorkspace.open();};
      actions.appendChild(selection);
    }
    if(selection){selection.hidden=key==='original'||preview;selection.disabled=preview||!(store&&store.shopperWorkspace);}
    var media=document.getElementById('qx_design_hero_media');
    var empty=media&&media.querySelector('.qx-design-image-empty');
    if(empty&&key!=='original')empty.textContent='Imagen no disponible';
    if(hero)hero.classList.toggle('qx-world-no-featured',!media||media.hidden);
  }
  var api={
    refresh:function(store){apply(draft===null?(store.tenant&&store.tenant.visualWorld||document.body.getAttribute('data-visual-world')):draft,store);},
    apply:function(key){if(contract.normalize(key)!==key)return;draft=key;apply(key,window.quantixStore);},
    current:function(){return contract.normalize(document.body.getAttribute('data-visual-world'));}
  };
  window.QuantixVisualSurface=api;
  window.addEventListener('message',function(event){
    if(!window.QuantixStoreDesigns||!window.QuantixStoreDesigns.isTrustedPreviewMessage(event))return;
    var data=event.data;
    if(data&&data.source==='QUANTIX_APEX_COMMAND_TOWER'&&data.type==='SYNC_VISUAL_WORLD'&&data.payload)api.apply(data.payload.world);
  });
  document.addEventListener('DOMContentLoaded',function(){apply(document.body.getAttribute('data-visual-world'),window.quantixStore);});
})(window,document);
