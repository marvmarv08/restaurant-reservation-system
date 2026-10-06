---
pmm_schema: pmm.task/v1
task_id: lumina-vercel-full-system
parent_task_id: none
task_kind: primary
execution_status: active
verification_status: pending
delivery_status: not-requested
owner: codex-root
branch: feat/vercel-full-system
base_sha: 0d519c21122c8e6d5ce9ae6e0188019fe7718c98
revision: 1
verification_head: none
verification_source_hash: none
verified_at: none
updated_at: 2026-10-06T10:40:39Z
---

# Active Task

Purpose: Single primary task contract, verifier, retry state, and integration checkpoint.
Read when: Starting, executing, verifying, integrating, or recovering this task.
Skip when: The task is unrelated to the current execution context.

## Status

- Title: Deploy the full PHP MySQL application on Vercel
- Runtime Profile: Sprint
- Risk Level: normal
- Loop Budget: 3
- Current Attempt: 1
- Stop Condition: required behavior is verified or a concrete blocker is recorded.

## Task

- Objective: Deploy the full PHP MySQL application on Vercel
- Scope: Vercel PHP container configuration, encrypted hosted MySQL connection, persistent isolated guest/staff sessions, guarded hosted database initialization, verified preview deployment, deployment documentation and project state. No main database migration/reset, credential publication, paid service purchase, Featured Dish or unrelated features
- Allowed Files or Areas: Vercel PHP container configuration, encrypted hosted MySQL connection, persistent isolated guest/staff sessions, guarded hosted database initialization, verified preview deployment, deployment documentation and project state. No main database migration/reset, credential publication, paid service purchase, Featured Dish or unrelated features
- Forbidden Actions: unrelated edits, destructive operations, publication, and production writes without explicit authorization.
- Source Artifacts: project instructions, current source, and task request.

## Harness

- Agent Mode: solo
- Owner: codex-root
- Branch: feat/vercel-full-system
- Parent Task: none
- Tools: project-local tools and pmm lifecycle helpers.
- Environment Notes: one writer owns this task file and branch.

## Verifier

- Required Checks: Real cross-instance and restart session behavior, strict IDs/rotation/logout/locking/expiry and transaction isolation, verified TLS failure behavior, isolated booking/auth/order regressions, container routing and secret exclusions, online provider readiness, hosted DB bootstrap and authenticated preview deployment. Only report full deployment after actual readiness evidence.
- Manual Acceptance: task-specific acceptance remains explicit.
- Evidence Needed: fresh command output bound to the current HEAD and source hash.

## Critic

- Pass/Fail: pending
- Missing Evidence: required checks have not completed.
- False-Pass Risk: stale or unrelated evidence must not count.
- Next Action: execute the first unverified acceptance step.

## Repair

- Last Failure: none
- Failure Class: none
- Attempted Fix: none
- Next Concrete Action: resolve the isolated feedback-browser timeout; verify a new free Marvin Vercel workspace outside cjmarv; wait for Aiven host/port/CA before any hosted initialization.

## Record

- Verification Evidence: 15 real sessions, 5 configuration, 4 real TLS, 9 initialization, 10 cross-container HTTP and 393 existing isolated regression checks passed; 62-file PHP lint, actual image secret exclusions, private password scan and diff check passed. Final review and online evidence remain pending.
- Delivery Status: not-requested
- Delivery Evidence: pending
- Docs Updated: pending
- Remaining Risk: hosted credentials remain incomplete (host/port/CA); online database and preview deployment unverified. Dedicated Vercel login is marvmarv08; cjmarv is explicitly forbidden.
- Memory Promotion Decision: pending
- Last Updated: 2026-10-06T10:40:39Z
