# Current State

Purpose: Current project phase, stable facts, blockers, and next recommended actions.
Read when: Starting or resuming project work.
Skip when: Only reading historical decisions or one-off command output.

## Phase

P0–P3 complete; P4 next. See `PLAN.md` for the authoritative progress table and completion checks.

## Current Top Objective

Connect the guest screens to the verified booking engine and implement secure guest management for P4.

## Stable Facts

- Marvin selected a 10-minute server-side hold and a 2-hour guest cancellation cutoff.
- Fictional demo venue policy, room limits, 1–16 online party size, and acceptance scenarios R01–R22 are in `PLAN.md`.
- `research/02_booking_engine.md` is the schema and concurrency sketch. The P0 design uses `hold_tables` for every physical member, `CHAR(10)` references, and active-only slot uniqueness with retained released rows.
- No real email/SMS delivery or payment collection is in the current scope.

## What Exists

Planning/research documents, an in-memory browser prototype, executable MySQL schema, repeatable demo seed, and PHP booking services/API. `docs/booking-api.md` documents the contract, locks, rules, and tests. The Windows Desktop roadmap is generated from `PLAN.md` by `scripts/export_roadmap.py`.

## What Works

P3 passed 36 isolated real-MySQL scenarios and 11 HTTP scenarios. Multi-process races proved final-table, interval overlap, joined members, shared pacing, and idempotent confirmation. Tests covered expiry while waiting for locks, policy/blackouts, code collisions, history, ownership, and CSRF. PHP lint passed across 26 files. Main/test smoke and main DB safeguards passed; the main availability API returned 18 slots. The additive upgrade preserved 185 demo records; seed reruns added 0 and now respect live holds/booking locks.

## Known Issues

The browser prototype is still a simulation; the PHP guest screens do not yet call the API. Secure guest management/modification and cancellation cutoff are P4. Staff roles, seating/no-show workflows, and waitlist promotion are P5. The internal cancellation service must be called only after caller authorization; no public cancellation route exists.

## Current Blockers

No P4 blocker is known. A fresh Ubuntu process has Docker group access; older terminal sessions may need to be reopened to refresh their group list.

## Next Recommended Actions

1. Connect the guest flow using the session/CSRF and API contract in `docs/booking-api.md`.
2. Implement secure management links, modification, cancellation cutoff, refresh persistence, and two-browser acceptance.

## Last Updated

2026-10-05
