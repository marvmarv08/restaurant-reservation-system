import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
if (process.env.BOOKING_TEST_MODE !== 'isolated') throw new Error('Use the isolated test stack.');
const {chromium} = await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const {default: AxeBuilder} = await import(pathToFileURL(resolve(process.env.AXE_MODULE)).href);
const base = 'http://127.0.0.1:18080', artifacts = '/tmp/lumina-food-showcase';
await mkdir(artifacts, {recursive: true});
const browser = await chromium.launch();
const contexts = [], errors = [], mutations = [], external = [];
let checks = 0;
async function check(name, work) { await work(); checks++; console.log('PASS ' + name); }
async function open(options = {}) {
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}, ...options});
  contexts.push(context);
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== base) {external.push(url.origin); return route.abort();}
    if (!['GET', 'HEAD'].includes(route.request().method())) mutations.push(url.pathname);
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.getByRole('button', {name: 'Find a table', exact: true}).waitFor();
  return page;
}
async function gallery(page) {
  const region = page.getByRole('region', {name: 'A taste of the evening.'});
  await region.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  return region;
}
async function running(page) {
  return page.locator('#food-showcase').evaluate(e => e.getAnimations({subtree: true}).filter(a => a.effect?.target.closest('.food-gallery') && a.playState === 'running').length);
}
async function transforms(page) {
  return page.locator('.food-track').evaluateAll(nodes => nodes.map(e => getComputedStyle(e).transform));
}
try {
  const page = await open();
  let region;
  await check('Guests can discover a labelled food gallery and locally loaded food photographs', async () => {
    assert.equal(await page.getByRole('region', {name: 'A taste of the evening.'}).count(), 1, 'Guest page must expose the food showcase');
    region = await gallery(page);
    const photos = region.locator('figure:not([aria-hidden=true]) img');
    assert.equal(await photos.count(), 6);
    await page.waitForFunction(() => [...document.querySelectorAll('#food-showcase figure:not([aria-hidden=true]) img')].every(e => e.complete && e.naturalWidth > 0));
    assert.ok(await photos.evaluateAll(nodes => nodes.every(e => e.getAttribute('alt').length > 10 && e.currentSrc.startsWith(location.origin + '/assets/images/food-showcase/'))));
    assert.match(await region.innerText(), /inspiration/i);
  });
  await check('Gallery photos visibly move while the desktop gallery is in view', async () => {
    await page.waitForFunction(() => document.querySelector('#food-showcase').getAnimations({subtree: true}).some(a => a.playState === 'running'));
    const before = await transforms(page); await page.waitForTimeout(600);
    assert.notDeepEqual(await transforms(page), before);
  });
  await check('Keyboard Pause stops motion and Resume restarts it without losing focus', async () => {
    const pause = region.getByRole('button', {name: 'Pause motion', exact: true});
    await pause.focus(); await page.keyboard.press('Enter');
    const resume = region.getByRole('button', {name: 'Resume motion', exact: true});
    assert.equal(await resume.evaluate(e => e === document.activeElement), true);
    await page.waitForTimeout(100); const before = await transforms(page); await page.waitForTimeout(400);
    assert.deepEqual(await transforms(page), before);
    await page.keyboard.press('Enter'); await page.mouse.move(0, 0);
    await page.waitForTimeout(200); assert.ok(await running(page) > 0);
  });
  await check('Hover temporarily freezes food photos and moving away resumes them', async () => {
    await region.locator('.food-gallery').hover(); await page.waitForTimeout(100);
    const before = await transforms(page); await page.waitForTimeout(300);
    assert.deepEqual(await transforms(page), before);
    await page.mouse.move(0, 0); await page.waitForTimeout(100); assert.ok(await running(page) > 0);
  });
  await check('Keyboard entry into the desktop gallery keeps a visible unclipped focus outline', async () => {
    const control = region.getByRole('button', {name: 'Pause motion', exact: true});
    await control.focus(); await page.keyboard.press('Tab');
    const strip = region.getByRole('group', {name: 'Food inspiration photographs'});
    assert.equal(await strip.evaluate(e => e === document.activeElement && e.matches(':focus-visible')), true);
    const style = await strip.evaluate(e => { const s = getComputedStyle(e); return {mask: s.maskImage, width: parseFloat(s.outlineWidth), style: s.outlineStyle}; });
    assert.equal(style.mask, 'none', 'Fade must not clip the keyboard focus ring');
    assert.ok(style.width >= 2 && style.style !== 'none');
    await page.screenshot({path: `${artifacts}/food-keyboard-focus.png`});
    await control.focus(); await page.mouse.move(0, 0);
  });
  await check('Offscreen gallery motion stops and returns only when visible', async () => {
    await page.locator('#menu').scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
    assert.ok(await page.locator('.food-gallery').evaluate(e => e.getBoundingClientRect().bottom < 0), 'Offscreen check must actually scroll past the gallery');
    assert.equal(await running(page), 0);
    await gallery(page); await page.waitForTimeout(200); assert.ok(await running(page) > 0);
  });
  await check('Changed reduced-motion preference gives a static complete gallery', async () => {
    await page.emulateMedia({reducedMotion: 'reduce'}); await page.waitForTimeout(150);
    assert.equal(await running(page), 0);
    assert.equal(await region.getByRole('button', {name: /motion/}).count(), 0);
    await page.emulateMedia({reducedMotion: 'no-preference'}); await page.waitForTimeout(150);
    assert.ok(await running(page) > 0);
  });
  await check('Hidden-document visibility events stop motion and restore it when visible', async () => {
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {configurable: true, get: () => true});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await running(page), 0);
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(100); assert.ok(await running(page) > 0);
  });
  await check('Explicit pause survives motion preferences and viewport changes', async () => {
    await region.getByRole('button', {name: 'Pause motion'}).click();
    await page.emulateMedia({reducedMotion: 'reduce'}); await page.setViewportSize({width: 390, height: 844});
    await page.emulateMedia({reducedMotion: 'no-preference'}); await page.setViewportSize({width: 1440, height: 1000});
    await gallery(page); await page.waitForTimeout(150);
    assert.equal(await running(page), 0);
    assert.ok(await region.getByRole('button', {name: 'Resume motion'}).isVisible());
  });
  for (const width of [320, 390, 768, 1440]) {
    await check(`${width}px gallery fits the page and passes automated A/AA checks`, async () => {
      await page.setViewportSize({width, height: 1000}); await gallery(page);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      const result = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      assert.deepEqual(result.violations.map(v => ({id: v.id, targets: v.nodes.map(n => n.target)})), []);
      await page.screenshot({path: `${artifacts}/food-${width}.png`});
    });
  }
  await check('Mobile gallery can be browsed using the keyboard without autoplay', async () => {
    await page.setViewportSize({width: 390, height: 844}); await gallery(page);
    const strip = region.getByRole('group', {name: 'Food inspiration photographs'});
    await strip.focus(); const before = await strip.evaluate(e => e.scrollLeft);
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250);
    assert.ok(await strip.evaluate(e => e.scrollLeft) > before);
    assert.equal(await running(page), 0);
  });
  await check('Explore the menu reaches the real catalog and retains category selection', async () => {
    await region.getByRole('link', {name: 'Explore the menu', exact: true}).click();
    assert.equal(new URL(page.url()).hash, '#menu');
    const catalog = (await (await fetch(base + '/api/catalog')).json()).catalog;
    assert.equal(await page.locator('.menu-item').count(), catalog.menu.length);
    await page.locator('#menu-categories button').nth(1).click();
    const category = catalog.categories[0];
    assert.equal(await page.locator('.menu-item').count(), catalog.menu.filter(i => Number(i.category_id) === Number(category.id)).length);
    assert.equal(await page.locator('#menu-categories button').nth(1).evaluate(e => e === document.activeElement), true);
  });
  await check('Failed food images retain readable captions, menu navigation and booking access', async () => {
    const failure = await open();
    await failure.route('**/assets/images/food-showcase/*', route => route.abort());
    await failure.reload(); const failedRegion = await gallery(failure);
    assert.ok(await failedRegion.getByRole('link', {name: 'Explore the menu', exact: true}).isVisible());
    assert.equal(await failedRegion.locator('figure:not([aria-hidden=true]) figcaption').count(), 6);
    await failure.locator('#booking').scrollIntoViewIfNeeded();
    assert.ok(await failure.getByRole('button', {name: 'Find a table', exact: true}).isEnabled());
  });
  await check('Missing observer support leaves a static usable gallery', async () => {
    const fallback = await open();
    await fallback.context().addInitScript(() => { window.IntersectionObserver = undefined; });
    await fallback.reload(); await gallery(fallback); assert.equal(await running(fallback), 0);
    assert.equal(await fallback.getByRole('button', {name: /motion/}).count(), 0);
  });
  await check('JavaScript-disabled browsing retains the photos, credits and menu link', async () => {
    const staticPage = await browser.newPage({javaScriptEnabled: false, viewport: {width: 1440, height: 1000}});
    try {
      await staticPage.goto(base); const staticRegion = await gallery(staticPage);
      assert.equal(await staticRegion.locator('figure').count(), 6);
      assert.ok(await staticRegion.getByRole('link', {name: 'Explore the menu', exact: true}).isVisible());
      assert.equal(await staticRegion.getByRole('button', {name: /motion/}).count(), 0);
      await staticRegion.getByText('Photography credits', {exact: true}).click();
      assert.ok(await staticRegion.getByRole('link', {name: 'Pexels License'}).isVisible());
    } finally { await staticPage.close(); }
  });
  await check('Private booking management does not start a hidden food gallery', async () => {
    await page.goto(base + '/manage');
    assert.equal(await page.locator('#food-showcase').isVisible(), false);
    assert.equal(await running(page), 0);
  });
  await check('Browsing food creates no holds or bookings and needs no external requests', async () => {
    assert.deepEqual(mutations, []); assert.deepEqual(external, []); assert.deepEqual(errors, []);
  });
  console.log(`Food showcase browser verification passed: ${checks} checks.`);
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
