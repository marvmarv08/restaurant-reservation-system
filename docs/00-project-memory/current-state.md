# Current State

Purpose: Current project phase, stable facts, blockers, and next recommended actions.
Read when: Starting or resuming project work.
Skip when: Only reading historical decisions or one-off command output.

## Phase

P0–P2 complete; P3 next. See `PLAN.md` for the authoritative progress table and completion checks.

## Current Top Objective

Build the safe booking engine on the executable MySQL schema for P3.

## Stable Facts

- Marvin selected a 10-minute server-side hold and a 2-hour guest cancellation cutoff.
- Fictional demo venue policy, room limits, 1–16 online party size, and acceptance scenarios R01–R22 are in `PLAN.md`.
- `research/02_booking_engine.md` is the schema and concurrency sketch. The P0 design uses `hold_tables` for every physical member, `CHAR(10)` references, and active-only slot uniqueness with retained released rows.
- No real email/SMS delivery or payment collection is in the current scope.

## What Exists

Planning/research documents, an in-memory browser prototype, a Docker/PHP foundation, and executable Phase 2 MySQL schema plus repeatable reference and demo seed. The Windows Desktop roadmap is generated from `PLAN.md` by `scripts/export_roadmap.py`.

## What Works

An isolated empty Compose volume auto-loaded 4 rooms, 25 physical tables, 36 menu items, 30 demo guests, and 179 date-relative reservations; rerun added 0. The existing P1 volume was upgraded without reset. Eight early demo rows exceeding pacing were cancelled with history retained. `bin/verify-db.php` proved foreign keys, unique codes, active-slot uniqueness, cancelled-slot reuse with retained history, joined membership, pacing, and no live seed overlaps; `bin/smoke.sh` passed on both stacks.

## Known Issues

The browser prototype is still a simulation. The PHP application does not yet offer real availability, hold creation, booking, or guest self-service. The active-slot unique index guards identical starts; P3 must add transactional interval overlap checks.

## Current Blockers

No P3 blocker is known. A fresh Ubuntu process has Docker group access; older terminal sessions may need to be reopened to refresh their group list.

## Next Recommended Actions

1. Implement transactional availability, holds, and bookings using P0 rules and every joined-table member.
2. Prove overlap, expiry, blackout, pacing, and concurrent final-table behavior before guest UI integration.

## Last Updated

2026-10-05
