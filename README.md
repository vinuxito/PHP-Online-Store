# Quantix Stores — Showroom Storefront Engine

Real-time, ultra-luxury, and multi-archetype e-commerce storefront platform designed for CFDI-compliant Mexican businesses.

## Architecture & Integration
- **Platform:** PHP 7.4+ Procedural & OOP Backend / Modern Vanilla JS & jQuery Frontend.
- **Master Developer Codex:** Complete operational playbook, workflows, and 10 Commandments documented in `/lamp/www/cfdadmin/docs/CODEX_MASTER_HANDBOOK.md` and `/lamp/www/cfdadmin/docs/codex/WORKFLOWS_PLAYBOOK.md`.
- **Master Director Control:** Governed via `/lamp/www/cfdadmin/storefront_master.php` through real-time bidirectional `postMessage` synchronization (`GlassTwinBridge`).
- **Archetype Isolation:** Multi-tenant support for Haute Perfumerie (`Mistiq`), Industrial Electrical/Hardware (`Gersol`), and Generic Retail, fully isolated without domain or terminology bleed.
- **Fiscal Compliance:** SAT CFDI 4.0 ready with dynamic RFC validation (Persona Moral vs Física vs Público en General/Extranjero).

## Latest Upgrade: Quantix Spatial AR WebXR Quick-Look & Mobile Holographic QR Bridge (2026-09-05)
- **Desktop Holographic QR Bridge:** Frosted-glass modal (`#qx_modal_ar_bridge`) with self-hosted dynamic QR code generation (`/api/store_ar_qr.php`) using local `phpqrcode`.
- **Dynamic PBR Variant Sync:** Instant QR regeneration upon selecting finishes (e.g. Liquid Gold 24k) passing `&ar_variant=liquid_gold&auto_ar=1`.
- **Native Android Google Scene Viewer:** Direct intent protocol handoff (`intent://arvr.google.com/scene-viewer/1.0...`) with calibrated scale and `ar_only` mode, zero app install required.
- **Native iOS Apple Quick Look:** WebKit `rel="ar"` anchor pipe serving standards-compliant USDZ models (`model/vnd.usdz+zip`) at 60 FPS with TrueDepth sensor integration.
- **Director Real-World Millimeter Calibration:** Master toggle, millimeter scale inputs (Z, X, Y), anchor geometry selector (`surface` / `floor`), quick presets, and 1:1 scale locking in Capítulo IV.
- **Glass Twin Real-Time Synchronization:** Emits `SYNC_AR_CALIBRATION` across the iframe bridge with zero reload.
- **Targeted Test Suite:** Verified 100% green via `/lamp/www/cfdadmin/tests/e2e/test_spatial_ar_webxr_pipeline.mjs`.
- **Verification Documentation:**
  - Memory: `/lamp/www/cfdadmin/docs/memories/session-2026-09-05-spatial-ar-webxr-pipeline.md`
  - HTML Report: `/lamp/www/cfdadmin/docs/reports/2026-09-05-spatial-ar-webxr-pipeline-verification.html`
  - Markdown Report: `/lamp/www/cfdadmin/docs/reports/2026-09-05-spatial-ar-webxr-pipeline-verification.md`
  - Plan Index: `/lamp/www/cfdadmin/docs/plans/spatial-ar-webxr-and-holographic-qr-bridge/INDEX.md`

