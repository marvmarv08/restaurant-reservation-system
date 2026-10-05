# Current State

Purpose: Current project phase, stable facts, blockers, and next recommended actions.
Read when: Starting or resuming project work.
Skip when: Only reading historical decisions or one-off command output.

## Phase

P0–P7 complete for local laptop delivery. `PLAN.md` is the authoritative roadmap.

## Current Top Objective

Resume the table-showcase extension at S1 using research/07_table_showcase_research.md. Research and a standalone clickable concept are complete; live integration is still planned.

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

Regression gates: 36 booking, 14 management, 31 staff and 28 order MySQL scenarios; 11 booking, 7 management, 13 staff and 12 order HTTP scenarios; 12 guest, 10 staff and 10 order browser scenarios. Total 184, all rerun successfully in P7. Independent workers cover inventory/pacing, assignment/fire/request/state races and expiry/revocation after locks. Browser suites cover persistence, interrupted-response recovery, stored markup, station filters and role-specific service flows. Current runtime and P7 readiness evidence follow.

P7 improves menu contrast, labels the service dialog, restores its opener focus after asynchronous actions, and makes guest-management/service skip-link targets focusable. All 184 existing regressions and 36 new readiness checks passed, with zero automated A/AA violations in tested states, 320/390/768/1440px layouts and keyboard navigation. External browser requests were blocked throughout a real guest-created booking → host seating → server ordering → kitchen preparation/readiness → delivery/closure → host completion. A guarded isolated arrival fixture moves only that fake booking's interval to skip the waiting period; production clock and rules are unchanged. The suite passed in the isolated stack and a fresh disposable demo.

A clean source snapshot without main credentials started healthy PHP/MySQL/Adminer on this laptop, seeded 177 reservations and added 0 on rerun. Demo cached-image restart retained completed food records. Reset refused a tampered main-volume target before deletion; the actual main database rejected the fixture before connecting/writing. PHP lint (54 files), main/test smoke, DB safeguards and running-source hashes passed. Main retained 198 reservations, 31 guests, 208 history rows, six staff including one active account, and zero orders/tickets. Disposable demo/fresh volumes were removed; main/test storage remains. Main is rebuilt; sign in again if container recreation cleared the browser session.

`docs/architecture.md`, `docs/demo-guide.md` and `docs/verification.md` provide actual diagrams, the eight-minute walkthrough and readiness commands. `bin/demo.sh` fixes project `tablebookdemo`, database `tablebook_demo`, localhost:8082 and volume `tablebookdemo_demo_dbdata`, validates storage, creates ignored private `.env.demo` and requires an explicit disposable reset argument. It does not activate staff automatically.

`docs/booking-api.md`, `docs/staff-api.md`, and `docs/orders-api.md` document routes, security, lock order, and isolated verification. `scripts/export_roadmap.py` generates the Windows Desktop roadmap from `PLAN.md`; update it after every verified phase.

## Requested Table Showcase

Marvin's screenshot identifies the four “Find your corner” room cards. Desired flow: click room card → room-specific showcase; click a physical floor table → its exact preview. Browse with thumbnails, arrows and a touch-scrolled strip; browsing must not start a hold or change the committed selection. The research report and static study are under `research/07_table_showcase_research.md` and `research/table-showcase/`. Three licensed stock references and the official CC0 Kenney furniture overview are local with source credits/hashes. Original illustrations use the public catalog's 25 table shapes/capacities; G1–G2 remains the only declared joined group. No actual table photographs or access-clearance measurements are claimed.

The standalone concept passed 29 exact-table/room, mobile, keyboard, A/AA and offline checks; asset hashes/mapping/links passed. During this session it is served at localhost:8092/table-showcase/concept.html, from the research folder only. Restart with `python3 -m http.server 8092 --bind 127.0.0.1 --directory research`. Live PHP/booking code, main database and credentials were not changed by this research. S1 artwork, S2 live click-to-open integration and S3 verification remain planned.

## Known Limitations

The separate prototype remains simulated; live PHP workspaces use MySQL. Menu/room editors, partial post-send order changes, guest food ordering, payment collection, seated table moves, public guest waitlist claims, password recovery, and advanced reports are not implemented. Guests save their private booking link because notifications are simulated. Outstanding work takes priority in bounded lists; archived orders are limited to 100 displayed rows and kitchen results to 200, with the last 20 served tickets in recall. A browser reload discards an unresolved request held in memory; review persisted lines/status before continuing. Local HTTP is for the laptop demo; HTTPS/public hosting needs a separate deployment review. Application audit/event writes append records; database operators retain write access.

## Current Blockers

None. Reopen Ubuntu after Docker group changes; older sessions may lack Docker socket access.

## Next Recommended Actions

1. Resume S1 in the showcase research report: finalize coherent images/illustrations for all 25 table IDs and the joined option, using local assets and retained credits.
2. Integrate the shared viewer at the screenshot's room cards and booking floor plan. Keep previewed table separate from selected/held inventory; only explicit eligible selection calls the existing handler.
3. Verify the guest flow, modal focus, 320px layouts, failed images, joined selection and offline behavior. Keep P0–P7 intact; no main resets or publication. Presentation preparation remains in the demo guide.

## Last Updated

2026-10-06
