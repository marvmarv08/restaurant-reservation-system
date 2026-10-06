# Best-in-Class Restaurant Table Reservation System - Implementation Plan

Project: class competition deliverable. Stack mandated: JavaScript (vanilla), PHP (vanilla), CSS, HTML, Docker.
Status: P0–P7 are implemented and verified for local laptop delivery. Guest booking, staff administration, food ordering, and kitchen tickets use real MySQL records and history. Accessibility fixes, disposable demo setup, fresh installation and offline browser rehearsal are verified. Marvin's hands-on presentation rehearsal is next. This roadmap remains the source of truth for future sessions.

Backing research (read these for detail, all in `research/`):
- `01_reference_repos.md` - open-source repos worth stealing from, and anti-patterns
- `02_booking_engine.md` - schema DDL, availability SQL, concurrency, state machine
- `03_ux_flows.md` - guest flow, floor-plan picker, room-type UX, accessibility
- `04_ui_effects.md` - design tokens, effects catalogue, library shortlist, browser support
- `05_dashboards_kds.md` - kitchen display spec, realtime transport, admin KPIs
- `06_stack_architecture.md` - directory tree, Docker, security, API surface, seed data, phases

---

## 0. Project setup assumptions

Marvin asked us to use the recommendations. D1, D2, D3, and D5 are selected for the plan;
D4 remains an estimate and can be adjusted when the actual team size is known. No real email/SMS
or payment integrations are authorized by these assumptions.

| # | Decision | Recommendation | Why it matters |
|---|---|---|---|
| D1 | Database | **MySQL 8.4** in Compose | Your answer to the DB question was "docker", which is the orchestrator not the DB. MySQL 8.4 is assumed throughout this plan. MariaDB 11 works with trivial changes. Postgres would require rewriting the DDL. |
| D2 | Web server | **php:8.3-apache** single container | One container, one config, no 502-from-fpm failure class. nginx+php-fpm shipped as an opt-in Compose profile so reviewers see the tradeoff was considered. |
| D3 | Composer allowed? | Assume **yes**, with a 20-line SPL autoloader fallback | If your class forbids Composer, the fallback is already specified in 06. |
| D4 | Team size | Assumed **3 people**, ~74-102 person-hours | All estimates scale off this. Tell me if it is solo. |
| D5 | Email/SMS | **Simulated** (logged to an `outbox` table + rendered in admin) | Real SMTP/SMS on a school network is a demo-day liability. Simulation still demos fully. |

---

## 1. Delivery roadmap and MVP line

Required by the brief: sample food data, functional website, table reservation system covering VIP / common / group / other room types, admin dashboard, kitchen dashboard.

| Phase | Work | Completion check |
|---|---|---|
| **P0 — Lock booking rules** | Decide opening days/hours, lead time, blackout scope, party and room limits, joined-table policy, hold TTL, cancellation and waitlist behavior. Correct the schema design before implementation. | One consistent rule set and test cases exist. The confirmation-code column fits the code format; cancelled slots can be booked again without losing history. |
| **P1 — Boot the application** | Create Docker Compose, PHP front controller/routing, MySQL connection, and health endpoint. | A fresh checkout starts with documented commands and the app connects to MySQL. |
| **P2 — Database and seed** | Create rooms, tables, guests, reservations, holds, staff, orders, and history tables; load repeatable sample data. | Foreign keys and unique booking references validate; seed can be rerun safely. |
| **P3 — Safe booking engine** | Implement availability, business rules, joined tables, expiring holds, and transactional booking. | Automated overlap, expiry, blackout, pacing, and simultaneous-booking tests pass; only one guest gets the final table. |
| **P4 — Guest booking MVP** | Connect search, hold, details, confirmation, and secure self-service management to the backend. | A booking survives refresh and appears in a second browser; modification and cancellation release inventory correctly. **MVP line.** |
| **P5 — Staff and admin** | Add staff authentication, server-side roles, reservations, seating, waitlist, settings, and audit history. | Authorized staff can complete the host workflow; restricted actions are denied by the server. |
| **P6 — Menu and kitchen** | Connect real menu selections and orders to kitchen tickets, allergy notes, and ticket states. | A real seated order appears on the kitchen screen and status changes persist. |
| **P7 — Polish and demo readiness** | Review mobile layout and accessibility; self-host assets; finish docs, smoke checks, reset procedure, and rehearsal. | Fresh setup and the full demo flow work on the target laptop, including without network access. |

