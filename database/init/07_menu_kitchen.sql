-- Existing enum values retain their numeric order; 'closed' records service closure, not payment.
SET @p6_orders = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE orders MODIFY status ENUM(''open'',''sent_to_kitchen'',''preparing'',''ready'',''served'',''paid'',''void'',''closed'') NOT NULL DEFAULT ''open'', ADD version INT UNSIGNED NOT NULL DEFAULT 1, ADD assigned_server_id INT UNSIGNED NULL, ADD allergy_notes VARCHAR(1000) NOT NULL DEFAULT '''', ADD CONSTRAINT fk_order_server FOREIGN KEY (assigned_server_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1') FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='orders' AND column_name='version');
PREPARE p6_stmt FROM @p6_orders;
EXECUTE p6_stmt;
DEALLOCATE PREPARE p6_stmt;
SET @p6_items = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE order_items ADD item_name VARCHAR(120) NULL, ADD station_snapshot VARCHAR(16) NULL, ADD tags_snapshot JSON NULL',
  'SELECT 1') FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='order_items' AND column_name='item_name');
PREPARE p6_stmt FROM @p6_items;
EXECUTE p6_stmt;
DEALLOCATE PREPARE p6_stmt;

CREATE TABLE IF NOT EXISTS kitchen_tickets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL UNIQUE,
  status ENUM('queued','preparing','ready','served','held','void') NOT NULL DEFAULT 'queued',
  resume_status ENUM('queued','preparing','ready') NULL,
  allergy_snapshot VARCHAR(1000) NOT NULL DEFAULT '',
  booking_notes TEXT NULL,
  fired_at DATETIME NOT NULL, served_at DATETIME NULL,
  KEY ix_ticket_queue (status,fired_at),
  CONSTRAINT fk_ticket_order FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS order_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL, ticket_id BIGINT UNSIGNED NULL,
  action VARCHAR(24) NOT NULL, from_status VARCHAR(24) NULL, to_status VARCHAR(24) NOT NULL,
  actor_user_id INT UNSIGNED NOT NULL, reason VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  KEY ix_order_event (order_id,id),
  CONSTRAINT fk_event_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_event_ticket FOREIGN KEY (ticket_id) REFERENCES kitchen_tickets(id),
  CONSTRAINT fk_event_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS order_actions (
  user_id INT UNSIGNED NOT NULL, request_key CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  order_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id,request_key),
  CONSTRAINT fk_action_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_action_order FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
