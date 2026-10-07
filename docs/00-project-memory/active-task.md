---
pmm_schema: pmm.task/v1
task_id: lumina-hosted-endpoint-performance
parent_task_id: none
task_kind: primary
execution_status: active
verification_status: passed
delivery_status: ready
owner: codex-root
branch: feat/vercel-full-system
base_sha: 752db0807f4538a54bf162186c9aed113f71ea7d
revision: 12
verification_head: 5648fcec71072d8b61345518821552e0adc99788
verification_source_hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
verified_at: 2026-10-07T12:39:28Z
updated_at: 2026-10-07T12:39:31Z
---

# Active Task

Purpose: Single primary task contract, verifier, retry state, and integration checkpoint.
Read when: Starting, executing, verifying, integrating, or recovering this task.
Skip when: The task is unrelated to the current execution context.

## Status

- Title: Deploy permanent reservation deletion with hosted improvements preserved
- Runtime Profile: Audit
- Risk Level: high
- Loop Budget: 3
- Current Attempt: 2
- Stop Condition: required behavior is verified or a concrete blocker is recorded.

## Task

- Objective: Integrate the verified reservation-delete child and publish the authorized Vercel Preview, preserving existing hosted booking/auth/order behavior, records, video/mobile motion and performance fixes.
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

- Required Checks: Integrated isolated booking/management/staff/order MySQL, HTTP and browser regressions; hosted configuration and database-session guards; syntax/lint/smoke; source/secret checks; independent integrated-code review; verified Marvin project/account and READY Preview deployment metadata. No live deletion or database reset.
- Manual Acceptance: Marvin signs in as admin on the new Preview and reviews Delete / Keep reservation. Agent tests deletion using isolated fake records only. Prior personal performance feedback remains a separate optional follow-up.
- Evidence Needed: fresh command output bound to the current HEAD and source hash.

## Critic

- Pass/Fail: pass
- Missing Evidence: New Preview READY metadata remains pending. No live UI or live deletion is claimed; the deployment skill prohibits fetching the deployed application URL.
- False-Pass Risk: source tests alone cannot prove live UI behavior; report READY metadata separately. The Vercel deployment skill prohibits fetching the deployed application URL, so no live deletion or live UI result is claimed.
- Next Action: Marvin rehearses the new URL and distinguishes an idle first-open from normal search/refresh.

## Repair

- Last Failure: Marvin reports all-workspace loading remains slow after the query batching release.
- Failure Class: incomplete end-to-end verification; compute/database region mismatch and sequential UI request chains.
- Attempted Fix: Singapore sin1 compute, parallel initial public/menu reads, coordinated pending refresh and revision guards, lean PHP/Apache image; validated on committed hosted release.
- Next Concrete Action: User authorized Vercel deployment of reservation-delete. Merge verified main child into hosted branch, integrate claim, reverify hosted-compatible source, and deploy a Preview in Marvin workspace; retain all actual bookings and credentials.

## Record

- Verification Evidence: Merged source passes 411 application checks (125 MySQL, 44 HTTP, 242 browser), 22 hosted configuration/session checks, 63-file PHP lint, JS syntax, isolated smoke, staged secret scan and independent integrated-code review. Initial guest-motion close-focus assertion race was repaired with an event-result wait retaining the exact assertion and passed on rerun. No actual bookings deleted; Preview deployment pending.
- Delivery Status: ready
- Delivery Evidence: User explicitly authorized Vercel publication; verified integrated source is ready for Preview deployment in Marvin workspace.
- Docs Updated: PLAN.md, current-state.md, change-log.md, vercel-deployment.md and Windows Desktop roadmap.
- Remaining Risk: normal hosted refreshes are verified fast; idle container first-open can still take roughly 4–6 seconds. Marvin personal timing feedback remains pending.
- Memory Promotion Decision: pending
- Last Updated: 2026-10-06T12:53:33Z
