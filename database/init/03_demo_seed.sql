-- Generated from prototype/assets/js/data.js by node scripts/export_seed_catalog.mjs.

-- Natural keys and no-op duplicate handling make this safe to rerun.

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'V1', 'Suite 1', 2, 6, 0, 'round', 110, 110, NULL, NULL, 42, 3
FROM rooms WHERE code = 'r_vip' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'V2', 'Suite 2', 4, 10, 0, 'round', 240, 130, NULL, NULL, 50, 3
FROM rooms WHERE code = 'r_vip' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'V3', 'Suite 3', 2, 4, 0, 'round', 105, 255, NULL, NULL, 36, 3
FROM rooms WHERE code = 'r_vip' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'V4', 'Suite 4', 4, 8, 0, 'round', 243, 272, NULL, NULL, 45, 3
FROM rooms WHERE code = 'r_vip' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'C1', '12', 1, 2, 0, 'square', 400, 95, 52, 52, NULL, 1
FROM rooms WHERE code = 'r_common' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'C2', '14', 1, 2, 0, 'square', 480, 95, 52, 52, NULL, 1
FROM rooms WHERE code = 'r_common' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'C3', '16', 2, 4, 0, 'square', 575, 95, 66, 62, NULL, 1
FROM rooms WHERE code = 'r_common' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'C4', '18', 2, 4, 0, 'square', 683, 95, 66, 62, NULL, 1
FROM rooms WHERE code = 'r_common' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'C5', '20', 1, 2, 0, 'square', 400, 195, 52, 52, NULL, 1
FROM rooms WHERE code = 'r_common' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'C6', '22', 2, 4, 0, 'square', 480, 190, 66, 62, NULL, 1
FROM rooms WHERE code = 'r_common' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'C7', '24', 2, 4, 0, 'square', 683, 190, 66, 62, NULL, 1
FROM rooms WHERE code = 'r_common' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'C8', '26', 1, 2, 0, 'square', 400, 295, 52, 52, NULL, 1
FROM rooms WHERE code = 'r_common' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'C9', '28', 2, 4, 0, 'square', 480, 290, 66, 62, NULL, 1
FROM rooms WHERE code = 'r_common' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'C10', '30', 2, 4, 0, 'square', 683, 290, 66, 62, NULL, 1
FROM rooms WHERE code = 'r_common' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'C11', '32', 2, 4, 0, 'rect', 565, 380, 96, 54, NULL, 1
FROM rooms WHERE code = 'r_common' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'C12', '34', 2, 4, 0, 'rect', 415, 380, 96, 54, NULL, 1
FROM rooms WHERE code = 'r_common' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'G1', 'Long A', 5, 10, 1, 'rect', 90, 430, 180, 58, NULL, 2
FROM rooms WHERE code = 'r_group' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'G2', 'Long B', 5, 10, 1, 'rect', 90, 530, 180, 58, NULL, 2
FROM rooms WHERE code = 'r_group' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'G3', 'Oak', 6, 16, 0, 'rect', 90, 620, 180, 48, NULL, 2
FROM rooms WHERE code = 'r_group' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'T1', 'B1', 1, 2, 0, 'square', 860, 100, 48, 48, NULL, 1
FROM rooms WHERE code = 'r_terrace' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'T2', 'B2', 1, 2, 0, 'square', 860, 175, 48, 48, NULL, 1
FROM rooms WHERE code = 'r_terrace' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'T3', 'B3', 2, 4, 0, 'square', 860, 255, 60, 56, NULL, 1
FROM rooms WHERE code = 'r_terrace' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'T4', 'B4', 2, 4, 0, 'square', 860, 345, 60, 56, NULL, 1
FROM rooms WHERE code = 'r_terrace' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'T5', 'B5', 2, 6, 0, 'rect', 845, 440, 92, 56, NULL, 1
FROM rooms WHERE code = 'r_terrace' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO `tables` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, 'T6', 'B6', 1, 2, 0, 'square', 860, 540, 48, 48, NULL, 1
FROM rooms WHERE code = 'r_terrace' ON DUPLICATE KEY UPDATE `tables`.id = `tables`.id;

