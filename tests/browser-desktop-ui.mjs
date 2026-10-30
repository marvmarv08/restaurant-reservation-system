import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
if (process.env.BOOKING_TEST_MODE !== 'isolated')
  throw Error('Desktop UI checks require the isolated test stack');
const { chromium } = await import(
  pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href
);
const { default: AxeBuilder } = await import(
  pathToFileURL(resolve(process.env.AXE_MODULE)).href
);
const base = 'http://127.0.0.1:18080',
  artifacts = '/tmp/lumina-desktop-ui';
await mkdir(artifacts, { recursive: true });
const catalog = (await (await fetch(base + '/api/catalog')).json()).catalog;
const day = new Date(catalog.today + 'T12:00:00Z');
day.setUTCDate(day.getUTCDate() + 43);
while (day.getUTCDay() !== 2) day.setUTCDate(day.getUTCDate() + 1);
const date = day.toISOString().slice(0, 10);
const selected = process.argv.find((a) => a.startsWith('--case='))?.slice(7);
const browser = await chromium.launch(),
  contexts = [],
  owned = [],
  errors = [];
let passed = 0,
  failed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log('PASS ' + name);
  } catch (e) {
    failed++;
    console.error('FAIL ' + name + '\n' + e.message);
  }
}
async function group(name, fn) {
  if (!selected || selected === name) await fn();
}
async function open(options = {}, setup) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ...options,
  });
  contexts.push(context);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (e) => errors.push(e.message));
  if (setup) await setup(page);
  await page.goto(base + '/reserve');
  await page
    .getByRole('button', { name: 'Find a table', exact: true })
    .waitFor();
  await page.evaluate(() => document.fonts.ready);
  return page;
}
async function search(page, party = 2, room = 'common') {
  await page.getByLabel('Room preference').selectOption('any');
  await page.getByLabel('Guests', { exact: true }).selectOption(String(party));
  await page.getByLabel('Room preference').selectOption(room);
  await page.getByLabel('Date · Manila time').fill(date);
  await page.getByRole('button', { name: 'Find a table', exact: true }).click();
  await page.locator('.table-picker').waitFor();
}
async function details(page) {
  await page
    .getByRole('button', { name: 'Continue with this table', exact: true })
    .click();
  await page.getByLabel('Full name', { exact: true }).waitFor();
}
async function fill(page) {
  await page
    .getByLabel('Full name', { exact: true })
    .fill('Desktop UI verification');
  await page.getByLabel('Phone number', { exact: true }).fill('+639000000014');
  await page
    .getByLabel('Email', { exact: true })
    .fill('desktop-ui@lumina.test');
}
async function remember(page) {
  owned.push({
    context: page.context(),
    path: await page.evaluate(
      () => JSON.parse(sessionStorage.getItem('lumina.guest.v1')).managePath,
    ),
  });
}
async function progress(page, current, completed) {
  assert.equal(await page.locator('.steps [aria-current=step]').count(), 1);
  assert.equal(
    await page.locator('.steps [aria-current=step]').getAttribute('id'),
    'step-' + current,
  );
  assert.deepEqual(
    await page
      .locator('.steps .completed')
      .evaluateAll((es) => es.map((e) => e.id)),
    completed.map((n) => 'step-' + n),
  );
  for (const name of completed)
    assert.match(await page.locator('#step-' + name).innerText(), /completed/i);
}
try {
  await group('layout', async () => {
    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
    ])
      await check(
        'Desktop booking controls fit and hero copy stays anchored after real search at ' +
          viewport.width +
          'px',
        async () => {
          const page = await open({ viewport, reducedMotion: 'reduce' });
          const button = await page
            .getByRole('button', { name: 'Find a table', exact: true })
            .boundingBox();
          assert.ok(
            button.y >= 0 && button.y + button.height <= viewport.height,
          );
          const before = await page
            .locator('.hero-copy')
            .evaluate((e) => e.getBoundingClientRect().top + scrollY);
          await search(page);
          const after = await page
            .locator('.hero-copy')
            .evaluate((e) => e.getBoundingClientRect().top + scrollY);
          assert.ok(
            Math.abs(after - before) < 4,
            `Hero shifted ${after - before}px`,
          );
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          );
          await page.screenshot({
            path: `${artifacts}/search-${viewport.width}.png`,
          });
          await page.close();
        },
      );
  });
  await group('fonts', async () => {
    await check(
      'Locally loaded guest fonts keep the laptop form readable',
      async () => {
        const page = await open({ viewport: { width: 1280, height: 720 } });
        const fonts = await page.evaluate(() =>
          [...document.fonts]
            .filter((f) => f.status === 'loaded')
            .map((f) => f.family.replaceAll('"', '')),
        );
        assert.ok(
          fonts.includes('Cormorant Garamond'),
          'Display font must actually load',
        );
        assert.ok(fonts.includes('Inter'), 'Body font must actually load');
        await page.screenshot({ path: artifacts + '/home-1280.png' });
        await page.close();
      },
    );
    await check(
      'Failed fonts preserve readable fallback text and immediately usable booking',
      async () => {
        const page = await open({ reducedMotion: 'reduce' }, async (p) =>
          p.route('**/assets/fonts/**', (r) => r.abort()),
        );
        assert.ok(
          await page
            .getByRole('button', { name: 'Find a table', exact: true })
            .isEnabled(),
        );
        assert.equal(
          await page
            .locator('#hero-title')
            .evaluate((e) => getComputedStyle(e).opacity),
          '1',
        );
        await search(page);
        assert.ok(
          await page
            .getByRole('button', {
              name: 'Continue with this table',
              exact: true,
            })
            .isEnabled(),
        );
        await page.close();
      },
    );
  });
  await group('navigation', async () => {
    await check(
      'Desktop navigation remains visible with truthful active section and unoccluded anchors',
      async () => {
        const page = await open({ reducedMotion: 'reduce' });
        await page.locator('.site-header a[href="/reserve#rooms"]').click();
        await page.waitForTimeout(150);
        const reserve = await page
          .locator('.site-header a[href="/reserve#booking"]')
          .boundingBox();
        assert.ok(
          reserve.y >= 0 && reserve.y + reserve.height < 120,
          'Reserve should remain in the visible header',
        );
        assert.equal(
          await page
            .locator('.site-header a[href="/reserve#rooms"]')
            .getAttribute('aria-current'),
          'location',
        );
        const header = await page.locator('.site-header').boundingBox(),
          heading = await page.locator('#rooms-title').boundingBox();
        assert.ok(
          heading.y >= header.y + header.height,
          'Room heading is covered by sticky navigation',
        );
        await page.locator('.site-header a[href="/reserve#menu"]').click();
        await page.waitForTimeout(150);
        assert.equal(
          await page
            .locator('.site-header a[href="/reserve#menu"]')
            .getAttribute('aria-current'),
          'location',
        );
        await page.getByRole('button', { name: 'Sweet', exact: true }).click();
        const menuHeading = await page
          .locator('.menu-results-heading')
          .boundingBox();
        assert.ok(
          menuHeading.y >= header.height - 1,
          'Category heading is covered',
        );
        await page.locator('.site-header a[href="/reserve#booking"]').click();
        const booking = await page.locator('#flow-title').boundingBox();
        assert.ok(booking.y >= header.height);
        await page.close();
      },
    );
  });
  await group('headings', async () => {
    const setup = async (p) =>
      p.addInitScript(() => {
        window.headingAnimations = [];
        const original = Element.prototype.animate;
        Element.prototype.animate = function (frames, timing) {
          const a = original.call(this, frames, timing);
          if (
            this.matches(
              '.hero-copy h1,.hero-copy .eyebrow,.hero-copy .hero-description,.section-heading h2',
            )
          )
            window.headingAnimations.push({
              target: this.id || this.className,
              duration: timing.duration,
              delay: timing.delay || 0,
            });
          return a;
        };
      });
    await check(
      'Heading choreography runs once without delaying controls or replaying on section revisits',
      async () => {
        const page = await open({}, setup);
        await page.waitForTimeout(450);
        const hero = await page.evaluate(() =>
          headingAnimations.filter((a) => a.target === 'hero-title'),
        );
        assert.equal(
          hero.length,
          1,
          'Headline needs its own coordinated entrance',
        );
        assert.ok(hero[0].duration <= 400);
        assert.ok(
          await page
            .getByRole('button', { name: 'Find a table', exact: true })
            .isEnabled(),
        );
        await page.locator('#rooms').scrollIntoViewIfNeeded();
        await page.waitForTimeout(450);
        await page.locator('#menu').scrollIntoViewIfNeeded();
        await page.waitForTimeout(450);
        await page.locator('#rooms').scrollIntoViewIfNeeded();
        assert.equal(
          await page.evaluate(
            () =>
              headingAnimations.filter((a) => a.target === 'rooms-title')
                .length,
          ),
          1,
        );
        await page.close();
      },
    );
    await check(
      'Reduced motion and missing animation API leave all headings and booking usable',
      async () => {
        for (const fallback of [false, true]) {
          const page = await open(
            { reducedMotion: fallback ? 'no-preference' : 'reduce' },
            async (p) => {
              await setup(p);
              if (fallback)
                await p.addInitScript(
                  () => (Element.prototype.animate = undefined),
                );
            },
          );
          await page.locator('#rooms').scrollIntoViewIfNeeded();
          assert.equal(
            await page
              .locator('#hero-title')
              .evaluate((e) => getComputedStyle(e).opacity),
            '1',
          );
          assert.ok(
            await page
              .getByRole('button', { name: 'Find a table', exact: true })
              .isEnabled(),
          );
          assert.deepEqual(await page.evaluate(() => headingAnimations), []);
          await page.close();
        }
      },
    );
  });
  await group('signature', async () => {
    const eligible = catalog.menu.find(
      (i) =>
        Number(i.is_available) &&
        JSON.parse(i.tags_json || '[]').includes('signature'),
    );
    await check(
      'Signature spotlight uses an available real dish and keeps full menu counts intact',
      async () => {
        assert.ok(eligible, 'Test catalog needs a signature dish');
        const page = await open();
        assert.equal(
          await page.locator('#signature-dish:not([hidden])').count(),
          1,
        );
        assert.equal(
          await page.locator('#signature-title').innerText(),
          eligible.name,
        );
        assert.equal(
          Number(
            (await page.locator('.signature-price').innerText()).replace(
              /[₱,\s]/g,
              '',
            ),
          ) * 100,
          Number(eligible.price_cents),
        );
        assert.equal(
          await page.locator('.signature-description').innerText(),
          eligible.description,
        );
        assert.equal(
          await page.locator('.menu-item').count(),
          catalog.menu.length,
        );
        await page.locator('#signature-dish').scrollIntoViewIfNeeded();
        await page.screenshot({ path: artifacts + '/signature.png' });
        await page.close();
      },
    );
    await check(
      'Signature photograph has enough source pixels for the larger desktop feature',
      async () => {
        const page = await open();
        assert.equal(
          await page.locator('#signature-dish:not([hidden])').count(),
          1,
        );
        await page.locator('#signature-dish').scrollIntoViewIfNeeded();
        const photo = page.locator('#signature-dish img');
        await photo.evaluate((e) => e.decode());
        const size = await photo.evaluate((e) => ({
          natural: e.naturalWidth,
          displayed: e.getBoundingClientRect().width,
        }));
        assert.ok(
          size.natural >= size.displayed,
          `Feature upscales ${size.natural}px to ${size.displayed}px`,
        );
        await page.close();
      },
    );
    await check(
      'No eligible signature dish omits the feature while the real catalog stays usable',
      async () => {
        const page = await open({}, async (p) =>
          p.route('**/api/catalog', async (r) => {
            const response = await r.fetch(),
              body = await response.json();
            body.catalog.menu = body.catalog.menu.map((i) => ({
              ...i,
              tags_json: JSON.stringify(
                JSON.parse(i.tags_json || '[]').filter(
                  (t) => t !== 'signature',
                ),
              ),
            }));
            await r.fulfill({ response, json: body });
          }),
        );
        assert.equal(
          await page.locator('#signature-dish:not([hidden])').count(),
          0,
        );
        assert.equal(await page.locator('#signature-dish').isVisible(), false);
        assert.equal(
          await page.locator('.menu-item').count(),
          catalog.menu.length,
        );
        await page.close();
      },
    );
    await check(
      'Signature image failure leaves the actual dish details and menu controls readable',
      async () => {
        const page = await open({}, async (p) =>
          p.route('**/assets/images/menu/**', (r) => r.abort()),
        );
        assert.equal(
          await page.locator('#signature-dish:not([hidden])').count(),
          1,
        );
        await page.locator('#signature-dish').scrollIntoViewIfNeeded();
        const image = page.locator('#signature-dish img');
        if (await image.count()) {
          await image.evaluate(
            (e) => (e.src = '/assets/images/menu/desktop-missing.jpg'),
          );
          await page.locator('#signature-dish .menu-image-fallback').waitFor();
        }
        assert.equal(
          await page.locator('#signature-title').innerText(),
          eligible.name,
        );
        assert.ok(
          await page
            .getByRole('button', { name: 'All dishes', exact: true })
            .isEnabled(),
        );
        await page.close();
      },
    );
  });
  await group('progress', async () => {
    execFileSync(
      'docker',
      [
        'compose',
        '-f',
        'docker-compose.test.yml',
        'exec',
        '-T',
        'app',
        'php',
        'tests/order-fixture.php',
      ],
      {
        input: JSON.stringify({ action: 'prepare' }),
        stdio: ['pipe', 'ignore', 'pipe'],
      },
    );
    const page = await open({ reducedMotion: 'reduce' });
    await check(
      'Search begins with one current step and no completed work',
      () => progress(page, 'search', []),
    );
    await search(page);
    await details(page);
    await check('A real hold completes search while details stay current', () =>
      progress(page, 'details', ['search']),
    );
    await page
      .getByRole('button', { name: 'Choose another table', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Find a table', exact: true })
      .waitFor();
    await check('Returning to search clears completed markers', () =>
      progress(page, 'search', []),
    );
    await search(page);
    await details(page);
    await fill(page);
    let sent;
    const arrived = new Promise((r) => (sent = r));
    let resume;
    const blocked = new Promise((r) => (resume = r));
    await page.route('**/api/reservations', async (route) => {
      sent();
      await blocked;
      await route.continue();
    });
    await page
      .getByRole('button', { name: 'Confirm reservation', exact: true })
      .click();
    await arrived;
    await check(
      'Pending confirmation cannot advance progress or display saved success',
      async () => {
        await progress(page, 'details', ['search']);
        assert.equal(await page.locator('.confirmation-title').count(), 0);
      },
    );
    resume();
    await page.locator('.confirmation-title').waitFor();
    await remember(page);
    await check(
      'Persisted confirmation completes earlier steps and keeps final status truthful',
      async () => {
        await progress(page, 'confirmation', ['search', 'details']);
        assert.equal(await page.locator('.status').innerText(), 'Confirmed');
        await page.reload();
        await page.locator('.confirmation-title').waitFor();
        await progress(page, 'confirmation', ['search', 'details']);
      },
    );
    await page
      .getByRole('button', { name: 'Make another reservation', exact: true })
      .click();
    await search(page, 13, 'group');
    await details(page);
    await fill(page);
    await page
      .getByRole('button', { name: 'Submit booking request', exact: true })
      .click();
    await page.locator('.confirmation-title').waitFor();
    await remember(page);
    await check(
      'Approval-required request keeps pending wording with accurate completed form steps',
      async () => {
        await progress(page, 'confirmation', ['search', 'details']);
        assert.equal(
          await page.locator('.status').innerText(),
          'Awaiting manager approval',
        );
        assert.equal(
          await page.locator('.confirmation-mark.is-confirmed').count(),
          0,
        );
      },
    );
  });
  await group('accessibility', async () => {
    await check(
      'Desktop additions keep keyboard and automated A/AA checks usable',
      async () => {
        const page = await open({ reducedMotion: 'reduce' });
        await page.locator('#menu').scrollIntoViewIfNeeded();
        const violations = (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
            .analyze()
        ).violations;
        assert.deepEqual(
          violations.map((v) => ({
            id: v.id,
            targets: v.nodes.map((n) => n.target),
          })),
          [],
        );
        await page.keyboard.press('Home');
        await page.locator('.site-header a[href="/reserve#rooms"]').focus();
        await page.keyboard.press('Enter');
        assert.ok(await page.locator('#rooms-title').isVisible());
        await page.close();
      },
    );
  });
  await check('Desktop UI has no JavaScript errors', async () =>
    assert.deepEqual(errors, []),
  );
} finally {
  for (const { context, path } of owned) {
    const params = new URLSearchParams(new URL(path, base).hash.slice(1)),
      headers = { 'X-Booking-Token': params.get('token') };
    const response = await context.request.get(
      base + '/api/manage?code=' + params.get('code'),
      { headers },
    );
    assert.ok(response.ok());
    const booking = (await response.json()).booking;
    if (booking.status !== 'cancelled') {
      const csrf = (
        await (await context.request.get(base + '/api/session')).json()
      ).csrf_token;
      const cancelled = await context.request.post(
        base + '/api/manage/cancel',
        {
          headers: { ...headers, 'X-CSRF-Token': csrf },
          data: { code: booking.code, version: booking.version },
        },
      );
      assert.ok(cancelled.ok(), 'Owned fake booking cleanup must succeed');
    }
  }
  for (const context of contexts) await context.close();
  await browser.close();
}
console.log(`Desktop UI: ${passed} passed, ${failed} failed.`);
if (failed) process.exitCode = 1;
