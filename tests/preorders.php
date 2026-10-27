<?php
declare(strict_types=1);
use App\Service\{PreorderSchema,PreorderService,BookingClock,BookingService,ManagementService,StaffReservationService,StaffAuthService,BillingService};
use App\Core\StaffAccess;
$t=new BookingHarness();
if(!PreorderService::enabled($t->pdo))throw new RuntimeException('Explicitly prepare isolated B4 first.');
function b4cart($t,int $minimum=0):array{
 $i=$t->pdo->query('SELECT m.id,m.price_cents FROM menu_items m JOIN menu_categories c ON c.id=m.category_id WHERE c.is_active=1 AND m.is_available=1 ORDER BY m.price_cents LIMIT 1')->fetch();
 return [['id'=>(int)$i['id'],'qty'=>max(1,(int)ceil($minimum/(int)$i['price_cents']))]];
}
function b4hold($t,string $room='bv_family',int $party=5):array{return $t->service->hold($t->date,'10:00',$party,$room,$t->owner);}
function b4accept($t,array $h,array $cart):array{$q=$t->service->preorderQuote($h['hold_token'],$t->owner,$cart);return ['cart'=>$cart,'quote_token'=>$q['quote_token'],'accepted'=>true];}
function b4book($t,string $room='bv_family',int $party=5,int $minimum=0):array{
 $h=b4hold($t,$room,$party);$cart=b4cart($t,$minimum);$p=b4accept($t,$h,$cart);$r=$t->service->confirm($h['hold_token'],$t->guest,$t->owner,$p);
 $q=$t->pdo->prepare('SELECT * FROM reservations WHERE code=?');$q->execute([$r['code']]);return ['r'=>$q->fetch(),'h'=>$h,'p'=>$p,'booking'=>$r];
}
function b4actor($t):array{
 $role=(int)$t->pdo->query("SELECT id FROM roles WHERE code='admin'")->fetchColumn();
 $t->pdo->prepare("INSERT INTO users(role_id,email,full_name,password_hash,is_active) VALUES (?,'b4-admin@lumina.test','B4 Admin',?,1) ON DUPLICATE KEY UPDATE is_active=1,password_hash=VALUES(password_hash)")->execute([$role,StaffAuthService::password('Isolated cart passphrase 2026!')]);
 $u=$t->pdo->query("SELECT * FROM users WHERE email='b4-admin@lumina.test'")->fetch();return ['id'=>(int)$u['id'],'stamp'=>StaffAccess::stamp($u)];
}
function b4clock($t,string $time):BookingClock{return new BookingClock($t->pdo,fn()=>new DateTimeImmutable($t->date.' '.$time,new DateTimeZone('Asia/Manila')));}
function b4link($t,$b):array{
 $s=new ManagementService($t->pdo,new BookingClock($t->pdo));$path=$s->issueForHold($b['h']['hold_token'],$t->owner,hash('sha256','b4-management'));
 parse_str(parse_url($path,PHP_URL_FRAGMENT),$a);return [$s,$a['token']];
}
if(defined('PREORDER_FIXTURE_ONLY'))return;
$t->test('B4 three combined categories preserve old menu identities',function($t){$rows=$t->pdo->query('SELECT c.name,COUNT(*) AS n FROM menu_categories c JOIN menu_items m ON m.category_id=c.id WHERE c.is_active=1 GROUP BY c.id ORDER BY c.sort_order')->fetchAll();$t->assert(array_column($rows,'name')===['Main Courses / Specialties','Appetizers & Soups','Desserts & Drinks']);foreach($rows as $r)$t->assert((int)$r['n']>=3);$t->assert((int)$t->pdo->query("SELECT COUNT(*) FROM menu_items WHERE code NOT LIKE 'bv_%'")->fetchColumn()===36);});
$t->test('B4 explicit preparation is repeatable without changing menu IDs or snapshots',function($t){$before=$t->pdo->query('SELECT * FROM menu_items ORDER BY id')->fetchAll();PreorderSchema::prepare($t->pdo);$t->assert($before===$t->pdo->query('SELECT * FROM menu_items ORDER BY id')->fetchAll());});
$t->test('B4 quote is server priced and separates VIP noncredit extras from unpaid base',function($t){$h=b4hold($t,'bv_vip',16);$q=$t->service->preorderQuote($h['hold_token'],$t->owner,b4cart($t));$t->assert($q['fees']['base_fee_cents']===250000&&$q['fees']['extra_cents']===30000&&$q['food_credit_cents']===0&&$q['received_cents']===0&&$q['estimated_due_cents']===$q['food_cents']+30000);});
$t->test('B4 rejects tampered price, fractional/duplicate/excess quantities and unknown items',function($t){$h=b4hold($t);$cart=b4cart($t);foreach([[['id'=>$cart[0]['id'],'qty'=>1,'unit_price_cents'=>1]],[['id'=>$cart[0]['id'],'qty'=>1.5]],[$cart[0],$cart[0]],[['id'=>$cart[0]['id'],'qty'=>31]]] as $bad)$t->expectError('invalid_cart',fn()=>$t->service->preorderQuote($h['hold_token'],$t->owner,$bad));$t->expectError('item_unavailable',fn()=>$t->service->preorderQuote($h['hold_token'],$t->owner,[['id'=>2147483647,'qty'=>1]]));});
$t->test('B4 cannot inspect another session hold or review an expired hold',function($t){$h=b4hold($t);$t->expectError('hold_not_found',fn()=>$t->service->preorderQuote($h['hold_token'],hash('sha256','rival'),[]));$t->pdo->exec("UPDATE holds SET expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND)");$t->expectError('hold_expired',fn()=>$t->service->preorderQuote($h['hold_token'],$t->owner,[]));});
$t->test('B4 unaccepted or expired quotes create no partial reservation',function($t){$h=b4hold($t);$t->expectError('quote_required',fn()=>$t->service->confirm($h['hold_token'],$t->guest,$t->owner));$p=b4accept($t,$h,[]);$t->pdo->exec("UPDATE preorder_quotes SET expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND)");$t->expectError('quote_changed',fn()=>$t->service->confirm($h['hold_token'],$t->guest,$t->owner,$p));$t->assert($t->count('reservations')===0&&$t->count('guests')===0);});
$t->test('B4 price or availability changes require explicit new quote acceptance',function($t){$h=b4hold($t);$cart=b4cart($t);$p=b4accept($t,$h,$cart);$t->pdo->prepare('UPDATE menu_items SET price_cents=price_cents+100 WHERE id=?')->execute([$cart[0]['id']]);$t->expectError('quote_changed',fn()=>$t->service->confirm($h['hold_token'],$t->guest,$t->owner,$p));$t->assert($t->count('reservations')===0);$p=b4accept($t,$h,$cart);$t->pdo->prepare('UPDATE menu_items SET is_available=0 WHERE id=?')->execute([$cart[0]['id']]);$t->expectError('item_unavailable',fn()=>$t->service->confirm($h['hold_token'],$t->guest,$t->owner,$p));});
$t->test('B4 accepted snapshot survives reads without firing kitchen or creating credit',function($t){$b=b4book($t);$p=$b['booking']['preorder'];$t->assert($p['status']==='scheduled'&&count($p['quote']['lines'])===1&&$t->count('orders')===0&&$t->count('kitchen_tickets')===0&&$t->count('billing_events')===0);[$s,$token]=b4link($t,$b);$r=$s->read($b['r']['code'],$token);$t->assert($r['preorder']['quote']==$p['quote']&&$r['cancel_deadline']===(new DateTimeImmutable($b['r']['starts_at']))->modify('-24 hours')->format('Y-m-d H:i:s'),'Snapshot read');});
$t->test('B4 exact confirmation replay is durable and changed cart/guest cannot reuse it',function($t){$b=b4book($t);$again=$t->service->confirm($b['h']['hold_token'],$t->guest,$t->owner,$b['p']);$t->assert(!$again['created']&&$t->count('reservation_preorders')===1);$bad=$b['p'];$bad['cart'][0]['qty']++;$t->expectError('request_changed',fn()=>$t->service->confirm($b['h']['hold_token'],$t->guest,$t->owner,$bad));$guest=$t->guest;$guest['full_name']='Changed Guest';$t->expectError('request_changed',fn()=>$t->service->confirm($b['h']['hold_token'],$guest,$t->owner,$b['p']));});
$t->test('B4 simultaneous accepted confirmation produces one scheduled cart',function($t){$h=b4hold($t);$p=b4accept($t,$h,b4cart($t));$job=['op'=>'preorder_confirm','token'=>$h['hold_token'],'owner'=>$t->owner,'guest'=>$t->guest,'preorder'=>$p];$r=$t->finishWorkers($t->startWorkers([$job,$job]));$t->assert(count(array_filter($r,fn($x)=>$x['ok']))===2&&$t->count('reservations')===1&&$t->count('reservation_preorders')===1);});
$t->test('B4 private food edit preserves original snapshot and exact retry history once',function($t){$b=b4book($t);[$s,$token]=b4link($t,$b);$cart=$b['p']['cart'];$cart[0]['qty']++;$q=$s->preorder($b['r']['code'],$token,$cart)['quote'];$payload=['cart'=>$cart,'quote_token'=>$q['quote_token'],'accepted'=>true];$one=$s->preorder($b['r']['code'],$token,null,1,$payload)['booking'];$two=$s->preorder($b['r']['code'],$token,null,1,$payload)['booking'];$t->assert($one['version']===2&&$two['version']===2&&count($two['preorder']['history'])===1&&$two['preorder']['accepted_quote']['cart']===$b['p']['cart']);$t->expectError('manage_link_invalid',fn()=>$s->preorder($b['r']['code'],str_repeat('a',64),$cart));});
$t->test('B4 cart edit cutoff is inclusive 24h and rejects one second later',function($t){$b=b4book($t);[$s,$token]=b4link($t,$b);$deadline=(new DateTimeImmutable($b['r']['starts_at'],new DateTimeZone('Asia/Manila')))->modify('-24 hours');$clock=new BookingClock($t->pdo,fn()=>$deadline);(new ManagementService($t->pdo,$clock))->preorder($b['r']['code'],$token,[]);$clock=new BookingClock($t->pdo,fn()=>$deadline->modify('+1 second'));$t->expectError('cutoff_passed',fn()=>(new ManagementService($t->pdo,$clock))->preorder($b['r']['code'],$token,[]));});
$t->test('B4 Standard below minimum seating rolls back staged food and preserves schedule',function($t){$b=b4book($t,'bv_standard',2);$a=b4actor($t);$s=new StaffReservationService($t->pdo,b4clock($t,'09:45:00'));$t->expectError('minimum_not_met',fn()=>$s->transition($a,$b['r']['code'],1,'seat','Minimum rollback'));$t->assert($t->count('orders')===0&&$t->count('kitchen_tickets')===0&&PreorderService::read($t->pdo,(int)$b['r']['id'])['status']==='scheduled');});
$t->test('B4 accepted Standard cart meets minimum and fires once at arrival with saved price',function($t){$b=b4book($t,'bv_standard',2,100000);$a=b4actor($t);$s=new StaffReservationService($t->pdo,b4clock($t,'09:45:00'));$s->transition($a,$b['r']['code'],1,'seat','Arrived');$t->assert($t->count('orders')===1&&$t->count('kitchen_tickets')===1&&PreorderService::read($t->pdo,(int)$b['r']['id'])['status']==='handed_off');$t->expectError('booking_changed',fn()=>$s->transition($a,$b['r']['code'],1,'seat','Repeated arrival'));$t->assert($t->count('orders')===1&&$t->count('kitchen_tickets')===1);});
$t->test('B4 failed early arrival rolls back provisional kitchen handoff',function($t){$b=b4book($t);$s=new StaffReservationService($t->pdo,b4clock($t,'08:00:00'));$t->expectError('seating_window',fn()=>$s->transition(b4actor($t),$b['r']['code'],1,'seat','Too early'));$t->assert($t->count('orders')===0&&$t->count('kitchen_tickets')===0);});
$t->test('B4 cancellation stops unfired food and releases inventory together',function($t){$b=b4book($t);[$s,$token]=b4link($t,$b);$s->cancel($b['r']['code'],$token,1);$t->assert(PreorderService::read($t->pdo,(int)$b['r']['id'])['status']==='cancelled'&&$t->count('orders')===0);});
$t->test('B4 accepted quote cannot be erased or silently rescheduled',function($t){$b=b4book($t);$a=b4actor($t);$t->expectError('preorder_booking_change',fn()=>(new StaffReservationService($t->pdo,new BookingClock($t->pdo)))->delete($a,$b['r']['code'],1));[$s,$token]=b4link($t,$b);$t->expectError('preorder_booking_change',fn()=>$s->modify($b['r']['code'],$token,1,$t->date,'13:00',5,'bv_family',null,null,''));});
$t->test('B4 quote expiry after a real menu lock wait prevents partial confirmation',function($t){
 $h=b4hold($t);$cart=b4cart($t);$p=b4accept($t,$h,$cart);
 $t->pdo->exec("UPDATE preorder_quotes SET expires_at=DATE_ADD(NOW(),INTERVAL 1 SECOND)");
 $t->pdo->beginTransaction();$t->pdo->prepare('SELECT id FROM menu_items WHERE id=? FOR UPDATE')->execute([$cart[0]['id']]);
 $job=['op'=>'preorder_confirm','token'=>$h['hold_token'],'owner'=>$t->owner,'guest'=>$t->guest,'preorder'=>$p];
 $jobs=$t->startWorkers([$job]);usleep(1800000);$t->pdo->commit();$r=$t->finishWorkers($jobs);
 $t->assert(!$r[0]['ok']&&$r[0]['error']==='quote_changed'&&$t->count('reservations')===0);
});
$t->test('B4 simultaneous exact private food saves keep one history/version increment',function($t){
 $b=b4book($t);[$s,$token]=b4link($t,$b);$cart=$b['p']['cart'];$cart[0]['qty']++;
 $q=$s->preorder($b['r']['code'],$token,$cart)['quote'];$payload=['cart'=>$cart,'quote_token'=>$q['quote_token'],'accepted'=>true];
 $job=['op'=>'preorder_edit','code'=>$b['r']['code'],'token'=>$token,'version'=>1,'preorder'=>$payload];
 $r=$t->finishWorkers($t->startWorkers([$job,$job]));$saved=$s->read($b['r']['code'],$token);
 $t->assert(count(array_filter($r,fn($x)=>$x['ok']))===2&&$saved['version']===2&&count($saved['preorder']['history'])===1);
});
$t->test('B4 unavailable scheduled food cannot bypass the existing kitchen stock guard',function($t){
 $b=b4book($t);$t->pdo->prepare('UPDATE menu_items SET is_available=0 WHERE id=?')->execute([$b['p']['cart'][0]['id']]);
 $s=new StaffReservationService($t->pdo,b4clock($t,'09:45:00'));$t->expectError('menu_unavailable',fn()=>$s->transition(b4actor($t),$b['r']['code'],1,'seat','Stock check'));
 $t->assert($t->count('orders')===0&&$t->count('kitchen_tickets')===0);
});
$t->test('B4 private cutoff is rechecked after a real menu lock wait',function($t){
 $b=b4book($t);[$s,$token]=b4link($t,$b);$cart=$b['p']['cart'];$cart[0]['qty']++;
 $q=$s->preorder($b['r']['code'],$token,$cart)['quote'];$payload=['cart'=>$cart,'quote_token'=>$q['quote_token'],'accepted'=>true];
 $deadline=(new DateTimeImmutable($b['r']['starts_at'],new DateTimeZone('Asia/Manila')))->modify('-24 hours');
 $t->pdo->prepare('UPDATE preorder_quotes SET expires_at=?')->execute([$deadline->modify('+5 minutes')->format('Y-m-d H:i:s')]);
 $t->pdo->beginTransaction();$t->pdo->prepare('SELECT id FROM menu_items WHERE id=? FOR UPDATE')->execute([$cart[0]['id']]);
 $job=['op'=>'preorder_edit_cutoff','code'=>$b['r']['code'],'token'=>$token,'version'=>1,'preorder'=>$payload,'clock_base'=>$deadline->modify('-1 second')->format('Y-m-d H:i:s')];
 $jobs=$t->startWorkers([$job]);usleep(3200000);$t->pdo->commit();$results=$t->finishWorkers($jobs);
 $t->assert(!$results[0]['ok']&&($results[0]['error']??null)==='cutoff_passed'&&PreorderService::read($t->pdo,(int)$b['r']['id'])['version']===1,'Cutoff worker: '.json_encode($results));
});
$t->finish();
