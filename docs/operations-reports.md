# Operational floor and daily reports — isolated B6

Open http://localhost:18080/admin for operations and http://localhost:18080/reports for daily reports. Administrators and managers can read financial reports. Hosts retain reservation/floor access without financial data; servers and kitchen users keep their existing workspaces. Main port 8080 is unchanged.

## What the floor means

- **Available:** no applicable reservation, active hold or closure blocks this table at the chosen time.
- **Reserved:** an unseated pending/confirmed booking currently binds this table.
- **Occupied:** a seated party still binds the table, including an authorized early arrival or an overrun across midnight.
- **Clean-up:** the actual completion blackout matches the completed booking, table and completion timestamp. The interval includes its start and excludes its end; the approved buffer is 15 minutes.
- **Temporary hold:** a checkout/waitlist hold has not expired; it is not a confirmed booking.
- **Unavailable:** an applicable manual venue/room/type/table closure blocks booking. A generic blocked table is not automatically labeled cleanup.

Actual occupancy takes priority over a closure: an administrative closure cannot make a seated party disappear. Text labels accompany colors, and bound reservations can be opened from the map or status list.

Use live time to return to today's operational clock. Live queries use server seconds, so a completion at 12:00:30 immediately enters cleanup. The selected-time view uses current recorded statuses and saved intervals; it is not a historical replay of prior status changes. Normal updates run every 8 seconds while the page is visible and controls are not being edited. Focused live-time buttons keep their focus while statuses refresh. Active form/table/ticket interaction and open dialogs pause existing polling safeguards.

## Kitchen and server handoff

Accepted guest food fires once on validated seating. A server can claim a live unassigned pre-order even when it has already reached the kitchen. This updates assignment only: it does not create another ticket, alter food prices or record money. Existing actor/ownership, row-lock, request-replay, version and finalized-bill protections still apply. Closed/paid/void orders cannot be newly claimed, and servers cannot take another server's assigned order.

Kitchen cards emphasize table, elapsed timer, Pending / Preparing / Ready / Served / On hold status, items and allergy/booking notes. Status codes remain unchanged in MySQL. Closing a food round is separate from recording/finalizing settlement; the host completes the visit and starts cleanup separately.

## Daily report definitions

One selected Asia/Manila date has explicitly named measurements:

| Measurement | Basis |
|---|---|
| Reservations/status breakdown | Reservations that start on this dining service date; seated/completed covers shown separately |
| Finalized food sales | Non-void food lines from finalized bills assigned to the dining date; excludes deposits, extras, retained base and void orders/lines |
| Unfinalized ordered food | Non-void ordered food that has not reached cashier finalization; not settled food sales |
| Base credit applied to finalized food | Credit included within food value, not a second sale |
| Actual receipts/refunds | Events recorded on this transaction date, grouped separately as base, meal payment, VIP extras and actual refunds; split cash/external-card totals |
| Retained base | Actually received base retained by cancellation decisions dated today; already-received money, not new cash or food sales |
| Reservation detail / net receipts to date | Current totals for these service-date bookings across all their receipt dates; paid/due and bill status remain visible |

Example: a ₱500 Family advance yesterday and a ₱2,000 finalized meal today produce ₱2,000 food sales today, ₱500 receipts yesterday and ₱1,500 receipts today. Food sales are not ₱2,500. For VIP 16, a ₱2,500 food bill and ₱300 extras produce ₱2,500 food sales; the separate extras do not become food credit. A later actual refund appears on its refund date and can produce negative net receipts for that date.

Reports read a consistent snapshot and aggregate each child ledger separately before combining reservation totals. Multiple food lines and split receipts cannot multiply sales or credits. A finalized-line total that disagrees with its protected saved bill fails explicitly for manager investigation. Reading a report never creates/finalizes a bill or moves money. Reload to include newer records; a late old-date response cannot replace a newer selection.

## Activation and verification

`bin/prepare-operations-test.php` explicitly sets the B6 flag only after B5 in `BOOKING_TEST_MODE=isolated`, `tablebook_p3_test`. No new schema or automatic startup/main activation is supplied. `/reports` and `GET /api/admin/reports?date=YYYY-MM-DD` share existing financial-role access. Invalid dates and write methods are refused; API responses are private/no-store.

Tests: `bin/test-operations.php`, `tests/operations-early.php`, `tests/operations-claim.php`, `tests/browser-operations.mjs`, `tests/browser-report-readiness.mjs`, `tests/browser-operations-poll.mjs`. Resetting suites run sequentially with the isolated worker stopped and a private populated recovery dump retained.

The full-role browser rehearsal creates a real future guest booking, then explicitly relocates only that synthetic booking into the actual HTTP arrival window. Seating, preparation, server delivery, cashier finalization, reporting and completion use actual protected browser requests. This fixture does not waive production lead time or modify the main app. The real-time rehearsal requires Tuesday–Sunday 10:00–20:10 Manila; other runs must use clearly described controlled-clock coverage instead of claiming an actual-time pass.

Learning: service date, payment date and a bill's current status answer different questions. Closing kitchen service does not mean payment was received; receiving an advance does not create another food sale.

Verified isolated batch:25 new MySQL and 32 browser checks; affected total 163 MySQL and 118 browser checks. Final preview preserves original pre-B6 bookings/menu prices with only B6 activation added. Actual46-table dump/restore and main 37-table/configuration protection passed.
