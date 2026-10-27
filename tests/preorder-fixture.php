<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/autoload.php';
require __DIR__.'/BookingHarness.php';
define('PREORDER_FIXTURE_ONLY',true);require __DIR__.'/preorders.php';
$in=json_decode(stream_get_contents(STDIN),true,16,JSON_THROW_ON_ERROR);
if($in['action']==='prepare'){
 $t->reset();b4actor($t);echo json_encode(['date'=>$t->date,'menu'=>b4cart($t,100000)]);
}elseif($in['action']==='verify'){
 $rows=$t->pdo->query('SELECT r.code,p.status,p.current_json,p.order_id FROM reservations r JOIN reservation_preorders p ON p.reservation_id=r.id ORDER BY r.id')->fetchAll();
 echo json_encode(['bookings'=>count($rows),'orders'=>$t->count('orders'),'tickets'=>$t->count('kitchen_tickets'),'scheduled'=>count(array_filter($rows,fn($r)=>$r['status']==='scheduled'))]);
}elseif($in['action']==='staff_sample'){
 echo json_encode(['date'=>$t->date,'rows'=>$t->pdo->query("SELECT r.code,p.status FROM reservations r JOIN reservation_preorders p ON p.reservation_id=r.id ORDER BY r.id")->fetchAll()]);
}elseif($in['action']==='seat'){
 $code=$in['code'];$s=new App\Service\StaffReservationService($t->pdo,b4clock($t,'09:45:00'));$r=$s->row($code);$s->transition(b4actor($t),$code,(int)$r['version'],'seat','Browser fixture arrival using real locked service');echo json_encode(['ok'=>true]);
}elseif($in['action']==='expire'){
 $t->pdo->prepare('UPDATE holds SET expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE hold_token=?')->execute([$in['hold_token']]);echo json_encode(['ok'=>true]);
}elseif($in['action']==='price'){
 $t->pdo->prepare('UPDATE menu_items SET price_cents=price_cents+? WHERE id=?')->execute([(int)$in['delta'],(int)$in['id']]);echo json_encode(['ok'=>true]);
}else throw new RuntimeException('Unknown isolated fixture action');
