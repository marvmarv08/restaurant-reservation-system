---
pmm_schema: pmm.task/v1
task_id: reservation-scroll-performance-20261030
parent_task_id: none
task_kind: primary
execution_status: active
verification_status: pending
delivery_status: not-requested
owner: codex-scroll
branch: fix/reservation-scroll-performance
base_sha: 6fb79ae0090f4cdcc3045e0f1caa8cf63c7346bb
revision: 1
verification_head: none
verification_source_hash: none
verified_at: none
updated_at: 2026-10-30T06:24:52Z
---

# Active Task

Purpose: Single primary task contract, verifier, retry state, and integration checkpoint.
Read when: Starting, executing, verifying, integrating, or recovering this task.
Skip when: The task is unrelated to the current execution context.

## Status

- Title: Diagnose and improve reservation-page scrolling
- Runtime Profile: Sprint
- Risk Level: normal
- Loop Budget: 3
- Current Attempt: 1
- Stop Condition: required behavior is verified or a concrete blocker is recorded.

## Task

- Objective: Diagnose and improve reservation-page scrolling
- Scope: Measure reservation rendering/animation cost and fix confirmed frontend cause; preserve design and booking rules, local verification first, then authorized private GitHub/Vercel update; no data reset
- Allowed Files or Areas: Measure reservation rendering/animation cost and fix confirmed frontend cause; preserve design and booking rules, local verification first, then authorized private GitHub/Vercel update; no data reset
- Forbidden Actions: unrelated edits, destructive operations, publication, and production writes without explicit authorization.
- Source Artifacts: project instructions, current source, and task request.

## Harness

- Agent Mode: solo
- Owner: codex-scroll
- Branch: fix/reservation-scroll-performance
- Parent Task: none
- Tools: project-local tools and pmm lifecycle helpers.
- Environment Notes: one writer owns this task file and branch.

## Verifier

- Required Checks: Before/after scroll profiling and regression, related motion checks, syntax smoke and preserved functionality
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
- Last Updated: 2026-10-30T06:19:32Z
