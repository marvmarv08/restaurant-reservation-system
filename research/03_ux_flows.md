# 03 - UX Flows, Floor Plan Picker, Rooms, Trust, Accessibility

Scope: guest-facing booking flow for a vanilla PHP + vanilla JS + CSS restaurant reservation site, judged by live demo.

## Evidence status (read first)

Verification was limited by the corporate TLS proxy and by bot protection on the vendor sites. What happened, per source:

| Source attempted | Result |
|---|---|
| https://www.opentable.com/ | 403 Forbidden (Akamai) via direct curl and via text-extraction proxy. NOT verifiable this session. |
| https://support.opentable.com/s/article/How-do-I-make-a-reservation-on-OpenTable | Returned only Salesforce/cookie-consent shell, no article body. NOT_FOUND. |
| https://resy.com/ | Returned JS-shell only ("Resy uses the latest technology...") . NOT_FOUND. |
| https://help.resy.com/... | Domain could not be resolved through proxy. NOT_FOUND. |
| https://www.exploretock.com/ | Cloudflare interstitial "Enable JavaScript and cookies to continue". NOT_FOUND. |
| https://help.exploretock.com/hc/en-us | Reachable; only Zendesk category index retrieved (Reservation Management, Settings and Customization, Event Management, Reporting and Insights, To Go Management, Account and Billing, Guest and Marketing Management, Holiday, Training Resources). Guest-side step list NOT_FOUND. |
| https://www.sevenrooms.com/en/products/reservations/ and /blog/ | 404 / cookie-vendor shell. NOT_FOUND. |
| https://www.yelp-support.com/... | TLS interception error (IncompleteCertChain) through Netskope. NOT_FOUND. |
| https://developers.google.com/actions-center/verticals/reservations/dining/e2e/overview and .../waitlists/e2e/overview | Reachable but renders an integration chooser, not the schema body. Confirms Google Actions Center has distinct "Dining Reservations" and "Waitlists" integrations ("Enable restaurant reservations and waitlists"). Field-level schema NOT_FOUND. |
| https://en.wikipedia.org/wiki/Table_reservation | Verified. |
| https://en.wikipedia.org/wiki/OpenTable , https://en.wikipedia.org/wiki/Resy | Verified (company facts only, not UI flows). |
| https://www.w3.org/TR/WCAG22/ | Verified, quoted below. |
| https://raw.githubusercontent.com/w3c/aria-practices/main/content/patterns/dialog-modal/dialog-modal-pattern.html | Verified, quoted below. |
| https://raw.githubusercontent.com/w3c/aria-practices/main/content/patterns/radio/radio-group-pattern.html | Verified, quoted below. |
| https://www.nngroup.com/articles/modal-nonmodal-dialog/ , https://baymard.com/blog/date-input-fields , https://www.smashingmagazine.com/2017/07/designing-perfect-date-time-picker/ | Titles resolved; article bodies blocked or paywalled. Body claims NOT_FOUND. |

Consequence: every competitor step-order claim below is labeled either VERIFIED, UNVERIFIED (reconstructed from product-surface knowledge, not re-opened this session), or NOT_FOUND. Do not quote the UNVERIFIED rows as sourced facts in the final report.

## Competitor flow comparison table

Legend: VERIFIED = re-read from a source this session. UNVERIFIED = reconstruction, no source retrieved this session. NOT_FOUND = could not establish.