## Previous Upgrade: Quantix Holo-Vault Custom 3D Asset Upload & GLTF Ingestion Pipeline (2026-09-05)
- **Holo-Vault Drag-and-Drop Ingestion:** Direct tenant `.gltf` / `.glb` 3D model ingestion in Store Director (Capítulo IV) with 0ms client-side blob preview.
- **Zero-CDN Vendor Independence:** Self-hosted `GLTFLoader.js`, `DRACOLoader.js`, and local Draco WASM decoders (`draco_decoder.wasm`, `draco_wasm_wrapper.js`) served directly from local Apache.
- **Security Shield & Hardened Isolation:** Dual binary magic-byte verification (`0x46546C67`), 15MB file ceiling, multi-tenant directory segregation, and `.htaccess` script execution lock (`php_flag engine off`).
- **Auto-Centering & Scale Normalization:** Automated `THREE.Box3` bounding calculation, centering at origin `(0, 0, 0)`, proportional scaling to 2.2 units, and dynamic ground shadow repositioning.
- **Circuit-Breaker Fallback to Procedural Models:** Corrupt or unrenderable models immediately trigger circuit-breaker fallback to native parametric models without crashing WebGL context.
- **Interactive 3D Surface Hotspot Studio:** Custom pins can be pinned to 3D surface coordinates with custom labels and descriptions, synced live via `GlassTwinBridge`.
- **1-Click Factory Reset:** Instantly revert custom model overrides back to procedural geometry in real time.
- **Targeted Test Suite:** Verified 100% green via `/lamp/www/cfdadmin/tests/e2e/test_custom_3d_gltf_pipeline.mjs`.
- **Verification Documentation:**
  - Memory: `/lamp/www/cfdadmin/docs/memories/session-2026-09-05-custom-3d-gltf-ingestion-pipeline.md`
  - HTML Report: `/lamp/www/cfdadmin/docs/reports/2026-09-05-custom-3d-gltf-pipeline-verification.html`
  - Markdown Report: `/lamp/www/cfdadmin/docs/reports/2026-09-05-custom-3d-gltf-pipeline-verification.md`
  - Plan Index: `/lamp/www/cfdadmin/docs/plans/quantix-3d-custom-model-upload-and-gltf-pipeline/INDEX.md`

## Previous Upgrade: Quantix Holo-Studio 3D Interactive Showcase (2026-09-05)
- **Zero-Asset Procedural 3D WebGL:** Built with self-hosted Three.js r128 (`js/vendor/three.min.js`), ACES Filmic tone mapping, and sRGB encoding. Generates procedural borosilicate crystal flacons (with transmission dielectric physics) for perfumery, and mechanical solenoid valves for industrial tenants.
- **Interactive 3D Hotspots:** Screen-space projected pins with normal vector depth-occlusion culling and frosted-glass popover detail cards.
- **Anatomical Exploded View ("Vista Desglosada"):** Smooth spring physics disassembly along calibrated axis vectors with micro-haptic ratchet audio.
- **Real-Time PBR Material Finish Swapper:** Dynamic material property switching with 0ms perceived latency, synesthetic harmonic Web Audio signatures, and dynamic price delta calculation.
- **In-Studio Frictionless Checkout:** Direct add-to-order flow preserving chosen finish variant metadata into the cart drawer.
- **0% Idle CPU Budget:** Pauses the WebGL render loop via `IntersectionObserver` when scrolled offscreen.
- **Targeted Test Suite:** Verified 100% green via `/lamp/www/cfdadmin/tests/e2e/test_holo_studio_3d_showcase.mjs`.
- **Verification Documentation:**
  - Memory: `/lamp/www/cfdadmin/docs/memories/session-2026-09-05-holo-studio-3d-verification-and-closeout.md`
  - HTML Report: `/lamp/www/cfdadmin/docs/reports/2026-09-05-holo-studio-3d-verification.html`
  - Markdown Report: `/lamp/www/cfdadmin/docs/reports/2026-09-05-holo-studio-3d-verification.md`

## Previous Upgrade: 7-Step UI/UX Coherence Upgrade (2026-09-04)
- **Zero Perfume Concept Leaks:** Strict suppression of decants, accords, and perfume upsells on non-perfumery tenants.
- **Frictionless In-Drawer Checkout:** Full deprecation of native browser `alert()` popups in favor of contextual in-drawer alerts and friendly empty states.
- **Universal Design Tokens:** `--qx-sys-*` design tokens, WCAG-compliant `:focus-visible` styling, and mobile viewport safe-area padding.
- **Targeted Test Suite:** Verified green across all test cases (`/lamp/www/cfdadmin/tests/e2e/test_ui_ux_coherence_upgrade.mjs`).
