# Verifier Map

Purpose: Project-specific map from task types to required checks and evidence.
Read when: Defining or reviewing the verifier for an active task.
Skip when: The active task already has a complete verifier.

## Default Checks

- Code: `docker compose exec -T app php bin/lint.php`; `git diff --check`; apply additive SQL on existing and fresh isolated volumes.
- Frontend: real `tests/browser-booking.mjs`, `tests/browser-staff.mjs`, and `tests/browser-orders.mjs` against the isolated app; desktop/mobile/320px, keyboard/focus, refresh, second browser, interrupted-response recovery, countdown/server age, joined members, approval, role boundaries, host/order/kitchen workflows, settings, invitations, audit/outbox, and inert stored markup. See the three API guides.
- Backend/API: isolated `bin/test-booking.php`, `bin/test-management.php`, `bin/test-staff.php`, `bin/test-orders.php`, `tests/http-booking.mjs`, `tests/http-management.mjs`, `tests/http-staff.mjs`, `tests/http-orders.mjs`, and `bin/smoke.sh`; see the API guides for exact commands. Run resetting suites sequentially.
- Docs/research: verify local file links, reviewed source provenance, current-versus-proposed boundaries, README/PLAN entry points, Desktop export, `git diff --check` and PMM doctor. UI-effects research is in research/08_ui_motion_research.md; its future scenarios are acceptance criteria, not passing implementation evidence.
- Recovery:
- Release:
- Security/high risk: guest ownership/capability binding; one-use hashed activation; password bounds/hashing; account/IP throttle; staff CSRF/session rotation/logout/idle/absolute expiry; role/version revocation including deactivate/reactivate and role round-trips; last-admin protection; recent sign-in for account writes; expiry and permission checks after locks; transaction rollback and actual multi-process inventory/pacing/waitlist/creation races.

- Showcase: tests/browser-showcase.mjs on the guarded isolated origin verifies actual database eligibility, blocks/holds/release, safe joined selection, protected management, stale/error/expired data, delayed requests, local asset fallback, mobile/keyboard/axe and motion preferences. Run sequentially with other fixture suites. Never use its blackout fixture on main.

- Linked capacity controls: tests/browser-capacity.mjs uses actual catalog room-party limits for both selection orders, valid/adjusted values, full-range escape, saved queries, real availability request, stale-result clearing, focus/reflow/axe. Existing guest/showcase suites verify booking and private management remain intact.

- Shared response states: tests/browser-feedback.mjs checks real delayed responses, pending labels and restored dimensions, request guards, loading cancellation, fast/failed/recovered requests, touch/motion/reflow, saved-then-refresh-failed order feedback and tested status/contrast semantics. Run with existing guest/staff/order/showcase/capacity/readiness suites sequentially; fixture resets stay isolated.

- Guest transitions: tests/browser-guest-motion.mjs verifies deliberate scoped motion, interruptions, immediate visible heading focus, same-page input preservation/clearing, passive management refresh, delayed-image safety, motion preference changes and static fallback. Rerun guest/capacity/showcase/E1 feedback/readiness suites sequentially. All fake mutations and resets remain on the guarded isolated origin.

## Required Evidence

- Command output summary:
- Manual inspection:
- Screenshot or artifact:
- Remaining risk:

## False-Pass Guards

- Do not report skipped checks as passed.
- Do not delete or weaken failing checks without recording why.
- Do not treat mocks as real integration evidence.
- Do not mark high-risk tasks done without confirmation and rollback notes.
- Fixture-resetting booking tests run only with `BOOKING_TEST_MODE=isolated` and `DB_DATABASE=tablebook_p3_test`, never against the main volume.
- Staff session-age fixtures must use the web server's `www-data` ownership and fail if session loading fails. HTTP cookie jars must follow the last Set-Cookie like a browser. Do not count a silently unchanged fixture as an expiry check.
- Preserve `.env` and the main volume. Before/after main migration verification displays aggregate counts only; never expose guest contacts or activation secrets. Staff owners choose their own passwords.
- Order checks include server assignment/claim races, client-price rejection, metadata/dietary snapshots, availability at fire, one ticket per order, replay payload binding, stale state races, ownership/item boundaries, kitchen response privacy, held/recalled age, unpaid closure, unfinished-food completion denial, archive priority, and outstanding service across midnight.
- On recovery, restore Docker Desktop and check the existing volume before starting Compose. Confirm running app code matches saved source. Lost temporary browser dependencies or a failed browser launch are not passing UI evidence; restore the tooling and rerun the remaining gate.

