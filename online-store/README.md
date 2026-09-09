# Quantix Storefront Luxury Showroom

## Business-aware templates — 2026-09-09

**Atelier, Editorial, Boutique and Cinema** now offer distinct compositions while sharing the existing catalogue, cart, layered detail, comparison and motion engines. Gallery stays compatible. Business profile and shop/inquire/book journey control actions independently from design. No store is automatically reclassified or switched to Atelier.

The Director retains its six-section book, Evinux themes and permanent preview. Choose **Plantillas**, **Colores**, or **Negocio → Módulos → Tu tipo de negocio**. The new profile endpoint is session/admin/CSRF/tenant/revision protected and audited; ordinary controls preserve business identity. Compatible version-1 readers are required before new profile writes. Deploy adjacent CFDAdmin shared contracts with this release; no new database migration is required.

Restored: visible configured carousel, bounded pointer tilt, shadowed readable detail, explicit format selection, 2–4 item factual comparison and the existing visual pair mode. Catalogue failures now offer retry while retaining loaded products. Missing sensory facts stay missing; unsupported refill/discount claims were removed from these surfaces.

**Verification:** 16 named focused checks /1,008 assertions and 35 syntax checks; both live stores across desktop/phone; unchanged saved configurations and matching served assets. No whole suite, real order/booking or outbound message. Physical AR/gyro/120fps, production Apply roundtrips and owner acceptance remain pending.

MISTIQ keeps saved Editorial. Its old featured IDs 1/2/3 no longer match products: curate valid items in **Portada → Elegir destacados**, then preview Atelier. TEST-SKU's property copy also needs deliberate catalogue review. BRACSA retains its real-estate experience.

[Plan](../../cfdadmin/docs/plans/2026-09-09-quantix-business-aware-templates/INDEX.md) · [HTML evidence](../../cfdadmin/docs/reports/quantix-business-aware-templates/verification.html) · [Review and limits](../../cfdadmin/docs/reports/quantix-business-aware-templates/verification-matrix.md) · [Git release receipt](../../cfdadmin/docs/reports/quantix-business-aware-templates/release.json)

The HTML is a local artifact with embedded images; public docs serving is restricted. Historical inventories below are not current feature/performance certification.

## Storefront appointments — 2026-09-08

The agenda now uses two input steps: choose a date/time and provide **name, email and phone with country code**. It saves the selected date, retains catalog property context and returns the stored PENDING/CONFIRMED state. A private fragment link supports status, rescheduling, cancellation and UTC calendar download. No account or email lookup is used as proof of identity.

**Setup:** Chronos → Horarios de reserva. No active hours means manual date/time requests pending confirmation. Configured hours enforce duration, rest, advance notice, horizon, closed dates and one appointment capacity per store. Automatic confirmation is explicit. Messages and external calendar sync are not automatically delivered.

**Deployment dependency:** apply adjacent `cfdadmin/sql/2026-09-08-storefront-booking.php` and deploy its shared `lib/quantix_booking.php` before these assets/API. The migration is additive and seeds no appointments. CFDAdmin code `e6477aaf` and storefront code `46d0969` are pushed. The corresponding eight-step plan, memory and standalone HTML report are under adjacent CFDAdmin `docs/`.

**Evidence:** 84 focused assertions, six live API checks, six matching served assets, public desktop/mobile, authenticated Chronos and all four Director template drafts. Successful writes used temporary tables; original live appointments stayed unchanged. The full suite and owner real-booking acceptance remain deferred.

## Live correction — title motion and tasting requests, 2026-09-08

Tasting initialization now binds controls without requesting slots. Only an enabled perfumery can load slots, book, open a session or poll; slots load when the room is opened. The public bootstrap includes the existing feature matrix, and server access checks are unchanged. Fresh BRACSA public and Director loads made zero tasting requests and showed no captured storefront HTTP errors.

The Director now explains reduced motion and offers **Portada → Probar animación / Terminar ensayo**. A trusted preview message temporarily animates the title without persisting settings; public visitors retain their motion preferences. Actual changing title positions were observed in both Director renderers. Four focused CFDAdmin checks passed (480 assertions/checks); no full suite or real booking/transaction ran. Source hashes and live evidence: adjacent `cfdadmin/docs/reports/2026-09-08-quantix-motion-tasting.html` and its `2026-09-08-quantix-motion-tasting/evidence.json` companion.

## Control integrity update — 2026-09-08

This release reconnects Director choices to all four storefront compositions: title shaders, typography, spacing and shimmer; scheduled campaigns; exact featured selections; contact changes; model controls; and explicit payment capabilities. The permanent Director book and preview remain intact.

**Delivery status:** applied after explicit owner approval. The pending-order migration created its table with zero requests, and the public BRACSA storefront, catalog identity and asset hashes were verified over HTTPS. Browser inspection confirmed the selected gold shader, italic title, wide tracking and hidden property-store cart. Reduced-motion preference was active, so animation was correctly suppressed. Authenticated Director verification now covers all six sections at desktop and phone viewport sizes, all four template compositions, saved title/color state, temporary lighting rehearsal, campaign validation, inspector routing and the empty tenant inbox. No saved settings were changed. The two live findings (featured count and inbox phone width) are fixed in adjacent CFDAdmin commit `6dbaad16`, pushed. No full project suite or real transaction was run; owner acceptance, production save round trips and physical-device AR remain outside this pass.

