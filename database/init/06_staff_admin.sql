-- Monotonic revision permanently invalidates earlier sessions after account changes.
SET @staff_epoch_ddl = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE users ADD COLUMN auth_version INT UNSIGNED NOT NULL DEFAULT 1',
  'SELECT 1') FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'auth_version');
PREPARE staff_epoch_stmt FROM @staff_epoch_ddl;
EXECUTE staff_epoch_stmt;
DEALLOCATE PREPARE staff_epoch_stmt;

CREATE TABLE IF NOT EXISTS staff_activation_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL, used_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_activation_user (user_id),
  CONSTRAINT fk_activation_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS staff_login_limits (
  key_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  attempts INT UNSIGNED NOT NULL DEFAULT 0, window_started_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS staff_security_lock (id TINYINT UNSIGNED PRIMARY KEY) ENGINE=InnoDB;
INSERT IGNORE INTO staff_security_lock (id) VALUES (1);
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, actor_user_id INT UNSIGNED NULL,
  actor_role VARCHAR(24) NULL, action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(32) NOT NULL, entity_id VARCHAR(64) NULL,
  before_json JSON NULL, after_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_audit_created (created_at, id),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS waitlist_offers (
  reservation_id BIGINT UNSIGNED PRIMARY KEY, hold_id BIGINT UNSIGNED NOT NULL UNIQUE,
  offered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_offer_res FOREIGN KEY (reservation_id) REFERENCES reservations(id),
  CONSTRAINT fk_offer_hold FOREIGN KEY (hold_id) REFERENCES holds(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS staff_requests (
  user_id INT UNSIGNED NOT NULL, request_key CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  reservation_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, request_key),
  CONSTRAINT fk_staff_request_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_staff_request_res FOREIGN KEY (reservation_id) REFERENCES reservations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
