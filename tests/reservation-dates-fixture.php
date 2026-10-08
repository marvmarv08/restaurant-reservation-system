<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/autoload.php';
$config = require dirname(__DIR__) . '/config/database.php';
if (getenv('BOOKING_TEST_MODE') !== 'isolated' || $config['database'] !== 'tablebook_p3_test') {
    throw new RuntimeException('Multi-date fixtures require the isolated database');
}
$p = App\Core\Database::connect($config);
$today = $p->query('SELECT CURDATE()')->fetchColumn();
$marker = 'Date filter ' . bin2hex(random_bytes(4));
$p->prepare('INSERT INTO guests (full_name,phone) VALUES (?,?)')->execute([$marker, '+639000000019']);
$guest = $p->lastInsertId();
$room = $p->query('SELECT id FROM room_types ORDER BY id LIMIT 1')->fetchColumn();
$rows = [];
for ($i = 0; $i < 30; $i++) {
    $date = (new DateTimeImmutable($today))->modify(($i % 3 - 1) . ' days')->format('Y-m-d');
    $status = $i % 2 ? 'completed' : 'cancelled';
    $code = 'LUM-' . strtoupper(substr(bin2hex(random_bytes(6)), 0, 6));
    $p->prepare("INSERT INTO reservations (code,guest_id,room_type_id,party_size,starts_at,ends_at,blocks_until,turn_time_min,status,source) VALUES (?,?,?,2,?,?,?,90,?,'phone')")
        ->execute([$code,$guest,$room,$date.' 17:00:00',$date.' 18:30:00',$date.' 18:45:00',$status]);
    $rows[] = ['code'=>$code,'date'=>$date,'status'=>$status];
}
echo json_encode(['marker'=>$marker,'today'=>$today,'rows'=>$rows], JSON_THROW_ON_ERROR);