## Bella Vista isolated B2

- Run `docker compose -f docker-compose.test.yml exec -T app php bin/test-bella-vista.php` on a legacy isolated fixture; it prepares the isolated constraint, tests target activation and restores its legacy fixture. Do not run resetting suites concurrently or against an already-activated preview without first preserving/resetting the isolated fixture.
- Explicit isolated-only commands: `bin/prepare-bella-vista-test.php` then `bin/activate-bella-vista-test.php`; no main activation CLI is supplied.
- `scripts/rehearse_bella_vista_test.py fresh|restore` affects only tablebook_p3_test via the test Compose file, retains a private dump and stops the isolated HTTP app around rebuild/restore. No other CLI writer may run concurrently. `fresh` resets disposable test data; `restore` compares all table counts/hashes.
- Prepare populated legacy/current cases with `tests/bella-vista-fixture.php prepare`, verify with `verify`, and run `tests/browser-bella-vista.mjs` using the existing Playwright environment. Restore the populated preview after legacy resetting suites. Keep dumps, session tokens and test passwords out of evidence files.

## Bella Vista isolated B3

- `bin/prepare-billing-test.php` explicitly prepares billing only on the isolated target catalog; no normal-init activation. `tests/billing-fees.php` checks exact money values; `bin/test-billing.php` resets only isolated fixtures and runs receipt/minimum/role/retry/race guards.
- Preserve the populated preview privately before resetting suites. Run `tests/billing-fixture.php prepare` to build synthetic cashier cases; write only its non-secret date/booking metadata to `/tmp/bella-b3-fixture.json`. Then run `tests/browser-billing.mjs` with the existing Playwright environment. No real payments/cards; the fixture supplies test-only staff accounts.
- Actual restore: `scripts/rehearse_bella_vista_test.py restore`, followed by `tests/billing-fixture.php verify`. All 41 table hashes/counts must match while the isolated HTTP writer is stopped and no other CLI writer runs. Finalized bills, receipt history and linked food must survive.
- Run fresh legacy/B2 regressions with billing inactive, then explicitly activate target/B3 for fresh billing tests. Standard seating prices come from current menu rows; never trust the browser's amount/fee calculation. Keep private snapshots and credentials out of docs/evidence.

- Bella Vista seating visuals: `python3 tests/bella-vista-seating-assets.py` verifies nine local images, exact 4/8/20 chair positions/spacing and image/native/profile/inventory hashes. Read-only isolated `tests/browser-bella-vista-seating.mjs` covers 21 real image/caption/policy/navigation/fallback/responsive/accessibility/no-write checks. Existing `research/table-showcase/verify.mjs` verifies 38 legacy concept cases and historical recipe provenance; preserve the original renderer and assets.

- B4 pre-orders: guarded `bin/test-preorders.php` covers21 real MySQL quote/cart/replay/private-edit/cutoff/stock/handoff cases, including real lock waits. `tests/browser-preorders.mjs` covers25 guest/recovery/responsive/second-browser cases; `tests/browser-preorder-staff.mjs` covers4 protected staff/B3 food-balance checks against restored populated B4 data. Resetting suites run sequentially with a private populated backup; preserve and restore every 43-table fingerprint. Rerun126 legacy + 19 B2 + 20 B3 MySQL and 32 existing browser cases for shared booking/staff changes. Main activation stays separate.

