# Current State

Purpose: Current project phase, stable facts, blockers, and next recommended actions.
Read when: Starting or resuming project work.
Skip when: Only reading historical decisions or one-off command output.

## Phase

P0–P7 complete for local laptop delivery. `PLAN.md` is the authoritative roadmap.

## Current Top Objective

Marvin's menu photos and category navigation are delivered locally at http://localhost:8080/#menu. The 36 real catalog dishes use 34 locally credited photographs: 28 new thumbnails totaling 688,962 bytes and six reused food-gallery photos. A desktop category sidebar becomes a horizontal phone strip; selected category, heading, real item count, keyboard focus and the existing short menu transition are retained. Names, descriptions, prices, dietary tags and availability remain database-driven. Unknown or failed photos show a stable fallback; photographs are visibly illustrative, with source/license credits. All 241 browser checks passed: 21 menu, 20 food-showcase, 12 guest, 10 staff, 10 orders, 41 table-showcase, 34 capacity, 26 feedback, 31 guest-motion and 36 readiness. Eleven isolated booking HTTP checks and ten read-only main checks passed. Four viewport widths (320/390/768/1440px), actual catalog content, keyboard focus, image failure and zero automated A/AA violations in tested menu states were verified. Main/test smoke, 54-file PHP lint, JavaScript/Bash syntax, rollback database safeguards, all 34 photograph checksums and exact matching of 35 delivered source/asset files passed. Main retained 198 reservations, 31 guests, 208 history rows, six staff/one active and zero orders/tickets. Independent review approved the product and verification changes. The readiness harness now awaits actual refresh/action completion before opening or closing dialogs; exact focus and persisted lifecycle assertions remain. The earlier moving gallery, hero and palette remain delivered. Canonical files are on the Windows Desktop in restaurant-reservation-system. P0–P7, S0–S3, linked capacity and E0–E2 remain complete; E3/E4, featured dishes, story/location and public hosting remain deferred/separate scope. No main seed/reset, credentials or booking rules changed. Research and provenance are in research/09_food_showcase_research.md.

GitHub synchronization was verified on 2026-10-06: the private marvmarv08/restaurant-reservation-system main received all 18 previously unpublished commits and the restaurant-visual/menu commit 3921aca. The full publication gate passed 393 automated checks (109 MySQL, 43 HTTP and 241 browser), plus 54-file PHP lint, JavaScript/Bash syntax, main/test smoke and PMM doctor. Candidate files and unpublished history were scanned for private configuration values and recognizable credentials; .env and .env.demo remain ignored. Main database counts and the active staff account were retained. Featured Dish implementation is postponed at Marvin's request; final delivery records accompany this synchronization.

## Stable Facts

- The canonical working files are on Marvin's Windows Desktop: `C:\Users\burgo_w8uuyg3\OneDrive\Desktop\restaurant-reservation-system` (tool path `/mnt/c/Users/burgo_w8uuyg3/OneDrive/Desktop/restaurant-reservation-system`). Continue all future edits there. The existing ignored `.env`, full Git history and Marvin author identity are preserved. The previous Linux entry points to the Desktop after relocation; `/home/morkmork26/marvin/restaurant-reservation-system-linux-backup-2026-10-06` retains a recovery copy. Main MySQL records remain in Docker storage, not in the source folder.

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

The guest hero uses the existing local Michel Stockman dining photo with a dark gradient and an opaque booking card. Photo failure preserves the base background, text, layout and usable controls. Staff/admin/server/kitchen headers share the palette and italic display typography without new operational effects. Research section 14 records the inspected preview and the full-stream access limit. No backend, policy, authentication or polling code changed.

The reference adaptation passed 200 browser checks: guest 12, staff 10, orders 10, showcase 41, capacity 34, feedback 26, motion 31 and readiness 36. Authenticated desktop/mobile screenshots were reviewed. Eight read-only main checks passed across 320/390/768/1440px, including automated A/AA rules in tested states, image failure, Reserve navigation and zero mutation requests. Main/test smoke, 54-file PHP lint, rollback DB safeguards and all five delivered visual/credit source hashes passed. Main retained 198 reservations, 31 guests, 208 history rows, six users/one active and zero orders/tickets; no main seed/reset ran.

E2 adds a native, cancellable guest motion module: 220 ms hero entrance, 180 ms deliberate booking/management transitions, and 140 ms menu/results/disclosure feedback. Logical heading focus is immediate and visible; passive management refresh preserves control focus without entrance replay. Guest contact drafts survive choosing another table in the same page, are cleared on completion/new reservation, and are not newly stored. Explicit showcase selection focuses its new radio; existing picture guards/fallback remain intact. Reduced motion and unavailable animation APIs keep the UI static and usable.

E1 adds a local shared feedback module to guest/staff/service pages: stable pending button labels, reduced-motion-aware surface/press feedback, stationary delayed search placeholders, persistent error messages and polite success statuses. Successful order saves followed by read-refresh failure are identified as saved without a mutation retry. Polling does not create skeletons or replay entrances. Existing credentials and main data are retained.

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

1. Hard-refresh localhost:8080/#menu; try all categories and All dishes. Inspect thumbnails, descriptions/tags, selected category/count, desktop sidebar, mobile strip and Menu photo credits.
2. Rehearse the guest/host/server/kitchen flow in the disposable demo using docs/demo-guide.md. Keep main records, credentials and booking rules intact.
3. GitHub main is synchronized with completed project work. Featured Dish implementation is postponed; retain the Desktop working copy and resume it only when Marvin requests. E3/E4, story/location and hosting remain separate scope.

## Last Updated

2026-10-06
