---
pmm_schema: pmm.task/v1
task_id: lumina-hosted-endpoint-performance
parent_task_id: none
task_kind: primary
execution_status: active
verification_status: pending
delivery_status: deployed
owner: codex-root
branch: feat/vercel-full-system
base_sha: 752db0807f4538a54bf162186c9aed113f71ea7d
revision: 8
verification_head: none
verification_source_hash: none
verified_at: none
updated_at: 2026-10-06T17:11:56Z
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
- Current Attempt: 2
- Stop Condition: required behavior is verified or a concrete blocker is recorded.

## Task

- Objective: Reduce hosted endpoint loading delays
- Scope: Full guest/manage/admin/server/kitchen browser latency and UI verification; align Vercel compute to user-confirmed Aiven Singapore, parallelize independent reads, coalesce overlapping refreshes, preserve booking/auth/order rules and data; no database migration, resets of hosted/laptop records or paid resources.
- Allowed Files or Areas: public/assets/js, src, config, tests, vercel.json, Dockerfile.vercel, docs, PLAN.md
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
- Missing Evidence: Agent-hosted timing and workflow evidence is complete; Marvin personal feedback remains pending.
- False-Pass Risk: stale or unrelated evidence must not count.
- Next Action: Marvin rehearses the new URL and distinguishes an idle first-open from normal search/refresh.

## Repair

- Last Failure: Marvin reports all-workspace loading remains slow after the query batching release.
- Failure Class: incomplete end-to-end verification; compute/database region mismatch and sequential UI request chains.
- Attempted Fix: Singapore sin1 compute, parallel initial public/menu reads, coordinated pending refresh and revision guards, lean PHP/Apache image; validated on committed hosted release.
- Next Concrete Action: Marvin rehearses final Singapore URL; agent acceptance and cleanup are documented, personal feedback pending with idle startup limit.

## Record

- Verification Evidence: Source ad83512 READY sin1 Preview dpl_9A4ECThL2HajE4WWWX6dnVa2TvgP verified owner; 404 isolated app checks plus 22 runtime checks; final 21 real hosted UI checks/no JS errors; own QA cancelled/deactivated, probes removed. docs/verification/workspace-loading.md contains measured before/after and idle startup limit.
- Delivery Status: deployed
- Delivery Evidence: READY sin1 Container Preview https://restaurant-reservation-system-62moe3jjm-marvmarv08.vercel.app source ad8351218c9cc54c7f1a414c4837f1abac3132e4 verified Marvin owner; 21 hosted checks passed, private/Preview APP_URL updated, QA cleaned. Normal refresh fast; first-open cold startup 4–6 s remains; Marvin followup pending.
- Docs Updated: PLAN.md, current-state.md, change-log.md, vercel-deployment.md and Windows Desktop roadmap.
- Remaining Risk: normal hosted refreshes are verified fast; idle container first-open can still take roughly 4–6 seconds. Marvin personal timing feedback remains pending.
- Memory Promotion Decision: pending
- Last Updated: 2026-10-06T12:53:33Z
