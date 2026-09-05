# Quantix Stores — Showroom Storefront Engine

Real-time, ultra-luxury, and multi-archetype e-commerce storefront platform designed for CFDI-compliant Mexican businesses.

## Architecture & Integration
- **Platform:** PHP 7.4+ Procedural & OOP Backend / Modern Vanilla JS & jQuery Frontend.
- **Master Director Control:** Governed via `/lamp/www/cfdadmin/storefront_master.php` through real-time bidirectional `postMessage` synchronization (`GlassTwinBridge`).
- **Archetype Isolation:** Multi-tenant support for Haute Perfumerie (`Mistiq`), Industrial Electrical/Hardware (`Gersol`), and Generic Retail, fully isolated without domain or terminology bleed.
- **Fiscal Compliance:** SAT CFDI 4.0 ready with dynamic RFC validation (Persona Moral vs Física vs Público en General/Extranjero).

## Latest Upgrade: Quantix Holo-Studio 3D Interactive Showcase (2026-09-05)
- **Zero-Asset Procedural 3D WebGL:** Built with self-hosted Three.js r128 (`js/vendor/three.min.js`), ACES Filmic tone mapping, and sRGB encoding. Generates procedural borosilicate crystal flacons (with transmission dielectric physics) for perfumery, and mechanical solenoid valves for industrial tenants.
- **Interactive 3D Hotspots:** Screen-space projected pins with normal vector depth-occlusion culling and frosted-glass popover detail cards.
- **Anatomical Exploded View ("Vista Desglosada"):** Smooth spring physics disassembly along calibrated axis vectors with micro-haptic ratchet audio.
- **Real-Time PBR Material Finish Swapper:** Dynamic material property switching with 0ms perceived latency, synesthetic harmonic Web Audio signatures, and dynamic price delta calculation.
- **In-Studio Frictionless Checkout:** Direct add-to-order flow preserving chosen finish variant metadata into the cart drawer.
- **0% Idle CPU Budget:** Pauses the WebGL render loop via `IntersectionObserver` when scrolled offscreen.
- **Targeted Test Suite:** Verified 100% green via `/lamp/www/cfdadmin/tests/e2e/test_holo_studio_3d_showcase.mjs`.

## Previous Upgrade: 7-Step UI/UX Coherence Upgrade (2026-09-04)
- **Zero Perfume Concept Leaks:** Strict suppression of decants, accords, and perfume upsells on non-perfumery tenants.
- **Frictionless In-Drawer Checkout:** Full deprecation of native browser `alert()` popups in favor of contextual in-drawer alerts and friendly empty states.
- **Universal Design Tokens:** `--qx-sys-*` design tokens, WCAG-compliant `:focus-visible` styling, and mobile viewport safe-area padding.
- **Targeted Test Suite:** Verified green across all test cases (`/lamp/www/cfdadmin/tests/e2e/test_ui_ux_coherence_upgrade.mjs`).
