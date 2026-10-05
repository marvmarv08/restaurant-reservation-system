# Change Log

Purpose: Chronological record of durable project behavior, requirement, implementation, and operation changes.
Read when: You need recent durable changes or must record a state-changing task.
Skip when: You only need the active task or current state.

## 2026-10-06 — Phase 5 secure staff and live host workspace

- Change: Added one-use activation with hash-only tokens, bcrypt passwords, database-backed account/IP login limits, separate staff sessions, current server-side permissions, recent-auth account writes, and permanent account-version revocation. Connected host/admin pages to real reservation/floor data, phone/walk-in booking, atomic future edits, approval, seating with one order, completion/reset, no-show/cancellation, waitlist offers, settings/blackouts, staff management, audit, and simulated outbox. Main app now binds to loopback by default.
- Decision: Owners choose passwords through private activation; no shared demo password or automatically activated main account. Walk-ins bypass only online lead time in Main Dining/Terrace. Keeping an existing room/time preserves original notice eligibility. Waitlist acceptance is staff-mediated and holds all physical tables before recording a notification. Empty seated orders are voided on completion rather than marked paid. Existing stored booking intervals remain stable when settings change.
- Evidence: 31 staff MySQL, 13 staff HTTP, and 10 staff browser scenarios passed; P3/P4 regressions remained passing, totaling 134 scenarios. Tests include independent-process queue/claim/creation races, expiry/revocation after locks, role round-trips, last-admin protection, settings conflicts, actual workflows, desktop/mobile, and stored markup. PHP lint passed on 47 files; main/test smoke and main DB safeguards passed. The additive upgrade and seed kept all pre-upgrade 186 reservations, 31 guests, and 195 history rows, including 31 cancelled bookings; five existing staff remain inactive. Source guides and resume checkpoint updated for P6.
- Lesson: Signing in proves identity; a permission check decides which actions are allowed. A role change must revoke old sessions permanently. A version that only increases prevents an old session becoming valid again after a role is restored.
- Lesson: A waitlist message promising a table needs a real inventory hold first. A transaction saves the hold, all table members, and the notification together; expiry is enforced after waiting for locks.
- Lesson: A creation request ID makes a repeated network submission safe: the server returns the same booking instead of inserting a duplicate. Verification fixtures must truly change the intended state; web session files require the web server's ownership, and cookie tests must match browser behavior.
- Remaining work: Marvin privately activates the first admin for hands-on use. P6 implements real menu/order/kitchen workflows and server/kitchen permissions; P7 covers HTTPS hosting and demo readiness. No external messages/payments, password recovery, public guest waitlist claim, seated table moves, room editor, or advanced reports are claimed.
- Recovery: Keep the existing `.env` and MySQL volume. `bin/setup-db.sh` performs an additive upgrade without resetting data. Never run isolated fixture resets on the main stack.

## 2026-10-05 — Phase 4 live guest MVP

- Change: Connected the responsive guest site and menu to MySQL, with real availability, SVG/radio selection, server-clock hold countdown, details, confirmation, refresh recovery, and private self-service management. Private secrets travel in URL fragments and request headers; MySQL stores hashes with expiry/revocation. Atomic modification locks both dates and all old/new physical tables, preserves the original on failure, and records before/after snapshots. Versions reject stale tabs. Cancellation releases inventory with history retained.
- Decision: Modification shares the two-hour cancellation cutoff so a last-minute guest cannot move a booking solely to bypass the cancellation rule. The reusable management link expires one day after the booking's blocked interval, updated when the date/time changes. No real notification or payment is sent; guests save their private link. Staff/manager actions remain P5.
- Evidence: 14 management MySQL, 7 management HTTP, and 12 browser scenarios passed; the 36 MySQL/11 HTTP booking regressions remained passing. Actual browsers verified refresh, second-browser access, interrupted confirmation recovery, conflicting tabs, cancellation confirmation, joined highlights, pending approval, countdown expiry, keyboard selection, and 320px/mobile layout. PHP lint passed on 35 files; main/test smoke and main DB safeguards passed. The additive upgrade retained 185 main reservations, 30 guests, and 193 status-history rows; seed rerun added 0. The known demo menu encoding error was repaired without replacing edited data.
- Lesson: A reference such as `LUM-XXXXXX` identifies a booking; it does not prove permission. A private link acts like a password and must be protected. The server checks expiry and cutoff after waiting for database locks, because a browser timer or disabled button cannot enforce those rules.
- Lesson: Searching for a replacement must leave the original reserved. An atomic save either completes all inventory changes or rolls them back. A version number tells the server when another tab changed the booking, avoiding an accidental overwrite.
- Next: P5 staff authentication, permissions, host/admin workflow, and audit identity; P6 ordering/kitchen integration follows.

