<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/autoload.php';
require __DIR__.'/BookingHarness.php';
define('PREORDER_FIXTURE_ONLY',true);require __DIR__.'/preorders.php';
define('POLICY_FIXTURE_ONLY',true);require __DIR__.'/policies.php';
$in=json_decode(stream_get_contents(STDIN),true,16,JSON_THROW_ON_ERROR);
if($in['action']==='prepare'){
 $t->reset();$a=b4actor($t);$b=b4book($t,'bv_vip',16);$id=(int)$b['r']['id'];pmoney($t,$a,$id,'advance',250000);pmoney($t,$a,$id,'extra_receipt',30000);pcancel($t,$b,$t->date.' 09:00:00');
 echo json_encode(['date'=>$t->date,'paid'=>['id'=>$id,'code'=>$b['r']['code']]]);
}elseif($in['action']==='staff_sample'){
 $b=b4book($t);echo json_encode(['date'=>$t->date,'code'=>$b['r']['code']]);
}elseif($in['action']==='overdue'){
 $b=b4book($t);$id=(int)$b['r']['id'];$t->pdo->prepare("UPDATE reservations SET starts_at=DATE_SUB(NOW(),INTERVAL 16 MINUTE),ends_at=DATE_ADD(NOW(),INTERVAL 104 MINUTE),blocks_until=DATE_ADD(NOW(),INTERVAL 119 MINUTE) WHERE id=?")->execute([$id]);echo json_encode(['id'=>$id]);
}elseif($in['action']==='status'){
 $q=$t->pdo->prepare('SELECT status FROM reservations WHERE id=?');$q->execute([(int)$in['id']]);echo json_encode(['status'=>$q->fetchColumn(),'no_show_history'=>(int)$t->pdo->query("SELECT COUNT(*) FROM reservation_status_history WHERE to_status='no_show'")->fetchColumn()]);
}elseif($in['action']==='counts'){
 echo json_encode(['money_events'=>$t->count('policy_money_events'),'bookings'=>$t->count('reservations'),'no_show_history'=>(int)$t->pdo->query("SELECT COUNT(*) FROM reservation_status_history WHERE to_status='no_show'")->fetchColumn()]);
}else throw new RuntimeException('Unknown isolated policy fixture action');
