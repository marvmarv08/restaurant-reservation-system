# 05 - Admin Dashboard + Kitchen Display System (KDS)

Project: table reservation system. Stack: vanilla PHP 8 + MySQL 8 + vanilla JS, Docker Compose. Judged on a live demo.

Legend: **DESIGN** = our proposal, not sourced. **NOT_FOUND** = could not verify from a source opened this session.
GitHub repo search was rate-limited mid-session (HTTP 403 "API rate limit exceeded"), so star counts and a broader OSS survey are **NOT_FOUND**; only repos whose README was fetched from raw.githubusercontent.com are cited.

---

## How real KDS work (researched)

### Vendor-verified feature set

| Capability | Verified wording | Source |
|---|---|---|
| Color-coded timers to spot on-time vs late orders | "Use color-coded timers to spot on-time and late orders fast" | https://www.freshkds.com/ |
| Cross off items **and modifiers** individually | "Cross off items and modifiers as you work" | https://www.freshkds.com/ |
| Recall of already-cleared (bumped) tickets | "Recall previously cleared tickets" | https://www.freshkds.com/ |
| Station routing / multi-station sync | "Get every station in sync - Flexible and seamless communication for multi-station kitchen workflows" | https://www.freshkds.com/ |
| All-day item counts | "Know how much to prep - See live item totals for all open orders, letting each station prep correct quantities quickly" | https://www.freshkds.com/ |
| Modifier emphasis via typography, not just text | "Customize modifiers on tickets with colors, bold, and italics to highlight key order details" | https://www.freshkds.com/ |
| Auto-sort by prep/pickup time + manual bump-to-front | "Orders are sorted by prep and pickup time"; "Move urgent or delayed orders forward" | https://www.freshkds.com/ |
| Expeditor ("pass") as a distinct screen mode | "Oversee order fulfillment and completion with Expeditor Mode"; "Send orders to the right prep stations" | https://squareup.com/us/en/point-of-sale/restaurants/kitchen-display-system |
| Configurable ticket layout, timers, notifications | "Customize ticket layouts, timers, and notifications to fit your kitchen's unique setup" | https://squareup.com/us/en/point-of-sale/restaurants/kitchen-display-system |
| Prep-time reporting out of the KDS | "reports that give you insights on prep times" | https://squareup.com/us/en/point-of-sale/restaurants/kitchen-display-system |
| Station types: pass / expedite / production / delivery | "Create pass, expedite, production and delivery stations in your kitchen" | https://www.lightspeedhq.com/pos/restaurant/kitchen-display-system/ |
| Item-level **and** ticket-level status updates | "Update statuses of dishes on item level or ticket level" | https://www.lightspeedhq.com/pos/restaurant/kitchen-display-system/ |
| Allergy / dietary surfacing is first-class | "Easily convey and display special requests or dietary restrictions" | https://www.lightspeedhq.com/pos/restaurant/kitchen-display-system/ |
| Live mid-order modifications and cancellations | "Immediately receive last-minute order modifications or cancellations on screen" | https://www.lightspeedhq.com/pos/restaurant/kitchen-display-system/ |
| Offline tolerance is expected | "Stay up-to-date and connected thanks to powerful offline mode" | https://www.lightspeedhq.com/pos/restaurant/kitchen-display-system/ |
| Touch-target quality is what cooks praise | "easy-to-tap tickets and instant order details" (customer quote) | https://squareup.com/us/en/point-of-sale/restaurants/kitchen-display-system |
| Runs on commodity tablets / any browser screen | "compatible with iOS, Android and any other hardware that supports web browsing" | https://www.lightspeedhq.com/pos/restaurant/kitchen-display-system/ |

