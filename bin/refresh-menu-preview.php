<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/autoload.php';
$config = require dirname(__DIR__) . '/config/database.php';
if (getenv('BOOKING_TEST_MODE') !== 'isolated' || $config['database'] !== 'tablebook_p3_test') {
    throw new RuntimeException('Menu refresh is restricted to the existing isolated preview; main and hosted targets are refused.');
}
$root = dirname(__DIR__);
$menu = json_decode(file_get_contents($root . '/database/catalogs/bella-vista-menu-20261107.json'), true, 512, JSON_THROW_ON_ERROR);
$expectedCategories = ['bv_main', 'bv_appetizers', 'bv_desserts'];
if (array_keys($menu['categories'] ?? []) !== $expectedCategories || count($menu['items'] ?? []) !== 24) {
    throw new RuntimeException('Expected the reviewed 24-dish, three-category catalog.');
}
$codes = []; $counts = array_fill_keys($expectedCategories, 0);
foreach ($menu['items'] as $item) {
    $code = $item['code'] ?? '';
    if (!is_string($code) || !preg_match('/^bv26_[a-z]+$/D', $code) || isset($codes[$code]) ||
        !isset($counts[$item['category'] ?? '']) || !is_int($item['price_cents'] ?? null) ||
        $item['price_cents'] < 100 || $item['price_cents'] > 1000000 ||
        !is_string($item['name'] ?? null) || strlen($item['name']) > 120 || $item['name'] === '' ||
        !is_string($item['description'] ?? null) || $item['description'] === '' ||
        !in_array($item['station'] ?? '', ['cold','grill','fry','hot','pastry','bar'], true) ||
        !is_int($item['prep_time_min'] ?? null) || $item['prep_time_min'] < 1 ||
        !is_array($item['tags'] ?? null) || !array_is_list($item['tags']) ||
        array_filter($item['tags'], fn($tag) => !is_string($tag)) !== [] ||
        ($item['image_path'] ?? '') !== $code ||
        !is_file($root . '/public/assets/images/menu/curated-2026/' . $code . '.jpg')) {
        throw new RuntimeException('Invalid menu entry or missing local photograph.');
    }
    $codes[$code] = true; $counts[$item['category']]++;
}
if (min($counts) < 3) throw new RuntimeException('Each assigned category needs at least three dishes.');
$pdo = App\Core\Database::connect($config);
if ($pdo->query("SELECT svalue FROM settings WHERE skey='catalog_profile'")->fetchColumn() !== 'bella_vista_b2') {
    throw new RuntimeException('Activate the Bella Vista preview through its separate reviewed workflow first.');
}
if (!in_array('--apply', $argv, true)) {
    echo json_encode(['mode'=>'dry-run','items'=>count($codes),'category_counts'=>$counts,'database_writes'=>0], JSON_THROW_ON_ERROR) . "\n";
    exit;
}
$backup = $root . '/.private/menu-refresh-before-20261107.json';
if (!is_file($backup)) throw new RuntimeException('Save the private catalog snapshot before applying this update.');
$before = json_decode(file_get_contents($backup), true, 512, JSON_THROW_ON_ERROR);
if (empty($before['items']) || empty($before['preserved_tables'])) throw new RuntimeException('Incomplete pre-change catalog snapshot.');
$pdo->beginTransaction();
try {
    $categoryIds = [];
    foreach ($menu['categories'] as $code => $category) {
        $q = $pdo->prepare('SELECT id FROM menu_categories WHERE code=? AND is_active=1 FOR UPDATE'); $q->execute([$code]);
        $id = $q->fetchColumn();
        if ($id === false) throw new RuntimeException('Required active category is missing; refusing a partial update.');
        $categoryIds[$code] = (int)$id;
    }
    $pdo->query('SELECT id FROM menu_items WHERE category_id IN (' . implode(',', $categoryIds) . ') ORDER BY id FOR UPDATE')->fetchAll();
    // Accepted future food and unexpired reviews must be resolved before retirement.
    $live = $pdo->query("SELECT COUNT(*) FROM reservation_preorders p JOIN reservations r ON r.id=p.reservation_id JOIN JSON_TABLE(p.current_json,'$.lines[*]' COLUMNS(menu_id INT PATH '$.id')) entries JOIN menu_items m ON m.id=entries.menu_id WHERE p.status='scheduled' AND r.status IN ('pending','confirmed','seated') AND r.starts_at>=DATE_SUB(NOW(),INTERVAL 15 MINUTE) AND LEFT(m.code,5)<>'bv26_'")->fetchColumn();
    $reviews = $pdo->query("SELECT COUNT(*) FROM preorder_quotes q JOIN holds h ON h.id=q.hold_id JOIN JSON_TABLE(q.quote_json,'$.lines[*]' COLUMNS(menu_id INT PATH '$.id')) entries JOIN menu_items m ON m.id=entries.menu_id WHERE h.status='active' AND h.expires_at>NOW() AND q.expires_at>NOW() AND LEFT(m.code,5)<>'bv26_'")->fetchColumn();
    if ((int)$live > 0 || (int)$reviews > 0) throw new RuntimeException('Live pre-orders or unexpired food reviews still depend on the previous menu. Resolve them before retiring dishes.');
    $pdo->exec("INSERT INTO menu_categories(code,name,note,sort_order,is_active) VALUES ('bv_menu_archive_20261107','Historical menu archive','Retained for existing order and pre-order references.',99,0) ON DUPLICATE KEY UPDATE is_active=0");
    $archive = (int)$pdo->query("SELECT id FROM menu_categories WHERE code='bv_menu_archive_20261107'")->fetchColumn();
    // Old identities and recipe/price snapshots stay intact for historical orders.
    $retire = $pdo->prepare('UPDATE menu_items SET category_id=?,is_available=0 WHERE category_id IN (' . implode(',', $categoryIds) . ') AND code NOT IN (' . implode(',', array_fill(0, count($codes), '?')) . ')');
    $retire->execute([$archive, ...array_keys($codes)]);
    $insert = $pdo->prepare('INSERT INTO menu_items(code,category_id,name,description,price_cents,prep_time_min,station,is_available,image_path,tags_json,sort_order) VALUES (?,?,?,?,?,?,?,1,?,?,?) ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),description=VALUES(description),price_cents=VALUES(price_cents),prep_time_min=VALUES(prep_time_min),station=VALUES(station),is_available=1,image_path=VALUES(image_path),tags_json=VALUES(tags_json),sort_order=VALUES(sort_order)');
    foreach ($menu['items'] as $item) $insert->execute([$item['code'],$categoryIds[$item['category']],$item['name'],$item['description'],$item['price_cents'],$item['prep_time_min'],$item['station'],$item['image_path'],json_encode($item['tags'],JSON_THROW_ON_ERROR),$item['sort_order']]);
    foreach ($menu['categories'] as $code => $category) $pdo->prepare('UPDATE menu_categories SET note=? WHERE id=?')->execute([$category['note'],$categoryIds[$code]]);
    $pdo->commit();
    echo json_encode(['mode'=>'applied','items'=>count($codes),'category_counts'=>$counts,'old_identities'=>'retained in inactive archive'], JSON_THROW_ON_ERROR) . "\n";
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $error;
}
