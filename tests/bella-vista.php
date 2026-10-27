<?php
declare(strict_types=1);

use App\Service\BellaVistaCatalog;
use App\Service\BookingPolicy;
use App\Service\BookingClock;
use App\Service\CatalogService;
use App\Service\StaffReservationService;
use App\Service\StaffAuthService;
use App\Core\StaffAccess;

function cleanBella(BookingHarness $t): void {
    $t->pdo->exec("DELETE FROM settings WHERE skey = 'catalog_profile'");
    $t->pdo->exec("DELETE t FROM `tables` t JOIN rooms r ON r.id=t.room_id JOIN room_types ty ON ty.id=r.room_type_id WHERE ty.code LIKE 'bv_%'");
    $t->pdo->exec("DELETE r FROM rooms r JOIN room_types ty ON ty.id=r.room_type_id WHERE ty.code LIKE 'bv_%'");
    $t->pdo->exec("DELETE FROM room_types WHERE code LIKE 'bv_%'");
    $t->pdo->exec('UPDATE table_groups SET is_active=1');
}
function targetId(BookingHarness $t, string $code): int {
    $q=$t->pdo->prepare('SELECT id FROM `tables` WHERE code=?');$q->execute([$code]);return (int)$q->fetchColumn();
}
$tests=new BookingHarness();
if((new BookingPolicy($tests->pdo))->bellaVista())throw new RuntimeException('Preserve the isolated preview before running this resetting suite; prepare a fresh legacy test fixture first.');
$tests->reset();
if(class_exists(App\Service\BellaVistaSchema::class)) (new App\Service\BellaVistaSchema($tests->pdo))->prepare();
function btest(string $name, Closure $test): void {
    global $tests;
    $tests->test($name, function(BookingHarness $t) use($test):void { cleanBella($t);$test($t); });
}
btest('B2 explicit additive schema preparation exists',function($t){$t->assert(class_exists(App\Service\BellaVistaSchema::class),'Missing explicit 20-person schema preparation');});
btest('B2 explicit catalog conversion exists',function($t){$t->assert(class_exists(BellaVistaCatalog::class),'Missing explicit Bella Vista catalog conversion');});
btest('B2 staging adds nine inactive identities and keeps legacy inventory active',function($t){
    (new BellaVistaCatalog($t->pdo))->stage();
    $t->assert((int)$t->pdo->query('SELECT COUNT(*) FROM `tables` WHERE is_active=1')->fetchColumn()===25);
    $t->assert((int)$t->pdo->query("SELECT COUNT(*) FROM `tables` WHERE code IN ('S1','S2','S3','S4','F1','F2','F3','VIP1','VIP2') AND is_active=0")->fetchColumn()===9);
    $t->assert(!(new BookingPolicy($t->pdo))->bellaVista());
});
btest('B2 activation exact inventory, capacity, no joined units and stable repeated IDs',function($t){
    $c=new BellaVistaCatalog($t->pdo);$c->activate();
    $ids=$t->pdo->query('SELECT id,code FROM `tables` WHERE is_active=1 ORDER BY code')->fetchAll();
    $t->assert(array_column($ids,'code')===['F1','F2','F3','S1','S2','S3','S4','VIP1','VIP2']);
    $t->assert((int)$t->pdo->query('SELECT COUNT(*) FROM table_groups WHERE is_active=1')->fetchColumn()===0);
    $c->activate();$c->stage();
    $t->assert($ids===$t->pdo->query('SELECT id,code FROM `tables` WHERE is_active=1 ORDER BY code')->fetchAll());
    $t->assert((int)$t->pdo->query('SELECT COUNT(*) FROM `tables`')->fetchColumn()===34);
});
btest('B2 conversion retains schedule and pacing row identities',function($t){
    $hours=$t->pdo->query('SELECT id FROM opening_hours ORDER BY id')->fetchAll(PDO::FETCH_COLUMN);
    $pacing=$t->pdo->query('SELECT id FROM pacing_rules ORDER BY id')->fetchAll(PDO::FETCH_COLUMN);
    (new BellaVistaCatalog($t->pdo))->activate();
    $t->assert($hours===$t->pdo->query('SELECT id FROM opening_hours ORDER BY id')->fetchAll(PDO::FETCH_COLUMN));
    $t->assert($pacing===$t->pdo->query('SELECT id FROM pacing_rules ORDER BY id')->fetchAll(PDO::FETCH_COLUMN));
});
btest('B2 active legacy hold rejects and rolls back activation',function($t){
    $t->hold();$t->expectError('conversion_busy',fn()=>(new BellaVistaCatalog($t->pdo))->activate());
    $t->assert((int)$t->pdo->query('SELECT COUNT(*) FROM `tables`')->fetchColumn()===25);
    $t->assert(!(new BookingPolicy($t->pdo))->bellaVista());
});
btest('B2 future legacy booking rejects activation',function($t){
    $h=$t->hold();$t->service->confirm($h['hold_token'],$t->guest,$t->owner);
    $t->expectError('conversion_busy',fn()=>(new BellaVistaCatalog($t->pdo))->activate());
});
btest('B2 legacy booking, private management and order survive retirement',function($t){
    $h=$t->hold();$booking=$t->service->confirm($h['hold_token'],$t->guest,$t->owner);
    $link=(new App\Service\ManagementService($t->pdo,new BookingClock($t->pdo)))->issueForHold($h['hold_token'],$t->owner,hash('sha256','b2-access'));
    $t->pdo->exec("UPDATE reservations SET status='completed',starts_at=DATE_SUB(NOW(),INTERVAL 2 DAY),ends_at=DATE_ADD(DATE_SUB(NOW(),INTERVAL 2 DAY),INTERVAL 90 MINUTE),blocks_until=DATE_ADD(DATE_SUB(NOW(),INTERVAL 2 DAY),INTERVAL 105 MINUTE)");
    $t->pdo->exec("UPDATE reservation_tables SET released_at=NOW()");
    $rid=(int)$t->pdo->query('SELECT id FROM reservations')->fetchColumn();
    $t->pdo->prepare("INSERT INTO orders(reservation_id,table_id,status,total_cents) VALUES (?,?,'closed',123400)")->execute([$rid,$t->tables['C1']['id']]);
    $before=$t->pdo->query('SELECT * FROM reservations')->fetchAll();
    (new BellaVistaCatalog($t->pdo))->activate();
    $t->assert($before===$t->pdo->query('SELECT * FROM reservations')->fetchAll());
    $t->assert((int)$t->pdo->query('SELECT total_cents FROM orders')->fetchColumn()===123400);
    $t->assert((int)$t->pdo->query("SELECT id FROM `tables` WHERE code='C1'")->fetchColumn()===(int)$t->tables['C1']['id']);
    parse_str(parse_url($link,PHP_URL_FRAGMENT),$access);
    $t->assert((new App\Service\ManagementService($t->pdo,new BookingClock($t->pdo)))->read($booking['code'],$access['token'])['code']===$booking['code']);
});
btest('B2 catalog exposes 20-person limit and all three target categories',function($t){
    (new BellaVistaCatalog($t->pdo))->activate();$cat=(new CatalogService($t->pdo,new BookingClock($t->pdo)))->get();
    $t->assert($cat['max_party']===20);$t->assert($cat['profile']==='bella_vista_b2');
    $t->assert(count($cat['tables'])===9&&count($cat['room_types'])===3&&count($cat['rooms'])===3);
    foreach([['bv_standard',2,4],['bv_family',5,8],['bv_vip',1,20]] as [$code,$low,$high]){
        $type=array_values(array_filter($cat['room_types'],fn($r)=>$r['code']===$code))[0];
        $t->assert((int)$type['min_party']===$low&&(int)$type['max_party']===$high);
    }
    $t->expectError('party_out_of_range',fn()=>$t->availability->search($t->date,21,'bv_vip'));
});
btest('B2 full dining/reset last seating and Monday/off-grid boundaries',function($t){
    (new BellaVistaCatalog($t->pdo))->activate();$p=new BookingPolicy($t->pdo);$now=new DateTimeImmutable($t->date.' 09:59:59',$p->timezone);$type=$p->types('bv_vip')[0];
    $i=$p->interval(new DateTimeImmutable($t->date.' 20:00',$p->timezone),20,$type,$now);
    $t->assert($i!==null&&$i['ends_at']===$t->date.' 22:00:00'&&$i['blocks_until']===$t->date.' 22:15:00');
    foreach(['09:45','10:07','20:15'] as $time)$t->assert($p->interval(new DateTimeImmutable($t->date.' '.$time,$p->timezone),20,$type,$now)===null);
    $monday=(new DateTimeImmutable($t->date))->modify('next monday')->format('Y-m-d');$t->assert($t->availability->search($monday,20,'bv_vip')['slots']===[]);
    $t->assert(count($t->availability->search($t->date,20,'bv_vip')['slots'])===41);
});
btest('B2 category edges and strict future start without extra notice',function($t){
    (new BellaVistaCatalog($t->pdo))->activate();
    foreach([['bv_standard',1,false],['bv_standard',2,true],['bv_standard',4,true],['bv_standard',5,false],['bv_family',4,false],['bv_family',5,true],['bv_family',8,true],['bv_family',9,false],['bv_vip',1,true],['bv_vip',20,true]] as [$code,$n,$ok])$t->assert(($t->availability->search($t->date,$n,$code)['slots']!==[])===$ok);
    [$svc]=$t->fixed($t->date.' 09:59:59');$h=$svc->hold($t->date,'10:00',20,'bv_vip',$t->owner,'table',targetId($t,'VIP1'));$t->assert(isset($h['hold_token']));
    [$svc]=$t->fixed($t->date.' 10:00:00');$t->expectError('unavailable',fn()=>$svc->hold($t->date,'10:00',20,'bv_vip',hash('sha256','other')));
});
btest('B2 12:00 reuse blocked, 12:15 allowed and seated overrun stays blocked',function($t){
    (new BellaVistaCatalog($t->pdo))->activate();$id=targetId($t,'S1');
    $h=$t->service->hold($t->date,'10:00',2,'bv_standard',$t->owner,'table',$id);$t->service->confirm($h['hold_token'],$t->guest,$t->owner);
    $by=array_column($t->availability->search($t->date,2,'bv_standard')['slots'],'options','time');
    $t->assert(!in_array($id,array_column($by['12:00'],'id'),true));$t->assert(in_array($id,array_column($by['12:15'],'id'),true));
    $t->pdo->exec("UPDATE reservations SET status='seated'");$by=array_column($t->availability->search($t->date,2,'bv_standard')['slots'],'options','time');
    $t->assert(!in_array($id,array_column($by['12:15'],'id'),true));
});
btest('B2 staff creates and reschedules twenty guests without approval',function($t){
    (new BellaVistaCatalog($t->pdo))->activate();
    $role=$t->pdo->query("SELECT id FROM roles WHERE code='admin'")->fetchColumn();
    $t->pdo->prepare("INSERT INTO users(role_id,email,full_name,is_active,password_hash) VALUES (?,'b2-staff@lumina.test','B2 Staff',1,?) ON DUPLICATE KEY UPDATE is_active=1,password_hash=VALUES(password_hash)")->execute([$role,StaffAuthService::password('Isolated staff passphrase 2026!')]);
    $u=$t->pdo->query("SELECT * FROM users WHERE email='b2-staff@lumina.test'")->fetch();$actor=['id'=>(int)$u['id'],'stamp'=>StaffAccess::stamp($u)];
    $svc=new StaffReservationService($t->pdo,new BookingClock($t->pdo));
    $r=$svc->create($actor,['date'=>$t->date,'time'=>'20:00','party_size'=>20,'room_type'=>'bv_vip','source'=>'phone','guest'=>$t->guest,'kind'=>'table','id'=>targetId($t,'VIP1')]);
    $t->assert($r['status']==='confirmed');
    $t->assert($t->pdo->query('SELECT approval_state FROM reservations')->fetchColumn()==='not_required');
    $slots=$svc->availability($actor,$t->date,20,'bv_vip');$t->assert($slots['slots']!==[]);
    $changed=$svc->modify($actor,['code'=>$r['code'],'version'=>(int)$r['version'],'date'=>$t->date,'time'=>'19:45','party_size'=>20,'room_type'=>'bv_vip','option'=>['kind'=>'table','id'=>targetId($t,'VIP2')],'special_requests'=>'B2 reschedule','reason'=>'B2 reschedule test']);
    $t->assert($t->pdo->query('SELECT starts_at FROM reservations')->fetchColumn()===$t->date.' 19:45:00');
});
btest('B2 concurrency has one winner for the last target table',function($t){
    (new BellaVistaCatalog($t->pdo))->activate();$jobs=[];
    foreach(['a','b'] as $owner)$jobs[]=['op'=>'hold','date'=>$t->date,'time'=>'20:00','party'=>20,'room'=>'bv_vip','kind'=>'table','id'=>targetId($t,'VIP1'),'owner'=>hash('sha256',$owner)];
    $result=$t->finishWorkers($t->startWorkers($jobs));$t->assert(count(array_filter($result,fn($r)=>$r['ok']))===1);
});
btest('B2 schema precondition and repeated schema preparation',function($t){
    $t->pdo->exec('ALTER TABLE reservations DROP CHECK chk_res_party, ADD CONSTRAINT chk_res_party CHECK (party_size BETWEEN 1 AND 16)');
    $t->expectError('schema_not_ready',fn()=>(new BellaVistaCatalog($t->pdo))->activate());
    $schema=new App\Service\BellaVistaSchema($t->pdo);$schema->prepare();$schema->prepare();$t->assert($schema->ready());
});
btest('B2 conflicting target code rolls back all newly staged rows',function($t){
    $t->pdo->exec("INSERT INTO `tables`(room_id,code,label,capacity_min,capacity_max) VALUES (2,'S1','Conflicting legacy code',2,4)");
    try{$t->expectError('conversion_conflict',fn()=>(new BellaVistaCatalog($t->pdo))->activate());
        $t->assert((int)$t->pdo->query("SELECT COUNT(*) FROM room_types WHERE code LIKE 'bv_%'")->fetchColumn()===0);
        $t->assert(!(new BookingPolicy($t->pdo))->bellaVista());
    }finally{$t->pdo->exec("DELETE FROM `tables` WHERE code='S1'");}
});
btest('B2 guest twenty-person confirmation, retry and management reschedule',function($t){
    (new BellaVistaCatalog($t->pdo))->activate();$h=$t->service->hold($t->date,'20:00',20,'bv_vip',$t->owner,'table',targetId($t,'VIP1'));
    $r=$t->service->confirm($h['hold_token'],$t->guest,$t->owner);$again=$t->service->confirm($h['hold_token'],$t->guest,$t->owner);
    $t->assert($r['code']===$again['code']&&$t->count('reservations')===1);
    $m=new App\Service\ManagementService($t->pdo,new BookingClock($t->pdo));$link=$m->issueForHold($h['hold_token'],$t->owner,hash('sha256','guest-b2'));
    parse_str(parse_url($link,PHP_URL_FRAGMENT),$access);$row=$m->read($r['code'],$access['token']);
    $changed=$m->modify($r['code'],$access['token'],(int)$row['version'],$t->date,'19:45',20,'bv_vip','table',targetId($t,'VIP2'),'');
    $t->assert($changed['starts_at']===$t->date.' 19:45:00'&&$changed['ends_at']===$t->date.' 21:45:00');
});
btest('B2 fixed service settings cannot silently violate assignment profile',function($t){
    (new BellaVistaCatalog($t->pdo))->activate();
    $role=$t->pdo->query("SELECT id FROM roles WHERE code='admin'")->fetchColumn();
    $t->pdo->prepare("INSERT INTO users(role_id,email,full_name,is_active,password_hash) VALUES (?,'b2-staff@lumina.test','B2 Staff',1,?) ON DUPLICATE KEY UPDATE is_active=1,password_hash=VALUES(password_hash)")->execute([$role,StaffAuthService::password('Isolated staff passphrase 2026!')]);
    $u=$t->pdo->query("SELECT * FROM users WHERE email='b2-staff@lumina.test'")->fetch();$actor=['id'=>(int)$u['id'],'stamp'=>StaffAccess::stamp($u)];
    $service=new App\Service\StaffSettingsService($t->pdo,new BookingClock($t->pdo));$data=$service->get($actor);
    $t->expectError('assignment_policy_locked',fn()=>$service->save($actor,$data['revision'],'settings',['max_party_online'=>16]));
    $t->expectError('assignment_policy_locked',fn()=>$service->save($actor,$data['revision'],'hours',[['id'=>(int)$data['hours'][0]['id'],'open_time'=>'12:00','close_time'=>'22:00','is_closed'=>false]]));
});
btest('B2 edited staged policy fields are rejected before activation',function($t){
    $c=new BellaVistaCatalog($t->pdo);$c->stage();
    foreach(['min_notice_hours'=>12,'requires_approval'=>1,'min_spend_cents'=>10000] as $field=>$value){
        $t->pdo->exec("UPDATE room_types SET $field=$value WHERE code='bv_vip'");
        try{$t->expectError('conversion_conflict',fn()=>$c->activate());$t->assert(!(new BookingPolicy($t->pdo))->bellaVista());}
        finally{$t->pdo->exec("UPDATE room_types SET $field=0 WHERE code='bv_vip'");}
    }
    $t->pdo->exec("UPDATE `tables` SET is_joinable=1 WHERE code='S1'");
    $t->expectError('conversion_conflict',fn()=>$c->activate());
});
$tests->reset();cleanBella($tests);$tests->finish();
