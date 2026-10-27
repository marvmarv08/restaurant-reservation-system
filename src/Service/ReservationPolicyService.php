<?php
declare(strict_types=1);
namespace App\Service;
use App\Domain\BookingError;
use DateTimeImmutable;
use DateTimeZone;
use PDO;
final class ReservationPolicyService
{
    public function __construct(private readonly PDO $pdo,private readonly BookingClock $clock){}
    public static function enabled(PDO $pdo):bool{return $pdo->query("SELECT svalue FROM settings WHERE skey='policy_profile'")->fetchColumn()==='bella_vista_b5';}
    private function query(string $sql,array $args=[]):\PDOStatement{$q=$this->pdo->prepare($sql);$q->execute($args);return $q;}
    public static function read(PDO $pdo,int $id):?array
    {
        if(!self::enabled($pdo))return null;
        $q=$pdo->prepare('SELECT * FROM reservation_policies WHERE reservation_id=?');$q->execute([$id]);$p=$q->fetch();
        if(!$p)return null;
        $p['forfeited_base_cents']=(int)$p['forfeited_base_cents'];$p['reviewed']=(bool)$p['reviewed'];
        foreach(['accepted_json','terminal_json'] as $f)$p[$f]=$p[$f]===null?null:json_decode($p[$f],true,32,JSON_THROW_ON_ERROR);
        return $p;
    }
    public function deadline(array $r):DateTimeImmutable
    {
        $p=self::read($this->pdo,(int)$r['id']);
        return new DateTimeImmutable($p['deadline_at']??(new DateTimeImmutable($r['starts_at'],new DateTimeZone('Asia/Manila')))->modify('-24 hours')->format('Y-m-d H:i:s'),new DateTimeZone('Asia/Manila'));
    }
    public function event(int $id,string $kind,array $detail,?int $actor=null):void
    {
        $this->query('INSERT INTO reservation_policy_events(reservation_id,kind,actor_user_id,detail_json,created_at) VALUES (?,?,?,?,?)',[$id,$kind,$actor,json_encode($detail,JSON_THROW_ON_ERROR),$this->clock->now()->format('Y-m-d H:i:s')]);
    }
    public function acceptedBooking(int $id,array $snapshot):void
    {
        if(!self::enabled($this->pdo))return;
        $r=$this->query('SELECT * FROM reservations WHERE id=?',[$id])->fetch();
        $deadline=$this->deadline($r)->format('Y-m-d H:i:s');
        $this->query('INSERT INTO reservation_policies(reservation_id,deadline_at,accepted_json,accepted_at) VALUES (?,?,?,?)',[$id,$deadline,json_encode($snapshot,JSON_THROW_ON_ERROR),$snapshot['accepted_at']]);
        $this->event($id,'accept',['terms_version'=>ReservationTerms::VERSION,'deadline_at'=>$deadline,'quote'=>$snapshot]);
    }
    public function staffCreated(int $id,int $actor,string $source):void
    {
        if(!self::enabled($this->pdo))return;
        $r=$this->query('SELECT * FROM reservations WHERE id=?',[$id])->fetch();
        $deadline=$this->deadline($r)->format('Y-m-d H:i:s');
        $this->query('INSERT INTO reservation_policies(reservation_id,deadline_at) VALUES (?,?)',[$id,$deadline]);
        $this->event($id,'create',['source'=>$source,'deadline_at'=>$deadline,'terms_version'=>ReservationTerms::VERSION,'terms'=>ReservationTerms::text(),'guest_acceptance_recorded'=>false],$actor);
    }
    public function balances(int $id):array
    {
        $base=(int)$this->query("SELECT COALESCE(SUM(CASE WHEN e.kind='advance' THEN e.amount_cents WHEN e.kind='refund_credit' THEN -e.amount_cents ELSE 0 END),0) FROM billing_events e JOIN billing_accounts a ON a.id=e.account_id WHERE a.reservation_id=?",[$id])->fetchColumn();
        $sum=['extra_receipt'=>0,'refund_base'=>0,'refund_extra'=>0];
        foreach($this->query('SELECT kind,SUM(amount_cents) AS amount FROM policy_money_events WHERE reservation_id=? GROUP BY kind',[$id])->fetchAll() as $r)$sum[$r['kind']]=(int)$r['amount'];
        return ['net_base_cents'=>$base-$sum['refund_base'],'net_extra_cents'=>$sum['extra_receipt']-$sum['refund_extra']]+$sum;
    }
    public function terminal(int $id,string $outcome,?int $actor=null):void
    {
        if(!self::enabled($this->pdo))return;
        $r=$this->query('SELECT * FROM reservations WHERE id=?',[$id])->fetch();$p=self::read($this->pdo,$id);
        if(!$p){$this->query('INSERT INTO reservation_policies(reservation_id,deadline_at) VALUES (?,?)',[$id,$this->deadline($r)->format('Y-m-d H:i:s')]);$p=self::read($this->pdo,$id);}
        if($p['status']!=='active')return;
        if($this->query("SELECT COUNT(*) FROM kitchen_tickets k JOIN orders o ON o.id=k.order_id WHERE o.reservation_id=? AND k.status<>'void'",[$id])->fetchColumn()>0)throw new BookingError('food_already_fired','Food has reached the kitchen. A manager must resolve service before cancellation.',409);
        $a=$this->query('SELECT status FROM billing_accounts WHERE reservation_id=?',[$id])->fetchColumn();
        if($a==='finalized')throw new BookingError('bill_finalized','A finalized financial record cannot be cancelled.',409);
        $b=$this->balances($id);$now=$this->clock->now();
        $decision=ReservationTerms::cancellation(new DateTimeImmutable($r['starts_at'],new DateTimeZone('Asia/Manila')),$now,$this->deadline($r),$b['net_base_cents'],$outcome);
        $this->query("UPDATE order_items i JOIN orders o ON o.id=i.order_id SET i.status='void' WHERE o.reservation_id=? AND o.status NOT IN ('paid','closed')",[$id]);
        $this->query("UPDATE orders SET status='void',closed_at=? WHERE reservation_id=? AND status NOT IN ('paid','closed')",[$now->format('Y-m-d H:i:s'),$id]);
        $detail=$decision+$b+['outcome'=>$outcome,'at'=>$now->format('Y-m-d H:i:s'),'deadline_at'=>$p['deadline_at']];
        $this->query('UPDATE reservation_policies SET status=?,forfeited_base_cents=?,terminal_json=?,reviewed=0 WHERE reservation_id=?',[$outcome,$decision['forfeited_base_cents'],json_encode($detail,JSON_THROW_ON_ERROR),$id]);
        $this->event($id,$outcome,$detail,$actor);
    }
    public function moneySnapshot(int $id):array
    {
        if(!self::enabled($this->pdo))return [];
        $p=self::read($this->pdo,$id);$b=$this->balances($id);
        return ['policy'=>$p,'policy_money'=>$b,'policy_events'=>$this->query('SELECT kind,detail_json,created_at FROM reservation_policy_events WHERE reservation_id=? ORDER BY id',[$id])->fetchAll(),'policy_receipts'=>$this->query('SELECT * FROM policy_money_events WHERE reservation_id=? ORDER BY id',[$id])->fetchAll()];
    }
    public function checkChange(array $r,string $category,int $party,?array $ack):void
    {
        if(!self::enabled($this->pdo))return;
        if(!in_array($r['status'],['pending','confirmed'],true))throw new BookingError('booking_closed','Only an unseated booking can be changed.',409);
        $this->query('INSERT IGNORE INTO reservation_policies(reservation_id,deadline_at) VALUES (?,?)',[$r['id'],$this->deadline($r)->format('Y-m-d H:i:s')]);
        $fees=BillingFees::assess($category,$party);
        $expected=['version'=>ReservationTerms::VERSION]+$fees;
        $valid=is_array($ack)&&count($ack)===count($expected);foreach($expected as $k=>$v)if(($ack[$k]??null)!==$v)$valid=false;
        if(!$valid)throw new BookingError('policy_acceptance_required','Review and accept the replacement schedule, fees and terms before saving.',422);
        if($this->query("SELECT COUNT(*) FROM orders WHERE reservation_id=? AND status NOT IN ('void','closed')",[$r['id']])->fetchColumn()>0)throw new BookingError('food_already_fired','Resolve live food orders before changing the booking.',409);
        $a=$this->query('SELECT status FROM billing_accounts WHERE reservation_id=?',[$r['id']])->fetchColumn();
        if($a==='finalized')throw new BookingError('bill_finalized','A finalized bill cannot be changed.',409);
        $b=$this->balances((int)$r['id']);
        $this->protectSameDayChange($r);
        if($b['net_base_cents']>$fees['base_fee_cents']||$b['net_extra_cents']>$fees['extra_cents'])throw new BookingError('refund_required','Received funds exceed replacement fees. A manager must reconcile eligible refunds before this change.',409);
    }
    private function protectSameDayChange(array $r):void
    {
        $b=$this->balances((int)$r['id']);
        if(substr($r['starts_at'],0,10)===$this->clock->now()->format('Y-m-d')&&$b['net_base_cents']>0)throw new BookingError('same_day_fee_protected','A paid same-day reservation cannot be changed to bypass its protected base fee. Resolve cancellation under the original policy before creating a replacement booking.',409);
    }
    public function changed(array $before,array $after,?int $actor=null):void
    {
        if(!self::enabled($this->pdo))return;
        $q=$this->query('SELECT code FROM room_types WHERE id=?',[$after['room_type_id']]);$fees=BillingFees::assess((string)$q->fetchColumn(),(int)$after['party_size']);
        $old=self::read($this->pdo,(int)$before['id']);if(!$old)return;
        $deadline=min($old['deadline_at'],(new DateTimeImmutable($after['starts_at'],new DateTimeZone('Asia/Manila')))->modify('-24 hours')->format('Y-m-d H:i:s'));
        $this->query('UPDATE reservation_policies SET deadline_at=? WHERE reservation_id=?',[$deadline,$before['id']]);
        $this->event((int)$before['id'],'change',['before'=>$before,'after'=>$after,'fees'=>$fees,'deadline_at'=>$deadline,'terms_version'=>ReservationTerms::VERSION],$actor);
        $this->query('UPDATE billing_accounts SET category_code=(SELECT code FROM room_types WHERE id=?),party_size=?,base_fee_cents=?,extra_cents=?,minimum_cents=? WHERE reservation_id=?',[$after['room_type_id'],$after['party_size'],$fees['base_fee_cents'],$fees['extra_cents'],$fees['minimum_cents'],$before['id']]);
        $p=PreorderService::read($this->pdo,(int)$before['id']);
        if($p){
            $snapshot=$p['quote'];$history=$p['history'];$history[]=['version'=>$p['version'],'quote'=>$snapshot,'replaced_at'=>$this->clock->now()->format('Y-m-d H:i:s')];
            $snapshot['fees']=$fees;$snapshot['estimated_due_cents']=$snapshot['food_cents']+$fees['extra_cents'];$snapshot['reservation_version']=(int)$after['version'];$snapshot['policy_version']=ReservationTerms::VERSION;$snapshot['policy']=ReservationTerms::text();$snapshot['accepted_at']=$this->clock->now()->format('Y-m-d H:i:s');
            foreach($snapshot['lines'] as $i){$m=$this->query('SELECT m.is_available,c.is_active FROM menu_items m JOIN menu_categories c ON c.id=m.category_id WHERE m.id=? FOR UPDATE',[$i['id']])->fetch();if(!$m||!$m['is_available']||!$m['is_active'])throw new BookingError('item_unavailable','A scheduled dish is unavailable. Edit the food before changing the schedule.',409);}
            if(count($history)>50)throw new BookingError('edit_limit','Ask staff to resolve further changes.',409);
            $this->query('UPDATE reservation_preorders SET version=version+1,current_json=?,history_json=? WHERE reservation_id=?',[json_encode($snapshot,JSON_THROW_ON_ERROR),json_encode($history,JSON_THROW_ON_ERROR),$before['id']]);
        }
        $this->protectSameDayChange($before);
    }
    public function finance(array $r,string $action,array $data,array $user,array $bill,string $key):void
    {
        $id=(int)$r['id'];$p=self::read($this->pdo,$id);$terminal=in_array($r['status'],['cancelled','no_show'],true);
        if($action==='review_cancellation'){
            $reason=$data['reason']??'';
            if(!$terminal||!$p||array_diff(array_keys($data),['reason'])!==[]||!is_string($reason)||strlen(trim($reason))<10||strlen($reason)>180||preg_match('/[\x00-\x1F]/',$reason))throw new BookingError('review_required','A manager must record a cancellation/no-show review reason of 10–180 characters.',422);
            $this->query('UPDATE reservation_policies SET reviewed=1 WHERE reservation_id=?',[$id]);$this->event($id,'review',['reason'=>trim($reason)],(int)$user['id']);return;
        }
        if($action==='finalize'){
            $b=$this->balances($id);
            if(!$terminal||!$p||!$p['reviewed']||$b['net_base_cents']>$p['forfeited_base_cents']||$b['net_extra_cents']>0||$data!==[])throw new BookingError('refund_pending','Manager review and actual eligible refunds must be resolved before closing this cancelled/no-show bill.',409);
            return;
        }
        $amount=$data['amount_cents']??null;$method=$data['method']??'';$reason=$data['reason']??'';
        if(array_diff(array_keys($data),['amount_cents','method','reason'])!==[]||!is_int($amount)||$amount<1||$amount>BillingFees::MAX_CENTS||!in_array($method,['cash','external_card'],true)||!is_string($reason)||strlen(trim($reason))<3||strlen($reason)>255||preg_match('/[\x00-\x1F]/',$reason))throw new BookingError('invalid_amount','Record an actual positive centavo amount, cash/external card and reason.',422);
        $b=$this->balances($id);
        if($action==='extra_receipt'){
            if($r['status']!=='confirmed'||$amount>$bill['extra_cents']-$b['net_extra_cents'])throw new BookingError('invalid_amount','Extra-person receipts cannot exceed the unpaid VIP extras before service.',422);
        }else{
            if($terminal){if(!$p||!$p['reviewed'])throw new BookingError('review_required','Review the cancellation/no-show before recording its eligible refund.',409);}
            elseif($r['status']!=='confirmed'||$this->clock->now()>$this->deadline($r))throw new BookingError('refund_not_eligible','Pre-arrival refunds outside the online deadline require cancellation-policy review; same-day base is protected.',409);
            $cap=$action==='refund_base'?$b['net_base_cents']-($p['forfeited_base_cents']??0):$b['net_extra_cents'];
            if(!in_array($action,['refund_base','refund_extra'],true)||$amount>$cap)throw new BookingError('invalid_amount','Refund exceeds eligible actual receipts after earlier refunds/forfeiture.',422);
        }
        $this->query('INSERT INTO policy_money_events(reservation_id,actor_user_id,request_key,kind,amount_cents,method,reason) VALUES (?,?,?,?,?,?,?)',[$id,$user['id'],$key,$action,$amount,$method,trim($reason)]);
    }

