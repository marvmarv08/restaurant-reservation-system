<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/autoload.php';
$config = require dirname(__DIR__) . '/config/database.php';
if (getenv('BOOKING_TEST_MODE') !== 'isolated' || $config['database'] !== 'tablebook_p3_test') {
    throw new RuntimeException('Curated-menu checks are restricted to the existing isolated preview.');
}
$pdo = App\Core\Database::connect($config);
$root = dirname(__DIR__);
$manifest = json_decode(file_get_contents($root . '/database/catalogs/bella-vista-menu-20261107.json'), true, 512, JSON_THROW_ON_ERROR);
function demand(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}
function preservedTables(PDO $pdo): array {
    $hashes = [];
    foreach ($pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $table) {
        if (in_array($table, ['menu_items', 'menu_categories'], true)) continue;
        $rows = $pdo->query('SELECT * FROM `' . str_replace('`', '``', $table) . '`')->fetchAll();
        $canonical = array_map(fn($row) => json_encode($row, JSON_THROW_ON_ERROR), $rows);
        sort($canonical, SORT_STRING);
        $hashes[$table] = ['count' => count($rows), 'hash' => hash('sha256', implode("\n", $canonical))];
    }
    ksort($hashes);
    return $hashes;
}
$backup = $root . '/.private/menu-refresh-before-20261107.json';
if (in_array('--snapshot', $argv, true)) {
    $target = '/tmp/menu-refresh-before-20261107.json';
    demand(!file_exists($target), 'Existing menu snapshot must not be overwritten.');
    $before = ['items' => $pdo->query('SELECT * FROM menu_items ORDER BY id')->fetchAll(), 'categories' => $pdo->query('SELECT * FROM menu_categories ORDER BY id')->fetchAll(), 'preserved_tables' => preservedTables($pdo)];
    demand(file_put_contents($target, json_encode($before, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT)) !== false, 'Cannot save menu backup.');
    chmod($target, 0600);
    echo 'PASS: private menu snapshot and ' . count($before['preserved_tables']) . " unrelated-table fingerprints saved.\n";
    exit;
}
$active = $pdo->query('SELECT m.*, c.code AS category_code FROM menu_items m JOIN menu_categories c ON c.id=m.category_id WHERE c.is_active=1 ORDER BY m.sort_order,m.id')->fetchAll();
demand(count($active) === count($manifest['items']), 'Expected 24 curated menu rows; found ' . count($active));
$byCode = array_column($active, null, 'code');
$categoryCounts = [];
foreach ($manifest['items'] as $expected) {
    $row = $byCode[$expected['code']] ?? null;
    demand($row !== null, 'Missing curated dish ' . $expected['code']);
    foreach (['name', 'description', 'image_path', 'station'] as $field) demand($row[$field] === $expected[$field], 'Mismatch: ' . $expected['code'] . '/' . $field);
    demand((int)$row['price_cents'] === $expected['price_cents'] && (int)$row['is_available'] === 1, 'Price/availability mismatch.');
    demand($row['category_code'] === $expected['category'], 'Category mismatch.');
    demand(json_decode($row['tags_json'], true) === $expected['tags'], 'Dietary tags mismatch.');
    $categoryCounts[$row['category_code']] = ($categoryCounts[$row['category_code']] ?? 0) + 1;
}
demand(count($categoryCounts) === 3 && min($categoryCounts) >= 3, 'All three assigned categories need at least three dishes.');
$before = json_decode(file_get_contents($backup), true, 512, JSON_THROW_ON_ERROR);
foreach ($before['items'] as $old) {
    $q = $pdo->prepare('SELECT * FROM menu_items WHERE id=?'); $q->execute([$old['id']]); $row = $q->fetch();
    demand($row !== false, 'Historical menu identity deleted.');
    foreach (['id', 'code', 'name', 'description', 'price_cents', 'station', 'image_path', 'tags_json'] as $field) demand($row[$field] === $old[$field], 'Historical menu content overwritten: ' . $field);
}
demand(preservedTables($pdo) === $before['preserved_tables'], 'Unrelated application tables changed during the menu update.');
echo 'PASS: 24 exact dishes, three compliant categories, original identities and unrelated-table fingerprints preserved.' . "\n";
