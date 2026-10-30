---
pmm_schema: pmm.task/v1
task_id: private-ui-release-20261030
parent_task_id: none
task_kind: primary
execution_status: active
verification_status: pending
delivery_status: not-requested
owner: codex-private-release
branch: feat/restaurant-introduction
base_sha: df095c7c74414b439fd92cfe5ad722304a89f5b1
revision: 1
verification_head: none
verification_source_hash: none
verified_at: none
updated_at: 2026-10-30T05:50:15Z
---

# Active Task

Purpose: Single primary task contract, verifier, retry state, and integration checkpoint.
Read when: Starting, executing, verifying, integrating, or recovering this task.
Skip when: The task is unrelated to the current execution context.

## Status

- Title: Publish all completed local UI work to private GitHub and Vercel
- Runtime Profile: Sprint
- Risk Level: normal
- Loop Budget: 3
- Current Attempt: 1
- Stop Condition: required behavior is verified or a concrete blocker is recorded.

## Task

- Objective: Publish all completed local UI work to private GitHub and Vercel
- Scope: Audit and commit completed local intro/menu work, push existing Marvin repository and deploy verified Preview with existing hosted database and private access; no data migration or public access change
- Allowed Files or Areas: Audit and commit completed local intro/menu work, push existing Marvin repository and deploy verified Preview with existing hosted database and private access; no data migration or public access change
- Forbidden Actions: unrelated edits, destructive operations, publication, and production writes without explicit authorization.
- Source Artifacts: project instructions, current source, and task request.

## Harness

- Agent Mode: solo
- Owner: codex-private-release
- Branch: feat/restaurant-introduction
- Parent Task: none
- Tools: project-local tools and pmm lifecycle helpers.
- Environment Notes: one writer owns this task file and branch.

## Verifier

- Required Checks: Identity/source/privacy audit, integrated changed-scope browser checks and lint, independent review, build/package secret exclusions, exact remote SHA and Ready Preview/alias metadata
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
- Next Concrete Action: execute the first unverified acceptance step.

## Record

- Verification Evidence: pending
- Delivery Status: not-requested
- Delivery Evidence: pending
- Docs Updated: pending
- Remaining Risk: pending verification.
- Memory Promotion Decision: pending
- Last Updated: 2026-10-30T05:50:15Z
