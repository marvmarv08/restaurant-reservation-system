---
pmm_schema: pmm.task/v1
task_id: lumina-hosted-endpoint-performance
parent_task_id: none
task_kind: primary
execution_status: active
verification_status: passed
delivery_status: deployed
owner: codex-root
branch: feat/vercel-full-system
base_sha: 752db0807f4538a54bf162186c9aed113f71ea7d
revision: 4
verification_head: 01770c7759146b3f4ea57c9400533b551e37f184
verification_source_hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
verified_at: 2026-10-06T13:23:58Z
updated_at: 2026-10-06T13:24:00Z
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

- Pass/Fail: pass
- Missing Evidence: Marvin actual hosted timing acceptance remains separate and pending.
- False-Pass Risk: stale or unrelated evidence must not count.
- Next Action: execute the first unverified acceptance step.

## Repair

- Last Failure: none
- Failure Class: none
- Attempted Fix: none
- Next Concrete Action: Marvin checks actual guest/staff loading and hold/confirmation in the new performance Preview; record feedback before closing task.

## Record

- Verification Evidence: 398 isolated checks (114 MySQL,43 HTTP,241 browser),63 PHP lint,local/cloud container builds,independent review;actual Aiven search82.7s726reads to1.85-2.57s14reads and slot5.37s45reads to1.92s13reads;Marvin team owner,READY Container Preview source761bea6;manual hosted timing acceptance pending separately
- Delivery Status: deployed
- Delivery Evidence: READY Container Preview https://restaurant-reservation-system-cqf5ojxvr-marvmarv08.vercel.app source761bea6 owner verified Marvin team; APP_URL updated privately; no hosted data resets; actual user timing acceptance pending
- Docs Updated: PLAN.md, current-state.md, change-log.md, vercel-deployment.md and Windows Desktop roadmap.
- Remaining Risk: measured Aiven timings exclude Vercel startup/session/HTTP/browser overhead; actual hosted browser timing remains pending.
- Memory Promotion Decision: pending
- Last Updated: 2026-10-06T12:53:33Z
