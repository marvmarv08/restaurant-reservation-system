---
pmm_schema: pmm.task/v1
task_id: reservation-delete
parent_task_id: lumina-hosted-endpoint-performance
task_kind: work-item
execution_status: active
verification_status: pending
delivery_status: waiting-confirmation
owner: codex-delete
branch: main
base_sha: 0d519c21122c8e6d5ce9ae6e0188019fe7718c98
revision: 3
verification_head: none
verification_source_hash: none
verified_at: none
updated_at: 2026-10-07T11:47:35Z
---

# Work Item

Purpose: Branch-isolated child work item owned by one execution context.
Read when: Starting, executing, verifying, integrating, or recovering this task.
Skip when: The task is unrelated to the current execution context.

## Status

- Title: Add confirmed permanent reservation deletion
- Runtime Profile: Sprint
- Risk Level: normal
- Loop Budget: 3
- Current Attempt: 1
- Stop Condition: required behavior is verified or a concrete blocker is recorded.

## Task

- Objective: Add confirmed permanent reservation deletion
- Scope: Staff reservation API, permissions, UI, isolated tests and project documentation
- Allowed Files or Areas: Staff reservation API, permissions, UI, isolated tests and project documentation
- Forbidden Actions: unrelated edits, destructive operations, publication, and production writes without explicit authorization.
- Source Artifacts: project instructions, current source, and task request.

## Harness

- Agent Mode: solo
- Owner: codex-delete
- Branch: main
- Parent Task: lumina-hosted-endpoint-performance
- Tools: project-local tools and pmm lifecycle helpers.
- Environment Notes: one writer owns this task file and branch.

## Verifier

- Required Checks: Real MySQL deletion and staff HTTP/browser regressions, PHP lint and JS syntax
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
- Next Concrete Action: Complete final isolated regression evidence and prepare local feature commit; hosted branch integration and deployment are not performed

## Record

- Verification Evidence: pending after checkpoint
- Delivery Status: waiting-confirmation
- Delivery Evidence: Verified local source and screenshots; hosted branch integration and Vercel publication require separate delivery authorization. No actual existing bookings deleted.
- Docs Updated: pending
- Remaining Risk: pending verification.
- Memory Promotion Decision: pending
- Last Updated: 2026-10-07T11:22:45Z
