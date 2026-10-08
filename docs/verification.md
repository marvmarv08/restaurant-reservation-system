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
node tests/browser-food-showcase.mjs
node tests/browser-menu.mjs
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

## Curated food showcase

`tests/browser-food-showcase.mjs` uses the fixed isolated origin and the browser environment above. Twenty checks cover local photo loading, continuous desktop movement through hover/focus, phone movement after touch, absence of Pause/Resume controls, visible gallery keyboard focus, offscreen/hidden pauses, reduced-motion preferences, viewport changes, four layout widths, mobile keyboard browsing, real menu categories, image failures, observer/JavaScript fallbacks, hidden management content, and no mutation or external asset request. `tests/browser-chef-background.mjs` adds eight video checks, including continuous playback during gallery interaction, looping, deferred local loading and reduced-motion/offscreen/failure fallbacks. Automated A/AA scans cover only rules the scanner can detect; they do not certify every motion-related accessibility criterion. Hidden-page handling uses controlled document-visibility events rather than physical background-tab certification.

The suite makes no database mutations or fixture resets. Its screenshots are temporary under `/tmp/lumina-food-showcase`, including the focus indicator that automated axe checks did not detect. The independent review found that a CSS fade mask hid that outline; the acceptance regression failed before the focus-specific mask override and passed afterward. Photo selection/provenance and adaptation limits are in `research/09_food_showcase_research.md`.

## Menu photographs and category navigation

`tests/browser-menu.mjs` uses the fixed isolated origin and browser environment above. Its 21 checks compare the actual catalog names, descriptions, prices and dietary tags, decode every local thumbnail, exercise all seven categories and All dishes, retain exact button focus, and inspect selected states/counts. Desktop sidebar, native mobile strip, keyboard auto-scrolling, 320/390/768/1440px reflow and automated A/AA rules in tested states are verified. It also checks failed images, stable geometry, an unavailable dish, rejected external/`__proto__` image keys, reduced motion, credits, and absence of browsing mutations/external requests/JavaScript errors.

The unknown-key/unavailable case deliberately changes a fetched catalog response inside that one browser context; it does not update MySQL. All normal category/data checks use the real HTTP catalog. The suite makes no database mutations or fixture resets. Screenshots are temporary under `/tmp/lumina-menu`; they supplement automated checks rather than certify accessibility. Public photo provenance and checksums are in `public/assets/images/menu/credits.json` and `research/09_food_showcase_research.md`.

The readiness harness awaits the restored Refresh label before opening a result, genuine service success messages before the next action, and dialog closure before checking focus or moving on. This prevents pending refreshes/saves from replacing an opener or reopening a just-closed dialog. Exact opener-focus and final database lifecycle assertions remain unchanged; staff/service product behavior was not modified for this menu extension.

## Room reveals and table-picture crossfade

`tests/browser-room-motion.mjs` uses the isolated browser origin without fixtures or writes. Eleven checks cover one-time 220ms room-photo reveals, immediate keyboard access, reduced-motion cancellation, the previous image/caption retained during delayed loading, an overlapping 180ms crossfade, fast changes, natural overlay cleanup, reduced-motion interruption, failed-image fallback, phone access and closing/reopening during a late response. The test captures and deliberately pauses native animations to verify intermediate states; separate checks resume a fade and verify its actual cleanup. Existing image assertions now await the latest request's aria-busy=false state rather than accepting an older ready image.

Fresh regressions passed 31 guest-motion and 41 full table-showcase checks (isolated MySQL only). Actual localhost desktop/mobile picture switching and missing-animation/observer fallback were checked read-only, with inspected screenshots in /tmp/lumina-room-motion. Localhost smoke and exact served script/style hashes passed. An initial visual helper used a fixed 250ms delay; it was corrected to await the observable animation cleanup, keeping its exact assertion. No main database reset, seeding, push or deployment was performed.

## Persistent table-preview Close control

`tests/browser-showcase-close.mjs` has six read-only checks at 1440/390/320px. It actually scrolls the dialog body, measures that Close stays in place and the title moves away, confirms the Close area does not overlap content, and exercises mouse Close, Shift+Tab access, Escape, focus restoration and scroll reset on reopen. The original sticky-title behavior failed the new regression before implementation. The dialog now separates its non-scrolling toolbar from `.showcase-scroll`; the full showcase reflow assertion checks that actual content container's scroll position. Fresh 11 room-motion and 41 showcase regressions passed, plus syntax, localhost smoke and exact source matching. Actual localhost desktop/mobile scrolled screenshots in /tmp/lumina-showcase-close were inspected. No main database reset/seeding or publication occurred.


### Local guest asset cache recovery — 2026-10-08

`tests/browser-guest-assets.mjs` primes a real browser context with the previously delivered unversioned table-showcase script/styles and long-lived HTTP cache headers, without Playwright routing (which disables browser caching). The original sticky title is confirmed, then the same context revisits the current page normally. Before the fix, that revisit failed because the old modal layout remained. After content-based asset versions were added in HomeController, the revisit loads the updated script/styles, the title scrolls away, Close stays visible and closing restores opener focus. The proxy permits GET/HEAD only and no data writes occur.

The cache regression, six Close/scroll checks and 11 room-motion regressions passed. PHP controller lint, browser-test JavaScript syntax and main localhost smoke passed. Home and management HTML both reference all 11 local scripts/styles with content versions; every fetched version matches the current file bytes. Only the main web container was rebuilt/restarted; no reset, seed, push or deployment.

Lesson: A clean browser test cannot detect stale files already cached by a returning user. Give changed assets new URLs and verify an ordinary revisit with a previously populated browser cache.


### All-date staff reservation list — 2026-10-08