## Bella Vista isolated B5

- Explicit isolated-only `bin/prepare-policies-test.php` after B4; no startup/main activation. Full workflow/commands: docs/policies-api.md.
- `bin/test-policies.php` 25 real MySQL scenarios; `tests/policy-midnight.php` 1 actual lock-wait/midnight regression. Includes acceptance/old-consent preservation, exact cutoff, actual money, Any-room fees, stock rollback, receipt/refund and arrival races.
- `tests/browser-policies.mjs` 16 checks + `tests/browser-policy-staff.mjs` 6 checks cover actual screens, lost refund recovery, mobile/accessibility and history. Worker regression: `tests/policy-worker-check.py` 3 autonomous/restart cases; `tests/policy-terms.php` 5 pure policy cases.
- Stop the isolated worker before any resetting suite. Recovery helper stops active/restarting workers before dump/restore and resumes prior operational state. A manually paused worker is refused before mutation. No main/hosted target is allowed. Populated46-table recovery compares every count/content hash.
- Retained verification:186 prior MySQL and 76 prior browser checks, 18 pure fee checks, nine realistic seating assets, syntax/smoke, main 37-table/configuration fingerprints and 166 protected files.

## Bella Vista isolated B6

- Guarded `bin/prepare-operations-test.php` sets only the operations flag after B5; no DDL/startup/main activation. `bin/test-operations.php`21, `tests/operations-early.php`1 and `tests/operations-claim.php`3 cover actual MySQL report ledgers/dates/authorization/history, floor boundaries and live assignment protections.
- Browser suites: `tests/browser-operations.mjs` 21 actual multi-role requests/responsive/role checks; `tests/browser-report-readiness.mjs`9 staff/manager/date/accessibility/stale-response checks; `tests/browser-operations-poll.mjs`2 actual polling intervals. Existing Playwright/axe environment is required. Test arrival explicitly relocates only its synthetic booking; actual-time rehearsal requires Tue–Sun10:00–20:10 Manila. See docs/operations-reports.md.
- Stop both isolated writers before resets. Preserve populated 46-table hashes/counts. Browser fixtures temporarily set a cloned active menu price for deterministic amounts; restore the original pre-B6 dump and add only operations_profile afterward so original prices/history remain intact. Confirm idempotent activation and wrong-schema refusal before connection. Main 37-table/config and protected source/assets must remain unchanged.

- Final B6 batch passed 163 MySQL (25 B6 + 138 prior), 118 browser (32 B6 + 86 prior), PHP 109 lint, 18 pure fee/5 policy checks and nine assets. Actual original-data restore plus only B6 flag, repeated activation, wrong-schema guard and final writer-aware 46-table restore passed. Main 37-table/config and 258 protected files matched. No full B2 scheduling rerun is claimed in this batch.

## Bella Vista original branding/company content — isolated B1

- `tests/browser-bella-vista-branding.mjs` runs 19 browser checks: supplied profile/history, local SVGs/favicon, 320/390/768/820/1024/1280/1366/1440px layouts, keyboard anchors, desktop/mobile accessibility, management return links, actual booking availability and admin/server/kitchen/cashier/reports headers. Use existing isolated Playwright/axe tooling. Sign-in uses an existing synthetic test account without changing it or creating a reservation.
- Verify full rendered profile/history against restaurant.docx, original SVG XML and no external asset/script references. Inspect actual company and header screenshots. Preserve existing licensed images/credits/fonts. `tests/browser-bella-vista-seating.mjs` 21 existing browser cases and `tests/bella-vista-seating-assets.py` nine asset cases passed.
- PHP 109 lint, JS syntax, main/test smoke and whitespace checks passed. Compare main 37-table/private/Compose fingerprints and protected source/assets: 267 unchanged, only seven intended existing files changed. No database-resetting suite/main activation/publication is part of this UI/content batch. B1 stays In progress pending main/final acceptance.
