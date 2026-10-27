---
pmm_schema: pmm.task/v1
task_id: release-local-to-github-vercel-20261027
parent_task_id: none
task_kind: primary
execution_status: active
verification_status: pending
delivery_status: not-requested
owner: codex-reservation-release
branch: main
base_sha: 94fe5a212f4e196215ffe6cdb717938c60570aca
revision: 3
verification_head: none
verification_source_hash: none
verified_at: none
updated_at: 2026-10-27T14:02:31Z
---

# Active Task

Purpose: Single primary task contract, verifier, retry state, and integration checkpoint.
Read when: Starting, executing, verifying, integrating, or recovering this task.
Skip when: The task is unrelated to the current execution context.

## Status

- Title: Publish verified local reservation source to GitHub and Vercel
- Runtime Profile: Audit
- Risk Level: high (public release and separately authorized hosted database setup)
- Loop Budget: 3
- Current Attempt: 1
- Stop Condition: required behavior is verified or a concrete blocker is recorded.

## Task

- Objective: Publish verified local reservation source to GitHub and Vercel
- Scope: Existing local application, assets, tests and release documentation; preserve private configuration and all databases
- Allowed Files or Areas: Existing local application, assets, tests and release documentation; preserve private configuration and all databases
- Forbidden Actions: unrelated edits, destructive operations, publication, and production writes without explicit authorization.
- Source Artifacts: project instructions, current source, and task request.

## Harness

- Agent Mode: assisted (single source writer; read-only release review)
- Owner: codex-reservation-release
- Branch: main
- Parent Task: none
- Tools: PMM, Docker isolated fixtures/browser checks, Vercel CLI with Marvin profile, GitHub CLI, and independent read-only release review.
- Environment Notes: one writer owns this task file and branch.

## Verifier

- Required Checks: Isolated MySQL/browser regression, syntax and secret checks; verified GitHub remote SHA and Vercel deployment metadata
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
- Next Concrete Action: All HTTP/browser release gates pass, including service-hours rehearsal with isolated connection clock restored. Final source image matches 211 packaged file hashes; 14 JS syntax checks pass. Finish targeted policy/worker rerun, restore original populated preview, commit/push source, deploy explicit Bella Vista Preview and verify alias/metadata. Worker hosting deferred by user.

## Record

- Verification Evidence: pending after checkpoint
- Delivery Status: not-requested
- Delivery Evidence: pending
- Docs Updated: pending
- Remaining Risk: pending verification.
- Memory Promotion Decision: pending
- Last Updated: 2026-10-27T13:37:51Z