    public function reconcile():int
    {
        if(!self::enabled($this->pdo)||$this->pdo->inTransaction())return 0;
        $now=$this->clock->now()->modify('-15 minutes')->format('Y-m-d H:i:s');$count=0;
        $ids=$this->query("SELECT r.id FROM reservations r JOIN room_types t ON t.id=r.room_type_id WHERE t.code IN ('bv_standard','bv_family','bv_vip') AND r.status='confirmed' AND r.starts_at<=? ORDER BY r.starts_at,r.id LIMIT 100",[$now])->fetchAll(PDO::FETCH_COLUMN);
        foreach($ids as $id){
            try{
                $result=(new BookingService($this->pdo,$this->clock))->cancel((int)$id,'Automatic release: absent at the 15-minute arrival deadline',function()use($id):void{
                    $r=$this->query('SELECT status,starts_at FROM reservations WHERE id=? FOR UPDATE',[$id])->fetch();
                    if($r['status']!=='confirmed'||$this->clock->now()<(new DateTimeImmutable($r['starts_at'],new DateTimeZone('Asia/Manila')))->modify('+15 minutes'))throw new BookingError('release_not_due','This booking is not an absent arrival.',409);
                },'no_show');$count++;
            }catch(BookingError $e){if(!in_array($e->errorCode,['release_not_due','invalid_transition','food_already_fired','bill_finalized','booking_conflict'],true))throw $e;}
        }
        return $count;
    }
}
