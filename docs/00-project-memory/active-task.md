---
pmm_schema: pmm.task/v1
task_id: lumina-github-sync
parent_task_id: none
task_kind: primary
execution_status: active
verification_status: pending
delivery_status: not-requested
owner: codex-root
branch: main
base_sha: b81ba9dabb5cd61eeb30cc352d9dceae8f03b297
revision: 1
verification_head: none
verification_source_hash: none
verified_at: none
updated_at: 2026-10-06T10:18:26Z
---

# Active Task

Purpose: Single primary task contract, verifier, retry state, and integration checkpoint.
Read when: Starting, executing, verifying, integrating, or recovering this task.
Skip when: The task is unrelated to the current execution context.

## Status

- Title: Publish verified Table Reserve source to Marvin GitHub
- Runtime Profile: Audit
- Risk Level: normal
- Loop Budget: 3
- Current Attempt: 1
- Stop Condition: required behavior is verified or a concrete blocker is recorded.

## Task

- Objective: Publish verified Table Reserve source to Marvin GitHub
- Scope: Review all unpublished project files and commits, verify the final source and private-file exclusions, record the deferred next feature, commit and push current main to marvmarv08/restaurant-reservation-system without rewriting history
- Allowed Files or Areas: Review all unpublished project files and commits, verify the final source and private-file exclusions, record the deferred next feature, commit and push current main to marvmarv08/restaurant-reservation-system without rewriting history
- Forbidden Actions: unrelated edits, destructive operations, publication, and production writes without explicit authorization.
- Source Artifacts: project instructions, current source, and task request.

## Harness

- Agent Mode: solo
- Owner: codex-root
- Branch: main
- Parent Task: none
- Tools: project-local tools and pmm lifecycle helpers.
- Environment Notes: one writer owns this task file and branch.

## Verifier

- Required Checks: Correct owner identity and destination; no private configuration or real secrets in candidate Git objects; passing isolated regressions and lint/smoke; professional commit; normal push; remote main equals local HEAD and clean working tree
- Manual Acceptance: final GitHub main must equal the Desktop HEAD, with a clean working tree and ignored private configuration.
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
- Next Concrete Action: execute the first unverified acceptance step.

## Record

- Verification Evidence: pending
- Delivery Status: not-requested
- Delivery Evidence: pending
- Docs Updated: pending
- Remaining Risk: pending verification.
- Memory Promotion Decision: pending
- Last Updated: 2026-10-06T10:18:26Z
