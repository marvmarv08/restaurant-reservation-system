# Bella Vista B3 Implementation Plan

Goal: isolated server-owned fees, once-only consumable advance credit and onsite receipt recording, with Standard minimum at seating.
Spec: PLAN.md B0 selected contracts and B3 acceptance row. Execute inline with test-driven-development; main activation is excluded.
Architecture: additive billing account/event schema, explicitly activated only in test DB. Existing B2 catalog profile remains; a separate billing_profile gates integration. Reservation/table locks serialize food, payments and seating. Existing roles remain, with billing restricted to admin/manager.
Constraints: integer centavos; Standard base0/min100000, Family base50000, VIP base250000 and30000 per guest above15 up to20; only base credit is consumable. No real card processing, no automatic charge/refund, no misleading paid status.

- [x] Task1: guarded schema preparation + money calculator. RED/GREEN category/capacity, centavo limits, exact fee/minimum boundaries; no automatic main schema setup.
- [x] Task2: reservation-level account and immutable receipt/refund events; quote fingerprints, strict payloads, request-key payload binding, partial receipts, cumulative credit across rounds, residual-credit review and finalization. RED/GREEN overpayment/retry/concurrency/roles and same-day base-refund protection.
- [x] Task3: staff Standard seating order created/validated atomically using current menu prices; preserve minimum after edits/voids. Freeze paid final bills and protect account/receipt/history from deletion or incompatible reservation edits.
- [x] Task4: protected cashier page/routes and staff entry point, actual browser quote/receipt/retry/finalization plus Standard seating flow; desktop/phone checks.
- [x] Task5: populated isolated restore and legacy regressions, independent review/fix, syntax/lint/main fingerprint proof, roadmap/memory/export. Main billing/schema/real payment remain untouched.

Review focus: paid versus assessed; base credit never pays extras; non-void saved food lines are authoritative; mutation/refund races; no policy bypass through existing order/reservation APIs; no secrets in logs or commits. Actual refund completion records are staff assertions in isolated demo, never proof of processor integration.

## Follow-up requested while implementing
Marvin asked to inspect his newest screenshot (`sc`) after B3 and make the indicated visuals realistic like the old app. Do that after completing this B3 verification; do not assume the screenshot target before viewing it.

## Execution evidence

Inline implementation in the canonical dirty Desktop checkout; no unrelated commit or worktree move. Main profile, schema, running image and all 37 table/configuration fingerprints were preserved.

- Calculator RED missing class → GREEN18 exact-centavo cases.
- Billing service/Standard seating RED11 absent behaviors → GREEN20 MySQL scenarios including receipt races/retries, cross-round credit, guarded history, partial payments, below-base manager review and rollback. Separate admin/manager authorization; no new broad role permissions.
- Independent read-only review found below-base closure deadlock and inconsistent seating quantity limits. Added failing direct/partial-advance cases, then fixed explicit manager review and aligned qty1–30. No unresolved review finding; no re-review claimed.
- Fresh target/B2 and legacy regressions:19 B2 +41 booking +14 management +43 staff +28 orders =145. Fresh B3 schema +20 scenarios passed again.
- Actual cashier browser:15 passed, including lost committed response/reload/exact retry, CSRF/role denial, recorded credit refund, below-base review and desktop/390/320px. Fixed startup date-selection race and accessible field labels; final staff-facing labels are plain English.
- Populated restore:41 table hashes/counts matched, finalized accounts/events/request recovery and food links persisted. Repeated populated schema preparation preserved all rows. Dumps remain private; main never receives test schema or records.
- Scope limitations: financial cancellation/rescheduling stays blocked pending B5, guest fee/cart confirmation remains B4, report definitions B6. Online processing and post-finalization receipt correction are not implemented. These do not turn the isolated batch into a full B3 main release.
