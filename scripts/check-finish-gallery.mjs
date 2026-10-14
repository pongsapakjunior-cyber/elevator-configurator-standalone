import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { existsSync, statSync } from 'node:fs'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const origin = process.env.FINISH_QA_ORIGIN || 'https://elevator-configurator-standalone.vercel.app'
const routeLocalFiles = process.env.FINISH_QA_LOCAL_ROUTE !== '0'
const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const output = new URL('../output/finish-gallery/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const errors = []
const requestErrors = []

try {
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } })
    page.on('pageerror', error => errors.push(error.message))
    page.on('requestfailed', request => requestErrors.push(`${request.url()}: ${request.failure()?.errorText}`))
    if (routeLocalFiles) await page.route(`${origin}/**`, async route => {
      const pathname = decodeURIComponent(new URL(route.request().url()).pathname)
      const localPath = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
      if ((!localPath.startsWith(`${root}${sep}`) && localPath !== root) || !existsSync(localPath) || !statSync(localPath).isFile()) {
        await route.fulfill({ status: 404, body: 'Not found' })
        return
      }
      const type = {
        '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
        '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
        '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
      }[extname(localPath).toLowerCase()]
      await route.fulfill({ path: localPath, contentType: type || 'application/octet-stream' })
    })
    await page.goto(`${origin}/?page=decoration`, { waitUntil: 'domcontentloaded' })
    try {
      await page.locator('#decorationPage').waitFor({ state: 'visible', timeout: 15_000 })
    } catch (error) {
      console.error('Decoration boot diagnostics:', await page.evaluate(() => ({
        bodyClass: document.body.className,
        stageDefined: Boolean(customElements.get('three-d-stage')),
        stageReady: Boolean(document.querySelector('three-d-stage')?.ready),
      })), { errors, requestErrors })
      throw error
    }
    assert.equal(await page.locator('#floorGrid [data-finish^="MG-"]').count(), 35)
    assert.equal(await page.locator('#floorFinish option[value^="MG-"]').count(), 35)
    assert.ok(await page.locator('#floorGrid [data-finish^="FL-"]').count() > 0)
    for (const code of ['COP-02', 'HB-02', 'MG-01', 'MG-35']) {
      const category = code.startsWith('COP') ? 'cop' : code.startsWith('HB') ? 'hallButton' : 'floor'
      const card = page.locator(`#${category}Grid [data-finish="${code}"]`)
      assert.equal(await card.locator('img').count(), 1, `${code}: one image per original finish card`)
      await card.scrollIntoViewIfNeeded()
      await page.waitForFunction(selector => {
        const image = document.querySelector(selector)
        return image?.complete && image.naturalWidth > 0
      }, `#${category}Grid [data-finish="${code}"] img`)
      assert.equal(await card.locator('img').evaluate(image => getComputedStyle(image).objectFit), 'contain')
    }
    for (const [grid, select, code] of [
      ['floorGrid', 'floorFinish', 'MG-01'],
      ['copGrid', 'copFinish', 'COP-02'],
      ['hallButtonGrid', 'hallButtonFinish', 'HB-02'],
    ]) {
      await page.locator(`#${grid} [data-finish="${code}"]`).click()
      assert.equal(await page.locator(`#${select}`).inputValue(), code)
    }
    await page.waitForFunction(() => {
      const images = [...document.querySelectorAll('.selected-finish:not(.empty) img')]
      return images.length >= 3 && images.every(image => image.complete && image.naturalWidth > 0)
    }, null, { timeout: 15_000 })
    const selected = await page.locator('.selected-finish:not(.empty) img').evaluateAll(images =>
      images.map(image => ({ width: image.naturalWidth, height: image.naturalHeight })))
    assert.ok(selected.length >= 3 && selected.every(image => image.width > 0))
    if (width === 390) {
      await page.locator('.decor-showcase').screenshot({ path: new URL('mobile-selected.png', output).pathname.replace(/^\/([A-Za-z]:)/, '$1') })
    }
    await page.close()
    console.log(`${width}px: 35 granite cards, COP/HB images, selections and original FL cards verified`)
  }
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
}
