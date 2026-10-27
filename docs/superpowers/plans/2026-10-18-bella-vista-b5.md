# Bella Vista B5 Implementation Plan

Goal: Implement the approved PLAN.md B0 cancellation/refund/operational contract in the isolated B4 preview. Marvin approved B5 implementation; continue inline with review-only assistance, without another authorization loop.

Design: Keep B3 receipts and B4 original food snapshots. Add explicit policy/deadline/event and policy money-event storage, gated by an isolated B5 activation. Cancellation/no-show records assessed versus actually received money; same-day cancellation forfeits only net received base. Authorized managers separately review and record eligible cash/external-card refunds, with exact retry/quote guards. No real transaction occurs. Safe changes preserve the earliest deadline and immutable history; explicit new fee/terms acknowledgement is required. Received funds exceeding replacement fees block changes pending eligible manager reconciliation. Scheduled food keeps accepted prices and remains unfired.

Automatic release uses a dedicated local policy worker plus server request catch-up, all under existing day/table/reservation locks. Seat before start+15 minutes; at/after that boundary an absent party cannot seat. Seated parties are never released automatically. Restart catches overdue absences. A separate isolated Compose override supplies the worker; main Compose/config/image/data remain untouched. Recovery tooling must stop both isolated writers while dumping/restoring.

- [x] Preserve/rehearse populated B4 recovery; add failing boundary tests before implementation.
- [x] Add policy terms, explicit test-only schema/activation and immutable deadline/acceptance/change/cancellation history.
- [x] Reconcile cancellation/no-show, actual base/extra receipts, forfeiture, manager review/refunds/finalization with B3 retry/quote protection.
- [x] Support food/fee-aware guest/staff changes with explicit acknowledgement, earliest-deadline preservation and atomic rollback.
- [x] Implement locked automatic arrival reconciliation, exact boundary seating checks, autonomous worker and restart catch-up; stop worker during recovery/reset tests.
- [x] Show accepted full terms, deadlines, cancellation/refund state and safe-change acknowledgement in guest/staff/cashier UI.
- [x] Verify real MySQL boundaries/cross-midnight/concurrency/stock/financial-history/replay and actual browsers/worker/restart; review and repair; run appropriate existing regressions and populated restore.
- [x] Record exact delivery/limits, update learning journal/roadmap/Desktop export and PMM verification; no main activation/publication.

Rules: Tuesday–Sunday10–22,120-minute dining+15-minute cleanup,15-minute arrival grace; online cancellation/change through exactly start-minus24h; same-day uses Asia/Manila calendar date. No unpaid fee becomes received/refunded/forfeited. VIP2500 base only is food credit,300 per guest16–20 separate. Same-day base is never refundable via another route. No-show is distinct and receives manager review without an invented penalty. Refunds cannot exceed actual net receipts or overlap allocations/forfeiture. Finalized/fired food history stays protected. B6 reports, branding and main activation remain separate.

Review resolution: changing a same-day booking with any net received base is blocked, including staff changes; cancel/review under the existing date before creating a replacement. This prevents moving the date to evade protected actual base. Staff creation records governing terms and actor/source without fabricating guest acceptance. Recovery responses use the preserved earliest deadline.

Delivery: isolated scope verified; B5 roadmap stays In progress pending separate main activation. Governing implementation and remaining limits: docs/policies-api.md. Next is B6 operations/reporting.
