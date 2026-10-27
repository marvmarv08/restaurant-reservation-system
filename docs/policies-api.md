# Reservation policy workflow — isolated B5

The preview at http://localhost:18080 applies the assigned policies. Main port 8080 keeps its existing image, database and settings. The preview records demonstration cash or externally completed card receipts; it never transfers money.

## Guest behavior

Before confirmation, the quote shows all eight terms and requires explicit acceptance. The server saves the full accepted quote, terms version and acceptance time. Existing bookings are not falsely marked as having accepted new terms.

Online cancellation, food edits and reservation changes are allowed through exactly 24 hours before dining, inclusive. Rescheduling preserves the earlier deadline; moving a booking later cannot create a new cancellation window. Reservation changes show replacement base, extras and minimum before explicit acknowledgement. Accepted food prices, the original quote, prior schedules and receipt history remain available. An unavailable scheduled dish or incompatible received funds rolls the entire change back.

Cancellation stops unfired scheduled food and releases inventory in one transaction. Private management shows manager-review status, retained actual base, eligible actual receipts awaiting refund and actual refunds recorded. These values come from current receipts, rather than the original cancellation snapshot.

## Actual receipts and staff exceptions

Family/VIP cancellation on the same Asia/Manila calendar date retains only the net base actually received. A prior-day cancellation within 24 hours is late but is not automatically a same-day forfeiture. Unpaid fees never become receipts, refunds or retained money. VIP extra-person receipts are separate from base food credit and remain separately reviewable/refundable when service is cancelled.

A paid same-day booking cannot be changed, including by staff, to bypass this rule. Resolve cancellation under its existing date before making a replacement. The server repeats this protection after blocking menu locks, including a midnight boundary. Staff-created phone/walk-in bookings save governing terms with source/actor; this does not invent guest acceptance.

Only authorized admin/manager cashier users may record `extra_receipt`, `refund_base`, `refund_extra` or `review_cancellation` through the existing protected `/api/billing/record` endpoint. They use the existing fresh quote revision, request UUID, authorization, CSRF and booking locks. Retry the same unresolved record after an interrupted response; changing its payload is rejected. Cancellation/no-show requires a manager reason before refund recording. A terminal bill closes only after review and eligible actual refunds are resolved. Same-day base remains protected. No-show is distinct and imposes no invented automatic financial penalty.

Meals already sent to the kitchen and finalized financial records require service resolution. Their history cannot be erased by cancellation, rescheduling or permanent deletion. B6 sales reports remain separate work.

## Automatic arrival release

An absent confirmed booking is released at start plus 15 minutes. Seating must finish before that boundary; seated parties are never automatically released. Release/seating share database locks and preserve one status history and one food handoff.

The dedicated worker runs every five seconds, catches overdue arrivals after restart and exits on an unexpected database failure so Docker can restart with a fresh connection. Its Compose override and CLI are restricted to `BOOKING_TEST_MODE=isolated` and `tablebook_p3_test`. Availability/hold requests also catch up; an open browser is not required. The five-second scan interval and lock waits can delay the visible status update; the server seating deadline remains exact.

Start only the isolated worker, alongside the existing isolated stack:

```sh
docker compose -f docker-compose.test.yml -f docker-compose.policy-test.yml up -d --no-deps policy-worker
```

Explicit isolated schema preparation is `php bin/prepare-policies-test.php` inside the test app, after B2/B3/B4 preparation. Normal startup never activates B5. There is no main activation command.

## Verification and recovery

- `bin/test-policies.php`: real MySQL policy, receipt, exact-retry, actual seat/release/refund race, stock rollback and cutoff lock-wait cases.
- `tests/policy-midnight.php`: actual menu lock across midnight must roll back a paid-base reschedule.
- `tests/browser-policies.mjs` and `tests/browser-policy-staff.mjs`: actual guest/staff/cashier UI, responsive layout, accessibility and lost-refund response recovery.
- `tests/policy-worker-check.py`: autonomous release without HTTP, restart catch-up and once-only history.
- `tests/policy-terms.php`: inclusive cutoff, local service-day distinction, unpaid fees and no-show semantics.

Resetting suites run sequentially with the worker stopped. `scripts/rehearse_bella_vista_test.py` stops both isolated writers before dump/restore, including a restarting worker, then resumes their prior operational state. A manually paused worker is refused before any mutation; resume or stop it explicitly first, so recovery cannot accidentally let paused work execute. It verifies every table count/content hash and retains a private recovery dump. Main recovery requires its own fresh audit/backup and separate activation authorization.

Learning: assessed fees describe obligations; actual receipts describe money received. Cancellation, a review decision and an actual refund are separate events. Preserve each event and recheck time-dependent rules after database lock waits.