### Phase progress

| Phase | Status | Evidence |
|---|---|---|
| P0 | Done | 10-minute hold, 2-hour cancellation cutoff, 1–16 party policy, room rules, 22 acceptance scenarios, and schema corrections documented; consistency checks and `git diff --check` passed. SQL execution belongs to P2/P3. |
| P1 | Done | Fresh Ubuntu `docker compose ps` shows healthy PHP/MySQL containers; `/health` returns `{"ok":true,"db":true}`, Adminer returns HTTP 200, and `bash bin/smoke.sh` passes. Compose config and PHP syntax checks passed. |
| P2 | Done | Fresh isolated Compose volume auto-loaded 4 rooms, 25 tables, 36 menu items, 5 inactive staff profiles, 30 demo guests, and 179 date-relative reservations; rerun added 0. Existing P1 volume kept 185 demo rows while 8 over-limit bookings were cancelled with history. Database verifier passed foreign keys, unique references, active-slot conflict, cancelled-slot reuse, joined members, pacing, and no live overlaps; app smoke passed. |
| P3 | Done | 36 isolated MySQL scenarios and 11 HTTP API scenarios passed. Separate PHP processes proved final-table, overlapping-start, joined-member, pacing, and duplicate-confirmation races. Expiry after lock waits, blackouts, policy settings, code collision retries, cancellation history, guest ownership, and CSRF passed. PHP lint (26 files), main/test smoke, live availability, and main DB safeguards passed; main seed rerun added 0. |
| P4 | Done | Live guest search, SVG/radio table picker, server-clock countdown, details, confirmation, private management links, atomic modification, and cancellation. 14 management MySQL tests, 7 management HTTP tests, and 12 browser scenarios passed; P3 regression (36 MySQL + 11 HTTP), PHP lint (35 files), main/test smoke, and main DB safeguards passed. Refresh, second browser, interrupted confirmation recovery, two-tab edits, joined inventory, pending approval, R18/R21, and 320px/mobile layout verified. Existing 185 main reservations and history were retained; seed rerun added 0. |
| P5 | Done | Secure one-use activation, hashed passwords, throttled login, revocable staff sessions, server roles, live host/admin UI, phone/walk-in creation, approval, seating/order creation, completion/reset, cancellation/no-show, ranked waitlist with real claim holds, settings/blackouts, staff management, and audit/outbox. 31 staff MySQL, 13 staff HTTP, and 10 staff browser scenarios passed; all P3/P4 regression suites passed (134 scenarios total). PHP lint passed on 47 files; main/test smoke and main DB safeguards passed. Additive upgrade retained 186 reservations, 31 guests, and 195 history rows; five existing staff profiles remain inactive until private activation. |
| P6 | Done | Dedicated server/kitchen workspaces and permissions; server assignment; menu quantity/course/price/metadata snapshots; allergy and booking notes; one persistent ticket per sent order; prepare, item-ready, ready, hold/resume, server delivery, recall, unpaid service closure, subsequent rounds, events/audit, and completion safeguards. 28 order MySQL, 12 order HTTP, and 10 order browser scenarios passed; all P3–P5 regressions passed (184 total). PHP lint passed on 53 files; main/test smoke and main DB safeguards passed. Fresh isolated SQL/seed rehearsal passed. Main restored with 198 reservations, 31 guests, 208 status-history rows and the existing active staff account; no volume reset. |
| P7 | Done | Menu contrast, service-dialog naming/focus and guest/service skip-link fixes. All 184 P3–P6 regressions plus 36 accessibility/reflow/keyboard/offline readiness checks passed. The same guest booking completed host → server → kitchen → host completion in isolated and fresh demo stacks; a guarded fake-data arrival fixture skipped only the waiting interval. Clean source setup on this laptop started healthy PHP/MySQL/Adminer, seeded 177 reservations and added 0 on rerun. Disposable reset, unsafe-target refusal and cached-image restart with retained service records passed. PHP lint (54 files), main/test smoke, DB safeguards and source/image checks passed. Main 198 reservations, 31 guests, 208 history rows and existing active staff retained. Diagrams and eight-minute rehearsal guide delivered. |

