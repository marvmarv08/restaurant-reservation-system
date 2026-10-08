# Booking engine and API

Phase 3 supplies the PHP/MySQL booking engine; Phase 4 connects the live guest screens and secure self-service management.
All database timestamps below use restaurant-local `Asia/Manila` time (`YYYY-MM-DD HH:MM:SS`).
Confirmation references are public labels, not authorization credentials.

## Routes

| Method | Route | Input | Result |
|---|---|---|---|
| GET | `/api/catalog` | None | Public room limits, floor geometry, menu, date window, and server clock |
| GET | `/api/holds` | Header: `X-Hold-Token`; original guest cookie | Owned hold state/expiry; consumed holds include their booking and private management path |
| GET | `/api/manage` | Query: `code`; header: `X-Booking-Token` | Private booking details, version, cutoff, link expiry |
| GET | `/api/manage/availability` | Query: `code`, `date`, `party_size`, `room_type`; private-token header | Replacement options excluding only this authorized reservation |
| POST | `/api/manage/modify` | JSON: `code`, `version`, `date`, `time`, `party_size`, `room_type`, `option`, `special_requests?`; private-token header | Atomic replacement; same reference and incremented version |
| POST | `/api/manage/cancel` | JSON: `code`, `version`; private-token header | Cancelled booking with retained history and released inventory |
| GET | `/api/session` | None | Guest cookie and `csrf_token` |
| GET | `/api/availability` | Query: `date`, `party_size`, optional `room_type` (`any`, `common`, `vip`, `group`, `terrace`) | Slots with server-computed table/group options |
| POST | `/api/holds` | JSON: `date`, `time`, `party_size`, optional `room_type`, optional `option: {kind, id}` | Owned hold, interval, physical members, expiry |
| POST | `/api/reservations` | JSON: `hold_token`, `guest: {full_name, phone, email?, special_requests?}` | Persisted reference, status, and `manage_path` |
| POST | `/api/holds/release` | JSON: `hold_token` | Releases the caller's unconsumed hold |

POST requests require `Content-Type: application/json`, the guest cookie from `/api/session`,
and `X-CSRF-Token` from that same session. A CSRF token prevents another website from submitting
a booking request using a guest's browser cookie. Session cookies are HttpOnly and SameSite=Lax;
they use Secure when served over HTTPS. No CORS permission is granted.

Availability is advisory: another guest may act before a hold is created. Mutations recompute
the option inside the transaction. The server ignores client-supplied status, source, intervals,
deposit values, or replacement party size during confirmation.

Confirmation returns HTTP 201 for a new booking. Repeating confirmation with the same owned,
consumed hold returns HTTP 200 with the same booking and `created: false`. It does not create
another guest, history row, or outbox message. This also works for simultaneous retries.

## Booking rules

The engine reads `settings`, room limits/notice, opening hours, turn times, and pacing rules
from MySQL for each request. `PLAN.md` remains the policy source of truth.

- Monday is closed. Dinner starts at 17:30; every candidate must finish its turn, reset,
  and any joined-table setup by closing time. The last seating cap is 21:45.
- Online lead time is 60 minutes; VIP and Group/Long Tables require 12 hours of notice. Exact cutoff boundaries use the server clock.
- Lead/notice are checked at hold creation. While that hold remains active, confirmation
  measures lead/notice from its creation time so the promised ten-minute form window is usable.
  Current settings still apply, and an expired hold or a start already in the past is rejected.
- Pacing counts live reservations **and unexpired holds**, with one count per reservation/hold,
  including joined groups. Global settings are ceilings; matching service-window rules can
  reduce them. Conversion excludes its own hold from the count.
- A single table is offered first. Joined options appear only if no eligible single table
  is available in the search. An already-held group can still be confirmed when a single
  table subsequently becomes available.
- Blackouts can cover the venue, room type, room, or individual table. Informational rows
  with `blocks_booking=0` leave inventory available.
- Parties 13–16 stay pending for manager approval. Minimum-spend values are informational;
  the engine collects no payment.

## Transaction and inventory safety

Every hold, confirmation, release, and internal cancellation follows this lock order:

1. Acquire the `booking_days` row for the service date. This serializes venue-wide pacing
   across different physical tables.
2. Lock every affected physical table in ascending numeric ID order.
3. For existing holds/bookings, lock their row and re-read its current status.
4. Refresh server time, validate current policy, and recheck reservations, holds, and blackouts.
5. Save all physical memberships and related records, then commit.

