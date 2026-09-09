/**
 * /lamp/www/quantix-stores/online-store/js/quantix_spatial_studio.js
 * 
 * Quantix Holo-Studio 3D Interactive Spatial Showcase Engine
 * Ultra-lightweight WebGL runtime powered by self-hosted Three.js r128.
 */

(function(window) {
  'use strict';

  class QuantixSpatialStudio {
    constructor(wrapperEl, userConfig = {}) {
      this.wrapper = typeof wrapperEl === 'string' ? document.getElementById(wrapperEl) : wrapperEl;
      if (!this.wrapper) return;

      // Extract config from data-config attribute or argument
      let domConfig = {};
      try {
        const raw = this.wrapper.getAttribute('data-config');
        if (raw) domConfig = JSON.parse(raw);
      } catch (e) {
        console.warn('QuantixSpatialStudio: Invalid data-config JSON', e);
      }

      this.config = Object.assign({
        enabled: true,
        archetype_model: 'perfume_flacon_imperial',
        lighting_preset: 'studio_softbox',
        auto_orbit: true,
        auto_orbit_speed: 1.2,
        allow_zoom: true,
        allow_explode: true,
        finishes: [],
        hotspots: [],
        ar_calibration: {}
      }, domConfig, userConfig);

      this.config = this.normalizeConfig(this.config);
      this.arCalibration = Object.assign({
        enabled: true,
        anchor: 'surface',
        height_mm: 150,
        width_mm: 65,
        depth_mm: 65,
        lock_scale: true
      }, this.config.ar_calibration || {});

      ['enabled', 'lock_scale'].forEach(key => { this.arCalibration[key] = this.arCalibration[key] === true || this.arCalibration[key] === 1 || this.arCalibration[key] === '1'; });
      this.arCalibration.anchor = this.arCalibration.anchor === 'floor' ? 'floor' : 'surface';

      this.container = this.wrapper.querySelector('#qx_studio_canvas_container') || this.wrapper;
      this.hotspotsLayer = this.wrapper.querySelector('#qx_studio_hotspots_layer');
      this.swatchesContainer = this.wrapper.querySelector('#qx_shelf_swatches');
      this.priceValEl = this.wrapper.querySelector('#qx_studio_price_val');
      this.addBtn = this.wrapper.querySelector('#qx_btn_studio_add');

      this.isExploded = false;
      this.isAutoOrbiting = Boolean(this.config.auto_orbit);
      this.isStationary = false;
      this.isIdle = !this.config.enabled;
      this.isInView = true;
      this.modelGeneration = 0;
      this.customModelUrl = '';
      this.modelLoadError = '';
      this.isModelLoading = false;
      this.autoARLaunchPending = false;
      this.activeHotspotId = null;
      this.activeFinish = null;

      if (typeof THREE === 'undefined') {
        this.wrapper.hidden = true;
        console.warn('QuantixSpatialStudio: 3D runtime unavailable.');
        return;
      }

      // Camera Spherical Coordinates for smooth damping
      this.spherical = { radius: 2.6, phi: Math.PI / 2 - 0.15, theta: 0.2 };
      this.targetSpherical = { radius: 2.6, phi: Math.PI / 2 - 0.15, theta: 0.2 };
      this.cameraLook = new THREE.Vector3(0, 0.2, 0);
      this.targetCameraLook = new THREE.Vector3(0, 0.2, 0);

      // Mouse / Touch Interaction State
      this.isPointerDown = false;
      this.pointerPrev = { x: 0, y: 0 };
      this.pointerVelocity = { x: 0, y: 0 };

      // Sub-assembly meshes for exploded view
      this.parts = {};
      this.hotspotPins = [];

      if (!this.initThree()) {
        this.wrapper.setAttribute('data-spatial-state','static-fallback');
        if (this.wrapper) this.wrapper.style.display = 'none';
        const fallbackCarousel = document.getElementById('qx_hero_carousel_wrapper');
        if (fallbackCarousel && window.quantixStore && window.QuantixStoreDesigns) window.QuantixStoreDesigns.modules(window.quantixStore);
        return;
      }

      this.buildLighting();
      this.buildModel();
      this.initHotspots();
      this.bindEvents();
      this.initARBridge();
      this.animate = this.animate.bind(this);
      this.initVisibilityObserver();
      this.syncControls();
      this.updateRenderState();
    }

    initThree() {
      if (typeof THREE === 'undefined') {
        console.error('QuantixSpatialStudio: THREE is not defined. Ensure three.min.js is loaded.');
        return false;
      }

      this.width = this.container.clientWidth || 800;
      this.height = this.container.clientHeight || 520;

      this.scene = new THREE.Scene();

      this.camera = new THREE.PerspectiveCamera(42, this.width / this.height, 0.1, 50);
      this.updateCameraPosition();

      try {
        // Probe the same canvas before constructing Three: unavailable GPU is a normal fallback.
        const canvas=document.createElement('canvas');
        const context=canvas.getContext('webgl2',{alpha:true,antialias:true}) || canvas.getContext('webgl',{alpha:true,antialias:true});
        if(!context)return false;
        this.renderer = new THREE.WebGLRenderer({
          canvas:canvas,
          context:context,
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        });
      } catch (e) {
        console.warn('QuantixSpatialStudio: WebGLRenderer creation error', e);
        return false;
      }

      if (!this.renderer || !this.renderer.domElement) {
        return false;
      }

      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      if (THREE.sRGBEncoding) {
        this.renderer.outputEncoding = THREE.sRGBEncoding;
      }

      this.renderer.domElement.id = 'qx_spatial_studio_canvas';
      this.renderer.domElement.style.width = '100%';
      this.renderer.domElement.style.height = '100%';
      this.renderer.domElement.style.display = 'block';
      this.container.appendChild(this.renderer.domElement);

      this.modelGroup = new THREE.Group();
      this.scene.add(this.modelGroup);
      return true;
    }

    buildLighting() {
      this.ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
      this.scene.add(this.ambientLight);

      this.keyLight = new THREE.DirectionalLight(0xfff7ed, 1.6);
      this.keyLight.position.set(2.5, 4.0, 3.0);
      this.scene.add(this.keyLight);

      this.fillLight = new THREE.DirectionalLight(0xdbeafe, 0.75);
      this.fillLight.position.set(-3.0, 2.0, -2.0);
      this.scene.add(this.fillLight);

      this.rimLight = new THREE.PointLight(0xd4af37, 1.4, 15);
      this.rimLight.position.set(0, 3.2, -2.8);
      this.scene.add(this.rimLight);

      this.applyLightingPreset(this.config.lighting_preset || 'studio_softbox');
    }

    applyLightingPreset(preset) {
      this.config.lighting_preset = preset;
      this.fillLight.color.setHex(0xdbeafe);
      switch (preset) {
        case 'obsidian_rimlight':
        case 'obsidian':
          this.ambientLight.intensity = 0.35;
          this.ambientLight.color.setHex(0x1e293b);
          this.keyLight.intensity = 1.1;
          this.keyLight.color.setHex(0xffffff);
          this.fillLight.intensity = 0.4;
          this.rimLight.intensity = 2.4;
          this.rimLight.color.setHex(0xd4af37);
          break;
        case 'zenith_sun':
        case 'zenith':
          this.ambientLight.intensity = 0.95;
          this.ambientLight.color.setHex(0xfef08a);
          this.keyLight.intensity = 2.2;
          this.keyLight.color.setHex(0xffedd5);
          this.fillLight.intensity = 0.8;
          this.rimLight.intensity = 1.6;
          this.rimLight.color.setHex(0xfbbf24);
          break;
        case 'neon_cyber':
        case 'neon':
          this.ambientLight.intensity = 0.4;
          this.ambientLight.color.setHex(0x0f172a);
          this.keyLight.intensity = 1.4;
          this.keyLight.color.setHex(0x38bdf8);
          this.fillLight.intensity = 1.2;
          this.fillLight.color.setHex(0xe879f9);
          this.rimLight.intensity = 2.0;
          this.rimLight.color.setHex(0x34d399);
          break;
        case 'studio_softbox':
        default:
          this.ambientLight.intensity = 0.85;
          this.ambientLight.color.setHex(0xffffff);
          this.keyLight.intensity = 1.6;
          this.keyLight.color.setHex(0xfff7ed);
          this.fillLight.intensity = 0.75;
          this.fillLight.color.setHex(0xdbeafe);
          this.rimLight.intensity = 1.4;
          this.rimLight.color.setHex(0xd4af37);
          break;
      }
    }

    normalizeConfig(config) {
      const next = Object.assign({}, config);
      ['enabled', 'auto_orbit', 'allow_zoom', 'allow_explode'].forEach(key => {
        if (Object.prototype.hasOwnProperty.call(next, key)) next[key] = next[key] === true || next[key] === 1 || next[key] === '1';
      });
      const speed = Number(next.auto_orbit_speed);
      next.auto_orbit_speed = Number.isFinite(speed) ? Math.max(0, Math.min(4, speed)) : 1.2;
      next.finishes = Array.isArray(next.finishes) ? next.finishes : [];
      next.hotspots = Array.isArray(next.hotspots) ? next.hotspots : [];
      return next;
    }

    applyConfig(payload) {
      if (!payload || typeof payload !== 'object') return;
      const before = this.config;
      const next = this.normalizeConfig(Object.assign({}, before, payload));
      next.ar_calibration = Object.assign({}, before.ar_calibration || {}, payload.ar_calibration || {});
      const rebuild = ['archetype_model', 'model_source', 'custom_model_url'].some(key => before[key] !== next[key]);
      const finishesChanged = JSON.stringify(before.finishes) !== JSON.stringify(next.finishes) || before.default_finish !== next.default_finish;
      this.config = next;
      if (!this.modelGroup) { this.wrapper.hidden = true; return; }
      if (Object.prototype.hasOwnProperty.call(payload, 'auto_orbit')) this.isAutoOrbiting = next.auto_orbit;
      if (rebuild && this.modelGroup) this.buildModel();
      if (before.lighting_preset !== next.lighting_preset && this.ambientLight) this.applyLightingPreset(next.lighting_preset);
      if (finishesChanged) this.initShelfAndFinishes();
      if (payload.hotspots || payload.custom_hotspots) this.initHotspots();
      this.applyARCalibration(next.ar_calibration);
      this.syncControls();
      this.onResize();
      this.updateRenderState();
    }

    clearModel() {
      if (!this.modelGroup) return;
      while (this.modelGroup.children.length) {
        const obj = this.modelGroup.children[0];
        this.modelGroup.remove(obj);
        obj.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          const materials = child.material ? (Array.isArray(child.material) ? child.material : [child.material]) : [];
          materials.forEach(material => { if (material.map) material.map.dispose(); material.dispose(); });
        });
      }
      this.parts = {};
      this.capMesh = null;
      this.activeCustomModel = null;
      this.customModelUrl = '';
      this.isExploded = false;
    }

    modelKind() {
      if (this.config.archetype_model === 'architectural_space') return 'architecture';
      if (['industrial_solenoid_valve', 'industrial_part'].includes(this.config.archetype_model)) return 'industrial';
      if (this.config.archetype_model === 'perfume_flacon_imperial') return 'perfume';
      return 'reference';
    }

    buildModel() {
      this.modelGeneration += 1;
      // A cancelled GLTF request cannot retain its spinner over the next model.
      this.setLoadingState(false);
      this.clearModel();
      this.modelLoadError = '';
      if (this.config.custom_model_url && this.config.model_source !== 'procedural') {
        this.loadCustomGltfModel(this.config.custom_model_url);
      } else {
        this.buildProceduralModel();
      }
      this.syncControls();
    }

    buildProceduralModel() {
      const kind = this.modelKind();
      if (kind === 'industrial') { this.buildIndustrialSolenoid(); this.buildGroundShadow(-0.38); }
      else if (kind === 'perfume') { this.buildPerfumeFlacon(); this.buildGroundShadow(-0.68); }
      else { this.buildArchitecturalSpace(kind === 'reference'); this.buildGroundShadow(-0.46); }
      // Custom assets hide these controls; rebuilding a procedural model restores them.
      this.initShelfAndFinishes();
      this.initHotspots();
    }

    buildArchitecturalSpace(neutral) {
      const finish = (this.config.finishes || []).find(item => item.id === this.config.default_finish) || this.config.finishes[0] || {};
      const wall = new THREE.MeshStandardMaterial({ color: 0xd6d2c8, roughness: 0.75 });
      const roof = new THREE.MeshStandardMaterial({ color: finish.color || '#586b69', metalness: 0.2, roughness: 0.6 });
      const glass = new THREE.MeshPhysicalMaterial({ color: 0x8ec5cb, transparent: true, opacity: 0.36, metalness: 0.08, roughness: 0.12, side: THREE.DoubleSide });
      const floor = new THREE.MeshStandardMaterial({ color: 0xb6aa95, roughness: 0.8 });
      const add = (name, size, position, material, explode) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material.clone());
        mesh.position.set(...position);
        this.modelGroup.add(mesh);
        this.parts[name] = { mesh, basePos: mesh.position.clone(), explodeDelta: new THREE.Vector3(...explode) };
        return mesh;
      };
      add('floor', [1.8, 0.1, 1.35], [0, -0.4, 0], floor, [0, -0.25, 0]);
      if (neutral) {
        this.capMesh = add('body', [0.9, 0.75, 0.9], [0, 0.025, 0], roof, [0, 0.3, 0]);
        [wall, roof, glass, floor].forEach(material => material.dispose());
        return;
      }
      add('back', [1.7, 0.9, 0.08], [0, 0.1, -0.59], wall, [0, 0.15, -0.45]);
      add('side', [0.08, 0.9, 1.18], [-0.81, 0.1, 0], wall, [-0.45, 0.1, 0]);
      add('partition', [0.07, 0.72, 0.72], [0.26, 0.01, -0.18], wall, [0.22, 0.2, 0]);
      add('glazing', [1.45, 0.75, 0.035], [0.05, 0.02, 0.58], glass, [0, 0.1, 0.45]);
      this.capMesh = add('roof', [1.86, 0.1, 1.4], [0, 0.6, 0], roof, [0, 0.65, 0]);
      [wall, roof, glass, floor].forEach(material => material.dispose());
    }

    loadCustomGltfModel(url) {
      const generation = this.modelGeneration;
      const safeUrl = this.sceneUrl(url);
      if (!safeUrl || typeof THREE.GLTFLoader === 'undefined') {
        this.modelLoadError = 'El archivo 3D no está disponible. Se muestra un modelo de referencia.';
        this.fallbackToProcedural();
        return;
      }
      this.setLoadingState(true);
      this.customModelUrl = '';
      this.syncControls();
      let dracoLoader = null;
      const fail = () => {
        if (generation !== this.modelGeneration) return;
        this.setLoadingState(false);
        this.modelLoadError = 'No se pudo cargar el archivo 3D. Se muestra un modelo de referencia.';
        this.fallbackToProcedural();
      };
      try {
        const loader = new THREE.GLTFLoader();
        if (typeof THREE.DRACOLoader !== 'undefined') {
          dracoLoader = new THREE.DRACOLoader();
          dracoLoader.setDecoderPath('js/vendor/draco/');
          loader.setDRACOLoader(dracoLoader);
        }
        loader.load(safeUrl, gltf => {
          if (dracoLoader) dracoLoader.dispose();
          const model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
          if (generation !== this.modelGeneration) {
            if (model) model.traverse(child => { if (child.geometry) child.geometry.dispose(); });
            return;
          }
          if (!model) { fail(); return; }
          this.clearModel();
          this.setLoadingState(false);
          const bbox = new THREE.Box3().setFromObject(model);
          const center = bbox.getCenter(new THREE.Vector3());
          const size = bbox.getSize(new THREE.Vector3());
          model.position.set(-center.x, -center.y, -center.z);
          const scale = 2.2 / (Math.max(size.x, size.y, size.z) || 1);
          const pivot = new THREE.Group();
          pivot.add(model);
          pivot.scale.setScalar(scale);
          this.modelGroup.add(pivot);
          this.activeCustomModel = pivot;
          this.customModelUrl = safeUrl;
          this.modelLoadError = '';
          this.buildGroundShadow((bbox.min.y - center.y) * scale - 0.05);
          this.initHotspots();
          this.initShelfAndFinishes();
          this.syncControls();
        }, undefined, () => { if (dracoLoader) dracoLoader.dispose(); fail(); });
      } catch (error) { if (dracoLoader) dracoLoader.dispose(); fail(); }
    }

    fallbackToProcedural() {
      this.clearModel();
      this.setLoadingState(false);
      this.buildProceduralModel();
      this.syncControls();
    }

    setLoadingState(isLoading) {
      this.isModelLoading = Boolean(isLoading);
      let pill = this.wrapper ? this.wrapper.querySelector('#qx_3d_loading_pill') : null;
      if (!pill && this.wrapper && isLoading) {
        pill = document.createElement('div');
        pill.id = 'qx_3d_loading_pill';
        pill.className = 'qx-3d-loading-pill';
        pill.innerHTML = `<span>Cargando modelo 3D…</span>`;
        this.wrapper.appendChild(pill);
      }
      if (pill) {
        pill.style.display = isLoading ? 'flex' : 'none';
      }
    }

    loadCustomModel(url, name, hotspots) {
      if (!url) return;
      const payload = { custom_model_url: url, custom_model_name: name || '', model_source: 'custom_gltf' };
      if (Array.isArray(hotspots)) payload.custom_hotspots = hotspots;
      this.applyConfig(payload);
    }

    setCustomHotspots(hotspots) {
      if (Array.isArray(hotspots)) {
        this.config.custom_hotspots = hotspots;
        this.initHotspots();
      }
    }

    resetToProcedural() {
      this.applyConfig({ custom_model_url: '', custom_model_name: '', model_source: 'procedural', custom_hotspots: [] });
    }

    buildPerfumeFlacon() {
      const finish = this.config.finishes && this.config.finishes[0] ? this.config.finishes[0] : {
        color: '#111827',
        roughness: 0.20,
        metalness: 0.80,
        clearcoat: 0.90
      };

      // 1. Crystal Glass Flacon Body
      const glassGeo = new THREE.CylinderGeometry(0.54, 0.54, 1.05, 48, 1, false);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.05,
        roughness: 0.08,
        transmission: 0.90,
        ior: 1.52,
        transparent: true,
        opacity: 0.92,
        reflectivity: 0.85
      });
      const flaconBody = new THREE.Mesh(glassGeo, glassMat);
      flaconBody.position.set(0, 0, 0);
      this.modelGroup.add(flaconBody);
      this.parts.body = { mesh: flaconBody, basePos: new THREE.Vector3(0, 0, 0), explodeDelta: new THREE.Vector3(0, 0, 0) };

      // 2. Inner Elixir Core
      const elixirGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.88, 36, 1, false);
      const elixirMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.25,
        metalness: 0.15,
        transparent: true,
        opacity: 0.85
      });
      const elixir = new THREE.Mesh(elixirGeo, elixirMat);
      elixir.position.set(0, -0.05, 0);
      this.modelGroup.add(elixir);
      this.parts.elixir = { mesh: elixir, basePos: new THREE.Vector3(0, -0.05, 0), explodeDelta: new THREE.Vector3(0, 0, 0) };

      // 3. Mirror-Polished Gold Collar
      const collarGeo = new THREE.CylinderGeometry(0.22, 0.24, 0.18, 36);
      const collarMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        metalness: 0.95,
        roughness: 0.12
      });
      const collar = new THREE.Mesh(collarGeo, collarMat);
      collar.position.set(0, 0.61, 0);
      this.modelGroup.add(collar);
      this.parts.collar = { mesh: collar, basePos: new THREE.Vector3(0, 0.61, 0), explodeDelta: new THREE.Vector3(0, 0.22, 0) };

      // 4. Atomizer Pump & Sprayer
      const pumpGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.20, 24);
      const pumpMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.90,
        roughness: 0.18
      });
      const pump = new THREE.Mesh(pumpGeo, pumpMat);
      pump.position.set(0, 0.76, 0);
      this.modelGroup.add(pump);
      this.parts.pump = { mesh: pump, basePos: new THREE.Vector3(0, 0.76, 0), explodeDelta: new THREE.Vector3(0, 0.50, 0) };

      // 5. Heavy Magnetic Zamak Cap
      const capGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.48, 48);
      const capMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(finish.color || '#111827'),
        metalness: finish.metalness !== undefined ? finish.metalness : 0.80,
        roughness: finish.roughness !== undefined ? finish.roughness : 0.20,
        clearcoat: finish.clearcoat !== undefined ? finish.clearcoat : 0.90,
        clearcoatRoughness: 0.1
      });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(0, 1.05, 0);
      this.modelGroup.add(cap);
      this.parts.cap = { mesh: cap, basePos: new THREE.Vector3(0, 1.05, 0), explodeDelta: new THREE.Vector3(0, 0.85, 0) };

      this.capMesh = cap;
    }

    buildIndustrialSolenoid() {
      const finish = this.config.finishes && this.config.finishes[0] ? this.config.finishes[0] : {
        color: '#0284c7',
        roughness: 0.30,
        metalness: 0.70,
        clearcoat: 0.80
      };

      // 1. Valve Body
      const baseGeo = new THREE.BoxGeometry(1.2, 0.48, 0.68);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.85,
        roughness: 0.35
      });
      const valveBase = new THREE.Mesh(baseGeo, baseMat);
      valveBase.position.set(0, 0, 0);
      this.modelGroup.add(valveBase);
      this.parts.body = { mesh: valveBase, basePos: new THREE.Vector3(0, 0, 0), explodeDelta: new THREE.Vector3(0, 0, 0) };

      const portGeo = new THREE.CylinderGeometry(0.24, 0.24, 1.45, 24);
      const portMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.25 });
      const port = new THREE.Mesh(portGeo, portMat);
      port.rotation.z = Math.PI / 2;
      valveBase.add(port);

      // 2. Bonnet / Stem
      const stemGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.36, 32);
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(0, 0.42, 0);
      this.modelGroup.add(stem);
      this.parts.collar = { mesh: stem, basePos: new THREE.Vector3(0, 0.42, 0), explodeDelta: new THREE.Vector3(0, 0.25, 0) };

      // 3. Solenoid Coil
      const coilGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.76, 36);
      const coilMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(finish.color || '#0284c7'),
        metalness: finish.metalness !== undefined ? finish.metalness : 0.70,
        roughness: finish.roughness !== undefined ? finish.roughness : 0.30,
        clearcoat: finish.clearcoat !== undefined ? finish.clearcoat : 0.80
      });
      const coil = new THREE.Mesh(coilGeo, coilMat);
      coil.position.set(0, 0.96, 0);
      this.modelGroup.add(coil);
      this.parts.pump = { mesh: coil, basePos: new THREE.Vector3(0, 0.96, 0), explodeDelta: new THREE.Vector3(0, 0.55, 0) };

      // 4. IP67 Hex Cap
      const hexGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.24, 6);
      const hexMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.4, roughness: 0.6 });
      const hexCap = new THREE.Mesh(hexGeo, hexMat);
      hexCap.position.set(0, 1.44, 0);
      this.modelGroup.add(hexCap);
      this.parts.cap = { mesh: hexCap, basePos: new THREE.Vector3(0, 1.44, 0), explodeDelta: new THREE.Vector3(0, 0.90, 0) };

      this.capMesh = coil;
    }

    buildGroundShadow(yLevel = -0.65) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
      grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.35)');
      grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.08)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);

      const texture = new THREE.CanvasTexture(canvas);
      const shadowGeo = new THREE.PlaneGeometry(2.2, 2.2);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false
      });
      const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.set(0, yLevel, 0);
      this.modelGroup.add(shadowPlane);
    }

    initHotspots() {
      if (!this.hotspotsLayer) return;
      this.hotspotsLayer.innerHTML = '';
      this.hotspotPins = [];

      let spots = [];
      if (this.config.custom_hotspots && this.config.custom_hotspots.length > 0) {
        spots = this.config.custom_hotspots.map((hs, idx) => ({
          id: 'custom_hs_' + idx,
          label: hs.title || hs.label || ('Punto ' + (idx + 1)),
          description: hs.desc || hs.description || '',
          position: [hs.x !== undefined ? hs.x : 0, hs.y !== undefined ? hs.y : 0, hs.z !== undefined ? hs.z : 0],
          normal: [hs.nx !== undefined ? hs.nx : 0, hs.ny !== undefined ? hs.ny : 0, hs.nz !== undefined ? hs.nz : 1],
          camera_target: [hs.x || 0, hs.y || 0, (hs.z || 0) + 1.2],
          icon: hs.icon || '✦'
        }));
      } else {
        spots = this.config.hotspots || [];
      }

      spots.forEach(spot => {
        const pin = document.createElement('div');
        pin.className = 'qx-hotspot-pin';
        pin.setAttribute('data-id', spot.id);
        pin.setAttribute('title', spot.label);
        pin.innerHTML = `
          <div class="qx-hotspot-dot">${spot.icon ? `<span style="font-size:9px;">${this.escapeHtml(spot.icon)}</span>` : ''}</div>
          <div class="qx-hotspot-ripple"></div>
          <div class="qx-hotspot-card" id="card_${this.escapeHtml(spot.id)}">
            <div class="qx-hotspot-card-title">${this.escapeHtml(spot.label)}</div>
            <div class="qx-hotspot-card-desc">${this.escapeHtml(spot.description)}</div>
            <button type="button" class="qx-hotspot-close" aria-label="Cerrar">&times;</button>
          </div>
        `;

        pin.addEventListener('click', (e) => {
          if (e.target.closest('.qx-hotspot-close')) {
            e.stopPropagation();
            this.closeHotspots();
            return;
          }
          this.focusHotspot(spot);
        });

        this.hotspotsLayer.appendChild(pin);

        const pos = new THREE.Vector3(
          spot.position ? spot.position[0] : 0,
          spot.position ? spot.position[1] : 0,
          spot.position ? spot.position[2] : 0
        );

        let normal;
        if (spot.normal && Array.isArray(spot.normal) && (spot.normal[0] !== 0 || spot.normal[1] !== 0 || spot.normal[2] !== 0)) {
          normal = new THREE.Vector3(spot.normal[0], spot.normal[1], spot.normal[2]).normalize();
        } else {
          normal = new THREE.Vector3(pos.x, 0, pos.z).normalize();
          if (normal.length() === 0) normal.set(0, 0, 1);
        }

        this.hotspotPins.push({
          id: spot.id,
          element: pin,
          card: pin.querySelector('.qx-hotspot-card'),
          pos: pos,
          normal: normal,
          target: spot.camera_target || [0, pos.y, 1.8]
        });
      });
    }

    updateHotspotsProjection() {
      if (!this.hotspotPins || this.hotspotPins.length === 0) return;
      const widthHalf = this.width / 2;
      const heightHalf = this.height / 2;

      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);

      const p = new THREE.Vector3();
      this.hotspotPins.forEach(item => {
        p.copy(item.pos);
        if (this.isExploded && this.parts.cap && item.pos.y > 0.7) {
          p.y += this.parts.cap.mesh.position.y - this.parts.cap.basePos.y;
        }

        const screenVec = p.clone().project(this.camera);

        const worldNormal = item.normal.clone();
        const dot = worldNormal.dot(camDir.clone().negate());

        const isBehindCamera = screenVec.z > 1.0;
        const isOccluded = dot < -0.15 || isBehindCamera;

        if (isOccluded) {
          item.element.classList.add('occluded');
        } else {
          item.element.classList.remove('occluded');
        }

        const left = (screenVec.x * widthHalf) + widthHalf;
        const top = (-(screenVec.y * heightHalf)) + heightHalf;

        item.element.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      });
    }

    focusHotspot(spot) {
      this.activeHotspotId = spot.id;
      this.isAutoOrbiting = false;

      const orbitBtn = this.wrapper.querySelector('#qx_btn_3d_orbit');
      if (orbitBtn) orbitBtn.classList.remove('active');

      if (window.QuantixHapticAudio) {
        window.QuantixHapticAudio.playCrystalChime();
      }

      const t = spot.camera_target || [0, spot.position[1], 1.8];
      const targetRadius = Math.sqrt(t[0] * t[0] + t[1] * t[1] + t[2] * t[2]) || 2.0;
      if (this.config.allow_zoom) this.targetSpherical.radius = Math.max(1.3, Math.min(3.5, targetRadius));
      this.targetCameraLook.set(spot.position[0] * 0.5, spot.position[1], spot.position[2] * 0.5);

      this.hotspotPins.forEach(pinItem => {
        if (pinItem.id === spot.id) {
          pinItem.element.classList.add('active');
        } else {
          pinItem.element.classList.remove('active');
        }
      });
    }

    closeHotspots() {
      this.activeHotspotId = null;
      this.targetCameraLook.set(0, 0.2, 0);
      this.hotspotPins.forEach(pinItem => {
        pinItem.element.classList.remove('active');
      });
      if (window.QuantixHapticAudio) {
        window.QuantixHapticAudio.playDialTick();
      }
    }

    initShelfAndFinishes() {
      const finishes = this.config.finishes || [];
      const chosen = finishes.find(fin => fin.id === this.config.default_finish) || finishes.find(fin => this.activeFinish && fin.id === this.activeFinish.id) || finishes[0];
      this.activeFinish = chosen || null;
      if (this.swatchesContainer) {
        this.swatchesContainer.innerHTML = '';
        // Uploaded assets retain their authored materials; no target material mapping exists.
        this.swatchesContainer.hidden = Boolean(this.activeCustomModel) || !finishes.length;
        finishes.forEach(fin => {
          const sw = document.createElement('button');
          sw.type = 'button'; sw.className = 'qx-swatch-item';
          sw.setAttribute('data-id', fin.id);
          sw.setAttribute('title', fin.name || fin.id);
          const dot = document.createElement('span'); dot.className = 'qx-swatch-dot'; dot.style.background = fin.color || '#64748b';
          sw.appendChild(dot);
          sw.addEventListener('click', () => this.applyFinish(fin.id));
          this.swatchesContainer.appendChild(sw);
        });
      }
      if (chosen) this.applyFinish(chosen.id);
      this.updatePriceDisplay();
    }

    applyFinish(finishId) {
      const finishes = this.config.finishes || [];
      const finish = finishes.find(f => f.id === finishId);
      if (!finish) return;

      this.activeFinish = finish;

      if (this.swatchesContainer) {
        this.swatchesContainer.querySelectorAll('.qx-swatch-item').forEach(el => {
          el.classList.toggle('active', el.getAttribute('data-id') === finishId);
        });
      }

      if (this.capMesh && this.capMesh.material) {
        const targetColor = new THREE.Color(finish.color);
        this.capMesh.material.color.copy(targetColor);
        if (finish.metalness !== undefined) this.capMesh.material.metalness = finish.metalness;
        if (finish.roughness !== undefined) this.capMesh.material.roughness = finish.roughness;
        if (finish.clearcoat !== undefined) this.capMesh.material.clearcoat = finish.clearcoat;
        this.capMesh.material.needsUpdate = true;
      }

      if (window.QuantixHapticAudio) {
        window.QuantixHapticAudio.playFinishChime(finishId);
      }

      this.updatePriceDisplay();
      this.updateARVariant(finish);
    }

    getBoundProduct() {
      const store = window.quantixStore;
      const id = this.config.product_id || this.config.bound_product_id;
      if (!id || !store || !Array.isArray(store.products)) return null;
      return store.products.find(product => String(product.id) === String(id)) || null;
    }

    updatePriceDisplay() {
      const product = this.getBoundProduct();
      const price = product && Number(product.priceWithTax);
      if (this.priceValEl) this.priceValEl.textContent = product ? (price > 0 ? '$ ' + price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MXN' : 'Consultar precio') : 'Modelo de referencia';
      if (this.addBtn) {
        this.addBtn.hidden = !product;
        this.addBtn.disabled = !product || !this.config.enabled;
        this.addBtn.textContent = window.quantixStore && window.quantixStore.isRealEstateBusiness && window.quantixStore.isRealEstateBusiness() ? 'Ver propiedad' : 'Ver artículo';
      }
    }

    toggleExplodedView() {
      this.setExploded(!this.isExploded);
    }

    setExploded(isExploded) {
      const allowed = this.config.enabled && this.config.allow_explode && Object.keys(this.parts || {}).length > 1;
      this.isExploded = allowed && Boolean(isExploded);
      const button = this.wrapper.querySelector('#qx_btn_3d_explode');
      if (button) button.classList.toggle('active', this.isExploded);
    }

    updateExplodedAnimation() {
      const lerpSpeed = 0.08;
      for (const key in this.parts) {
        const item = this.parts[key];
        if (!item || !item.mesh) continue;

        const target = this.isExploded
          ? item.basePos.clone().add(item.explodeDelta)
          : item.basePos;

        item.mesh.position.lerp(target, lerpSpeed);
      }
    }

    triggerAddToCart() {
      const product = this.getBoundProduct();
      const store = window.quantixStore;
      if (!this.config.enabled || !product || !store || typeof store.openProductModal !== 'function') return;
      // Saved product details own its price and transaction/contact flow.
      store.openProductModal(product);
    }

    bindEvents() {
      const dom = this.renderer.domElement;

      dom.addEventListener('pointerdown', (e) => {
        if (!this.config.enabled) return;
        this.isPointerDown = true;
        this.pointerPrev = { x: e.clientX, y: e.clientY };
        this.pointerVelocity = { x: 0, y: 0 };
        this.isAutoOrbiting = false;
        const orbitBtn = this.wrapper.querySelector('#qx_btn_3d_orbit');
        if (orbitBtn) orbitBtn.classList.remove('active');
      });

      window.addEventListener('pointermove', (e) => {
        if (!this.isPointerDown) return;
        const dx = e.clientX - this.pointerPrev.x;
        const dy = e.clientY - this.pointerPrev.y;

        this.pointerPrev = { x: e.clientX, y: e.clientY };
        this.pointerVelocity = { x: dx * 0.005, y: dy * 0.005 };

        this.targetSpherical.theta -= dx * 0.008;
        this.targetSpherical.phi -= dy * 0.008;

        this.targetSpherical.phi = Math.max(0.15, Math.min(Math.PI / 2 + 0.15, this.targetSpherical.phi));
      });

      window.addEventListener('pointerup', () => {
        this.isPointerDown = false;
      });

      dom.addEventListener('wheel', (e) => {
        if (!this.config.enabled || !this.config.allow_zoom) return;
        e.preventDefault();
        const delta = e.deltaY * 0.002;
        this.targetSpherical.radius = Math.max(1.3, Math.min(4.8, this.targetSpherical.radius + delta));
      }, { passive: false });

      const orbitBtn = this.wrapper.querySelector('#qx_btn_3d_orbit');
      if (orbitBtn) {
        orbitBtn.addEventListener('click', () => {
          if (!this.config.enabled || !this.config.auto_orbit) return;
          this.isAutoOrbiting = !this.isAutoOrbiting;
          orbitBtn.classList.toggle('active', this.isAutoOrbiting);
          if (window.QuantixHapticAudio) window.QuantixHapticAudio.playDialTick();
        });
      }

      const explodeBtn = this.wrapper.querySelector('#qx_btn_3d_explode');
      if (explodeBtn) {
        explodeBtn.addEventListener('click', () => {
          this.toggleExplodedView();
        });
      }

      const zoomInBtn = this.wrapper.querySelector('#qx_btn_3d_zoom_in');
      if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
          if (!this.config.enabled || !this.config.allow_zoom) return;
          this.targetSpherical.radius = Math.max(1.3, this.targetSpherical.radius - 0.4);
          if (window.QuantixHapticAudio) window.QuantixHapticAudio.playDialTick();
        });
      }

      const zoomOutBtn = this.wrapper.querySelector('#qx_btn_3d_zoom_out');
      if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
          if (!this.config.enabled || !this.config.allow_zoom) return;
          this.targetSpherical.radius = Math.min(4.8, this.targetSpherical.radius + 0.4);
          if (window.QuantixHapticAudio) window.QuantixHapticAudio.playDialTick();
        });
      }

      const resetBtn = this.wrapper.querySelector('#qx_btn_3d_reset');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          this.resetCamera();
        });
      }

      if (this.addBtn) {
        this.addBtn.addEventListener('click', () => {
          this.triggerAddToCart();
        });
      }

      window.addEventListener('resize', () => {
        this.onResize();
      });

      dom.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        console.warn('QuantixSpatialStudio: WebGL context lost. Pausing render.');
        this.contextLost = true;
        this.updateRenderState();
      }, false);

      dom.addEventListener('webglcontextrestored', () => {
        // Three restores resources on its existing renderer; retain the single canvas.
        this.contextLost = false;
        this.updateRenderState();
      }, false);
    }

    resetCamera() {
      this.closeHotspots();
      this.targetSpherical = { radius: 2.6, phi: Math.PI / 2 - 0.15, theta: 0.2 };
      this.targetCameraLook.set(0, 0.2, 0);
      this.isAutoOrbiting = this.config.enabled && this.config.auto_orbit;
      const orbitBtn = this.wrapper.querySelector('#qx_btn_3d_orbit');
      if (orbitBtn) orbitBtn.classList.toggle('active', this.isAutoOrbiting);
      if (window.QuantixHapticAudio) window.QuantixHapticAudio.playDialTick();
    }

    onResize() {
      if (!this.container || !this.renderer || !this.camera) return;
      this.width = this.container.clientWidth || 800;
      this.height = this.container.clientHeight || 520;
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
    }

    initVisibilityObserver() {
      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver(entries => {
          entries.forEach(entry => { this.isInView = entry.isIntersecting; });
          this.updateRenderState();
        }, { threshold: 0.05 });
        this.observer.observe(this.wrapper);
      }
      this.visibilityHandler = () => this.updateRenderState();
      document.addEventListener('visibilitychange', this.visibilityHandler);
      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(() => this.onResize());
        this.resizeObserver.observe(this.container);
      }
    }

    updateRenderState() {
      this.isIdle = !this.config.enabled || this.isInView === false || document.hidden || Boolean(this.contextLost) || Boolean(this.destroyed);
      if (this.isIdle) {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
        this.lastFrameTime = null;
      } else if (this.renderer && this.animate && !this.animFrameId) {
        this.animFrameId = requestAnimationFrame(this.animate);
      }
    }

    updateCameraPosition() {
      const damping = 0.06;
      this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * damping;
      this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * damping;
      this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * damping;
      this.cameraLook.lerp(this.targetCameraLook, damping);

      const sinPhiRadius = Math.sin(this.spherical.phi) * this.spherical.radius;
      this.camera.position.x = sinPhiRadius * Math.sin(this.spherical.theta);
      this.camera.position.y = Math.cos(this.spherical.phi) * this.spherical.radius;
      this.camera.position.z = sinPhiRadius * Math.cos(this.spherical.theta);

      this.camera.lookAt(this.cameraLook);
    }

    animate(time) {
      this.animFrameId = null;
      if (this.isIdle || !this.config.enabled || document.hidden || this.destroyed) return;
      const elapsed = this.lastFrameTime == null ? 1 : Math.min(3, Math.max(0, (time - this.lastFrameTime) / (1000 / 60)));
      this.lastFrameTime = time;
      if (this.isAutoOrbiting && this.config.auto_orbit && !this.isPointerDown) {
        this.targetSpherical.theta += this.config.auto_orbit_speed * 0.005 * elapsed;
      }
      this.updateCameraPosition();
      this.updateExplodedAnimation();
      this.updateHotspotsProjection();
      this.renderer.render(this.scene, this.camera);
      this.animFrameId = requestAnimationFrame(this.animate);
    }

    getCameraPose() {
      return [
        Number(this.camera.position.x.toFixed(3)),
        Number(this.camera.position.y.toFixed(3)),
        Number(this.camera.position.z.toFixed(3))
      ];
    }

    setLightingPreset(preset) {
      this.applyLightingPreset(preset);
    }

    // =========================================================================
    // Spatial AR WebXR Quick-Look & Holographic QR Bridge Engine
    // =========================================================================

    initARBridge() {
      const arBtn = this.wrapper.querySelector('#qx_btn_3d_ar');
      const arPill = this.wrapper.querySelector('#qx_btn_ar_pill');
      const modal = document.getElementById('qx_modal_ar_bridge');
      const closeBtn = document.getElementById('qx_ar_modal_close');
      const backdrop = document.getElementById('qx_ar_modal_backdrop');
      const mobileBtn = document.getElementById('qx_btn_launch_mobile_ar');

      if (arBtn) {
        arBtn.addEventListener('click', () => this.openARBridge());
      }
      if (arPill) {
        arPill.addEventListener('click', () => this.openARBridge());
      }
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeARBridge());
      }
      if (backdrop) {
        backdrop.addEventListener('click', () => this.closeARBridge());
      }
      if (mobileBtn) {
        mobileBtn.addEventListener('click', () => this.launchMobileAR());
      }

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.style.display !== 'none') {
          this.closeARBridge();
        }
      });
    }

    assetUrl(value, extension) {
      if (!value) return '';
      try {
        const url = new URL(value, window.location.href);
        return /^(https?:)$/.test(url.protocol) && !url.username && !url.password && extension.test(url.pathname) ? url.href : '';
      } catch (error) { return ''; }
    }

    sceneUrl(value) {
      const asset = this.assetUrl(value, /\.(glb|gltf)$/i);
      if (asset) return asset;
      // A local upload is preview-only. Its blob must belong to the trusted parent.
      if (new URLSearchParams(window.location.search).get('preview_mode') !== '1' || window.parent === window) return '';
      try {
        const blob = new URL(value);
        const parent = new URL(document.referrer);
        const own = new URL(window.location.href);
        const trustedParent = parent.origin === own.origin || (parent.protocol === 'https:' && /(^|\.)evinux\.net$/.test(parent.hostname));
        return trustedParent && blob.protocol === 'blob:' && blob.origin === parent.origin ? blob.href : '';
      } catch (error) { return ''; }
    }

    getARAvailability() {
      const result = { available: false, path: '', reason: '', androidUrl: '', iosUrl: '' };
      if (!this.config.enabled || this.arCalibration.enabled === false) { result.reason = 'Realidad aumentada desactivada.'; return result; }
      if (/^blob:/i.test(this.customModelUrl || this.config.custom_model_url || '')) { result.reason = 'La vista previa local debe guardarse antes de usar realidad aumentada.'; return result; }
      if (window.isSecureContext === false || window.location.protocol !== 'https:') { result.reason = 'Realidad aumentada requiere una conexión HTTPS.'; return result; }
      result.androidUrl = this.assetUrl(this.customModelUrl, /\.(glb|gltf)$/i);
      result.iosUrl = this.assetUrl(this.config.custom_usdz_url || this.config.ios_model_url, /\.usdz$/i);
      if (result.androidUrl && new URL(result.androidUrl).protocol !== 'https:') result.androidUrl = '';
      if (result.iosUrl && new URL(result.iosUrl).protocol !== 'https:') result.iosUrl = '';
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
      if (isIOS) {
        const link = document.getElementById('qx_ios_ar_native_link');
        const supportsAR = Boolean(link && link.relList && link.relList.supports && link.relList.supports('ar'));
        result.path = 'quick-look';
        result.available = Boolean(result.iosUrl && supportsAR);
        result.reason = !result.iosUrl ? 'Este modelo necesita un archivo USDZ para iPhone o iPad.' : (!supportsAR ? 'Abre esta tienda en Safari con Quick Look compatible.' : 'Quick Look · La escala física depende del archivo USDZ.');
      } else if (/Android/i.test(navigator.userAgent)) {
        result.path = 'scene-viewer';
        result.available = Boolean(result.androidUrl);
        result.reason = result.available ? 'Scene Viewer · Requiere un dispositivo Android compatible con AR.' : 'Carga un archivo GLB o GLTF para usar realidad aumentada en Android.';
      } else {
        result.path = 'qr';
        result.available = Boolean(result.androidUrl || result.iosUrl);
        result.reason = result.available ? 'Continúa en un teléfono compatible. La escala física depende del archivo 3D.' : 'Este modelo de referencia no tiene un archivo compatible con realidad aumentada.';
      }
      return result;
    }

    syncControls() {
      if (!this.wrapper) return;
      const enabled = Boolean(this.config.enabled);
      const renderReady = Boolean(this.renderer && this.modelGroup && !this.destroyed);
      this.wrapper.hidden = !enabled || !renderReady;
      if (enabled && renderReady) this.wrapper.style.display = '';
      const explode = enabled && this.config.allow_explode && Object.keys(this.parts || {}).length > 1;
      if (!explode) this.setExploded(false);
      if (!enabled || !this.config.auto_orbit) this.isAutoOrbiting = false;
      const state = {
        qx_btn_3d_zoom_in: enabled && this.config.allow_zoom,
        qx_btn_3d_zoom_out: enabled && this.config.allow_zoom,
        qx_btn_3d_explode: explode,
        qx_btn_3d_orbit: enabled && this.config.auto_orbit,
        qx_btn_3d_reset: enabled
      };
      Object.keys(state).forEach(id => {
        const button = this.wrapper.querySelector('#' + id);
        if (button) { button.disabled = !state[id]; button.setAttribute('aria-disabled', String(!state[id])); }
      });
      const orbit = this.wrapper.querySelector('#qx_btn_3d_orbit');
      if (orbit) orbit.classList.toggle('active', this.isAutoOrbiting);
      const availability = this.getARAvailability();
      ['qx_btn_3d_ar', 'qx_btn_ar_pill'].forEach(id => {
        const button = this.wrapper.querySelector('#' + id);
        if (button) {
          button.hidden = !enabled || this.arCalibration.enabled === false;
          button.disabled = !availability.available;
          button.setAttribute('aria-disabled', String(!availability.available));
          button.title = availability.reason;
        }
      });
      let note = this.wrapper.querySelector('#qx_studio_capability_note');
      if (!note) {
        note = document.createElement('p'); note.id = 'qx_studio_capability_note';
        note.className = 'qx-studio-capability-note'; note.setAttribute('role', 'status');
        const shelf = this.wrapper.querySelector('#qx_studio_shelf_bar');
        (shelf || this.wrapper).appendChild(note);
      }
      const reference = this.customModelUrl ? '' : 'Representación 3D de referencia. ';
      note.textContent = this.modelLoadError || reference + (this.arCalibration.enabled === false ? 'Realidad aumentada desactivada.' : availability.reason);
      this.updatePriceDisplay();
      if (!availability.available) this.closeARBridge();
      this.tryAutoARLaunch();
    }

    openARBridge() {
      const availability = this.getARAvailability();
      if (!availability.available) { this.syncControls(); return; }
      const modal = document.getElementById('qx_modal_ar_bridge');
      if (!modal) return;
      modal.style.display = 'flex'; modal.setAttribute('aria-hidden', 'false');
      const mobileBox = document.getElementById('qx_ar_mobile_direct_box');
      if (mobileBox) mobileBox.style.display = availability.path === 'qr' ? 'none' : 'block';
      const launch = document.getElementById('qx_btn_launch_mobile_ar');
      if (launch) { launch.disabled = availability.path === 'qr'; launch.textContent = availability.path === 'quick-look' ? 'Abrir Quick Look' : 'Abrir en Android compatible'; }
      this.updateARVariant(this.activeFinish);
    }

    closeARBridge() {
      const modal = document.getElementById('qx_modal_ar_bridge');
      if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
      }
    }

    buildARPageUrl() {
      const target = new URL(window.location.href);
      // Preserve routing/tenant context while excluding the Director-only inspector.
      ['preview_mode', 'ar_launch', 'finish', 'model_src', 'model_url', 'scale_mm', 'anchor', 'lock_scale'].forEach(key => target.searchParams.delete(key));
      target.searchParams.set('ar_launch', '1');
      target.hash = '';
      return target.href;
    }

    generateARQRCode() {
      if (!this.getARAvailability().available) return;
      const img = document.getElementById('qx_ar_qr_img');
      const spinner = document.getElementById('qx_ar_qr_spinner');
      const fullTargetUrl = this.buildARPageUrl();
      const request = (this.qrRequest || 0) + 1; this.qrRequest = request;
      if (spinner) spinner.style.display = 'flex';
      if (img) { img.hidden = true; img.removeAttribute('data-payload'); }
      const endpoint = window.location.pathname.startsWith('/cfdadmin') || window.location.hostname === 'evinux.net' ? '/cfdadmin/ajax/store_ar_qr.php' : '/api/store_ar_qr.php';
      fetch(endpoint + '?url=' + encodeURIComponent(fullTargetUrl)).then(response => {
        if (!response.ok) throw new Error('QR unavailable');
        return response.json();
      }).then(data => {
        if (request !== this.qrRequest) return;
        if (!data || !data.success || !/^data:image\//.test(data.data_url || '')) throw new Error('QR unavailable');
        if (img) { img.src = data.data_url; img.hidden = false; img.setAttribute('data-payload', fullTargetUrl); img.style.opacity = '1'; }
        if (spinner) spinner.style.display = 'none';
      }).catch(() => {
        if (request !== this.qrRequest) return;
        if (spinner) spinner.style.display = 'none';
        if (img) { img.hidden = true; img.removeAttribute('src'); }
        const label = document.getElementById('qx_ar_active_variant_label');
        if (label) label.textContent = 'No se pudo generar el QR. Abre esta misma tienda desde tu teléfono.';
      });
    }

    updateARVariant() {
      const label = document.getElementById('qx_ar_active_variant_label');
      if (label) {
        const size = this.arCalibration;
        label.textContent = 'Medidas de referencia: ' + size.width_mm + ' × ' + size.height_mm + ' × ' + size.depth_mm + ' mm. La escala y los materiales nativos corresponden al archivo original; estas medidas no lo redimensionan.';
      }
      const modal = document.getElementById('qx_modal_ar_bridge');
      if (modal && modal.style.display !== 'none') this.generateARQRCode();
    }

    launchMobileAR() {
      const availability = this.getARAvailability();
      if (!availability.available) return;
      if (availability.path === 'quick-look') {
        const link = document.getElementById('qx_ios_ar_native_link');
        if (!link) return;
        const asset = new URL(availability.iosUrl);
        asset.hash = this.arCalibration.lock_scale ? 'allowsContentScaling=0' : 'allowsContentScaling=1';
        link.href = asset.href; link.click();
      } else if (availability.path === 'scene-viewer') {
        const fallback = new URL(this.buildARPageUrl()); fallback.searchParams.delete('ar_launch');
        const query = new URLSearchParams({ file: availability.androidUrl, mode: 'ar_only', title: this.config.custom_model_name || 'Modelo 3D', resizable: this.arCalibration.lock_scale ? 'false' : 'true', enable_vertical_placement: 'false' });
        window.location.href = 'intent://arvr.google.com/scene-viewer/1.2?' + query.toString() + '#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=' + encodeURIComponent(fallback.href) + ';end;';
      }
    }

    applyARCalibration(settings) {
      const next = Object.assign({}, this.arCalibration, settings || {});
      ['enabled', 'lock_scale'].forEach(key => { next[key] = next[key] === true || next[key] === 1 || next[key] === '1'; });
      ['width_mm', 'height_mm', 'depth_mm'].forEach(key => {
        const value = Number(next[key]); next[key] = Number.isFinite(value) && value > 0 ? Math.min(10000, value) : 150;
      });
      next.anchor = next.anchor === 'floor' ? 'floor' : 'surface';
      this.arCalibration = next;
      this.config.ar_calibration = Object.assign({}, next);
      this.syncControls();
      this.updateARVariant();
    }

    requestAutoARLaunch(params) {
      if (params && typeof params.get === 'function' && params.get('ar_launch') !== '1') return;
      // Only the intent comes from the URL. Assets and placement stay tenant-owned.
      this.autoARLaunchPending = true;
      this.tryAutoARLaunch();
    }

    tryAutoARLaunch() {
      if (!this.autoARLaunchPending || this.destroyed || this.isModelLoading) return;
      // Success or a definitive failure consumes the request once, after loading settles.
      this.autoARLaunchPending = false;
      if (this.getARAvailability().available) this.openARBridge();
    }

    handleAutoARLaunch(params) {
      this.requestAutoARLaunch(params);
    }

    destroy() {
      this.destroyed = true;
      this.autoARLaunchPending = false;
      this.modelGeneration += 1;
      this.qrRequest = (this.qrRequest || 0) + 1;
      if (this.observer) this.observer.disconnect();
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
      this.clearModel();
      if (this.renderer) { this.renderer.dispose(); if (this.renderer.domElement) this.renderer.domElement.remove(); }
    }

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  }

  window.QuantixSpatialStudio = QuantixSpatialStudio;
})(window);
