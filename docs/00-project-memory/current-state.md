# Current State

Purpose: Current project phase, stable facts, blockers, and next recommended actions.
Read when: Starting or resuming project work.
Skip when: Only reading historical decisions or one-off command output.

## Phase

P0 complete; P1 next. See `PLAN.md` for the authoritative progress table and completion checks.

## Current Top Objective

Boot the PHP 8.3 + MySQL 8.4 application through Docker Compose and make a fresh checkout run.

## Stable Facts

- Marvin selected a 10-minute server-side hold and a 2-hour guest cancellation cutoff.
- Fictional demo venue policy, room limits, 1–16 online party size, and acceptance scenarios R01–R22 are in `PLAN.md`.
- `research/02_booking_engine.md` is the schema and concurrency sketch. The P0 design uses `hold_tables` for every physical member, `CHAR(10)` references, and active-only slot uniqueness with retained released rows.
- No real email/SMS delivery or payment collection is in the current scope.

## What Exists

Planning/research documents and an in-memory browser prototype. The Windows Desktop roadmap is generated from `PLAN.md` by `scripts/export_roadmap.py`.

## What Works

Phase 0 documentation consistency checks, the prototype's existing validator, and roadmap export have been checked. No backend runs yet.

## Known Issues

The prototype can create duplicate holds/references, does not reserve all joined-table members, and does not enforce all planned rules or settings. The schema sketch has not been executed against MySQL.

## Current Blockers

None for P1 local development. GitHub publishing requires a valid Marvin `marvmarv08` GitHub CLI login.

## Next Recommended Actions

1. Implement P1 boot and verify fresh checkout startup.
2. Implement and execute the schema in P2, then prove the P0 scenarios in P3/P4.

## Last Updated

2026-10-05