After a phase passes its completion check, update its status and brief verification evidence here, then update the current checkpoint and next concrete action below. Run `python3 scripts/export_roadmap.py` to refresh the Windows Desktop copy. A phase is not complete merely because its code was written.

**Current checkpoint (2026-10-06):** P0–P7 and the S0–S3 table-showcase extension are complete for local delivery. The main guest app now has database-backed green/red/neutral table previews; 40 showcase, 12 guest/management and 36 readiness checks passed. Main data and the existing active staff account remain intact. Main app: http://localhost:8080; staff sign-in: /staff/login; host: /admin; food orders: /server; kitchen: /kitchen. All 184 regressions and 36 readiness checks passed, including zero automated A/AA violations in tested states, 320/390/768/1440px reflow, keyboard navigation and an external-network-blocked full service flow. A clean source snapshot using example-only configuration verified fresh setup on this laptop; initial image downloads still need internet. The arrival fixture changes only disposable fake booking data, never live policy. Main records and account remain intact; no main orders/tickets were introduced. Disposable rehearsal stacks were removed. Demo, architecture and verification guides are in docs/. Use your existing password; container recreation may require signing in again. No real notification or payment is sent.

**Next concrete action:** Review the connected showcase at http://localhost:8080: choose date, guests, room preference and time; click a room card or floor table. Green/red indicators apply to that search; neutral requires a fresh check. Browsing creates no hold; Use this table updates selection, and Continue creates the existing ten-minute hold. S0–S3 are complete locally. Resume from research/07_table_showcase_research.md section 10, then rehearse the updated guest/host/service flow using docs/demo-guide.md in the disposable demo. Preserve main credentials/data and P0–P7 rules. The port 8092 page remains the historical design study; hosting and publication remain separate scope.

### Requested extension — Table showcase

Marvin requested per-table pictures, sliding navigation, one realistic Seating view and database-connected availability indicators. [Research and delivery evidence](research/07_table_showcase_research.md) are saved locally. S0 research, S1 visuals, S2 integration and S3 verification are complete: 25 physical-table pictures plus a joined composite, local credited assets, native dialog, exact floor/room opening, thumbnails/arrows/touch strip, accessible green/red/neutral labels, 30-second visible-open refresh, 45-second freshness expiration, 12-second check timeout, and eligibility-safe explicit selection. Protected management previews retain the original booking until Save. The live feature passed 40 focused MySQL/browser checks; 12 guest/management and 36 readiness regressions passed, with zero automated A/AA violations in tested states. Main counts and staff account were retained. P0–P7 statuses remain unchanged.

Older phase numbers and hour estimates elsewhere in the research are historical planning notes. Use this roadmap when resuming work. Protect P0–P6 before adding polish or stretch features. Waitlist acceptance is staff-mediated; menu/room editors, public guest offer claims, payment collection, and advanced reports are later extensions.

### P0 booking policy (locked for the fictional demo venue)

This table resolves conflicting values in the pushed research using the consolidated plan and current prototype where possible. Marvin chose the 10-minute hold and two-hour cancellation cutoff, and asked us to use the remaining recommendations. The venue is fictional; these are demo rules, not claims about a real restaurant.

