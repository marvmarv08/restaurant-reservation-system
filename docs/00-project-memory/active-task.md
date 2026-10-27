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
revision: 4
verification_head: none
verification_source_hash: none
verified_at: none
updated_at: 2026-10-27T14:08:30Z
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

- Pass/Fail: passed; independent release review has no remaining critical issue.
- Missing Evidence: no direct deployed-URL/browser acceptance; metadata and exact-image hosted-TLS smoke are the verified delivery boundary.
- False-Pass Risk: worker hosting and B7/B8 are explicitly outside this website-first release; Ready metadata does not establish live browser acceptance.
- Next Action: finalize verified documentation publication and close the authorized website release.

## Repair

- Last Failure: none
- Failure Class: none
- Attempted Fix: none
- Next Concrete Action: GitHub main verified at 21f85e209187bd5198bf20b1ae50f41b6e7b5b52. New Vercel Preview dpl_3Vz4Ue97D6a6TBdv6pKJgGAc8zgE / restaurant-reservation-system-c0pwqm0r5-marvmarv08.vercel.app submitted with explicit Bella Vista DB and alias APP_URL; await Ready, assign bella-vista-dining-marvmarv08.vercel.app, verify public protection/runtime metadata, finalize docs and close. Full tests and original-preview restore passed; online worker remains deferred.

## Record

- Verification Evidence: pending after checkpoint
- Delivery Status: not-requested
- Delivery Evidence: pending
- Docs Updated: README, PLAN, deployment guide, current state, change log and Desktop roadmap.
- Remaining Risk: always-running hosted worker remains deferred; existing online credentials differ from laptop credentials; no real payment processing or full assignment acceptance claimed.
- Memory Promotion Decision: durable release facts kept project-local; no secrets or fixture logs promoted.
- Last Updated: 2026-10-27T13:37:51Z
