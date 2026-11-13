<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/autoload.php';
$config = require dirname(__DIR__) . '/config/database.php';
if (getenv('BOOKING_TEST_MODE') !== 'isolated' || $config['database'] !== 'tablebook_p3_test') throw new RuntimeException('Isolated preview only.');
$pdo = App\Core\Database::connect($config);
$root = dirname(__DIR__);
$oldId = (int)$pdo->query("SELECT id FROM menu_items WHERE LEFT(code,5)<>'bv26_' ORDER BY id LIMIT 1")->fetchColumn();
if (!$oldId) throw new RuntimeException('The historical menu must be present.');
$quote = json_encode(['lines'=>[['id'=>$oldId]]], JSON_THROW_ON_ERROR);
$hash = fn() => hash('sha256', json_encode([$pdo->query('SELECT * FROM menu_items ORDER BY id')->fetchAll(), $pdo->query('SELECT * FROM menu_categories ORDER BY id')->fetchAll()], JSON_THROW_ON_ERROR));
$before = $hash(); $hold = null; $reservation = null;
function refused(string $root): void {
    $process = proc_open([PHP_BINARY, $root . '/bin/refresh-menu-preview.php', '--apply'], [1=>['pipe','w'],2=>['pipe','w']], $pipes);
    if (!is_resource($process)) throw new RuntimeException('Cannot run updater probe.');
    $text = stream_get_contents($pipes[1]) . stream_get_contents($pipes[2]); fclose($pipes[1]); fclose($pipes[2]);
    if (proc_close($process) === 0 || !str_contains($text, 'Live pre-orders or unexpired food reviews')) throw new RuntimeException('Updater must refuse live old-menu dependencies.');
}
try {
    // No physical table is held; only this test-owned quote is inserted and removed.
    $pdo->prepare("INSERT INTO holds(hold_token,starts_at,ends_at,blocks_until,party_size,expires_at) VALUES (UUID(),DATE_ADD(NOW(),INTERVAL 1 DAY),DATE_ADD(NOW(),INTERVAL 26 HOUR),DATE_ADD(NOW(),INTERVAL 27 HOUR),2,DATE_ADD(NOW(),INTERVAL 10 MINUTE))")->execute();
    $hold = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO preorder_quotes(scope_key,hold_id,token,quote_json,expires_at) VALUES (?,?,?, ?,DATE_ADD(NOW(),INTERVAL 5 MINUTE))')->execute(['hold:'.$hold,$hold,bin2hex(random_bytes(32)),$quote]);
    refused($root);
    if ($hash() !== $before) throw new RuntimeException('Refused quote update changed the catalog.');
    $pdo->prepare('DELETE FROM preorder_quotes WHERE hold_id=?')->execute([$hold]);
    $pdo->prepare('DELETE FROM holds WHERE id=?')->execute([$hold]); $hold = null;
    echo "PASS: an unexpired old-menu quote refuses retirement with zero catalog changes.\n";
    $guest = $pdo->query('SELECT id FROM guests ORDER BY id LIMIT 1')->fetchColumn();
    $type = $pdo->query("SELECT id FROM room_types WHERE code='bv_standard'")->fetchColumn();
    if (!$guest || !$type) throw new RuntimeException('Existing isolated reference data required.');
    $pdo->prepare("INSERT INTO reservations(code,guest_id,room_type_id,party_size,starts_at,ends_at,blocks_until,turn_time_min,status) VALUES (?,?,?,2,DATE_ADD(NOW(),INTERVAL 1 DAY),DATE_ADD(NOW(),INTERVAL 26 HOUR),DATE_ADD(NOW(),INTERVAL 27 HOUR),120,'confirmed')")->execute(['LUM-'.strtoupper(bin2hex(random_bytes(3))),$guest,$type]);
    $reservation = (int)$pdo->lastInsertId();
    $pdo->prepare("INSERT INTO reservation_preorders(reservation_id,accepted_json,current_json,history_json,confirmation_hash,accepted_at) VALUES (?,?,?,'[]',?,NOW())")->execute([$reservation,$quote,$quote,hash('sha256','menu-refresh-dependency-test')]);
    refused($root);
    if ($hash() !== $before) throw new RuntimeException('Refused booking update changed the catalog.');
    echo "PASS: an upcoming accepted old-menu pre-order refuses retirement with zero catalog changes.\n";
} finally {
    if ($hold !== null) {
        $pdo->prepare('DELETE FROM preorder_quotes WHERE hold_id=?')->execute([$hold]);
        $pdo->prepare('DELETE FROM holds WHERE id=?')->execute([$hold]);
    }
    if ($reservation !== null) {
        $pdo->prepare('DELETE FROM reservation_preorders WHERE reservation_id=?')->execute([$reservation]);
        $pdo->prepare('DELETE FROM reservations WHERE id=?')->execute([$reservation]);
    }
}
echo "PASS: all temporary dependency probes removed.\n";
