# Guest food pre-orders

B4 runs only when the explicit `preorder_profile=bella_vista_b4` setting and B3 billing are enabled. The isolated preparer is `php bin/prepare-preorders-test.php` inside the test Compose app. It refuses any database except `tablebook_p3_test` with `BOOKING_TEST_MODE=isolated`. Normal startup never prepares or activates it.

The preparer creates `preorder_quotes` and `reservation_preorders`, then transactionally clones the existing 36 menu items into Main Courses / Specialties, Appetizers & Soups and Desserts & Drinks. Existing item/category identities remain for historical orders; their categories become inactive for new selections. Preparation is repeatable. Schema DDL runs separately because a surrounding MySQL transaction cannot undo it.

## Checkout

1. Create an ordinary owned table hold.
2. POST `/api/preorders/quote` with `{hold_token, cart:[{id,qty}]}` and the guest CSRF header. The server reads active available menu prices and returns lines, food/fee amounts in integer centavos, policy text/version, `quote_token` and expiry. A quote lasts up to five minutes, never beyond its hold.
3. Review the quote and explicitly accept it. POST `/api/reservations` with the existing `hold_token` and `guest`, plus `preorder:{cart,quote_token,accepted:true}`. Empty carts are allowed. Clients cannot supply prices or fractional/duplicate quantities. Limits are 30 distinct dishes and quantities1–30.
4. The booking transaction rechecks availability, quote expiry after menu lock waits, current prices and the exact cart. A changed/unavailable item requires correction and a new review; no partial guest, reservation or scheduled food persists on failure.
5. Confirmation saves original/current quote snapshots, acceptance time and a canonical guest/cart/quote hash. It creates no live order, kitchen ticket or receipt. Exact retries recover the original booking; changed payloads cannot reuse a consumed hold. Owned hold inspection and the private management link retrieve the saved food after refresh.

A consumable base is not added twice to a food bill. Quotes distinguish unpaid Family ₱500/VIP ₱2,500 base from actual received food credit, initially zero. VIP guests16–20 add ₱300 each as separate noncredit extras. Standard has no reservation fee; its ₱1,000 food minimum applies upon seating, not online checkout. Final actual balances remain the responsibility of B3 cashier calculations. Saved management amounts are labeled as values at quote acceptance, not current receipts.

## Private food changes

POST `/api/manage/preorders/quote` with `{code,cart}` and `X-Booking-Token` plus guest CSRF. POST `/api/manage/preorders/save` with `{code,version,preorder:{cart,quote_token,accepted:true}}`. Capability authorization, reservation version and the inclusive start-minus24-hours deadline apply. Saved changes preserve original acceptance and bounded prior snapshots. Exact save replay changes history/version only once; pending browser requests are stored separately for each booking.

Accepted-quote bookings use a 24-hour online deadline. Their schedule/category/guest-count edits and permanent deletion are guarded until B5 can reconcile food/fees consistently; the UI offers scheduled-food editing separately. Cancellation with no protected billing record stops scheduled food and releases inventory in one transaction. Existing B3 financial-history protections still apply. This does not deliver B5 grace release or the full refund workflow.

## Arrival and kitchen

The existing staff seating transaction stages the accepted lines at saved prices, validates active inventory, service time, current dish availability and the cumulative Standard minimum, reuses its draft order, then fires one existing kitchen ticket. Failures roll back both seating and provisional orders/tickets. The scheduled record stores its order identity and becomes `handed_off`; repeated arrival cannot duplicate it. An unavailable scheduled dish requires staff resolution before seating. Kitchen actions continue through the existing order workflow. Internal `queued` ticket storage corresponds to the pending kitchen queue; the broader assigned label/report work remains B6.

## Verification

`bin/test-preorders.php` uses the guarded real MySQL harness; resetting tests must run sequentially, with a private populated isolated recovery dump preserved first. `tests/browser-preorders.mjs` exercises the actual guest/private pages and real persisted records. Its arrival helper invokes the real locked staff service with an explicit future service-date clock; it does not claim an actual-time staff HTTP arrival. Existing booking, management, staff, order and billing suites remain regression checks. Use the project recovery script to verify actual populated dump/restore fingerprints before a delivery claim. Never restore an isolated dump into main.

Delivered isolated evidence: 21 real MySQL cases, 25 guest browser cases and 4 protected staff/billing browser checks. The saved food reaches B3 amounts with no fictitious receipts/credit; real actual-time future seating remains disabled.165 prior MySQL and 32 legacy browser checks pass. Populated 43-table restore and exact recovery across regression fixtures are verified; main remains unchanged.
