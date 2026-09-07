# Quantix Storefront Luxury Showroom

Quantix Storefront is a modern, high-performance multi-tenant e-commerce showroom engine built on PHP and vanilla JavaScript/CSS, integrated seamlessly with the CFDAdmin CFDI 4.0 Mexican electronic invoicing ecosystem and the Maître D' Studio backoffice.

## Key Features

1. **Spotlight Omnibox (`⌘K` / Ctrl+K)**
   - Instant search modal with multi-field predictive indexing (Name, SKU, SAT Key, Category, Notes).
   - Bezier curve fly-to-cart particle animation with Web Audio API synthesizer clicks.

2. **Atelier Executive Product Detail Modal**
   - Multi-photo gallery filmstrip with live thumbnail selection.
   - Adaptive domain-agnostic spec parser: Olfactory Pyramid tiers (Salida/Corazón/Fondo) or structured key-value specification pills.
   - 3 Universal Satin Performance Metric Bars.

3. **Intelligent Fiscal Checkout & SPEI Interbank Gateway**
   - Live SAT RFC classifier distinguishing Persona Física (13 chars) vs Persona Moral (12 chars).
   - Dynamic Régimen Fiscal and Uso de CFDI dropdown filtering.
   - SPEI voucher with 1-click CLABE copying and instant feedback.
   - VIP WhatsApp Concierge order link generation.

4. **Boutique Stories & Social Commerce Reels**
   - Dynamic story avatar bubbles with animated gradient rings.
   - Fullscreen story viewer with timer-driven segment progress bars and shoppable sticker tags.

5. **Universal Concierge Matchmaker 3-Click Shopping Wizard**
   - 3-question guided shopping wizard (Ocasión, Estilo, Gama).
   - Dynamic catalog match scorer displaying the top 3 tailored recommendations with match percentage badges.

6. **Mobile Ultra-Luxe UX Architecture**
   - **Native Bottom-Sheet & Swipe Gallery:** Touch-swipeable image carousel with pagination dots (`● ○ ○ ○`) and minimalist floating dismiss controls.
   - **Sticky Thumb-Zone Buy Bar:** Docked bottom purchasing bar with live price, tax status, stepper, and 1-tap direct checkout trigger.
   - **Floating Glass Bottom Navigation Dock:** Glassmorphic mobile dock (`#qx_mobile_dock`) for instant access to Home, Search (⌘K), Concierge Quiz, and Bag.
   - **Catalog View Switcher:** 2-Column Luxury Masonry vs 1-Column Cinema mode toggle with `localStorage` persistence.
   - **Web Haptics & Gesture Interception:** Silent vibration feedback (`navigator.vibrate`) and mobile back-gesture (`popstate`) trapping to prevent accidental app exits.

7. **Maître D' Hero Stage Typography Atelier & Haute Shaders (Capítulo IV)**
   - **Live Interactive Preview Plaque:** Real-time editorial typography canvas in Store Director mirroring the storefront hero headline with dual-theme preview toggle.
   - **Dynamic Token Parsing:** Instant `{accent}` keyword wrapping with metallic shaders and calligraphic ampersand `&` styling (`Playfair Display Italic`).
   - **5 Luminescent GPU Shaders:** Liquid Gold (`liquid_gold`), Platinum Ice (`platinum_ice`), Rose Champagne (`rose_champagne`), Obsidian Neon (`obsidian_neon`), and Pure Monochrome (`pure_monochrome`) with 60 FPS specular shimmer.
   - **Dual-Theme High Contrast (WCAG AAA):** Dynamic chromatic adaptation ensuring 100% character visibility across Obsidian and Apple Pure Light themes.
   - **1-Click Haute Aura Presets:** Instant seasonal curations ("Otoño Opulento", "Solarium", "Maison Prestige", "Noir Privé") with haptic chime and Glass Twin live sync at 120 FPS.

