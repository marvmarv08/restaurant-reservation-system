-- Serialize venue-wide pacing checks before taking physical-table locks.
CREATE TABLE IF NOT EXISTS booking_days (
  service_date DATE PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Makes confirmation retries idempotent: one hold can produce only one booking.
CREATE TABLE IF NOT EXISTS hold_reservations (
  hold_id BIGINT UNSIGNED PRIMARY KEY,
  reservation_id BIGINT UNSIGNED NOT NULL UNIQUE,
  CONSTRAINT fk_hr_hold FOREIGN KEY (hold_id) REFERENCES holds(id),
  CONSTRAINT fk_hr_res FOREIGN KEY (reservation_id) REFERENCES reservations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
