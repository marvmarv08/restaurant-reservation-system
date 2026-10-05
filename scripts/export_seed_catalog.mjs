import fs from 'node:fs';
import vm from 'node:vm';

// Snapshot the prototype's static catalog for the PHP/MySQL demo seed.
const source = fs.readFileSync('prototype/assets/js/data.js', 'utf8');
const end = source.indexOf('/* ---- people ---- */');
if (end < 0) throw new Error('Prototype catalog marker is missing');
const catalog = vm.runInNewContext(source.slice(0, end) + '\nreturn { ROOM_TYPES, ROOMS, TABLES, MENU, CATS };\n})()',
  {}, { timeout: 1000 });
const q = value => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const rows = [
  '-- Generated from prototype/assets/js/data.js by node scripts/export_seed_catalog.mjs.',
  '-- Natural keys and no-op duplicate handling make this safe to rerun.',
];
for (const table of catalog.TABLES) {
  rows.push(`INSERT INTO \`tables\` (room_id, code, label, capacity_min, capacity_max, is_joinable, shape, pos_x, pos_y, pos_w, pos_h, radius, priority)
SELECT id, ${q(table.id)}, ${q(table.label)}, ${table.min}, ${table.max}, ${table.joinable ? 1 : 0}, ${q(table.shape)}, ${table.x}, ${table.y}, ${table.w ?? 'NULL'}, ${table.h ?? 'NULL'}, ${table.r ?? 'NULL'}, ${table.priority}
FROM rooms WHERE code = ${q(table.roomId)} ON DUPLICATE KEY UPDATE \`tables\`.id = \`tables\`.id;`);
}
rows.push(`INSERT INTO table_groups (code, room_id, name, capacity_min, capacity_max, setup_min)
SELECT 'G1-G2', id, 'Long A + Long B', 11, 16, 10 FROM rooms WHERE code = 'r_group'
ON DUPLICATE KEY UPDATE table_groups.id = table_groups.id;`);
for (const code of ['G1', 'G2']) {
  rows.push(`INSERT INTO table_group_members (table_group_id, table_id)
SELECT g.id, t.id FROM table_groups g JOIN \`tables\` t ON t.code = ${q(code)}
WHERE g.code = 'G1-G2' ON DUPLICATE KEY UPDATE table_group_members.table_id = table_group_members.table_id;`);
}
for (let i = 0; i < catalog.CATS.length; i++) {
  const cat = catalog.CATS[i];
  rows.push(`INSERT INTO menu_categories (code, name, note, sort_order) VALUES (${q(cat.id)}, ${q(cat.name)}, ${q(cat.note)}, ${i + 1}) ON DUPLICATE KEY UPDATE id = id;`);
}
for (const item of catalog.MENU) {
  rows.push(`INSERT INTO menu_items (category_id, code, name, description, price_cents, station, image_path, tags_json, sort_order)
SELECT id, ${q('M' + String(item.id).padStart(2, '0'))}, ${q(item.name)}, ${q(item.desc)}, ${item.price * 100}, ${q(item.station)}, ${q(item.img)}, ${q(JSON.stringify(item.tags))}, ${item.id}
FROM menu_categories WHERE code = ${q(item.cat)} ON DUPLICATE KEY UPDATE menu_items.id = menu_items.id;`);
}
for (const [role, name, email] of [
  ['admin', 'Ilaria Moreno', 'ilaria@lumina.test'],
  ['manager', 'Diego Salcedo', 'diego@lumina.test'],
  ['host', 'Mika Tanaka', 'mika@lumina.test'],
  ['kitchen', 'Paolo Reyes', 'paolo@lumina.test'],
  ['server', 'Ana Villaruel', 'ana@lumina.test'],
]) {
  rows.push(`INSERT INTO users (role_id, email, full_name, is_active)
SELECT id, ${q(email)}, ${q(name)}, FALSE FROM roles WHERE code = ${q(role)}
ON DUPLICATE KEY UPDATE users.id = users.id;`);
}
fs.writeFileSync('database/init/03_demo_seed.sql', rows.join('\n\n') + '\n');
console.log(`Exported ${catalog.TABLES.length} tables and ${catalog.MENU.length} menu items.`);
