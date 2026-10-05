# Local verification

Run commands from the repository folder. PHP and database tests execute in Docker; browser tools run in a temporary folder on the laptop. The main database is never the target of destructive fixtures.

## Existing P3–P6 regression gates

```bash
docker compose -f docker-compose.test.yml up -d --build --wait
docker compose -f docker-compose.test.yml exec -T app php bin/setup-test-db.php
docker compose -f docker-compose.test.yml exec -T app php bin/test-booking.php
docker compose -f docker-compose.test.yml exec -T app php bin/test-management.php
docker compose -f docker-compose.test.yml exec -T app php bin/test-staff.php
docker compose -f docker-compose.test.yml exec -T app php bin/test-orders.php
BOOKING_TEST_MODE=isolated node tests/http-booking.mjs
BOOKING_TEST_MODE=isolated node tests/http-management.mjs
BOOKING_TEST_MODE=isolated node tests/http-staff.mjs
BOOKING_TEST_MODE=isolated node tests/http-orders.mjs
```

Run resetting suites **sequentially**. They share `tablebook_p3_test`; concurrent fixture resets invalidate each other's results. Existing gates total 184 MySQL, HTTP and browser scenarios. Main `bin/verify-db.php` uses temporary writes rolled back by a transaction; never substitute a resetting test for that verifier.

## Browser tools

Install development tools outside the repository:

```bash
npm install --prefix /tmp/lumina-browser playwright @axe-core/playwright
/tmp/lumina-browser/node_modules/.bin/playwright install chromium
export PLAYWRIGHT_MODULE=/tmp/lumina-browser/node_modules/playwright/index.mjs
export AXE_MODULE=/tmp/lumina-browser/node_modules/@axe-core/playwright/dist/index.mjs
export BOOKING_TEST_MODE=isolated
node tests/browser-booking.mjs
node tests/browser-staff.mjs
node tests/browser-orders.mjs
node tests/browser-readiness.mjs
```

Chromium needs operating-system libraries. On Marvin's current Ubuntu laptop the temporary extraction is `/tmp/lumina-browser/libs/usr/lib/x86_64-linux-gnu`; prefix browser commands with `LD_LIBRARY_PATH=/tmp/lumina-browser/libs/usr/lib/x86_64-linux-gnu` if needed. A new machine must install the libraries Playwright reports missing using its documented setup. Temporary tooling may disappear after a reboot; reinstall it for development verification. The actual application needs neither Node nor Playwright.

The readiness test blocks all external HTTP(S) browser requests while permitting the exact local app origin. It verifies local assets, accessibility rules and 320px reflow, keyboard focus and a single booking's guest → host → server → kitchen → completed MySQL lifecycle. Its isolated arrival fixture skips the real waiting interval, without changing live policy. Fixtures clear only guarded verification booking/order data and privately activate fake staff; do not log invitation results.

To run the same readiness check on the disposable demo after `bash bin/demo.sh up`:

```bash
READINESS_DEMO=1 node tests/browser-readiness.mjs
```

This clears the disposable demo's booking/order verification data. Never point it at the main stack. The test fixes its allowed ports and verifies database/environment guards in the PHP fixture. Screenshots are stored under `/tmp/restaurant-readiness` unless `BROWSER_ARTIFACT_DIR` is set.

## Health and syntax

```bash
docker compose exec -T app php bin/lint.php
bash -n bin/demo.sh
bash bin/smoke.sh
bash bin/smoke.sh http://localhost:18080
docker compose exec -T app php bin/verify-db.php
git diff --check
```

Accessibility references: [W3C reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), and [axe-core's automated testing scope](https://github.com/dequelabs/axe-core). Automated checks cover the tested states; they are not full accessibility certification. Perform a hands-on keyboard, zoom and offline rehearsal before presenting.
