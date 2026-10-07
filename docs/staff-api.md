# Staff Access and Host Administration

Phase 5 connects staff sign-in and the host workspace to the same MySQL inventory as the guest site. Start with [the README activation instructions](../README.md#activate-the-first-admin-and-try-the-staff-workflow). The phase checkpoint and next work remain in [PLAN.md](../PLAN.md).

## Permissions

Authentication proves who signed in; authorization decides what that person may do. Hiding a button is only a convenience: both controllers and transactional services check current server-side permissions.

| Action | Admin | Manager | Host | Server / kitchen |
|---|---|---|---|---|
| Reservation list, contacts, floor, availability | Yes | Yes | Yes | No |
| Phone/walk-in booking, future edit, seating, completion, cancellation, no-show, waitlist | Yes | Yes | Yes | No |
| Permanently delete an unseated reservation without linked orders | Yes | No | No | No |
| Approve or reject pending requests | Yes | Yes | No | No |
| Read settings; update hours/turn times; manage staff blackouts | Yes | Yes | No | No |
| Change global rules and pacing | Yes | No | No | No |
| Invite staff or change roles/active state | Yes | No | No | No |
| Read audit records and simulated outbox | Yes | Yes | No | No |

The table covers host/admin permissions. Phase 6 adds separate `/server` and `/kitchen` workspaces: server can claim and manage its own food orders; kitchen can prepare, ready, hold/resume, and recall tickets. Neither role gains host/admin access. Admin/manager can use both workspaces and void orders. See [the order permission map](orders-api.md#permissions). The last active admin cannot be deactivated or demoted through account management.

## Activation, password, and session handling

- A trusted local CLI operator can issue an invitation with `php bin/invite-staff.php EMAIL 'FULL NAME' ROLE`. In the container, prefix this with `docker compose exec app`. Signed-in admins can also issue invitations, with sign-in within the preceding 15 minutes required for account writes.
- A cryptographically random 32-byte capability expires after 24 hours and works once. MySQL stores only its SHA-256 hash. Reissuing invalidates older unused invitations. Activation rechecks token expiry and account state after database locks; invalid links are rejected before expensive password hashing.
- Passwords use PHP `password_hash`/`password_verify`, bcrypt cost 12, and a 15–72-byte length requirement. Null bytes and longer inputs are rejected to avoid bcrypt truncation. Bcrypt is the implemented choice available in the PHP 8.3 image; earlier Argon2 planning is not an assertion that Argon2 is deployed. See [PHP password hashing](https://www.php.net/manual/en/function.password-hash.php).
- Login uses generic failure messages and database-backed limits of five attempts per normalized account and 30 per IP in a 15-minute window. Account keys are hashes. Unknown-account verification uses a real cost-12 dummy hash. No password or activation secret is included in audit records or PHP exception arguments.
- `TABLEBOOK_STAFF` is separate from the guest cookie. It is HttpOnly, SameSite Strict, cookie-only, and Secure when the request uses HTTPS. Login/activation regenerate the session ID and CSRF token. Logout invalidates the session even if writing its audit record fails.
- Sessions expire after 30 minutes without a session request or eight hours from authentication. The visible workspace polls while open, so an open tab may keep the idle timer active; the absolute eight-hour limit still applies. Staff account writes require sign-in within 15 minutes, checked again after locks.
- A current account stamp includes identity, role, password hash, active state, and monotonic `auth_version`. Every account change increments this version. Deactivation followed by reactivation, or changing a role and restoring it, cannot revive old sessions. Services recheck the account and absolute expiry after waiting for inventory locks.
- Every POST requires JSON and the current `X-CSRF-Token`, including sign-in, activation, and sign-out. `/api/auth/me` supplies the staff CSRF token and safe account fields. Secrets/passwords never enter localStorage. Activation fragments are removed from the visible URL immediately.

These decisions apply [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) and [session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). They do not imply MFA, password recovery, or production HTTPS is implemented. Local ports bind to loopback; HTTPS deployment needs P7 verification.

## Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/staff/login`, `/staff/activate` | Staff sign-in and one-use activation pages |
| GET | `/admin` | Authorized host/admin workspace; anonymous visitors redirect to sign-in |
| GET | `/api/auth/me` | Safe current account and staff CSRF token |
| POST | `/api/auth/login`, `/api/auth/activate`, `/api/auth/logout` | Session lifecycle |
| GET | `/api/admin/dashboard` | Date/status/search filters, paginated reservations, counts, floor state |
| GET | `/api/admin/reservation?code=LUM-XXXXXX` | Authorized booking details, assignments, history, orders |
| GET | `/api/admin/availability` | Actual options for an explicit room/source; optional existing booking code |
| POST | `/api/admin/reservations` | Phone/walk-in creation with owner-bound request UUID |
| GET | `/api/admin/request?key=UUID` | Recover that staff member's completed creation request |
| POST | `/api/admin/reservations/status` | Versioned approve/reject/seat/complete/cancel/no_show/accept_offer |
| POST | `/api/admin/reservations/delete` | Admin-only versioned permanent deletion |
| POST | `/api/admin/reservations/modify` | Atomic future booking edit |
| POST | `/api/admin/waitlist` | Enqueue with owner-bound request UUID |
| POST | `/api/admin/waitlist/promote` | Recheck real fitting offers for the selected service date |
| GET / POST | `/api/admin/settings` | Read or save revision-checked policy configuration |
| POST | `/api/admin/blackouts` | Add/remove authorized staff blackout |
| GET | `/api/admin/staff` | Admin account list, excluding passwords/token hashes |
| POST | `/api/admin/staff/invite`, `/api/admin/staff/change` | Recent-auth admin account management |
| GET | `/api/admin/audit`, `/api/admin/outbox` | Audit history and simulated messages |

The route table is in `config/routes.php`; validated request fields are in `StaffController`. Responses use `ok` and structured `error: {code, message}`. Typical errors: 401 ended/absent staff session, 403 role/CSRF/recent-auth denial, 409 stale version or state conflict, 422 invalid policy/input, 429 login limit, and 415 non-JSON mutation. No unauthenticated route returns guest contacts.

## Inventory and workflow rules

Booking operations acquire sorted service-date locks, then every physical table in ascending ID order, then affected booking/hold rows and a fresh account guard. Locking all 25 tables simplifies safe promotion after a release; it serializes this small venue's mutations and should be reviewed before scaling. Edits lock both old and new dates in sorted order. Transactions recheck current policy and roll back together on failure.

- Phone bookings follow the normal notice policy. Walk-ins bypass only the online lead time for Main Dining/Terrace; they still obey room fit, service hours, closing time, pacing, blackouts, and occupied tables. VIP/Group notice remains enforced.
- A future pending/confirmed booking may change party, date/time, or assignment. Keeping its original room/time preserves its original notice eligibility; a moved date/time/room must satisfy current notice. The old assignment remains reserved until the replacement passes. Seated table moves are outside P5.
- Status writes require the current booking version and a reason. Pending approval requires manager/admin; an approved confirmed party may be seated on its service date from 30 minutes before start until its dining interval ends. Every joined member must actually be usable and unoccupied.
- Seating creates one open order and history record atomically. Stale tabs/races cannot create duplicate orders. An overdue seated party keeps occupying its tables for the remainder of that service date until staff finish it.
- No-show is allowed only after the configured grace period (20 minutes by default), releases all assignments, and increments the guest counter once. Staff cancellation can override the guest's two-hour self-service cutoff and records the reason and actor.
- Completion accepts only seated bookings and refuses unfinished kitchen/order work or nonvoid items in an open order. An empty open order is voided with history; it is never falsely marked paid. Released physical members receive the current reset buffer, so early completion cannot offer a dirty table immediately.

### Permanent deletion

The staff details dialog replaces **Mark no-show** with **Delete** for administrators. **Cancel reservation** retains the booking and history while releasing its table. **Delete** opens a separate confirmation with **Keep reservation** and **Delete permanently**; no typed reference or cancellation step is required.

`POST /api/admin/reservations/delete` accepts `{code, version}` with the current staff CSRF token. Both the controller and service require `reservations.delete`, which belongs only to admin. The service locks the service date and physical tables, refreshes administrator permissions after the lock wait, and rejects stale versions/date changes. Seated parties and any booking with an order are refused with `booking_has_orders`.

Deletion removes the reservation, assignment rows, status/change history, private management tokens, confirmation/request/offer bindings, simulated outbox messages, and prior reservation audit snapshots. Linked holds become released and unbound; this preserves their inventory trace without guest details. A single minimal deletion audit retains only the actor, role, time, action, and numeric reservation ID, with no guest snapshot. Shared guest profiles and unrelated bookings remain; deleting an old no-show reverses only that booking's contribution to the guest's no-show count, never below zero. Freed inventory is offered to the eligible waitlist in the same transaction.

There is no application undo. Code rollback cannot restore records already deleted; recovery would require a database backup. All deletion fixtures and regression tests run only in the guarded isolated test database. Enabling the feature does not delete existing reservations automatically.

### Waitlist offers

R15/R16 are implemented with real holds. Entries are ranked per requested date/time and processed in time/rank order; an earlier party that does not fit cannot block the highest fitting party. An offer first reserves every member in a ten-minute hold, then records the simulated notification. Concurrent releases cannot produce two offers for one party.

Acceptance is staff-mediated: the guest contacts the host, who opens the entry and accepts the live offer. The same booking reference is retained; parties of 13–16 still await manager approval. Public guest hold confirmation cannot consume a staff waitlist hold. No public claim URL or real message is sent.

Expiry immediately stops a hold blocking availability, even without a timer job. Recheck/release promotion moves an expired offer to the tail of its slot and lets the next fitting party try. Acceptance refreshes time after inventory locks; waiting for locks cannot extend an expired offer.

### Settings and records

The settings editor uses bounded values and a configuration revision hash. A stale tab must reload. Manager may change hours/turn times; admin may also change global values/pacing. The venue timezone remains fixed. Existing bookings keep their stored intervals; new searches, holds/confirmation, and edits use the shared current policy.

New staff blackouts cannot cover occupied reservations or live holds. The UI can remove only its own `Staff blackout:` records; it cannot remove table reset buffers. Audit rows record actor, role, action, entity, and before/after values without passwords, raw invitation tokens, or cookies. Application actions append audit records; permanent reservation deletion removes the booking’s prior audit snapshots and appends one minimal deletion record. A database operator still has database-level write access. The outbox contains simulated messages only.

Creation request UUIDs are bound to the staff account and canonical payload. A retry returns the existing booking; reusing a UUID for different input conflicts. This allows recovery after an interrupted response without duplicating a phone booking or waitlist entry.

## Isolated verification

Never run resetting fixtures against the main stack. The PHP harness and fixture helpers require `BOOKING_TEST_MODE=isolated` and database `tablebook_p3_test`; browser/HTTP runners target only port 18080.

```bash
docker compose -f docker-compose.test.yml up -d --build
docker compose -f docker-compose.test.yml exec -T app php bin/setup-test-db.php
docker compose -f docker-compose.test.yml exec -T app php bin/test-booking.php
docker compose -f docker-compose.test.yml exec -T app php bin/test-management.php
docker compose -f docker-compose.test.yml exec -T app php bin/test-staff.php
BOOKING_TEST_MODE=isolated node tests/http-staff.mjs
BOOKING_TEST_MODE=isolated node tests/http-booking.mjs
BOOKING_TEST_MODE=isolated node tests/http-management.mjs
BOOKING_TEST_MODE=isolated PLAYWRIGHT_MODULE=/tmp/lumina-browser/node_modules/playwright/index.mjs node tests/browser-staff.mjs
BOOKING_TEST_MODE=isolated PLAYWRIGHT_MODULE=/tmp/lumina-browser/node_modules/playwright/index.mjs node tests/browser-booking.mjs
docker compose -f docker-compose.test.yml exec -T app php bin/lint.php
bash bin/smoke.sh http://localhost:18080
git diff --check
```

Run these sequentially: the suites intentionally reset isolated fixtures. See [browser tooling setup](booking-api.md#browser-verification). In WSL, reopen Ubuntu after Docker group changes, or set `BROWSER_DOCKER_VIA_WSL=1` for the HTTP/browser fixture runner. HTTP session-age fixtures run as `www-data` to access the web server's session files; root cannot safely substitute for that ownership. Test passwords exist only behind the isolated database guards. Browser screenshots go under `/tmp`, excluding private activation links.

Executed P5 evidence: 31 real MySQL staff scenarios, 13 staff HTTP scenarios, and 10 staff browser scenarios; regressions 36 booking MySQL, 14 management MySQL, 11 booking HTTP, 7 management HTTP, and 12 guest browser scenarios. Total: **134 scenarios**, plus PHP lint on 47 files, main/test smoke, and main database safeguards. Tests include independent-process races, expiry and revocation after locks, last-admin protection, idempotent creation, queue fairness, actual offers, desktop/mobile layouts, and inert stored markup. PHP formatting must explicitly target version 8.3.

The P5 additive upgrade kept all 186 reservations, 31 guests, and 195 status-history rows present immediately before it; five original demo staff profiles started inactive. Recovery uses the preserved `.env` and volume with `bin/setup-db.sh`; never reset the main volume or reuse the destructive isolated fixture tools there. [Phase 6](orders-api.md) implements ordering and kitchen tickets with service closure. Payment collection, password recovery, room editing, and production deployment remain later work.
