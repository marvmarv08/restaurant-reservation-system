<?php
declare(strict_types=1);
namespace App\Service;

use App\Core\StaffAccess;
use App\Domain\BookingError;
use PDO;

final class BillingService
{
    public function __construct(private readonly PDO $pdo,private readonly BookingClock $clock) {}
    public static function enabled(PDO $pdo): bool
    {
        $q=$pdo->query("SELECT svalue FROM settings WHERE skey='billing_profile'");
        return $q->fetchColumn()==='bella_vista_b3';
    }
    private function query(string $sql,array $args=[]): \PDOStatement
    {
        $q=$this->pdo->prepare($sql);$q->execute($args);return $q;
    }
    private function fail(string $code,string $message,int $status=409): never {throw new BookingError($code,$message,$status);}
    private function actor(array $actor,bool $lock=false): array
    {
        $user=StaffAccess::require($this->pdo,$actor,'orders.read',$lock);
        if(!in_array($user['role'],['admin','manager'],true))$this->fail('staff_forbidden','Only a manager or administrator can access cashier records.',403);
        if(!self::enabled($this->pdo))$this->fail('billing_unavailable','Billing is not activated in this application.',404);
        return $user;
    }
    private function reservation(int $id,bool $lock=false): array
    {
        $r=$this->query('SELECT r.*,ty.code AS category_code,ty.name AS category_name FROM reservations r JOIN room_types ty ON ty.id=r.room_type_id WHERE r.id=?'.($lock?' FOR UPDATE':''),[$id])->fetch();
        if(!$r)$this->fail('booking_not_found','Reservation not found.',404);
        return $r;
    }
    public function quote(array $actor,int $reservation): array
    {
        $this->pdo->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        $this->pdo->beginTransaction();
        try {
            $this->actor($actor);
            $result=$this->snapshot($this->reservation($reservation));
            $this->pdo->commit();
            return $result;
        } catch (\Throwable $error) {
            if($this->pdo->inTransaction())$this->pdo->rollBack();
            throw $error;
        }
    }
    public function listing(array $actor,string $date): array
    {
        $this->actor($actor);
        return $this->query("SELECT r.id,r.code,r.party_size,r.status,ty.name AS category,r.starts_at,b.status AS bill_status FROM reservations r JOIN room_types ty ON ty.id=r.room_type_id LEFT JOIN billing_accounts b ON b.reservation_id=r.id WHERE r.starts_at>=? AND r.starts_at<DATE_ADD(?,INTERVAL 1 DAY) AND ty.code IN ('bv_standard','bv_family','bv_vip') ORDER BY r.starts_at,r.id LIMIT 200",[$date,$date])->fetchAll();
    }
    private function snapshot(array $r): array
    {
        $account=$this->query('SELECT * FROM billing_accounts WHERE reservation_id=?',[$r['id']])->fetch();
        $fees=$account?array_intersect_key(array_map(static fn($v)=>is_numeric($v)?(int)$v:$v,$account),array_flip(['base_fee_cents','extra_cents','minimum_cents'])):BillingFees::assess($r['category_code'],(int)$r['party_size']);
        if($account&&($account['category_code']!==$r['category_code']||(int)$account['party_size']!==(int)$r['party_size']))$this->fail('billing_snapshot_conflict','Saved fee terms differ from the reservation. A manager must reconcile its history.');
        $items=$this->query("SELECT i.id,i.qty,i.unit_price_cents,i.status,o.id AS order_id,o.status AS order_status,o.version FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.reservation_id=? ORDER BY i.id",[$r['id']])->fetchAll();
        $events=$account?$this->query('SELECT id,kind,amount_cents,method,reason,actor_user_id,created_at FROM billing_events WHERE account_id=? ORDER BY id',[$account['id']])->fetchAll():[];
        $food=0;$unserved=0;
        foreach($items as $i){if($i['status']==='void'||$i['order_status']==='void')continue;$food+=(int)$i['qty']*(int)$i['unit_price_cents'];if($i['status']!=='served')$unserved++;}
        $sums=['advance'=>0,'payment'=>0,'refund_credit'=>0];foreach($events as $e)if(isset($sums[$e['kind']]))$sums[$e['kind']]+=(int)$e['amount_cents'];
        $policy=ReservationPolicyService::enabled($this->pdo)?(new ReservationPolicyService($this->pdo,$this->clock))->moneySnapshot((int)$r['id']):[];
        $money=$policy['policy_money']??['refund_base'=>0,'net_extra_cents'=>0];
        $totals=BillingFees::totals($fees,$food,$sums['advance'],$sums['payment'],$sums['refund_credit']+$money['refund_base']);
        $totals['due_cents']=max(0,$totals['due_cents']-$money['net_extra_cents']);
        $totals['received_cents']+=$money['net_extra_cents'];
        if(isset($policy['policy'])&&in_array($r['status'],['cancelled','no_show'],true)){
            $totals['due_cents']=0;$totals['credit_applied_cents']=0;
            $totals['unused_credit_cents']=max(0,$money['net_base_cents']-$policy['policy']['forfeited_base_cents']);
        }
        $state=['reservation_version'=>(int)$r['version'],'reservation_status'=>$r['status'],'category'=>$r['category_code'],'party'=>(int)$r['party_size'],'items'=>$items,'events'=>$events,'account'=>$account,'policy'=>$policy];
        return $totals+$policy+['reservation_id'=>(int)$r['id'],'code'=>$r['code'],'status'=>$account['status']??'unopened','reservation_status'=>$r['status'],'category'=>$r['category_code'],'category_name'=>$r['category_name'],'party_size'=>(int)$r['party_size'],'unserved_items'=>$unserved,'open_orders'=>(int)$this->query("SELECT COUNT(*) FROM orders WHERE reservation_id=? AND status NOT IN ('closed','paid','void')",[$r['id']])->fetchColumn(),'receipts'=>$events,'revision'=>hash('sha256',json_encode($state,JSON_THROW_ON_ERROR))];
    }
    public function mutate(array $actor,int $id,string $action,string $revision,string $key,array $data): array
    {
        $this->actor($actor);
        if(!in_array($action,ReservationPolicyService::enabled($this->pdo)?['advance','payment','refund_credit','finalize','extra_receipt','refund_base','refund_extra','review_cancellation']:['advance','payment','refund_credit','finalize'],true)||!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/D',$key)||!preg_match('/^[a-f0-9]{64}$/D',$revision))$this->fail('invalid_request','Choose a valid action, quote and request key.',422);
        ksort($data);$hash=hash('sha256',json_encode([$id,$action,$revision,$data],JSON_THROW_ON_ERROR));$initial=$this->reservation($id);
        return (new BookingTransaction($this->pdo))->run(function()use($actor,$id,$action,$revision,$key,$data,$hash,$initial):array{
            $tx=new BookingTransaction($this->pdo);$tx->lockDays([substr($initial['starts_at'],0,10)]);$tx->lockTables($this->query('SELECT id FROM `tables` ORDER BY id')->fetchAll(PDO::FETCH_COLUMN),false);
            $r=$this->reservation($id,true);
            if(substr($r['starts_at'],0,10)!==substr($initial['starts_at'],0,10))$this->fail('bill_changed','Reservation service date changed; refresh the bill.');
            $this->query('SELECT id FROM orders WHERE reservation_id=? ORDER BY id FOR UPDATE',[$id])->fetchAll();
            $user=$this->actor($actor,true);
            $old=$this->query('SELECT * FROM billing_requests WHERE user_id=? AND request_key=?',[$user['id'],$key])->fetch();
            if($old){if(!hash_equals($old['payload_hash'],$hash))$this->fail('request_changed','This request key was used for different input.');return json_decode($old['response_json'],true,16,JSON_THROW_ON_ERROR)+['replayed'=>true];}
            $q=$this->snapshot($r);
            if(!hash_equals($q['revision'],$revision))$this->fail('bill_changed','The food, booking or receipts changed. Review the new bill.');
            if($q['status']==='finalized')$this->fail('bill_finalized','This bill is finalized; its financial history is protected.');
            $policyAction=ReservationPolicyService::enabled($this->pdo)&&(in_array($action,['extra_receipt','refund_base','refund_extra','review_cancellation'],true)||($action==='finalize'&&in_array($r['status'],['cancelled','no_show'],true)));
            if(!$policyAction&&!in_array($r['status'],['confirmed','seated','completed'],true))$this->fail('billing_stage','This reservation cannot receive a new payment or bill closure.');
            $amount=0;$method='none';$reason='Bill finalized after review';
            if($policyAction){(new ReservationPolicyService($this->pdo,$this->clock))->finance($r,$action,$data,$user,$q,$key);}
            elseif($action==='finalize'){
                if(array_diff(array_keys($data),['review_reason'])!==[])$this->fail('invalid_request','Finalization accepts only its reviewed quote and any required manager reason.',422);
                if($q['unused_credit_cents']>0)$this->fail('unused_credit','Resolve unused received food credit with a recorded manager refund before closure.');
                if($q['due_cents']>0)$this->fail('balance_due','Record the remaining onsite payment before closure.');
                if(!$q['minimum_met'])$this->fail('minimum_not_met','The Standard food order must reach ₱1,000.');
                if($q['unserved_items']>0||!in_array($r['status'],['seated','completed'],true))$this->fail('food_not_served','Finalize only after the meal has been served.');
                if($q['open_orders']>0)$this->fail('service_not_closed','Close served order rounds in the service workspace before finalizing the bill.');
                if($q['food_cents']<$q['base_fee_cents']&&$q['refund_cents']===0){
                    $review=$data['review_reason']??'';
                    if(!is_string($review)||strlen(trim($review))<10||strlen($review)>180||preg_match('/[\x00-\x1F]/',$review))$this->fail('fee_review_required','A manager must record how the unused unreceived consumable allowance was reviewed; no extra food minimum or refund is invented.');
                    $reason='Manager-reviewed unused allowance: '.trim($review);
                }
            }else{
                if(array_diff(array_keys($data),['amount_cents','method','reason'])!==[])$this->fail('invalid_request','Only receipt amount, method and reason are accepted.',422);
                $amount=$data['amount_cents']??null;$method=$data['method']??'';$reason=$data['reason']??'';
                if(!is_int($amount)||$amount<1||$amount>BillingFees::MAX_CENTS)$this->fail('invalid_amount','Use a positive integer amount in centavos.',422);
                if(!in_array($method,['cash','external_card'],true)||!is_string($reason)||strlen(trim($reason))<3||strlen($reason)>255||preg_match('/[\x00-\x1F]/',$reason))$this->fail('invalid_request','Record cash or externally completed card payment and a short reason.',422);
                if($action==='advance'&&($amount>$q['base_fee_cents']-($q['advance_cents']-$q['refund_cents'])||$q['payment_cents']>0))$this->fail('invalid_amount','Consumable receipts cannot exceed the base fee or follow final-bill payments.',422);
                if($action==='payment'){
                    if($amount>$q['due_cents'])$this->fail('invalid_amount','Amount applied cannot exceed the remaining bill balance.',422);
                    if($q['unserved_items']>0||!in_array($r['status'],['seated','completed'],true))$this->fail('food_not_served','Record meal settlement only after food service.');
                }
                if($action==='refund_credit'){
                    if(!in_array($r['status'],['seated','completed'],true)||$q['unserved_items']>0)$this->fail('refund_review','This action records only reviewed unused food credit after dining; cancellations need the separate policy workflow.');
                    if($amount>$q['unused_credit_cents'])$this->fail('invalid_amount','Refund cannot exceed unused actual base receipts.',422);
                }
            }
            $account=$this->query('SELECT id FROM billing_accounts WHERE reservation_id=?',[$id])->fetchColumn();
            if(!$account){$this->query('INSERT INTO billing_accounts(reservation_id,category_code,party_size,base_fee_cents,extra_cents,minimum_cents) VALUES (?,?,?,?,?,?)',[$id,$r['category_code'],$r['party_size'],$q['base_fee_cents'],$q['extra_cents'],$q['minimum_cents']]);$account=(int)$this->pdo->lastInsertId();}
            if(!$policyAction||$action==='finalize')$this->query('INSERT INTO billing_events(account_id,actor_user_id,request_key,kind,amount_cents,method,reason) VALUES (?,?,?,?,?,?,?)',[$account,$user['id'],$key,$action,$amount,$method,trim($reason)]);
            if($action==='finalize')$this->query("UPDATE billing_accounts SET status='finalized',final_snapshot=? WHERE id=?",[json_encode($q,JSON_THROW_ON_ERROR),$account]);
            $response=['bill'=>$this->snapshot($r)];
            $this->query('INSERT INTO billing_requests(user_id,request_key,account_id,payload_hash,response_json) VALUES (?,?,?,?,?)',[$user['id'],$key,$account,$hash,json_encode($response,JSON_THROW_ON_ERROR)]);
            return $response+['replayed'=>false];
        });
    }
    public static function protectReservation(PDO $pdo,int $id): void
    {
        if(!self::enabled($pdo))return;
        $q=$pdo->prepare('SELECT id FROM billing_accounts WHERE reservation_id=?');$q->execute([$id]);
        if($q->fetchColumn())throw new BookingError('booking_has_billing','A manager must reconcile the bill before changing, cancelling or deleting this reservation.',409);
    }
    public static function protectOrder(PDO $pdo,int $reservation,string $action): void
    {
        if(!self::enabled($pdo))return;
        $q=$pdo->prepare('SELECT status FROM billing_accounts WHERE reservation_id=?');$q->execute([$reservation]);$status=$q->fetchColumn();
        if($status==='finalized')throw new BookingError('bill_finalized','This finalized bill protects its food records.',409);
        if($status!==false&&in_array($action,['edit','void'],true))throw new BookingError('billing_review_required','Review received funds before reducing or voiding billed food.',409);
    }
    public static function checkMinimum(PDO $pdo,int $reservation): void
    {
        if(!self::enabled($pdo))return;
        $q=$pdo->prepare("SELECT ty.code FROM reservations r JOIN room_types ty ON ty.id=r.room_type_id WHERE r.id=?");$q->execute([$reservation]);
        $category=$q->fetchColumn();
        $q=$pdo->prepare("SELECT COALESCE(SUM(i.qty*i.unit_price_cents),0) FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.reservation_id=? AND o.status<>'void' AND i.status<>'void'");$q->execute([$reservation]);
        $total=(int)$q->fetchColumn();
        if($total>BillingFees::MAX_CENTS)throw new BookingError('invalid_amount','Combined food rounds exceed the supported billing amount.',422);
        if($category==='bv_standard'&&$total<100000)throw new BookingError('minimum_not_met','Standard seating requires at least ₱1,000 in accepted food orders.',409);
    }
    public static function seatingOrder(PDO $pdo,array $reservation,array $items,int $actor): void
    {
        if(!self::enabled($pdo)||$reservation['room_code']!=='bv_standard')return;
        if(!array_is_list($items)||count($items)>30)throw new BookingError('invalid_cart','Choose at most thirty menu lines.');
        if($items!==[]){
            $q=$pdo->prepare('SELECT table_id FROM reservation_tables WHERE reservation_id=? AND released_at IS NULL ORDER BY table_id');$q->execute([$reservation['id']]);$table=$q->fetchColumn();
            if(!$table)throw new BookingError('inventory_changed','This reservation has no assigned table.');
            $pdo->prepare("INSERT INTO orders(reservation_id,table_id,opened_by,status) VALUES (?,?,?,'open')")->execute([$reservation['id'],$table,$actor]);$order=(int)$pdo->lastInsertId();$total=0;$seen=[];
            foreach($items as $item){
                if(!is_array($item)||array_diff(array_keys($item),['id','qty'])!==[]||!is_int($item['id']??null)||!is_int($item['qty']??null)||$item['qty']<1||$item['qty']>30||isset($seen[$item['id']]))throw new BookingError('invalid_cart','Use distinct menu items and quantities from 1 to 30.');
                $seen[$item['id']]=true;$q=$pdo->prepare('SELECT m.* FROM menu_items m JOIN menu_categories c ON c.id=m.category_id WHERE m.id=? AND m.is_available=1 AND c.is_active=1 FOR UPDATE');$q->execute([$item['id']]);$m=$q->fetch();
                if(!$m)throw new BookingError('invalid_cart','A selected menu item is unavailable.');
                $total+=$item['qty']*(int)$m['price_cents'];if($total>BillingFees::MAX_CENTS)throw new BookingError('invalid_amount','Order exceeds the supported amount.');
                $pdo->prepare("INSERT INTO order_items(order_id,menu_item_id,qty,unit_price_cents,item_name,station_snapshot,tags_snapshot) VALUES (?,?,?,?,?,?,?)")->execute([$order,$m['id'],$item['qty'],$m['price_cents'],$m['name'],$m['station'],$m['tags_json']]);
            }
            $pdo->prepare('UPDATE orders SET subtotal_cents=?,total_cents=? WHERE id=?')->execute([$total,$total,$order]);
        }
        self::checkMinimum($pdo,(int)$reservation['id']);
    }
}
