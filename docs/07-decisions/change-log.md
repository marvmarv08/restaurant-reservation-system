# Change Log

Purpose: Chronological record of durable project behavior, requirement, implementation, and operation changes.
Read when: You need recent durable changes or must record a state-changing task.
Skip when: You only need the active task or current state.

## 2026-10-05

- Change: Locked Phase 0 booking rules in `PLAN.md`; reconciled hold, group membership, cancellation history, reference codes, room notice, and simulated notifications in the booking-engine and UX sketches.
- Evidence: Policy/schema assertions passed, 22 acceptance scenarios documented, `git diff --check` clean, PMM doctor passed.
- Remaining risk: MySQL DDL and concurrent booking behavior remain unexecuted until P2/P3; prototype remains in-memory only.
