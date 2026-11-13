<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/autoload.php';
require __DIR__ . '/BookingHarness.php';
use App\Core\{Database,StaffAccess};
use App\Domain\BookingError;
use App\Service\{BookingClock,BookingService,PreorderService,StaffReservationService,StaffAuthService,OrderService,BillingService,DailyReportService};
$config = require dirname(__DIR__) . '/config/database.php';
if (getenv('BOOKING_TEST_MODE') !== 'isolated' || $config['database'] !== 'tablebook_p3_test' || !str_starts_with($config['host'], 'bv-menu-e2e-')) throw new RuntimeException('This resetting verification is restricted to a disposable bv-menu-e2e database copy.');
$t = new BookingHarness();
$t->reset(); // This host guard prevents touching the real local preview.
$pdo = $t->pdo; $checks = 0;
function checked(string $label, bool $condition): void {
    global $checks;
    if (!$condition) throw new RuntimeException($label);
    $checks++; echo "PASS $label\n";
}
function denied(string $code, Closure $work): bool {
    try {$work();} catch (BookingError $error) {return $error->errorCode === $code;}
    return false;
}
function uuid(): string {return bin2hex(random_bytes(4)).'-'.bin2hex(random_bytes(2)).'-'.bin2hex(random_bytes(2)).'-'.bin2hex(random_bytes(2)).'-'.bin2hex(random_bytes(6));}
function one(PDO $pdo,string $sql,array $args=[]): array {$q=$pdo->prepare($sql);$q->execute($args);$r=$q->fetch();if(!$r)throw new RuntimeException('Expected test row.');return $r;}
function scalar(PDO $pdo,string $sql,array $args=[]): mixed {$q=$pdo->prepare($sql);$q->execute($args);return $q->fetchColumn();}
$manifest = json_decode(file_get_contents(dirname(__DIR__).'/database/catalogs/bella-vista-menu-20261107.json'),true,512,JSON_THROW_ON_ERROR);
$menu = $pdo->query('SELECT m.* FROM menu_items m JOIN menu_categories c ON c.id=m.category_id WHERE c.is_active=1 AND m.is_available=1 ORDER BY m.sort_order,m.id')->fetchAll();
$byCode = array_column($menu,null,'code');
checked('All24 curated dishes have their exact original menu prices in the disposable database',count($menu)===24 && array_reduce($manifest['items'],fn($ok,$m)=>$ok && isset($byCode[$m['code']]) && (int)$byCode[$m['code']]['price_cents']===$m['price_cents'],true));
$menuHash = hash('sha256',json_encode($menu,JSON_THROW_ON_ERROR));
$password = bin2hex(random_bytes(24)); $actors=[]; $emails=[];
foreach(['admin','server','kitchen'] as $role){
    $roleId=(int)scalar($pdo,'SELECT id FROM roles WHERE code=?',[$role]);$email='curated-e2e-'.$role.'@example.test';
    $pdo->prepare('INSERT INTO users(role_id,email,full_name,password_hash,is_active) VALUES (?,?,?,?,1)')->execute([$roleId,$email,'Curated E2E '.$role,StaffAuthService::password($password)]);
    $u=one($pdo,'SELECT * FROM users WHERE email=?',[$email]);$actors[$role]=['id'=>(int)$u['id'],'stamp'=>StaffAccess::stamp($u)];$emails[$role]=$email;
}
$clock = new BookingClock($pdo);
$booking = new BookingService($pdo,$clock);
$all = array_map(fn($m)=>['id'=>(int)$m['id'],'qty'=>1],$menu);
$inasal=(int)$byCode['bv26_inasal']['id'];
$cases=[
 'standard'=>['category'=>'bv_standard','party'=>2,'cart'=>[['id'=>$inasal,'qty'=>2]],'base'=>0,'extra'=>0],
 'family'=>['category'=>'bv_family','party'=>5,'cart'=>$all,'base'=>50000,'extra'=>0],
 'vip'=>['category'=>'bv_vip','party'=>18,'cart'=>$all,'base'=>250000,'extra'=>90000],
];
$results=[];
foreach($cases as $name=>$case){
    $owner=hash('sha256','curated-e2e-'.$name);$guest=['full_name'=>'Curated E2E '.ucfirst($name),'phone'=>'+639000000001','email'=>'curated-e2e-'.$name.'@example.test'];
    $hold=$booking->hold($t->date,'10:00',$case['party'],$case['category'],$owner);
    if($name==='standard'){
        $bad=$case['cart'];$bad[0]['unit_price_cents']=1;
        checked('Guest-supplied fake unit price is rejected',denied('invalid_cart',fn()=>$booking->preorderQuote($hold['hold_token'],$owner,$bad)));
    }
    $quote=$booking->preorderQuote($hold['hold_token'],$owner,$case['cart']);
    $food=array_sum(array_map(fn($line)=>$line['qty']*(int)scalar($pdo,'SELECT price_cents FROM menu_items WHERE id=?',[$line['id']]),$case['cart']));
    checked($name.': server quote uses exact dish totals and separates consumable base/VIP extras',$quote['food_cents']===$food && $quote['fees']['base_fee_cents']===$case['base'] && $quote['fees']['extra_cents']===$case['extra'] && $quote['estimated_due_cents']===$food+$case['extra'] && $quote['received_cents']===0);
    $payload=['cart'=>$case['cart'],'quote_token'=>$quote['quote_token'],'accepted'=>true];
    $confirmed=$booking->confirm($hold['hold_token'],$guest,$owner,$payload);
    $r=one($pdo,'SELECT * FROM reservations WHERE code=?',[$confirmed['code']]);$rid=(int)$r['id'];
    $again=$booking->confirm($hold['hold_token'],$guest,$owner,$payload);
    checked($name.': confirmation replay keeps one accepted pre-order',$again['created']===false && (int)scalar($pdo,'SELECT COUNT(*) FROM reservation_preorders WHERE reservation_id=?',[$rid])===1);
    $fresh=Database::connect($config);$saved=PreorderService::read($fresh,$rid);
    checked($name.': accepted names, quantities and prices survive a fresh database connection',$saved['quote']['food_cents']===$food && array_column($saved['quote']['lines'],'unit_price_cents')===array_column($quote['lines'],'unit_price_cents') && array_column($saved['quote']['lines'],'name')===array_column($quote['lines'],'name'));
    $arrival=new BookingClock($pdo,fn()=>new DateTimeImmutable($t->date.' 10:00:00',new DateTimeZone('Asia/Manila')));
    $staff=new StaffReservationService($pdo,$arrival);
    $staff->transition($actors['admin'],$r['code'],(int)$r['version'],'seat','Disposable curated-menu arrival');
    $preorder=PreorderService::read($pdo,$rid);$oid=(int)$preorder['order_id'];
    checked($name.': seating hands the accepted cart to exactly one order and kitchen ticket',$preorder['status']==='handed_off' && (int)scalar($pdo,'SELECT COUNT(*) FROM orders WHERE reservation_id=?',[$rid])===1 && (int)scalar($pdo,'SELECT COUNT(*) FROM kitchen_tickets WHERE order_id=?',[$oid])===1);
    $q=$pdo->prepare('SELECT menu_item_id,item_name,qty,unit_price_cents FROM order_items WHERE order_id=? ORDER BY menu_item_id');$q->execute([$oid]);$orderLines=$q->fetchAll();
    $expected=$quote['lines'];usort($expected,fn($a,$b)=>$a['id']<=>$b['id']);
    checked($name.': order-line snapshots match every selected menu ID, name, quantity and unit price',count($orderLines)===count($expected) && array_reduce(array_keys($expected),fn($ok,$i)=>$ok && (int)$orderLines[$i]['menu_item_id']===$expected[$i]['id'] && $orderLines[$i]['item_name']===$expected[$i]['name'] && (int)$orderLines[$i]['qty']===$expected[$i]['qty'] && (int)$orderLines[$i]['unit_price_cents']===$expected[$i]['unit_price_cents'],true));
    $orders=new OrderService($pdo,$arrival);
    $version=(int)scalar($pdo,'SELECT version FROM orders WHERE id=?',[$oid]);$orders->mutate($actors['server'],$oid,$version,'claim',uuid());
    $queue=$orders->kitchen($actors['kitchen'],$t->date);$ticket=array_values(array_filter($queue['tickets'],fn($x)=>(int)$x['order_id']===$oid));
    checked($name.': actual kitchen role receives the table-linked selected dishes',count($ticket)===1 && count($ticket[0]['items'])===count($case['cart']) && $ticket[0]['tables']!=='');
    foreach(['start'=>'kitchen','ready'=>'kitchen','serve'=>'server','close'=>'server'] as $action=>$role){
        $version=(int)scalar($pdo,'SELECT version FROM orders WHERE id=?',[$oid]);$key=uuid();
        $out=$orders->mutate($actors[$role],$oid,$version,$action,$key);
        if($action==='start'){
            $replay=$orders->mutate($actors[$role],$oid,$version,$action,$key);
            checked($name.': kitchen retry does not create duplicate tickets',($replay['replayed']??false)===true && (int)scalar($pdo,'SELECT COUNT(*) FROM kitchen_tickets WHERE order_id=?',[$oid])===1);
        }
    }
    checked($name.': kitchen preparation, readiness, serving and service closure persist',scalar($pdo,'SELECT status FROM orders WHERE id=?',[$oid])==='closed' && scalar($pdo,'SELECT status FROM kitchen_tickets WHERE order_id=?',[$oid])==='served' && (int)scalar($pdo,"SELECT COUNT(*) FROM order_items WHERE order_id=? AND status<>'served'",[$oid])===0);
    $billing=new BillingService($pdo,$arrival);
    $bill=$billing->quote($actors['admin'],$rid);
    checked($name.': cashier reads the same food subtotal and no fictitious payment',$bill['food_cents']===$food && $bill['due_cents']===$food+$case['extra'] && $bill['received_cents']===0);
    checked($name.': kitchen role cannot access cashier records',denied('staff_forbidden',fn()=>$billing->quote($actors['kitchen'],$rid)));
    if($case['base']>0){
        $billing->mutate($actors['admin'],$rid,'advance',$bill['revision'],uuid(),['amount_cents'=>$case['base'],'method'=>'cash','reason'=>'Disposable demo base receipt; no real money']);
        $bill=$billing->quote($actors['admin'],$rid);
        checked($name.': actual demo consumable receipt is credited exactly once',$bill['credit_applied_cents']===$case['base'] && $bill['due_cents']===$food+$case['extra']-$case['base']);
    }
    $key=uuid();$data=['amount_cents'=>$bill['due_cents'],'method'=>'cash','reason'=>'Disposable demo meal receipt; no real money'];$revision=$bill['revision'];
    $billing->mutate($actors['admin'],$rid,'payment',$revision,$key,$data);
    $replay=$billing->mutate($actors['admin'],$rid,'payment',$revision,$key,$data);
    $bill=$billing->quote($actors['admin'],$rid);
    checked($name.': repeated payment record is idempotent and leaves zero balance',($replay['replayed']??false)===true && $bill['due_cents']===0 && (int)scalar($pdo,"SELECT COUNT(*) FROM billing_events WHERE request_key=?",[$key])===1);
    $billing->mutate($actors['admin'],$rid,'finalize',$bill['revision'],uuid(),[]);
    $freshBill=(new BillingService(Database::connect($config),new BookingClock($pdo)))->quote($actors['admin'],$rid);
    checked($name.': finalized bill survives a fresh read with exact food and extra totals',$freshBill['status']==='finalized' && $freshBill['food_cents']===$food && $freshBill['extra_cents']===$case['extra'] && $freshBill['due_cents']===0);
    $row=$staff->row($r['code']);$staff->transition($actors['admin'],$r['code'],(int)$row['version'],'complete','Disposable meal finished');
    $results[$name]=['reservation_id'=>$rid,'code'=>$r['code'],'order_id'=>$oid,'food_cents'=>$food,'base_credit_cents'=>$case['base'],'extra_cents'=>$case['extra'],'received_cents'=>$food+$case['extra'],'due_cents'=>0,'line_count'=>count($case['cart'])];
}
// Prove the Standard minimum uses current selected-dish prices and rolls back seating.
$owner=hash('sha256','curated-e2e-below-minimum');$hold=$booking->hold($t->date,'14:00',2,'bv_standard',$owner);$cart=[['id'=>$inasal,'qty'=>1]];
$quote=$booking->preorderQuote($hold['hold_token'],$owner,$cart);$c=$booking->confirm($hold['hold_token'],['full_name'=>'Curated E2E Minimum','phone'=>'+639000000002','email'=>'curated-e2e-minimum@example.test'],$owner,['cart'=>$cart,'quote_token'=>$quote['quote_token'],'accepted'=>true]);
$r=one($pdo,'SELECT * FROM reservations WHERE code=?',[$c['code']]);$arrival=new BookingClock($pdo,fn()=>new DateTimeImmutable($t->date.' 14:00:00',new DateTimeZone('Asia/Manila')));
checked('PHP580 Standard food order is refused at seating without creating an order or ticket',denied('minimum_not_met',fn()=>(new StaffReservationService($pdo,$arrival))->transition($actors['admin'],$r['code'],(int)$r['version'],'seat','Disposable minimum refusal')) && (int)scalar($pdo,'SELECT COUNT(*) FROM orders WHERE reservation_id=?',[$r['id']])===0 && PreorderService::read($pdo,(int)$r['id'])['status']==='scheduled');
$report=(new DailyReportService($pdo,$clock))->daily($actors['admin'],$t->date);
checked('Daily finalized food sales reconcile to all three completed new-menu meals',$report['food']['finalized_cents']===array_sum(array_column($results,'food_cents')));
$after=$pdo->query('SELECT m.* FROM menu_items m JOIN menu_categories c ON c.id=m.category_id WHERE c.is_active=1 AND m.is_available=1 ORDER BY m.sort_order,m.id')->fetchAll();
checked('All24 current menu records and prices are unchanged by the full-flow tests',hash('sha256',json_encode($after,JSON_THROW_ON_ERROR))===$menuHash);
$private=['date'=>$t->date,'password'=>$password,'emails'=>$emails,'results'=>$results];file_put_contents('/tmp/curated-menu-e2e-private.json',json_encode($private,JSON_THROW_ON_ERROR));chmod('/tmp/curated-menu-e2e-private.json',0600);
file_put_contents('/tmp/curated-menu-e2e-result.json',json_encode(['checks'=>$checks,'date'=>$t->date,'results'=>$results],JSON_THROW_ON_ERROR|JSON_PRETTY_PRINT));
echo json_encode(['checks_passed'=>$checks,'scenarios'=>$results,'all24_prices_unchanged'=>true],JSON_THROW_ON_ERROR)."\n";
