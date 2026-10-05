# Task History

Purpose: Append-only compact summaries of closed tasks.

## 2026-10-05 phase0-booking-rules

<!-- pmm-task-id: phase0-booking-rules -->

- Status: done
- Parent Task: none
- Title: Resolve phase 0 booking rules and schema design
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: PLAN.md P0 Done with R01-R22; booking-engine and UX policy/schema checks passed; git diff --check clean; PMM doctor passed; Windows Desktop roadmap shows P0 Done. MySQL execution deferred to P2/P3.
- Closed At: 2026-10-05T06:16:59Z

## 2026-10-05 phase1-application-boot

<!-- pmm-task-id: phase1-application-boot -->

- Status: done
- Parent Task: none
- Title: Boot PHP and MySQL application with Docker Compose
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: Live Docker Desktop PHP/MySQL/Adminer stack started; fresh Ubuntu docker compose ps shows app and db healthy; /health returns ok/db true; Adminer HTTP 200; bin/smoke.sh passed; Compose config, PHP syntax, Bash syntax, git diff --check, Desktop roadmap, and PMM doctor passed.
- Closed At: 2026-10-05T07:31:58Z

## 2026-10-05 phase2-schema-seed

<!-- pmm-task-id: phase2-schema-seed -->

- Status: done
- Parent Task: none
- Title: Create and verify MySQL schema and repeatable demo data
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: Fresh isolated Docker Compose volume auto-loaded schema and seed (179 reservations); same-day rerun added 0. Existing P1 volume upgraded without reset; 8 over-limit demo bookings cancelled with retained history. bin/verify-db.php passed FK, unique reference, active slot conflict, cancelled slot reuse, joined membership, pacing and overlap checks. Main and isolated bin/smoke.sh passed; SQL and scripts validated; Desktop roadmap refreshed.
- Closed At: 2026-10-05T08:47:53Z

## 2026-10-05 phase3-booking-engine

<!-- pmm-task-id: phase3-booking-engine -->

- Status: done
- Parent Task: none
- Title: Implement transactional availability, holds, and booking
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: 36 isolated real-MySQL scenarios passed, including separate-process final VIP table, different-start overlap, joined-member, shared pacing, and duplicate-confirmation races. Exact TTL and expiry after lock waits, P0 rules, current settings, code collisions, rollback/history, ownership and protected seed reruns passed. 11 HTTP scenarios passed for cookies, CSRF, validation, ownership, persistent confirmation/retry and release. PHP lint: 26 files, 0 failures. Main/test smoke, main DB guards, additive existing-volume upgrade and live availability (18 slots) passed. Main seed rerun added 0 and retained 185 rows. Desktop P3 Done/P4 next verified; isolated test volume removed; diff check passed.
- Closed At: 2026-10-05T11:41:52Z

## 2026-10-05 phase4-guest-mvp

<!-- pmm-task-id: phase4-guest-mvp -->

- Status: done
- Parent Task: none
- Title: Connect guest UI and secure booking management
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: Passed: 36 booking MySQL scenarios, 14 management MySQL scenarios, 11 booking HTTP scenarios, 7 management HTTP scenarios, 12 real browser scenarios with no JS/CSP errors, PHP lint on 35 files, main/test smoke, main DB safeguards, unchanged main counts (185 reservations/30 guests/193 status history), zero seed additions, diff check, Desktop P4 Done/P5 next, and PMM doctor. Critic: real backend/browser evidence covers every P4 completion check; remaining staff/notification/ordering scope is documented for later phases.
- Closed At: 2026-10-05T12:50:41Z
