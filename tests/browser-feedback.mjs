import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

if (process.env.BOOKING_TEST_MODE !== 'isolated') throw new Error('Feedback checks require the isolated stack');
const {chromium} = await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const {default: AxeBuilder} = await import(pathToFileURL(resolve(process.env.AXE_MODULE)).href);
const base = 'http://127.0.0.1:18080', artifacts = '/tmp/ui-effects-e1';
await mkdir(artifacts, {recursive: true});
const browser = await chromium.launch(), contexts = [], errors = [];
let checks = 0;
async function check(name, work) { await work(); checks++; console.log('PASS ' + name); }
async function pageFor(options = {}) {
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce', ...options});
  contexts.push(context);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => errors.push(e.message));
  return page;
}
function fixture(file, data) {
  return JSON.parse(execFileSync('docker', ['compose', '-f', 'docker-compose.test.yml', 'exec', '-T', '-u', 'www-data', 'app', 'php', file], {input: JSON.stringify(data), stdio: ['pipe', 'pipe', 'pipe']}).toString());
}
// Hold a genuine HTTP response to inspect pending states without substituting fake data.
async function gate(page, pattern) {
  let release, entered, completed;
  const blocked = new Promise(r => release = r), started = new Promise(r => entered = r), done = new Promise(r => completed = r);
  let requests = 0;
  const handler = async route => {
    requests++;
    try {
      const response = await route.fetch();
      entered();
      await blocked;
      await route.fulfill({response});
    } finally { completed(); }
  };
  await page.route(pattern, handler);
  return {started, get requests() {return requests;}, async finish() {release(); await done; await page.unroute(pattern, handler);}};
}
const catalog = (await (await fetch(base + '/api/catalog')).json()).catalog;
const day = new Date(catalog.today + 'T12:00:00Z');
day.setUTCDate(day.getUTCDate() + 42);
while (day.getUTCDay() !== 2) day.setUTCDate(day.getUTCDate() + 1);
const date = day.toISOString().slice(0, 10);
async function searchPage(page) {
  await page.goto(base);
  await page.getByLabel('Date · Manila time').fill(date);
  await page.getByLabel('Room preference').selectOption('common');
}
async function activate(page, invitation) {
  await page.goto(base + invitation.activation_path);
  await page.getByLabel('New password', {exact: true}).fill('Isolated feedback passphrase 2026!');
  await page.getByLabel('Confirm new password', {exact: true}).fill('Isolated feedback passphrase 2026!');
  await page.getByRole('button', {name: 'Activate account', exact: true}).click();
  await page.waitForURL(/\/(admin|server|kitchen)$/);
}
try {
  const page = await pageFor();
  await searchPage(page);
  const submit = page.locator('.search-form button[type=submit]');
  const initial = await submit.boundingBox();
  const delayed = await gate(page, '**/api/availability?*');
  await submit.click();
  await delayed.started;
  await check('Search identifies pending work and disables submission', async () => {
    assert.equal(await submit.getAttribute('aria-label'), 'Checking tables…');
    assert.equal(await submit.getAttribute('aria-busy'), 'true');
    assert.equal(await submit.isDisabled(), true);
    assert.equal(await submit.evaluate(e => getComputedStyle(e).cursor), 'wait');
  });
  await check('Pending label preserves the button width and height', async () => {
    const box = await submit.boundingBox();
    assert.ok(Math.abs(box.width - initial.width) < 1);
    assert.ok(Math.abs(box.height - initial.height) < 1);
  });
  await page.locator('.response-skeleton').waitFor();
  await check('Slow search has stationary placeholders and no invented bookable slots', async () => {
    assert.equal(await page.locator('.response-skeleton').getAttribute('aria-hidden'), 'true');
    assert.equal(await page.locator('.response-skeleton').evaluate(e => getComputedStyle(e).animationName), 'none');
    assert.equal(await page.locator('.slot').count(), 0);
    assert.equal(await page.locator('.response-loading').evaluate(e => e.parentNode.getAttribute('aria-busy')), 'true');
  });
  await page.locator('.search-form').dispatchEvent('submit');
  await check('Repeated form submission while pending sends one search request', async () => assert.equal(delayed.requests, 1));
  await page.locator('#booking').screenshot({path: artifacts + '/pending-search.png'});
  await delayed.finish();
  await page.locator('.table-picker').waitFor();
  await check('Actual availability restores the original button and clears loading state', async () => {
    assert.equal(await submit.textContent(), 'Find a table');
    assert.equal(await submit.isDisabled(), false);
    assert.equal(await submit.getAttribute('aria-busy'), null);
    assert.equal(await page.locator('.response-skeleton,.response-loading').count(), 0);
    assert.equal(await page.locator('[aria-busy=true]').count(), 0);
  });
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.evaluate(() => {
    window.addedSkeletons = 0;
    new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes)
        if (node.nodeType === 1 && node.matches('.response-skeleton')) window.addedSkeletons++;
    }).observe(document.body, {subtree: true, childList: true});
  });
  await submit.click();
  await page.locator('.table-picker').waitFor();
  await check('Fast real response completes without waiting for a placeholder timer', async () => {
    assert.equal(await submit.getAttribute('aria-busy'), null);
    assert.equal(await page.evaluate(() => window.addedSkeletons), 0);
  });
  await page.clock.runFor(250);
  await check('A finished request cannot leave a delayed placeholder behind', async () => assert.equal(await page.locator('.response-skeleton').count(), 0));
  await page.route('**/api/availability?*', route => route.abort());
  await submit.click();
  await page.locator('#feedback:not([hidden])').waitFor();
  await check('Network failure stays readable and restores controls and error focus', async () => {
    assert.match(await page.locator('#feedback').innerText(), /Connection interrupted/);
    assert.equal(await page.locator('#feedback').getAttribute('role'), 'alert');
    assert.equal(await page.locator('#feedback').evaluate(e => e === document.activeElement), true);
    assert.equal(await submit.isDisabled(), false);
    assert.equal(await page.locator('.response-loading').count(), 0);
  });
  await page.clock.runFor(10000);
  await check('Errors persist instead of disappearing on a timer', async () => assert.equal(await page.locator('#feedback').isVisible(), true));
  await page.unroute('**/api/availability?*');
  await submit.click();
  await page.locator('.table-picker').waitFor();
  await check('Search recovers from failure without a reload', async () => assert.equal(await page.locator('#feedback').isHidden(), true));
  await page.clock.resume();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({width, height: 1000});
    await check('Shared response layout fits ' + width + 'px', async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false));
  }
  await check('Reduced motion disables the new button transitions', async () => assert.equal(await submit.evaluate(e => getComputedStyle(e).transitionDuration), '0s'));
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await check('Normal motion uses shared response timings', async () => assert.match(await submit.evaluate(e => getComputedStyle(e).transitionDuration), /0\.14s/));
  const touch = await pageFor({viewport: {width: 390, height: 900}, hasTouch: true, isMobile: true});
  await searchPage(touch);
  await touch.locator('.search-form button[type=submit]').tap();
  await touch.locator('.table-picker').waitFor();
  await check('Touch users can search and select without hover', async () => {
    await touch.locator('.slot').first().tap();
    assert.equal(await touch.locator('.slot[aria-pressed=true]').count(), 1);
  });
  const invitations = fixture('tests/staff-fixture.php', {action: 'prepare'});
  const orders = fixture('tests/order-fixture.php', {action: 'prepare'});
  const admin = await pageFor();
  await activate(admin, invitations.admin);
  await admin.getByRole('button', {name: 'Sign out', exact: true}).click();
  await admin.waitForURL(base + '/staff/login');
  await admin.getByLabel('Staff email', {exact: true}).fill('p5-http-admin@lumina.test');
  await admin.getByLabel('Password', {exact: true}).fill('Isolated feedback passphrase 2026!');
  const login = await gate(admin, '**/api/auth/login');
  await admin.getByRole('button', {name: 'Sign in', exact: true}).click();
  await login.started;
  await check('Sign-in shows its own pending label and rejects duplicate form submission', async () => {
    assert.equal(await admin.getByRole('button', {name: 'Signing in…', exact: true}).isDisabled(), true);
    await admin.locator('.auth-card form').dispatchEvent('submit');
    assert.equal(login.requests, 1);
  });
  await login.finish();
  await admin.waitForURL(base + '/admin');
  await admin.getByRole('button', {name: 'New reservation', exact: true}).click();
  const dlg = admin.getByRole('dialog');
  await dlg.getByLabel('Date · Manila', {exact: true}).fill(date);
  const inventory = await gate(admin, '**/api/admin/availability?*');
  await dlg.getByRole('button', {name: 'Find available tables', exact: true}).click();
  await inventory.started;
  await dlg.locator('.response-skeleton').waitFor();
  await check('Host availability uses the same pending and loading states', async () => assert.equal(await dlg.getByRole('button', {name: 'Checking tables…', exact: true}).isDisabled(), true));
  await inventory.finish();
  await dlg.locator('.options input').first().waitFor();
  await admin.getByRole('button', {name: 'Close dialog', exact: true}).click();
  const server = await pageFor();
  await activate(server, invitations.server);
  await server.getByRole('button', {name: 'Open order #' + orders.orders[0].id, exact: true}).click();
  await server.getByRole('heading', {name: 'Order #' + orders.orders[0].id, exact: true}).waitFor();
  if (await server.getByRole('button', {name: 'Claim order', exact: true}).count()) {
    await server.getByRole('button', {name: 'Claim order', exact: true}).click();
    await server.getByRole('button', {name: 'Add dish', exact: true}).waitFor();
  }
  await server.getByLabel('Dish', {exact: true}).selectOption({index: 1});
  const mutation = await gate(server, '**/api/service/orders/action');
  await server.getByRole('button', {name: 'Add dish', exact: true}).click();
  await mutation.started;
  await check('Server order mutation exposes pending work and prevents a duplicate POST', async () => {
    assert.equal(await server.getByRole('button', {name: 'Adding…', exact: true}).isDisabled(), true);
    await server.locator('.order-form').last().dispatchEvent('submit');
    assert.equal(mutation.requests, 1);
    assert.equal(await server.locator('#service-dialog-feedback.success:not([hidden])').count(), 0);
  });
  await mutation.finish();
  await server.locator('#service-dialog-feedback.success:not([hidden])').waitFor();
  await check('Real saved order produces persistent polite success feedback without taking focus', async () => {
    const feedback = server.locator('#service-dialog-feedback');
    assert.equal(await feedback.innerText(), 'Dish added to the order.');
    assert.equal(await feedback.getAttribute('role'), 'status');
    assert.equal(await feedback.getAttribute('aria-live'), 'polite');
    assert.equal(await feedback.evaluate(e => e === document.activeElement), false);
    const saved = await server.context().request.get(base + '/api/service/order?id=' + orders.orders[0].id);
    assert.equal((await saved.json()).order.items.length, 1);
  });
  await server.getByLabel('Dish', {exact: true}).selectOption({index: 1});
  await server.route('**/api/service/orders?*', route => route.abort());
  await server.getByRole('button', {name: 'Add dish', exact: true}).click();
  await server.locator('#service-dialog-feedback[data-kind=info]:not([hidden])').waitFor();
  await check('A saved action followed by refresh failure reports the saved state inside its dialog', async () => {
    assert.match(await server.locator('#service-dialog-feedback').innerText(), /Change saved.*could not load/);
    assert.equal(await server.locator('#service-dialog-feedback').getAttribute('role'), 'status');
    assert.equal(await server.getByRole('button', {name: 'Retry same request'}).count(), 0);
    const saved = await server.context().request.get(base + '/api/service/order?id=' + orders.orders[0].id);
    assert.equal((await saved.json()).order.items.reduce((sum, item) => sum + Number(item.qty), 0), 2);
  });
  await server.unroute('**/api/service/orders?*');
  for (const p of [page, admin, server]) {
    const audit = await new AxeBuilder({page: p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    await check('Response state accessibility at ' + new URL(p.url()).pathname, async () => assert.deepEqual(audit.violations.map(v => v.id), []));
  }
  await check('No JavaScript errors in feedback workflows', async () => assert.deepEqual(errors, []));
  console.log('Shared feedback: ' + checks + ' checks passed.');
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