8. **Circadian Chrono-Orrery, Grand Défilé & Mechanical Allocation Vault (Capítulo IV)**
   - **Circadian Solar Orrery:** Real-time and simulated 4-quadrant celestial engine (*L'Aube*, *Le Zénith*, *Le Crépuscule*, *La Nuit Profonde*) with dynamic atmospheric shader backdrop.
   - **Interactive Pointer Raytracing:** 120 FPS hardware-accelerated `--qx-light-x/y` dynamic specular vector tracking cursor and mobile tilt.
   - **Grand Défilé Campaign Runway:** Timed stagecraft orchestrator with 120 FPS cinematic rehearsal transitions between seasonal campaigns and evergreen baseline.
   - **Swiss Mechanical Allocation Vault:** Complication-style 3D rotating counter drums (`qx-counter-drum`), scarcity gauges, and tactile ratchet audio synthesis.
   - **Vernissage Wax Seal:** Ceremonial VIP prelansamento curtain with sonic crystal chime and wax stamp break.
   - **Stored XSS Sanitization & Layout Guard:** 100% escaped token pipeline and `requestAnimationFrame` render throttle.

9. **Quantix Archetype Radical Metamorphosis (Capítulo VIII)**
   - **Haute Maison:** 3-column editorial asymmetric grid with 2-column statement product spans, floating pedestal halos, atelier wax seal badges, Roman serif typography, and centered Velvet Salon Sanctuary modal.
   - **Titan Hyper-Velocity:** High-density 4-to-5 column compact matrix with 24H Full express delivery countdown ticker, dual strikethrough pricing, direct in-card `[-] 1 [+]` quantity stepper, and slide-over right checkout drawer.
   - **Nordic Monolith:** 3-column architectural gallery with 1px hairline border-collapse, pure negative space, zero screaming stickers, clean lowercase Swiss typography, invisible hover CTA pills, and 50/50 fullscreen split technical monograph.
   - **Dynamic Social Drop:** 9:16 vertical portrait cards, live buyer counter ticker, real-time stock depletion progress bars, recent buyer avatar stacks, pulsing gradient buy buttons, and swipeable mobile bottom sheet.
   - **Zero-Reload Dynamic Morphing:** Instantaneous state transitions via APEX Command Tower and Glass Twin Bridge postMessage sync.

## Live Endpoints & Interactive Previews

The 4 commercial archetypes can be previewed live on any tenant using the `?archetype=` parameter:
- **Haute Maison**: [https://bracsa.evinux.net/?archetype=maison](https://bracsa.evinux.net/?archetype=maison)
- **Titan Hyper-Velocity**: [https://bracsa.evinux.net/?archetype=titan](https://bracsa.evinux.net/?archetype=titan)
- **Nordic Monolith**: [https://bracsa.evinux.net/?archetype=nordic](https://bracsa.evinux.net/?archetype=nordic)
- **Dynamic Social Drop**: [https://bracsa.evinux.net/?archetype=social](https://bracsa.evinux.net/?archetype=social)

## Verification & Testing

Targeted verification suite for commercial archetypes (runs against live tenant `https://bracsa.evinux.net`):
```bash
# 1. PHP Static Linting
php -l /lamp/www/quantix-stores/online-store/index.php
php -l /lamp/www/quantix-stores/online-store/includes/tenant_resolver.php

# 2. HTTP Status Code Checks
curl -IsS "https://bracsa.evinux.net/?archetype=titan" | head -n 5

# 3. Targeted Playwright E2E Suite (Desktop & Mobile, 0 failed network requests)
node /lamp/www/quantix-stores/online-store/tests/test_archetype_radical_metamorphosis.mjs
```

## Documentation & Audits
- **Master Plan**: `/lamp/www/cfdadmin/docs/plans/quantix-archetype-radical-metamorphosis/INDEX.md`
- **Verification Report (MD)**: `/lamp/www/cfdadmin/docs/reports/2026-09-07-quantix-archetype-radical-metamorphosis-verification.md`
- **Verification Report (HTML)**: `/lamp/www/cfdadmin/docs/reports/2026-09-07-archetype-metamorphosis-report.html`
- **Session Memory**: `/lamp/www/cfdadmin/docs/memories/session-2026-09-07-quantix-archetype-radical-metamorphosis.md`
- **Visual Proof Artifacts**: `/lamp/www/cfdadmin/docs/reports/artifacts/archetype-radical-metamorphosis/` (12 screenshots)