| Rule | P0 value | Basis |
|---|---|---|
| Venue time and service | `Asia/Manila`; closed Monday; dinner Tuesday–Sunday, 17:30–23:30 | Prototype venue and restaurant-local-time plan |
| Guest slot grid | Every 15 minutes; global last-seating cap 21:45 | Booking-engine spec and current prototype |
| Actual final slot | Earlier of 21:45 and `closing time - turn time - 15-minute reset` for the requested party/room | Prevents a long booking from running past close |
| Online lead time | At least 60 minutes before start; up to 60 calendar days ahead | Booking-engine settings; older UX draft says 90 minutes/90 days |
| Turn and reset | 1–2 guests: 75 min; 3–4: 90; 5–6: 105; 7–10: 120; 11–16: 150; plus 15 min reset | Booking-engine spec |
| Pacing | At most 40 covers and 8 new reservations per 15-minute slot, configurable by service window | Booking-engine spec; prototype's higher figures are sample-only |
| Room fit | Main Dining: 1–4; VIP: 2–10; Group: 5–16; Terrace: 1–6. Match each assigned physical table's capacity; “Any room” checks each room separately | Current prototype and booking-engine spec |
| VIP and group notice | VIP: 48 hours; Group: 24 hours; show the prototype's ₱6,500 VIP and ₱3,200 Group minimum spends before selection | Current prototype room cards; minimum spend is informational in v1 |
| Group size and approval | Online party size 1–16; parties 13–16 stay pending for manager approval; no online booking above 16 | Prototype group capacity and recommended approval rule |
| Hold | **10 minutes**, measured by server expiry; one hold covers every member of a joined group | Marvin's choice; current prototype and UX draft |
| Joined tables | Only predeclared adjacent combinations; try only when no single table fits; hold and reserve every member | Booking-engine spec, with prototype's one-table gap corrected |
| Blackout | Venue, room type, room, or table scope; an “Any room” search may still offer unaffected rooms | Booking-engine spec |
| Self-service change/cancellation cutoff | Two hours before the current start for both modification and cancellation (P4 decision prevents move-then-cancel bypass); show the exact `Asia/Manila` deadline and route later requests to staff; no automatic charge or forfeiture | Marvin's choice and demo-only payment scope |
| Waitlist | Ranked per requested date/time; offer only to a party fitting the freed inventory; create a 10-minute claim hold before notifying | Booking-engine and UX plans; no simulated “held” message without a real hold |
| No-show | Staff or scheduled process may mark no-show 20 minutes after start; release inventory and record history | Current prototype and booking-engine settings |
| Notification and payment | Email/SMS go to the demo outbox; no real messages or charges. VIP deposit state may be shown, but no payment is collected | Pushed PLAN.md demo decision D5 and Phase 0 scope |

All availability and mutation paths must use the same policy values. The prototype remains a demonstration and is not evidence that these rules are implemented in PHP/MySQL.

### P0 acceptance scenarios for later automated tests

