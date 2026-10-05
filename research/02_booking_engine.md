# 02 - Booking / Availability Engine Engineering Spec

Stack: vanilla PHP 8 + MySQL 8 (InnoDB, utf8mb4) + vanilla JS. All times stored as `DATETIME` in a single
restaurant-local timezone (set `date_default_timezone_set()` once in bootstrap; no per-user TZ in v1).

Labels used throughout:
- **CITED** = pattern verified in an external source, URL given.
- **DESIGN** = our proposal, not citable to an external source.

## 0. Verified reference sources

| Source | URL | HTTP check | What we take from it |
|---|---|---|---|
| MySQL 8.0 Locking Reads (`FOR UPDATE`, `FOR SHARE`, `SKIP LOCKED`, `NOWAIT`) | https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html | 200 | Pessimistic row locking semantics |
| MySQL 8.0 InnoDB Locking (record, gap, next-key locks) | https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html | 200 | Why a unique index gives a hard serialization point |
| MySQL 8.0 Deadlocks in InnoDB | https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlocks.html | 200 | Deterministic lock ordering + retry requirement |
| MySQL 8.0 Transaction Isolation Levels | https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html | 200 | REPEATABLE READ default; read-then-write hazard |
| MySQL 8.0 CREATE INDEX | https://dev.mysql.com/doc/refman/8.0/en/create-index.html | 200 | Composite / unique index DDL |
| MySQL 8.0 CREATE EVENT | https://dev.mysql.com/doc/refman/8.0/en/create-event.html | 200 | Scheduled expiry sweep for hold TTL |
| MySQL 8.0 SELECT syntax | https://dev.mysql.com/doc/refman/8.0/en/select.html | 200 | Query clause ordering reference |
| Fowler, *Optimistic Offline Lock* | https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html | 200 | Version-column conflict detection |
| Fowler, *Pessimistic Offline Lock* | https://martinfowler.com/eaaCatalog/pessimisticOfflineLock.html | 200 | The "hold / lock record with timeout" pattern |
| Easy!Appointments `Availability.php` | https://raw.githubusercontent.com/alextselegidis/easyappointments/master/application/libraries/Availability.php | 200 | Real PHP availability engine: working plan -> break-split free periods -> `generate_available_hours()` -> `consider_book_advance_timeout()` |
| Cal.com (open-source scheduler) | https://github.com/calcom/cal.com | 200 | Slot-generation + booking-limits product model |
| Tableo | https://github.com/tableo/tableo | 200 | Restaurant-specific reservation product org |
| White-Label-Solutions (GitHub search hit for "booking availability engine php") | https://github.com/nickb4924/White-Label-Solutions | 200 | PHP booking codebase hit from search |
| Allen's interval algebra | https://en.wikipedia.org/wiki/Allen%27s_interval_algebra | 200 | Formal basis of the overlap predicate |
| Bin packing problem | https://en.wikipedia.org/wiki/Bin_packing_problem | 200 | Table-combination is a bin-packing variant; justifies greedy heuristic |

Research gap, stated honestly: GitHub's code/repo **search API rate-limited** our shared corporate egress IP
mid-session (`API rate limit exceeded for 162.10.230.213`) and authentication was out of scope, so repo-level
discovery is thinner than planned. Everything below that is not in the table above is labelled **DESIGN**.
No citation is invented; nothing is attributed to a URL we did not fetch.

---

## 1. How availability is really modelled

### 1.1 Two competing models
1. **Fixed slot grid** (CITED shape, Easy!Appointments): generate candidate start times from opening hours at a
   fixed interval, then subtract busy periods. Simple, cache-friendly, demo-friendly.
2. **Continuous interval** model: any start time, availability = interval arithmetic only.

**DESIGN decision: fixed grid for the guest UI, continuous intervals in the database.** Guests only ever see
`settings.slot_interval_min` (default 15) aligned times, but every reservation row stores a real
`[starts_at, ends_at)` interval, so admin walk-ins at 19:07 and per-party-size turn times still work. This is
the single most important modelling choice: **slots are a presentation concern, intervals are the truth.**

### 1.2 Turn time (dining duration) - DESIGN, data-driven
Duration is not a constant; it scales with party size. Stored as a lookup table (`turn_times`) rather than
hardcoded, so judges can see the admin change it live:

| party_size range | turn time (min) | reasoning |
|---|---|---|
| 1-2 | 75 | DESIGN default |
| 3-4 | 90 | DESIGN default |
| 5-6 | 105 | DESIGN default |
| 7-10 | 120 | DESIGN default |
| 11+ | 150 | DESIGN default |

Resolution order (DESIGN): `turn_times` row matching (room_type_id, party_size) -> row matching
(NULL room_type, party_size) -> `settings.default_turn_time_min`. VIP/private dining rows can override to
longer turns (e.g. VIP 150) so a VIP room is not flipped three times a night.

### 1.3 Buffer time - DESIGN
`settings.buffer_min` (default 15) is added to the **occupancy** interval, not the guest-facing duration:

```
occupied_from = starts_at
occupied_to   = starts_at + turn_time_min + buffer_min
```

Stored denormalised in `reservations.ends_at` (= starts_at + turn_time) and
`reservations.blocks_until` (= ends_at + buffer). Overlap tests use `blocks_until`. Keeping both columns means
the guest sees an honest "your table until 20:30" while the engine protects the bus/reset time.

### 1.4 Pacing / covers per slot - DESIGN
Even with free tables, a kitchen cannot absorb 60 covers at 19:00. Two independent caps, both in `settings`
and both overridable per 30-min window in `pacing_rules`:
- `max_covers_per_slot` - sum of `party_size` of reservations starting in the same slot.
- `max_reservations_per_slot` - head count of reservations starting in the same slot.

Pacing is evaluated **after** table availability and before a slot is offered. This is the rule the kitchen
dashboard benefits from, and it is cheap to demo (drop the cap to 2 and watch slots disappear).

