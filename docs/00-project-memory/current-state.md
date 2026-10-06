# Current State

Purpose: Current project phase, stable facts, blockers, and next recommended actions.
Read when: Starting or resuming project work.
Skip when: Only reading historical decisions or one-off command output.

## Phase

P0–P7 complete for local laptop delivery. `PLAN.md` is the authoritative roadmap.

## Current Top Objective

Mobile food motion is deployed as a READY [Singapore Preview](https://restaurant-reservation-system-5zi0dy0wz-marvmarv08.vercel.app) from source 6cd997a. Phones now use slow horizontal autoplay with touch pause and Resume; the existing PC vertical motion is preserved. All 21 showcase browser checks and six actual hosted motion checks passed. Screenshots, reduced-motion behavior, desktop animation and mobile layout were verified. 

The complete workspace performance update is deployed as a READY [Singapore Vercel Preview](https://restaurant-reservation-system-62moe3jjm-marvmarv08.vercel.app) from source ad83512 in Marvin's marvmarv08 workspace. Actual authenticated browser timings improved: table search 9.650 → 0.337 seconds, dashboard refresh 11.422 → 0.267 seconds, server refresh 9.032 → 0.379 seconds and kitchen refresh 9.294 → 0.210 seconds. Independent initial reads now run together, overlapping refreshes share the pending request, and older responses cannot overwrite new filters or saved data. All 404 isolated application checks and 22 extra runtime/session/configuration checks passed; 21 hosted interaction checks passed on the smaller PHP/Apache image with desktop/mobile inspection. Idle container startup can still take about 4–5 seconds; warm timings are not a guarantee for first open. Existing hosted/laptop records and Marvin's passwords are retained.

The initial full PHP/MySQL Table Reserve release was deployed as a Vercel Preview at https://restaurant-reservation-system-j9yt7rfp1-marvmarv08.vercel.app in Marvin's explicitly selected marvmarv08 workspace. The separate Aiven database uses verified TLS and database-backed sessions. On 2026-10-06 Marvin confirmed the actual menu/photos/categories, reservation confirmation, staff activation/sign-in and admin dashboard work. A fresh read-only TLS check corroborated one active staff and 175 reservations, compared with 174 initial fictional demo reservations. The agreed guest/admin hosted acceptance is complete; additional hosted order/kitchen presentation rehearsal is not claimed as manually tested.

The release package passed 393 existing isolated checks and 45 hosting checks (17 sessions, five configuration, four TLS, nine setup, ten cross-container HTTP). Fresh review's active-session garbage-collection race was reproduced and fixed. The initial runtime was deployed from e6f35b9; the performance update above uses 761bea6. Private configuration and used first-admin activation instructions stay in the ignored Desktop restaurant-reservation-system-vercel folder. Source/delivery records are published on feat/vercel-full-system in the private Marvin GitHub repository. The canonical laptop checkout and database remain separate; do not assume GitHub main or that detached checkout has been merged with this deployment branch.

Vercel must use Marvin's dedicated CLI profile and his approved workspace, never the shared morkmork26 account. Keep the existing GitHub repository. The Container preset is explicit in vercel.json; the platform auto-promoted the initial deployment, so a subsequent Preview was verified and temporary production/static artifacts removed. APP_URL is filled privately. No agent fetch of the deployed URL was performed; browser evidence came from Marvin's actual rehearsal.

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

The separate prototype remains simulated; live PHP workspaces use MySQL. Menu/room editors, partial post-send order changes, guest food ordering, payment collection, seated table moves, public guest waitlist claims, password recovery, and advanced reports are not implemented. Guests save their private booking link because notifications are simulated. Outstanding work takes priority in bounded lists; archived orders are limited to 100 displayed rows and kitchen results to 200, with the last 20 served tickets in recall. A browser reload discards an unresolved request held in memory; review persisted lines/status before continuing. Local HTTP remains for the laptop demo. The separate HTTPS Vercel Preview has completed deployment review and agreed guest/admin acceptance. Application audit/event writes append records; database operators retain write access.

## Current Blockers

None. Reopen Ubuntu after Docker group changes; older sessions may lack Docker socket access.

## Next Recommended Actions

1. Check actual guest/staff loading and hold/confirmation in the new performance Preview; select the reservation date in /admin to find a booking. Online and localhost records are separate.
2. Preserve the Aiven service, private hosted files and main Docker volume. Resume hosted source work from the Desktop deployment checkout unless branches have been explicitly synchronized.
3. Featured Dish, E3/E4 and story/location additions remain deferred until requested. A full hosted seating/order/kitchen presentation rehearsal is an optional next task, not a claimed browser test from this delivery.

## Last Updated

2026-10-06