`tests/reservation-dates-fixture.php` requires isolated mode and database tablebook_p3_test before creating 30 fake completed/cancelled bookings across yesterday/today/tomorrow. `tests/browser-reservation-dates.mjs` verifies all-date counts, unique complete pagination, off-date reference search, date-independent All results, date-scoped specific status/waitlist queries, daily statistics/floor consistency, full date/time rendering and phone reflow. The pre-change regression returned 10 instead of 30 records; all six checks passed after implementation.

Existing 14 staff HTTP and 10 staff browser checks passed. Staff browser helpers now search by exact reference rather than assume a new reservation is on the first page of a date-scoped All list; original persistence, role, XSS, service, deletion, keyboard and mobile assertions are retained. PHP lint passed on 64 files; JavaScript syntax, main localhost smoke and exact running controller/template/script matching passed. Updated staff script URLs use content versions. All fake-data writes are isolated; the main web container alone was rebuilt/restarted, without main reset/seed, push or deployment.

Lesson: An all-date history list and the daily floor serve different purposes. Label their scopes clearly, show complete booking dates and preserve pagination/search so records remain discoverable.


### Scoped local demo cleanup — 2026-10-08

Marvin requested removal of automatic demo bookings only, preserving manual bookings. A local-only guard required APP_ENV=local and the Docker db host. The operation selected reservations by demo seed markers, backed up their rows/dependencies privately outside Git, then ran a successful rollback rehearsal. The committed transaction used booking-day/table locks, rechecked the backed-up candidates and rejected changed preserved data or linked food-order/waitlist-hold complications.

Removed 178 demo bookings and their dependent records, with full before/after equality checks for the one manual booking and its dependencies, staff, guests, holds, food records and catalog/configuration. Added one aggregate cleanup audit without guest details. Post-commit smoke passed; zero demo reservations, one manual reservation, one active staff and 36 menu items remain. No reset, seed or publication. Recovery requires the private backup and a scoped transactional restore; do not reset the database volume. Canonical-main reservation seeding must not run unless Marvin requests demo repopulation.


### Twelve-hour VIP/Group notice — 2026-10-08

R20 in tests/booking.php now rejects one second below 12 hours and accepts exactly 12 hours for VIP, individual Group and 16-person joined Group. The updated test failed against previous local test values, then all 41 booking checks passed after the room-default upgrade; existing 59/60-minute global notice, inventory, approval and concurrency checks remain. All 11 booking HTTP and 41 showcase checks passed. tests/booking-notice-upgrade.php passed four checks: fresh defaults, old-default conversion, idempotency and custom-value preservation, using an isolated temporary table and rolled-back real-table updates. No fixtures target main.

Applied only VIP/Group notice fields in localhost after a private policy backup, with before/after preservation hashes covering bookings, staff, guests, holds, food records, catalog and other settings. Zero bookings remain. The main app was rebuilt/restarted with --no-deps; no seed/reset or hosted mutation. PHP lint passed on 65 files; JS syntax, smoke and exact versioned guest/SQL source matching passed. A read-only actual localhost browser verified V4/G1 available for eight guests tomorrow at 19:00, accurate 12-hour facts/search guidance and desktop/mobile layout; screenshots in /tmp/lumina-notice were inspected. Earlier temporary-script selector and missing browser-module setup failures were corrected before final successful runs.

Research links and evidence scope are documented in research/12_booking_notice_research.md; no external restaurant reservation or payment was submitted.

## Full-hero video research — 2026-10-08

Research/13_hero_background_video_research.md records eleven candidate pages, four actual downloaded clips and 24 corrected decoded-frame samples. Temporary read-only actual-page previews at 1440/390px verified playback advancement, native repeat and no horizontal overflow. Credited full-hero screenshots were inspected. The source needs loop blending/compression and mobile framing; these preview checks are not application implementation or production performance/accessibility certification. No functional app test or database fixture was needed for documentation-only research.

## Full-hero video local delivery — 2026-10-08

`tests/browser-hero-background.mjs` requires the isolated app and checks 12 behaviors: whole-hero silent decorative playback and form access, continuous motion during hover/focus, repeat, offscreen and controlled document-visibility pause/resume, changed/initial reduced motion, phone form/reflow, media failure, autoplay refusal, no JS/missing observer and hidden management exclusion. The first check failed against the previous photo-only hero. All 12 passed after implementation, alongside eight chef, 20 gallery and 41 showcase regressions (81 total). No hero-test mutation or external request occurred.

The 11.2-second 280-frame silent H.264 decoded successfully; six decoded frames surrounding its softened join were inspected. Main-localhost desktop/phone early/blend views, exact script/style/video/poster hashes, versioned script URL, local build/smoke and PHP/JavaScript syntax passed. Independent read-only review found no actionable issue. Main refresh used --no-deps and did not run seeding or reset the database. No physical-device/cross-browser or full accessibility certification is claimed.

## Concept floor preview — 2026-10-08

`tests/browser-floor-layout.mjs` reproduced G3 outside its room before implementation, then passed six checks: all 25 room bounds/no overlaps, entrance/aisle/location context, all exact-table previews, readable Terrace mini-map labels, desktop/phone containment and phone panning to T6's highlighted preview. The old label size was separately reproduced at 5.4 rendered pixels before restoring the correction. Only read-only guest requests are allowed by this suite.

Related isolated suites passed 41 showcase, ten staff browser, 14 staff HTTP, 12 hero, six Close and 11 room-motion checks: 100 total including the six focused checks. Actual main read-only geometry/preview checks and inspected desktop/phone screenshots passed; six served assets matched source and new guest/staff scripts/styles are versioned. Syntax, final build/smoke, whitespace and independent correction review passed. Main refresh used --no-deps with no seed/reset/data mutation. The layout is a fictional presentation, not measured access-clearance evidence.
