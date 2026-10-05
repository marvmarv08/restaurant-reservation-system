# Current State

Purpose: Current project phase, stable facts, blockers, and next recommended actions.
Read when: Starting or resuming project work.
Skip when: Only reading historical decisions or one-off command output.

## Phase

P0 and P1 complete; P2 next. See `PLAN.md` for the authoritative progress table and completion checks.

## Current Top Objective

Build the executable MySQL schema and repeatable sample data for P2.

## Stable Facts

- Marvin selected a 10-minute server-side hold and a 2-hour guest cancellation cutoff.
- Fictional demo venue policy, room limits, 1–16 online party size, and acceptance scenarios R01–R22 are in `PLAN.md`.
- `research/02_booking_engine.md` is the schema and concurrency sketch. The P0 design uses `hold_tables` for every physical member, `CHAR(10)` references, and active-only slot uniqueness with retained released rows.
- No real email/SMS delivery or payment collection is in the current scope.

## What Exists

Planning/research documents, an in-memory browser prototype, and a P1 Docker/PHP foundation with `/health`, Adminer, a quickstart, and `bin/smoke.sh`. The Windows Desktop roadmap is generated from `PLAN.md` by `scripts/export_roadmap.py`.

## What Works

Phase 0 documentation checks and prototype validator passed earlier. P1's PHP/MySQL/Adminer containers run through Ubuntu Docker Compose. `/health` returns `{"ok":true,"db":true}`, Adminer returns HTTP 200, and `bin/smoke.sh` passes from a fresh Ubuntu process. PHP lint, Compose config, PHP 8.3 syntax parsing, and Bash syntax also passed.

## Known Issues

The prototype can create duplicate holds/references, does not reserve all joined-table members, and does not enforce all planned rules or settings. The schema sketch has not been executed against MySQL.

## Current Blockers

No P2 blocker is known. The database exists but has no application schema or seed rows yet. A fresh Ubuntu process has Docker group access; older terminal sessions may need to be reopened to refresh their group list.

## Next Recommended Actions

1. Implement and execute the P2 schema and repeatable seed data.
2. Prove the P0 booking scenarios in P3/P4.

## Last Updated

2026-10-05
