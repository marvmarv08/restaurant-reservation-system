CREATE TABLE IF NOT EXISTS web_sessions (
    id_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    payload MEDIUMBLOB NOT NULL,
    expires_at BIGINT UNSIGNED NOT NULL,
    INDEX idx_web_sessions_expiry (expires_at)
) ENGINE=InnoDB;