| ID | Scenario | Expected result |
|---|---|---|
| R01 | Search on Monday or outside dinner hours | No bookable slots; explain closure. |
| R02 | Search 59 minutes ahead, then 60 minutes ahead | First is rejected; second may be offered if a slot fits. |
| R03 | Search beyond 60 days | Reject with a clear advance-window message. |
| R04 | Search 21:45 with a two-person versus a six-person turn | Two-person slot may fit; six-person slot ends after close and is not offered. |
| R05 | Search a room below its minimum or above its maximum party size | Exclude that room and explain the limit. |
| R06 | Search “Any room” during a terrace-only blackout | Exclude terrace; unaffected rooms remain available. |
| R07 | Search during a venue-wide blackout | No room is offered. |
| R08 | The next booking exceeds either pacing cap | Reject the slot even if a physical table is free. |
| R09 | Two clients request the final same table at once | Exactly one 10-minute hold succeeds; the other receives a conflict. |
| R10 | A hold expires, then its token is submitted | Reject the booking; inventory becomes available again. |
| R11 | Only a predeclared two-table group fits | Both members are held and assigned; another booking cannot claim either member. |
| R12 | A single table fits when a combination also fits | Offer the single table first. |
| R13 | Cancel a booking and reserve the same table and start time again | Replacement succeeds while the cancelled booking and history remain queryable. |
| R14 | Generate a duplicate human reference | Retry code generation; existing guest lookup still identifies exactly one booking. |
| R15 | Cancel a booking with a matching waitlist entry | Create a real claim hold for the highest eligible rank, then queue the notification. |
| R16 | Two concurrent cancellations target one waitlist guest | Promote that guest once; preserve rank and status history. |
| R17 | Change buffer, lead-time, or opening-hours settings | Guest availability and server validation use the new value together. |
| R18 | Use a manage link after its expiry or for another reservation | Deny the action without exposing that guest's data. |
| R19 | Book 13 guests, then 17 guests | 13 stays pending for manager approval; 17 is rejected online. |
| R20 | Search VIP 47 hours ahead, then Group 23 hours ahead | Each is rejected for its room notice rule even if tables are free. |
| R21 | Cancel 119 minutes before start, then at exactly 120 minutes | Self-service is refused at 119 and permitted at 120 minutes. |
| R22 | Book a joined pair, then cancel and rebook one member at the same start | Both members release with the old history retained; the new booking succeeds. |

---

## 2. Architecture

```
public/              only web-exposed dir
  index.php          front controller
  assets/{css,js,fonts}   self-hosted, no CDN dependency on demo day
  uploads/menu/
src/
  Core/              Router, Request, Response, Database(PDO), View, Validator, Csrf, Auth, Guard, RateLimiter
  Controller/        thin: validate -> call service -> render
  Domain/            Reservation, Table, Hold, Order value objects + state machine
  Repository/        one class per aggregate, PDO prepared statements only
  Service/           AvailabilityService, BookingService, WaitlistService, KitchenService
  View/              PHP templates, escaped via e()
config/              app.php, database.php, routes.php
database/init/       01_schema.sql, 02_reference.sql, 03_demo_seed.sql (auto-run by mysql entrypoint)
bin/                 seed.php, demo-reset.php, test.php, smoke.sh
docs/                README, ER diagram, architecture diagram, API doc
```

Docker Compose: `app` (php:8.3-apache) + `mysql:8.4` (healthcheck, `depends_on: service_healthy`, init SQL mounted) + `adminer` (so judges can inspect the data). Named volumes for DB and uploads. All ports env-driven; MySQL published on 33061 to dodge a local install.

Cold start must be exactly: `cp .env.example .env && docker compose up -d` then open `localhost:8080` to a fully populated restaurant. This one-command start is a rubric point on its own.

---

## 3. The part that actually wins: the booking engine

This is where every student project fails and where you can be provably better.

**Concurrency, layered defence:**
1. Guest selects a slot. A `READ COMMITTED` transaction locks every candidate physical table in ascending ID order with `SELECT ... FOR UPDATE`, re-runs overlap and policy checks against reservations and live holds, inserts one `holds` row with `expires_at = NOW() + 600s` plus one `hold_tables` row per member, commits, and returns a UUID hold token.
2. Guest submits details. A transaction locks the hold and every member table, verifies `status='active' AND expires_at > NOW()`, rechecks policy and overlap, inserts the reservation and each `reservation_tables` membership, then marks the hold consumed.
3. Backstop: `UNIQUE KEY uq_table_active_slot (table_id, active_slot_start)` on `reservation_tables`; the generated start is `NULL` after `released_at` is set. Identical live starts conflict (1062 → HTTP 409), while cancelled history remains and the slot can be reused. Different overlapping starts are prevented by the lock and interval check.
4. Expiry via `CREATE EVENT ev_expire_holds EVERY 1 MINUTE`, but correctness never depends on it because every read filters `expires_at > NOW()`.
5. Deadlock discipline: always lock `ORDER BY table_id ASC`, retry 3x on 1213/1205.