P5 cancellation and modification paths lock all physical tables before promoting the waitlist inside the transaction. Cross-date edits lock both service dates in sorted order. Staff paths use the same inventory discipline and recheck their current role/session after locks; see [the staff guide](staff-api.md#inventory-and-workflow-rules).

Transactions use READ COMMITTED and retry deadlocks/lock timeouts up to three attempts.
Different overlapping starts are prevented by table locks and the interval predicate
`existing.start < requested.block_end AND existing.block_end > requested.start`.
Touching intervals are allowed. The active-slot unique index additionally guards identical starts.
See the [MySQL locking documentation](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)
and [isolation documentation](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html).

`hold_tables` and `reservation_tables` contain every physical member of a joined group.
Releasing inventory sets `released_at`; it preserves assignment and status history.
`hold_reservations` enforces one booking per hold and supports confirmation retries.

Expired holds are excluded from every conflict and pacing check, even if their stored status
still says `active`. Optional housekeeping updates that status:

```bash
docker compose exec app php bin/expire-holds.php
```

The manual demo seeder locks service dates and physical tables in the same order and skips
inventory occupied by actual bookings or live holds. It also includes live holds in pacing.

## Errors and later phases

Error JSON has `ok: false` and `error: {code, message}`. HTTP 422 means invalid input or an
invalid booking window; 409 means a slot/conflict or state has changed; 410 means the hold
has ended; 404 also covers another guest's hold; 403 means session/CSRF validation failed.
Malformed JSON returns 400, and unsupported request content type returns 415.

The API requires a private capability for guest management; the public code alone never authorizes an action. [Phase 5 staff routes](staff-api.md) implement current server-side roles, waitlist promotion, seating/no-show workflows, and staff audit identity. Guest cancellation and modification promote eligible waiting parties after releasing inventory. R15/R16 are verified with real claim holds and concurrent promotion; acceptance is handled by authorized staff.
Confirmation messages are written only to the demo `outbox`; no email/SMS is delivered.

## Private booking links and change safety

Confirmation returns `/manage#code=LUM-XXXXXX&token=<private-secret>`. The fragment after `#` is never sent in an HTTP URL. The browser removes it from the address bar, keeps it in session storage, and sends the secret only through `X-Booking-Token`. Responses are uncached; CSP allows only local scripts, and guest/menu text is inserted with `textContent`. Phone, email, and form details are not saved in browser storage.

The secret is derived with HMAC-SHA-256 from a cryptographically random, server-side session seed and the reservation ID/reference. This makes confirmation retries reproduce the same capability without storing the raw secret in MySQL. `reservation_manage_tokens` stores its SHA-256 hash, reservation binding, expiry, and optional revocation timestamp. Expiry is one day after `blocks_until`, and a successful modification updates it to the new booking interval. Losing both the private link and original session requires contacting the venue; notification delivery remains simulated. These choices follow the [OWASP guidance for secure URL tokens](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

All management mutations also require session CSRF protection. Both modification and cancellation close two hours before the current start; exactly 120 minutes remains allowed, while 119 is refused. Applying the same cutoff to modification prevents moving a last-minute booking solely to bypass the cancellation rule. Pending/confirmed reservations can be changed; terminal or seated bookings cannot. Valid links can still read a cancelled booking until link expiry.

Modification does not release the original while the guest searches and creates no temporary replacement hold. Save locks both service dates in sorted order and all physical tables in ascending order, then rechecks authorization, expiry, cutoff, policy, inventory, and the submitted version. The transaction releases old memberships, saves the replacement, increments the version, and appends before/after JSON snapshots and status history. P5 also promotes eligible entries for the released service date. Failure rolls everything back. A competing tab receives `booking_changed` and must review the current details.

Same-table moves reuse the unique reservation/table membership row. The immutable change snapshots preserve its previous time and physical IDs; switched tables retain released membership rows. Joined groups always release every old member. Cancellation reauthorizes after waiting for locks, is idempotent after success, and preserves assignments/history.

The live countdown uses server expiry and elapsed monotonic browser time, so an incorrect device clock does not extend a hold. Refresh calls the owned-hold inspection API. An interrupted confirmation response is resolved through that API or an idempotent retry. Confirmation persists the private path, and a second browser opens it using the same database reservation.

## Repeat the verification

Use the separate Compose file; tests never reset the main database:

```bash
docker compose -f docker-compose.test.yml up -d --build
docker compose -f docker-compose.test.yml exec -T app php bin/setup-test-db.php
docker compose -f docker-compose.test.yml exec -T app php bin/test-booking.php
docker compose -f docker-compose.test.yml exec -T app php bin/test-management.php
BOOKING_TEST_MODE=isolated node tests/http-booking.mjs
BOOKING_TEST_MODE=isolated node tests/http-management.mjs
docker compose -f docker-compose.test.yml exec -T app php bin/lint.php
bash bin/smoke.sh http://localhost:18080
```

The PHP suite refuses to run unless the environment flag is `isolated` and the database is
exactly `tablebook_p3_test`. It resets only those test fixtures. Its separate PHP workers race
for the final VIP table, overlapping starts, joined members, pacing, and duplicate confirmation.
The HTTP suite uses only localhost port 18080 and checks cookies, CSRF, ownership, validation,
persistence, release, and retries. Node is needed only for the HTTP development tests.

After verification, remove only that temporary test stack and its volumes:

```bash
docker compose -f docker-compose.test.yml down --volumes
```

### Browser verification

Use Playwright as a development-only tool; it is not a website dependency:

```bash
npm install --prefix /tmp/lumina-browser playwright
/tmp/lumina-browser/node_modules/.bin/playwright install chromium
BOOKING_TEST_MODE=isolated PLAYWRIGHT_MODULE=/tmp/lumina-browser/node_modules/playwright/index.mjs node tests/browser-booking.mjs
```

Install missing Chromium operating-system libraries if your machine requires them. `PLAYWRIGHT_MODULE` can point to an existing installation. On WSL after a Docker group change, reopen Ubuntu; `BROWSER_DOCKER_VIA_WSL=1` is a test runner fallback that uses a fresh Ubuntu process. Browser fixtures verify the isolated database name/flag and are unavailable over HTTP.

Run fixture-resetting PHP suites first, then HTTP and browser suites sequentially. Browser cases cover real confirmation despite an interrupted response, active hold/confirmation refresh, a second browser, actual modification/cancellation, stale-tab rejection, desktop/mobile/320px overflow, keyboard floor selection, joined-member highlights, pending approval, Monday fallback, server-backed countdown expiry, network retry, and invalid private links. Screenshots are written outside the repository under `/tmp`; no private tokens are printed or committed.
