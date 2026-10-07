---
pmm_schema: pmm.task/v1
task_id: hosted-delete-zero-counter
parent_task_id: none
task_kind: primary
execution_status: active
verification_status: passed
delivery_status: ready
owner: codex-root
branch: feat/vercel-full-system
base_sha: 24d6ca3cf3379d0e9a0dd36d266fdc5e8ed0274f
revision: 3
verification_head: 162b6b8237709ca2325ad3299e704c8fe3921568
verification_source_hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
verified_at: 2026-10-07T13:19:12Z
updated_at: 2026-10-07T13:19:14Z
---

# Active Task

Purpose: Single primary task contract, verifier, retry state, and integration checkpoint.
Read when: Starting, executing, verifying, integrating, or recovering this task.
Skip when: The task is unrelated to the current execution context.

## Status

- Title: Handle zero no-show counters in permanent deletion
- Runtime Profile: Sprint
- Risk Level: normal
- Loop Budget: 3
- Current Attempt: 1
- Stop Condition: required behavior is verified or a concrete blocker is recorded.

## Task

- Objective: Handle zero no-show counters in permanent deletion
- Scope: No-show counter SQL, isolated regression and corrected Vercel Preview; no live data mutations
- Allowed Files or Areas: No-show counter SQL, isolated regression and corrected Vercel Preview; no live data mutations
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

- Required Checks: Observe zero-counter failure, pass staff MySQL/HTTP/browser checks and confirm corrected Preview READY metadata
- Manual Acceptance: task-specific acceptance remains explicit.
- Evidence Needed: fresh command output bound to the current HEAD and source hash.

## Critic

- Pass/Fail: pass
- Missing Evidence: required checks have not completed.
- False-Pass Risk: stale or unrelated evidence must not count.
- Next Action: execute the first unverified acceptance step.

## Repair

- Last Failure: none
- Failure Class: none
- Attempted Fix: none
- Next Concrete Action: execute the first unverified acceptance step.

## Record

- Verification Evidence: Observed zero-counter SQLSTATE22003 failure, then passed 43 staff MySQL, 14 HTTP, 10 browser checks and 63 PHP lint files; independent review passed. Preview metadata remains the delivery check.
- Delivery Status: ready
- Delivery Evidence: Corrected Preview redeployment explicitly authorized by user; isolated regression verified; no live bookings changed.
- Docs Updated: pending
- Remaining Risk: pending verification.
- Memory Promotion Decision: pending
- Last Updated: 2026-10-07T13:07:46Z
