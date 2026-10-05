# Restaurant Table Reservation System

Restaurant table reservation platform built with vanilla PHP 8.3, vanilla JavaScript, CSS, MySQL 8.4, and Docker Compose.

This repository contains the engineering plan, research, a clickable browser prototype, and the PHP/MySQL application. The guest website uses real MySQL availability, expiring holds, transactional confirmation, and private links for changing or cancelling a booking. The live staff workspace provides secure sign-in, reservation management, seating, waitlist offers, settings, and audit history. Ordering and kitchen tickets are the next phase.

## Start the PHP application

You need Docker Desktop with WSL integration enabled if you use this repo from WSL. On a **fresh checkout only**, copy the example configuration; if `.env` already exists, keep it because it holds the credentials used by your current MySQL volume. From the repository folder:

```bash
cp .env.example .env
docker compose up -d --build
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
using a valid upcoming service date. Phase 4 adds hash-only private management credentials and before/after change history. Phase 5 adds `06_staff_admin.sql` for secure activation, session revocation, login limits, waitlist offers, staff request retries, and audit records.

To check the seed and database safeguards:

```bash
docker compose exec app php bin/verify-db.php
docker compose run --rm seed
```

The verification rolls back its temporary writes. Rerunning the seed on the same day should report `0 new reservations`. The date-relative demo rows are added for new calendar days; they do not erase or rewrite existing booking history. To inspect data, use Adminer or `docker compose exec db` with your private `.env` credentials. Demo staff profiles start inactive; activate staff using the instructions below. No real messages or payments are sent.

After the containers are healthy, run `bash bin/smoke.sh` to check the guest/staff pages, CSS/JS, catalog, protected staff data, database health, and basic route errors. If you changed `APP_PORT`, pass its URL, for example `bash bin/smoke.sh http://localhost:8090`.

The `.env.example` passwords are local demo placeholders. Edit them in your private `.env` before sharing a running stack; never commit `.env`. To stop containers while keeping database data, run `docker compose down`. If a port is already in use, change `APP_PORT`, `ADMINER_PORT`, or `DB_PORT_HOST` in `.env`, then run `docker compose up -d` again.

If `docker` is not found in WSL, start Docker Desktop in Windows and enable this WSL distribution under **Settings → Resources → WSL Integration**. Check again with `docker compose version`. If `/health` reports `{"ok":false,"db":false}`, inspect `docker compose ps` and `docker compose logs db app`.

If Ubuntu says `permission denied` for `/var/run/docker.sock`, add your Ubuntu account to the local Docker group with `sudo usermod -aG docker "$USER"`, then close and reopen Ubuntu before retrying `docker compose ps`. Enter your password only in your own terminal. Docker group membership grants control over local containers, so use it only on a machine you trust.

## Try the guest booking flow

1. Open [localhost:8080](http://localhost:8080), choose a date in the next 60 days, guests, and room preference. Monday is closed; VIP needs 48 hours and Group needs 24 hours of notice.
2. Select an available time. The floor plan and radio list show the same eligible tables. Continue to hold the selection for ten minutes.
3. Enter your name, phone, and email. Confirm the reservation. Parties of 13–16 submit a request awaiting manager approval.
4. Save **Copy private link** at confirmation. Open that link in another browser to see the same database booking. Refreshing the original tab also restores its hold or confirmation.
5. In **My booking**, change the date, party, or table, or cancel after confirming the dialog. The original reservation stays reserved until a replacement is saved. Online changes and cancellation close two hours before the booking.

Treat the private link like a password: anyone with it can manage that booking until it expires. The reference code alone cannot open guest details. There is no guest account requirement. Staff handle manager approval, seating, no-shows, and waitlist offers in the live admin workspace. Email/SMS are simulated, so save the private link yourself; no real notification will arrive.

The menu is a read-only catalog in this phase. Ordering and kitchen tickets arrive in Phase 6. All fonts, scripts, and styles are served locally.

## Activate the first admin and try the staff workflow

Run this from the repository folder in your own Ubuntu terminal:

```bash
docker compose exec app php bin/invite-staff.php marvin@lumina.test Marvin admin
```

The command prints a private activation link valid for 24 hours. Open it, choose your own password (15–72 bytes; ordinary English characters use one byte each), and keep the link private. No email is sent. `marvin@lumina.test` is a local demo sign-in name, not a mailbox. The app password is separate from your Ubuntu, Docker, or GitHub password. There is no preset staff password. Reissuing an invitation invalidates older unused links; the command rejects accounts already active.

1. Open [Staff sign-in](http://localhost:8080/staff/login), then the [admin workspace](http://localhost:8080/admin).
2. Select a service date and inspect real reservations and floor availability. Create a phone booking or walk-in using the actual available tables.
3. Open a reservation to review its details and history. Admin/manager can approve a pending request. Host, manager, and admin can seat a confirmed party within its seating window, record a no-show after the grace period, or cancel with a reason.
4. Seating creates one open order. Completion releases the tables with a reset buffer; in P5, an empty order is voided rather than marked paid. Food ordering follows in P6.
5. Add a waitlist party or recheck the queue. An offer reserves every physical member for ten minutes before a simulated notification is recorded. The host accepts the offer when the guest agrees; there is no public guest claim page yet.
6. Admin/manager can review settings, blackouts, audit records, and the simulated outbox. Admin can invite staff and change roles; sign out and back in if account management asks for recent sign-in.

Roles are enforced by the server. Host cannot approve requests, change settings, or manage staff. Manager cannot change global rules or staff accounts. Server/kitchen profiles have no host/admin access until P6 adds their workspaces. See [the staff API and security guide](docs/staff-api.md).

The Compose app, MySQL, and Adminer ports bind to `127.0.0.1` by default, making this a local laptop setup. HTTPS hosting and deployment review belong to P7. Do not expose this local HTTP stack to a network for real staff use.

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
public/      front controller, assets, uploads
src/         Core, Controller, Domain, Repository, Service, View
config/      app, database, routes
database/    schema, reference data, demo seed
bin/         seeding, demo reset, tests, smoke checks
docs/        ER diagram, architecture diagram, API reference
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
- [`docs/booking-api.md`](docs/booking-api.md) - live booking API, transaction safety, and isolated tests
- [`docs/staff-api.md`](docs/staff-api.md) - staff activation, permissions, host workflow, settings, and isolated verification
- [`research/01_reference_repos.md`](research/01_reference_repos.md) - open-source references and anti-patterns
- [`research/02_booking_engine.md`](research/02_booking_engine.md) - schema DDL, availability SQL, concurrency, state machine
- [`research/03_ux_flows.md`](research/03_ux_flows.md) - guest flow, floor plan picker, accessibility
- [`research/04_ui_effects.md`](research/04_ui_effects.md) - design tokens, effects catalogue, library evaluation
- [`research/05_dashboards_kds.md`](research/05_dashboards_kds.md) - kitchen display spec and realtime transport analysis
- [`research/06_stack_architecture.md`](research/06_stack_architecture.md) - directory layout, Docker, security, API surface, seed data

## Stack

PHP 8.3 - MySQL 8.4 - vanilla JavaScript - CSS - Docker Compose