INSERT INTO table_groups (code, room_id, name, capacity_min, capacity_max, setup_min)
SELECT 'G1-G2', id, 'Long A + Long B', 11, 16, 10 FROM rooms WHERE code = 'r_group'
ON DUPLICATE KEY UPDATE table_groups.id = table_groups.id;

INSERT INTO table_group_members (table_group_id, table_id)
SELECT g.id, t.id FROM table_groups g JOIN `tables` t ON t.code = 'G1'
WHERE g.code = 'G1-G2' ON DUPLICATE KEY UPDATE table_group_members.table_id = table_group_members.table_id;

INSERT INTO table_group_members (table_group_id, table_id)
SELECT g.id, t.id FROM table_groups g JOIN `tables` t ON t.code = 'G2'
WHERE g.code = 'G1-G2' ON DUPLICATE KEY UPDATE table_group_members.table_id = table_group_members.table_id;

INSERT INTO menu_categories (code, name, note, sort_order) VALUES ('snacks', 'Opening Bites', 'Served at the counter while you settle', 1) ON DUPLICATE KEY UPDATE id = id;

INSERT INTO menu_categories (code, name, note, sort_order) VALUES ('raw', 'Raw & Cured', 'Cold larder, dressed to order', 2) ON DUPLICATE KEY UPDATE id = id;

INSERT INTO menu_categories (code, name, note, sort_order) VALUES ('fire', 'From the Hearth', 'Everything here meets flame', 3) ON DUPLICATE KEY UPDATE id = id;

INSERT INTO menu_categories (code, name, note, sort_order) VALUES ('comfort', 'The Kitchen', 'Dishes we grew up on, taken seriously', 4) ON DUPLICATE KEY UPDATE id = id;

INSERT INTO menu_categories (code, name, note, sort_order) VALUES ('sweet', 'Sweet', 'Pastry section, Chef Reyes', 5) ON DUPLICATE KEY UPDATE id = id;

INSERT INTO menu_categories (code, name, note, sort_order) VALUES ('drinks', 'Bar', 'Zero-proof marked, ask the bar', 6) ON DUPLICATE KEY UPDATE id = id;

