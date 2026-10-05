# Current State

Purpose: Current project phase, stable facts, blockers, and next recommended actions.
Read when: Starting or resuming project work.
Skip when: Only reading historical decisions or one-off command output.

## Phase

P0 complete; P1 in progress. See `PLAN.md` for the authoritative progress table and completion checks.

## Current Top Objective

Verify the new PHP 8.3 + MySQL 8.4 application through Docker Compose on Marvin's Windows/WSL machine.

## Stable Facts

- Marvin selected a 10-minute server-side hold and a 2-hour guest cancellation cutoff.
- Fictional demo venue policy, room limits, 1–16 online party size, and acceptance scenarios R01–R22 are in `PLAN.md`.
- `research/02_booking_engine.md` is the schema and concurrency sketch. The P0 design uses `hold_tables` for every physical member, `CHAR(10)` references, and active-only slot uniqueness with retained released rows.
- No real email/SMS delivery or payment collection is in the current scope.

## What Exists

Planning/research documents, an in-memory browser prototype, and a P1 Docker/PHP foundation with `/health`, Adminer, a quickstart, and `bin/smoke.sh`. The Windows Desktop roadmap is generated from `PLAN.md` by `scripts/export_roadmap.py`.

## What Works

Phase 0 documentation checks and prototype validator passed earlier. For P1, official Docker Compose CLI `config --quiet`, PHP 8.3 syntax parsing, Bash syntax, and `git diff --check` passed. Live backend startup is still unverified.

## Known Issues

The prototype can create duplicate holds/references, does not reserve all joined-table members, and does not enforce all planned rules or settings. The schema sketch has not been executed against MySQL.

## Current Blockers

Docker Desktop is not installed on Marvin's Windows PC. Windows Package Manager's catalog returned `0x8a15000f`, so install Docker Desktop through the official Windows installer. Live Compose and MySQL checks cannot run yet.

## Next Recommended Actions

1. Install/start Docker Desktop and enable this WSL distribution, then run the README quickstart and `bash bin/smoke.sh`.
2. If successful, mark P1 Done and refresh the Windows Desktop roadmap.
3. Implement and execute the schema in P2, then prove the P0 scenarios in P3/P4.

## Last Updated

2026-10-05
