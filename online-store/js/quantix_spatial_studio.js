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
        hotspots: []
      }, domConfig, userConfig);

      this.container = this.wrapper.querySelector('#qx_studio_canvas_container') || this.wrapper;
      this.hotspotsLayer = this.wrapper.querySelector('#qx_studio_hotspots_layer');
      this.swatchesContainer = this.wrapper.querySelector('#qx_shelf_swatches');
      this.priceValEl = this.wrapper.querySelector('#qx_studio_price_val');
      this.addBtn = this.wrapper.querySelector('#qx_btn_studio_add');

      this.isExploded = false;
      this.isAutoOrbiting = Boolean(this.config.auto_orbit);
      this.isStationary = false;
      this.isIdle = false;
      this.activeHotspotId = null;
      this.activeFinish = null;

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
        console.warn('QuantixSpatialStudio: WebGL initialization failed or unsupported. Falling back to 2D.');
        if (this.wrapper) this.wrapper.style.display = 'none';
        const fallbackCarousel = document.getElementById('qx_hero_carousel_wrapper');
        if (fallbackCarousel) fallbackCarousel.style.display = '';
        return;
      }

      this.buildLighting();
      this.buildModel();
      this.initHotspots();
      this.initShelfAndFinishes();
      this.bindEvents();
      this.initVisibilityObserver();

      this.animate = this.animate.bind(this);
      this.animFrameId = requestAnimationFrame(this.animate);
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
        this.renderer = new THREE.WebGLRenderer({
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

    buildModel() {
      while (this.modelGroup.children.length > 0) {
        const obj = this.modelGroup.children[0];
        this.modelGroup.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      }
      this.parts = {};

      const isCustomGltf = Boolean(this.config.custom_model_url && this.config.model_source !== 'procedural');
      const isIndustrial = this.config.archetype_model === 'industrial_solenoid_valve';

      if (isCustomGltf) {
        this.loadCustomGltfModel(this.config.custom_model_url, isIndustrial);
      } else if (isIndustrial) {
        this.buildIndustrialSolenoid();
        this.buildGroundShadow(-0.38);
      } else {
        this.buildPerfumeFlacon();
        this.buildGroundShadow(-0.68);
      }
    }

    loadCustomGltfModel(url, fallbackIsIndustrial) {
      if (!url) {
        this.fallbackToProcedural(fallbackIsIndustrial);
        return;
      }

      if (typeof THREE.GLTFLoader === 'undefined') {
        console.warn('[QuantixSpatialStudio] GLTFLoader unavailable. Falling back to procedural geometry.');
        this.fallbackToProcedural(fallbackIsIndustrial);
        return;
      }

      this.setLoadingState(true);

      try {
        let dracoLoader = null;
        if (typeof THREE.DRACOLoader !== 'undefined') {
          dracoLoader = new THREE.DRACOLoader();
          dracoLoader.setDecoderPath('js/vendor/draco/');
        }

        const loader = new THREE.GLTFLoader();
        if (dracoLoader) {
          loader.setDRACOLoader(dracoLoader);
        }

        loader.load(
          url,
          (gltf) => {
            this.setLoadingState(false);
            const model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
            if (!model) {
              console.warn('[QuantixSpatialStudio] GLTF file contains no scene. Falling back to procedural model.');
              this.fallbackToProcedural(fallbackIsIndustrial);
              return;
            }

            // Remove previous objects in modelGroup
            while (this.modelGroup.children.length > 0) {
              const obj = this.modelGroup.children[0];
              this.modelGroup.remove(obj);
              if (obj.geometry) obj.geometry.dispose();
              if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
              }
            }
            this.parts = {};

            // Traverse and enhance mesh materials
            model.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                  child.material.needsUpdate = true;
                }
              }
            });

            // Compute Bounding Box & Center
            const bbox = new THREE.Box3().setFromObject(model);
            const center = bbox.getCenter(new THREE.Vector3());
            const size = bbox.getSize(new THREE.Vector3());

            model.position.x = -center.x;
            model.position.y = -center.y;
            model.position.z = -center.z;

            // Normalize scale to standard stage unit dimension (2.2)
            const maxDim = Math.max(size.x, size.y, size.z);
            const targetDim = 2.2;
            const scale = targetDim / (maxDim || 1);

            const pivotGroup = new THREE.Group();
            pivotGroup.add(model);
            pivotGroup.scale.setScalar(scale);

            this.modelGroup.add(pivotGroup);
            this.activeCustomModel = pivotGroup;

            // Ground shadow positioned at normalized base
            const minY = (bbox.min.y - center.y) * scale;
            this.buildGroundShadow(minY - 0.05);

            // Re-render hotspots
            this.initHotspots();

            console.info('[QuantixSpatialStudio] Custom GLTF loaded and auto-centered successfully:', url);
          },
          (xhr) => {
            // Optional progress tracking
          },
          (error) => {
            this.setLoadingState(false);
            console.warn('[QuantixSpatialStudio] Circuit breaker triggered! Failed to load (' + url + '). Reverting to procedural mesh:', error);
            this.fallbackToProcedural(fallbackIsIndustrial);
          }
        );
      } catch (e) {
        this.setLoadingState(false);
        console.warn('[QuantixSpatialStudio] Exception in GLTF loading pipeline. Executing circuit breaker:', e);
        this.fallbackToProcedural(fallbackIsIndustrial);
      }
    }

    fallbackToProcedural(isIndustrial) {
      while (this.modelGroup.children.length > 0) {
        const obj = this.modelGroup.children[0];
        this.modelGroup.remove(obj);
      }
      this.parts = {};

      if (isIndustrial) {
        this.buildIndustrialSolenoid();
        this.buildGroundShadow(-0.38);
      } else {
        this.buildPerfumeFlacon();
        this.buildGroundShadow(-0.68);
      }
      this.initHotspots();
    }

    setLoadingState(isLoading) {
      let pill = this.wrapper ? this.wrapper.querySelector('#qx_3d_loading_pill') : null;
      if (!pill && this.wrapper && isLoading) {
        pill = document.createElement('div');
        pill.id = 'qx_3d_loading_pill';
        pill.className = 'qx-3d-loading-pill';
        pill.innerHTML = `<span>💎 Ingestando Modelo Espacial 3D...</span>`;
        this.wrapper.appendChild(pill);
      }
      if (pill) {
        pill.style.display = isLoading ? 'flex' : 'none';
      }
    }

    loadCustomModel(url, name, hotspots) {
      if (!url) return;
      this.config.custom_model_url = url;
      this.config.custom_model_name = name || 'custom_model.glb';
      this.config.model_source = 'custom_gltf';
      if (hotspots && Array.isArray(hotspots)) {
        this.config.custom_hotspots = hotspots;
      }
      const isIndustrial = this.config.archetype_model === 'industrial_solenoid_valve';
      this.loadCustomGltfModel(url, isIndustrial);
    }

    setCustomHotspots(hotspots) {
      if (Array.isArray(hotspots)) {
        this.config.custom_hotspots = hotspots;
        this.initHotspots();
      }
    }

    resetToProcedural() {
      this.config.custom_model_url = '';
      this.config.custom_model_name = '';
      this.config.model_source = 'procedural';
      this.config.custom_hotspots = [];
      const isIndustrial = this.config.archetype_model === 'industrial_solenoid_valve';
      this.fallbackToProcedural(isIndustrial);
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
          <div class="qx-hotspot-card" id="card_${spot.id}">
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
      this.targetSpherical.radius = Math.max(1.3, Math.min(3.5, targetRadius));
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
      if (!this.swatchesContainer) return;
      this.swatchesContainer.innerHTML = '';

      const finishes = this.config.finishes || [];
      if (finishes.length > 0) {
        this.activeFinish = finishes[0];
      }

      finishes.forEach((fin, idx) => {
        const sw = document.createElement('button');
        sw.type = 'button';
        sw.className = `qx-swatch-item ${idx === 0 ? 'active' : ''}`;
        sw.setAttribute('data-id', fin.id);
        sw.setAttribute('title', `${fin.name}${fin.price_delta ? ` (+$${fin.price_delta})` : ''}`);
        sw.style.setProperty('--swatch-color', fin.color);
        sw.innerHTML = `<span class="qx-swatch-dot" style="background:${fin.color};"></span>`;

        sw.addEventListener('click', () => {
          this.applyFinish(fin.id);
        });

        this.swatchesContainer.appendChild(sw);
      });

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
    }

    updatePriceDisplay() {
      if (!this.priceValEl) return;
      let basePrice = 4250;
      if (this.config.archetype_model === 'industrial_solenoid_valve') {
        basePrice = 1850;
      }
      const delta = (this.activeFinish && this.activeFinish.price_delta) ? Number(this.activeFinish.price_delta) : 0;
      const total = basePrice + delta;
      this.priceValEl.textContent = `$ ${total.toLocaleString('es-MX')}`;
    }

    toggleExplodedView() {
      this.isExploded = !this.isExploded;
      const explodeBtn = this.wrapper.querySelector('#qx_btn_3d_explode');
      if (explodeBtn) {
        explodeBtn.classList.toggle('active', this.isExploded);
      }

      if (window.QuantixHapticAudio) {
        if (this.isExploded) {
          window.QuantixHapticAudio.playRatchet();
        } else {
          window.QuantixHapticAudio.playVaultSwitch(true);
        }
      }
    }

    setExploded(isExploded) {
      if (this.isExploded !== Boolean(isExploded)) {
        this.toggleExplodedView();
      }
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
      if (window.QuantixHapticAudio) {
        window.QuantixHapticAudio.playCrystalChime();
      }

      let product = null;
      if (window.quantixStore && Array.isArray(window.quantixStore.products) && window.quantixStore.products.length > 0) {
        product = window.quantixStore.products[0];
      }

      if (!product) {
        product = {
          id: this.config.archetype_model === 'industrial_solenoid_valve' ? 'solenoid_valve_pro' : 'flacon_imperial_haute',
          code: 'QX-3D-STAR',
          sku: this.config.archetype_model === 'industrial_solenoid_valve' ? 'GERSOL-SOL-IP67' : 'MISTIQ-FLACON-EXT',
          name: this.config.archetype_model === 'industrial_solenoid_valve' ? 'Electroválvula Solenoide IP67 Alta Presión' : 'Flacon Imperial Extrait de Parfum',
          cover: 'https://media.evinux.net/cfdadmin/img/perfume_sample.png',
          priceWithTax: this.config.archetype_model === 'industrial_solenoid_valve' ? 1850 : 4250,
          vatRate: 16
        };
      }

      const finishMeta = this.activeFinish ? {
        id: this.activeFinish.id,
        name: this.activeFinish.name,
        priceDelta: this.activeFinish.price_delta || 0,
        color: this.activeFinish.color
      } : null;

      if (window.quantixStore && typeof window.quantixStore.addToCart === 'function') {
        window.quantixStore.addToCart(product, 1, $(this.addBtn), 'full', {
          customFinish: finishMeta
        });
      } else {
        console.log('QuantixSpatialStudio: Added to order with custom finish', finishMeta);
      }
    }

    bindEvents() {
      const dom = this.renderer.domElement;

      dom.addEventListener('pointerdown', (e) => {
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
        if (!this.config.allow_zoom) return;
        e.preventDefault();
        const delta = e.deltaY * 0.002;
        this.targetSpherical.radius = Math.max(1.3, Math.min(4.8, this.targetSpherical.radius + delta));
      }, { passive: false });

      const orbitBtn = this.wrapper.querySelector('#qx_btn_3d_orbit');
      if (orbitBtn) {
        orbitBtn.addEventListener('click', () => {
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
          this.targetSpherical.radius = Math.max(1.3, this.targetSpherical.radius - 0.4);
          if (window.QuantixHapticAudio) window.QuantixHapticAudio.playDialTick();
        });
      }

      const zoomOutBtn = this.wrapper.querySelector('#qx_btn_3d_zoom_out');
      if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
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
        cancelAnimationFrame(this.animFrameId);
      }, false);

      dom.addEventListener('webglcontextrestored', () => {
        console.log('QuantixSpatialStudio: WebGL context restored. Rebuilding scene.');
        this.initThree();
        this.buildLighting();
        this.buildModel();
        this.animFrameId = requestAnimationFrame(this.animate);
      }, false);
    }

    resetCamera() {
      this.closeHotspots();
      this.targetSpherical = { radius: 2.6, phi: Math.PI / 2 - 0.15, theta: 0.2 };
      this.targetCameraLook.set(0, 0.2, 0);
      this.isAutoOrbiting = true;
      const orbitBtn = this.wrapper.querySelector('#qx_btn_3d_orbit');
      if (orbitBtn) orbitBtn.classList.add('active');
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
        this.observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            this.isIdle = !entry.isIntersecting;
            if (!this.isIdle && !this.animFrameId) {
              this.animFrameId = requestAnimationFrame(this.animate);
            }
          });
        }, { threshold: 0.05 });
        this.observer.observe(this.wrapper);
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

    animate() {
      if (this.isIdle) {
        this.animFrameId = null;
        return;
      }

      if (this.isAutoOrbiting && !this.isPointerDown) {
        const speed = (this.config.auto_orbit_speed || 1.2) * 0.005;
        this.targetSpherical.theta += speed;
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

    destroy() {
      if (this.observer) this.observer.disconnect();
      cancelAnimationFrame(this.animFrameId);
      if (this.renderer && this.renderer.domElement) {
        this.renderer.domElement.remove();
      }
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
