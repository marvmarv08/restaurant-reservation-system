CREATE TABLE IF NOT EXISTS reservation_manage_tokens (
  reservation_id BIGINT UNSIGNED PRIMARY KEY,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_manage_res FOREIGN KEY (reservation_id) REFERENCES reservations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Snapshots preserve prior times, parties, status, and physical assignments on modification.
CREATE TABLE IF NOT EXISTS reservation_change_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reservation_id BIGINT UNSIGNED NOT NULL,
  before_json JSON NOT NULL,
  after_json JSON NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_change_res (reservation_id, changed_at),
  CONSTRAINT fk_change_res FOREIGN KEY (reservation_id) REFERENCES reservations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Repair only the known legacy UTF-8 decoding error in the demo dish.
UPDATE menu_items SET
  name = REPLACE(name, CONVERT(0xc383c2a9 USING utf8mb4), CONVERT(0xc3a9 USING utf8mb4)),
  description = REPLACE(description, CONVERT(0xc383c2a9 USING utf8mb4), CONVERT(0xc3a9 USING utf8mb4))
WHERE code = 'M24';
