# Restaurant Table Reservation System

Restaurant table reservation platform built with vanilla PHP 8.3, vanilla JavaScript, CSS, MySQL 8.4, and Docker Compose.

This repository contains the engineering plan, research, a clickable browser prototype, and the first PHP application foundation. The PHP page currently proves startup and database connectivity; reservation features are planned for later phases.

## Start the PHP application

You need Docker Desktop with WSL integration enabled if you use this repo from WSL. From the repository folder:

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
```

Open [http://localhost:8080](http://localhost:8080) for the PHP starter page. Open [http://localhost:8080/health](http://localhost:8080/health) to check the database connection; a working stack returns `{"ok":true,"db":true}`. Adminer is at [http://localhost:8081](http://localhost:8081); choose MySQL, server `db`, and the `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE` values from your local `.env`. The database is intentionally empty until P2 adds its schema and seed data.

After the containers are healthy, run `bash bin/smoke.sh` to check the page, CSS, database health, and basic route errors. If you changed `APP_PORT`, pass its URL, for example `bash bin/smoke.sh http://localhost:8090`.

The `.env.example` passwords are local demo placeholders. Edit them in your private `.env` before sharing a running stack; never commit `.env`. To stop containers while keeping database data, run `docker compose down`. If a port is already in use, change `APP_PORT`, `ADMINER_PORT`, or `DB_PORT_HOST` in `.env`, then run `docker compose up -d` again.

If `docker` is not found in WSL, start Docker Desktop in Windows and enable this WSL distribution under **Settings → Resources → WSL Integration**. Check again with `docker compose version`. If `/health` reports `{"ok":false,"db":false}`, inspect `docker compose ps` and `docker compose logs db app`.

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

Most reservation projects double-book under concurrency. This one is designed not to:

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

Single `php:8.3-apache` container plus `mysql:8.4` with a healthcheck and an init-SQL mount for P2, and Adminer for data inspection. After copying `.env.example`, start with one Compose command.

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
- [`research/01_reference_repos.md`](research/01_reference_repos.md) - open-source references and anti-patterns
- [`research/02_booking_engine.md`](research/02_booking_engine.md) - schema DDL, availability SQL, concurrency, state machine
- [`research/03_ux_flows.md`](research/03_ux_flows.md) - guest flow, floor plan picker, accessibility
- [`research/04_ui_effects.md`](research/04_ui_effects.md) - design tokens, effects catalogue, library evaluation
- [`research/05_dashboards_kds.md`](research/05_dashboards_kds.md) - kitchen display spec and realtime transport analysis
- [`research/06_stack_architecture.md`](research/06_stack_architecture.md) - directory layout, Docker, security, API surface, seed data

## Stack

PHP 8.3 - MySQL 8.4 - vanilla JavaScript - CSS - Docker Compose