INSERT INTO menu_categories (code, name, note, sort_order) VALUES ('tasting', 'Tasting Menus', 'Whole table, book 48 hours ahead', 7) ON DUPLICATE KEY UPDATE id = id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M01', 'Charred Oyster, Burnt Lime', 'Local oyster over embers, lime ash, finger chilli.', 18000, 'cold', 'oyster', '["shellfish"]', 1
FROM menu_categories WHERE code = 'snacks' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M02', 'Smoked Taro Crisp', 'Taro, coconut vinegar, kalamansi salt.', 14000, 'fry', 'taro', '["vegan"]', 2
FROM menu_categories WHERE code = 'snacks' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M03', 'Pandesal, Cultured Butter', 'Overnight sourdough pandesal, seaweed butter.', 16000, 'cold', 'bread', '["vegetarian","gluten"]', 3
FROM menu_categories WHERE code = 'snacks' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M04', 'Tuna Tartare Tostada', 'Yellowfin, green mango, coconut cream, crisp masa.', 29000, 'cold', 'tartare', '["fish"]', 4
FROM menu_categories WHERE code = 'snacks' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M05', 'Kinilaw of the Day', 'Line-caught fish, cane vinegar, ginger flower, chilli oil.', 42000, 'cold', 'kinilaw', '["fish","signature"]', 5
FROM menu_categories WHERE code = 'raw' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M06', 'Scallop, Calamansi Snow', 'Hand-dived scallop, frozen calamansi, nasturtium.', 46000, 'cold', 'scallop', '["shellfish"]', 6
FROM menu_categories WHERE code = 'raw' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M07', 'Heirloom Tomato, Aged Ube Vinegar', 'Three tomatoes, ube vinegar aged eight months, basil ash.', 34000, 'cold', 'tomato', '["vegan"]', 7
FROM menu_categories WHERE code = 'raw' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M08', 'Beef Tataki, Burnt Onion Dashi', 'Seared wagyu cap, onion dashi, pickled shallot.', 52000, 'cold', 'tataki', '["beef"]', 8
FROM menu_categories WHERE code = 'raw' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M09', 'Whole Lapu-Lapu, Coconut Embers', 'Whole grouper buried in coconut husk coals, forty minutes. For two.', 148000, 'grill', 'grouper', '["fish","signature","for two"]', 9
FROM menu_categories WHERE code = 'fire' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M10', 'Dry-Aged Duck, Honey Lacquer', 'Twenty-one day aged duck, wild honey, charred citrus.', 98000, 'grill', 'duck', '["poultry","signature"]', 10
FROM menu_categories WHERE code = 'fire' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M11', 'Pork Belly, Sugarcane Glaze', 'Twelve-hour belly, sugarcane, pickled papaya.', 72000, 'grill', 'belly', '["pork"]', 11
FROM menu_categories WHERE code = 'fire' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M12', 'Hearth Cabbage, Smoked Bagoong', 'Whole cabbage in the embers, fermented shrimp cream, dill.', 38000, 'grill', 'cabbage', '["shellfish"]', 12
FROM menu_categories WHERE code = 'fire' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M13', 'Bone Marrow, Garlic Rice Crumb', 'Split marrow, toasted garlic rice, herb salad.', 54000, 'grill', 'marrow', '["beef"]', 13
FROM menu_categories WHERE code = 'fire' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M14', 'Grilled Squid, Ink Aioli', 'Whole squid over flame, its own ink, burnt lemon.', 61000, 'grill', 'squid', '["shellfish"]', 14
FROM menu_categories WHERE code = 'fire' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M15', 'Lamb Ribs, Tamarind Lacquer', 'Slow ribs, tamarind, toasted coriander, mint.', 89000, 'grill', 'lamb', '["lamb"]', 15
FROM menu_categories WHERE code = 'fire' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M16', 'Smoked Chicken Adobo', 'Free-range chicken, coconut vinegar, soy, bay, served dark.', 62000, 'hot', 'adobo', '["poultry","signature"]', 16
FROM menu_categories WHERE code = 'comfort' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M17', 'Kare-Kare Oxtail', 'Oxtail, peanut, annatto, banana heart, bagoong.', 84000, 'hot', 'karekare', '["beef","nuts","shellfish"]', 17
FROM menu_categories WHERE code = 'comfort' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M18', 'Sinigang, Watermelon & Tuna Belly', 'Tamarind broth, watermelon, charred tuna belly.', 68000, 'hot', 'sinigang', '["fish"]', 18
FROM menu_categories WHERE code = 'comfort' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M19', 'Laing Risotto, Crab Fat', 'Taro leaf, coconut, crab fat, calamansi zest.', 59000, 'hot', 'laing', '["shellfish"]', 19
FROM menu_categories WHERE code = 'comfort' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M20', 'Pancit of Charred Leeks', 'Hand-pulled noodles, leek ash, soy butter.', 43000, 'hot', 'pancit', '["vegetarian","gluten"]', 20
FROM menu_categories WHERE code = 'comfort' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M21', 'Garlic Rice, Hearth Butter', 'Day-old rice, confit garlic, smoked butter.', 18000, 'hot', 'rice', '["vegetarian"]', 21
FROM menu_categories WHERE code = 'comfort' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M22', 'Charred Greens, Anchovy Cream', 'Seasonal greens, anchovy, lemon, cracked pepper.', 29000, 'hot', 'greens', '["fish"]', 22
FROM menu_categories WHERE code = 'comfort' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M23', 'Burnt Coconut Leche Flan', 'Caramel taken to the edge, coconut cream, sea salt.', 28000, 'pastry', 'flan', '["vegetarian","dairy","signature"]', 23
FROM menu_categories WHERE code = 'sweet' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M24', 'Ube Soufflé, Calamansi Curd', 'Purple yam soufflé, calamansi curd. Twenty minutes.', 34000, 'pastry', 'souffle', '["vegetarian","dairy","eggs"]', 24
FROM menu_categories WHERE code = 'sweet' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M25', 'Mango, Sticky Rice Ice Cream', 'Carabao mango, toasted rice ice cream, coconut tuile.', 26000, 'pastry', 'mango', '["vegetarian","dairy"]', 25
FROM menu_categories WHERE code = 'sweet' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M26', 'Cacao Tart, Barako Cream', 'Single-origin Davao cacao, Barako coffee cream.', 31000, 'pastry', 'tart', '["vegetarian","dairy","gluten"]', 26
FROM menu_categories WHERE code = 'sweet' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M27', 'Pandan Halo-Halo', 'Shaved ice, pandan, nine components, served to share.', 29000, 'pastry', 'halohalo', '["vegetarian","dairy"]', 27
FROM menu_categories WHERE code = 'sweet' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M28', 'Smoked Calamansi Highball', 'Rum, smoked calamansi, soda, pandan oil.', 42000, 'bar', 'highball', '["alcohol","signature"]', 28
FROM menu_categories WHERE code = 'drinks' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M29', 'Tamarind Negroni', 'Gin, tamarind vermouth, bitter orange.', 48000, 'bar', 'negroni', '["alcohol"]', 29
FROM menu_categories WHERE code = 'drinks' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M30', 'Lambanog Old Fashioned', 'Coconut spirit, muscovado, cacao bitters.', 46000, 'bar', 'oldfash', '["alcohol"]', 30
FROM menu_categories WHERE code = 'drinks' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M31', 'Pineapple Tepache, No Alcohol', 'Fermented pineapple, chilli, lime. Zero proof.', 22000, 'bar', 'tepache', '["zero proof"]', 31
FROM menu_categories WHERE code = 'drinks' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M32', 'Pandan Iced Tea', 'Cold-brewed pandan, jasmine, calamansi. Zero proof.', 18000, 'bar', 'icedtea', '["zero proof"]', 32
FROM menu_categories WHERE code = 'drinks' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M33', 'Barako Espresso', 'Liberica from Batangas, pulled short.', 16000, 'bar', 'espresso', '["zero proof"]', 33
FROM menu_categories WHERE code = 'drinks' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M34', 'Eleven Courses of Smoke & Citrus', 'The full progression. Two and a half hours. Whole table only.', 380000, 'grill', 'tasting11', '["signature","whole table"]', 34
FROM menu_categories WHERE code = 'tasting' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M35', 'Seven Courses, Hearth', 'The shorter road through the fire. Ninety minutes.', 240000, 'grill', 'tasting7', '["whole table"]', 35
FROM menu_categories WHERE code = 'tasting' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, 'M36', 'Wine Pairing, Five Glasses', 'Chosen the morning of service. Low intervention.', 190000, 'bar', 'pairing', '["alcohol"]', 36
FROM menu_categories WHERE code = 'tasting' ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;

INSERT INTO users (role_id, email, full_name, is_active)
SELECT id, 'ilaria@lumina.test', 'Ilaria Moreno', FALSE FROM roles WHERE code = 'admin'
ON DUPLICATE KEY UPDATE users.id = users.id;

INSERT INTO users (role_id, email, full_name, is_active)
SELECT id, 'diego@lumina.test', 'Diego Salcedo', FALSE FROM roles WHERE code = 'manager'
ON DUPLICATE KEY UPDATE users.id = users.id;

INSERT INTO users (role_id, email, full_name, is_active)
SELECT id, 'mika@lumina.test', 'Mika Tanaka', FALSE FROM roles WHERE code = 'host'
ON DUPLICATE KEY UPDATE users.id = users.id;

INSERT INTO users (role_id, email, full_name, is_active)
SELECT id, 'paolo@lumina.test', 'Paolo Reyes', FALSE FROM roles WHERE code = 'kitchen'
ON DUPLICATE KEY UPDATE users.id = users.id;

INSERT INTO users (role_id, email, full_name, is_active)
SELECT id, 'ana@lumina.test', 'Ana Villaruel', FALSE FROM roles WHERE code = 'server'
ON DUPLICATE KEY UPDATE users.id = users.id;
