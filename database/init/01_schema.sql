-- Lumina demo schema. Re-runnable against an existing P1 volume without dropping data.
CREATE TABLE IF NOT EXISTS room_types (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL, description TEXT, min_party SMALLINT UNSIGNED NOT NULL,
  max_party SMALLINT UNSIGNED NOT NULL, min_notice_hours SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  min_spend_cents INT UNSIGNED NOT NULL DEFAULT 0, requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order SMALLINT NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS rooms (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(32) NOT NULL UNIQUE,
  room_type_id INT UNSIGNED NOT NULL, name VARCHAR(80) NOT NULL,
  floor_x SMALLINT NOT NULL DEFAULT 0, floor_y SMALLINT NOT NULL DEFAULT 0,
  floor_w SMALLINT UNSIGNED NOT NULL DEFAULT 1000, floor_h SMALLINT UNSIGNED NOT NULL DEFAULT 700,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_rooms_type FOREIGN KEY (room_type_id) REFERENCES room_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS `tables` (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, room_id INT UNSIGNED NOT NULL,
  code VARCHAR(16) NOT NULL UNIQUE, label VARCHAR(32) NOT NULL,
  capacity_min SMALLINT UNSIGNED NOT NULL, capacity_max SMALLINT UNSIGNED NOT NULL,
  is_joinable BOOLEAN NOT NULL DEFAULT FALSE,
  shape ENUM('round','square','rect','booth','counter') NOT NULL DEFAULT 'rect',
  pos_x SMALLINT NOT NULL DEFAULT 0, pos_y SMALLINT NOT NULL DEFAULT 0,
  pos_w SMALLINT UNSIGNED NULL, pos_h SMALLINT UNSIGNED NULL, radius SMALLINT UNSIGNED NULL,
  priority SMALLINT NOT NULL DEFAULT 100, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  KEY ix_tables_room_capacity (room_id, capacity_max, capacity_min),
  CONSTRAINT fk_tables_room FOREIGN KEY (room_id) REFERENCES rooms(id),
  CONSTRAINT chk_table_capacity CHECK (capacity_min >= 1 AND capacity_max >= capacity_min)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS table_groups (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(32) NOT NULL UNIQUE,
  room_id INT UNSIGNED NOT NULL, name VARCHAR(80) NOT NULL,
  capacity_min SMALLINT UNSIGNED NOT NULL, capacity_max SMALLINT UNSIGNED NOT NULL,
  setup_min SMALLINT UNSIGNED NOT NULL DEFAULT 10, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_tgroups_room FOREIGN KEY (room_id) REFERENCES rooms(id),
  CONSTRAINT chk_group_capacity CHECK (capacity_min >= 1 AND capacity_max >= capacity_min)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS table_group_members (
  table_group_id INT UNSIGNED NOT NULL, table_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (table_group_id, table_id), KEY ix_tgm_table (table_id),
  CONSTRAINT fk_tgm_group FOREIGN KEY (table_group_id) REFERENCES table_groups(id),
  CONSTRAINT fk_tgm_table FOREIGN KEY (table_id) REFERENCES `tables`(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS settings (
  skey VARCHAR(64) PRIMARY KEY, svalue VARCHAR(255) NOT NULL,
  value_type ENUM('int','string','bool','json','time') NOT NULL DEFAULT 'string',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS opening_hours (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, room_type_id INT UNSIGNED NULL,
  weekday TINYINT UNSIGNED NOT NULL, open_time TIME NOT NULL, close_time TIME NOT NULL,
  service_name VARCHAR(32) NOT NULL DEFAULT 'dinner', is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY uq_hours (room_type_id, weekday, service_name),
  CONSTRAINT fk_hours_type FOREIGN KEY (room_type_id) REFERENCES room_types(id),
  CONSTRAINT chk_weekday CHECK (weekday <= 6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS turn_times (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, party_min SMALLINT UNSIGNED NOT NULL UNIQUE,
  party_max SMALLINT UNSIGNED NOT NULL, turn_time_min SMALLINT UNSIGNED NOT NULL,
  CONSTRAINT chk_turn_range CHECK (party_max >= party_min)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS pacing_rules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(32) NOT NULL UNIQUE,
  weekday TINYINT UNSIGNED NULL, window_start TIME NOT NULL, window_end TIME NOT NULL,
  max_covers SMALLINT UNSIGNED NOT NULL, max_reservations SMALLINT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS blackout_dates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL, scope ENUM('venue','room_type','room','table') NOT NULL,
  scope_id INT UNSIGNED NULL, reason VARCHAR(160) NOT NULL,
  blocks_booking BOOLEAN NOT NULL DEFAULT TRUE,
  KEY ix_blackout_range (starts_at, ends_at), KEY ix_blackout_scope (scope, scope_id),
  CONSTRAINT chk_blackout_range CHECK (ends_at > starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS roles (
  id TINYINT UNSIGNED PRIMARY KEY, code VARCHAR(24) NOT NULL UNIQUE, name VARCHAR(48) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, role_id TINYINT UNSIGNED NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE, password_hash VARCHAR(255) NULL,
  full_name VARCHAR(120) NOT NULL, is_active BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT chk_active_user_hash CHECK (is_active = FALSE OR password_hash IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS guests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id INT UNSIGNED NULL,
  seed_key VARCHAR(64) NULL UNIQUE, full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(32) NOT NULL, email VARCHAR(190) NULL, notes TEXT NULL,
  vip_tier TINYINT UNSIGNED NOT NULL DEFAULT 0,
  no_show_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_guests_phone (phone), KEY ix_guests_email (email),
  CONSTRAINT fk_guests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS reservations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code CHAR(10) NOT NULL UNIQUE,
  seed_key VARCHAR(64) NULL UNIQUE,
  guest_id INT UNSIGNED NOT NULL, room_type_id INT UNSIGNED NOT NULL,
  table_group_id INT UNSIGNED NULL, party_size SMALLINT UNSIGNED NOT NULL,
  starts_at DATETIME NOT NULL, ends_at DATETIME NOT NULL, blocks_until DATETIME NOT NULL,
  turn_time_min SMALLINT UNSIGNED NOT NULL,
  status ENUM('pending','confirmed','seated','completed','cancelled','no_show','waitlisted') NOT NULL DEFAULT 'pending',
  source ENUM('web','phone','walk_in','admin') NOT NULL DEFAULT 'web',
  deposit_cents INT UNSIGNED NOT NULL DEFAULT 0,
  deposit_status ENUM('none','required','paid','refunded','forfeited') NOT NULL DEFAULT 'none',
  approval_state ENUM('not_required','awaiting','approved','rejected') NOT NULL DEFAULT 'not_required',
  special_requests TEXT NULL, seated_at DATETIME NULL, completed_at DATETIME NULL,
  cancelled_at DATETIME NULL, waitlist_rank INT UNSIGNED NULL,
  waitlist_offer_state ENUM('none','offered','accepted','expired') NOT NULL DEFAULT 'none',
  waitlist_offer_expires_at DATETIME NULL, version INT UNSIGNED NOT NULL DEFAULT 1,
  created_by INT UNSIGNED NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_res_window (starts_at, blocks_until), KEY ix_res_status_day (status, starts_at),
  KEY ix_res_guest (guest_id), KEY ix_res_waitlist (status, starts_at, waitlist_rank),
  CONSTRAINT fk_res_guest FOREIGN KEY (guest_id) REFERENCES guests(id),
  CONSTRAINT fk_res_type FOREIGN KEY (room_type_id) REFERENCES room_types(id),
  CONSTRAINT fk_res_group FOREIGN KEY (table_group_id) REFERENCES table_groups(id),
  CONSTRAINT fk_res_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_res_time CHECK (starts_at < ends_at AND ends_at <= blocks_until),
  CONSTRAINT chk_res_party CHECK (party_size BETWEEN 1 AND 16),
  CONSTRAINT chk_res_code CHECK (code REGEXP '^LUM-[A-Z0-9]{6}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS reservation_tables (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, reservation_id BIGINT UNSIGNED NOT NULL,
  table_id INT UNSIGNED NOT NULL, slot_start DATETIME NOT NULL, released_at DATETIME NULL,
  active_slot_start DATETIME GENERATED ALWAYS AS
    (CASE WHEN released_at IS NULL THEN slot_start ELSE NULL END) STORED,
  UNIQUE KEY uq_res_table (reservation_id, table_id),
  UNIQUE KEY uq_table_active_slot (table_id, active_slot_start),
  KEY ix_rt_table (table_id),
  CONSTRAINT fk_rt_res FOREIGN KEY (reservation_id) REFERENCES reservations(id),
  CONSTRAINT fk_rt_table FOREIGN KEY (table_id) REFERENCES `tables`(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS reservation_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, reservation_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(16) NULL, to_status VARCHAR(16) NOT NULL,
  actor_user_id INT UNSIGNED NULL, reason VARCHAR(255) NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_rsh_res (reservation_id, changed_at),
  CONSTRAINT fk_rsh_res FOREIGN KEY (reservation_id) REFERENCES reservations(id),
  CONSTRAINT fk_rsh_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS holds (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, hold_token CHAR(36) NOT NULL UNIQUE,
  table_id INT UNSIGNED NULL, table_group_id INT UNSIGNED NULL,
  starts_at DATETIME NOT NULL, ends_at DATETIME NOT NULL, blocks_until DATETIME NOT NULL,
  party_size SMALLINT UNSIGNED NOT NULL, session_id CHAR(64) NULL,
  waitlist_reservation_id BIGINT UNSIGNED NULL,
  status ENUM('active','consumed','expired','released') NOT NULL DEFAULT 'active',
  expires_at DATETIME NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_holds_live (status, expires_at, starts_at, blocks_until),
  CONSTRAINT fk_holds_table FOREIGN KEY (table_id) REFERENCES `tables`(id),
  CONSTRAINT fk_holds_group FOREIGN KEY (table_group_id) REFERENCES table_groups(id),
  CONSTRAINT fk_holds_waitlist FOREIGN KEY (waitlist_reservation_id) REFERENCES reservations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS hold_tables (
  hold_id BIGINT UNSIGNED NOT NULL, table_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (hold_id, table_id), KEY ix_ht_table (table_id, hold_id),
  CONSTRAINT fk_ht_hold FOREIGN KEY (hold_id) REFERENCES holds(id),
  CONSTRAINT fk_ht_table FOREIGN KEY (table_id) REFERENCES `tables`(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS menu_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL, note VARCHAR(255) NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS menu_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(32) NOT NULL UNIQUE,
  category_id INT UNSIGNED NOT NULL, name VARCHAR(120) NOT NULL,
  description TEXT NULL, price_cents INT UNSIGNED NOT NULL,
  prep_time_min SMALLINT UNSIGNED NOT NULL DEFAULT 15,
  station ENUM('cold','grill','fry','hot','pastry','bar') NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE, image_path VARCHAR(255) NULL,
  tags_json JSON NULL, sort_order SMALLINT NOT NULL DEFAULT 0,
  KEY ix_items_cat (category_id, is_available),
  CONSTRAINT fk_items_cat FOREIGN KEY (category_id) REFERENCES menu_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, reservation_id BIGINT UNSIGNED NULL,
  table_id INT UNSIGNED NOT NULL, opened_by INT UNSIGNED NULL,
  status ENUM('open','sent_to_kitchen','preparing','ready','served','paid','void') NOT NULL DEFAULT 'open',
  subtotal_cents INT UNSIGNED NOT NULL DEFAULT 0, service_cents INT UNSIGNED NOT NULL DEFAULT 0,
  total_cents INT UNSIGNED NOT NULL DEFAULT 0,
  opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, closed_at DATETIME NULL,
  KEY ix_orders_status (status, opened_at), KEY ix_orders_res (reservation_id),
  CONSTRAINT fk_orders_res FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_table FOREIGN KEY (table_id) REFERENCES `tables`(id),
  CONSTRAINT fk_orders_user FOREIGN KEY (opened_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, order_id BIGINT UNSIGNED NOT NULL,
  menu_item_id INT UNSIGNED NOT NULL, qty SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  unit_price_cents INT UNSIGNED NOT NULL, course_no TINYINT UNSIGNED NOT NULL DEFAULT 1,
  notes VARCHAR(255) NULL, status ENUM('queued','preparing','ready','served','void') NOT NULL DEFAULT 'queued',
  KEY ix_oi_order (order_id), KEY ix_oi_status (status),
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_oi_item FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS order_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, order_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(20) NULL, to_status VARCHAR(20) NOT NULL,
  actor_user_id INT UNSIGNED NULL, changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_osh_order (order_id, changed_at),
  CONSTRAINT fk_osh_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_osh_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS outbox (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, reservation_id BIGINT UNSIGNED NULL,
  channel ENUM('email','sms') NOT NULL, recipient VARCHAR(190) NOT NULL,
  subject VARCHAR(190) NULL, body TEXT NOT NULL,
  status ENUM('queued','viewed') NOT NULL DEFAULT 'queued',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_outbox_status (status, created_at),
  CONSTRAINT fk_outbox_res FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
