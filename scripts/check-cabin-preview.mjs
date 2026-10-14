import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin = process.env.CABIN_PREVIEW_QA_ORIGIN || 'http://127.0.0.1:4192';
const output = new URL('../output/cabin-preview/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const warnings = [];
const waitPreview = (page, ceiling, floor) => page.waitForFunction(({ ceiling, floor }) => {
  const img = document.querySelector('#decorPreviewImage');
  return img?.dataset.cabinPreview === 'ready' && img.dataset.previewCeiling === ceiling && img.dataset.previewFloor === floor && img.src.startsWith('data:image/') && img.complete && img.naturalWidth > 0;
}, { ceiling, floor });
const waitOriginal = (page, filename) => page.waitForFunction(filename => {
  const img = document.querySelector('#decorPreviewImage');
  return img?.dataset.cabinPreview === 'original' && new URL(img.src).pathname.endsWith(filename) && img.complete && img.naturalWidth > 0;
}, filename);

try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, ...(width === 390 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => { if (msg.type() === 'warning' && msg.text().includes('Cabin finish preview unavailable')) warnings.push(msg.text()); });
    await page.goto(`${origin}/?page=decoration`, { waitUntil: 'domcontentloaded' });
    await waitOriginal(page, 'sc-c-a.webp');
    assert.equal(await page.locator('.cabin-preview-note').isVisible(), false);
    await page.locator('#floorFinish').selectOption('MG-03');
    await waitPreview(page, 'none', 'MG-03');
    assert.equal(await page.locator('#selectedFloorCode').textContent(), 'MG-03');
    await page.locator('#ceilingFinish').selectOption('CD-004');
    await waitPreview(page, 'CD-004', 'MG-03');
    const expected = await page.locator('#decorPreviewImage').getAttribute('src');
    assert.equal(await page.locator('#selectedCeilingCode').textContent(), 'CD-004');
    assert.equal(await page.locator('#selectedFloorImage').getAttribute('src'), './assets/finishes/floors/mg-03.png');
    assert.equal(await page.locator('.cabin-preview-note').isVisible(), true);
    assert.match(await page.locator('.cabin-preview-note').textContent(), /not a manufacturing specification/);
    await page.locator('.decor-preview').screenshot({ path: fileURLToPath(new URL(`editor-${width}.png`, output)) });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitPreview(page, 'CD-004', 'MG-03');
    assert.equal(await page.locator('#decorPreviewImage').getAttribute('src'), expected, 'URL reload reproduces the same finish composite');
    await page.locator('#qrDecoration').click();
    await page.locator('#qrCode svg').waitFor({ state: 'visible' });
    const customerUrl = await page.locator('#qrUrl').textContent();
    await page.goto(customerUrl, { waitUntil: 'domcontentloaded' });
    await waitPreview(page, 'CD-004', 'MG-03');
    assert.equal(await page.locator('.cabin-preview-note').isVisible(), true, 'Customer view labels the composite as illustrative');
    assert.equal(await page.locator('#decorPreviewImage').getAttribute('src'), expected);
    await page.locator('.decor-preview').screenshot({ path: fileURLToPath(new URL(`customer-${width}.png`, output)) });

    const editorUrl = new URL(customerUrl);
    editorUrl.searchParams.delete('panel');
    await page.goto(editorUrl.href, { waitUntil: 'domcontentloaded' });
    await waitPreview(page, 'CD-004', 'MG-03');
    await page.locator('#cabinStyle').selectOption('SC-C-D');
    await waitOriginal(page, 'sc-c-d.webp');
    assert.equal(await page.locator('.cabin-preview-note').isVisible(), false);
    assert.equal(await page.locator('#ceilingFinish').inputValue(), 'CD-004');
    assert.equal(await page.locator('#floorFinish').inputValue(), 'MG-03');
    await page.locator('#cabinStyle').selectOption('SC-C-A');
    await waitPreview(page, 'CD-004', 'MG-03');
    await page.locator('#floorFinish').selectOption('none');
    await waitPreview(page, 'CD-004', 'none');
    await page.locator('#ceilingFinish').selectOption('none');
    await waitOriginal(page, 'sc-c-a.webp');
    assert.equal(await page.locator('.cabin-preview-note').isVisible(), false);
    assert.equal(await page.locator('.selected-finish[data-finish-category="ceiling"]').isVisible(), false);
    assert.equal(await page.locator('.selected-finish[data-finish-category="floor"]').isVisible(), false);

    // Keep some real image requests in flight while the user changes choices.
    await page.route('**/assets/finishes/ceilings/cd-010.png', async route => {
      await new Promise(resolve => setTimeout(resolve, 200));
      await route.continue();
    });
    await page.locator('#ceilingFinish').selectOption('CD-010');
    await page.waitForFunction(() => document.querySelector('#selectedCeilingCode').textContent === 'CD-010');
    await page.locator('#floorFinish').selectOption('MG-01');
    await page.locator('#ceilingFinish').selectOption('CD-004');
    await page.locator('#floorFinish').selectOption('MG-03');
    await waitPreview(page, 'CD-004', 'MG-03');
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('#decorPreviewImage').getAttribute('src'), expected, 'Late previous images cannot overwrite the latest finish combination');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await context.close();
    console.log(`PASS ${width}px: SC-C-A ceiling/floor combination, separate cards, descriptive note, full/QR reload, none reset, other cabin preservation and rapid switches`);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
} finally {
  await browser.close();
}
