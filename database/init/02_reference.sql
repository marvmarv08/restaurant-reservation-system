-- P0 policy, inserted only when absent so later staff edits survive reruns.
INSERT INTO room_types (id, code, name, description, min_party, max_party, min_notice_hours, min_spend_cents, sort_order) VALUES
  (1, 'vip', 'VIP Rooms', 'Private suites with dedicated host.', 2, 10, 12, 650000, 1),
  (2, 'common', 'Main Dining', 'Open dining room around the hearth.', 1, 4, 0, 0, 2),
  (3, 'group', 'Group Tables', 'Communal tables for larger parties.', 5, 16, 12, 320000, 3),
  (4, 'terrace', 'Terrace & Bar', 'Open-air harbour-side seating.', 1, 6, 0, 0, 4)
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO rooms (id, code, room_type_id, name, floor_x, floor_y, floor_w, floor_h) VALUES
  (1, 'r_vip', 1, 'Suites', 40, 40, 280, 300),
  (2, 'r_common', 2, 'Main Dining', 350, 40, 430, 420),
  (3, 'r_group', 3, 'The Long Room', 40, 370, 280, 290),
  (4, 'r_terrace', 4, 'Terrace', 810, 40, 150, 620)
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO settings (skey, svalue, value_type) VALUES
  ('venue_timezone', 'Asia/Manila', 'string'),
  ('slot_interval_min', '15', 'int'),
  ('buffer_min', '15', 'int'),
  ('hold_ttl_sec', '600', 'int'),
  ('min_lead_time_min', '60', 'int'),
  ('max_lead_time_days', '60', 'int'),
  ('max_party_online', '16', 'int'),
  ('max_covers_per_slot', '40', 'int'),
  ('max_reservations_per_slot', '8', 'int'),
  ('cancel_cutoff_min', '120', 'int'),
  ('last_seating_time', '21:45', 'time'),
  ('no_show_grace_min', '20', 'int'),
  ('manager_approval_party_min', '13', 'int')
ON DUPLICATE KEY UPDATE skey = skey;

-- 0=Sunday, 1=Monday. The Monday row records the closure explicitly.
INSERT INTO opening_hours (id, weekday, open_time, close_time, service_name, is_closed) VALUES
  (1, 0, '17:30:00', '23:30:00', 'dinner', FALSE),
  (2, 1, '17:30:00', '23:30:00', 'dinner', TRUE),
  (3, 2, '17:30:00', '23:30:00', 'dinner', FALSE),
  (4, 3, '17:30:00', '23:30:00', 'dinner', FALSE),
  (5, 4, '17:30:00', '23:30:00', 'dinner', FALSE),
  (6, 5, '17:30:00', '23:30:00', 'dinner', FALSE),
  (7, 6, '17:30:00', '23:30:00', 'dinner', FALSE)
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO turn_times (party_min, party_max, turn_time_min) VALUES
  (1, 2, 75), (3, 4, 90), (5, 6, 105), (7, 10, 120), (11, 16, 150)
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO pacing_rules (code, weekday, window_start, window_end, max_covers, max_reservations) VALUES
  ('dinner-default', NULL, '17:30:00', '21:45:00', 40, 8)
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO roles (id, code, name) VALUES
  (1, 'admin', 'Owner / administrator'),
  (2, 'manager', 'Manager'),
  (3, 'host', 'Host'),
  (4, 'server', 'Server'),
  (5, 'kitchen', 'Kitchen')
ON DUPLICATE KEY UPDATE id = id;
