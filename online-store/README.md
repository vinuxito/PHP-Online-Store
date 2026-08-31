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

## Verification & Testing

Automated Playwright test suite:
```bash
node /lamp/www/cfdadmin/tests/e2e/vx-quantix-storefront-e2e.mjs
node /lamp/www/cfdadmin/tests/e2e/vx-storefront-maitre-d-e2e.mjs
```
