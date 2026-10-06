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
node tests/browser-showcase.mjs
node tests/browser-capacity.mjs
node tests/browser-feedback.mjs
node tests/browser-guest-motion.mjs
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

## Table showcase

`tests/browser-showcase.mjs` runs sequentially after other fixture suites, at the fixed isolated origin `http://127.0.0.1:18080`. It checks current catalog pictures and real database availability, blackouts, a second guest hold/release, eligibility-safe explicit selection, joined members, unknown/error/expired states, delayed responses, image failure, offline assets, keyboard, mobile reflow and motion preferences. Its blackout fixture refuses the main database and cleans only labelled verification rows. It does not reset main data or require an actual table photograph. Source, licenses and the UX decisions are in `research/07_table_showcase_research.md`.

## Linked booking capacity controls

`tests/browser-capacity.mjs` checks both interaction orders against the real public database catalog. It covers guest counts1–16, room-specific ranges, compatible-value preservation, explicit adjustment feedback, Any-room escape, legacy queries, an actual group16 availability request, stale-result clearing, keyboard focus and four viewport sizes. It creates no booking or hold; run it on the fixed isolated origin with the same browser environment above. Guest/showcase helpers choose Any room before changing to a count outside the current room range, matching the real user flow.

## Shared response states (E1)

`tests/browser-feedback.mjs` runs only on the fixed isolated origin using the browser environment above. It holds genuine HTTP responses to inspect pending search, sign-in and order actions; it does not substitute fake successful availability or save results. It checks stable button dimensions, stationary delayed placeholders, duplicate guards, immediate fast-response completion, cancelled loading timers, persistent network errors/recovery, touch, reduced motion, four viewport widths and automated A/AA checks in tested states. A successful isolated order save followed by a failed read refresh must report that the change was saved, without offering a mutation retry.

The suite's guarded staff/order fixtures reset disposable verification data and activate fake staff. Run it sequentially with the other fixture suites. Main credentials and records are not used. Its screenshots/logs are temporary files under `/tmp/ui-effects-e1`; rerun the suite for current evidence. Success notifications now use `role=status` with polite announcements; errors retain alert semantics. The booking regression explicitly checks the cancellation status and actual cancelled record.

## Scoped guest transitions (E2)

`tests/browser-guest-motion.mjs` uses the fixed isolated origin and the browser environment above. Its guarded order fixture prepares disposable booking/order data before the suite; run it sequentially with all other fixtures. Native animations are observed and intentionally paused to verify that forms, focus, real booking confirmation and pending approval work before an animation finishes. Checks cover rapid menu interruption, changed motion preference, missing animation API, heading visibility, same-page draft preservation/clearing, private management focus, passive refresh, delayed/reopened/missing pictures and four viewport widths. It verifies cancellation of its owned fake bookings through actual private capabilities rather than silently skipping cleanup.

The guest motion module has no effect on backend eligibility or transaction rules. Guest contact drafts live in page memory, are cleared after successful booking/new reservation, and are not newly stored in sessionStorage. Existing confirmation/private-link storage behavior remains intact. Screenshots/logs are temporary under `/tmp/ui-effects-e2`; automated Chromium checks do not establish cross-browser performance or accessibility certification.
