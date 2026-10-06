---
pmm_schema: pmm.task/v1
task_id: lumina-hosted-endpoint-performance
parent_task_id: none
task_kind: primary
execution_status: active
verification_status: pending
delivery_status: not-requested
owner: codex-root
branch: feat/vercel-full-system
base_sha: 752db0807f4538a54bf162186c9aed113f71ea7d
revision: 2
verification_head: none
verification_source_hash: none
verified_at: none
updated_at: 2026-10-06T13:08:39Z
---

# Active Task

Purpose: Single primary task contract, verifier, retry state, and integration checkpoint.
Read when: Starting, executing, verifying, integrating, or recovering this task.
Skip when: The task is unrelated to the current execution context.

## Status

- Title: Reduce hosted endpoint loading delays
- Runtime Profile: Sprint
- Risk Level: normal
- Loop Budget: 3
- Current Attempt: 1
- Stop Condition: required behavior is verified or a concrete blocker is recorded.

## Task

- Objective: Reduce hosted endpoint loading delays
- Scope: Read-only hosted profiling, request-scoped availability query optimization and measured regression-safe preview delivery; no booking/auth rule changes, persistent availability cache, database reset, region migration or paid resources
- Allowed Files or Areas: Read-only hosted profiling, request-scoped availability query optimization and measured regression-safe preview delivery; no booking/auth rule changes, persistent availability cache, database reset, region migration or paid resources
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

- Required Checks: Measured before/after query counts and latency with real Aiven TLS, isolated availability/booking/management/staff/order correctness and concurrency regressions, no stale held inventory, verified preview build
- Manual Acceptance: Marvin checks actual guest/staff loading and hold/confirmation in the new Preview; pending after deployment.
- Evidence Needed: fresh command output bound to the current HEAD and source hash.

## Critic

- Pass/Fail: pending
- Missing Evidence: updated Preview build is pending; Marvin actual hosted timing acceptance remains separate.
- False-Pass Risk: stale or unrelated evidence must not count.
- Next Action: execute the first unverified acceptance step.

## Repair

- Last Failure: none
- Failure Class: none
- Attempted Fix: none
- Next Concrete Action: Complete final isolated suites and publish reviewed batch availability to Marvin Preview; obtain actual browser timing acceptance

## Record

- Verification Evidence: 398 isolated checks passed (114 MySQL, 43 HTTP, 241 browser), 63-file PHP lint, local container build, Aiven read-only before/after benchmarks, fresh independent review; Preview build pending.
- Delivery Status: not-requested
- Delivery Evidence: pending
- Docs Updated: pending
- Remaining Risk: measured Aiven timings exclude Vercel startup/session/HTTP/browser overhead; actual hosted browser timing remains pending.
- Memory Promotion Decision: pending
- Last Updated: 2026-10-06T12:53:33Z