Failure mode this prevents: plain reads can show two guests the same last table. The row lock serialises check-and-insert; the 10-minute hold protects the time spent completing the form.

**Availability algorithm:** half-open interval overlap (Allen's `overlaps`). Reservations store `starts_at`, `ends_at` (= start + turn time looked up by party size), `blocks_until` (= ends_at + buffer). All overlap tests use `blocks_until`. Candidate tables filtered by `capacity_max >= :party AND capacity_min <= :party`, then three `NOT EXISTS` blocks (live reservations, live holds from other sessions, blackout dates), then `ORDER BY (capacity_max - :party), priority` for best-fit so a 10-seat VIP room is never handed to a party of 2. Table combinations are attempted only when no single table fits. Pacing caps (covers per slot, reservations per slot) applied last.

**State machine:** `pending -> confirmed -> seated -> completed`, plus `cancelled`, `no_show`, `waitlisted`. Only pending/confirmed/seated occupy a table, expressed as one PHP constant used by every query. Seating a reservation auto-creates an `open` order row, which is what makes a ticket appear on the kitchen screen. Releasing a table triggers waitlist promotion via `ORDER BY waitlist_rank LIMIT 1 FOR UPDATE SKIP LOCKED`. Every transition appends to `reservation_status_history`.

**Rules worth demoing:** VIP minimum party size or deposit, group bookings above N require manager approval, lead-time limits, auto-no-show after a grace period, waitlist auto-promotion.

**Core tables:** room_types, rooms, tables, table_groups, table_group_members, settings, opening_hours, turn_times, pacing_rules, blackout_dates, roles, users, guests, reservations, reservation_tables, reservation_status_history, holds, hold_tables, menu_categories, menu_items, orders, order_items, order_status_history, outbox.

---

## 4. Guest flow

1. **Search bar**: party size (default 2) -> date (native `input type=date`, default today) -> time (default next bookable slot) -> room type (default "Any room") -> Find a table. Party-size-first, because inventory is shaped by capacity and venues gate bookings by party size.
2. **Availability**: query shown as editable chips. Time pills are real radio inputs grouped by service period and room. Truthful scarcity only ("2 VIP rooms left tonight" must be a real count).
3. **No-availability cascade, in this strict order**: nearest times -> other room types -> nearest dates -> waitlist -> genuinely fully booked. Never show an empty state.
4. **Table assignment**: server creates the hold and pre-assigns the best-fit table ("We have held Table 12 for 10 minutes"), with a visible countdown. The floor plan is an optional override, not a required step.
5. **Details**: name, mobile, email required. Occasion, allergies, special requests, reminder opt-in optional. Asking for allergies here is what feeds the kitchen screen later.
6. **Confirmation**: reference code, floor-plan thumbnail, .ics download, QR code, modify/cancel link.
7. **Manage**: 64-hex token link, no account required anywhere in the guest path.

**Floor plan: inline SVG rendered by PHP, enhanced by vanilla JS**, pan/zoom library only on small viewports. At tens of tables, Canvas's node-count advantage never applies, and SVG gives free hit testing, real `tabindex`/`role` accessibility, CSS status classes, and a no-JS fallback. Coordinates live in a virtual 1000x700 viewBox. Always ship a parallel radio-list view of the same tables.

**Room types** presented as cards with imagery, capacity range, minimum spend and badges, so VIP vs common vs group vs terrace is immediately obvious and desirable.

---

## 5. Dashboards

Current P6 delivery uses role codes `admin`, `manager`, `host`, `server`, and `kitchen`. Actual host administration is at `/admin`; food orders at `/server`; kitchen tickets at `/kitchen`. Kitchen uses two-second polling and orders use six-second polling while visible/idle. Stored server times drive ticket age; holds/recalls retain the original age. Servers confirm delivery, then close service without payment. The broader dashboard, chart, menu/editor, and transport ideas below are historical design targets; SSE/ETag and advanced reports are not implemented.

**Admin**: KPI tiles (covers today, seated vs booked, no-show rate, occupancy %, average turn time, revenue per available seat hour), a host timeline view (tables on Y, time on X, reservations as blocks, rendered with CSS grid in vanilla JS), live floor-plan status, filterable reservation list, waitlist, menu CRUD, table/room CRUD including dragging tables on the plan, staff management, hours and turn-time settings, audit log. Roles: owner, manager, host, waiter, kitchen.

**Kitchen**: dense auto-fill grid `minmax(360px, 1fr)`, oldest ticket top-left, no kanban columns. Card shows ticket number, table, pax, order-type chip, a 56px tabular-nums timer, item lines with bold quantity prefix, indented modifiers, a full-width red ALLERGY bar, station tags, and one full-width next-state button. Aging from `fired_at`: 0-5min ON TIME green, 5-10 WORKING amber, 10-15 LATE orange plus sort lift, 15+ CRITICAL red plus pulse and pin top-left. Always colour **plus** a text label and border thickness, never colour alone. States `QUEUED -> PREPARING -> READY -> SERVED` plus HELD and RECALLED, with a 20-ticket recall drawer and never an auto-bump. Readable at 3 metres on a projector, touch-first, zero hover-dependent interactions.

**Realtime transport: 2-second AJAX polling as primary, SSE as a feature-flagged enhancement that auto-degrades after two failed connects.** Reason: SSE and long-polling each occupy one PHP-FPM child for the connection's whole life, so with a default `pm.max_children` of 5-10, six open dashboard tabs can starve the pool and freeze the exact page the judges are looking at. Non-HTTP/2 SSE is also capped at 6 connections per browser per domain. Polling cannot be proxy-buffered, cannot exhaust the pool, and survives container restarts; the ETag/304 path costs one indexed `MAX(id)` read per tick. WebSockets via Ratchet or Workerman were rejected: an extra supervised process for a one-way feed.

---

## 6. Visual direction

Dark-first "warm ember" luxe: warm near-black base (not pure black, not blue-grey), bone-white text, one amber accent, hairlines instead of heavy shadows, radii on images only. Fonts: Fraunces variable display serif + Inter, self-hosted woff2. A full `:root` token block (colour ramp, fluid `clamp()` type scale, 4px spacing scale, radii, easing curves, durations, z-index) is in `research/04_ui_effects.md` ready to paste.

Top effects ranked by impact per effort:
1. Design tokens, fluid type, self-hosted fonts - 2-3h, zero risk, **do this first**
2. Cross-document View Transitions with a morphing dish image - 30-60min, +45min for the morph (Chrome/Safari only, degrades silently)
3. Masked split-text hero reveal - 45min, vanilla
4. Scroll-driven reveals plus progress bar, IntersectionObserver fallback - 1-1.5h
5. Counters plus themed Chart.js dashboard - 2-3h, credibility win
6. Skeletons, optimistic slot selection, toasts - 2-3h
7. Glass nav, magnetic CTA, cursor dot - 1.5-2h, `backdrop-filter` is the FPS trap, needs a kill switch
8. Confetti on confirmation - 10min, cheap trick, lands anyway
9. Theme toggle with circular View Transition wipe - 45-60min, cut unless the light palette is genuinely good
10. Pinned horizontal menu gallery with ScrollTrigger - 2-3h, **most fragile**: fights smooth scroll and breaks on unfamiliar aspect ratios

Libraries, ~130KB total and only ~76KB on marketing pages: GSAP 3 + ScrollTrigger, Lenis (marketing pages only, never on admin or forms), canvas-confetti, Chart.js 4 (admin only). Rejected: Swiper and Splide (scroll-snap wins), **AOS (unmaintained, and an instant template tell)**, anime.js, tsParticles, ApexCharts, Lottie. Pin major versions, `defer` everything, and vendor all assets locally before demo day. A strict CSP of `'self'` both hardens the app and forces that offline safety.

Hard rule: effects never compromise the booking form, the admin tables or the kitchen screen. Respect `prefers-reduced-motion` everywhere.

---

## 7. Security baseline (what a code reviewer looks for)

Implemented P5: PDO prepared statements for input values; PHP `password_hash` with bcrypt cost 12 and a 15–72-byte password bound; separate staff cookie with HttpOnly/SameSite Strict, Secure on HTTPS, regenerated IDs, idle/absolute limits, and permanent account-version revocation. Every mutation checks session CSRF in its controller; services recheck current role and expiry after locks. Login has account/IP limits. Templates escape output and dynamic UI uses text nodes; strict CSP serves local assets. See [the staff security guide](docs/staff-api.md). Argon2, booking abuse limits, kitchen permissions, HTTPS deployment, and image-upload hardening remain review or later-phase work; this paragraph does not mark them implemented.

Documented anti-patterns to avoid, taken from real repos found in the research: md5 passwords with interpolated usernames, modelling tables as a per-day integer, storing dates and party sizes as varchar with no table entity, `password_verify` commented out, `phpinfo.php` committed, hardcoded root credentials.

---

## 8. Seed data

A believable identity ("Lumina Kitchen & Terrace"), 4 rooms across the 4 required types with 24 tables and 86 seats including floor-plan coordinates on the 1000x700 grid, 36 menu items across categories with prices, descriptions and images, 5 demo accounts one per role, and roughly 295 reservations seeded relative to `CURDATE()` so past, today and future all look alive. Idempotent via `ON DUPLICATE KEY UPDATE` with a fixed `mt_srand` so every reset produces identical data. Food photography from Unsplash or Pexels; verify the licence terms in a browser before shipping, since the licence page could not be read programmatically.

---

## 9. Demo day

Judges remember moments, so rehearse these five:
1. Party size changes and availability, floor plan and room cards all re-render live
2. Instant table-assignment reveal with a zoom and pulse on the SVG plan
3. Two browser windows proving the hold timer: one guest's slot expires and the other claims it
4. Host seats a party, and a ticket materialises on the kitchen screen seconds later, then gets bumped and the floor plan flips status
5. QR confirmation scanned on stage, host marks arrived, plan updates live

Reliability: `bin/demo-reset.php` for a clean re-run, `bin/smoke.sh` before you present, a 6-tier Docker fallback plan, an 8-minute timed script, and everything self-hosted so no wifi is needed.

Documentation is cheap rubric points: README with one-command start, ER diagram, architecture diagram, API doc.

---

## 10. Top risks

1. **Docker fails on the demo machine.** Mitigate with the fallback tiers and a pre-recorded backup video.
2. **Scope creep into effects before the engine works.** Mitigate with the verified guest MVP line at P4.
3. **The floor plan swallows a week.** Mitigate by shipping the radio-list fallback first and treating SVG as an enhancement.
4. **Realtime chosen wrong and the kitchen screen freezes mid-demo.** Mitigate by making polling primary.
5. **Seed data looks fake and undermines everything.** Mitigate by seeding relative to CURDATE and using real food photography.

---

## 11. Confidence

Confidence 82 of 100. The architecture, Docker mechanics, security patterns, MySQL concurrency semantics and browser-support claims are standard and source-backed. The hour estimates, seed volumes and visual direction are engineering judgment and have not been validated against your team's velocity. The phase-progress table above records executed local PHP/MySQL and browser verification; later phases remain planned. Competitor UX rows in `03_ux_flows.md` are marked UNVERIFIED because OpenTable, Resy, Tock, SevenRooms and Yelp all blocked programmatic reads this session; the recommended flow is labelled DESIGN rather than cited.