- SPEI uses the tenant's configured bank data and a validated CLABE. Orders become durable **pending-payment requests**, with authoritative catalog prices, tenant isolation and retry protection.
- The additive `cfdadmin/sql/2026-09-08-quantix-pending-orders.sql` has been applied and its 14 columns/four indexes verified. The authenticated Director provides a read-only request inbox. No automatic stock deduction, payment confirmation, invoice stamping or notification sending occurs.
- Card/PayPal processing and outbound notifications remain unavailable until integrated. Invoice details and the requested series are recorded for manual handling.
- 3D reference geometry has no invented price or unrelated purchase action. Native AR needs a configured compatible public asset and supported device; entered dimensions are references, not automatic native scale rewriting.
- The welcome reveal is decorative; the catalog is public. Allocation is merchant-entered numbering, not a stock or scarcity guarantee.
- Explicitly empty titles and featured selections remain empty. The authoritative `Industria` column wins over stale template metadata, keeping store identity independent of campaign copy and design. Ordinary Director saves preserve this identity.
- This release requires adjacent CFDAdmin commit `32eb4a2a` (shared industry helper), plus the control contracts introduced in `71f4905f`. Seven named focused checks total 1,014 passing assertions/checks. Only the affected Director check was rerun during authenticated verification (25 scenarios / 256 assertions); six unchanged results remain from the applied-release pass.

Release evidence lives in the adjacent CFDAdmin repository: `docs/plans/2026-09-08-quantix-controls-integrity/INDEX.md`, `docs/reports/2026-09-08-quantix-controls-integrity.html`, and `docs/memories/session-2026-09-08-quantix-controls-integrity.md`.

## Historical feature inventory

The older inventory below preserves product history. Its performance, conversion, accessibility and service-integration claims are not current verification evidence; the capability states above take precedence.


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

10. **Filemón Prime Context-Aware Intelligence Matrix**
   - **Dynamic Industry Classification:** Evaluates tenant metadata (`isPerfumery`, `slug`, `brandName`, `description`) to deterministically assign persona (`real_estate`, `perfumery`, `industrial`, `retail`).
   - **Hermetic Shielding:** Zero perfume leakage outside perfumery storefronts; real estate showrooms receive dedicated *Concierge Inmobiliario VIP & Asesor Patrimonial* persona.
   - **Interactive Action Chips:** Dispatches direct actions including `#qx_agenda_modal` opening (`[📅 Agendar Cita VIP]`), WhatsApp VIP linking, and CFDI 4.0 invoice assistance.
   - **Sub-Millisecond Execution:** Rule-based intelligence responds in `< 0.1ms`.

11. **Quantix Sovereign Luxury Architectural Redesign (Bienes Raíces & High-Ticket)**
    - **Atmospheric Palette Purification:** Purged muddy brown backgrounds and dirty caustics dot matrix; replaced with Deep Obsidian Onyx (`#090c15` / `#0f1523`) and Champagne Sand typography (`#c5a880` / `#d6c7b2`).
    - **Aesthetic Decluttering:** Removed radioactive neon yellow halos, cartoon emojis, flash deals banners, Instagram stories bars, and perfume mechanics on real estate and non-perfumery portals.
    - **High-Ticket Interaction Semantics:** Replaced consumer retail buy buttons ("Comprar 🛍️") with "✦ Explorar Residencia →" and direct private VIP concierge viewing scheduling.
    - **Property Dossier Modal:** Frosted glass "✦ Residencia Destacada" badge, legal certainty indicators ("🏛️ Certeza Jurídica & Posesión Inmediata"), and WhatsApp VIP broker routing.
    - **Sanitized Typography:** Automatic entity un-double-encoding in hero headlines preserving refined italic script ampersands (`&`).

## Live Endpoints & Interactive Previews

The 4 commercial archetypes can be previewed live on any tenant using the `?archetype=` parameter:
- **Haute Maison**: [https://bracsa.evinux.net/?archetype=maison](https://bracsa.evinux.net/?archetype=maison)
- **Titan Hyper-Velocity**: [https://bracsa.evinux.net/?archetype=titan](https://bracsa.evinux.net/?archetype=titan)
- **Nordic Monolith**: [https://bracsa.evinux.net/?archetype=nordic](https://bracsa.evinux.net/?archetype=nordic)
- **Dynamic Social Drop**: [https://bracsa.evinux.net/?archetype=social](https://bracsa.evinux.net/?archetype=social)

## Verification & Testing

Targeted verification suite for commercial archetypes & Filemón intelligence:
```bash
# 1. PHP Static Linting
php -l /lamp/www/quantix-stores/online-store/index.php
php -l /lamp/www/quantix-stores/online-store/api/filemon_assistant_api.php

# 2. Targeted Playwright E2E Suite (Filemón Context-Awareness across Storefronts & CFDAdmin)
node /lamp/www/cfdadmin/tests/e2e/test_filemon_context_awareness.mjs
```

## Documentation & Audits
- **Master Plan**: `/lamp/www/cfdadmin/docs/plans/quantix-archetype-radical-metamorphosis/INDEX.md`
- **Verification Report (MD)**: `/lamp/www/cfdadmin/docs/reports/2026-09-07-quantix-archetype-radical-metamorphosis-verification.md`
- **Verification Report (HTML)**: `/lamp/www/cfdadmin/docs/reports/2026-09-07-archetype-metamorphosis-report.html`
- **Session Memory**: `/lamp/www/cfdadmin/docs/memories/session-2026-09-07-quantix-archetype-radical-metamorphosis.md`
- **Visual Proof Artifacts**: `/lamp/www/cfdadmin/docs/reports/artifacts/archetype-radical-metamorphosis/` (12 screenshots)

