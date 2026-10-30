import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
if (process.env.BOOKING_TEST_MODE !== 'isolated') throw new Error('Guest motion checks require the isolated stack');
const {chromium} = await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const {default: AxeBuilder} = await import(pathToFileURL(resolve(process.env.AXE_MODULE)).href);
const base = 'http://127.0.0.1:18080', artifacts = '/tmp/ui-effects-e2';
await mkdir(artifacts, {recursive: true});
execFileSync('docker', ['compose', '-f', 'docker-compose.test.yml', 'exec', '-T', '-u', 'www-data', 'app', 'php', 'tests/order-fixture.php'], {input: JSON.stringify({action: 'prepare'}), stdio: ['pipe', 'ignore', 'pipe']});
const browser = await chromium.launch(), contexts = [], errors = [], owned = [];
let checks = 0;
async function check(name, work) {await work(); checks++; console.log('PASS ' + name);}
async function makePage({fallback = false, reducedMotion = 'no-preference'} = {}) {
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}, reducedMotion});
  contexts.push(context);
  await context.addInitScript(({fallback}) => {
    window.motionEvents = [];
    if (fallback) { Element.prototype.animate = undefined; return; }
    const animate = Element.prototype.animate;
    Element.prototype.animate = function(frames, options) {
      const animation = animate.call(this, frames, options);
      const event = {target: this.id || this.className || this.tagName, duration: options.duration, status: 'running'};
      window.motionEvents.push(event);
      if (window.pauseGuestMotion) animation.pause();
      animation.finished.then(() => event.status = 'finished', () => event.status = 'cancelled');
      return animation;
    };
  }, {fallback});
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => errors.push(e.message));
  return page;
}
const catalog = (await (await fetch(base + '/api/catalog')).json()).catalog;
const day = new Date(catalog.today + 'T12:00:00Z');
day.setUTCDate(day.getUTCDate() + 49);
while (day.getUTCDay() !== 2) day.setUTCDate(day.getUTCDate() + 1);
const date = day.toISOString().slice(0, 10);
async function search(page, party = 2, room = 'common') {
  await page.getByLabel('Room preference').selectOption('any');
  await page.getByLabel('Guests', {exact: true}).selectOption(String(party));
  await page.getByLabel('Room preference').selectOption(room);
  await page.getByLabel('Date · Manila time').fill(date);
  await page.getByRole('button', {name: 'Find a table', exact: true}).click();
  await page.locator('.table-picker').waitFor();
}
async function details(page) {
  await page.getByRole('button', {name: 'Continue with this table', exact: true}).click();
  await page.getByLabel('Full name', {exact: true}).waitFor();
}
const draft = {full_name: 'Motion verification guest', phone: '+639000000030', email: 'motion@lumina.test', special_requests: 'Keep this note when choosing a different table.'};
async function fillDetails(page) {
  for (const [name, value] of Object.entries(draft)) await page.locator('.details-form [name="' + name + '"]').fill(value);
}
async function captureBooking(page) {
  const path = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lumina.guest.v1')).managePath);
  owned.push({context: page.context(), path});
  return path;
}
async function animations(page, target) {
  return page.evaluate(target => window.motionEvents.filter(e => e.target === target), target);
}
async function gateImage(page, filename) {
  let release, entered, completed;
  const blocked = new Promise(r => release = r), started = new Promise(r => entered = r), done = new Promise(r => completed = r);
  const pattern = '**/assets/images/table-showcase/' + filename;
  const handler = async route => { try {const response = await route.fetch(); entered(); await blocked; await route.fulfill({response});} finally {completed();} };
  await page.route(pattern, handler);
  return {started, async finish() {release(); await done; await page.unroute(pattern, handler);}};
}
try {
  const page = await makePage();
  await page.goto(base + '/reserve');
  await page.getByRole('button', {name: 'Find a table', exact: true}).waitFor();
  await check('Hero headline has one short entrance and the initial booking form stays immediately usable', async () => {
    const hero = await animations(page, 'hero-title');
    assert.equal(hero.length, 1); assert.ok(hero[0].duration <= 400);
    assert.equal(await page.getByRole('button', {name: 'Find a table', exact: true}).isEnabled(), true);
    assert.equal((await animations(page, 'flow')).length, 0);
  });
  await page.evaluate(() => window.pauseGuestMotion = true);
  const categories = page.locator('#menu-categories button');
  await categories.nth(1).click();
  await categories.nth(2).click();
  await check('Rapid menu switching cancels the prior fade and keeps the latest category focused', async () => {
    assert.equal(await categories.nth(2).evaluate(e => e === document.activeElement), true);
    assert.equal(await categories.nth(2).getAttribute('aria-pressed'), 'true');
    const events = await animations(page, 'menu-items');
    assert.equal(events.length, 2); assert.equal(events[0].status, 'cancelled'); assert.equal(events[1].duration, 140);
    assert.equal(await page.locator('#menu-items').evaluate(e => e.getAnimations().length), 1);
  });
  await check('Menu announces its category/count once and does not stagger individual dishes', async () => {
    const label = await categories.nth(2).innerText();
    assert.equal(await page.locator('#menu-categories + [role=status]').innerText(), `${label}: ${await page.locator('.menu-item').count()} dishes shown.`);
    assert.equal(await page.locator('.menu-item').evaluateAll(nodes => nodes.some(n => n.getAnimations().length)), false);
  });
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.waitForFunction(() => document.querySelector('#menu-items').getAnimations().length === 0);
  await check('Changing motion preference cancels active effects without hiding content', async () => {
    assert.equal(await page.locator('#menu-items').evaluate(e => e.getAnimations().length), 0);
    assert.equal(await page.locator('#menu-items').evaluate(e => getComputedStyle(e).opacity), '1');
  });
  const count = (await animations(page, 'menu-items')).length;
  await categories.nth(3).focus(); await page.keyboard.press('Enter');
  await check('Reduced-motion keyboard menu selection stays static and focused', async () => {
    assert.equal((await animations(page, 'menu-items')).length, count);
    assert.equal(await categories.nth(3).evaluate(e => e === document.activeElement), true);
  });
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await search(page);
  await page.locator('.floor-table[data-table=C7]').click();
  await page.waitForFunction(() => document.querySelector('.showcase-details .showcase-badge')?.dataset.state === 'available');
  await page.getByRole('button', {name: 'Use this table', exact: true}).click();
  await page.locator('#table-showcase').waitFor({state: 'hidden'});
  await page.waitForFunction(() => document.querySelector('.table-option input:checked') === document.activeElement);
  await check('Explicit showcase selection returns focus to the selected radio and acknowledges selection', async () => {
    assert.equal(await page.locator('.table-option input:checked').evaluate(e => e === document.activeElement), true);
    assert.match(await page.locator('.table-picker > [role=status]').innerText(), /selected.*Continue to hold/);
  });
  await details(page);
  await check('Details transition focuses its visible heading immediately while the panel animation is paused', async () => {
    assert.equal(await page.locator('#flow-title').innerText(), 'Your details');
    assert.equal(await page.locator('#flow-title').evaluate(e => e === document.activeElement), true);
    assert.equal(await page.locator('#flow-title').evaluate(e => {const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight;}), true);
    const events = await animations(page, 'flow'); assert.equal(events.at(-1).duration, 180);
    assert.equal(await page.locator('#flow').evaluate(e => e.getAnimations()[0].playState), 'paused');
    assert.equal(await page.getByLabel('Full name', {exact: true}).isEditable(), true);
  });
  await fillDetails(page);
  await page.getByRole('button', {name: 'Choose another table', exact: true}).click();
  await page.getByRole('button', {name: 'Find a table', exact: true}).waitFor();
  await check('Back interrupts the old panel, removes its form and focuses the search heading', async () => {
    assert.equal(await page.locator('.details-form').count(), 0);
    assert.equal(await page.locator('#flow-title').evaluate(e => e === document.activeElement), true);
    assert.equal(await page.locator('#flow-title').innerText(), 'Reserve a table');
    assert.ok((await animations(page, 'flow')).some(e => e.status === 'cancelled'));
  });
  await search(page); await details(page);
  await check('Choosing another table preserves all typed guest details in the same page', async () => {
    for (const [name, value] of Object.entries(draft)) assert.equal(await page.locator('.details-form [name="' + name + '"]').inputValue(), value);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('lumina.guest.v1').includes('Motion verification guest')), false);
  });
  await page.getByRole('button', {name: 'Confirm reservation', exact: true}).click();
  await page.locator('.confirmation-title').waitFor();
  const privatePath = await captureBooking(page);
  await check('Real confirmation is visible and focused without waiting for animation completion', async () => {
    assert.equal(await page.locator('.status').innerText(), 'Confirmed');
    assert.equal(await page.locator('#flow-title').evaluate(e => e === document.activeElement), true);
    assert.equal(await page.locator('.details-form').count(), 0);
    assert.equal(await page.locator('#flow').evaluate(e => e.getAnimations()[0].playState), 'paused');
  });
  await check('Hero does not replay while searching, going Back or confirming', async () => assert.equal((await animations(page, 'hero-title')).length, 1));
  await page.getByRole('button', {name: 'Make another reservation', exact: true}).click();
  await search(page, 13, 'group'); await details(page);
  await check('A new reservation clears the previous guest draft', async () => assert.equal(await page.getByLabel('Full name', {exact: true}).inputValue(), ''));
  await fillDetails(page);
  await page.getByRole('button', {name: 'Submit booking request', exact: true}).click();
  await page.locator('.confirmation-title').waitFor(); await captureBooking(page);
  await check('Large-party transition retains pending approval rather than showing a confirmed booking', async () => {
    assert.equal(await page.locator('.status').innerText(), 'Awaiting manager approval');
    assert.equal(await page.locator('.confirmation-title').innerText(), 'Your request is in.');
    assert.equal(await page.locator('#flow-title').innerText(), 'Your reservation');
  });
  const manage = await makePage();
  await manage.goto(base + privatePath);
  await manage.getByRole('button', {name: 'Change reservation', exact: true}).waitFor();
  await check('Initial private management load has no hero or forced panel entrance', async () => assert.deepEqual(await manage.evaluate(() => window.motionEvents), []));
  await manage.evaluate(() => window.pauseGuestMotion = true);
  await manage.getByRole('button', {name: 'Change reservation', exact: true}).click();
  await check('Management editing uses a scoped entrance and immediate heading focus', async () => {
    assert.equal(await manage.locator('#manage-title').innerText(), 'Change reservation');
    assert.equal(await manage.locator('#manage-title').evaluate(e => e === document.activeElement), true);
    assert.equal((await animations(manage, 'management')).at(-1).duration, 180);
  });
  await manage.getByRole('button', {name: 'Back to my booking', exact: true}).click();
  await manage.getByRole('button', {name: 'Change reservation', exact: true}).focus();
  const old = await manage.getByRole('button', {name: 'Change reservation', exact: true}).elementHandle();
  const before = (await animations(manage, 'management')).length;
  await manage.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await manage.waitForFunction(e => !e.isConnected, old);
  await check('Passive management refresh preserves logical focus and does not replay entrances', async () => {
    assert.equal(await manage.getByRole('button', {name: 'Change reservation', exact: true}).evaluate(e => e === document.activeElement), true);
    assert.equal((await animations(manage, 'management')).length, before);
  });
  await manage.emulateMedia({reducedMotion: 'reduce'});
  await manage.getByRole('button', {name: 'Change reservation', exact: true}).click();
  await check('Management remains immediately usable with reduced motion', async () => {
    assert.equal(await manage.locator('#management').evaluate(e => e.getAnimations().length), 0);
    assert.equal(await manage.getByLabel('Guests', {exact: true}).isEnabled(), true);
  });
  const pictures = await makePage({reducedMotion: 'reduce'});
  await pictures.goto(base + '/reserve'); await pictures.locator('.room-card').last().waitFor();
  const delayed = await gateImage(pictures, 'V2.jpg');
  await pictures.locator('.room-card[data-room-type=vip]').click();
  await pictures.waitForFunction(() => document.querySelector('.showcase-hero')?.getAttribute('aria-busy') === 'false' && document.querySelector('.showcase-hero img.is-ready'));
  await pictures.getByRole('button', {name: 'Next table', exact: true}).click(); await delayed.started;
  await pictures.getByRole('button', {name: 'Next table', exact: true}).click();
  await pictures.waitForFunction(() => document.querySelector('.showcase-hero')?.getAttribute('aria-busy') === 'false' && document.querySelector('.showcase-hero img.is-ready'));
  await delayed.finish();
  await check('A late table image cannot replace the latest picture, title or caption', async () => {
    assert.equal(await pictures.locator('#table-showcase-title').innerText(), 'Table V3');
    assert.match(await pictures.locator('.showcase-hero img').getAttribute('src'), /V3.jpg$/);
    assert.match(await pictures.locator('.showcase-hero + p').innerText(), /^V3/);
  });
  await pictures.getByRole('button', {name: 'Close table showcase', exact: true}).click();
  const reopening = await gateImage(pictures, 'V1.jpg');
  await pictures.locator('.room-card[data-room-type=vip]').click(); await reopening.started;
  await pictures.keyboard.press('Escape');
  await pictures.locator('.room-card[data-room-type=terrace]').click();
  await pictures.waitForFunction(() => document.querySelector('.showcase-hero')?.getAttribute('aria-busy') === 'false' && document.querySelector('.showcase-hero img.is-ready'));
  await reopening.finish();
  await check('Closing and reopening during image loading keeps the new room and picture', async () => {
    assert.equal(await pictures.locator('#table-showcase-title').innerText(), 'Table T1');
    assert.match(await pictures.locator('.showcase-hero img').getAttribute('src'), /T1.jpg$/);
  });
  await pictures.locator('.showcase-hero img').evaluate(img => img.src = '/assets/images/table-showcase/motion-missing.jpg');
  await pictures.locator('.showcase-hero svg').waitFor();
  await check('Image failure keeps the seating fallback and visible navigation controls', async () => {
    assert.equal(await pictures.getByRole('button', {name: 'Next table', exact: true}).isEnabled(), true);
    assert.match(await pictures.locator('.showcase-hero + p').innerText(), /Picture unavailable/);
  });
  await pictures.keyboard.press('Escape');
  await check('Escape returns focus to the exact room opener after interrupted loading', async () => assert.equal(await pictures.locator('.room-card[data-room-type=terrace]').evaluate(e => e === document.activeElement), true));
  const fallback = await makePage({fallback: true});
  await fallback.goto(base + '/reserve'); await search(fallback); await details(fallback);
  await check('Missing animation API leaves the actual hold/details flow static and editable', async () => {
    assert.equal(await fallback.locator('#flow').evaluate(e => e.getAnimations().length), 0);
    assert.equal(await fallback.getByLabel('Full name', {exact: true}).isEditable(), true);
    assert.equal(await fallback.locator('#flow-title').evaluate(e => e === document.activeElement), true);
  });
  await fallback.getByRole('button', {name: 'Choose another table', exact: true}).click();
  await fallback.getByRole('button', {name: 'Find a table', exact: true}).waitFor();
  for (const width of [320, 390, 768, 1440]) {
    await pictures.setViewportSize({width, height: 1000});
    await check('Guest motion layout reflows at ' + width + 'px', async () => assert.equal(await pictures.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false));
  }
  await page.emulateMedia({reducedMotion: 'reduce'});
  await pictures.setViewportSize({width: 390, height: 1000});
  for (const p of [page, manage, pictures]) {
    const audit = await new AxeBuilder({page: p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    await check('Guest motion accessibility in ' + new URL(p.url()).pathname, async () => assert.deepEqual(audit.violations.map(v => v.id), []));
  }
  await pictures.locator('#booking').screenshot({path: artifacts + '/guest-mobile.png'});
  await check('Motion interruption has no JavaScript errors', async () => assert.deepEqual(errors, []));
} finally {
  try {
    if (owned.length) await check('Owned fake bookings are cancelled through their actual private capabilities', async () => {
      for (const {context, path} of owned) {
        const params = new URLSearchParams(new URL(path, base).hash.slice(1));
        const headers = {'X-Booking-Token': params.get('token')};
        const response = await context.request.get(base + '/api/manage?code=' + params.get('code'), {headers});
        assert.equal(response.ok(), true, 'Owned booking must be readable for cleanup');
        const booking = (await response.json()).booking;
        if (booking.status !== 'cancelled') {
          const csrf = (await (await context.request.get(base + '/api/session')).json()).csrf_token;
          const cancelled = await context.request.post(base + '/api/manage/cancel', {headers: {...headers, 'X-CSRF-Token': csrf}, data: {code: booking.code, version: booking.version}});
          assert.equal(cancelled.ok(), true, 'Owned booking cleanup must succeed');
          assert.equal((await cancelled.json()).booking.status, 'cancelled');
        }
      }
    });
  } finally {
    for (const context of contexts) await context.close();
    await browser.close();
  }
}
console.log('Guest motion: ' + checks + ' checks passed.');