## 2026-10-05 — Phase 3 transactional booking engine

- Change: Added database-driven availability, scoped blackouts, room/notice/turn/close rules, ten-minute owned holds, transactional confirmation, code collision retries, and idempotent confirmation. All joined members are locked and saved. A per-date lock protects pacing across different tables. Guest API mutations require the guest session and CSRF token. Cancellation remains an internal service for future authorized controllers; notifications stay in the demo outbox.
- Evidence: 36 isolated MySQL tests and 11 HTTP tests passed, including separate-process races for the final VIP table, overlapping starts, joined members, pacing, and confirmation. Expiry while waiting for locks was rejected. PHP lint passed on 26 files; main/test smoke and main database safeguards passed. The additive upgrade and protected seeder preserved 185 main demo rows and added 0 on rerun.
- Lesson: A transaction groups related database writes so they either all save or all roll back. Physical-table locks protect seats, while the date lock protects the restaurant's shared pacing limit. A successful availability search is provisional; the transaction checks it again before holding or booking.
- Next: P4 connects the browser screens and adds secure management links, modification, and cancellation cutoff enforcement.

## 2026-10-05 — Phase 2 database and repeatable seed

- Change: Added executable MySQL tables and foreign keys for room inventory, policy, staff, guests, reservations, holds, orders, history, and demo outbox. Imported the prototype's 25 tables and 36 menu items; a one-shot PHP seed supplies date-relative reservations. Staff profiles are inactive until secure login is implemented.
- Evidence: Final fresh isolated Compose startup seeded 179 reservations and a rerun added 0. The existing volume retained 185 sample rows; eight early demo bookings beyond pacing were cancelled with history retained, and the next rerun made 0 changes. The database verifier tested foreign keys, duplicate references, same-slot conflict, cancelled-slot reuse with history, joined members, pacing, and no live seed overlap. The PHP smoke check passed. The isolated rehearsal volume was removed; the main volume was retained.
- Lesson: MySQL init files run only when a data volume is new. An existing P1 volume needs the idempotent `bin/setup-db.sh` upgrade. The database unique index blocks identical live starts; interval overlap safety still needs P3's transaction and table locks.

## 2026-10-05 — Phase 1 checkpoint

- Change: Added the Docker Compose stack, PHP front controller and health endpoint, starter page, quickstart, and smoke script. P1 is complete.
- Evidence: Real PHP/MySQL/Adminer containers run and are reachable; fresh Ubuntu `docker compose ps` shows healthy PHP/MySQL, `/health` returns DB true, Adminer returns HTTP 200, and `bin/smoke.sh` passes. Compose config, PHP syntax, Bash syntax, and `git diff --check` passed.
- Remaining risk: The database has no P2 application schema or seed data yet; the starter page does not book tables.

## 2026-10-05

- Change: Locked Phase 0 booking rules in `PLAN.md`; reconciled hold, group membership, cancellation history, reference codes, room notice, and simulated notifications in the booking-engine and UX sketches.
- Evidence: Policy/schema assertions passed, 22 acceptance scenarios documented, `git diff --check` clean, PMM doctor passed.
- Remaining risk: MySQL DDL and concurrent booking behavior remain unexecuted until P2/P3; prototype remains in-memory only.