### 1.5 Table combining - DESIGN, greedy, pre-declared
General table merging is a bin-packing variant (https://en.wikipedia.org/wiki/Bin_packing_problem), i.e. NP-hard
in the general case, so we do **not** solve it at request time. Instead:
- `tables.is_joinable` marks tables that may be merged.
- `table_groups` / `table_group_members` pre-declare **physically valid** combinations
  (e.g. T4+T5 = 4 seats, same room, adjacent). Admin curates them from the floor plan.
- At request time a combination is just another candidate "virtual table" whose capacity is
  `SUM(capacity_max) + settings.join_bonus_seats` and which is available only if **every** member table is free
  for the whole blocking window.
- Combinations are ranked strictly **below** any single table that fits (penalty in the ranking score), because
  merging costs staff effort.

---

## 2. Concurrency: two guests, one last VIP room

### 2.1 The exact failure mode
Classic read-then-write (lost update / phantom booking) under MySQL's default REPEATABLE READ
(https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html):

```
T1: SELECT ... WHERE no overlapping reservation  -> VIP-1 free
T2: SELECT ... WHERE no overlapping reservation  -> VIP-1 free   (plain reads take no locks)
T1: INSERT reservation (VIP-1, 19:00)            -> OK
T2: INSERT reservation (VIP-1, 19:00)            -> OK  <-- double booking, two parties at one door
```

A plain consistent read never blocks another transaction, so *availability checks alone can never prevent this*.
The guard must be a write-side constraint or a lock.

### 2.2 Strategy comparison

| Strategy | Mechanism | Prevents double-book? | Cost | Verdict |
|---|---|---|---|---|
| A. Unique composite index `(table_id, slot_start)` | DB rejects the 2nd INSERT (https://dev.mysql.com/doc/refman/8.0/en/create-index.html) | Yes, absolutely, for **identical** slot starts | Near zero | Keep as the final safety net, but it cannot express *overlap* (19:00 vs 19:15 with a 90-min turn both pass) |
| B. `SELECT ... FOR UPDATE` in a transaction | Pessimistic row/next-key lock (https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html) | Yes, serialises the check+insert on the candidate table row | Lock wait; deadlock risk needs retry (https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlocks.html) | **Core of the recommendation** |
| C. Optimistic versioning | `version` column, UPDATE ... WHERE version = n (https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html) | Detects conflict *after* the fact; loser must be told "gone" | Cheap, no locks | Good for **editing** an existing reservation, bad UX for creation |
| D. Short-lived hold row with TTL | Pessimistic Offline Lock with timeout (https://martinfowler.com/eaaCatalog/pessimisticOfflineLock.html) | Yes, and it also protects the **think time** while the guest types their name | Needs expiry sweep (https://dev.mysql.com/doc/refman/8.0/en/create-event.html) | **Core of the recommendation** |

### 2.3 RECOMMENDED: layered **Hold + FOR UPDATE + unique index** (DESIGN composition of CITED primitives)

Rationale: the real-world race is not two `INSERT`s 1 ms apart, it is two guests both staring at a form for
90 seconds after both saw "1 VIP room left". Only a hold with a TTL fixes that; `FOR UPDATE` makes hold
acquisition atomic; the unique index is the last line of defence against application bugs.

Flow:
1. Guest clicks a slot -> `POST /api/holds` -> **transaction**: lock the candidate table row `FOR UPDATE`,
   re-run the overlap check (reservations + live holds), `INSERT` a hold with
   `expires_at = NOW() + settings.hold_ttl_sec` (default 300), commit. Return `hold_token`.
2. Guest submits the form within the TTL -> `POST /api/reservations` with `hold_token` -> transaction:
   lock the hold `FOR UPDATE`, verify `status='active' AND expires_at > NOW()`, insert the reservation,
   mark the hold `consumed`, commit.
3. Expired holds are ignored by every query (`expires_at > NOW()`) and physically reaped by a MySQL event.

### 2.4 Exact DDL + SQL sketch

```sql
-- Hold row: the short-lived lock. DESIGN, implements Pessimistic Offline Lock.
CREATE TABLE holds (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  hold_token     CHAR(36)        NOT NULL,              -- UUIDv4 handed to the browser; never expose hold.id
  table_id       INT UNSIGNED    NOT NULL,
  table_group_id INT UNSIGNED    NULL,                  -- set when the hold is for a joined combination
  starts_at      DATETIME        NOT NULL,
  ends_at        DATETIME        NOT NULL,              -- starts_at + turn_time
  blocks_until   DATETIME        NOT NULL,              -- ends_at + buffer; this is what overlap tests use
  party_size     SMALLINT UNSIGNED NOT NULL,
  session_id     CHAR(64)        NOT NULL,              -- PHP session, so a guest can re-enter their own hold
  status         ENUM('active','consumed','expired','released') NOT NULL DEFAULT 'active',
  expires_at     DATETIME        NOT NULL,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_holds_token (hold_token),
  KEY ix_holds_live (table_id, status, expires_at, starts_at, blocks_until),
  CONSTRAINT fk_holds_table FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

Step 1, acquire the hold atomically (CITED primitive: `FOR UPDATE`,
https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html):

```sql
START TRANSACTION;

-- (a) take an exclusive lock on the candidate table row: all competing hold
--     attempts for THIS table now serialise behind us.
SELECT id, capacity_min, capacity_max
FROM tables
WHERE id = :table_id AND is_active = 1
FOR UPDATE;

-- (b) with the lock held, re-verify there is no overlapping reservation or live hold.
SELECT
  (SELECT COUNT(*) FROM reservation_tables rt
     JOIN reservations r ON r.id = rt.reservation_id
    WHERE rt.table_id = :table_id
      AND r.status IN ('pending','confirmed','seated')
      AND :starts_at < r.blocks_until
      AND :blocks_until > r.starts_at) AS res_conflicts,
  (SELECT COUNT(*) FROM holds h
    WHERE h.table_id = :table_id
      AND h.status   = 'active'
      AND h.expires_at > NOW()
      AND :starts_at < h.blocks_until
      AND :blocks_until > h.starts_at) AS hold_conflicts;

-- (c) if both counts are 0:
INSERT INTO holds (hold_token, table_id, starts_at, ends_at, blocks_until,
                   party_size, session_id, expires_at)
VALUES (:uuid, :table_id, :starts_at, :ends_at, :blocks_until,
        :party_size, :session_id,
        DATE_ADD(NOW(), INTERVAL :hold_ttl_sec SECOND));

COMMIT;   -- else ROLLBACK and return 409 SLOT_TAKEN
```

Step 2, convert the hold into a reservation:

```sql
START TRANSACTION;

SELECT id, table_id, starts_at, ends_at, blocks_until, party_size
FROM holds
WHERE hold_token = :token AND status = 'active' AND expires_at > NOW()
FOR UPDATE;                      -- 0 rows => 410 HOLD_EXPIRED, restart the search

INSERT INTO reservations (code, guest_id, room_type_id, party_size,
                          starts_at, ends_at, blocks_until, status, source, created_by)
VALUES (:code, :guest_id, :room_type_id, :party_size,
        :starts_at, :ends_at, :blocks_until, 'pending', 'web', :user_id);
SET @rid = LAST_INSERT_ID();

INSERT INTO reservation_tables (reservation_id, table_id, slot_start)
VALUES (@rid, :table_id, :starts_at);     -- the unique index below fires here if anything slipped through

INSERT INTO reservation_status_history (reservation_id, from_status, to_status, actor_user_id, reason)
VALUES (@rid, NULL, 'pending', :user_id, 'created via web');

UPDATE holds SET status='consumed' WHERE id = :hold_id;

COMMIT;
```

Final safety net (CITED primitive: unique composite index,
https://dev.mysql.com/doc/refman/8.0/en/create-index.html). It lives on the join table:

```sql
ALTER TABLE reservation_tables
  ADD UNIQUE KEY uq_table_slot (table_id, slot_start);
```

This makes a byte-identical duplicate booking **physically impossible** (duplicate key 1062 -> map to HTTP 409),
independent of any application logic. It does not catch *overlapping but non-identical* starts; that is what the
interval predicate plus the row lock are for. Both layers are kept on purpose.

Hold expiry sweep (CITED primitive: https://dev.mysql.com/doc/refman/8.0/en/create-event.html):

```sql
SET GLOBAL event_scheduler = ON;
CREATE EVENT IF NOT EXISTS ev_expire_holds
ON SCHEDULE EVERY 1 MINUTE
DO UPDATE holds SET status = 'expired'
   WHERE status = 'active' AND expires_at <= NOW();
```

Correctness does **not** depend on this event (every read already filters `expires_at > NOW()`); it only keeps
the index tidy. If the demo machine has the event scheduler disabled, call the same UPDATE opportunistically at
the top of the availability endpoint.

### 2.5 Deadlock discipline - DESIGN
When a combination locks several tables, always lock `ORDER BY table_id ASC` inside the transaction, and wrap
the transaction in a retry loop of 3 attempts on MySQL error 1213 (deadlock) / 1205 (lock wait timeout), per
https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlocks.html. Keep transactions to the two short steps above;
never hold a transaction open across a user's think time (that is exactly what the hold row replaces).

### 2.6 Where optimistic versioning still earns its place - DESIGN
`reservations.version` increments on every mutation. Admin edits use
`UPDATE reservations SET ..., version = version + 1 WHERE id = :id AND version = :seen_version`; 0 affected rows
means "another staff member changed this reservation, reload". That is the correct tool for the admin dashboard,
where two managers edit the same row (https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html).

---

## 3. Relational schema (DDL) - DESIGN

All tables InnoDB / utf8mb4_0900_ai_ci. `tables` is a reserved-ish word in SQL; in MySQL it is usable but we
always backquote it in code. Non-obvious columns are explained one line each.

### 3.1 Reference / configuration

```sql
CREATE TABLE room_types (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(32)  NOT NULL,   -- machine key: vip, standard, large_group, terrace, private_dining, bar
  name          VARCHAR(80)  NOT NULL,
  description   TEXT         NULL,
  min_party     SMALLINT UNSIGNED NOT NULL DEFAULT 1,  -- business rule: VIP refuses parties of 2
  max_party     SMALLINT UNSIGNED NULL,                -- NULL = no cap beyond table capacity
  deposit_cents INT UNSIGNED NOT NULL DEFAULT 0,       -- >0 means a deposit is demanded at booking time
  requires_approval TINYINT(1) NOT NULL DEFAULT 0,     -- 1 => reservation stays 'pending' until a manager acts
  default_turn_time_min SMALLINT UNSIGNED NULL,        -- per-type override of the global turn time
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_room_types_code (code)
) ENGINE=InnoDB;

CREATE TABLE rooms (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_type_id INT UNSIGNED NOT NULL,
  name         VARCHAR(80)  NOT NULL,     -- "Terrace East", "VIP Sakura"
  floor_label  VARCHAR(32)  NULL,         -- groups rooms in the floor-plan UI
  floor_w      SMALLINT UNSIGNED NOT NULL DEFAULT 1000,  -- floor-plan canvas width in design units
  floor_h      SMALLINT UNSIGNED NOT NULL DEFAULT 600,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  KEY ix_rooms_type (room_type_id),
  CONSTRAINT fk_rooms_type FOREIGN KEY (room_type_id) REFERENCES room_types(id)
) ENGINE=InnoDB;

CREATE TABLE `tables` (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_id       INT UNSIGNED NOT NULL,
  code          VARCHAR(16)  NOT NULL,    -- "T12", printed on the physical table
  capacity_min  SMALLINT UNSIGNED NOT NULL DEFAULT 1,  -- refuse 1 guest on a 10-seat VIP table
  capacity_max  SMALLINT UNSIGNED NOT NULL,
  is_joinable   TINYINT(1) NOT NULL DEFAULT 0,         -- eligible to be a member of a table_group
  shape         ENUM('round','square','rect','booth','counter') NOT NULL DEFAULT 'rect',
  pos_x         SMALLINT NOT NULL DEFAULT 0,           -- floor-plan coords, same units as rooms.floor_w/h
  pos_y         SMALLINT NOT NULL DEFAULT 0,
  rotation_deg  SMALLINT NOT NULL DEFAULT 0,
  priority      SMALLINT NOT NULL DEFAULT 100,         -- tie-break in ranking: prefer filling the good seats first
  is_active     TINYINT(1) NOT NULL DEFAULT 1,         -- soft-retire a broken table without losing history
  UNIQUE KEY uq_tables_room_code (room_id, code),
  KEY ix_tables_cap (capacity_max, capacity_min),
  CONSTRAINT fk_tables_room FOREIGN KEY (room_id) REFERENCES rooms(id)
) ENGINE=InnoDB;

CREATE TABLE table_groups (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_id       INT UNSIGNED NOT NULL,
  name          VARCHAR(80)  NOT NULL,     -- "T4+T5"
  capacity_min  SMALLINT UNSIGNED NOT NULL,
  capacity_max  SMALLINT UNSIGNED NOT NULL,-- curated, NOT auto-summed: merging loses/gains seats in practice
  setup_min     SMALLINT UNSIGNED NOT NULL DEFAULT 10, -- extra staff time; added to the blocking window
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  KEY ix_tgroups_room (room_id),
  CONSTRAINT fk_tgroups_room FOREIGN KEY (room_id) REFERENCES rooms(id)
) ENGINE=InnoDB;

CREATE TABLE table_group_members (
  table_group_id INT UNSIGNED NOT NULL,
  table_id       INT UNSIGNED NOT NULL,
  PRIMARY KEY (table_group_id, table_id),
  KEY ix_tgm_table (table_id),             -- reverse lookup: "which combos does T4 participate in"
  CONSTRAINT fk_tgm_group FOREIGN KEY (table_group_id) REFERENCES table_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_tgm_table FOREIGN KEY (table_id)       REFERENCES `tables`(id)   ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE settings (
  skey        VARCHAR(64) PRIMARY KEY,     -- single-row-per-key KV so admin can edit live without migrations
  svalue      VARCHAR(255) NOT NULL,
  value_type  ENUM('int','string','bool','json','time') NOT NULL DEFAULT 'string',
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO settings (skey, svalue, value_type) VALUES
  ('slot_interval_min','15','int'),
  ('default_turn_time_min','90','int'),
  ('buffer_min','15','int'),
  ('hold_ttl_sec','300','int'),
  ('min_lead_time_min','60','int'),      -- cannot book less than 1h out online
  ('max_lead_time_days','60','int'),     -- cannot book further than 60 days out
  ('max_party_online','10','int'),       -- above this it becomes an event request
  ('max_covers_per_slot','40','int'),
  ('max_reservations_per_slot','8','int'),
  ('last_seating_before_close_min','60','int'),
  ('waitlist_promote_window_min','120','int'),
  ('no_show_grace_min','20','int');

CREATE TABLE opening_hours (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_type_id INT UNSIGNED NULL,         -- NULL = applies to the whole venue; set = type-specific hours (bar opens later)
  weekday      TINYINT UNSIGNED NOT NULL, -- 0=Sunday .. 6=Saturday
  open_time    TIME NOT NULL,
  close_time   TIME NOT NULL,             -- may be < open_time meaning it crosses midnight
  service_name VARCHAR(32) NOT NULL DEFAULT 'dinner', -- lunch/dinner split => two rows per weekday
  is_closed    TINYINT(1) NOT NULL DEFAULT 0,
  KEY ix_oh_lookup (weekday, room_type_id),
  CONSTRAINT fk_oh_type FOREIGN KEY (room_type_id) REFERENCES room_types(id)
) ENGINE=InnoDB;

CREATE TABLE turn_times (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_type_id    INT UNSIGNED NULL,      -- NULL = global fallback
  party_min       SMALLINT UNSIGNED NOT NULL,
  party_max       SMALLINT UNSIGNED NOT NULL,
  turn_time_min   SMALLINT UNSIGNED NOT NULL,
  KEY ix_tt_lookup (room_type_id, party_min, party_max)
) ENGINE=InnoDB;

CREATE TABLE pacing_rules (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  weekday       TINYINT UNSIGNED NULL,     -- NULL = every day
  window_start  TIME NOT NULL,
  window_end    TIME NOT NULL,
  max_covers    SMALLINT UNSIGNED NULL,    -- NULL = inherit settings
  max_reservations SMALLINT UNSIGNED NULL,
  KEY ix_pacing (weekday, window_start)
) ENGINE=InnoDB;

CREATE TABLE blackout_dates (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  starts_at    DATETIME NOT NULL,          -- datetime, not date: lets us black out only 18:00-22:00 for a private buyout
  ends_at      DATETIME NOT NULL,
  scope        ENUM('venue','room_type','room','table') NOT NULL DEFAULT 'venue',
  scope_id     INT UNSIGNED NULL,          -- id within the chosen scope; NULL when scope='venue'
  reason       VARCHAR(160) NOT NULL,
  blocks_booking TINYINT(1) NOT NULL DEFAULT 1, -- 0 = informational banner only (e.g. "live band")
  KEY ix_blackout_range (starts_at, ends_at),
  KEY ix_blackout_scope (scope, scope_id)
) ENGINE=InnoDB;
```

### 3.2 People and reservations

```sql
CREATE TABLE roles (
  id    TINYINT UNSIGNED PRIMARY KEY,
  code  VARCHAR(24) NOT NULL,   -- guest, host, server, kitchen, manager, admin
  name  VARCHAR(48) NOT NULL,
  UNIQUE KEY uq_roles_code (code)
) ENGINE=InnoDB;

CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id       TINYINT UNSIGNED NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,   -- password_hash(PASSWORD_DEFAULT); never a raw/md5 value
  full_name     VARCHAR(120) NOT NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE guests (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NULL,        -- set only if the guest registered; walk-ins stay anonymous rows
  full_name     VARCHAR(120) NOT NULL,
  phone         VARCHAR(32)  NOT NULL,    -- the real identity key in restaurants
  email         VARCHAR(190) NULL,
  notes         TEXT NULL,                -- allergies, "window seat", VIP preferences
  vip_tier      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  no_show_count SMALLINT UNSIGNED NOT NULL DEFAULT 0, -- feeds the deposit/approval rules
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_guests_phone (phone),
  KEY ix_guests_email (email),
  CONSTRAINT fk_guests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE reservations (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code           CHAR(8)      NOT NULL,   -- human-readable confirmation code shown to the guest
  guest_id       INT UNSIGNED NOT NULL,
  room_type_id   INT UNSIGNED NOT NULL,   -- what the guest ASKED for; table assignment may change, this must not
  table_group_id INT UNSIGNED NULL,       -- set when seated on a joined combination
  party_size     SMALLINT UNSIGNED NOT NULL,
  starts_at      DATETIME NOT NULL,
  ends_at        DATETIME NOT NULL,       -- starts_at + resolved turn time (guest-facing end)
  blocks_until   DATETIME NOT NULL,       -- ends_at + buffer (+ setup_min for groups); used by ALL overlap tests
  turn_time_min  SMALLINT UNSIGNED NOT NULL, -- snapshot: changing settings later must not rewrite history
  status         ENUM('pending','confirmed','seated','completed','cancelled','no_show','waitlisted')
                 NOT NULL DEFAULT 'pending',
  source         ENUM('web','phone','walk_in','admin') NOT NULL DEFAULT 'web',
  deposit_cents  INT UNSIGNED NOT NULL DEFAULT 0,
  deposit_status ENUM('none','required','paid','refunded','forfeited') NOT NULL DEFAULT 'none',
  approval_state ENUM('not_required','awaiting','approved','rejected') NOT NULL DEFAULT 'not_required',
  special_requests TEXT NULL,
  seated_at      DATETIME NULL,
  completed_at   DATETIME NULL,
  cancelled_at   DATETIME NULL,
  waitlist_rank  INT UNSIGNED NULL,       -- FIFO position inside the requested date+window
  version        INT UNSIGNED NOT NULL DEFAULT 1, -- optimistic lock for admin edits
  created_by     INT UNSIGNED NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_res_code (code),
  KEY ix_res_window (starts_at, blocks_until),      -- the availability scan's driving index
  KEY ix_res_status_day (status, starts_at),         -- admin "today's book" + kitchen feed
  KEY ix_res_guest (guest_id),
  KEY ix_res_waitlist (status, starts_at, waitlist_rank),
  CONSTRAINT fk_res_guest FOREIGN KEY (guest_id)     REFERENCES guests(id),
  CONSTRAINT fk_res_rtype FOREIGN KEY (room_type_id) REFERENCES room_types(id),
  CONSTRAINT fk_res_tgroup FOREIGN KEY (table_group_id) REFERENCES table_groups(id),
  CONSTRAINT fk_res_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- One reservation can occupy N tables (combination). This is where the hard uniqueness lives.
CREATE TABLE reservation_tables (
  reservation_id BIGINT UNSIGNED NOT NULL,
  table_id       INT UNSIGNED    NOT NULL,
  slot_start     DATETIME        NOT NULL, -- denormalised copy of reservations.starts_at, enables the unique key
  PRIMARY KEY (reservation_id, table_id),
  UNIQUE KEY uq_table_slot (table_id, slot_start),   -- hard anti-double-book guard
  KEY ix_rt_table (table_id),
  CONSTRAINT fk_rt_res   FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  CONSTRAINT fk_rt_table FOREIGN KEY (table_id)       REFERENCES `tables`(id)
) ENGINE=InnoDB;

CREATE TABLE reservation_status_history (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reservation_id BIGINT UNSIGNED NOT NULL,
  from_status    VARCHAR(16) NULL,        -- NULL on creation
  to_status      VARCHAR(16) NOT NULL,
  actor_user_id  INT UNSIGNED NULL,       -- NULL = system (TTL expiry, auto no-show sweep)
  reason         VARCHAR(255) NULL,
  changed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_rsh_res (reservation_id, changed_at),
  CONSTRAINT fk_rsh_res FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  CONSTRAINT fk_rsh_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
```

(The `holds` DDL is in section 2.4; add `CONSTRAINT fk_holds_group FOREIGN KEY (table_group_id) REFERENCES table_groups(id)`.)

### 3.3 Menu, orders, kitchen

```sql
CREATE TABLE menu_categories (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(80) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active  TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE menu_items (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id   INT UNSIGNED NOT NULL,
  name          VARCHAR(120) NOT NULL,
  description   TEXT NULL,
  price_cents   INT UNSIGNED NOT NULL,     -- integer cents; never FLOAT for money
  prep_time_min SMALLINT UNSIGNED NOT NULL DEFAULT 15, -- kitchen dashboard ETA + course pacing
  station       ENUM('cold','grill','fry','pastry','bar') NOT NULL DEFAULT 'grill', -- routes the ticket
  is_available  TINYINT(1) NOT NULL DEFAULT 1, -- 86'd items toggle here, live during the demo
  image_path    VARCHAR(255) NULL,
  KEY ix_items_cat (category_id, is_available),
  CONSTRAINT fk_items_cat FOREIGN KEY (category_id) REFERENCES menu_categories(id)
) ENGINE=InnoDB;

CREATE TABLE orders (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reservation_id BIGINT UNSIGNED NULL,     -- NULL for pure walk-in counter orders
  table_id       INT UNSIGNED NOT NULL,
  opened_by      INT UNSIGNED NULL,
  status         ENUM('open','sent_to_kitchen','preparing','ready','served','paid','void')
                 NOT NULL DEFAULT 'open',
  subtotal_cents INT UNSIGNED NOT NULL DEFAULT 0,  -- maintained on item change; avoids recomputing on every poll
  service_cents  INT UNSIGNED NOT NULL DEFAULT 0,
  total_cents    INT UNSIGNED NOT NULL DEFAULT 0,
  opened_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at      DATETIME NULL,
  KEY ix_orders_status (status, opened_at),  -- the kitchen dashboard's only query
  KEY ix_orders_res (reservation_id),
  CONSTRAINT fk_orders_res   FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_table FOREIGN KEY (table_id)       REFERENCES `tables`(id)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id       BIGINT UNSIGNED NOT NULL,
  menu_item_id   INT UNSIGNED NOT NULL,
  qty            SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  unit_price_cents INT UNSIGNED NOT NULL,  -- price snapshot at order time, not a join to menu_items.price
  course_no      TINYINT UNSIGNED NOT NULL DEFAULT 1, -- 1=starter, 2=main...; lets the kitchen fire by course
  notes          VARCHAR(255) NULL,
  status         ENUM('queued','preparing','ready','served','void') NOT NULL DEFAULT 'queued',
  KEY ix_oi_order (order_id),
  KEY ix_oi_station_status (status),
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id)     REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_oi_item  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
) ENGINE=InnoDB;

CREATE TABLE order_status_history (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id      BIGINT UNSIGNED NOT NULL,
  from_status   VARCHAR(20) NULL,
  to_status     VARCHAR(20) NOT NULL,
  actor_user_id INT UNSIGNED NULL,
  changed_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_osh_order (order_id, changed_at),
  CONSTRAINT fk_osh_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

---

## 4. Availability algorithm - DESIGN (slot generation shape follows Easy!Appointments, CITED)

Reference implementation shape: working plan -> free periods (minus breaks and existing appointments) ->
`generate_available_hours()` -> `consider_book_advance_timeout()`, from
https://raw.githubusercontent.com/alextselegidis/easyappointments/master/application/libraries/Availability.php .
Our version adds the restaurant-specific parts: capacity fit, pacing, and table combinations.

### 4.1 Interface

```
INPUT : date (Y-m-d), desired_time (HH:MM | null), party_size (int), room_type_id (int),
        exclude_reservation_id (int|null)   // set when EDITING, so a reservation does not block itself
OUTPUT: [ { slot_start, slot_end, room_type_id,
            options: [ { kind: 'table'|'group', id, label, capacity_max, fit_score } ],
            best_option, remaining_capacity } ]
```

### 4.2 Pseudocode

```
function findAvailability(date, desired_time, party_size, room_type_id, exclude_id = null):

  # ---- 0. guard rails (fail fast, cheapest checks first) ----
  cfg = settings_all()
  if party_size > cfg.max_party_online:        return ERROR('EVENT_REQUEST_REQUIRED')
  rt = room_type(room_type_id)
  if party_size < rt.min_party:                return ERROR('BELOW_ROOM_TYPE_MIN', rt.min_party)
  if rt.max_party and party_size > rt.max_party:return ERROR('ABOVE_ROOM_TYPE_MAX')
  if date > today + cfg.max_lead_time_days:    return ERROR('TOO_FAR_AHEAD')
  if venueBlackedOut(date, room_type_id):      return ERROR('BLACKOUT', reason)

  # ---- 1. candidate slot grid from opening_hours ----
  slots = []
  for svc in opening_hours(weekday_of(date), room_type_id):      # lunch + dinner rows
     if svc.is_closed: continue
     open_dt  = datetime(date, svc.open_time)
     close_dt = datetime(date, svc.close_time); if close_dt <= open_dt: close_dt += 1 day
     last_seating = close_dt - cfg.last_seating_before_close_min
     t = ceilToInterval(open_dt, cfg.slot_interval_min)
     while t <= last_seating:
        slots.push(t); t += cfg.slot_interval_min minutes

  # ---- 2. lead time (CITED analogue: consider_book_advance_timeout) ----
  earliest = now() + cfg.min_lead_time_min minutes
  slots = [s for s in slots if s >= earliest]

  # ---- 3. window per slot, using the party-size-resolved turn time ----
  turn   = resolveTurnTime(room_type_id, party_size)     # turn_times -> type default -> global default
  buffer = cfg.buffer_min
  for s in slots:
     s.ends_at      = s + turn
     s.blocks_until = s.ends_at + buffer

  # ---- 4. table-level exclusion, ONE query per slot batch (see 4.3) ----
  for s in slots:
     s.free_tables = freeTablesForWindow(room_type_id, s, s.blocks_until, exclude_id)

     # ---- 5. capacity fit ----
     s.options = [ t for t in s.free_tables
                     if t.capacity_max >= party_size and t.capacity_min <= party_size ]

     # ---- 6. best-fit ranking: never burn a 10-seat VIP on a party of 2 ----
     for t in s.options:
        waste       = t.capacity_max - party_size
        t.fit_score = waste * 10 + (t.priority / 100) + (t.kind == 'group' ? 1000 : 0)
     sort s.options by fit_score ASC            # lowest waste wins; single tables beat combinations

     # ---- 7. combinations only if nothing single fits ----
     if s.options is empty:
        s.options = freeGroupsForWindow(room_type_id, party_size, s, s.blocks_until, exclude_id)
        # a group is free only if EVERY member table is free for the window; blocks_until += group.setup_min

     # ---- 8. pacing / covers cap (independent of physical capacity) ----
     p = pacingFor(date, s)
     if coversStartingIn(s) + party_size > p.max_covers:          s.options = []
     if reservationsStartingIn(s)   + 1   > p.max_reservations:   s.options = []

  return [s for s in slots if s.options not empty]
```

Complexity: with a 15-min grid over a 6-hour service (24 slots) and a batched exclusion query, this is
O(1) SQL round trips for the table scan plus O(slots) cheap aggregate lookups. For the demo, do **one**
batched query (4.3) and bucket the results in PHP.

### 4.3 The overlap exclusion SQL (the classic predicate)

The predicate is Allen's `overlaps` relation on half-open intervals
(https://en.wikipedia.org/wiki/Allen%27s_interval_algebra): two intervals `[a1,a2)` and `[b1,b2)` collide iff
`a1 < b2 AND a2 > b1`. Half-open is deliberate: a reservation ending exactly at 20:30 does **not** block one
starting at 20:30.

```sql
-- Free tables of a given room type for ONE window.
-- :win_start = slot start, :win_end = blocks_until (turn time + buffer)
SELECT  t.id, t.code, t.capacity_min, t.capacity_max, t.priority,
        r.name AS room_name, rt.code AS room_type_code
FROM    `tables` t
JOIN    rooms      r  ON r.id  = t.room_id
JOIN    room_types rt ON rt.id = r.room_type_id
WHERE   t.is_active = 1
  AND   r.is_active = 1
  AND   rt.id = :room_type_id
  AND   t.capacity_max >= :party_size
  AND   t.capacity_min <= :party_size

  -- (a) no overlapping live reservation
  AND NOT EXISTS (
        SELECT 1
        FROM   reservation_tables rsvt
        JOIN   reservations res ON res.id = rsvt.reservation_id
        WHERE  rsvt.table_id = t.id
          AND  res.status IN ('pending','confirmed','seated')
          AND  res.id <> COALESCE(:exclude_reservation_id, 0)
          AND  :win_start  < res.blocks_until      --  a1 < b2
          AND  :win_end    > res.starts_at         --  a2 > b1
  )

  -- (b) no overlapping LIVE hold (someone is mid-form right now)
  AND NOT EXISTS (
        SELECT 1
        FROM   holds h
        WHERE  h.table_id   = t.id
          AND  h.status     = 'active'
          AND  h.expires_at > NOW()
          AND  h.session_id <> :my_session_id      -- my own hold must not hide my own slot
          AND  :win_start < h.blocks_until
          AND  :win_end   > h.starts_at
  )

  -- (c) not blacked out at venue / room_type / room / table scope
  AND NOT EXISTS (
        SELECT 1
        FROM   blackout_dates b
        WHERE  b.blocks_booking = 1
          AND  :win_start < b.ends_at
          AND  :win_end   > b.starts_at
          AND (b.scope = 'venue'
            OR (b.scope = 'room_type' AND b.scope_id = rt.id)
            OR (b.scope = 'room'      AND b.scope_id = r.id)
            OR (b.scope = 'table'     AND b.scope_id = t.id))
  )
ORDER BY (t.capacity_max - :party_size) ASC, t.priority ASC, t.id ASC;   -- best fit first
```

Index support: `reservation_tables(table_id)` drives (a) and `reservations.ix_res_window(starts_at, blocks_until)`
bounds it; `holds.ix_holds_live(table_id, status, expires_at, starts_at, blocks_until)` makes (b) index-only;
`blackout_dates.ix_blackout_range` bounds (c).

Batched variant for a whole day (one round trip, bucket in PHP): drop the `:win_*` params, instead select every
live reservation and hold for the date and subtract in PHP.

```sql
SELECT rsvt.table_id, res.starts_at, res.blocks_until
FROM   reservation_tables rsvt
JOIN   reservations res ON res.id = rsvt.reservation_id
WHERE  res.status IN ('pending','confirmed','seated')
  AND  res.starts_at    < :day_end
  AND  res.blocks_until > :day_start
UNION ALL
SELECT h.table_id, h.starts_at, h.blocks_until
FROM   holds h
WHERE  h.status='active' AND h.expires_at > NOW()
  AND  h.starts_at < :day_end AND h.blocks_until > :day_start;
```

Combination availability (all member tables must be free):

```sql
SELECT  g.id, g.name, g.capacity_min, g.capacity_max, g.setup_min
FROM    table_groups g
JOIN    rooms r ON r.id = g.room_id
WHERE   g.is_active = 1 AND r.room_type_id = :room_type_id
  AND   g.capacity_max >= :party_size AND g.capacity_min <= :party_size
  AND   NOT EXISTS (                      -- any busy member disqualifies the whole group
        SELECT 1
        FROM   table_group_members m
        JOIN   reservation_tables rsvt ON rsvt.table_id = m.table_id
        JOIN   reservations res        ON res.id = rsvt.reservation_id
        WHERE  m.table_group_id = g.id
          AND  res.status IN ('pending','confirmed','seated')
          AND  :win_start < res.blocks_until AND :win_end > res.starts_at
  )
  AND   NOT EXISTS (
        SELECT 1
        FROM   table_group_members m
        JOIN   holds h ON h.table_id = m.table_id
        WHERE  m.table_group_id = g.id
          AND  h.status='active' AND h.expires_at > NOW()
          AND  :win_start < h.blocks_until AND :win_end > h.starts_at
  )
ORDER BY (g.capacity_max - :party_size) ASC, g.id ASC;
```

Pacing check:

```sql
SELECT COALESCE(SUM(party_size),0) AS covers, COUNT(*) AS res_count
FROM   reservations
WHERE  status IN ('pending','confirmed','seated')
  AND  starts_at >= :slot_start
  AND  starts_at <  :slot_start + INTERVAL :slot_interval_min MINUTE;
```

---

## 5. Reservation state machine - DESIGN

```
                 (manager approve)            (host)            (server/host)
  waitlisted --> pending --> confirmed --> seated --> completed
       |            |            |            |
       |            v            v            v
       +------> cancelled    cancelled    cancelled(rare, comped)
                    ^            |
                    |            v
                 (expiry)     no_show
```

| From | To | Allowed actor roles | Side effects |
|---|---|---|---|
| (new) | `pending` | guest, host, manager, admin | hold consumed; confirmation code generated; email/SMS stub; deposit marked `required` if room_type.deposit_cents > 0 |
| (new) | `waitlisted` | guest, host | no table held; `waitlist_rank = MAX(rank)+1` for that date+window |
| (new) | `confirmed` | host, manager, admin (phone/walk-in) | skips pending when staff books directly |
| `pending` | `confirmed` | manager (if `requires_approval`), system (auto, if deposit paid / no approval needed) | table assignment becomes firm; guest notified; counts toward pacing |
| `pending` | `cancelled` | guest, host, manager, system (deposit/approval timeout) | `reservation_tables` rows released; **waitlist auto-promotion triggered** |
| `pending`/`confirmed` | `cancelled` | guest (until `cancel_cutoff`), host, manager | deposit -> `refunded` if before cutoff, `forfeited` after; waitlist promotion triggered |
| `confirmed` | `seated` | host, server | `seated_at = NOW()`; **an `orders` row is auto-created** (`status='open'`, bound to `table_id`) so the kitchen dashboard sees the table; floor plan turns the table red |
| `confirmed` | `no_show` | host, manager, system (after `no_show_grace_min` past `starts_at`) | `guests.no_show_count + 1`; deposit `forfeited`; table released immediately; waitlist promotion triggered |
| `seated` | `completed` | server, host, manager | `completed_at = NOW()`; order must be `paid` or `void`; table freed early, which can free a slot for the waitlist |
| `waitlisted` | `pending`/`confirmed` | system (auto-promotion), host | hold created for the freed table, guest notified with a TTL to accept |
| any | `cancelled` | admin | audit row mandatory with `reason` |

Rules that make the machine safe:
- **Every** transition writes a `reservation_status_history` row (from, to, actor, reason). The admin dashboard
  renders this as a timeline; judges love an audit trail.
- Transitions are validated by a single allow-list map in PHP (`ALLOWED[$from][] = $to`) plus a role check.
  An illegal transition is a 422, not a silent no-op.
- Terminal states: `completed`, `cancelled`, `no_show`. Nothing leaves them (reopening = new reservation).
- Only `pending`, `confirmed`, `seated` occupy a table. This exact list is hardcoded in every overlap query
  (section 4.3) - keep it in one PHP constant `Reservation::BLOCKING_STATUSES` and interpolate it, so the set
  can never drift between queries.

```sql
-- Seating side effect, one transaction
START TRANSACTION;
UPDATE reservations
   SET status='seated', seated_at=NOW(), version=version+1
 WHERE id=:id AND status='confirmed' AND version=:seen_version;   -- 0 rows => 409, reload
INSERT INTO orders (reservation_id, table_id, opened_by, status)
SELECT :id, rt.table_id, :user_id, 'open'
FROM   reservation_tables rt WHERE rt.reservation_id = :id LIMIT 1;
INSERT INTO reservation_status_history (reservation_id, from_status, to_status, actor_user_id)
VALUES (:id, 'confirmed', 'seated', :user_id);
COMMIT;
```

---

## 6. Business rules worth demoing - DESIGN

| # | Rule | Implementation | Demo moment |
|---|---|---|---|
| 1 | **VIP minimum party / deposit** | `room_types.min_party`, `room_types.deposit_cents`; availability returns `BELOW_ROOM_TYPE_MIN` before any SQL scan; deposit sets `deposit_status='required'` and holds the reservation in `pending` | Try to book VIP for 2 -> instant, explained refusal |
| 2 | **Group bookings need manager approval** | `room_types.requires_approval=1` on `large_group`/`private_dining`, or `party_size >= 8`; sets `approval_state='awaiting'`, stays `pending`, appears in an admin approvals queue | Book a 9-top, switch to manager login, approve, guest view flips to confirmed |
| 3 | **Lead time limits** | `settings.min_lead_time_min` (60) and `max_lead_time_days` (60); applied in pseudocode step 2 (CITED analogue: Easy!Appointments `consider_book_advance_timeout`) | Slots inside the next hour simply are not offered |
| 4 | **Last seating before close** | `settings.last_seating_before_close_min`; grid stops early so no party is seated 10 min before close | 21:45 slot missing even though the venue closes at 22:00 |
| 5 | **Max party before it becomes an event** | `settings.max_party_online` (10) -> `EVENT_REQUEST_REQUIRED`, routes to an event-enquiry form instead of the booking flow | Enter 24 guests -> different, graceful path |
| 6 | **Pacing cap** | `pacing_rules` / `settings.max_covers_per_slot`; slot hidden when the kitchen is saturated even though tables are free | Set cap to 2 live, refresh, 19:00 vanishes |
| 7 | **Hold TTL countdown** | `holds.expires_at`, JS timer on the form, 410 on expiry | Open two browsers, both see 1 VIP left, one wins, the other gets a clean "slot just taken" |
| 8 | **Waitlist auto-promotion** | On any transition to `cancelled`/`no_show`, run the promoter: find the lowest `waitlist_rank` waitlisted reservation for that date whose `party_size` fits the freed table and whose requested time is within `settings.waitlist_promote_window_min`; create a hold for it, notify, and give the guest a TTL to accept | Cancel a VIP booking -> a waitlisted party is promoted on screen within one poll |
| 9 | **Repeat no-show friction** | `guests.no_show_count >= 2` forces `deposit_status='required'` regardless of room type | Shows the data model earning its keep |
| 10 | **Blackout dates** | `blackout_dates` with scope venue/room_type/room/table; `blocks_booking=0` variant shows an informational banner | Black out the terrace for rain, terrace disappears, rest of the venue unaffected |

```sql
-- Rule 8, the promoter query, run right after a release
SELECT r.id, r.code, r.party_size, r.starts_at
FROM   reservations r
WHERE  r.status = 'waitlisted'
  AND  r.room_type_id = :freed_room_type_id
  AND  r.party_size BETWEEN :freed_capacity_min AND :freed_capacity_max
  AND  r.starts_at BETWEEN DATE_SUB(:freed_slot, INTERVAL :win MINUTE)
                       AND DATE_ADD(:freed_slot, INTERVAL :win MINUTE)
ORDER BY r.waitlist_rank ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;   -- SKIP LOCKED: two concurrent cancellations never promote the same party twice
```
`SKIP LOCKED` semantics per https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html .

---

## 7. API surface the three front-ends share - DESIGN

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/api/availability?date&time&party_size&room_type_id` | public | section 4 output; cacheable for 10 s |
| POST | `/api/holds` | public | section 2.4 step 1; returns `hold_token` + `expires_at` |
| DELETE | `/api/holds/{token}` | public | explicit release when the guest backs out |
| POST | `/api/reservations` | public | section 2.4 step 2; 409 SLOT_TAKEN / 410 HOLD_EXPIRED |
| PATCH | `/api/reservations/{id}/status` | host/server/manager | state machine + optimistic `version` |
| GET | `/api/floorplan?date&time` | host/manager | tables + live status for the canvas |
| GET | `/api/kitchen/tickets` | kitchen | `orders` + `order_items` where status in (sent_to_kitchen, preparing) |
| GET | `/api/admin/approvals` | manager | `approval_state='awaiting'` |

Error contract (DESIGN): every failure returns `{ "error": CODE, "message": str, "detail": {...} }` with
machine-readable `CODE` from a fixed list, so the vanilla-JS front end can render precise, friendly text.

## 8. Testable invariants (what the judges can be invited to break) - DESIGN

1. No two live reservations share a `table_id` with overlapping `[starts_at, blocks_until)`. Verifiable:
```sql
SELECT a.reservation_id, b.reservation_id
FROM reservation_tables a
JOIN reservation_tables b ON a.table_id=b.table_id AND a.reservation_id<b.reservation_id
JOIN reservations ra ON ra.id=a.reservation_id
JOIN reservations rb ON rb.id=b.reservation_id
WHERE ra.status IN ('pending','confirmed','seated')
  AND rb.status IN ('pending','confirmed','seated')
  AND ra.starts_at < rb.blocks_until AND ra.blocks_until > rb.starts_at;
-- MUST return 0 rows, always
```
2. `party_size` always within `[capacity_min, capacity_max]` of the assigned table or group.
3. Every `reservations.status` change has a matching `reservation_status_history` row.
4. No `seated` reservation without an `orders` row.
5. Covers starting in any slot never exceed the effective pacing cap.
6. A load test of N parallel `POST /api/holds` for the same last VIP room yields exactly 1 success and N-1 409s.