| Dimension | OpenTable | Resy | Tock | SevenRooms | Yelp Reservations |
|---|---|---|---|---|---|
| Source retrieved this session | No (403) | No (JS shell) | Partial (help center index only) | No (404) | No (TLS block) |
| Entry widget fields and order | UNVERIFIED: party size, date, time, then "Find a Time" | UNVERIFIED: party size, date, time | UNVERIFIED: party size, date, then experience/menu selection | UNVERIFIED: party size, date, time on embedded widget | NOT_FOUND |
| Steps to confirm | UNVERIFIED: 3 screens (search, slot grid, guest details) | UNVERIFIED: 3 screens incl. a hold timer | UNVERIFIED: 4 screens because of prepaid/ticketed events and checkout | UNVERIFIED: 2-3 screens, operator-configurable | NOT_FOUND |
| Availability presentation | UNVERIFIED: horizontal time pills around requested time | UNVERIFIED: time pills grouped by seating area/type | UNVERIFIED: list of named experiences with times and price | UNVERIFIED: pills plus operator-defined seating areas | NOT_FOUND |
| No-availability handling | UNVERIFIED: nearest alternative times, other dates, nearby restaurants, notify/waitlist | UNVERIFIED: "Notify" list for a target date/time window | UNVERIFIED: waitlist/notify plus other experiences | UNVERIFIED: waitlist, configurable | NOT_FOUND |
| Deferred-to-later data | UNVERIFIED: occasion and special request on the guest-details step, not before slot selection | UNVERIFIED: notes field at details step | UNVERIFIED: dietary/allergy notes at checkout | UNVERIFIED: operator-configured custom fields at details step | NOT_FOUND |
| Hold timer on a chosen slot | UNVERIFIED (Resy and Tock commonly show one) | UNVERIFIED | UNVERIFIED | NOT_FOUND | NOT_FOUND |
| Confirmation | UNVERIFIED: in-page confirmation + email, add-to-calendar, modify/cancel link | UNVERIFIED: in-app + email | UNVERIFIED: email receipt incl. prepayment | NOT_FOUND | NOT_FOUND |
| Guest picks a specific table | UNVERIFIED: no, table assignment is operator-side; seating "area" can be selectable | UNVERIFIED: area/type, not table | UNVERIFIED: experience/area, not table | UNVERIFIED: area, not table; operator floor plan is staff-side | NOT_FOUND |
| Account required | UNVERIFIED: account or guest checkout | UNVERIFIED: account required | UNVERIFIED: account/email | NOT_FOUND | NOT_FOUND |
| Verified background facts | OpenTable founded 1998-07-02, San Francisco, subsidiary of Booking Holdings (https://en.wikipedia.org/wiki/OpenTable) | Resy founded 2014, acquired by American Express 2019, UK ops closed 2024 (https://en.wikipedia.org/wiki/Resy) | Help center structure above (https://help.exploretock.com/hc/en-us) | NOT_FOUND | NOT_FOUND |

Verified, source-backed flow context that still constrains design:
- Online systems replaced pencil-and-notebook booking; many venues only reserve for larger parties ("Some will only reserve for large parties of six or more"), and late reservations risk backlog waits (https://en.wikipedia.org/wiki/Table_reservation). DESIGN implication: party size is the first-class variable and the system must express a per-party-size policy, and must set honest expectations for late slots.
- Google's Actions Center treats "Dining Reservations" and "Waitlists" as two separate integrations for the same restaurant (https://developers.google.com/actions-center/verticals/reservations/dining/e2e/overview). DESIGN implication: model the waitlist as a first-class sibling of a reservation, not an error state.

Competitor convergence that is widely observable but NOT verifiable this session (treat as UNVERIFIED): all five lead with party size + date + time, show availability as tappable time pills rather than a raw calendar, keep the guest out of table-level selection, and defer occasion/allergy/notes until after a slot is secured.

## Recommended guest flow (screen by screen)

All of this section is DESIGN (our opinionated recommendation), grounded where noted.

### Principle: party size first, then date, then time

DESIGN decision: **party size first**.
1. Party size is the only input that changes the *shape* of inventory. A 2-top, a 6-top and a 10-top are different table sets and different rooms (group room, private dining). Date-first forces a re-query and often a dead end.
2. Verified policy evidence: venues commonly gate reservations by party size ("Some will only reserve for large parties of six or more", https://en.wikipedia.org/wiki/Table_reservation). Party-size-first lets us branch to "9+ is a group enquiry" before the guest invests effort.
3. It enables the strongest demo moment: changing party size live re-renders both the time pills and the floor plan.
Counter-case: for an occasion booking the date is the fixed constraint. Mitigation: all three controls sit in one persistent search bar, so order is an emphasis, not a wall.

### Screen 1 - Landing / search bar (not a modal)
1. **Party size** - select, 1..8 plus "9+ (group enquiry)". Default **2**.
2. **Date** - native `<input type="date">`, `min`=today, `max`=today+90d. Default **today**.
3. **Time** - select, 30-min steps across service hours. Default = next bookable slot rounded up to 30 min, at least 90 min from now; if service is over, tomorrow 19:00.
4. **Room preference** - optional, default "Any room", visually secondary.
5. Primary button **Find a table**.
No name, email, phone or occasion here. Every field asked before a table is known to exist is a drop-off point.

### Screen 2 - Availability
1. Query echoed as editable chips: "2 guests - Sat 14 Mar - 19:00 - Any room". Editing a chip re-queries in place (fetch to `availability.php`), no reload.
2. **Time pills** as a radio group, grouped by service period (Lunch / Dinner). The requested time is anchored centre of its row and labeled "closest to your time".
3. Pill secondary line only when meaningful: "VIP", "Terrace", "last table".
4. With "Any room", pills are grouped under room headers so the guest sees 19:00 exists in Common and Terrace but not VIP.
5. Truthful scarcity line under a room header only: "2 of 3 VIP rooms left for this date".

No-availability handling, in this priority order:
a. Nearest times, same day, same room (plus/minus 2h, max 6 suggestions).
b. Same time, other rooms ("19:00 is free on the Terrace").
c. Same time, nearest dates (next 7 days, 3 closest matches).
d. Join the waitlist for the exact requested slot (name + phone/email only).
e. Only if all four fail: plain "fully booked" with the group-enquiry link.
Never render an empty "no availability" screen. This is the most common failure in booking UIs and the cheapest place to beat competitors on demo day.

### Screen 3 - Table picker (optional, skippable)
- Opens after a time pill is chosen, and the server creates a `hold` row with a 10-minute expiry; a countdown is shown.
- Default state: the system already picked the best table. "We've held Table 12 by the window for you." Primary **Keep this table**, secondary **Choose a different table** (opens the floor plan).
- Rationale: no major competitor lets the guest pick a table (UNVERIFIED but consistent across all five), so offering it differentiates, but forcing it adds a step and risks bad self-selection. Pre-assign, then allow override.

### Screen 4 - Guest details
1. **Full name** - required.
2. **Mobile number** - required (reminder + waitlist notification channel).
3. **Email** - required (confirmation + manage link). If one must be cut, cut phone, not email.
4. **Occasion** - optional chips: Birthday, Anniversary, Business, Date night, Other. Default none.
5. **Allergies / dietary** - optional chips (Nut, Gluten, Shellfish, Dairy, Vegetarian, Vegan) plus free text.
6. **Special requests** - optional textarea, 300 chars, live counter.
7. Checkbox, unchecked by default: "Text me a reminder 2 hours before".
8. Cancellation policy as plain visible text above the button, not behind a link.
9. Primary button **Confirm reservation** (never "Submit").
Items 4-7 stay optional: they are operational nice-to-haves, and making them mandatory while a hold timer runs is how bookings get abandoned.

### Screen 5 - Confirmation
Order: status badge "Reservation confirmed"; short human reference (`R-7K42`); date, time, party size, room, table number; mini floor-plan thumbnail with the assigned table highlighted; **Add to calendar** (.ics download, no third party); **QR code** encoding the manage token for door check-in; **Modify** and **Cancel**; "A confirmation was sent to <email>"; directions, parking, dress code; cancellation deadline as an absolute time ("free until Sat 14 Mar, 17:00").

### Screen 6 - Self-service manage (token link, no account)
- `/manage.php?t=<64-hex random token>`, one token per reservation, not enumerable, same token inside the QR.
- Actions: change time (re-runs availability at the same party size), change party size (re-validates table fit, may re-assign), change table, cancel, add a note.
- After the cancellation deadline, Cancel becomes "Contact the restaurant" with a `tel:` link.
- DESIGN: no accounts anywhere in the guest flow. Account walls are pure friction for a one-off booking and they kill a live demo.

## Floor plan picker design

### Open-source landscape (all retrieved this session via the GitHub search API)

| Repo | Stars | Lang | Relevance |
|---|---|---|---|
| https://github.com/nicosandller/easy-floorplan | 609 | TypeScript | Interactive floorplan with drag-and-drop visual editor for walls, doors, furniture, text, devices. Best reference for editor UX. |
| https://github.com/KnotzerIO/indoor-wayfinder | 118 | TypeScript | Interactive **SVG** map with indoor wayfinding. Confirms SVG as the production choice for interactive maps. |
| https://github.com/Matysh/houseplan-card | 72 | JavaScript | Draw rooms in the browser, live per-room state colouring. Closest analogue to "table status colours". |
| https://github.com/Padraiggg/Padraigggs-ha-interactive-floorplan | 44 | JavaScript | Visual editor plus **polygon zones** clickable on a floorplan. |
| https://github.com/chr1st1ank/floorplan-card | 25 | JavaScript | A custom interactive **SVG** element, vanilla-ish, small enough to read end to end. |
| https://github.com/Stegocode/warehouse_layout_editor | 3 | JavaScript | Explicitly "Vanilla JS" 2D layout editor for zones/racks/paths. Direct precedent for our constraint. |
| https://github.com/lgrosales/seatmap | 8 | JavaScript | Seat map using SVG and Raphael.js. |
| https://github.com/ShadAhm/kerusiweb | 2 | TypeScript | Seat maps and availability as **accessible SVG** (explicitly accessibility-oriented). |
| https://github.com/haeflimi/seat_map | 1 | PHP | Concrete5 block: seatmap from an SVG vector graphic, users pick/reserve seats. PHP + SVG precedent. |
| https://github.com/spatialkit/spatial | 1 | TypeScript | Zero-dependency toolkit for interactive 2D editors: floor plans, seat maps, layouts. |
| https://github.com/xbow/seat-map , https://github.com/bensjones/seats | 0 | JS | Proof-of-concept SVG seat map renderers. |
| https://github.com/tastyigniter/TastyIgniter | - | PHP | PHP restaurant platform (surfaced under "restaurant reservation php"); reservation domain model reference only. |
Helper libraries verified this session: https://github.com/bumbu/svg-pan-zoom ("Simple pan/zoom solution for SVGs in HTML", works with inline SVG, exposes onPan/onZoom and on-screen zoom controls) and https://github.com/anvaka/panzoom ("Extensible, mobile friendly pan and zoom framework (supports DOM and SVG)", CDN build `panzoom.min.js`, `panstart`/`pan`/`panend`/`zoom` events, `dispose()`). Canvas alternative: https://github.com/fabricjs/fabric.js (canvas library with built-in scale/move/rotate/group and SVG/JSON i/o, but no DOM nodes so no native accessibility).
Note on GitHub search: the unauthenticated search API is rate limited to 10 requests/minute (observed `x-ratelimit-limit: 10`, HTTP 403 on exhaustion), and two queries ("restaurant reservation php", "seat selection booking javascript") returned empty after the limit reset, so that slice is incomplete.

### SVG vs Canvas vs positioned divs (DESIGN)

| Criterion | Inline SVG | Canvas 2D | Absolutely positioned divs |
|---|---|---|---|
| Hit testing | Free, per-element DOM events | Manual math or hit-region bookkeeping | Free |
| Non-rect table shapes (round 4-top, banquette, bar stool run) | Native `circle`/`rect`/`path` | Easy to draw, hard to hit-test | Fakeable only with border-radius |
| Keyboard focus and screen reader | `tabindex`, `role="button"`, `<title>` per table; precedent in kerusiweb "accessible SVG" | None without a parallel DOM list | Native |
| Styling table status from PHP-rendered classes | CSS classes on SVG nodes, CSS transitions | Redraw in JS only | CSS |
| Zoom/pan on mobile | Vector-crisp at any scale; svg-pan-zoom/panzoom both support SVG | Needs re-render per zoom step | Blurry/awkward transforms |
| Scale ceiling | Degrades past ~1-2k nodes | Best for thousands of seats | Worst |
| PHP server-side render | Trivial: echo SVG markup with data attributes | Impossible, data must be JSON | Possible but verbose |

**Recommendation (DESIGN): inline SVG, server-rendered by PHP, progressively enhanced with vanilla JS, with `svg-pan-zoom` (or `panzoom`) only on small viewports.** A restaurant has tens of tables, not thousands, so Canvas's only real advantage (node count) never applies, and SVG buys us free hit testing, free keyboard focus, CSS-driven status colours, and a no-JS fallback (the plan still renders and the radio list still works).

### Data model

```
rooms:  id, slug, name, type(vip|common|group|other), plan_w, plan_h,
        bg_image, min_party, max_party, min_spend, blurb, hero_img
tables: id, room_id, label, shape(rect|circle|oval|banquette),
        x, y, w, h, rotation, seats_min, seats_max, joinable(bool),
        features(csv: window|booth|quiet|wheelchair|near_bar), active(bool)
holds:  id, table_id, slot_start, slot_end, token, expires_at
bookings: id, table_id, slot_start, party_size, status, token, ...
```
- Coordinates are in a **virtual plan space** (e.g. 1000x700) and the SVG uses `viewBox="0 0 1000 700"` with `width="100%"`, so one dataset serves every screen size and no responsive math is needed.
- Status is computed per request, never stored on the table: `available` / `too_small` / `booked` / `held` / `inactive`.
- Status colours (DESIGN, each must also carry a non-colour cue for WCAG 1.4.1): available = accent fill + solid stroke; selected = accent fill + thick ring + check glyph; too small = 35% opacity + "2" seat count still legible; booked = muted grey fill + diagonal hatch `<pattern>`; held by someone else = grey + small clock glyph.

### Interaction design (DESIGN)
- Each table is `<g role="button" tabindex="0" aria-label="Table 12, round, seats 2 to 4, by the window, available">` with `aria-pressed` for selection; unavailable tables get `aria-disabled="true"` and `tabindex="-1"` so they are skipped, matching the "windows under a modal dialog are inert" idea of removing non-actionable stops.
- Hover/focus tooltip: table label, shape, capacity range ("seats 2-4"), features, and the reason it is unusable ("Booked 19:00-21:00" / "Too small for 4 guests"). Tooltip is a positioned div fed from `data-*` attributes, mirrored into an `aria-describedby` element so it is not hover-only (hover-only info fails WCAG 1.4.13).
- Click or Enter/Space selects; selection updates a visible summary line and the hidden `<input name="table_id">`.
- Unavailable tables are dimmed, not removed, and are non-clickable; clicking one shows an inline explanation plus "Show me times when Table 12 is free" (turns a dead end into a path, same philosophy as Screen 2).
- Keyboard: Tab enters the plan, then **arrow keys move between tables in reading order** (left-to-right, top-to-bottom by `y` then `x`), Home/End jump to first/last, Esc closes the picker and returns focus to the trigger. This is the roving-tabindex radio-group pattern: "Tab and Shift + Tab: Move focus into and out of the radio group... Right Arrow and Down Arrow: move focus to the next radio button in the group" (https://www.w3.org/WAI/ARIA/APG/patterns/radio/).
- Always ship a **parallel accessible list** of available tables (same radio group, same `name`) under a "List view" toggle. The floor plan is the delight layer; the list is the guarantee.
- Mobile: pinch-zoom and one-finger pan via svg-pan-zoom/panzoom, plus visible +/- buttons and a "Fit" button, because dragging must not be the only way to operate it (WCAG 2.5.7 Dragging Movements, https://www.w3.org/TR/WCAG22/). Minimum rendered table hit area 44x44 CSS px (see Accessibility).
- Live update: when party size changes, re-fetch and re-apply classes with a 200ms CSS transition so tables visibly fade in/out rather than snapping.

## Room type presentation

All DESIGN. Verified anchor: Google treats dining reservations and waitlists as separate integration types for one venue (https://developers.google.com/actions-center/verticals/reservations/dining/e2e/overview), and venues often restrict bookings by party size (https://en.wikipedia.org/wiki/Table_reservation). Both push toward rooms being explicit, policy-bearing objects rather than a cosmetic filter.

### Card anatomy (identical skeleton for all four, so differences read instantly)
Each room card carries, in fixed order: hero image (16:9, lazy-loaded) - room name - one-line positioning blurb - capacity range ("Seats 2-4") - price signal (minimum spend, per-head price, or "No minimum") - 1-3 badges - availability line for the current query - action button.

| Room | Blurb | Capacity | Price signal | Badges | Availability line |
|---|---|---|---|---|---|
| VIP | "Private corner, dedicated server, curated tasting menu." | 2-6 | Minimum spend | Dedicated server, Tasting menu, Quiet | "2 of 3 left tonight" when true |
| Common (Main dining) | "The heart of the room. Open kitchen view." | 1-4 | No minimum | Open kitchen, Walk-ins welcome | "14 times available" |
| Group | "Long table for celebrations, set menu for 8 or more." | 6-16 | Per-head set menu price | Set menu, Shared table, 48h notice | "Requires 48h notice" |
| Other - Terrace / Bar | "Open-air terrace / first-come bar counter." | 2-4 / 1-2 | No minimum | Outdoor, Weather-dependent / Walk-in only, Bar menu | "Weather dependent" / "Waitlist only" |

### Rules (DESIGN)
1. **Default is "Any room".** Forcing a room choice before the guest knows where availability exists is the same mistake as forcing a table choice.
2. **Rooms are never hidden, only annotated.** A room with no availability for the query stays visible, dimmed, with the reason and the single best alternative ("VIP is full at 19:00. Next free: 21:30"). Same pattern as dimmed tables.
3. **Party size filters rooms hard and visibly.** At party size 2 the Group room shows "For 6 or more guests" and is non-selectable; at 10 the VIP and Bar show "Up to 6" / "Up to 2". The filter animating live as the stepper moves is a demo moment.
4. **Price and policy before selection, never after.** Minimum spend, set-menu price and notice periods appear on the card, not at checkout. Late-revealed cost is the fastest way to lose both a guest and a judge.
5. **Cards link into the floor plan.** Clicking "View floor plan" on a card opens the picker scoped to that room, with a room tab strip at the top so the guest can compare without going back.
6. **Each room gets its own SVG plan**; one `rooms` row maps to one `viewBox`, so adding a fifth room is data, not code.

## Trust and microcopy

All DESIGN unless marked. Source context: late reservations genuinely carry backlog risk ("a restaurant may have a backlog that will require the reservation-holders to wait beyond their stated arrival time") and most restaurants do not charge no-shows (https://en.wikipedia.org/wiki/Table_reservation). So our copy should be honest about late slots and should ask for a courtesy cancel rather than threaten a fee.

### Hold timer
- Trigger: slot selected. Duration **10 minutes**, server-authoritative (`holds.expires_at`), client countdown only mirrors it.
- Copy: "Table 12 is held for you - 9:42 left". At 2:00: "Still there? Your table is held for 2 more minutes." On expiry: "Your hold expired, but 19:00 is still open - continue" and re-attempt the hold rather than dumping the guest back to search.
- Anti-pattern to avoid: a fake timer that never actually releases inventory. The demo should show the hold expiring and the slot returning to the pool in another browser window.

### Scarcity (only when literally true)
- Allowed: "2 of 3 VIP rooms left for tonight", "Last table at 19:00", "Booked 6 times today" (only if the count is real).
- Banned: "Only 1 left!" with no backing query, countdowns unrelated to inventory, fake "12 people viewing". Each scarcity string must be computed from the same query as the pills, and each should read as information, not pressure.

### Confirmation page content (checklist)
Reference code; date/time with day name; party size; room and table; mini plan thumbnail; what to do on arrival; cancellation deadline as an absolute time; Add to calendar (.ics); QR code; Modify / Cancel buttons; restaurant address with map link and phone; dress code and parking; "We'll text you a reminder at 17:00" only if the guest opted in.

### Email confirmation (plain-text-first, table-based HTML fallback)
Subject: `Confirmed: 2 guests, Sat 14 Mar 19:00 - [Restaurant]`. Pre-header: `Reference R-7K42 - Table 12, Terrace`.
Body order: confirmation line, the five facts (date, time, guests, room, table), Manage/Cancel token button, .ics attachment, address and phone, cancellation deadline, and the requests we recorded echoed back ("You told us: nut allergy, birthday") so the guest trusts the kitchen received it.

### SMS confirmation (160-char discipline)
Confirm: `[Restaurant]: confirmed Sat 14 Mar 19:00, 2 guests, Table 12. Manage: <short-url>`
Reminder (T-2h): `Tonight 19:00, 2 guests at [Restaurant]. Reply or tap to change: <short-url>`
Waitlist offer: `A table for 2 just opened at 19:30. It's yours for 10 min: <short-url>`

### Token link (no account) - security notes
64 hex chars from a CSPRNG, stored hashed, single reservation, no listing endpoint, rate-limited, and expiring 7 days after the visit. Mutating actions go through POST with a CSRF token. The QR encodes the same URL so the host can scan at the door.

### Add to calendar
Server-generated `.ics` (`BEGIN:VCALENDAR`, `SUMMARY`, `LOCATION`, `DESCRIPTION` with the reference code and manage URL, `VALARM` 2h before). No Google/Outlook redirect links, so it works offline during a demo.

## Accessibility and mobile

Verified requirements quoted from source:
- **Target size**: WCAG 2.2 SC 2.5.8 Target Size (Minimum) requires targets of at least "24 by 24 CSS pixels", with exceptions including Spacing ("Undersized targets... are positioned so that if a 24 CSS pixel diameter circle is centered on the bounding box of each, the circles do not intersect another target"), Equivalent, and Inline (https://www.w3.org/TR/WCAG22/). DESIGN: we use **44x44 CSS px** minimum for time pills, floor-plan tables, steppers and chips, which exceeds AA and matches platform touch guidance.
- **Dragging**: WCAG 2.2 lists SC 2.5.7 Dragging Movements (https://www.w3.org/TR/WCAG22/). DESIGN: pan/zoom must also be operable with +/-/Fit buttons and arrow keys.
- **Focus not obscured**: WCAG 2.2 lists SC 2.4.11 / 2.4.12 Focus Not Obscured (https://www.w3.org/TR/WCAG22/). DESIGN: the sticky bottom "Continue" bar must not cover the focused element; add scroll padding equal to the bar height.
- **Modal dialogs** (APG Dialog Modal pattern, https://www.w3.org/WAI/ARIA/APG/patterns/dialog-modal/): "Windows under a modal dialog are inert. That is, users cannot interact with content outside an active dialog window." "modal dialogs contain their tab sequence. That is, Tab and Shift + Tab do not move focus outside the dialog." "When a dialog opens, focus moves to an element inside the dialog... Generally, focus is initially set on the first focusable element." "Escape: Closes the dialog." And for content needing structure: "it is advisable to add tabindex=\"-1\" to a static element". DESIGN consequence for the table picker modal: `role="dialog" aria-modal="true"`, labelled by its heading, focus to the heading (`tabindex="-1"`) because the plan needs orientation before action, a JS focus trap, Esc to close, focus restored to the trigger, and `inert` (or `aria-hidden`) on the page behind.
- **Time pills as a radio group** (APG Radio Group, https://www.w3.org/WAI/ARIA/APG/patterns/radio/): "Tab and Shift + Tab: Move focus into and out of the radio group. When focus moves into a radio group: If a radio button is checked, focus is set on the checked button. If none of the radio buttons are checked, focus is set on the first radio button in the group. Space: checks the focused radio button... Right Arrow and Down Arrow: move focus to the next radio button in the group, uncheck the previously focused button, and check the newly focused button. If focus is on the last button, focus moves to the first button." DESIGN: implement pills as **real `<input type="radio">` with styled `<label>`** inside a `<fieldset>`/`<legend>`, which gives all of that behaviour for free and keeps the no-JS path working. Only fall back to `role="radiogroup"` + roving tabindex if the visual design makes native inputs impossible.
- **Live regions**: use `role="status"` (polite) for availability updates. Verified pattern: "because we've used role=\"status\" (aria-live=\"polite\"), something neat happens in supporting screen readers... polite live regions wait until the interface and the user have settled before making themselves known. Had I used role=\"alert\" (aria-live=\"assertive\"), the status message would override... the focus-invoked heading announcement" (https://inclusive-components.design/a-todo-list/). DESIGN: "14 tables available at 19:00" goes to `role="status"`; only hold-expiry goes to `role="alert"`.

### Native input vs custom picker (DESIGN)
- Use **native `<input type="date">`** for the date: free mobile wheel/calendar UI, free locale formatting, free keyboard support, zero JS weight. Trade-off: styling the native calendar popup is largely impossible and desktop Safari/Firefox rendering differs. Accept it. Build a custom APG-style date-picker dialog only if the demo needs the per-day availability heat map painted into the calendar grid, and even then keep the native input as the fallback input method.
- Never use three separate day/month/year selects, and never free-text time entry; **time is always pills** derived from real inventory so an unavailable time is simply not typeable.
- Party size is a **stepper with +/- buttons plus a native select**, not a spinner only; the select carries the 9+ branch.
- Other mobile specifics: 16px minimum font on inputs to stop iOS zoom-on-focus; `inputmode="tel"` and `autocomplete="tel"` on phone, `autocomplete="name"`/`"email"` on the others; sticky bottom action bar with safe-area insets; one column below 640px; floor plan collapsed to the list view by default on phones with "View floor plan" as an explicit opt-in; `prefers-reduced-motion` disabling the fade transitions; all status conveyed with shape/hatch/label as well as colour.

## Flow-level wow moments

All DESIGN, ordered by demo impact per unit of build effort.
1. **Live availability as party size changes.** Nudging the stepper from 2 to 6 re-renders time pills, dims the now-too-small tables on the plan, and flips the Group room card from "For 6 or more" to selectable, all in one 200ms transition with no page reload. This is the single clearest "this is a real product" signal and it directly justifies the party-size-first decision.
2. **Instant table assignment reveal.** On choosing a time, the plan zooms to the auto-assigned table, it pulses once, and the copy reads "We've held Table 12 by the window for you - 9:58 left". Shows inventory, intelligence and the hold in one beat. No competitor retrieved this session exposes table-level assignment to guests (UNVERIFIED), which is exactly why it reads as novel.
3. **The hold timer proven live.** Two browser windows side by side: window A holds 19:00, window B shows it greyed out; let A expire and B's slot returns. Judges almost never see concurrency demonstrated, and it proves the booking is race-safe.
4. **Walk-in waitlist with SMS-style notification.** Join the waitlist on a fully booked slot, cancel a different booking from the admin view, and the waitlist guest's screen receives the offer banner plus a simulated SMS toast with a 10-minute claim window. Google models waitlists as a first-class integration alongside reservations (https://developers.google.com/actions-center/verticals/reservations/dining/e2e/overview), so this is table stakes for the operators, yet almost never demoed.
5. **QR confirmation and door check-in.** The confirmation page renders a QR of the token link; scanning it with a phone on stage opens the live manage page and a host-side "Mark as arrived" flips the table to occupied on the floor plan in real time. Closes the loop from booking to seating in ten seconds.
Honourable mentions: no-availability recovery that always offers a next-best option (nearest time, other room, nearest date) so the demo can never hit a dead end; .ics download that drops a real calendar entry on the presenter's machine; dimmed-table click that answers "when IS Table 12 free?" instead of refusing.

## Open gaps
- Exact competitor step counts, field order, and hold-timer durations: **NOT_FOUND** this session (403/JS-wall/TLS-block, see Evidence status). If these are needed as sourced claims, re-run from an unproxied network or cite screenshots captured manually.
- Google Actions Center dining reservation and waitlist **field-level schemas**: NOT_FOUND (docs render an integration chooser).
- NN/g, Baymard and Smashing article bodies on date pickers and scarcity: NOT_FOUND (paywall/JS). Date-picker and scarcity recommendations above are DESIGN, grounded only in WCAG 2.2 and APG, which were verified.
- GitHub search coverage is partial: unauthenticated search is capped at 10 requests/minute and two queries returned empty after the cap.




