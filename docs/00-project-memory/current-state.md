# Current State

Purpose: Current project phase, stable facts, blockers, and next recommended actions.
Read when: Starting or resuming project work.
Skip when: Only reading historical decisions or one-off command output.

## Phase

P0–P7 complete for local laptop delivery. `PLAN.md` is the authoritative roadmap.

## Current Top Objective

UI effects desk research is delivered in research/08_ui_motion_research.md. E0 is complete; E1–E4 remain proposed. For the next UI implementation, start with shared response states while retaining the completed S0–S3 showcase and existing booking/service safeguards.

## Stable Facts

- The fictional demo venue address is Lipa City, Batangas, Philippines. No street address or actual venue location is claimed.

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

Room cards, floor tables and an all-table disclosure open a shared native showcase. Metadata comes from the current public database catalog; green/red badges reflect eligible options for the selected date/time/party/room preference, while missing, failed or expired data is neutral. Color includes text and symbols. The viewer checks on open/explicit choice, refreshes every 30 seconds while open/visible, expires results after 45 seconds and aborts stalled checks after 12 seconds. Query changes clear prior statuses; stale time snapshots trigger a fresh read; late requests cannot overwrite current context. Browsing creates no hold. Use applies the server-returned option to radios/floor; Continue retains the existing transactional hold. Joined G1–G2 previews identify both members and preserve approval. Management previews use the protected endpoint and preserve the current booking until Save.

The original Seating view renders and inspiration sources are locally credited under public/assets/images/table-showcase/. Captions identify illustrative artwork; physical dimensions/accessibility are not inferred. The historical standalone study remains at localhost:8092/table-showcase/concept.html. Live source and delivery research are in research/07_table_showcase_research.md section 10. Forty focused showcase checks passed against real isolated MySQL, including blocks/holds/release, joined selection, failures, expiration/time refresh, delayed responses, private management, offline assets, keyboard, reduced motion and 320/390/768/1440px reflow. Twelve guest/management and 36 readiness checks passed after integration. Main smoke, PHP lint (54 files), DB safeguards and running-source checks passed. Updated main image retained 198 reservations, 31 guests, 208 history rows, six staff/one active and zero orders/tickets; no main reset, seed, policy/auth change or publication.

The room-card image regression reported in Marvin’s 2026-10-06 screenshot was corrected: all four cards now show the original local inspiration photographs rather than CSS ovals. Twelve focused read-only photo/navigation/mobile/accessibility/fallback checks passed; the permanent showcase suite now also checks these card pictures.

Booking Guests and Room preference now filter one another using database room-party limits and catalog.max_party. Guest-first16 offers only Group Tables; room-firstVIP offers2–10 guests. Any room restores the full guest range. Valid values remain selected; incompatible values adjust to the nearest supported count with a polite notice. Changes clear stale availability/previews. The shared public/management search passed34 focused,12 guest/management and41 showcase checks; server policy/auth remain unchanged.

## Known Limitations

The separate prototype remains simulated; live PHP workspaces use MySQL. Menu/room editors, partial post-send order changes, guest food ordering, payment collection, seated table moves, public guest waitlist claims, password recovery, and advanced reports are not implemented. Guests save their private booking link because notifications are simulated. Outstanding work takes priority in bounded lists; archived orders are limited to 100 displayed rows and kitchen results to 200, with the last 20 served tickets in recall. A browser reload discards an unresolved request held in memory; review persisted lines/status before continuing. Local HTTP is for the laptop demo; HTTPS/public hosting needs a separate deployment review. Application audit/event writes append records; database operators retain write access.

## Current Blockers

None. Reopen Ubuntu after Docker group changes; older sessions may lack Docker socket access.

## Next Recommended Actions

1. Review the live connected gallery at localhost:8080 after a date/time/party search; use Refresh tables if a result expires.
2. Rehearse the updated guest/host/server/kitchen flow in the disposable demo, following docs/demo-guide.md. Keep main credentials/data and booking rules intact.
3. For future changes, resume from PLAN.md and research/07_table_showcase_research.md section 10. S0–S3 are complete locally; public hosting and publication remain separately requested work.

## Last Updated

2026-10-06
