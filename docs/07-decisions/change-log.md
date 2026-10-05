# Change Log

Purpose: Chronological record of durable project behavior, requirement, implementation, and operation changes.
Read when: You need recent durable changes or must record a state-changing task.
Skip when: You only need the active task or current state.

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