Toast KDS pages (https://pos.toasttab.com/products/kitchen-display-system and the Toast Central KDS overview article) returned a JS/cookie wall with no readable body: **NOT_FOUND** for all Toast-specific claims.
ERPNext/Frappe restaurant KDS doc page returned an empty body: **NOT_FOUND**.
Hardware **bump-bar** key mappings, industry-standard aging thresholds in minutes, and course-firing timing rules were not stated numerically on any page opened: **NOT_FOUND**. Our numbers below are therefore DESIGN.

### Ticket card anatomy (synthesis of the verified features, **DESIGN** where numeric)

Top to bottom: ticket number, order type/source (dine-in / online / delivery), table + cover count, server name, elapsed timer, item lines with quantity, indented modifiers, allergy flags, action area. Fresh KDS and Lightspeed both treat the timer and the modifier/allergy block as the visual priority, not the item name.

### Grouping models seen in the market

- **By ticket (order)** is the default on all vendors opened: one card = one order.
- **By station** is a routing/filter layer on top of tickets (Square "send orders to the right prep stations"; Lightspeed pass/expedite/production/delivery). The grill screen sees only grill lines.
- **By course** is implied by the existence of a pass/expeditor station that assembles, but no opened source described course-fire logic: **NOT_FOUND**.
- **All-day view** is a separate aggregate: item totals across all open tickets (Fresh KDS).

### Bump-bar workflow and what a cook taps

Verified: tap items and modifiers to cross them off; tap to clear (bump) a ticket; recall a cleared ticket; promote an urgent ticket forward. Physical bump bars exist in the market but no opened source described the key layout: **NOT_FOUND**.

---

## Our kitchen dashboard spec

All **DESIGN**.

### Layout decision: dense ticket grid, not kanban

Column-per-status kanban loses at 3 metres: it halves usable card width and forces horizontal reading. Decision: **one dense grid of NEW + IN-PROGRESS tickets, oldest first, plus a narrow right rail for All-Day counts and Recall.** Status is encoded in border and header colour, never in column position.

- `grid-template-columns: repeat(auto-fill, minmax(360px, 1fr))`, `gap: 16px`. On 1920x1080 that is 5 columns x 2 rows = 10 visible tickets.
- Oldest ticket always sits top-left. Cooks learn one reading path.
- Right rail (fixed 280px): ALL DAY item totals, open ticket count, average age, Recall button.
- No scrolling in normal service: past 10 open tickets the grid densifies to `minmax(300px, 1fr)` and a "+N more" pill appears. Never silently hide a ticket.

### Ticket card fields

1. Header: `#T-0147` | `TABLE 12` | `4 PAX` | order-type chip (DINE-IN / TAKEAWAY).
2. Aging timer `08:42`, tabular-nums, the single largest element on the card.
3. Item lines `2x RIBEYE MEDIUM`; the quantity prefix is bolder and larger than the name.
4. Modifiers indented under their item in accent colour, prefixed `+` / `-` (`- no onion`, `+ extra sauce`).
5. Allergy block: full-width red-on-dark bar, uppercase, icon + text (`ALLERGY: SHELLFISH`), always rendered above the action area so it cannot scroll out of view.
6. Course tag per item (`STARTER` / `MAIN` / `DESSERT`) in a left gutter.
7. Station tag per item when the screen is in All-Stations mode.
8. Server name + seated time, smallest text on the card.
9. Action area: one full-width button labelled with the next state (`START`, then `READY`, then `BUMP`), plus a long-press target for Hold/Recall.

### Aging colour thresholds (exact, **DESIGN**)

Timer starts at `order.fired_at`. Per-ticket, configurable in Settings. Defaults:

| Age | State | Border / header | Behaviour |
|---|---|---|---|
| 0:00 - 4:59 | **ON TIME** | `#22c55e` green, 2px | normal |
| 5:00 - 9:59 | **WORKING** | `#eab308` amber, 3px (near-black timer text for contrast) | normal |
| 10:00 - 14:59 | **LATE** | `#f97316` orange, 4px | timer font +10%, ticket lifts in sort order |
| 15:00+ | **CRITICAL** | `#ef4444` red, 6px | 1Hz pulse on the border only (never the text), pinned top-left |

Colour is always paired with a text state label (`LATE`) so the display is not colour-blind dependent, and border thickness also encodes state so it survives a washed-out projector. Timers are computed **client-side** from a server-supplied `fired_at` plus a one-time clock-skew offset, so they keep ticking if the realtime channel drops.

### Cook state transitions

`QUEUED -> PREPARING -> READY -> SERVED(bumped)`, with `HELD` as a side state and `RECALLED` returning a bumped ticket to `PREPARING`.

- Tap an item line = toggle that line done (strike-through). Item-level, matching Lightspeed's item-level status.
- Tap the primary button = advance the whole ticket one state.
- All items done arms the button to `BUMP` but never auto-bumps. A human always bumps.
- Long-press 600ms on the header = Hold / Unhold.
- Recall drawer keeps the last 20 bumped tickets of the shift with bump timestamps; tapping one restores it to `PREPARING` with its original elapsed time.
- Every transition appends to `order_events` (ticket_id, from_state, to_state, actor, at), which is also the realtime feed and the prep-time dataset.

### Readability at 3 metres (wall screen / projector)

- Base 24px; item names 28px/700; quantity prefix 34px/800; aging timer 56px/800 with `font-variant-numeric: tabular-nums`; allergy bar 26px/800 uppercase, `letter-spacing: .04em`.
- Dark only: background `#0b0f14`, card `#151b23`, body text `#e6edf3`. Target >= 7:1 contrast for body text, >= 4.5:1 for all status text. Ratios are **DESIGN** targets; measure with a contrast checker before demo day.
- **No hover-dependent anything.** No tooltips, no hover reveals, no right-click menus, no "hover for full text" truncation. If a value matters it is printed on the card.
- Minimum touch target 64x64 CSS px; primary button full card width, 72px tall; >= 16px gap between tappable regions to prevent fat-finger mis-bumps.
- Destructive actions (bump, cancel) require all-items-done or a 600ms long-press.
- `user-select: none`, `touch-action: manipulation` (kills the 300ms double-tap zoom delay), `overscroll-behavior: none`.
- Keep the screen awake with the Screen Wake Lock API inside a silent try/catch. **NOT_FOUND** whether that API is available in the demo kiosk browser, so also ship a 30s no-op DOM mutation as a fallback.

### New-order alert

- Visual: card mounts with a 600ms scale-in from 0.96 plus a 2s white outline flash, and a 4s top banner `NEW ORDER - TABLE 12`. Under `prefers-reduced-motion`, swap the scale-in for an opacity fade.
- Audio: short two-tone chime from a WebAudio `OscillatorNode` so there is no asset file to lose on demo day, gated behind a one-time "TAP TO ENABLE SOUND" overlay because browsers block audio before a user gesture. That overlay is itself a usable demo beat.
- Escalation: while any CRITICAL ticket exists, repeat the chime once every 60s, max 5 times.

---

## Realtime transport decision (with code sketches)

### Options compared

| Option | Server cost | Latency | PHP-FPM risk | Proxy risk | Verdict |
|---|---|---|---|---|---|
| AJAX polling (2s) | one short request per client per tick | up to the interval | none, requests are milliseconds | none | **Primary. Boring, unkillable.** |
| Long polling (hold 20-30s) | one **occupied** FPM worker per client | near-instant | high: N clients = N busy workers | needs `proxy_read_timeout` raised | Avoid. |
| SSE / EventSource + PHP endpoint | one **occupied** FPM worker per connection lifetime | near-instant | high, same trap | needs buffering disabled everywhere | **Secondary, demoable, feature-flagged.** |
| WebSockets via Ratchet / Workerman | separate long-running PHP process outside FPM | lowest | none, bypasses FPM | needs Upgrade-aware proxy | Overkill; adds a process to supervise. |

### The PHP-FPM worker-exhaustion trap

PHP-FPM has a fixed pool (`pm.max_children`). An SSE or long-poll request occupies one child for the **entire life of the connection**, not for a few milliseconds. With a default pool of roughly 5-10 children, **five or six open kitchen/admin tabs can consume the whole pool and the rest of the site stops responding**, including the page the judges are looking at. This is the most likely way a live demo dies.

Aggravating factor, verified: "When **not used over HTTP/2**, SSE suffers from a limitation to the maximum number of open connections ... the limit is _per browser_ and is set to a very low number (6)", marked Won't Fix in Chrome and Firefox (https://developer.mozilla.org/en-US/docs/Web/API/EventSource and https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events). Over HTTP/2 the simultaneous-stream limit is negotiated, defaulting to 100 (same source).

Mitigations (**DESIGN**): cap every SSE connection at 30s and let `EventSource` auto-reconnect; raise `pm.max_children`; run SSE from a **separate FPM pool** so a saturated SSE pool cannot starve page requests; call `session_write_close()` immediately so the PHP session file lock does not serialise requests from the same browser.

### Buffering gotchas

- The endpoint must respond with MIME type `text/event-stream` (https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events).
- `flush()` "may not be able to override the buffering scheme of the web server and it has no effect on any client-side buffering in the browser" (https://www.php.net/manual/en/function.flush.php). Every layer must be defeated: PHP output buffering, the SAPI, the proxy, and any compressor.
- As of PHP 8.4.0, "Flushing headers without a body will now succeed in FastCGI" (changelog on the same page).
- Apache + mod_proxy_fcgi: a user-contributed note on that PHP page (author "fran at fran dot cr") states that since httpd 2.4.31 you can append `flushpackets=on` and `flushwait=n` (ms) to `<Proxy>`, `ProxyPass`, or `ProxyPassMatch`, and that the mod_proxy_fcgi 2.4 docs omit it while 2.5/trunk document it. Community-sourced, not official.
- Nginx: `proxy_buffering` is a real directive of `ngx_http_proxy_module` (https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_buffering); set it `off` for the SSE location, plus `fastcgi_buffering off` when proxying to FPM, `gzip off`, and a raised `fastcgi_read_timeout`. The `X-Accel-Buffering: no` response header is widely used for this but was **not** read from the nginx page opened this session: **NOT_FOUND**.
- Browser-side sniffing buffer: an older PHP manual note recommends padding output (`str_pad('', 4096)`) to force rendering, noting ~4KB is the minimum before Firefox flushes. For SSE, a ~2KB `:` comment line on connect does the same job.
- Disable `gzip` / `mod_deflate` for the stream location; a compressor will buffer an event stream.

### Decision (demo-first)

**Primary: 2-second AJAX polling with ETag/Last-Modified change detection. SSE is a progressive enhancement that upgrades automatically and degrades silently.**

Why: polling cannot exhaust the FPM pool, cannot be buffered by a proxy, survives a container restart, works through any network, and at 2s is visually indistinguishable from push on a stage. SSE supplies the sub-second moment, so we ship it behind a flag with a watchdog that falls back after two failed connects, and we rehearse with SSE forced OFF to prove the fallback is correct. Ratchet requires shell access with root recommended and WebSockets on 80/443 behind a reverse proxy (https://github.com/ratchetphp/Ratchet); Workerman requires a POSIX OS with the POSIX and PCNTL extensions (https://github.com/walkor/workerman). Both mean a second supervised process in Docker Compose for near-zero gain on a one-way kitchen feed.

### SSE endpoint sketch (PHP 8) - **DESIGN**

```php
<?php // public/api/stream.php
declare(strict_types=1);
require __DIR__ . '/../../src/bootstrap.php';

// Resume point: query param on first connect, Last-Event-ID header on reconnect.
$sinceId = (int)($_GET['last_id'] ?? ($_SERVER['HTTP_LAST_EVENT_ID'] ?? 0));
session_write_close();          // never hold the session lock on a long request

while (ob_get_level() > 0) { ob_end_flush(); }
ini_set('zlib.output_compression', '0');
ini_set('output_buffering', '0');
ini_set('implicit_flush', '1');
ob_implicit_flush(true);

header('Content-Type: text/event-stream; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Connection: keep-alive');
header('X-Accel-Buffering: no');   // nginx: do not buffer this response
header('Content-Encoding: none');  // discourage gzip middleboxes

ignore_user_abort(false);           // let PHP notice a vanished client
set_time_limit(0);

echo ': ' . str_repeat(' ', 2048) . "\n\n";   // pop the browser sniffing buffer
echo "retry: 3000\n\n";                        // client reconnect backoff
flush();

$deadline = time() + 30;   // HARD cap: frees the FPM worker; client auto-reconnects
$lastId   = $sinceId;

while (time() < $deadline) {
    if (connection_aborted()) { break; }

    // Cheap change probe: one indexed MAX() read, not a full re-query.
    $head = (int)$pdo->query('SELECT COALESCE(MAX(id),0) FROM order_events')->fetchColumn();

    if ($head > $lastId) {
        $stmt = $pdo->prepare('SELECT id, type, payload FROM order_events
                                WHERE id > :since ORDER BY id ASC LIMIT 200');
        $stmt->execute([':since' => $lastId]);
        foreach ($stmt as $row) {
            $lastId = (int)$row['id'];
            echo 'id: ' . $lastId . "\n";
            echo 'event: ' . $row['type'] . "\n";     // e.g. ticket.created
            echo 'data: ' . $row['payload'] . "\n\n"; // pre-serialised JSON, no raw newlines
        }
        flush();
    } else {
        echo ": ping\n\n";   // comment heartbeat keeps proxies and the TCP path alive
        flush();
    }
    usleep(800000);          // 0.8s DB probe, pushed to the client instantly
}
// Clean close; EventSource reconnects and replays from Last-Event-ID.
```

The `id:` field is what makes this reconnect-safe: the browser returns it as the `Last-Event-ID` header, so nothing is lost across the 30s recycle.

### Reconnect-safe client - **DESIGN**

```js
// public/assets/js/realtime.js
function Realtime({ sseUrl, pollUrl, onEvents, setBadge, flags }) {
  let lastId = Number(sessionStorage.getItem('rt_last_id') || 0);
  let es = null, pollTimer = null, failures = 0, mode = 'idle';

  const commit = (events) => {
    if (!events.length) return;
    lastId = Math.max(lastId, ...events.map(e => e.id));
    sessionStorage.setItem('rt_last_id', String(lastId));
    onEvents(events);
  };

  function startSse() {
    mode = 'sse';
    es = new EventSource(sseUrl + '?last_id=' + lastId);
    es.onopen = () => { failures = 0; setBadge('live'); };
    ['ticket.created', 'ticket.state', 'reservation.changed'].forEach(t =>
      es.addEventListener(t, (e) =>
        commit([{ id: Number(e.lastEventId), type: t, data: JSON.parse(e.data) }])));
    es.onerror = () => {
      // EventSource retries by itself; intervene only when it keeps failing.
      if (++failures >= 2) { es.close(); es = null; setBadge('polling'); startPolling(); }
    };
  }

  async function tick() {
    try {
      const r = await fetch(pollUrl + '?last_id=' + lastId, {
        headers: { 'If-None-Match': sessionStorage.getItem('rt_etag') || '' },
        cache: 'no-store',
      });
      if (r.status === 304) { setBadge(mode === 'poll' ? 'polling' : 'live'); return; }
      const etag = r.headers.get('ETag');
      if (etag) sessionStorage.setItem('rt_etag', etag);
      commit((await r.json()).events || []);
    } catch { setBadge('offline'); }
  }

  function startPolling(ms = 2000) {
    mode = 'poll';
    clearInterval(pollTimer);
    pollTimer = setInterval(tick, ms);
    tick();
  }

  const start = () => (('EventSource' in window) && flags.sse) ? startSse() : startPolling();

  // Do not burn a connection on a hidden tab; resync hard on return.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { es && es.close(); es = null; clearInterval(pollTimer); }
    else { failures = 0; start(); tick(); }
  });
  window.addEventListener('online',  () => { failures = 0; tick(); });
  window.addEventListener('offline', () => setBadge('offline'));

  return { start, mode: () => mode };
}
```

A visible `LIVE` / `POLLING` / `OFFLINE` badge is honest engineering and a demo talking point.

### Polling endpoint with cheap change detection - **DESIGN**

```php
<?php // public/api/events.php
require __DIR__ . '/../../src/bootstrap.php';
session_write_close();

$since = (int)($_GET['last_id'] ?? 0);

// One indexed row = the version of the world.
$row  = $pdo->query('SELECT COALESCE(MAX(id),0) AS head,
                            UNIX_TIMESTAMP(MAX(created_at)) AS ts FROM order_events')->fetch();
$etag = '"' . $row['head'] . '-' . (int)$row['ts'] . '"';

header('ETag: ' . $etag);
header('Last-Modified: ' . gmdate('D, d M Y H:i:s', (int)$row['ts']) . ' GMT');
header('Cache-Control: no-cache, must-revalidate');

if (trim($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag || (int)$row['head'] <= $since) {
    http_response_code(304);   // one indexed read, no JSON, no body
    exit;
}

$stmt = $pdo->prepare('SELECT id, ticket_id, type, payload FROM order_events
                        WHERE id > :s ORDER BY id ASC LIMIT 200');
$stmt->execute([':s' => $since]);
header('Content-Type: application/json');
echo json_encode(['head' => (int)$row['head'], 'events' => $stmt->fetchAll()], JSON_THROW_ON_ERROR);
```

The 304 path is the point: the steady-state cost of a connected dashboard is one primary-key `MAX()` read every 2 seconds. `order_events` is append-only with an auto-increment PK, so it is simultaneously the realtime feed, the audit trail for kitchen actions, and the prep-time dataset.

Docker note (**DESIGN**): `php:8-apache` and `nginx + php-fpm` behave differently for flushing. Pick the image early and test SSE in **that** image, not on host PHP.

---

## Admin dashboard spec

All **DESIGN**.

### Role model

| Role | Reservations | Floor plan | Kitchen | Menu | Tables/Rooms | Staff | Settings | Reports | Audit log |
|---|---|---|---|---|---|---|---|---|---|
| **owner** | full | full | view | full | full | full | full | full | full |
| **manager** | full | full | view | full | edit, no delete | edit, no role change | hours + turn times | full | view |
| **host** | create / seat / cancel / waitlist | full (seat, move party) | view | view | view | - | - | today only | - |
| **waiter** | own section: view, seat, mark served | own section | view | view | - | - | - | - | - |
| **kitchen** | - | - | **full (bump / recall / hold)** | view | - | - | - | own prep stats | - |

Implementation: one `users` table with a `role` enum plus a `can(string $permission)` helper backed by a static role-to-permission map in a single PHP file. No ACL tables; a judge can audit one map at a glance.

### KPI tiles

| Tile | Definition | Query shape |
|---|---|---|
| **Covers today** | `SUM(party_size)` where status in (seated, completed) for today | one indexed range scan on `reservations.start_at` |
| **Seated vs booked** | seated / confirmed today, shown as `34 / 52` with a progress bar | same scan, `COUNT(*) GROUP BY status` |
| **No-show rate** | no_show / (no_show + completed + seated), trailing 30d default | per-day status counts from a rollup table |
| **Occupancy %** | occupied seat-minutes / available seat-minutes in the current service window | precomputed per 15-min slot in `slot_stats` |
| **Average turn time** | `AVG(TIMESTAMPDIFF(MINUTE, seated_at, closed_at))` for today's completed, bucketed by party size | one scan of today's completed rows |
| **RevPASH** (revenue per available seat hour) | revenue in window / (seats x hours in window) | needs an order-total column; **NOT_FOUND** whether the current schema has one, confirm against `02_booking_engine.md` before building, and omit the tile rather than fake it |

Each tile: large tabular-nums value, delta vs the same weekday last week, and a 14-point inline SVG sparkline. Count-up animation over 600ms via `requestAnimationFrame` with `easeOutCubic`, on first paint and on any realtime change, suppressed under `prefers-reduced-motion`.

### Reservation management views

1. **Service view (today)** - the host timeline below. Default landing page for host and manager.
2. **Floor-plan live status** - the room to scale, each table coloured by state (free / booked-soon / seated / needs-bussing / overdue), with party name and a remaining-time ring on occupied tables. Tap a table to seat, move, merge, or bus.
3. **List view with filters** - date range, status, room, party size, channel (web / phone / walk-in), server, tag (birthday, VIP, allergy). Server-side pagination and URL-encoded filter state so a judge can be handed a link.
4. **Waitlist** - walk-in queue with quoted wait, actual wait, notify stub, and one-tap "seat from waitlist onto table X" reusing the same seat action as the floor plan.

### Menu CRUD

Categories (drag-to-reorder) -> items (name, description, price, allergens multi-select, **station routing**, **prep-time minutes**, course, active flag, image) -> modifier groups (single/multi select, min/max, price delta). Soft delete only (`archived_at`): deleting a menu item that appears on a historical ticket destroys reports. The station and prep-time fields are what make KDS routing and the aging thresholds meaningful.

### Tables and rooms CRUD, including moving tables on the floor plan

Rooms: name, background (grid or uploaded image), `width`/`height` in abstract units. Tables: `room_id`, `x`, `y`, `rotation`, `shape` (round / square / rect / booth), `seats_min`, `seats_max`, `combinable_with` (self-referencing many-to-many for joining tables). Edit mode enables pointer-event drag with 8-unit snap, alignment guides, and persistence on drop via a single `PATCH /api/tables/{id}` carrying x/y/rotation. Arrow keys nudge by 1 unit for keyboard accessibility. An in-memory undo stack (last 20 moves) because judges will drag something by accident.

### Staff management

Invite by email, assign role, assign default section (a set of tables), activate/deactivate, force password reset. Never hard-delete staff; deactivate, so audit rows keep a valid actor.

### Settings

Service hours per weekday with multiple windows (lunch / dinner) plus date overrides (holidays, private events); turn times per party-size bucket (1-2 pax 60min, 3-4 pax 90min, 5+ 120min as defaults); buffer between seatings; pacing cap (max covers per 15-min slot); online-booking lead time and max advance days; no-show grace minutes; **KDS aging thresholds** (the four numbers above, so the demo can change them live and the wall screen reacts).

### Audit log

Append-only `audit_log(id, actor_id, actor_role, action, entity_type, entity_id, before_json, after_json, ip, created_at)`, written inside the same transaction as the mutation. UI: filterable table with a diff viewer rendering changed keys only. Same append-only-table pattern as `order_events`.

---

## Host timeline view

### What the market and OSS do

- **gantt-schedule-timeline-calendar (GSTC)** markets this exact use case: "multiple items/tasks in one row - suitable for various applications like **booking, reservation**, resource manager", with "moveable / resizable items", "snap to specified time when resizing / moving", "gradual time zoom up to seconds", and usable "in react, vue, angular, svelte or any other projects" (https://github.com/neuronetio/gantt-schedule-timeline-calendar). **Licensing caution:** the README mentions an "offline license key (after purchase)", so free use in a competition entry cannot be assumed.
- **Frappe Gantt** is open source, used by ERPNext, initialised as `new Gantt("#gantt", tasks)` from a script tag or CDN, with configurable `bar_height`, `column_width`, `snap_at`, `upper_header_height`, day/hour/year views, and `infinite_padding` (https://github.com/frappe/gantt). Its model is tasks-over-days with dependencies and progress bars, not resource-rows x 15-minute-columns; retro-fitting it is more work than writing the grid.
- Broader survey of vanilla timeline/scheduler libraries blocked by the GitHub API rate limit: **NOT_FOUND**.

### Recommendation: hand-roll in CSS grid (**DESIGN**)

A reservation timeline is a two-axis grid with absolutely-positioned blocks: roughly 200 lines of vanilla JS, zero licence risk, zero bundle, full control over polish.

```
         11:00   11:30   12:00   12:30   13:00   13:30   14:00
T1 (2) |       |[ Reyes 2p ]    |       |[ Cruz 2p ]    |
T2 (4) |[ Santos 4p         ]   |       |       |[ Lim 4p       ]
T4 (6) |       |       |[ Dela Cruz 6p  ALLERGY ]|      |
```

- Outer grid `grid-template-columns: 140px 1fr`: a sticky row-header rail (`position: sticky; left: 0`) plus a horizontally scrollable track.
- Time axis: one column per 15 minutes. An 11:00-23:00 service is 48 columns: `grid-template-columns: repeat(48, var(--slot-w))` with `--slot-w: 48px` = 2304px wide. **Zoom is a single custom-property change**, nothing else recalculates.
- Each table is one `.tl-row` with `position: relative`; reservation blocks inside are `position: absolute; left: calc(var(--start-slot) * var(--slot-w)); width: calc(var(--span) * var(--slot-w));`. Two custom properties per block are the whole layout engine.
- `--start-slot` and `--span` are computed in PHP from `start_at` and the turn time and emitted as inline style props, so the timeline renders correctly with JS disabled: a real robustness claim.
- "Now" line: a 2px absolutely-positioned element at `left: calc(minutesSinceOpen / 15 * var(--slot-w))`, nudged once a minute by `setInterval`. Past columns are dimmed by an overlay sized the same way.
- Blocks carry status colour (confirmed / seated / late / no-show / walk-in) plus name, party size, and allergy/VIP chips. Overlapping blocks on one table (double-book) stack into two lanes, the row grows, and a red conflict outline appears.

### Drag and drop, vanilla Pointer Events

- `pointerdown`: `setPointerCapture`, record `startX`, the block's current slot, and the source row.
- `pointermove`: move with `transform: translateX()` only (no layout thrash); snap the preview to the nearest 15-min slot. Hovering another row highlights it as the drop target and validates capacity live (`party_size <= seats_max`); invalid targets turn red and refuse.
- `pointerup`: compute the new `table_id` and `start_at`, commit optimistically, then `PATCH /api/reservations/{id}`. On failure, animate back and toast the reason. Always re-validate server-side (capacity, overlap, service hours); never trust the client's drop.
- Resize: two 12px edge handles change `--span`, i.e. the turn time, with the same snap.
- Touch: `touch-action: none` on blocks so the browser does not steal the gesture; 400ms long-press arms the drag so a scroll cannot move a booking by accident.
- Keyboard: focus a block, arrows move one slot, shift+arrows change duration. The view is not mouse-only.

Realtime: the timeline subscribes to the same event stream. A new booking inserts a block with a 400ms highlight; another host's drag moves the block under you.

---

## Charts and reporting

### Library evaluation

| Option | Evidence | Fit |
|---|---|---|
| **Chart.js** | "Simple yet flexible JavaScript charting for designers & developers", MIT licence, CDN-installable (https://github.com/chartjs/Chart.js) | **Chosen.** Canvas, one file, MIT, easy to theme, fine at our data sizes. |
| **ApexCharts** | "18+ chart types", "Zero runtime dependencies: no React/Vue/D3 required; works in any framework or vanilla JS", tree-shakable, but "Free for most users: see License" (https://github.com/apexcharts/apexcharts.js) | Prettier defaults and better animations; the licence must be read before a competition submission. Second choice, heavier. |
| Hand-rolled SVG | - | Keep for what Chart.js is bad at: the floor plan and the timeline (already hand-rolled) plus the KPI sparklines, which are an eight-line `<polyline points="...">` generated in PHP with no library. |

Decision (**DESIGN**): Chart.js from CDN **with a vendored local copy committed** as a fallback, because demo-day wifi is a known failure mode, plus inline SVG sparklines in the KPI tiles.

### Charts to build

1. **Covers by hour** (bar) - today vs the same weekday last week. Answers "when is the rush".
2. **Occupancy % by 15-min slot** (area) - with the pacing cap drawn as a dashed line.
3. **Reservation status mix** (stacked bar by day, 30d) - completed / no-show / cancelled / walk-in.
4. **Average turn time by party size** (horizontal bar) - feeds the turn-time settings.
5. **Kitchen prep-time distribution** (histogram) plus **p50/p90 ticket age by hour** (line) - straight from `order_events`, which proves the KDS data is real.
6. **Channel mix** (donut) - web / phone / walk-in.
7. **Top menu items, all day** (horizontal bar) - shares its query with the KDS All-Day rail.
8. **RevPASH by service** (line) - only if an order-total column exists; otherwise omit (**NOT_FOUND**, see the KPI table).

### Keeping queries cheap

- **Rollup tables**: `daily_stats(date, covers, reservations, no_shows, cancellations, walk_ins, avg_turn_min, revenue)` and `slot_stats(date, slot_start, seats_occupied, seats_available)`. Every historical chart reads a rollup, never raw `reservations`. Built by a cron/one-shot PHP script, with a "Rebuild stats" admin button so data is never stale on stage.
- Today's numbers come from one query per tile **group**, not per tile: a single `GROUP BY status` result hydrates covers, seated-vs-booked, and status mix.
- Indexes: `reservations(start_at, status)`, `reservations(table_id, start_at)`, `order_events` PK on `id` plus `(ticket_id, id)`, `orders(created_at)`.
- Cache the whole KPI payload in APCu or one `cache` row with a 30s TTL keyed by date + filters, and let the realtime layer invalidate it on relevant events so tiles still feel live.
- Report endpoints are `/api/reports/{name}?from=&to=` returning pre-aggregated arrays. Never ship raw rows and aggregate in JS.
- Hard-cap every series at 400 points; downsample server-side by widening the bucket.

---

## Cross-dashboard demo moments

All **DESIGN**. Each beat is 10-20 seconds and legible from the back of the room.

1. **Booking lands live.** A judge books on the public site from their own phone. On the projected host timeline a block slides into the 19:30 column on T4 with a highlight pulse, `Covers today` counts up, and the floor-plan table flips to booked-soon amber. Nobody pressed refresh.
2. **Host seats the party, a ticket materialises in the kitchen.** Host taps the block, taps `SEAT`, adds two items. The second screen plays the chime, the ticket scale-ins top-left, the timer starts ticking from 00:00. Target latency: under 2s on polling, under 500ms on SSE.
3. **Drag a booking.** Drag the 20:00 Santos block from T2 to T5 and stretch it 30 minutes: it snaps, validates capacity live, persists, floor plan updates. Then drop it on a 2-seat table and let it refuse, showing the server-side guard.
4. **Aging colours on a real timer.** Pre-seed one ticket at 14:50 elapsed so it rolls into CRITICAL mid-pitch: border goes red and thick, it pins top-left, the escalation chime fires once. The SLA model is demonstrated, not described.
5. **Kitchen bumps, the floor flips.** Cook strikes items off one by one, the primary button arms to `BUMP`, cook bumps. The admin floor plan flips T4 to needs-bussing, `Average turn time` re-animates, and the prep-time histogram gains a bar.
6. **Recall.** "Chef, that went out wrong." Open the Recall drawer, tap the ticket just bumped, it returns to PREPARING with its original elapsed time. This is the moment that reads as "they talked to an actual kitchen".
7. **Thresholds are configurable.** In Settings change CRITICAL from 15 to 2 minutes, save, and the wall screen re-colours within one tick. Proves it is a system, not hardcoded demo data.
8. **Pull the plug.** Stop the SSE path (or toggle the flag off) on purpose. The badge flips `LIVE` to `POLLING`, everything keeps working, and the recovery is narrated as a design decision. The deliberate failure is the strongest technical moment available.
9. **All-day counts.** Three tables order the same dish; the All-Day rail ticks to `RIBEYE x7` and the Top-items chart reorders. Shows the aggregate view real cooks ask for.
10. **Audit log close.** Open the audit log and show every action from the last five minutes with before/after diffs and the actor's name. Ends on traceability.

### Demo-day failure insurance

- Rehearse with SSE disabled; polling must be the rehearsed path.
- Vendor Chart.js locally; assume no internet.
- Seed script producing a realistic day (reservations, one no-show, one walk-in, tickets pre-aged to 4:50 / 9:50 / 14:50) plus a one-tap "Reset demo data" button.
- Two windows on two displays, pre-logged-in as host and as kitchen, sound already past the autoplay gate.
- Fetch a clock-skew offset once per page load so timers are right even if the second machine's clock is off.
