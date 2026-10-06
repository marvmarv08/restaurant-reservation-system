import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
if (process.env.BOOKING_TEST_MODE !== 'isolated') throw new Error('Use the isolated menu verifier.');
const {chromium} = await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const {default: AxeBuilder} = await import(pathToFileURL(resolve(process.env.AXE_MODULE)).href);
const base = 'http://127.0.0.1:18080', artifacts = '/tmp/lumina-menu';
await mkdir(artifacts, {recursive: true});
const catalog = (await (await fetch(base + '/api/catalog')).json()).catalog;
const browser = await chromium.launch(), contexts = [], errors = [], mutations = [], external = [];
let checks = 0;
async function check(name, fn) {await fn(); checks++; console.log('PASS ' + name);}
async function makePage(options = {}) {
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}, ...options}); contexts.push(context);
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== base) {external.push(url.origin); return route.abort();}
    if (!['GET', 'HEAD'].includes(route.request().method())) mutations.push(url.pathname);
    return route.continue();
  });
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  page.on('pageerror', e => errors.push(e.message));
  return page;
}
async function open(page) {await page.goto(base + '/#menu'); await page.locator('.menu-item').first().waitFor();}
async function assertDishes(page, categoryId = 0) {
  const expected = catalog.menu.filter(i => !categoryId || Number(i.category_id) === categoryId);
  const actual = await page.locator('.menu-item h3').allTextContents();
  assert.deepEqual(actual, expected.map(i => i.name));
  const prices = await page.locator('.menu-price').allTextContents();
  assert.deepEqual(prices.map(value => Number(value.replace(/[₱,\s]/g, '')) * 100), expected.map(i => Number(i.price_cents)));
  assert.deepEqual(await page.locator('.menu-item-copy > p').allTextContents(), expected.map(i => i.description));
  const tags = await page.locator('.menu-tags').allTextContents();
  for (let i = 0; i < expected.length; i++) {
    for (const tag of JSON.parse(expected[i].tags_json || '[]')) assert.ok(tags[i].includes(tag));
    if (!Number(expected[i].is_available)) assert.match(tags[i], /Currently unavailable/i);
  }
}
try {
  const page = await makePage(); await open(page);
  await check('Every real catalog item has a local illustrative thumbnail and unchanged name/price', async () => {
    await assertDishes(page);
    assert.equal(await page.locator('.menu-item img').count(), catalog.menu.length);
    assert.ok(await page.locator('.menu-item img').evaluateAll(nodes => nodes.every(e => e.getAttribute('loading') === 'lazy' && e.src.startsWith(location.origin + '/assets/images/'))));
    assert.ok(await page.locator('.menu-photo-note').isVisible());
  });
  await check('Desktop categories sit beside the menu and keep a visible selected state', async () => {
    const nav = await page.locator('#menu-categories').boundingBox(), items = await page.locator('#menu-items').boundingBox();
    assert.ok(nav.x + nav.width < items.x);
    assert.equal(await page.locator('#menu-categories button[aria-pressed=true]').count(), 1);
    const selected = page.locator('#menu-categories button[aria-pressed=true]');
    assert.notEqual(await selected.evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(0, 0, 0, 0)');
  });
  for (const category of catalog.categories) await check('Filter ' + category.name + ' uses real catalog rows and retains focus', async () => {
    const button = page.getByRole('button', {name: category.name, exact: true}); await button.click();
    await assertDishes(page, Number(category.id));
    assert.equal(await button.evaluate(e => e === document.activeElement), true);
    assert.equal(await page.locator('#menu-categories button[aria-pressed=true]').count(), 1);
    assert.equal(await page.locator('#menu-category-title').innerText(), category.name);
    const images = page.locator('.menu-item img');
    await images.evaluateAll(nodes => nodes.forEach(e => {e.loading = 'eager';}));
    await page.waitForFunction(() => [...document.querySelectorAll('.menu-item img')].every(e => e.complete && e.naturalWidth > 0));
  });
  await check('All dishes restores the full menu and announces the real result count', async () => {
    await page.getByRole('button', {name: 'All dishes', exact: true}).click(); await assertDishes(page);
    assert.match(await page.locator('#menu-result-count').innerText(), new RegExp(String(catalog.menu.length)));
    assert.equal(await page.locator('#menu-categories + [role=status]').innerText(), `All dishes: ${catalog.menu.length} dishes shown.`);
  });
  await check('Keyboard category browsing reaches the last category and filters on Enter', async () => {
    const buttons = page.locator('#menu-categories button'); await buttons.first().focus();
    for (let i = 1; i < await buttons.count(); i++) await page.keyboard.press('Tab');
    assert.equal(await buttons.last().evaluate(e => e === document.activeElement), true);
    await page.keyboard.press('Enter'); await assertDishes(page, Number(catalog.categories.at(-1).id));
  });
  for (const width of [320, 390, 768, 1440]) await check('Menu reflow, keyboard visibility and automated A/AA at ' + width + 'px', async () => {
    await page.setViewportSize({width, height: 1000}); await page.locator('#menu').scrollIntoViewIfNeeded();
    await page.getByRole('button', {name: 'Sweet', exact: true}).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    const violations = (await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze()).violations;
    assert.deepEqual(violations.map(v => ({id: v.id, targets: v.nodes.map(n => n.target)})), []);
    await page.screenshot({path: `${artifacts}/menu-${width}.png`});
  });
  await check('Mobile categories form a horizontal strip and keyboard focus stays inside its visible area', async () => {
    await page.setViewportSize({width: 390, height: 844});
    const buttons = page.locator('#menu-categories button'); await buttons.first().focus();
    for (let i = 1; i < await buttons.count(); i++) await page.keyboard.press('Tab');
    const last = await buttons.last().boundingBox(); assert.ok(last.x >= 0 && last.x + last.width <= 391);
    assert.ok(await page.locator('#menu-categories').evaluate(e => e.scrollWidth > e.clientWidth && e.scrollLeft > 0));
  });
  await check('Broken menu images leave stable geometry, names, prices and category controls usable', async () => {
    const failed = await makePage(); await failed.route('**/assets/images/**', route => route.abort()); await open(failed);
    await failed.getByRole('button', {name: 'Bar', exact: true}).click();
    await assertDishes(failed, Number(catalog.categories.find(c => c.name === 'Bar').id));
    await failed.waitForFunction(() => document.querySelectorAll('.menu-image.is-missing').length > 0);
    assert.ok(await failed.locator('.menu-image').evaluateAll(nodes => nodes.every(e => e.getBoundingClientRect().height >= 60)));
  });
  await check('Unknown or hostile image keys use a local text fallback without external loading', async () => {
    const fallback = await makePage();
    await fallback.route('**/api/catalog', async route => {
      const response = await route.fetch(), payload = await response.json();
      payload.catalog.menu[0].image_path = 'https://example.test/evil.jpg';
      payload.catalog.menu[0].is_available = 0;
      payload.catalog.menu[1].image_path = '__proto__';
      await route.fulfill({response, json: payload});
    });
    await open(fallback);
    assert.equal(await fallback.locator('.menu-item').nth(0).locator('img').count(), 0);
    assert.equal(await fallback.locator('.menu-item').nth(1).locator('img').count(), 0);
    await assertDishes(fallback);
    assert.match(await fallback.locator('.menu-item').first().locator('.menu-tags').innerText(), /Currently unavailable/i);
  });
  await check('Reduced-motion category switching is immediately usable and remains static', async () => {
    await page.emulateMedia({reducedMotion: 'reduce'}); await page.getByRole('button', {name: 'Bar', exact: true}).click();
    assert.equal(await page.locator('#menu-items').evaluate(e => e.getAnimations({subtree:true}).filter(a => a.playState === 'running').length), 0);
  });
  await check('Photo credits include original authors, sources and Creative Commons license links', async () => {
    const credits = page.locator('#menu-photo-credits'); await credits.locator('summary').click();
    assert.ok(await credits.locator('li').filter({hasText: 'Arnold Gatilao'}).isVisible());
    assert.ok(await credits.getByRole('link', {name: 'File:Chicken adobo (Philippines).jpg', exact: true}).isVisible());
    assert.ok(await credits.getByRole('link', {name: 'CC BY-SA 4.0', exact: true}).count() > 0);
    assert.ok(await credits.getByRole('link', {name: 'CC BY 2.0', exact: true}).count() > 0);
  });
  await check('Menu browsing creates no holds/orders, needs no external assets and produces no JS errors', async () => {
    assert.deepEqual(mutations, []); assert.deepEqual(external, []); assert.deepEqual(errors, []);
  });
  console.log(`Menu photography: ${checks} checks passed.`);
} finally {for (const c of contexts) await c.close(); await browser.close();}
