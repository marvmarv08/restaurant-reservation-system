<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/autoload.php';
require __DIR__.'/BookingHarness.php';
$config=require dirname(__DIR__).'/config/database.php';
if(getenv('BOOKING_TEST_MODE')!=='isolated'||$config['database']!=='tablebook_p3_test')throw new RuntimeException('B2 fixtures require isolated database.');
$pdo=App\Core\Database::connect($config);$clock=new App\Service\BookingClock($pdo);
if(($argv[1]??'')==='prepare'){
    if((new App\Service\BookingPolicy($pdo))->bellaVista())throw new RuntimeException('Start populated rehearsal from the legacy test fixture.');
    $t=new BookingHarness();$t->reset();
    $h=$t->hold();$r=$t->service->confirm($h['hold_token'],$t->guest,$t->owner);
    (new App\Service\ManagementService($pdo,$clock))->issueForHold($h['hold_token'],$t->owner,hash('sha256','b2-restore-links'));
    $pdo->exec("UPDATE reservations SET special_requests='B2 legacy restore fixture',status='completed',starts_at=DATE_SUB(NOW(),INTERVAL 2 DAY),ends_at=DATE_ADD(DATE_SUB(NOW(),INTERVAL 2 DAY),INTERVAL 90 MINUTE),blocks_until=DATE_ADD(DATE_SUB(NOW(),INTERVAL 2 DAY),INTERVAL 105 MINUTE)");
    $pdo->exec('UPDATE reservation_tables SET released_at=NOW()');
    $pdo->prepare("INSERT INTO orders(reservation_id,table_id,status,total_cents) VALUES (?,?,'closed',123400)")->execute([(int)$pdo->query('SELECT id FROM reservations')->fetchColumn(),$t->tables['C1']['id']]);
    (new App\Service\BellaVistaSchema($pdo))->prepare();(new App\Service\BellaVistaCatalog($pdo))->activate();
    $id=(int)$pdo->query("SELECT id FROM `tables` WHERE code='VIP1'")->fetchColumn();
    $h=$t->service->hold($t->date,'20:00',20,'bv_vip',hash('sha256','target-restore'),'table',$id);$r=$t->service->confirm($h['hold_token'],$t->guest,hash('sha256','target-restore'));
    (new App\Service\ManagementService($pdo,$clock))->issueForHold($h['hold_token'],hash('sha256','target-restore'),hash('sha256','b2-restore-links'));
    $pdo->prepare("UPDATE reservations SET special_requests='B2 target restore fixture' WHERE code=?")->execute([$r['code']]);
    $role=$pdo->query("SELECT id FROM roles WHERE code='admin'")->fetchColumn();
    $pdo->prepare("INSERT INTO users(role_id,email,full_name,is_active,password_hash) VALUES (?,'b2-staff@lumina.test','B2 Staff',1,?) ON DUPLICATE KEY UPDATE is_active=1,password_hash=VALUES(password_hash)")->execute([$role,App\Service\StaffAuthService::password('Isolated staff passphrase 2026!')]);
    echo "Prepared populated target fixture: legacy booking/order plus current twenty-person VIP booking and private links.\n";
}elseif(($argv[1]??'')==='verify'){
    $rows=$pdo->query("SELECT id,code,party_size FROM reservations WHERE special_requests IN ('B2 legacy restore fixture','B2 target restore fixture') ORDER BY id")->fetchAll();
    if(count($rows)!==2)throw new RuntimeException('Missing restored bookings');
    $m=new App\Service\ManagementService($pdo,$clock);
    foreach($rows as $row){$token=hash_hmac('sha256',$row['id'].':'.$row['code'],hash('sha256','b2-restore-links'));$m->read($row['code'],$token);}
    if((int)$rows[1]['party_size']!==20||(int)$pdo->query('SELECT total_cents FROM orders')->fetchColumn()!==123400)throw new RuntimeException('Restored values differ');
    echo "PASS restored legacy/current booking private reads, saved twenty-person VIP party and historical order amount.\n";
}else throw new RuntimeException('Choose prepare or verify');
