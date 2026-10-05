# Restaurant Table Reservation System

Design and implementation plan for a full-stack restaurant table reservation platform, built with vanilla PHP 8, vanilla JavaScript, CSS and MySQL, orchestrated with Docker Compose.

This repository contains the **engineering plan**, the research that backs it, and a **clickable front-end prototype** that simulates every screen. Application code lands in the phases described below.

## See it running

Open [`prototype/index.html`](prototype/index.html) in a browser. No server, no build step, no install.
It simulates the guest booking flow, the interactive floor plan, the admin dashboard and the kitchen
display against generated reservations, 25 tables and 36 menu items. Its booking behavior is a
browser simulation; the PHP service layer and database still need to be built. See
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

Single `php:8.3-apache` container plus `mysql:8.4` with a healthcheck and auto-loaded init SQL, and Adminer for data inspection. Cold start is one command.

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
