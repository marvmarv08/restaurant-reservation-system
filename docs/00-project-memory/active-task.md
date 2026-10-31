---
pmm_schema: pmm.task/v1
task_id: private-ui-release-20261031
parent_task_id: none
task_kind: primary
execution_status: active
verification_status: pending
delivery_status: not-requested
owner: codex-private-release
branch: main
base_sha: 051baa74e03b6aec064ed7ab49ce137d62b9fdd4
revision: 1
verification_head: none
verification_source_hash: none
verified_at: none
updated_at: 2026-10-31T05:06:44Z
---

# Active Task

Purpose: Single primary task contract, verifier, retry state, and integration checkpoint.
Read when: Starting, executing, verifying, integrating, or recovering this task.
Skip when: The task is unrelated to the current execution context.

## Status

- Title: Publish local Bella Vista refinements privately and prepare next-session handoff
- Runtime Profile: Sprint
- Risk Level: normal
- Loop Budget: 3
- Current Attempt: 1
- Stop Condition: required behavior is verified or a concrete blocker is recorded.

## Task

- Objective: Publish local Bella Vista refinements privately and prepare next-session handoff
- Scope: Audit and verify all local gallery/category/logo refinements, commit and push to Marvin private repository, deploy Ready protected Vercel Preview on existing project/alias and update roadmap/resume memory; preserve databases/privacy
- Allowed Files or Areas: Audit and verify all local gallery/category/logo refinements, commit and push to Marvin private repository, deploy Ready protected Vercel Preview on existing project/alias and update roadmap/resume memory; preserve databases/privacy
- Forbidden Actions: unrelated edits, destructive operations, publication, and production writes without explicit authorization.
- Source Artifacts: project instructions, current source, and task request.

## Harness

- Agent Mode: solo
- Owner: codex-private-release
- Branch: main
- Parent Task: none
- Tools: project-local tools and pmm lifecycle helpers.
- Environment Notes: one writer owns this task file and branch.

## Verifier

- Required Checks: Affected UI regressions, source syntax and exact container/package checks; staged secret/private-file audit; matching GitHub ownership/private remote SHA; Vercel owner/project/source/Ready/Preview/alias/protection metadata; roadmap export and durable resume checkpoint
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
- Last Updated: 2026-10-31T05:06:44Z
