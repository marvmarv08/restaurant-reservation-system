# 01 - Reference Repositories (open-source restaurant reservation / POS)

Research date: data fetched live from GitHub REST API (`api.github.com/search/repositories`, `/repos/{owner}/{repo}/git/trees/HEAD?recursive=1`) and `raw.githubusercontent.com`. Every star count, file path and code excerpt below was read in this session. Anything not verified is marked `NOT_FOUND`.

Target stack for our build: vanilla PHP + vanilla JS + CSS/HTML + MySQL, Docker Compose, judged by live demo.

---

## Top references table

| Repo | Stars | Lang | Last update (API) | License | Covers | Verdict |
|---|---|---|---|---|---|---|
| [karanshukla/openresto](https://github.com/karanshukla/openresto) | 95 | TypeScript (+ C# backend) | 2026-10-03 | MIT | Reservations, slot generation, 5-min table holds, floor sections, table groups, cover pacing, multi-restaurant, admin dashboard, Docker Compose | **STEAL** (design, not code) - best availability engine found |
| [the-squad/smug-reservation-system](https://github.com/the-squad/smug-reservation-system) | 25 | PHP | 2025-10-08 | MIT | Reservations with duration, multi-table-per-reservation, x/y floor map, food menu, orders, roles, reports | **STEAL** - closest architectural match to our stack (vanilla PHP MVC + MySQL + x/y table map) |
| [tutorials24x7/restaurant-ordering-system-mysql](https://github.com/tutorials24x7/restaurant-ordering-system-mysql) | 6 | SQL | 2025-10-07 | MIT | Pure DB design: `booking`, `booking_item`, `table_top`, `order`, `order_item`, `menu`, `menu_item`, `recipe`, `transaction` | **STEAL** - clean normalized MySQL schema with real FKs and indexes |
| [NateWr/restaurant-reservations](https://github.com/NateWr/restaurant-reservations) | 71 | PHP | 2025-11-10 | none (GPL.txt in tree) | Booking form, open/closed schedule rules, exception dates, early/late booking windows, email notifications, admin bookings table | **STEAL** - best *rules engine* for "when can you book", production-hardened |
| [jairiidriss/restaurant-website-php-mysql](https://github.com/jairiidriss/restaurant-website-php-mysql) | 85 | PHP | 2026-07-24 | MIT | Public site, food ordering, table reservation, admin | **SKIM** - correct PDO prepared statements + transactions, but availability SQL is broken (whole-day granularity) |
| [pjborowiecki/SEAT-FRENZY-Restaurant-Table-Booking-System](https://github.com/pjborowiecki/SEAT-FRENZY-Restaurant-Table-Booking-System) | 49 | TypeScript | 2026-08-04 | MIT | Venues, tables, bookings, menus, cuisines, reviews, auth | **SKIM** - readable MySQL migration to copy field names from; booking logic itself thin |
| [slavyanHristov/restaurant-table-reservation-system](https://github.com/slavyanHristov/restaurant-table-reservation-system) | 35 | Vue + Node | 2026-09-21 | none | Reservations, tables, customers, availability search | **SKIM** - good layering (router/controller/service/DAO) worth mirroring in PHP |
| [DanMat/Restaurant-Management-System](https://github.com/DanMat/Restaurant-Management-System) | 43 | PHP | 2026-09-28 | none | Floor board, orders, kitchen display, payments, roles, reservations, reports, public ordering; live demo with role-picker login | **SKIM** - steal the *demo presentation strategy*, not the code (it is a CMS plugin now) |
| [tastyigniter/TastyIgniter](https://github.com/tastyigniter/TastyIgniter) | 3772 | PHP (Laravel) | 2026-10-03 | MIT | Online ordering + table reservation platform | **SKIM** - repo is a 92-file Laravel skeleton; reservation logic lives in external composer extensions, schema `NOT_FOUND` in this repo |
| [phojie/ordering-management-system](https://github.com/phojie/ordering-management-system) | 125 | PHP (Laravel) | 2026-08-11 | MIT | Ordering management | **IGNORE** - Laravel/Inertia, no reservation/floor-plan feature verified |
| [haxxorsid/food-ordering-system](https://github.com/haxxorsid/food-ordering-system) | 332 | PHP | 2026-07-17 | none | Orders, tickets, wallet, users. No reservation or table entity in `sql/food.sql` | **IGNORE** - no booking domain |
| [techadam/food-ordering-and-table-reservation-system-for-restaurants](https://github.com/techadam/food-ordering-and-table-reservation-system-for-restaurants) | 57 | PHP | 2026-04-27 | none | Order basket + a reservation form | **IGNORE** - reservation is a contact form, no table entity at all |
| [nya3ali/bookeat](https://github.com/nya3ali/bookeat) | 10 | PHP | 2026-05-15 | none | Multi-restaurant table booking, per-seat-count table lists | **IGNORE** (anti-pattern exhibit) |
| [SAL6910/Restaurant-Management-System-in-PHP](https://github.com/SAL6910/Restaurant-Management-System-in-PHP) | 43 | PHP | 2026-04-25 | none | Multi-restaurant ordering | **IGNORE** (anti-pattern exhibit - md5 passwords) |
| [bill-f/Restaurant-Reservation-System](https://github.com/bill-f/Restaurant-Reservation-System) | 3 | PHP | 2024-03-18 | none | Reservations, "tables per date" counter, schedule | **IGNORE** (anti-pattern exhibit - tables modelled as a daily integer) |
| [mwasikz/robo-cafe-rms](https://github.com/mwasikz/robo-cafe-rms) | 35 | PHP | 2026-09-17 | none | Food ordering + payment gateways; no table/reservation tables in `database/new-food-order.sql` | **IGNORE** - no booking domain |

Also surfaced by search but out of scope for a PHP/MySQL build (recorded so we do not re-search them): `evan361425/flutter-pos-system` (620, Dart), `emreeren/SambaPOS-3` (552, C#), `Alkaar/resy-booking-bot` (493, Scala), `ury-erp/ury` (379, TS/ERPNext), `amritmaurya1504/Restaurant_POS_System` (304, MERN), `BryanTheLai/RestaurantProject` (248, PHP, POS + website, no `.sql` file in tree - schema is `restaurantDB.txt`, not inspected: `NOT_FOUND`), `FreeOpenSourcePOS/FloCafe` (121, TS), `vanadiuz/table-reservation` (107, WordPress plugin).

---

## Deep dives

### 1. openresto - the availability engine to copy conceptually
https://github.com/karanshukla/openresto (95 stars, MIT, default branch `main`, 1434 files, updated 2026-10-03)

Backend is ASP.NET Core (`OpenRestoApi.Core`, `OpenRestoApi.Infrastructure`), frontend React Native Web, infra `docker-compose.yml` + nginx. We cannot reuse the code, but the algorithm is exactly the one we need.

Verified from [`OpenRestoApi.Core/Application/Services/AvailabilityService.cs`](https://github.com/karanshukla/openresto/blob/main/OpenRestoApi.Core/Application/Services/AvailabilityService.cs) (216 lines):

- **Slot loop**: `for (DateTime current = localStart; current < localEnd; current = current.AddMinutes(SlotInterval(restaurant)))` - slots are *generated* from open/close hours, not stored as rows. Interval is per-restaurant config, defaulting to 30 when the stored value is `<= 0` (explicit comment: "A zero or negative stored interval would spin the slot loop forever").
- **Overlap predicate** (the one piece of math that matters):
  `booking.Date < slotEndUtc && (booking.EndTime ?? booking.Date.AddMinutes(_defaultDurationMinutes)) > slotUtc`
  i.e. classic half-open interval overlap `startA < endB && endA > startB`, with a default duration fallback when `EndTime` is null.
- **Pre-indexing**: an inner `UnitReservations` class indexes the day's bookings by `TableId` / `TableGroupId` once "so each slot can be answered without rescanning them". With ~30 slots x N tables this is the difference between a snappy and a visibly laggy demo.
- **Table groups**: `IsGroupFree(...)` checks the group *and* every member table, and `group.HasWalkInOnlyMember()` excludes groups containing walk-in-only tables. This is how you support "join table 4+5 for a party of 8".
- **Capacity fit**: `restaurant.CanSeat(t.Seats, seats)` and `!t.WalkInOnly` filter candidate tables, so a party of 2 is not handed a 10-seater.
- **Holds**: `_holdService.IsTableHeld(tableId, slotUtc, durationMinutes)` is checked alongside reservations. README (verified) describes a 5-minute hold in a thread-safe in-memory `ConcurrentDictionary`, with a `holdId` that must be echoed back at booking time, auto-expiry, and atomic release when the customer changes selection.
- **Pacing**: `HasPacingRoom(...)` / `CoverPacing.Remaining(...)` rejects a slot if the party would push the restaurant over a covers cap for that slot. Real restaurants do this; no other repo in this list has it.
- **Pause**: `restaurant.IsPausedFor(slotUtc)` closes only the slots inside the pause window; later sittings stay bookable.
- **Timezone**: everything stored UTC, slots computed in the restaurant's IANA timezone (`TimeZoneInfo.ConvertTimeToUtc`).
- Closed slots are still returned as `ClosedSlot(current)` rather than omitted, so the UI can grey them out instead of silently hiding them.

Supporting files confirming the shape: `Application/Interfaces/IAvailabilityService.cs`, `IHoldService.cs`, `IHoldPolicyService.cs`, `Infrastructure/Holds/HoldService.cs`, migration `20260719220106_AddBookingSlotIntervalMinutes.cs`, and tests `Services/AvailabilityServiceTests.cs`, `Holds/HoldServiceTests.cs`, `Holds/FakeClock.cs` (a fake clock is how they test expiry deterministically).

Floor plan: README mentions **floor sections** (named groups like "Patio", "Bar", "Main") for organising seating. A drag-and-drop x/y floor map was **NOT_FOUND** in this repo.

### 2. the-squad/smug-reservation-system - closest match to our stack
https://github.com/the-squad/smug-reservation-system (25 stars, MIT, branch `master`, 113 files)

Hand-rolled vanilla PHP MVC: `app/core/App.php` (router), `app/core/Controller.php`, `app/Database.php`, `app/models/*.php`, `app/views/*`, `public/` as docroot. This is almost exactly the structure we should ship.

**Schema** ([`DATABASE.sql`](https://github.com/the-squad/smug-reservation-system/blob/master/DATABASE.sql), verified):

```sql
CREATE TABLE `reservations` (
  `id` int(11) NOT NULL, `user_id` int(11) DEFAULT NULL,
  `date` date NOT NULL, `time` time NOT NULL, `duration` int(11) DEFAULT '2'
);
CREATE TABLE `reservation_tables` (
  `reservation_id` int(11) DEFAULT NULL, `table_id` int(11) DEFAULT NULL
);
CREATE TABLE `table` (
  `id` int(11) NOT NULL, `table_number` int(11) NOT NULL,
  `chairs_number` int(11) NOT NULL, `x` float NOT NULL, `y` float NOT NULL
);
```

Three things here are genuinely right:
1. **`duration` on the reservation** (hours, default 2) instead of pretending a booking is an instant.
2. **`reservation_tables` many-to-many** - one reservation can occupy several tables. This is the correct model for combining tables; `bookings.tableId` (SEAT-FRENZY) cannot express it.
3. **`x`, `y` floats on the table** - the floor plan is data, not a picture.

Other tables: `food`, `food_catagories` (sic), `order`, `order_food`, `payment_details`, `payment_method`, `payment_options`, `payment_values`, `feedback`, `pictures`, `user`, `user_types`, `user_access`, `member_details`, `password_reset`, `tab`.

**Floor-plan UI** ([`app/views/home/elements/panes/tables-control.php`](https://github.com/the-squad/smug-reservation-system/blob/master/app/views/home/elements/panes/tables-control.php), verified) - the single best pattern to lift for our demo:

```php
<div class="tables-view" id="admin-view" onmousedown="div_mouse_down(this, event)">
  <?php foreach ($data['tables'] as $table): ?>
  <div id="tb<?=$table['id']?>" class="table-info existing-table"
       style="top: <?=$table['x']?>%; left: <?=$table['y']?>%;">
    <input type="radio" table-number="<?=$table['table_number']?>" name="table-icon[]"
           id="t<?=$table['id']?>" class="table-box"/>
    <label for="t<?=$table['id']?>"></label>
    <div class="info" for="t<?=$table['id']?>">
      <strong>Table <?=$table['table_number']?></strong><br/>
      <span><?=$table['chairs_number']?> Seats</span>
    </div>
  </div>
  <?php endforeach; ?>
</div>
```

Takeaways: percentage positioning (responsive floor plan for free), absolutely-positioned divs on a container with `onmousedown` for drag, and a hidden radio + `<label>` so table selection is a plain accessible form control that posts without JS. Admin buttons are Add / Update / Save / Delete Table. Note their own bug: the template writes `top: x%` and `left: y%`, swapping the axes, so our version should name the columns `pos_x`/`pos_y` and bind them to `left`/`top` respectively.

**Availability logic** ([`app/models/reservation.php`](https://github.com/the-squad/smug-reservation-system/blob/master/app/models/reservation.php) `checkReservation()`, verified) - correct idea, dangerous implementation. The overlap test in MySQL:

```sql
`reservations`.`date` = '$this->date'
AND ( `reservations`.`time` BETWEEN '$this->time' AND ADDTIME('$this->time', SEC_TO_TIME($this->duration*3600 - 60))
   OR '$this->time' BETWEEN `reservations`.`time` AND ADDTIME(`reservations`.`time`, SEC_TO_TIME(`reservations`.`duration`*3600 - 60)) )
```

The `- 60` is a hack to make `BETWEEN` (inclusive) behave half-open, so a 2h booking at 18:00 does not block 20:00. Adopt the *intent*, reject the implementation: use half-open comparison on real `DATETIME` columns instead (`start < :end AND end > :start`). `showReservations()` is a good reference for the list view: it joins `reservations -> reservation_tables -> table`, `SUM(tl.chairs_number)` and `GROUP_CONCAT(tl.id)` grouped by reservation id, so one row per booking carries its table set and total seats.

Security: **do not copy**. Every query interpolates `$_SESSION['id']` and `$this->date` directly into SQL, `app/Database.php` hardcodes `host=localhost, user=root, password=""`, and the `user` table has no password column at all (credentials presumably elsewhere - `NOT_FOUND`). See anti-patterns below.

### 3. tutorials24x7/restaurant-ordering-system-mysql - the schema reference
https://github.com/tutorials24x7/restaurant-ordering-system-mysql (6 stars, MIT, branch `master`, 6 files)

Pure database design: [`restaurant-ordering-system.sql`](https://github.com/tutorials24x7/restaurant-ordering-system-mysql/blob/master/restaurant-ordering-system.sql) plus a MySQL Workbench `.mwb` and an ERD PNG/SVG. Tables verified: `booking`, `booking_item`, `table_top`, `order`, `order_item`, `menu`, `menu_item`, `item`, `item_chef`, `ingredient`, `recipe`, `transaction`, `user`.

```sql
CREATE TABLE `table_top` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT, `code` varchar(100) NOT NULL,
  `status` smallint(6) NOT NULL DEFAULT '0', `capacity` smallint(6) NOT NULL DEFAULT '0',
  `createdAt` datetime NOT NULL, `updatedAt` datetime DEFAULT NULL, `content` text, PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `booking` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT, `tableId` bigint(20) NOT NULL, `userId` bigint(20) DEFAULT NULL,
  `token` varchar(100) NOT NULL, `status` smallint(6) NOT NULL DEFAULT '0',
  `firstName` varchar(50), `lastName` varchar(50), `mobile` varchar(15), `email` varchar(50),
  `line1` varchar(50), `city` varchar(50), `country` varchar(50),
  `createdAt` datetime NOT NULL, `updatedAt` datetime DEFAULT NULL, `content` text,
  PRIMARY KEY (`id`), KEY `idx_booking_table` (`tableId`), KEY `idx_booking_user` (`userId`),
  CONSTRAINT `fk_booking_table` FOREIGN KEY (`tableId`) REFERENCES `table_top` (`id`), ...
);
```

Worth adopting: `utf8mb4` everywhere, `ENGINE=InnoDB` with real named FKs and `ON DELETE RESTRICT`, explicit `idx_*` indexes on every FK column, `createdAt`/`updatedAt` on every table, a guest `token` so an un-registered customer can look up/cancel their own booking (`userId` nullable), and the name `table_top` which dodges the `table` reserved-word problem that forces smug to backtick `` `table` `` in every query.

Gap: **no reservation datetime and no duration on `booking`** (only `createdAt`), so it cannot answer "is table 5 free at 19:30". Use its conventions, not its booking columns.

### 4. NateWr/restaurant-reservations - the booking *rules* engine
https://github.com/NateWr/restaurant-reservations (71 stars, branch `master`, 172 files, `GPL.txt` in tree; API `license` field returned `none`)

A mature WordPress plugin (12 screenshots, 14+ translations, Grunt/webpack build). Ignore the WordPress plumbing (`CustomPostTypes.class.php`, bookings stored as a custom post type, so there is no clean MySQL schema to copy - `NOT_FOUND`). The value is [`includes/Booking.class.php`](https://github.com/NateWr/restaurant-reservations/blob/master/includes/Booking.class.php) `validate_submission()` (verified line numbers):

- `early-bookings` setting (L238-248): reject if `request > now + early_bookings*86400` - "bookings can not be made more than %s days in advance".
- `late-bookings` setting (L250-287): reject if `request < now + late_bookings*60`, with `same_day` as a special value and messages that switch unit between minutes / hours / days.
- `schedule-closed` exceptions (L288-320): per-date exception rules with optional `time.start` / `time.end`; an exception with no time closes the whole day, otherwise only that window. Exceptions are evaluated *before* the weekly rules and short-circuit them.
- `schedule-open` weekly rules (L323+): the normal open-hours ruleset, skipped when an exception is active.
- All rule checks are bypassed for `current_user_can('manage_bookings')` - staff can force-book outside opening hours. We need the same escape hatch for the admin demo.
- Validation collects into `$this->validation_errors` with per-field slugs (`field_has_error()`, `is_field_empty()`) rather than dying on the first error.
- `add_log($type, $title, $message, $datetime)` writes an audit trail on every booking.

Client side ([`assets/js/booking-form.js`](https://github.com/NateWr/restaurant-reservations/blob/master/assets/js/booking-form.js), verified): pickadate configured from a server-injected `rtb_pickadate` object carrying `date_format`, `time_format`, `time_interval`, `allow_past`, `first_day`, `early_bookings`, `late_bookings`, `disable_dates`, `schedule_closed`, `date_onload: 'soonest'`. The datepicker `max` is set from `early_bookings`, weekday disabling is normalised against `firstDay`, and the timepicker rules are reset (`set('disable', false)`) then re-applied every time the date changes. The submit button is disabled on submit to stop double-booking from a double-click (L35).

Key architectural lesson: **the same rule set is expressed twice, server-authoritative and client-convenience, from one config object.** That is how you get a fast UI without trusting it.

[`includes/Query.class.php`](https://github.com/NateWr/restaurant-reservations/blob/master/includes/Query.class.php) is a reusable query object with `date_range` shorthands `today` / `upcoming` / `dates` plus `start_date`/`end_date`. Note `upcoming` uses `'after' => '-1 hour'` so a booking that just passed is still shown to staff - a small detail that makes a host stand view usable.

### 5. jairiidriss/restaurant-website-php-mysql - correct PDO, wrong availability
https://github.com/jairiidriss/restaurant-website-php-mysql (85 stars, MIT, branch `master`, 391 files)

Flat vanilla PHP: `index.php`, `order_food.php`, `table-reservation.php`, `connect.php`, `admin/`, `Includes/`, and `restaurant_website.sql`.

What to copy, from [`table-reservation.php`](https://github.com/jairiidriss/restaurant-website-php-mysql/blob/master/table-reservation.php) (verified):
- PDO with `ATTR_ERRMODE => ERRMODE_EXCEPTION` in `connect.php`.
- A real transaction around the multi-table insert: `$con->beginTransaction(); ... $con->commit();` with `catch(Exception) { $con->rollBack(); }`.
- Prepared statements with positional params for both the `clients` and `reservations` inserts.
- A two-step UX worth mirroring: step 1 "Select Date & Time" + party size -> check availability; step 2 "Client details" with date/time/guests/table carried in hidden fields.
- `<input type="date" min="...+1day">` to block past dates at the widget level.

What is broken (deliberately documented so we do not repeat it):
- Availability query filters `date(r.selected_time) = ?` only. **Day granularity**: one booking at noon marks the table unavailable for the entire day.
- It takes `$rows = $stmt->fetch()` (one row) and then auto-assigns `$table_id = $rows['table_id']` - the customer never picks a table and party size never influences the choice, because `tables` is literally `CREATE TABLE tables (table_id int(3) NOT NULL)` with no capacity column and no primary key.
- `table_id` is then passed through a **hidden form field**, so a user can change it and book an occupied table. Re-validate server-side at insert time.
- Gets the new client id via `SELECT AUTO_INCREMENT FROM INFORMATION_SCHEMA.TABLES` *before* inserting, instead of `lastInsertId()`. Race condition under concurrency.
- `connect.php` hardcodes `user = 'root'`, empty password, database name also hardcoded inside a query string.
- `reservations` has useful soft-state flags though: `liberated tinyint(1)`, `canceled tinyint(1)`, `cancellation_reason varchar(255)`, `nbr_guests`, `selected_time datetime`, `date_created datetime`.

### 6. SEAT-FRENZY - field-naming reference for the MySQL migration
https://github.com/pjborowiecki/SEAT-FRENZY-Restaurant-Table-Booking-System (49 stars, MIT, branch `main`)

Next.js + Drizzle, MySQL dialect. [`src/db/migrations/0000_sour_the_initiative.sql`](https://github.com/pjborowiecki/SEAT-FRENZY-Restaurant-Table-Booking-System/blob/main/src/db/migrations/0000_sour_the_initiative.sql) (verified):

```sql
CREATE TABLE `tables` ( `id` serial AUTO_INCREMENT NOT NULL, `venueId` int NOT NULL,
  `capacity` int, `tableNumber` int NOT NULL, `location` enum('inside','outside'),
  `createdAt` timestamp DEFAULT (now()), `updatedAt` timestamp DEFAULT (now()), ... );
CREATE TABLE `bookings` ( `id` serial AUTO_INCREMENT NOT NULL, `userId` int NOT NULL,
  `venueId` int NOT NULL, `tableId` int, `people` int NOT NULL, `price` decimal NOT NULL,
  `bookingDate` date NOT NULL, `bookingTime` time NOT NULL,
  `status` enum('Upcoming','Now','Future'), ... );
```

Good: `capacity` on the table, `location` enum for indoor/outdoor sections, `people` on the booking, venue-scoped tables, timestamps.
Bad and instructive: `status enum('Upcoming','Now','Future')` is a *derived* value, not a lifecycle - it has no `Cancelled`, `Seated`, `Completed` or `NoShow`, and `Upcoming`/`Future` are the same thing. Our status enum must describe the booking lifecycle, which is the thing a demo judge will click through. Also `bookingDate date` + `bookingTime time` as separate columns makes overlap maths painful; one `DATETIME` (or start + end) is better. No duration column at all. Other tables: `venues`, `venueTimes`, `menuItems`, `cuisines`, `dietary`, `tags`, `reviews`, join tables `venuesTo*`, plus NextAuth `user`/`account`/`session`/`verificationToken`.

### 7. slavyanHristov - layering to mirror in PHP
https://github.com/slavyanHristov/restaurant-table-reservation-system (35 stars, branch `main`, 139 files)

Node/Sequelize + Vue, so no PHP to copy, but the backend layout is the cleanest in this list and maps 1:1 onto a vanilla PHP project:
`src/routes/{reservation,table}.router.js` -> `src/controllers/*.controller.js` -> `src/services/{reservationService,tableService}.js` -> `src/DAOs/{reservation,table}.dao.js` -> `src/db/models/{customer,reservation,table}.js`, with `src/middleware/{errorHandler,tryCatch,notFound,httpMethodError}.js`, `src/utils/dateAndTimeValidator.js`, `src/utils/regularExpressions.js`, and migrations/seeders per entity (`20221113194802-create-reservation.js`, `20221113194833-create-table.js`, `20221113194246-table.js` seeder). There is also a test (`src/__tests__/table.spec.js`).

Adopt: a dedicated date/time validator module, seeders so the demo database is populated with one command, and a single error-handling middleware so no stack trace ever reaches the judges' screen.

### 8. DanMat - steal the demo, not the code
https://github.com/DanMat/Restaurant-Management-System (43 stars, branch `master`, 147 files)

Current version is a plugin on "NimbusCMS", so the code is not reusable. Two things are:

**Demo presentation strategy** (verified in README): a live sandbox that **resets hourly**, and a login page with an *"Explore as ..."* role picker (`waiter@ras.demo` floor, `cook@ras.demo` kitchen, `manager@ras.demo`, `admin@ras.demo`, shared password `restaurant-demo`). The README then states what each role *cannot* see ("a cook has no payment button, a floor login can't open a guest's CRM record, only the manager sees Reports"). For a live-demo-judged competition this is the single most valuable idea in this document: make role differences clickable in under five seconds, and make the demo data self-healing.

Claimed feature set (README, not code-verified): menu, tables/floor with live status and a mobile floor board, orders with price snapshotting, kitchen display (New -> Preparing -> Ready), payment + "turn the table", staff roles, reservations, reports.

**The 2014 original** is preserved in `archive/`, and [`archive/oose.sql`](https://github.com/DanMat/Restaurant-Management-System/blob/master/archive/oose.sql) shows the naive floor model to avoid:

```sql
CREATE TABLE IF NOT EXISTS `floorplan` (
  `tableid` int(11) NOT NULL AUTO_INCREMENT, `status` varchar(10) NOT NULL,
  `waiterid` int(11) NOT NULL, PRIMARY KEY (`tableid`) );
```

No x/y, no capacity, `status` as free-text `varchar(10)`, and `orders.orderlist text` stuffing the whole order into one column. Its `employee.pwd varchar(32)` is an md5-sized column (see anti-patterns). There is a CI setup worth noting: `.github/workflows/plugin-ci.yml` and `theme-ci.yml`.

### 9. TastyIgniter - biggest name, least usable here
https://github.com/tastyigniter/TastyIgniter (3772 stars, MIT, default branch `4.x`)

README (verified) describes "online food ordering and table reservation". But the repo tree is only 92 files and is a Laravel application skeleton (`app/Http/Kernel.php`, `app/Console/Kernel.php`, standard middleware, `artisan`, `composer.json`, `themes/`, `extensions/`). PHP 8.3-8.4. All domain logic, including the reservation module and its migrations, lives in external composer packages (`tastyigniter/flame` and `ti-ext-*`), so **the reservation schema and availability algorithm are `NOT_FOUND` in this repository**. Useful only as evidence of conventions (`.env.example`, `.nginx.conf`, `.dockerignore`, `webpack.mix.js`) and as a name to cite. Chasing its extensions would cost more API calls than it is worth for a vanilla-PHP build.

---

## Anti-patterns observed

All verified by reading the files, not inferred.

1. **md5 passwords concatenated into SQL.** [SAL6910/Restaurant-Management-System-in-PHP `login.php:77`](https://github.com/SAL6910/Restaurant-Management-System-in-PHP/blob/main/login.php):
   `$loginquery = "SELECT * FROM users WHERE username='$username' && password='".md5($password)."'";`
   Two fatal flaws in one line: md5 for password storage, and raw interpolation of `$username` (`' OR '1'='1' -- ` logs you in as anyone). `connection/connect.php` is 420 bytes of hardcoded credentials.
2. **md5-sized password columns.** DanMat `archive/oose.sql`: `employee.pwd varchar(32)`. A `password_hash()` bcrypt string needs 60 chars, argon2id more; a 32-char column is a tell that hashing is md5.
3. **String-interpolated SQL even inside an otherwise tidy MVC.** the-squad `app/models/reservation.php` and `app/models/table.php` interpolate `$_SESSION['id']`, `$this->date`, `$this->time`, `$this->duration`, `$this->tableNumber` directly. Clean architecture does not save you from injection.
4. **Hardcoded `root` / empty password in committed source.** the-squad `app/Database.php` (`$user = "root"; $password = "";`), jairiidriss `connect.php` (`$user='root'; $pass='';`), nya3ali `dbCon.php`. Ours must read `getenv()` from Docker Compose env/secrets, with `.env` git-ignored and a committed `.env.example`.
5. **`$con->query()` with interpolated variables in loops.** [nya3ali/bookeat `choose-table.php`](https://github.com/nya3ali/bookeat/blob/main/choose-table.php): `"SELECT id, person_num FROM restaurant_tables WHERE res_id = $location;"` then, inside that loop, `"SELECT * FROM restaurant_personne WHERE tbl_id = '$table_id';"` and another availability query per seat. Injectable *and* an N+1 query storm on the page a judge will open first.
6. **`password_verify` commented out.** nya3ali `login.php:107` has `// if (!password_verify($password, $row['password'])) {`. The prepared statement at L83-87 is undermined by the auth check being disabled.
7. **`phpinfo.php` and `testsend.php` committed to the repo root.** nya3ali/bookeat. Full environment disclosure; also 2260 files with vendored fonts/scss in the tree.
8. **Reservation as a contact form with no table entity.** [techadam `db/mfors.sql`](https://github.com/techadam/food-ordering-and-table-reservation-system-for-restaurants/blob/master/db/mfors.sql): `reservation(reserve_id, no_of_guest varchar(100), email, phone, date_res varchar(100), time varchar(100), suggestions varchar(100))`. Dates and guest counts stored as `varchar`, `latin1` charset, no table reference, so double-booking is not merely possible, it is unmodellable. There is no `tables` table in the schema at all.
9. **Tables modelled as a per-day integer.** [bill-f `loginsystem.sql`](https://github.com/bill-f/Restaurant-Reservation-System/blob/master/loginsystem.sql): `CREATE TABLE tables (tables_id int AUTO_INCREMENT, t_date date, t_tables int)` - a row means "N tables exist on this date". No capacity, no identity, no position, so no floor plan and no per-table availability is possible. `includes/dbh.inc.php` is 247 bytes (inline credentials) and `nbproject/` NetBeans config is committed.
10. **`varchar` for dates/times generally** (techadam, and `booking_date`/`booking_time` as `varchar(200)`-style columns in nya3ali `database/booking_res.sql`). Kills every index and every overlap comparison.
11. **Inclusive `BETWEEN` patched with magic numbers.** the-squad's `SEC_TO_TIME($duration*3600 - 60)`. The `-60` works by accident at minute granularity and silently breaks if durations ever become minute-precise.
12. **Reserved words as table names.** the-squad uses `` `table` `` and `` `order` ``; tutorials24x7 uses `` `order` ``. Every query then needs backticks and any ORM/raw-SQL mix becomes a trap. Use `restaurant_table` or `table_top`.
13. **Trusting hidden form fields for the booked resource.** jairiidriss passes `table_id` in a hidden input between step 1 and step 2 with no re-check on insert.
14. **Reading the next id from `INFORMATION_SCHEMA.AUTO_INCREMENT`** instead of `lastInsertId()` (jairiidriss). Wrong under any concurrency, which a judge can trigger with two browser tabs.
15. **Dead/duplicated schema copies in the repo** (techadam ships `db/mfors.sql` and `admin/sql file/mfors.sql`; mwasikz ships `database/new-food-order.sql` and `frontend/db/new-food-order.sql`). One schema file, one migration path.

---

## Concrete things to adopt in our build

**Schema (synthesis of the-squad + tutorials24x7 + openresto)**
1. `restaurant_table(id, table_number UNIQUE, capacity, pos_x FLOAT, pos_y FLOAT, section, is_active, walk_in_only, created_at, updated_at)` - percentage-based `pos_x`/`pos_y` from the-squad, `capacity` from SEAT-FRENZY/tutorials24x7, `section` from openresto floor sections, `walk_in_only` from openresto. Avoid the reserved word `table`.
2. `reservation(id, customer_id NULL, guest_token, party_size, starts_at DATETIME, ends_at DATETIME, status ENUM('pending','confirmed','seated','completed','cancelled','no_show'), cancellation_reason, created_at, updated_at)` - store **`starts_at` + `ends_at` as real DATETIMEs** (derived from a configurable default duration) so the overlap predicate is a plain indexed comparison. `guest_token` from tutorials24x7 lets a non-registered guest manage their booking. Lifecycle statuses, not SEAT-FRENZY's derived ones.
3. `reservation_table(reservation_id, table_id, PRIMARY KEY(reservation_id, table_id))` - the-squad's many-to-many, so combining tables for a large party is expressible. Add the composite PK they omitted.
4. `table_group(id, name)` + `table_group_member(group_id, table_id)` only if time allows (openresto's "join 4+5" feature).
5. InnoDB, `utf8mb4`, named FKs with `ON DELETE RESTRICT`, explicit indexes on `reservation.starts_at`, `reservation.status`, and both FK columns, `created_at`/`updated_at` everywhere (tutorials24x7 conventions).
6. `opening_hours(weekday, open_time, close_time)` + `schedule_exception(date, start_time NULL, end_time NULL, reason)` - NateWr's two-tier model, with exceptions overriding weekly rules.
7. `settings` row holding `slot_interval_minutes` (default 30), `default_duration_minutes`, `early_booking_days`, `late_booking_minutes`, `max_covers_per_slot`, `bookings_paused_until`.

**Availability engine (port openresto's algorithm to PHP)**
8. Generate slots in a loop from open/close hours at `slot_interval_minutes`; never store slot rows. Guard the interval with `max(1, interval)` so a bad config cannot spin forever.
9. One overlap predicate, used everywhere, half-open: `WHERE r.starts_at < :slot_end AND r.ends_at > :slot_start AND r.status NOT IN ('cancelled','no_show')`.
10. Load the whole day's reservations **once** per availability request and index them by `table_id` in PHP, then answer every slot from memory. Do not run a query per slot per table.
11. Filter candidate tables by `capacity >= party_size` (and an upper bound so a 2-top is not given a 10-seater), plus `is_active` and `NOT walk_in_only`.
12. Return closed/unavailable slots explicitly flagged rather than omitting them, so the UI greys them out.
13. Short-lived holds: a `reservation_hold(token, table_id, starts_at, ends_at, expires_at)` table checked by the same overlap predicate, 5-minute TTL, `token` echoed back on confirm, expired rows ignored and swept. MySQL table rather than openresto's in-memory dictionary, because our PHP has no shared process memory.
14. Insert inside a transaction and **re-run the overlap check with `SELECT ... FOR UPDATE` before the insert** (jairiidriss has the transaction but not the re-check). Back it with a DB-level guarantee so two tabs cannot double-book; this is a classic live-demo gotcha a judge will try.
15. Enforce `early_booking_days` / `late_booking_minutes` / exceptions / pause **server-side** (NateWr), and ship the identical config to the client as one JSON object for the datepicker. Allow staff roles to bypass the rules.
16. Store and compare in one timezone consistently; set it once in PHP and in MySQL rather than per-file `date_default_timezone_set("Africa/Cairo")` calls scattered through models (the-squad).

**Floor plan UI (the-squad's pattern, hardened)**
17. Absolutely-positioned `<div>` per table inside a relative container, `left: pos_x%; top: pos_y%` (percentages = responsive with zero JS).
18. Selection via hidden `<input type="radio">` + `<label>`, so it degrades to a working form without JS and stays keyboard accessible.
19. Admin edit mode: `mousedown`/`mousemove`/`mouseup` drag writing back percentages, then a single "Save layout" POST of all positions as JSON. Add / Update / Delete Table controls.
20. Colour tables by state for the chosen slot (free / held / booked / seated / too small for this party) and show capacity on the token.

**Project layout and demo readiness**
21. Vanilla PHP MVC like the-squad (`public/` as the only web root, `app/core` router, `app/controllers`, `app/models`, `app/views`), but layered like slavyanHristov: controller -> service -> repository, with a dedicated date/time validator and one error-handling path so no stack trace is ever rendered.
22. PDO, prepared statements with named params, `ATTR_ERRMODE => ERRMODE_EXCEPTION`, `ATTR_EMULATE_PREPARES => false`, credentials from `getenv()` supplied by Docker Compose, `.env.example` committed and `.env` ignored.
23. `password_hash()` / `password_verify()` only. CSRF token on every mutating form. Disable the submit button on submit (NateWr) to stop double-click double-bookings.
24. Seed/demo data as a repeatable script (slavyanHristov's seeders) and an hourly-or-on-demand **demo reset** (DanMat), so the live demo always starts clean.
25. A login page with an explicit role picker (DanMat's "Explore as ...") for host / waiter / kitchen / manager, and a visible capability difference per role. Highest demo-score-per-hour feature in this entire document.
26. Validation that returns per-field errors keyed by field slug (NateWr) instead of dying on the first failure.
27. An audit/activity log on booking create/modify/cancel (NateWr `add_log`) - cheap to build, looks mature in a demo.
28. Staff "today" view using NateWr's `-1 hour` window so a booking that just passed is still visible to the host.

**Hardest-parts summary (task 4)**
- **Best interactive floor plan / table map found:** [the-squad/smug-reservation-system](https://github.com/the-squad/smug-reservation-system) - `x`/`y` floats on the table row plus percentage-positioned divs with `onmousedown` drag in `app/views/home/elements/panes/tables-control.php`. Nothing else in this list stores table coordinates at all. openresto has named floor *sections* but a drag-and-drop map is `NOT_FOUND`. DanMat's README claims a "mobile floor board" with circular table tokens, but as a CMS plugin the implementation was not read: `NOT_FOUND`.
- **Best availability engine found:** [karanshukla/openresto](https://github.com/karanshukla/openresto) `AvailabilityService.cs` - generated slots, half-open overlap, pre-indexed day bookings, table groups, capacity fit, 5-minute holds with echo-back ids, cover pacing, booking pause, UTC + IANA timezones, and unit tests with a fake clock. Second best is the-squad's single `checkReservation()` SQL overlap query, which has the right idea in 8 lines of injectable SQL.
