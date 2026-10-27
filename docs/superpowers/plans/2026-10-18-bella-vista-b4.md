# Bella Vista B4 Implementation Plan

**Goal:** Deliver the approved booking-linked food cart, explicit server quote acceptance and once-only arrival handoff in the isolated preview.

**Spec:** PLAN.md B4 and the approved B0 operational contract; source restaurant.docx section IV/VII. Existing booking/order/billing flows supply the architecture. Marvin authorized this phase and delegated file-aligned implementation choices. Execute inline, with review-only assistance after implementation.

**Architecture:** Separate scheduled food from live orders. An explicit test-only preparer adds quote/scheduled-preorder tables and clones the existing priced menu into three assigned categories, preserving legacy IDs/history. A held checkout reviews a server-owned quote before confirmation. Confirmation stores the accepted snapshot and reservation in one transaction; arrival creates/fires the existing kitchen order once. Private management reviews/saves scheduled cart changes before the approved 24-hour deadline. Preserve original acceptance and edit history. Existing financial behavior stays B3.

**Constraints:** Isolated tablebook_p3_test only; no main image/schema/data change, reset/seed, remote operation, real payment, commit or publication. Never print private configuration. PHP/vanilla JS/MySQL only. 30 distinct items, integer quantity1–30, integer centavos and B3 maximum. Three combined categories with at least three actual items each. Price/availability changes require a new review. Received credit is zero at booking; VIP extras never become food credit. Standard minimum applies at seating. Policy acceptance here covers quoted food/fees/payment/timing; full B5 release/refund integration remains pending.

## Review focus

- A consumed confirmation must recover exactly; changed guest/cart/quote must not reuse it.
- Expired/foreign holds, unavailable items and changed prices must create no partial guest/reservation/food.
- No order/ticket before arrival; seating rollback must leave scheduled food untouched.
- Private cart updates must enforce capability, version, exact retry and 24-hour cutoff, retain snapshots and avoid reservation-reschedule bypass.
- Existing menu/order history, legacy routes and main database must remain intact.

## Tasks

- [x] Add failing real-MySQL B4 scenarios and explicit schema/menu preparation; preserve/rehearse populated isolated recovery.
- [x] Implement server-priced quote, atomic accepted snapshot, strict confirmation replay and private scheduled cart edits/history.
- [x] Integrate once-only Standard-aware arrival handoff, cancellation stop and history-preserving change/delete guards.
- [x] Add accessible guest cart, live totals, review/acceptance/correction, durable interrupted confirmation and private management controls.
- [x] Run real MySQL/API/browser success/failure/concurrency tests, existing affected regressions and populated restore; review/repair and inspect desktop/mobile.
- [x] Record actual phase boundary/evidence, export Desktop roadmap, verify main/source protection and close PMM.

## Verified delivery

21 real MySQL scenarios;25 actual guest browser checks; 4 staff/billing checks; 126 legacy + 19 B2 + 20 B3 MySQL regressions and 32 legacy browser regressions. Populated 43-table dump/restore and exact recovery across fresh fixtures passed. PHP 88-file lint, JS syntax, nine seating assets, isolated smoke, main 37-table/configuration/source protection and roadmap/PMM validation are delivery gates. Review fixes and their committed-response/blocked-lock tests are recorded in the change log. No main activation, real payment or publication. B4 remains In progress at the isolated delivery boundary; B5 reconciliation is next.
