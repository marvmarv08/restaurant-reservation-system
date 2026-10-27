# Bella Vista B6 implementation plan

Goal: extend the existing operational dashboards with truthful table states and reconciled daily reservation/food-sales reports, using the approved PLAN.md B0/B6 conventions. Marvin authorized inline implementation; main activation/publication remain excluded.

Architecture: DailyReportService reads one consistent snapshot, aggregates food and each money ledger independently per reservation, and reports finalized non-void food by dining date separately from receipts/refunds by transaction date. FloorStatusService derives actual occupied/reserved/cleanup/hold/closure states from existing records; cleanup is matched to the system-generated completion blackout, not inferred from a generic blocked table. OperationsProfile is explicitly enabled only in the isolated B5 database, without DDL. ReportController plus dedicated view/JS keep financial screens out of the large staff module. Existing admin/manager financial access applies; hosts retain operational access without sales/receipt data.

Review focus: multi-line/multi-receipt fan-out; midnight and later refunds; occupied overruns/half-open cleanup; stale polling/focus; terminal/finalized history and unauthorized roles. No deposits, extras, credits or cancellation retention become additional food sales. Unfinalized ordered food is labeled separately. One selected Manila date has two explicitly named date bases, never an unexplained combined sales total.

- [x] Preserve/rehearse populated46-table recovery and main/source fingerprints; stop isolated worker before resetting tests.
- [x] Write failing report and floor tests; implement OperationsProfile, isolated preparation CLI, DailyReportService::daily(actor,date), FloorStatusService::snapshot(at), and consistent snapshot/authorization/date guards. No new ledger/schema and no main startup activation.
- [x] Add protected /reports and /api/admin/reports; wire B6 catalog flag and staff report link. Extend dashboard with table_states, exact live clock seconds and server_date while preserving original floor payload/legacy behavior.
- [x] Show named table states with text alongside color, live-time reset, clearer reservation hierarchy and kitchen Pending/Preparing/Ready/Served/On hold badges. Preserve controls, existing actions and focus-aware polling; add targeted styles only.
- [x] Verify real MySQL finalized/unfinalized/void/multiple receipts/credits/transaction dates/retention/role/deletion cases and occupancy/cleanup/hold boundaries. Exercise actual pre-order→arrival→kitchen→served→settlement→completion/cleanup workflow in browsers, reports and role denials; inspect desktop1280/1366/1440 and 390/320px.
- [x] Run appropriate B3/B4/B5/legacy regressions, independent read-only review and repairs, populated restore and main/source protection; record evidence, update authoritative roadmap/Desktop export and PMM. Keep B6 roadmap In progress pending main activation.

Ruling: reuse existing persisted cleanup markers only when a blackout matches a completed reservation's code, completed_at and table binding. Manual closures remain Unavailable even if their reason mentions cleanup. Reports are read-only and never create/close a financial account.

Review repairs: seated assignments take Occupied priority immediately, including authorized early seating. Live-button polling must continue across intervals and preserve focused button after render; input/table/ticket interaction guards remain. Browser arrival uses an explicitly relocated synthetic booking inside the real current HTTP arrival window; this is test orchestration, not a production policy bypass or a claim that online lead time was waived.

Ruling from full-role rehearsal: automatic pre-orders are already sent before assignment. Permit the existing locked claim action on live open/sent/preparing/ready/served orders, retaining owner, quote/version, replay and finalized/closed protections. Claim does not refire food or record money. Pin this with tests/operations-claim.php and prior order/financial regressions.

Final result:163 MySQL + 118 browser checks passed, including 25/32 B6; original pre-B6 data restored plus only operations_profile,46-table recovery and main/source protections verified. B1 branding/content is next; B6 roadmap remains In progress pending separately authorized main activation.
