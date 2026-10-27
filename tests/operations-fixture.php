<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/autoload.php';require __DIR__.'/BookingHarness.php';
define('PREORDER_FIXTURE_ONLY',true);require __DIR__.'/preorders.php';define('POLICY_FIXTURE_ONLY',true);require __DIR__.'/policies.php';define('OPERATIONS_FIXTURE_ONLY',true);require __DIR__.'/operations.php';
$in=json_decode(stream_get_contents(STDIN),true,16,JSON_THROW_ON_ERROR);
if(!App\Service\OperationsProfile::enabled($t->pdo))throw new RuntimeException('Prepare isolated B6 first.');
if($in['action']==='prepare'){
 $t->reset();b4actor($t);
 foreach(['host','server','kitchen','manager'] as $role){$rid=(int)$t->pdo->query("SELECT id FROM roles WHERE code='$role'")->fetchColumn();$t->pdo->prepare('INSERT INTO users(role_id,email,full_name,password_hash,is_active) VALUES (?,?,?,?,1) ON DUPLICATE KEY UPDATE role_id=VALUES(role_id),password_hash=VALUES(password_hash),is_active=1')->execute([$rid,'b6-'.$role.'@lumina.test','B6 '.$role,App\Service\StaffAuthService::password('Isolated operations passphrase 2026!')]);}
 $mid=(int)$t->pdo->query('SELECT m.id FROM menu_items m JOIN menu_categories c ON c.id=m.category_id WHERE c.is_active=1 AND m.is_available=1 ORDER BY price_cents LIMIT 1')->fetchColumn();$t->pdo->prepare('UPDATE menu_items SET price_cents=10000 WHERE id=?')->execute([$mid]);echo json_encode(['date'=>$t->date,'menu_id'=>$mid]);
}elseif($in['action']==='arrival_window'){
 $q=$t->pdo->prepare("SELECT r.* FROM reservations r JOIN guests g ON g.id=r.guest_id WHERE r.code=? AND g.full_name='B6 Browser Guest'");$q->execute([$in['code']]);$r=$q->fetch();if(!$r)throw new RuntimeException('Unknown isolated browser booking');
 // Move only this synthetic future booking into today's actual HTTP arrival window.
 $now=(new App\Service\BookingClock($t->pdo))->now();if((int)$now->format('N')===1||$now->format('H:i')<'10:00'||$now->format('H:i')>'20:10')throw new RuntimeException('Actual-time arrival browser rehearsal needs Tue-Sun 10:00-20:10 Manila.');
 $start=$now->setTime((int)$now->format('H'),(int)(floor((int)$now->format('i')/15)*15));if($now>=$start->modify('+14 minutes'))$start=$start->modify('+15 minutes');
 $t->pdo->prepare('UPDATE reservations SET starts_at=?,ends_at=?,blocks_until=? WHERE id=?')->execute([$start->format('Y-m-d H:i:s'),$start->modify('+120 minutes')->format('Y-m-d H:i:s'),$start->modify('+135 minutes')->format('Y-m-d H:i:s'),$r['id']]);
 $t->pdo->prepare('UPDATE reservation_tables SET slot_start=? WHERE reservation_id=?')->execute([$start->format('Y-m-d H:i:s'),$r['id']]);$t->pdo->prepare('UPDATE reservation_policies SET deadline_at=? WHERE reservation_id=?')->execute([$start->modify('-24 hours')->format('Y-m-d H:i:s'),$r['id']]);
 echo json_encode(['date'=>$start->format('Y-m-d'),'id'=>(int)$r['id'],'code'=>$r['code']]);
}elseif($in['action']==='poll_block'){
 $id=(int)$t->pdo->query("SELECT id FROM `tables` WHERE code='S4' AND is_active=1")->fetchColumn();if(!$id)throw new RuntimeException('Missing isolated target S4');$t->pdo->prepare("INSERT INTO blackout_dates(scope,scope_id,starts_at,ends_at,reason) VALUES ('table',?,NOW(),DATE_ADD(NOW(),INTERVAL 15 MINUTE),'Isolated B6 live polling rehearsal')")->execute([$id]);echo json_encode(['id'=>(int)$t->pdo->lastInsertId()]);
}elseif($in['action']==='poll_unblock'){
 $t->pdo->prepare("DELETE FROM blackout_dates WHERE id=? AND reason='Isolated B6 live polling rehearsal'")->execute([(int)$in['id']]);echo json_encode(['ok'=>true]);
}elseif($in['action']==='verify'){
 $q=$t->pdo->prepare('SELECT r.id,r.status,r.version,t.code AS table_code FROM reservations r JOIN reservation_tables a ON a.reservation_id=r.id JOIN `tables` t ON t.id=a.table_id WHERE r.code=? LIMIT 1');$q->execute([$in['code']]);$r=$q->fetch();$r['orders']=$t->count('orders');$r['tickets']=$t->count('kitchen_tickets');echo json_encode($r);
}else throw new RuntimeException('Unknown B6 isolated fixture action');
