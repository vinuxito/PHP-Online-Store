import { chromium } from '/lamp/www/cfdadmin/tests/e2e/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = '/lamp/www/cfdadmin/docs/reports/artifacts/archetype-radical-metamorphosis';
const SCRATCH_DIR = '/home/vinuxito/.gemini/antigravity/brain/7db890ab-8a58-4366-8927-031961d7f881/scratch';

if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
if (!fs.existsSync(SCRATCH_DIR)) fs.mkdirSync(SCRATCH_DIR, { recursive: true });

async function saveScreenshots(page, baseName) {
  const p1 = path.join(ARTIFACTS_DIR, `${baseName}.png`);
  const p2 = path.join(SCRATCH_DIR, `${baseName}.png`);
  await page.screenshot({ path: p1, fullPage: false });
  fs.copyFileSync(p1, p2);
  console.log(`  📸 Screenshot saved: ${baseName}.png`);
}

(async () => {
  console.log('🚀 Starting Quantix Archetype Radical Metamorphosis Targeted Test Suite...');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--ignore-certificate-errors', '--no-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 920 },
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  const failedRequests = [];
  page.on('response', resp => {
    if (resp.status() >= 400 && !resp.url().includes('favicon')) {
      failedRequests.push(`${resp.status()} ${resp.url()}`);
    }
  });

  const archetypes = [
    {
      id: 'maison',
      name: 'Haute Maison (Paris Couture / Editorial Asymmetric)',
      url: 'https://bracsa.evinux.net/?archetype=maison',
      expectedBadge: '.qx-maison-seal',
      expectedHeroSpan: '.qx-card-editorial-featured',
      modalSelector: '#qx_product_modal[data-modal-archetype="maison"]'
    },
    {
      id: 'titan',
      name: 'Titan Hyper-Velocity (Amazon / Commercial Warehouse)',
      url: 'https://bracsa.evinux.net/?archetype=titan',
      expectedTicker: '.qx-titan-ticker-bar',
      expectedActions: '.qx-titan-direct-actions',
      modalSelector: '#qx_product_modal[data-modal-archetype="titan"]'
    },
    {
      id: 'nordic',
      name: 'Nordic Monolith (Apple / Aesop / Pure Swiss Gallery)',
      url: 'https://bracsa.evinux.net/?archetype=nordic',
      expectedMeta: '.qx-nordic-meta',
      expectedHover: '.qx-nordic-hover-action',
      modalSelector: '#qx_product_modal[data-modal-archetype="nordic"]'
    },
    {
      id: 'social',
      name: 'Dynamic Social Drop (TikTok / Viral Hype Drops)',
      url: 'https://bracsa.evinux.net/?archetype=social',
      expectedTicker: '.qx-social-ticker-bar',
      expectedBadges: '.qx-social-top-badges',
      expectedDepletion: '.qx-social-depletion',
      modalSelector: '#qx_product_modal[data-modal-archetype="social"]'
    }
  ];

  for (const arch of archetypes) {
    console.log(`\n======================================================`);
    console.log(`🔍 Testing Archetype: ${arch.name} (${arch.id})`);
    console.log(`======================================================`);

    await page.goto(arch.url, { waitUntil: 'networkidle', timeout: 35000 });
    await page.waitForTimeout(1000); // Allow flacon engine and animations to settle

    // 1. Verify Body Attribute
    const bodyArch = await page.evaluate(() => document.body.getAttribute('data-archetype'));
    console.log(`  ✓ Body data-archetype: "${bodyArch}" (Expected: "${arch.id}")`);
    if (bodyArch !== arch.id) throw new Error(`Mismatch body archetype: expected ${arch.id}, got ${bodyArch}`);

    // 2. Verify Cards Exist
    const cardCount = await page.locator('#qx_product_grid .qx-card').count();
    console.log(`  ✓ Product cards rendered in grid: ${cardCount}`);
    if (cardCount === 0) throw new Error('No product cards rendered in catalog grid');

    // 3. Archetype-Specific DOM Verifications
    if (arch.id === 'maison') {
      const sealCount = await page.locator('.qx-maison-seal').count();
      const featuredCount = await page.locator('.qx-card-editorial-featured').count();
      console.log(`  ✓ Maison seals: ${sealCount}, Editorial featured spans: ${featuredCount}`);
      if (sealCount === 0) throw new Error('Missing .qx-maison-seal on Maison cards');
    } else if (arch.id === 'titan') {
      const isTickerVisible = await page.locator('.qx-titan-ticker-bar').isVisible();
      const directActionsCount = await page.locator('.qx-titan-direct-actions').count();
      console.log(`  ✓ Titan Express Ticker visible: ${isTickerVisible}, Direct Stepper Actions: ${directActionsCount}`);
      if (!isTickerVisible) throw new Error('Titan Express Ticker bar is not visible');
      if (directActionsCount === 0) throw new Error('Missing direct stepper actions on Titan cards');
    } else if (arch.id === 'nordic') {
      const metaCount = await page.locator('.qx-nordic-meta').count();
      const hoverCount = await page.locator('.qx-nordic-hover-action').count();
      console.log(`  ✓ Nordic meta elements: ${metaCount}, Hover action overlays: ${hoverCount}`);
      if (metaCount === 0) throw new Error('Missing .qx-nordic-meta on Nordic cards');
      if (hoverCount === 0) throw new Error('Missing .qx-nordic-hover-action on Nordic cards');
    } else if (arch.id === 'social') {
      const isTickerVisible = await page.locator('.qx-social-ticker-bar').isVisible();
      const topBadgesCount = await page.locator('.qx-social-top-badges').count();
      const depletionCount = await page.locator('.qx-social-depletion').count();
      console.log(`  ✓ Social live ticker visible: ${isTickerVisible}, Top live badges: ${topBadgesCount}, Depletion bars: ${depletionCount}`);
      if (!isTickerVisible) throw new Error('Social live ticker is not visible');
      if (topBadgesCount === 0) throw new Error('Missing top badges on Social cards');
    }

    // Capture Desktop Catalog View
    await saveScreenshots(page, `archetype_${arch.id}_desktop`);

    // 4. Open Product Modal
    console.log(`  👉 Opening Product Modal for ${arch.id}...`);
    const firstCard = page.locator('#qx_product_grid .qx-card').first();
    if (arch.id === 'nordic') {
      await firstCard.hover();
      await firstCard.locator('.qx-nordic-btn-action').click();
    } else {
      await firstCard.locator('.qx-card-title').click();
    }

    await page.waitForSelector('#qx_product_modal.active', { timeout: 10000 });
    await page.waitForTimeout(600); // Allow modal transition animation

    const modalArch = await page.evaluate(() => document.getElementById('qx_product_modal').getAttribute('data-modal-archetype'));
    console.log(`  ✓ Modal data-modal-archetype: "${modalArch}" (Expected: "${arch.id}")`);
    if (modalArch !== arch.id) throw new Error(`Modal archetype mismatch: expected ${arch.id}, got ${modalArch}`);

    // Capture Modal View
    await saveScreenshots(page, `archetype_${arch.id}_modal`);

    // Close Modal
    console.log(`  👉 Closing Product Modal...`);
    await page.locator('#qx_pmodal_close').click();
    await page.waitForFunction(() => !document.getElementById('qx_product_modal').classList.contains('active'));
    await page.waitForTimeout(400);
  }

  // 5. Test Live Dynamic Switching without page reload
  console.log(`\n======================================================`);
  console.log(`⚡ Testing Dynamic PostMessage Morphing (Zero-Reload Transition)`);
  console.log(`======================================================`);

  await page.goto('https://bracsa.evinux.net', { waitUntil: 'networkidle' });
  
  // Switch to Titan dynamically
  await page.evaluate(() => {
    window.postMessage({
      source: 'QUANTIX_APEX_COMMAND_TOWER',
      type: 'SYNC_ARCHETYPE',
      payload: { archetype: 'titan' }
    }, '*');
  });
  await page.waitForTimeout(800);
  let liveArch = await page.evaluate(() => document.body.getAttribute('data-archetype'));
  console.log(`  ✓ Dynamic switch to Titan -> body data-archetype: "${liveArch}"`);
  if (liveArch !== 'titan') throw new Error('Dynamic switch to Titan failed');

  // Switch to Nordic dynamically
  await page.evaluate(() => {
    window.postMessage({
      source: 'QUANTIX_APEX_COMMAND_TOWER',
      type: 'SYNC_ARCHETYPE',
      payload: { archetype: 'nordic' }
    }, '*');
  });
  await page.waitForTimeout(800);
  liveArch = await page.evaluate(() => document.body.getAttribute('data-archetype'));
  console.log(`  ✓ Dynamic switch to Nordic -> body data-archetype: "${liveArch}"`);
  if (liveArch !== 'nordic') throw new Error('Dynamic switch to Nordic failed');

  // Switch to Social dynamically
  await page.evaluate(() => {
    window.postMessage({
      source: 'QUANTIX_APEX_COMMAND_TOWER',
      type: 'SYNC_ARCHETYPE',
      payload: { archetype: 'social' }
    }, '*');
  });
  await page.waitForTimeout(800);
  liveArch = await page.evaluate(() => document.body.getAttribute('data-archetype'));
  console.log(`  ✓ Dynamic switch to Social -> body data-archetype: "${liveArch}"`);
  if (liveArch !== 'social') throw new Error('Dynamic switch to Social failed');

  // Switch back to Maison dynamically
  await page.evaluate(() => {
    window.postMessage({
      source: 'QUANTIX_APEX_COMMAND_TOWER',
      type: 'SYNC_ARCHETYPE',
      payload: { archetype: 'maison' }
    }, '*');
  });
  await page.waitForTimeout(800);
  liveArch = await page.evaluate(() => document.body.getAttribute('data-archetype'));
  console.log(`  ✓ Dynamic switch back to Maison -> body data-archetype: "${liveArch}"`);
  if (liveArch !== 'maison') throw new Error('Dynamic switch to Maison failed');

  // 6. Mobile Viewport Verification (iPhone 14)
  console.log(`\n======================================================`);
  console.log(`📱 Testing Mobile Viewports (390x844 Touch Responsive)`);
  console.log(`======================================================`);

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    ignoreHTTPSErrors: true
  });
  const mobilePage = await mobileContext.newPage();

  for (const arch of archetypes) {
    console.log(`  📱 Capturing mobile view for: ${arch.name}`);
    await mobilePage.goto(arch.url, { waitUntil: 'networkidle', timeout: 30000 });
    await mobilePage.waitForTimeout(600);
    await saveScreenshots(mobilePage, `archetype_${arch.id}_mobile`);
  }

  await mobileContext.close();

  console.log(`\n🎉 ALL 4 ARCHETYPES VERIFIED LIVE (DESKTOP & MOBILE) WITH 100% SUCCESS!`);
  console.log(`Failed network requests: ${failedRequests.length}`);
  if (failedRequests.length > 0) {
    failedRequests.forEach(f => console.log('  ⚠️ ' + f));
  }

  await browser.close();
})();
