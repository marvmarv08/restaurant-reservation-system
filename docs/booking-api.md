# Booking engine and API

Phase 3 supplies the PHP/MySQL booking engine. The guest screens are connected in Phase 4.
All database timestamps below use restaurant-local `Asia/Manila` time (`YYYY-MM-DD HH:MM:SS`).
Confirmation references are public labels, not authorization credentials.

## Routes

| Method | Route | Input | Result |
|---|---|---|---|
| GET | `/api/session` | None | Guest cookie and `csrf_token` |
| GET | `/api/availability` | Query: `date`, `party_size`, optional `room_type` (`any`, `common`, `vip`, `group`, `terrace`) | Slots with server-computed table/group options |
| POST | `/api/holds` | JSON: `date`, `time`, `party_size`, optional `room_type`, optional `option: {kind, id}` | Owned hold, interval, physical members, expiry |
| POST | `/api/reservations` | JSON: `hold_token`, `guest: {full_name, phone, email?, special_requests?}` | Persisted booking reference and status |
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
- Online lead time is 60 minutes; VIP notice is 48 hours and Group notice is 24 hours.
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

The API exposes no cancellation or management action using a public confirmation code.
The internal cancellation service is ready for authorized callers. Phase 4 adds secure guest
management, cancellation cutoff enforcement, modification, and the UI. Phase 5 adds staff
roles, waitlist promotion, seating/no-show workflows, and staff audit identity.
Confirmation messages are written only to the demo `outbox`; no email/SMS is delivered.

## Repeat the verification

Use the separate Compose file; tests never reset the main database:

```bash
docker compose -f docker-compose.test.yml up -d --build
docker compose -f docker-compose.test.yml exec -T app php bin/test-booking.php
BOOKING_TEST_MODE=isolated node tests/http-booking.mjs
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
