# SeatFlow

Restaurant table reservation platform built with vanilla PHP 8.3, vanilla JavaScript, CSS, MySQL 8.4, and Docker Compose.

This repository contains the engineering plan, research, a clickable browser prototype, and the PHP/MySQL application. The guest website uses real MySQL availability, expiring holds, transactional confirmation, and private links for changing or cancelling a booking. Staff workspaces provide secure sign-in, reservation management, seating, waitlist offers, settings, audit history, food ordering, and persistent kitchen tickets.

## Bella Vista website release

**Access is currently private at Marvin’s request.** The app links require authorized Vercel access, and this GitHub repository is private.

Open [Bella Vista Dining](https://bella-vista-dining-marvmarv08.vercel.app) or [staff sign-in](https://bella-vista-dining-marvmarv08.vercel.app/staff/login). The latest source is published to GitHub and deployed as a Ready Vercel Preview backed by a separate online database. The old online application and records remain available. Always-running no-show worker hosting is deferred by agreement; request-driven reconciliation and server-side seating cutoffs remain enforced. See [the deployment guide](docs/vercel-deployment.md#bella-vista-website-release--2026-10-27) for release status, recovery and verification. The local-phase notes below describe the earlier isolated delivery boundaries.

## Bella Vista assignment alignment

The local application now displays **Bella Vista Dining** across guest/staff/service screens and future simulated messages. Main uses the existing foundation; the nine-unit/schedule delivery is isolated as described below. Guest pre-orders/quote acceptance are delivered only in the isolated preview. Assigned cancellation/grace workflows are delivered only in isolated B5. Daily food-sales reporting and operational table states are delivered only in isolated B6. Original logo, About/History, a company banner and palette guide are verified only in isolated B1. The wider proposal package is **not yet delivered**. Fee/minimum and onsite-recording delivery is isolated as described below. Read [the current roadmap](PLAN.md#bella-vista-assignment-alignment--2026-10-17) for the requirement matrix, open decisions and B0–B8 acceptance phases. Earlier completed phases describe the previous scope. The [deep research report](research/15_bella_vista_requirements_research.md) adds restaurant identity checks, comparable venues, official implementation references and proposed acceptance scenarios.

The isolated Bella Vista B2 preview is available at **http://localhost:18080** with nine target units and the approved schedule/capacities. Main **http://localhost:8080** retains its existing inventory/rules. B0 decisions/recovery planning is verified; B1/B2/B3/B4/B5/B6 remain In progress pending separate main activation. The protected [isolated cashier](http://127.0.0.1:18080/billing) records demo onsite receipts/credits; it does not process payments. Assigned cancellation/grace reconciliation is isolated B5 work. The protected [daily report](http://localhost:18080/reports) is available to admin/manager in isolated B6: finalized food uses the dining date; actual receipts/refunds use the transaction date.

B2 uses separate explicit schema preparation and transactional catalog activation; neither runs during normal startup. Verification includes 19 target MySQL scenarios, 126 legacy scenarios, 12 actual browser checks and populated isolated restore with historical/current private booking reads. See [the B2 delivery evidence](PLAN.md#b2-inventory-and-schedule--isolated-delivery-2026-10-17). Never use an isolated dump as the main database's recovery backup.

B3 verification: 18 fee checks, 20 MySQL billing scenarios, 145 B2/legacy regressions and 15 real browser checks, plus populated 41-table restore. Staff Standard seating validates an actual ₱1,000 menu order atomically. Only test admin/manager can record receipts; final bills and financial history are protected. Unused-credit review is explicit; guest cancellation/refund integration remains B5. See [B3 evidence](PLAN.md#b3-fees-and-onsite-records--isolated-delivery-2026-10-18).

B4 delivers the isolated guest cart, explicit server quote acceptance, private food edits and once-only kitchen handoff. Three combined categories retain 36 actual priced dishes while preserving legacy identities. Verified 21 MySQL cases, 25 guest browser checks, 4 staff/billing integration checks, 165 prior MySQL cases and 32 legacy browser checks; populated 43-table restore preserves all fingerprints. [The pre-order guide](docs/preorders-api.md) explains quote/retry/deadline handling and the B5 boundaries. Open port 18080, choose a table, add food, then review/accept the quote. No online payments or main activation.

B5 adds full accepted terms, preserved 24-hour deadlines, safe food/fee-aware changes, actual refund review and autonomous 15-minute arrival release only in isolation. Verified 26 MySQL and22 guest/staff/cashier browser checks, worker restart/catch-up and populated 46-table restore, plus prior-feature regressions. Read [the policy workflow guide](docs/policies-api.md). No online money transfers; main activation remains separate. B6 operations/food-sales reporting is delivered in isolation as recorded below.

B1 branding is available at [About Us](http://localhost:18080/#about) and [Company History](http://localhost:18080/#history), with an original local emblem across all workspaces. The [branding guide](docs/branding/bella-vista-identity.md) explains the palette, original logo and [company banner](public/assets/brand/bella-vista-banner.svg). Verified 19 branding and 21 preserved seating browser checks, exact supplied profile/history, responsive/accessibility checks, lint/syntax/smoke and main/source preservation. The running main image remains unchanged. Next: B7 team profile/DFD/timeline/cost proposal inputs.

## Working from the Windows Desktop

The working project is saved in `C:\Users\burgo_w8uuyg3\OneDrive\Desktop\restaurant-reservation-system`. Open this folder in File Explorer or VS Code for future work. The complete source, plans, research, Git history and existing ignored `.env` are retained. Open `.env` with Notepad to view the local database connection values; keep them private.

From PowerShell in that folder, existing configuration is ready for Docker Compose. Keep `.env`; the example-copy step below applies only to a fresh checkout without it. The current app remains at http://localhost:8080 and Adminer at http://localhost:8081. MySQL records remain in Docker's existing named volume; moving source files is not a database export. The original Linux project is retained as a dated recovery backup, and its old entry now points to the Desktop folder.

## Online deployment

The full-system Vercel package is being prepared with a separate hosted MySQL database and persistent sessions. See [the deployment guide](docs/vercel-deployment.md) for private configuration, Marvin-only account ownership and the current delivery status.

## Start the PHP application

You need Docker Desktop with WSL integration enabled if you use this repo from WSL. On a **fresh checkout only**, copy the example configuration; if `.env` already exists, keep it because it holds the credentials used by your current MySQL volume. From the repository folder:

```bash
cp .env.example .env
docker compose up -d --build --wait --wait-timeout 120
docker compose ps
```

Open [http://localhost:8080](http://localhost:8080) for the live guest website. Open [http://localhost:8080/health](http://localhost:8080/health) to check the database connection; a working stack returns `{"ok":true,"db":true}`. Adminer is at [http://localhost:8081](http://localhost:8081); choose MySQL, server `db`, and the `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE` values from your local `.env`. On a fresh volume, MySQL loads the schema, rooms, tables, menu, and inactive demo staff; a one-shot PHP seed adds date-relative sample reservations before the web app starts.

If your MySQL volume already existed before the latest schema files were added, the MySQL image will not rerun its init SQL. Start only the database, then apply the additive upgrade and start the full stack:

```bash
docker compose up -d db
bash bin/setup-db.sh
docker compose up -d --build
```

The setup script keeps existing rows and does not reset your volume. Never copy `.env.example` over an existing `.env`: its database credentials must continue matching your current volume.

Phase 3 adds `booking_days` for pacing locks and `hold_reservations` for confirmation retries.
See [the booking API guide](docs/booking-api.md) for routes, rules, and the isolated verification commands.
Availability can be inspected at `/api/availability?date=YYYY-MM-DD&party_size=2&room_type=common`
using a valid upcoming service date. Phase 4 adds hash-only private management credentials and before/after change history. Phase 5 adds `06_staff_admin.sql` for secure activation, session revocation, login limits, waitlist offers, staff request retries, and audit records. Phase 6 adds `07_menu_kitchen.sql` for order versions, server assignment, item snapshots, kitchen tickets, and safe action retries.

To check the seed and database safeguards:

```bash
docker compose exec app php bin/verify-db.php
docker compose run --rm seed
```

The verification rolls back its temporary writes. Rerunning the seed on the same day should report `0 new reservations`. The date-relative demo rows are added for new calendar days; they do not erase or rewrite existing booking history. To inspect data, use Adminer or `docker compose exec db` with your private `.env` credentials. Demo staff profiles start inactive; activate staff using the instructions below. No real messages or payments are sent.

After the containers are healthy, run `bash bin/smoke.sh` to check guest/staff/service assets, catalog, protected host/order/kitchen routes, database health, and basic route errors. If you changed `APP_PORT`, pass its URL, for example `bash bin/smoke.sh http://localhost:8090`.

The `.env.example` passwords are local demo placeholders. Edit them in your private `.env` before sharing a running stack; never commit `.env`. To stop containers while keeping database data, run `docker compose down`. If a port is already in use, change `APP_PORT`, `ADMINER_PORT`, or `DB_PORT_HOST` in `.env`, then run `docker compose up -d` again.

If `docker` is not found in WSL, start Docker Desktop in Windows and enable this WSL distribution under **Settings → Resources → WSL Integration**. Check again with `docker compose version`. If `/health` reports `{"ok":false,"db":false}`, inspect `docker compose ps` and `docker compose logs db app`.

If Ubuntu says `permission denied` for `/var/run/docker.sock`, add your Ubuntu account to the local Docker group with `sudo usermod -aG docker "$USER"`, then close and reopen Ubuntu before retrying `docker compose ps`. Enter your password only in your own terminal. Docker group membership grants control over local containers, so use it only on a machine you trust.

## Try the guest booking flow

1. Open [localhost:8080](http://localhost:8080), choose a date in the next 60 days, guests, and room preference. Choosing guests filters compatible room options; choosing a room restricts guests to its database booking range. A valid count is preserved, while an incompatible count is adjusted with a visible notice. Choose **Any room** to restore the full guest range. Monday is closed; VIP and Group/Long Tables both need 12 hours of notice; Main Dining and Terrace retain the one-hour minimum.
2. Select an available time. Click a room card or floor table to preview seating. Green/red badges apply to this date, time and guest count; neutral means a fresh check is needed. **Use this table** updates the radio/floor selection; **Continue with this table** holds it for ten minutes.
3. Enter your name, phone, and email. Confirm the reservation. Parties of 13–16 submit a request awaiting manager approval.
4. Save **Copy private link** at confirmation. Open that link in another browser to see the same database booking. Refreshing the original tab also restores its hold or confirmation.
5. In **My booking**, change the date, party, or table, or cancel after confirming the dialog. The original reservation stays reserved until a replacement is saved. Online changes and cancellation close two hours before the booking.

Treat the private link like a password: anyone with it can manage that booking until it expires. The reference code alone cannot open guest details. There is no guest account requirement. Staff handle manager approval, seating, no-shows, and waitlist offers in the live admin workspace. Email/SMS are simulated, so save the private link yourself; no real notification will arrive.

Buttons show a specific pending label while a request runs, then restore their original label. Slow table searches show stationary placeholders; fast responses finish immediately. Success messages use polite status feedback, while errors stay visible with a recovery action. Motion follows the device’s reduced-motion preference. Guest booking panels use a short entrance after deliberate navigation, menu changes keep focus on the chosen category, and the hero enters once per page load. Typed guest details survive choosing another table within the same page; completion or a new reservation clears the draft. The draft is not added to browser storage.

Guests can browse the menu. Authorized staff place food orders for seated parties through the server workspace; guests cannot submit kitchen orders directly. Styles and scripts are local; guest pages use locally hosted display/body fonts with system fallbacks, while operational views keep their existing system fonts. Graphics use CSS/inline SVG and locally stored rendered images with source credits. The live app does not need a CDN or internet connection once Docker images are prepared.

## Desktop guest presentation

The guest home uses locally hosted Cormorant Garamond and Inter fonts. On a laptop, the headline stays anchored while search results expand, and the navigation remains visible with the active room/menu section marked. Heading entrances run once; Reduce Motion and missing font/animation support keep booking usable. The booking steps show completed form work while the confirmation badge retains the actual confirmed or awaiting-approval state.

Open [localhost:8080](http://localhost:8080), search for a table, then browse Rooms and Menu. The signature feature uses an available signature-tagged catalog dish with its real price and dietary tags, and is omitted when no eligible dish exists. Photos remain illustrative and credited. Staff/kitchen retain their existing presentation. Research, laptop views, test evidence and delivery notes: [desktop UI research](research/14_ui_motion_refresh_research.md#first-desktop-guest-batch-delivered--2026-10-14).

## Room and table motion

Open [Rooms](http://localhost:8080/#rooms): the four room photos gently reveal once as they enter view. Room buttons remain immediately usable. Open a room and use Next, Previous or a thumbnail: the previous table picture stays visible while the next loads, then blends into the new picture over 180ms. Fast selections keep the latest image; reduced-motion settings skip the animations. Booking and availability checks remain authoritative. The Close button stays visible in a reserved upper-right area while the title and preview content scroll; it does not overlap the pictures.

## Concept table positions

Guest and staff floor maps share a fictional arrangement: Suites upper left, Long Room lower left, Main Dining center and Terrace right. All 25 tables stay inside their rooms. Entrance and dashed aisle guides explain the layout; each guest table preview shows its location and a room map with the table in gold. On phones, swipe the contained map sideways to explore other rooms. This is a concept drawing, not a measured restaurant plan; booking identities and rules are unchanged. [Arrangement and actual previews](research/07_table_showcase_research.md#local-concept-floor-positions--2026-10-08).

## Moving booking background

The full guest booking hero uses a silent, gently moving evening dining-room video behind the heading and booking form. The dark overlay and solid form retain readability. It repeats while visible, including during form use; reduced motion or failed playback shows a matching still image. The compressed clip is approximately 0.73 MB. Creator/source/license details are in `public/assets/videos/hero/credits.json`; [research and verified local delivery](research/13_hero_background_video_research.md) includes desktop/phone views.

## Explore the food showcase

Below the booking hero, the food inspiration gallery uses six locally saved, credited photographs retained from the original concept and its warm palette. Desktop columns move gently and continuously while visible, including during hover or keyboard focus. On a phone, the strip moves automatically and remains swipeable. There is no Pause/Resume button; the decorative chef video also loops while visible. Reduced-motion settings keep the gallery still. Explore the menu opens the real database catalog; the stock photographs illustrate the atmosphere rather than exact menu dishes. Open Photography credits for the original sources.

## Browse menu photos and categories

Open [the menu](http://localhost:8080/#menu). All 36 catalog dishes have locally stored illustrative thumbnails. Choose a category from the desktop sidebar or swipe the category buttons on a phone; All dishes restores the full list. The heading and count show the selected group. Names, descriptions, prices, dietary tags and availability come from the database. Photographs may differ from exact recipes or presentation; read the dish details and expand Menu photo credits for authors, original sources and licenses. If an image fails, its dish details and category controls remain usable.

## Activate the first admin and try the staff workflow

Run this from the repository folder in your own Ubuntu terminal:

```bash
docker compose exec app php bin/invite-staff.php marvin@lumina.test Marvin admin
```

The command prints a private activation link valid for 24 hours. Open it, choose your own password (15–72 bytes; ordinary English characters use one byte each), and keep the link private. No email is sent. `marvin@lumina.test` is a local demo sign-in name, not a mailbox. The app password is separate from your Ubuntu, Docker, or GitHub password. There is no preset staff password. Reissuing an invitation invalidates older unused links; the command rejects accounts already active.

1. Open [Staff sign-in](http://localhost:8080/staff/login), then the [admin workspace](http://localhost:8080/admin).
2. Status **All** shows bookings across all dates with search and Previous/Next pages; a specific status filters the chosen service date. The daily totals and floor still use that service date. Inspect real reservations and floor availability. Create a phone booking or walk-in using the actual available tables.
3. Open a reservation to review its details and history. Admin/manager can approve a pending request. Host, manager, and admin can seat a confirmed party within its seating window, record a no-show after the grace period, or cancel with a reason.
4. Seating creates one open order. Use the food ordering and kitchen flow below. Host completion refuses unfinished food, then releases tables with a reset buffer. An empty open order is voided rather than marked paid.
5. Add a waitlist party or recheck the queue. An offer reserves every physical member for ten minutes before a simulated notification is recorded. The host accepts the offer when the guest agrees; there is no public guest claim page yet.
6. Admin/manager can review settings, blackouts, audit records, and the simulated outbox. Admin can invite staff and change roles; sign out and back in if account management asks for recent sign-in.

Roles are enforced by the server. Host cannot approve requests, change settings, manage staff, or place food orders. Manager cannot change global rules or staff accounts. Server and kitchen profiles use their own workspaces and cannot open the host dashboard. Admin/manager can operate all three workspaces. See [the staff API and security guide](docs/staff-api.md).

The Compose app, MySQL, and Adminer ports bind to `127.0.0.1` by default, making this a local laptop setup. Public hosting and HTTPS require a separate deployment review. Do not expose this local HTTP stack to a network for real staff use.

## Try food ordering and the kitchen

Use your existing activated staff account. Admin/manager can test the whole flow in two tabs; individual server and kitchen accounts have separate permissions.

1. In the [host dashboard](http://localhost:8080/admin), seat a confirmed booking on its service date, from 30 minutes before start until its dining interval ends. This creates the party's first open order. Future reservations cannot be seated early just to create a demo ticket.
2. Open [Food orders](http://localhost:8080/server). A server claims an unassigned order before editing it; another server cannot take that assigned order. Add dishes, quantity, course, preparation notes, and confirmed allergy instructions. Prices come from MySQL and are saved with each line.
3. Choose **Send to kitchen**. Open [Kitchen tickets](http://localhost:8080/kitchen) in the second tab. A real ticket appears with table members, quantities, notes, station, and a server-based elapsed timer. Sent lines are frozen; manager/admin can void a mistaken order with a reason.
4. Kitchen staff choose **Start preparation**, mark individual items ready if useful, then **Mark entire ticket ready**. Hold/resume requires a reason. Station filters keep the full matching ticket visible because a ticket action applies to every station on it.
5. The server chooses **Mark served** after delivery. A served ticket can be recalled to preparation while its food round remains open; recall retains its original timer and history.
6. Choose **Close service** to finish that food round. This records `closed`, with no payment collected or `paid` status invented. Start another round if needed. When all food rounds are finished, the host completes the reservation and begins the table reset buffer.

Outstanding orders and tickets stay visible across midnight. The date filter selects archived rounds/recent served tickets; it does not hide unfinished service. Kitchen refreshes every two seconds and food orders every six seconds while visible and idle. Refresh pauses while editing or a ticket control has focus. If a response is interrupted, **Retry same request** recovers the saved operation without adding a duplicate dish or ticket.

See [the order API and verification guide](docs/orders-api.md). Menu editing, payments, guest food ordering, and external notifications are outside this phase.

## Rehearse safely and offline

Use `bash bin/demo.sh up` to create a disposable demo at [localhost:8082](http://localhost:8082), with its own private configuration, database volume and staff activation. `bash bin/demo.sh stop` keeps demo data; `start` uses cached images without downloads. Reset only this stack with `bash bin/demo.sh reset disposable-demo`. The script validates the demo storage target and never accepts the main project as a reset target.

Follow [the demo guide](docs/demo-guide.md) for private activation, timing preparation, the eight-minute presentation, offline checks and troubleshooting. Use a separate browser profile because cookies are shared across ports on the same hostname. Prepare an eligible reservation before the presentation; future guest bookings cannot be seated immediately.

See [architecture and database diagrams](docs/architecture.md) and [verification commands](docs/verification.md). Initial setup downloads require internet; the prepared live app runs locally without it. Automated accessibility checks supplement a hands-on keyboard and zoom rehearsal.

## Explore the browser prototype

Open [`prototype/index.html`](prototype/index.html) in a browser. No server, no build step, no install.
It simulates the guest booking flow, the interactive floor plan, the admin dashboard and the kitchen
display against generated reservations, 25 tables and 36 menu items. Its booking behavior is a
browser simulation; it is not connected to the new PHP foundation or MySQL yet. See
[`prototype/README.md`](prototype/README.md) for what to click.

## Scope

- Guest-facing reservation flow with live availability
- Four room classes: VIP, standard, group and terrace / private dining
- Interactive SVG floor plan with an accessible list-based fallback
- Menu catalogue with sample data
- Admin dashboard: KPIs, host timeline, reservation and floor management, staff and settings
- Kitchen display system with ticket aging, allergy prominence and station routing

## Why the booking engine comes first

Reservation requests share the same table inventory. The engine protects it with:

- Short-lived expiring holds so a slot is reserved while the guest completes the form
- `SELECT ... FOR UPDATE` inside a transaction to serialise the check-and-insert
- A unique composite index as a database-level backstop that makes an identical double-book physically impossible
- Half-open interval overlap tests against a `blocks_until` column that folds in turn time and buffer
- Best-fit table ranking so large rooms are not consumed by small parties

## Architecture

```
public/      front controller, local CSS/JS assets, uploads
src/         Core, Controller, Domain, Service, View
config/      app, database, routes
database/    schema, reference data, demo seed
bin/         seeding, guarded demo stack/reset, tests, smoke checks
docs/        diagrams, API references, demo and verification guides
```

The stack uses `php:8.3-apache`, `mysql:8.4`, one-shot seed, and Adminer. MySQL loads the init SQL on a new volume; the seed container exits successfully before the app starts. After copying `.env.example`, start with one Compose command.

## Delivery phases

The current roadmap, completion checks, and resume checkpoint are in [`PLAN.md`](PLAN.md#1-delivery-roadmap-and-mvp-line).
After a phase passes its completion check, update the phase progress in `PLAN.md` and run
`python3 scripts/export_roadmap.py` to refresh the Windows Desktop text copy.

| Phase | Deliverable |
|---|---|
| P0 | Lock booking rules and correct the schema plan |
| P1 | Boot PHP, MySQL, and Docker Compose |
| P2 | Schema, reference data, and repeatable demo seed |
| P3 | Safe availability, holds, and concurrency tests |
| P4 | Persistent guest booking end to end **(MVP line)** |
| P5 | Staff authentication, roles, and admin dashboard |
| P6 | Real menu orders and kitchen display |
| P7 | Visual polish, documentation and demo hardening |

## Documents

- [`PLAN.md`](PLAN.md) - the consolidated implementation plan
- [`research/09_food_showcase_research.md`](research/09_food_showcase_research.md) - selected food photographs, candidate comparisons, licenses, motion design and verification
- [`research/08_ui_motion_research.md`](research/08_ui_motion_research.md) - current UI effects recommendations for every major guest/staff workflow, sources, timings and implementation phases
- [`research/07_table_showcase_research.md`](research/07_table_showcase_research.md) - click-to-open table showcase research, licensed pictures, interactive design study and planned integration
- [`docs/demo-guide.md`](docs/demo-guide.md) - safe demo setup, offline rehearsal and eight-minute walkthrough
- [`docs/architecture.md`](docs/architecture.md) - actual request flow, database relationships and stack boundaries
- [`docs/verification.md`](docs/verification.md) - regression, accessibility and offline verification commands
- [`docs/booking-api.md`](docs/booking-api.md) - live booking API, transaction safety, and isolated tests
- [`docs/staff-api.md`](docs/staff-api.md) - staff activation, permissions, host workflow, settings, and isolated verification
- [`docs/orders-api.md`](docs/orders-api.md) - server assignment, food orders, kitchen tickets, service closure, and isolated verification
- [`research/01_reference_repos.md`](research/01_reference_repos.md) - open-source references and anti-patterns
- [`research/02_booking_engine.md`](research/02_booking_engine.md) - schema DDL, availability SQL, concurrency, state machine
- [`research/03_ux_flows.md`](research/03_ux_flows.md) - guest flow, floor plan picker, accessibility
- [`research/04_ui_effects.md`](research/04_ui_effects.md) - design tokens, effects catalogue, library evaluation
- [`research/05_dashboards_kds.md`](research/05_dashboards_kds.md) - kitchen display spec and realtime transport analysis
- [`research/06_stack_architecture.md`](research/06_stack_architecture.md) - directory layout, Docker, security, API surface, seed data

## Stack

PHP 8.3 - MySQL 8.4 - vanilla JavaScript - CSS - Docker Compose

B6 operations: named Available / Reserved / Occupied / Clean-up states, temporary holds/manual closures, clearer kitchen cards and live pre-order server assignment. See [operations/report definitions and verification](docs/operations-reports.md). B6 is verified only on port 18080; normal startup never activates it on main. B1 original branding/About/History is now verified in isolation too; next is B7 proposal documentation, then B8 final acceptance.
