<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/autoload.php';require __DIR__.'/BookingHarness.php';define('BILLING_FIXTURE_ONLY',true);require __DIR__.'/billing.php';
$mode=$argv[1]??'prepare';
if($mode==='prepare'){
 $t->reset();$meta=[];
 foreach([['family','bv_family',5,200000],['vip','bv_vip',16,500000],['residual','bv_family',5,40000],['standard','bv_standard',2,100000],['refund','bv_family',5,40000]] as [$name,$category,$party,$food]){
  $r=billingBooking($t,$category,$party,$food);$date=(new App\Service\BookingClock($t->pdo))->now()->modify('-1 day')->format('Y-m-d');
  $t->pdo->prepare("UPDATE reservations SET status='completed',starts_at=?,ends_at=?,blocks_until=? WHERE id=?")->execute([$date.' 18:00:00',$date.' 20:00:00',$date.' 20:15:00',$r['id']]);
  $t->pdo->prepare('UPDATE reservation_tables SET released_at=NOW() WHERE reservation_id=?')->execute([$r['id']]);$meta[$name]=['id'=>$r['id'],'code'=>$r['code']];
 }
 foreach(['admin','manager','server','host','kitchen'] as $role)billingActor($t,$role);
 echo json_encode(['date'=>$date,'bookings'=>$meta],JSON_THROW_ON_ERROR);
}elseif($mode==='verify'){
 $count=(int)$t->pdo->query('SELECT COUNT(*) FROM billing_events')->fetchColumn();
 $final=(int)$t->pdo->query("SELECT COUNT(*) FROM billing_accounts WHERE status='finalized'")->fetchColumn();
 if($count<1||$final<1)throw new RuntimeException('Missing persisted receipt/final bill history');
 echo "PASS persisted billing events, finalized bills and reservation food links after restore.\n";
}else throw new RuntimeException('Choose prepare or verify');
