---
pmm_schema: pmm.task/v1
task_id: reservation-delete
parent_task_id: lumina-hosted-endpoint-performance
task_kind: work-item
execution_status: ready-to-integrate
verification_status: passed
delivery_status: waiting-confirmation
owner: codex-delete
branch: main
base_sha: 0d519c21122c8e6d5ce9ae6e0188019fe7718c98
revision: 5
verification_head: 3db9526df0b188d4b7c838f8ec0f011a51711294
verification_source_hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
verified_at: 2026-10-07T11:48:14Z
updated_at: 2026-10-07T11:48:18Z
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

- Pass/Fail: pass
- Missing Evidence: required checks have not completed.
- False-Pass Risk: stale or unrelated evidence must not count.
- Next Action: execute the first unverified acceptance step.

## Repair

- Last Failure: none
- Failure Class: none
- Attempted Fix: none
- Next Concrete Action: commit this operational checkpoint, merge the branch, then run pmm-task.sh integrate from the primary branch

## Record

- Verification Evidence: 120 MySQL + 44 HTTP + 241 browser checks passed on final implementation; 54-file PHP lint, JS syntax, isolated smoke, git diff --check and PMM doctor passed; desktop/mobile confirmation reviewed; independent code review approved. Initial unchanged food-showcase image-loading timeout disclosed, no failed resources in diagnostic, unchanged rerun passed 20 checks. No existing local/hosted bookings deleted; no deployment.
- Delivery Status: waiting-confirmation
- Delivery Evidence: Verified local source and screenshots; hosted branch integration and Vercel publication require separate delivery authorization. No actual existing bookings deleted.
- Docs Updated: pending
- Remaining Risk: pending verification.
- Memory Promotion Decision: pending
- Last Updated: 2026-10-07T11:22:45Z
