import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

if (process.env.BOOKING_TEST_MODE !== 'isolated') throw new Error('Readiness requires isolated verification');
const { chromium } = await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const { default: AxeBuilder } = await import(pathToFileURL(resolve(process.env.AXE_MODULE)).href);
const demo = process.env.READINESS_DEMO === '1';
const base = demo ? 'http://127.0.0.1:8082' : 'http://127.0.0.1:18080';
const artifacts = process.env.BROWSER_ARTIFACT_DIR || '/tmp/restaurant-readiness';
await mkdir(artifacts, { recursive: true });
function fixture(data) {
  const args = demo
    ? ['compose', '--env-file', '.env.demo', '-p', 'tablebookdemo', '-f', 'docker-compose.demo.yml']
    : ['compose', '-f', 'docker-compose.test.yml'];
  return JSON.parse(execFileSync('docker', [...args, 'exec', '-T', '-u', 'www-data',
    '-e', 'BOOKING_TEST_MODE=isolated', 'app', 'php', 'tests/readiness-fixture.php'],
    { input: JSON.stringify(data), stdio: ['pipe', 'pipe', 'pipe'] }).toString());
}
const invites = fixture({ action: 'prepare' });
const browser = await chromium.launch({ headless: true });
const errors = [], outside = [], contexts = [];
let checks = 0;
async function check(name, work) { await work(); checks++; console.log('PASS ' + name); }
async function pageFor(path = '/') {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  contexts.push(context);
  // Internet is unavailable, but localhost remains reachable, as on an offline laptop.
  await context.route(/^https?:/, route => {
    if (new URL(route.request().url()).origin === base) return route.continue();
    outside.push(new URL(route.request().url()).origin);
    return route.abort('internetdisconnected');
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + path);
  return page;
}
async function audit(page, name) {
  const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  assert.deepEqual(report.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), [], name);
  checks++; console.log('PASS accessibility ' + name);
}
async function widths(page, name) {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${name}: ${width}px overflow`);
    if (width === 320) await audit(page, name + ' 320px');
  }
  checks++; console.log('PASS reflow ' + name);
}
async function activate(role) {
  const page = await pageFor(invites[role].activation_path);
  await page.getByLabel('New password', { exact: true }).waitFor();
  await audit(page, role + ' activation');
  const password = 'Isolated readiness passphrase 2026!';
  await page.getByLabel('New password', { exact: true }).fill(password);
  await page.getByLabel('Confirm new password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Activate account', exact: true }).click();
  await page.waitForURL(base + (role === 'admin' ? '/admin' : '/' + role));
  return page;
}
try {
  const guest = await pageFor();
  await guest.getByRole('button', { name: 'Find a table', exact: true }).waitFor();
  await guest.locator('.menu-item').first().waitFor();
  await audit(guest, 'guest search and menu'); await widths(guest, 'guest');
  await check('Keyboard skip link moves focus to booking', async () => {
    await guest.keyboard.press('Tab');
    await guest.keyboard.press('Enter');
    assert.equal(await guest.evaluate(() => document.activeElement.id), 'booking');
  });
  const date = new Date(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Manila' }).format(new Date()) + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + 28);
  while (date.getUTCDay() !== 2) date.setUTCDate(date.getUTCDate() + 1);
  await guest.getByLabel('Date · Manila time').fill(date.toISOString().slice(0, 10));
  await guest.getByLabel('Guests', { exact: true }).selectOption('2');
  await guest.getByLabel('Room preference').selectOption('common');
  await guest.getByRole('button', { name: 'Find a table', exact: true }).click();
  await guest.getByRole('button', { name: 'Continue with this table', exact: true }).waitFor();
  await audit(guest, 'guest availability and floor');
  await guest.getByRole('button', { name: 'Continue with this table', exact: true }).click();
  await guest.getByLabel('Full name', { exact: true }).fill('Readiness Demo Guest');
  await guest.getByLabel('Phone number', { exact: true }).fill('+639000000009');
  await guest.getByLabel('Email', { exact: true }).fill('readiness-guest@lumina.test');
  await audit(guest, 'guest details');
  await guest.getByRole('button', { name: 'Confirm reservation', exact: true }).click();
  await guest.locator('.booking-code').waitFor();
  const code = (await guest.locator('.booking-code').innerText()).trim();
  await audit(guest, 'guest confirmation');
  await guest.getByRole('link', { name: 'My booking', exact: true }).last().click();
  await guest.getByRole('button', { name: 'Cancel reservation', exact: true }).waitFor();
  await audit(guest, 'private guest management'); await widths(guest, 'guest management');
  await check('Management skip link reaches the visible booking workspace', async () => {
    await guest.locator('.skip-link').focus(); await guest.keyboard.press('Enter');
    assert.equal(await guest.evaluate(() => document.activeElement.id), 'manage-workspace');
  });
  console.log('INFO isolated arrival fixture skips waiting; production time rules unchanged');
  const arrival = fixture({ action: 'arrival', code });
  const admin = await activate('admin'), server = await activate('server'), kitchen = await activate('kitchen');
  const login = await pageFor('/staff/login');
  await login.getByLabel('Staff email', { exact: true }).waitFor(); await audit(login, 'staff login'); await widths(login, 'login');
  await admin.getByLabel('Service date', { exact: true }).fill(arrival.date);
  await admin.getByRole('button', { name: 'Refresh', exact: true }).click();
  await admin.getByRole('button', { name: 'Open ' + code, exact: true }).click();
  await audit(admin, 'host reservation dialog'); await widths(admin, 'host dialog');
  await check('Host dialog supports Escape and restores keyboard focus', async () => {
    await admin.keyboard.press('Escape');
    assert.equal(await admin.getByRole('button', { name: 'Open ' + code, exact: true }).evaluate(el => el === document.activeElement), true);
    await admin.keyboard.press('Enter');
  });
  await admin.getByRole('button', { name: 'Seat party', exact: true }).click();
  await admin.getByRole('button', { name: 'Confirm seat party', exact: true }).click();
  await admin.getByRole('dialog').waitFor({ state: 'hidden' });
  await audit(admin, 'host dashboard'); await widths(admin, 'host');
  await server.getByRole('button', { name: 'Refresh', exact: true }).click();
  const orderCard = server.locator('.order-card').filter({ hasText: code });
  await orderCard.getByRole('button', { name: /^Open order #/ }).click();
  await server.getByRole('dialog').waitFor();
  await check('Order dialog keeps page navigation modal and Escape restores focus', async () => {
    for (let i = 0; i < 8; i++) {
      await server.keyboard.press('Tab');
      assert.equal(await server.evaluate(() => !!document.activeElement.closest('dialog') ||
        (document.activeElement === document.body && !document.hasFocus())), true);
    }
    await server.locator('#service-dialog-close').focus();
    await server.keyboard.press('Escape');
    await server.getByRole('dialog').waitFor({ state: 'hidden' });
    await server.waitForFunction(() => document.activeElement?.hasAttribute('data-order-id'));
    assert.equal(await orderCard.getByRole('button', { name: /^Open order #/ }).evaluate(el => el === document.activeElement), true);
    await server.keyboard.press('Enter');
    await server.getByRole('dialog').waitFor();
  });
  await server.getByRole('button', { name: 'Claim order', exact: true }).click();
  await server.getByLabel('Dish', { exact: true }).selectOption({ index: 1 });
  await server.getByLabel('Quantity', { exact: true }).fill('2');
  await server.getByLabel('Preparation notes', { exact: true }).fill('No onion');
  await server.getByRole('button', { name: 'Add dish', exact: true }).click();
  await server.getByText('No onion', { exact: true }).waitFor();
  await audit(server, 'server food editor'); await widths(server, 'server dialog');
  await server.getByRole('button', { name: 'Send to kitchen', exact: true }).click();
  await server.getByRole('button', { name: 'Close', exact: true }).click();
  await audit(server, 'server orders'); await widths(server, 'server');
  await kitchen.getByRole('button', { name: 'Refresh', exact: true }).click();
  const ticket = kitchen.locator('.ticket').filter({ hasText: code });
  await ticket.waitFor();
  await audit(kitchen, 'kitchen ticket queue'); await widths(kitchen, 'kitchen');
  await ticket.getByRole('button', { name: 'Start preparation', exact: true }).click();
  await ticket.getByRole('button', { name: 'Mark entire ticket ready', exact: true }).click();
  await server.getByRole('button', { name: 'Refresh', exact: true }).click();
  await orderCard.getByRole('button', { name: /^Open order #/ }).click();
  await server.getByRole('button', { name: 'Mark served', exact: true }).click();
  await server.getByRole('button', { name: 'Close service', exact: true }).click();
  await server.getByRole('button', { name: 'Close', exact: true }).click();
  await admin.getByRole('button', { name: 'Refresh', exact: true }).click();
  await admin.getByRole('button', { name: 'Open ' + code, exact: true }).click();
  await admin.getByRole('button', { name: 'Complete visit', exact: true }).click();
  await admin.getByRole('button', { name: 'Confirm complete visit', exact: true }).click();
  await admin.getByRole('dialog').waitFor({ state: 'hidden' });
  await check('Same guest booking completes host, server and kitchen lifecycle in MySQL', async () => {
    const record = fixture({ action: 'verify', code });
    assert.equal(record.status, 'completed'); assert.equal(record.order_status, 'closed');
    assert.equal(record.ticket_status, 'served'); assert.equal(Number(record.line_count), 1); assert.equal(Number(record.occupied), 0);
  });
  await check('External network blocked; all live pages and actions used only local assets/APIs', async () => {
    assert.deepEqual(outside, []);
    const probe = await guest.context().newPage();
    await assert.rejects(probe.goto('https://offline-check.invalid/probe'));
    await probe.close(); assert.deepEqual(outside, ['https://offline-check.invalid']);
    assert.deepEqual(errors, []);
  });
  await kitchen.screenshot({ path: artifacts + '/kitchen.png', fullPage: true });
  console.log(`Readiness: ${checks} checks passed (automated audit is not accessibility certification).`);
} finally { for (const context of contexts) await context.close(); await browser.close(); }
