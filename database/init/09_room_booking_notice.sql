-- Upgrade the previous room defaults without overwriting other custom notice values.
UPDATE room_types SET min_notice_hours = 12
WHERE (code = 'vip' AND min_notice_hours = 48)
   OR (code = 'group' AND min_notice_hours = 24);
