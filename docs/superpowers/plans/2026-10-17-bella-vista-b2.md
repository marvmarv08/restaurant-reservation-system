# Bella Vista B2 Implementation Plan

> Execute inline using executing-plans and test-driven-development. Marvin approved the isolated B2 batch; no main activation.

**Goal:** Deliver nine-unit inventory and approved schedule in isolated MySQL while preserving legacy behavior when the target profile is inactive.
**Architecture:** A transaction-only catalog service stages inactive new identities and explicitly activates the target profile. Shared policy uses that profile for 20-person capacity and dining-versus-reset closing. Existing legacy defaults remain unchanged until activation.
**Tech Stack:** PHP 8.3, MySQL 8.4, vanilla JavaScript, existing Docker/Playwright tools.
**Spec:** PLAN.md B0 operational contract, mapping and first implementation batch.

## Global constraints
Canonical Desktop checkout; preserve existing dirty work and private configuration. No main writes, online payments, seeds or publication. Standard 2–4, Family 5–8, VIP 1–20; S1–S4/F1–F3/VIP1–2. Tuesday–Sunday 10–22, 15-minute grid, 120-minute dining, 15-minute reset; last reset may end 22:15. No joined target units or additional notice/approval gate. Fees/cart/policy/report delivery remain B3–B6.

## Review focus
Activation must reject unresolved legacy live service/future bookings/holds and roll back all catalog changes. Repeated activation must preserve IDs and bookings. Legacy management reads must survive retirement. Guest/staff controls must expose 20 and all new categories. Real restored database must match source hashes; main database must remain unchanged.

### Task 1: Transactional catalog conversion
Files: src/Service/BellaVistaCatalog.php, bin/activate-bella-vista-test.php, tests/bella-vista.php, bin/test-bella-vista.php.
Interface: BellaVistaCatalog(PDO)::stage(): array and ::activate(): array; activation inserts a catalog_profile setting only after validation. CLI accepts only isolated test database.
- [x] Write/run failing tests: exact nine inactive staged identities; atomic activation, old identities unchanged, conflict rejection, repeat/rollback; legacy booking/order preserved.
- [x] Implement staging/activation using existing schema, sorted table locks and transaction. No DDL or implicit migration.
- [x] Run the tests; inspect actual MySQL results.

### Task 2: Shared scheduling and capacity
Files: BookingPolicy.php, CatalogService.php, StaffSettingsService.php, tests/bella-vista.php.
Interface: BookingPolicy::bellaVista(): bool; interval return fields remain unchanged; catalog adds profile metadata.
- [x] Fail tests for party 20/21, category edges, Monday, off-grid, exact 20:00 dining/22:15 reset, strict future starts, 12:15 reuse, occupied overruns, staff creation and locking race.
- [x] Implement profile-aware policy, safe settings limits and profile-constrained service edits; preserve legacy behavior.
- [x] Pass target tests plus legacy booking/management/staff/orders suites on restored legacy fixtures.

### Task 3: Catalog-driven guest/staff UI
Files: guest.js, staff.js, relevant existing floor/showcase helper only where required, isolated browser test.
Interface: catalog profile/max_party/room_types drive controls, labels and schedule help; floor data stays the existing schema.
- [x] Browser test fails if party20/new categories/hours/floor names are missing.
- [x] Implement profile-aware help and dynamic controls; keep assets/license/history and main legacy layout intact.
- [x] Run isolated browser guest booking and staff availability/create flow, inspect desktop/mobile screenshots.

### Task 4: Restore rehearsal and final verification
Files: isolated restore test/script, PLAN.md, README.md, project memory/change-log, Desktop export.
- [x] Dump populated isolated target DB privately; restore into isolated DB; compare all table hashes and read legacy/current bookings.
- [x] Verify lint, JS syntax, target regressions and preserved main fingerprints. Review final diff separately.
- [x] Record actual evidence and remaining limits; B2 may only be locally isolated delivered, main activation pending. No commit/push of unrelated existing work.

## Execution record

Inline work in the canonical Desktop checkout preserves pre-existing dirty work; no unrelated commit or worktree move. All four tasks completed for isolated delivery only. Main activation remains outside this plan.

- Task 1: RED missing conversion; GREEN transactional stage/activation and separate explicit schema preparation. Real persistence revealed the existing 16-person CHECK constraint; schema DDL was split out, never placed inside catalog transaction.
- Task 2: RED 20-person insert/legacy scheduling regressions; GREEN 19 B2 MySQL scenarios. Preserved schedule/pacing row IDs after legacy suites exposed reset breakage. Final legacy suites: 41 booking, 14 management, 43 staff, 28 orders.
- Task 3: RED actual browser stale hours; GREEN 12 browser checks including real guest confirmation/reload, authenticated staff twenty-person creation, fixed settings plus blackouts, desktop and phone views. Corrected test selectors to actual data-time/Booking settings controls.
- Task 4: real isolated populated dump/drop/restore matched 38 table counts/hashes; legacy/current private reads and historical order verified. Populated target restored after final legacy suites with an exact dump match. Main 37-table/config hashes unchanged. PHP72 lint, JS/Python syntax and main/test smoke passed.
- Independent read-only review: staged policy-field validation, hidden settings/blackouts and absent full browser-flow tests fixed. Minor inaccurate empty-state copy, shared actor fixture and active HTTP writers during restore also fixed. No unresolved review finding; no re-review or main activation is claimed.
- Review ruling: exact nine-unit IDs are newly allocated; no pretend one-to-one old table mapping. Legacy profile stays active on main. Fees/cart/policy/report changes remain separate B3–B6 work.
