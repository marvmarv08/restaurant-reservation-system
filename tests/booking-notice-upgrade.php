<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/autoload.php';
$c = require dirname(__DIR__) . '/config/database.php';
if (getenv('BOOKING_TEST_MODE') !== 'isolated' || $c['database'] !== 'tablebook_p3_test') throw new RuntimeException('Isolated database required');
$p = App\Core\Database::connect($c);
$rules = static fn (string $table = "room_types"): array => $p->query("SELECT code,min_notice_hours FROM `$table` WHERE code IN ('vip','group') ORDER BY code")->fetchAll(PDO::FETCH_KEY_PAIR);
$check = static function (bool $ok, string $message): void {if (!$ok) throw new RuntimeException($message);echo 'PASS '.$message.PHP_EOL;};
$upgrade = file_get_contents(dirname(__DIR__) . '/database/init/09_room_booking_notice.sql');
$p->exec('CREATE TEMPORARY TABLE notice_defaults_fixture LIKE room_types');
try {
    $reference = file_get_contents(dirname(__DIR__) . '/database/init/02_reference.sql');
    $p->exec(str_replace('INSERT INTO room_types', 'INSERT INTO notice_defaults_fixture', explode(';', $reference, 2)[0]));
    $check(array_map('intval', $rules('notice_defaults_fixture')) === ['group'=>12,'vip'=>12], 'Fresh reference defaults give VIP and Group 12 hours');
} finally {$p->exec('DROP TEMPORARY TABLE notice_defaults_fixture');}
$p->beginTransaction();
try {
    $p->exec("UPDATE room_types SET min_notice_hours=CASE code WHEN 'vip' THEN 48 WHEN 'group' THEN 24 END WHERE code IN ('vip','group')");
    $p->exec($upgrade);
    $check(array_map('intval', $rules()) === ['group'=>12,'vip'=>12], 'Previous room defaults upgrade to 12 hours');
    $p->exec($upgrade);
    $check(array_map('intval', $rules()) === ['group'=>12,'vip'=>12], 'Repeated upgrade leaves selected rules intact');
    $p->exec("UPDATE room_types SET min_notice_hours=CASE code WHEN 'vip' THEN 18 WHEN 'group' THEN 6 END WHERE code IN ('vip','group')");
    $p->exec($upgrade);
    $check(array_map('intval', $rules()) === ['group'=>6,'vip'=>18], 'Upgrade preserves unrelated custom notice values');
} finally {$p->rollBack();}
