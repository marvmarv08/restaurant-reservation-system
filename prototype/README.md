# Prototype: clickable front-end simulation

A working, zero-dependency simulation of the system described in [`../PLAN.md`](../PLAN.md).
Open [`index.html`](index.html) in any modern browser. No server, no build step, no install.
Everything runs from generated sample data held in memory.

## What this is and is not

**Is:** the real UX, the real screens, the real availability maths, the real reservation state
machine, and a believable service full of sample data so every screen looks alive.

**Is not:** the production application. There is no PHP, no MySQL and no persistence here. Reloading
the page regenerates the service from a fixed seed. Email and SMS are written to a simulated outbox
and rendered on screen instead of being sent. The check-in QR is a deterministic placeholder
pattern, not a scannable payload.

## Screens

| Route | Screen |
|---|---|
| `#/home` | Landing page, the four room classes, live availability for tonight |
| `#/menu` | All 36 sample dishes, category and tag filters, instant search |
| `#/book` | The five-step reservation flow with real holds and a live countdown |
| `#/manage` | Self-service lookup by reference code, modify and cancel |
| `#/admin` | Service dashboard, host timeline, floor, reservations, waitlist, menu, settings, audit |
| `#/kitchen` | Kitchen display system with aging bands, all-day counts and recall |

## Things worth clicking

1. **Change the party size on the booking screen.** Availability, room options and the floor plan
   all recompute. Room types disable themselves when the party falls outside their capacity.
2. **Reach step 3 and wait.** The table is held for a visible 90 seconds in the prototype
   (production is 10 minutes), the bar turns amber then red, and the slot is released on expiry.
3. **Book something impossible.** Pick a party of 14, or a date with a blackout. The no-availability
   cascade walks nearest times, then other rooms, then nearest dates, then the waitlist. It never
   shows an empty state.
4. **Open `#/admin`, find the next arrival and press Seat.** Then open `#/kitchen`. The ticket is
   there. That chain is the single best demo moment in the whole project.
5. **On the kitchen screen press "Age all tickets 4 minutes"** a few times and watch the aging bands
   escalate through WORKING, LATE and CRITICAL.
6. **Switch the role in the admin top bar to Mika (host) or Paolo (kitchen).** Navigation items
   disappear, because role based access is enforced rather than decorative.
7. **Cancel a booking in `#/manage`.** It names the actual waitlist entry that would be promoted.

## Sample data

Generated in [`assets/js/data.js`](assets/js/data.js) from a fixed seed, relative to today's date:

- 4 room classes (VIP suites, main dining, group tables, terrace and bar) and 25 tables with
  floor-plan coordinates on a 1000 by 700 grid
- 36 menu items across 7 categories with prices, descriptions, kcal, stations and allergen tags
- Roughly 700 reservations spread across 21 days past, today and 30 days future, with status
  histories, occasions, allergies and requests
- A live kitchen service with tickets spanning every aging band
- 5 staff accounts, one per role, a ranked waitlist, and 3 blackout dates

The generator refuses to seed a double-book, which is why the validator can assert that no two
occupying reservations ever overlap on the same table.

## The booking engine is real

[`assets/js/data.js`](assets/js/data.js) implements the same logic the PHP service layer will:

- half-open interval overlap on `blocksUntil` (turn time plus a 15 minute reset)
- turn time looked up by party size
- capacity fit, then best-fit ranking so a 10 seat suite is never given to a party of 2
- table combinations attempted only when no single table fits
- holds with a real TTL that remove inventory from availability while active
- pacing caps per slot, and blackout dates scoped to the venue or to a room type

## Architecture of the prototype

```
index.html              shell: nav, footer, script order
assets/css/tokens.css   design tokens. every colour, space, radius and easing lives here
assets/css/base.css     resets, typography, reduced-motion, reveal
assets/css/components.css  buttons, cards, badges, forms, pills, tables, KPIs, modal, floor plan
assets/css/shell.css    nav, prototype banner, footer
assets/css/guest.css    hero, menu, booking flow, manage
assets/css/admin.css    app shell, host timeline, panels
assets/css/kitchen.css  KDS grid, ticket card, aging bands
assets/js/data.js       sample data generator plus the availability and hold engine
assets/js/util.js       DOM and formatting helpers
assets/js/floorplan.js  shared accessible inline-SVG floor plan renderer
assets/js/guest.js      guest screens
assets/js/admin.js      admin dashboard
assets/js/kitchen.js    kitchen display
assets/js/app.js        hash router and service clock
```

## Accessibility

Every floor-plan table is a focusable `role="button"` with an aria-label, and the booking flow ships
a parallel radio list of the same tables so the plan is an enhancement rather than a requirement.
Time slots are a real radio group. Modals trap focus and close on Escape. Kitchen aging is encoded
three ways at once (colour, border thickness and a written label) so it survives a colour-blind cook
and a washed-out projector. Animations are disabled under `prefers-reduced-motion`.

## Validation

[`../.svl/validate.js`](../.svl/validate.js) mounts every screen in a headless DOM and asserts:
no runtime errors, no empty UI elements, all 36 dishes rendered, 6 KPI tiles, the host timeline
present, every aging band visible, the floor plan fully labelled and focusable, every form control
labelled, every button named, balanced CSS braces, no raw hex outside the token file, no network
calls, and that the availability engine never returns a table that is actually busy.

```
cd .svl && npm install jsdom@24 && node validate.js
```

Current result: PASS, 0 warnings, across 216 availability queries.

## Known limits

- Fonts load from Google Fonts. Offline, the page falls back to Georgia and the system sans. The
  real build self-hosts woff2, as the plan requires.
- Food photography is replaced by deterministic CSS gradient plates.
- Dragging tables to edit the floor plan is deliberately shown as a labelled, inert control rather
  than faked.
- State lives in memory only. A refresh resets the service.
