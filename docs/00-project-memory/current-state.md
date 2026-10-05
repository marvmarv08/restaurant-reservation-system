# Current State

Purpose: Current project phase, stable facts, blockers, and next recommended actions.
Read when: Starting or resuming project work.
Skip when: Only reading historical decisions or one-off command output.

## Phase

P0–P6 complete; P7 next. `PLAN.md` is the authoritative roadmap.

## Current Top Objective

Polish accessibility/mobile behavior, document fresh setup and safe demo rehearsal, and verify offline readiness in P7.

## Stable Facts

- Marvin selected a ten-minute server-side hold and two-hour self-service cancellation cutoff. Modification uses the same cutoff to prevent a move-then-cancel bypass.
- Fictional venue policy, room limits, 1–16 party size, and R01–R22 are in `PLAN.md`.
- No real email/SMS delivery or payment collection is authorized.
- A reference is a public label. A private booking link authorizes access; only its hash is stored in MySQL, with binding, expiry, and revocation support.
- Guests browse the menu; staff place orders for seated parties. Staff start inactive and activate through private one-use invitations with their own passwords.
- Staff roles are admin, manager, host, server, and kitchen. Server claims and edits its own orders; kitchen prepares tickets; neither gets host/admin access. Admin/manager can use all three workspaces. Reuse `StaffAccess` and `StaffSession`.
- The main checkpoint has one privately activated staff account. Use the existing sign-in; new staff choose their own passwords through private invitations. App passwords are separate from Ubuntu/GitHub.
- Order service closure uses `closed`, never invented `paid`. Kitchen marks ready; server confirms delivery. Host completion is separate and refuses unfinished food.

## What Exists and Works

The live guest website runs at http://localhost:8080. It uses current availability, a physical-table floor plan with radio fallback, owned holds with server-clock countdown, guest details, and transactional confirmation. Refresh restores holds/confirmation; private links open the same booking in a second browser. Modification locks old/new dates and inventory, preserves the original on failure, and archives changes. Cancellation retains history and releases every member.

The live staff workspace runs at `/staff/login` and `/admin`: one-use activation, throttled login, separate revocable sessions, actual reservations/floor/counts, phone/walk-in creation, pending approval, seating with one open order, completion/reset buffers, cancellation/no-show, atomic future edits, ranked waitlist offers, settings/blackouts, staff accounts, and audit/outbox. Role and expiry checks are refreshed after locks. Account changes increment `auth_version`, permanently invalidating old sessions even after role restoration/reactivation. Waitlist claims are accepted by staff; notifications follow a real ten-minute inventory hold.

P6 adds `/server` and `/kitchen`, server assignment, real menu lines with quantity/course/price/name/station/tag snapshots, dietary and booking notes, one ticket per sent order, explicit prepare/item-ready/ready, hold/resume, server delivery, recall, unpaid service closure, and later food rounds. An account-bound request UUID prevents repeated effects; stale versions are denied. Sent lines are frozen; manager/admin can void with a reason. Current service remains visible across midnight, and old archived rows cannot hide active work. Kitchen polls every two seconds and orders every six while visible/idle.

Verification: 36 booking, 14 management, 31 staff, and 28 order MySQL scenarios; 11 booking, 7 management, 13 staff, and 12 order HTTP scenarios; 12 guest, 10 staff, and 10 order browser scenarios. Total 184. Independent PHP workers prove inventory/pacing, assignment/fire/request/state races, and revocation/expiry after locks. Browsers prove actual multi-workspace ordering, persistence, interrupted-response recovery, inert markup, server clocks, station filters, mobile/320px layouts, and logout. PHP lint passed on 53 files; main/test smoke and main DB safeguards passed. Fresh isolated P6 SQL/seed verification passed. The initial P6 seed added 12 calendar-relative sample reservations; recovery found and retained 198 reservations, 31 guests, 208 status-history rows, six staff profiles including one active account, and no main orders/tickets yet. No main volume reset or account activation occurred during recovery. Running main source hashes matched all ten changed runtime files. Main ports bind to loopback.

`docs/booking-api.md`, `docs/staff-api.md`, and `docs/orders-api.md` document routes, security, lock order, and isolated verification. `scripts/export_roadmap.py` generates the Windows Desktop roadmap from `PLAN.md`; update it after every verified phase.

## Known Limitations

The separate prototype remains simulated; live PHP workspaces use MySQL. Menu/room editors, partial post-send order changes, guest food ordering, payment collection, seated table moves, public guest waitlist claims, password recovery, and advanced reports are not implemented. Guests save their private booking link because notifications are simulated. Outstanding work takes priority in bounded lists; archived orders are limited to 100 displayed rows and kitchen results to 200, with the last 20 served tickets in recall. A browser reload discards an unresolved request held in memory; review persisted lines/status before continuing. Local HTTP is for the laptop demo; HTTPS/public hosting needs a separate P7 deployment review. Application audit/event writes append records; database operators retain write access.

## Current Blockers

None. Reopen Ubuntu after Docker group changes; older sessions may lack Docker socket access.

## Next Recommended Actions

1. Review accessibility, keyboard/focus behavior, and mobile layouts across all four real workspaces.
2. Finish diagrams, the demo walkthrough, offline asset checks, fresh-checkout verification, and a safe disposable reset/rehearsal procedure. Preserve the main `.env` and database volume.
3. Keep P3–P6 regression gates passing and refresh the Desktop roadmap after verified phase completion. Deployment/publication is not authorized by local polish work.

## Last Updated

2026-10-06
