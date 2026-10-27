<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/autoload.php';require __DIR__.'/BookingHarness.php';
define('PREORDER_FIXTURE_ONLY',true);require __DIR__.'/preorders.php';
define('POLICY_FIXTURE_ONLY',true);require __DIR__.'/policies.php';
$t->test('B5 staff paid-base protection rechecks after midnight menu lock wait',function($t){
 $b=b4book($t);$id=(int)$b['r']['id'];$a=b4actor($t);pmoney($t,$a,$id,'advance',50000);
 $prior=(new DateTimeImmutable($t->date))->modify('-1 day')->format('Y-m-d').' 23:59:59';$next=(new DateTimeImmutable($t->date))->modify('+1 day')->format('Y-m-d');
 $input=['code'=>$b['r']['code'],'version'=>1,'date'=>$next,'time'=>'10:00','party_size'=>5,'room_type'=>'bv_family','option'=>['kind'=>'table','id'=>(int)$t->pdo->query('SELECT table_id FROM reservation_tables LIMIT 1')->fetchColumn()],'special_requests'=>'','reason'=>'Midnight schedule boundary','policy_acceptance'=>['version'=>App\Service\ReservationTerms::VERSION]+App\Service\BillingFees::assess('bv_family',5)];
 $t->pdo->beginTransaction();$t->pdo->prepare('SELECT id FROM menu_items WHERE id=? FOR UPDATE')->execute([$b['p']['cart'][0]['id']]);
 $w=$t->startWorkers([['op'=>'policy_staff_midnight','actor'=>$a,'input'=>$input,'clock_base'=>$prior]]);usleep(3200000);$t->pdo->commit();$r=$t->finishWorkers($w);
 $t->assert(!$r[0]['ok']&&$r[0]['error']==='same_day_fee_protected'&&(int)$t->pdo->query('SELECT version FROM reservations')->fetchColumn()===1,'Cross-midnight change must roll back');
});$t->finish();
