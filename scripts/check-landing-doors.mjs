import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { LANDING_DOOR_OPTIONS } from '../assets/landing-doors.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin = process.env.LANDING_DOOR_QA_ORIGIN || 'http://127.0.0.1:4192';
const output = new URL('../output/landing-doors/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const decode = code => JSON.parse(Buffer.from(code, 'base64url').toString('utf8'));
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const boot = async (page, url) => {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('#landingDoorGrid [data-finish]').length === 11 && new URL(location.href).searchParams.has('c'));
};

try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, ...(width === 390 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await boot(page, `${origin}/?page=decoration`);
    assert.equal(await page.locator('#landingDoorFinish').inputValue(), 'none');
    assert.equal(await page.locator('.selected-finish[data-finish-category="landingDoor"]').isVisible(), false);
    for (const { id } of LANDING_DOOR_OPTIONS) {
      const card = page.locator(`#landingDoorGrid [data-finish="${id}"]`);
      await card.scrollIntoViewIfNeeded();
      await page.waitForFunction(selector => {
        const image = document.querySelector(selector);
        return image?.complete && image.naturalWidth > 0;
      }, `#landingDoorGrid [data-finish="${id}"] img`);
      assert.equal(await card.locator('img').evaluate(image => getComputedStyle(image).objectFit), 'contain');
      if (width === 390) await card.tap(); else await card.click();
      await page.waitForFunction(value => document.querySelector('#selectedLandingDoorCode').textContent === value && document.querySelector('#selectedLandingDoorImage').complete && document.querySelector('#selectedLandingDoorImage').naturalWidth > 0, id);
      assert.equal(await page.locator('#landingDoorFinish').inputValue(), id);
      assert.equal(decode(new URL(page.url()).searchParams.get('c')).landingDoorFinish, id);
      assert.equal(await page.locator('#selectedLandingDoorImage').getAttribute('src'), `./assets/finishes/landing-doors/${id.toLowerCase()}.png`);
    }
    await page.locator('#landingDoorGrid [data-finish="none"]').click();
    await page.waitForFunction(() => document.querySelector('#selectedLandingDoorCode').textContent === 'Not selected');
    assert.equal(await page.locator('.selected-finish[data-finish-category="landingDoor"]').isVisible(), false);
    await page.locator('#landingDoorFinish').selectOption('SD-007');
    await page.waitForFunction(() => document.querySelector('#selectedLandingDoorCode').textContent === 'SD-007');
    await page.locator('#qrDecoration').click();
    await page.locator('#qrCode svg').waitFor({ state: 'visible' });
    const customerUrl = await page.locator('#qrUrl').textContent();
    const compact = decode(new URL(customerUrl).searchParams.get('s'));
    assert.equal(compact.at(-1), 'SD-007');
    assert.equal(compact.length, 33);
    await page.locator('#qrClose').click();
    await page.locator('#landingDoorGrid').scrollIntoViewIfNeeded();
    await page.locator('#landingDoorGrid').screenshot({ path: fileURLToPath(new URL(`gallery-${width}.png`, output)) });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#selectedLandingDoorCode').textContent === 'SD-007');
    await page.goto(customerUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#selectedLandingDoorCode').textContent === 'SD-007' && document.querySelector('#selectedLandingDoorImage').naturalWidth > 0);
    assert.equal(await page.locator('[data-decor="landingDoor"]').textContent(), 'SD-007');
    await page.locator('.decor-showcase').screenshot({ path: fileURLToPath(new URL(`customer-${width}.png`, output)) });
    const legacy = compact.slice(0, -1);
    await page.goto(`${origin}/?s=${encode(legacy)}&panel=0&page=decoration`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.classList.contains('page-decoration'));
    assert.equal(await page.locator('#landingDoorFinish').inputValue(), 'none');
    assert.equal(await page.locator('.selected-finish[data-finish-category="landingDoor"]').isVisible(), false);
    assert.equal(decode(new URL(page.url()).searchParams.get('s')).length, 32);
    await boot(page, `${origin}/?c=${encode({ landingDoorFinish: 'not-a-door' })}&page=decoration`);
    assert.equal(await page.locator('#landingDoorFinish').inputValue(), 'none');
    assert.equal(decode(new URL(page.url()).searchParams.get('c')).landingDoorFinish, 'none');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    for (const [id, value] of Object.entries({ landingDoorFinish: 'LD-GLASS', ceilingFinish: 'CD-003', floorFinish: 'MG-03', handrailFinish: 'HR-05', hallButtonFinish: 'HB-01', copFinish: 'COP-01', controllerFinish: 'LISA20' })) {
      await page.locator(`#${id}`).selectOption(value);
    }
    await page.waitForFunction(() => document.querySelectorAll('.selected-finish:not(.empty)').length === 7);
    const bounds = await page.evaluate(() => {
      const selection = document.querySelector('.selected-finishes').getBoundingClientRect();
      const gallery = document.querySelector('.decor-main > .decor-library-head').getBoundingClientRect();
      return { bottom: selection.bottom, nextTop: gallery.top };
    });
    assert.ok(bounds.bottom <= bounds.nextTop + 1, `Selected images cannot overlap gallery: ${JSON.stringify(bounds)}`);
    await context.close();
    console.log(`PASS ${width}px: 10 door assets, selection, optional reset, legacy/full/customer QR reload, no page overflow`);
  }
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.route(`${origin}/bridge-test`, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Local bridge verification</title>' }));
  await page.goto(`${origin}/bridge-test`);
  await page.evaluate(origin => {
    window.received = [];
    window.addEventListener('message', event => { if (event.origin === origin) window.received.push(event.data); });
    const frame = document.createElement('iframe');
    frame.id = 'configurator';
    frame.src = `${origin}/?embed=1&parentOrigin=${encodeURIComponent(origin)}&instanceId=landing-door-test`;
    document.body.append(frame);
  }, origin);
  await page.waitForFunction(() => window.received.some(message => message.type === 'READY'));
  await page.evaluate(origin => document.querySelector('iframe').contentWindow.postMessage({ channel: 'schneider.elevator-configurator', version: 1, type: 'INIT', instanceId: 'landing-door-test', config: { landingDoorFinish: 'SD-104' } }, origin), origin);
  await page.waitForFunction(() => window.received.some(message => message.state?.decoration?.landingDoor?.code === 'SD-104'));
  const snapshot = await page.evaluate(() => window.received.findLast(message => message.state?.decoration?.landingDoor?.code === 'SD-104').state);
  assert.equal(snapshot.config.landingDoorFinish, 'SD-104');
  assert.equal(snapshot.normalizedConfig.landingDoorFinish, 'SD-104');
  assert.equal(snapshot.decoration.landingDoor.imageUrl, `${origin}/assets/finishes/landing-doors/sd-104.png`);
  assert.equal(decode(new URL(snapshot.customerUrl).searchParams.get('s')).at(-1), 'SD-104');
  await page.evaluate(origin => document.querySelector('iframe').contentWindow.postMessage({ channel: 'schneider.elevator-configurator', version: 1, type: 'PATCH_CONFIG', instanceId: 'landing-door-test', config: { landingDoorFinish: 'none' } }, origin), origin);
  await page.waitForFunction(() => window.received.findLast(message => message.type === 'STATE_CHANGED')?.state?.config?.landingDoorFinish === 'none');
  assert.equal(await page.evaluate(() => window.received.findLast(message => message.type === 'STATE_CHANGED').state.decoration.landingDoor), null);
  await page.close();
  console.log('PASS embed bridge: parent INIT/clear → normalized state, image metadata and compact customer URL');
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
