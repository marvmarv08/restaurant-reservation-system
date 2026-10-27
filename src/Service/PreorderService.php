<?php
declare(strict_types=1);
namespace App\Service;
use App\Domain\BookingError;
use DateTimeImmutable;
use PDO;

/** Scheduled food is not a live order or a receipt. Call mutations inside the booking transaction. */
final class PreorderService
{
    public function __construct(private readonly PDO $pdo,private readonly BookingClock $clock){}
    public static function enabled(PDO $pdo):bool
    {
        $q=$pdo->query("SELECT svalue FROM settings WHERE skey='preorder_profile'");
        return $q->fetchColumn()==='bella_vista_b4' && BillingService::enabled($pdo);
    }
    private function query(string $sql,array $args=[]):\PDOStatement {$q=$this->pdo->prepare($sql);$q->execute($args);return $q;}
    private function fail(string $code,string $message,int $status=409):never {throw new BookingError($code,$message,$status);}
    public static function cart(mixed $cart):array
    {
        if(!is_array($cart)||!array_is_list($cart)||count($cart)>30)throw new BookingError('invalid_cart','Choose up to 30 distinct food items.',422);
        $seen=[];
        foreach($cart as $line){
            if(!is_array($line)||array_diff(array_keys($line),['id','qty'])!==[]||!is_int($line['id']??null)||$line['id']<1||!is_int($line['qty']??null)||$line['qty']<1||$line['qty']>30||isset($seen[$line['id']]))throw new BookingError('invalid_cart','Use distinct items with whole quantities from 1 to 30; prices come from the menu.',422);
            $seen[$line['id']]=$line['qty'];
        }
        ksort($seen,SORT_NUMERIC);return array_map(fn($id,$qty)=>['id'=>$id,'qty'=>$qty],array_keys($seen),array_values($seen));
    }
    private function snapshot(mixed $cart,string $category,int $party):array
    {
        $cart=self::cart($cart);$lines=[];$total=0;
        foreach($cart as $line){
            $m=$this->query('SELECT m.id,m.name,m.price_cents,m.station,m.tags_json FROM menu_items m JOIN menu_categories c ON c.id=m.category_id WHERE m.id=? AND m.is_available=1 AND c.is_active=1 FOR UPDATE',[$line['id']])->fetch();
            if(!$m)$this->fail('item_unavailable','A selected dish is unavailable. Edit the cart and review it again.');
            $total+=$line['qty']*(int)$m['price_cents'];
            if($total>BillingFees::MAX_CENTS)$this->fail('invalid_amount','This cart exceeds the supported total.',422);
            $lines[]=['id'=>(int)$m['id'],'name'=>$m['name'],'qty'=>$line['qty'],'unit_price_cents'=>(int)$m['price_cents'],'station'=>$m['station'],'tags_json'=>$m['tags_json']];
        }
        $fees=BillingFees::assess($category,$party);
        if($total+$fees['extra_cents']>BillingFees::MAX_CENTS)$this->fail('invalid_amount','Food and extras exceed the supported total.',422);
        $terms=ReservationPolicyService::enabled($this->pdo);
        return ['cart'=>$cart,'lines'=>$lines,'food_cents'=>$total,'fees'=>$fees,'estimated_due_cents'=>$total+$fees['extra_cents'],'received_cents'=>0,'food_credit_cents'=>0,
            'policy_version'=>$terms?ReservationTerms::VERSION:'bella_vista_guest_quote_v1','policy'=>$terms?ReservationTerms::text():[
                'Food prices shown here are accepted for these quantities. Food is scheduled until arrival; staff release it to the kitchen once seating is validated.',
                'No online payment is collected. Authorized staff record onsite cash or an externally completed card payment after dining.',
                'Family ₱500 and VIP ₱2,500 base fees are consumable allowances, not an extra addition to the same food bill. Only an actually received base can be applied as food credit, once.',
                'VIP covers up to 15 guests; each additional guest costs ₱300 through a maximum of 20. These extras are separate and are not food credit.',
                'Standard has no reservation fee. At least ₱1,000 in accepted food is required upon seating; you may book with a smaller or empty cart.',
                'Online scheduled-food changes close 24 hours before dining; later changes require staff. No outside food or beverages.'
            ]];
    }
    private function category(array $r):string
    {
        return (string)$this->query('SELECT code FROM room_types WHERE id=?',[$r['room_type_id']])->fetchColumn();
    }
    private function scope(array $r,bool $hold):string {return ($hold?'hold:':'reservation:').$r['id'];}
    public function review(array $r,mixed $cart,bool $hold):array
    {
        if(!self::enabled($this->pdo))$this->fail('preorders_disabled','Guest pre-orders are not active.',404);
        $snapshot=$this->snapshot($cart,$this->category($r),(int)$r['party_size']);
        $now=$this->clock->now();$expires=$now->modify('+5 minutes')->format('Y-m-d H:i:s');
        if($hold)$expires=min($expires,$r['expires_at']);
        $snapshot['reservation_version']=$hold?null:(int)$r['version'];
        $token=bin2hex(random_bytes(32));$scope=$this->scope($r,$hold);
        $this->query('INSERT INTO preorder_quotes(scope_key,hold_id,reservation_id,token,quote_json,expires_at) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE token=VALUES(token),quote_json=VALUES(quote_json),expires_at=VALUES(expires_at)',[$scope,$hold?$r['id']:null,$hold?null:$r['id'],$token,json_encode($snapshot,JSON_THROW_ON_ERROR),$expires]);
        return $snapshot+['quote_token'=>$token,'expires_at'=>$expires,'currency'=>'PHP'];
    }
    private function accepted(array $r,array $payload,bool $hold):array
    {
        if(array_diff(array_keys($payload),['cart','quote_token','accepted'])!==[]||($payload['accepted']??null)!==true||!is_string($payload['quote_token']??null))$this->fail('quote_required','Review and accept the current food and fee quote.',422);
        $cart=self::cart($payload['cart']??null);
        $q=$this->query('SELECT * FROM preorder_quotes WHERE scope_key=? FOR UPDATE',[$this->scope($r,$hold)])->fetch();
        if(!$q||!hash_equals($q['token'],$payload['quote_token'])||$q['expires_at']<=$this->clock->now()->format('Y-m-d H:i:s'))$this->fail('quote_changed','The quote expired or was replaced. Review the current quote again.');
        $saved=json_decode($q['quote_json'],true,32,JSON_THROW_ON_ERROR);
        $current=$this->snapshot($cart,$this->category($r),(int)$r['party_size']);
        $current['reservation_version']=$hold?null:(int)$r['version'];
        if($q['expires_at']<=$this->clock->now()->format('Y-m-d H:i:s'))$this->fail('quote_changed','The quote expired while waiting. Review it again.');
        if($saved!=$current)$this->fail('quote_changed','Menu prices, quantities or booking details changed. Review and accept the new quote.');
        return $saved+['quote_token'=>$q['token'],'accepted_at'=>$this->clock->now()->format('Y-m-d H:i:s')];
    }
    public function confirmationHash(array $guest,array $payload):string
    {
        return hash('sha256',json_encode([$guest,self::cart($payload['cart']??null),$payload['quote_token']??null,$payload['accepted']??null],JSON_THROW_ON_ERROR));
    }
    public function acceptBooking(array $hold,array $payload,array $guest):array
    {
        return ['snapshot'=>$this->accepted($hold,$payload,true),'hash'=>$this->confirmationHash($guest,$payload)];
    }
    public function saveBooking(int $id,array $acceptance):void
    {
        $json=json_encode($acceptance['snapshot'],JSON_THROW_ON_ERROR);
        $this->query('INSERT INTO reservation_preorders(reservation_id,accepted_json,current_json,history_json,confirmation_hash,accepted_at) VALUES (?,?,?,?,?,?)',[$id,$json,$json,'[]',$acceptance['hash'],$acceptance['snapshot']['accepted_at']]);
        (new ReservationPolicyService($this->pdo,$this->clock))->acceptedBooking($id,$acceptance['snapshot']);
    }
    public function replay(int $id,array $guest,?array $payload):void
    {
        $p=$this->query('SELECT confirmation_hash FROM reservation_preorders WHERE reservation_id=?',[$id])->fetchColumn();
        if($p!==false&&($payload===null||!hash_equals($p,$this->confirmationHash($guest,$payload))))$this->fail('request_changed','This hold already confirmed a different guest/cart/quote. Recover the original booking.');
    }
    public static function read(PDO $pdo,int $id):?array
    {
        if(!self::enabled($pdo))return null;
        $q=$pdo->prepare('SELECT * FROM reservation_preorders WHERE reservation_id=?');$q->execute([$id]);$p=$q->fetch();
        if(!$p)return null;
        return ['version'=>(int)$p['version'],'status'=>$p['status'],'order_id'=>$p['order_id']===null?null:(int)$p['order_id'],'quote'=>json_decode($p['current_json'],true,32,JSON_THROW_ON_ERROR),'accepted_quote'=>json_decode($p['accepted_json'],true,32,JSON_THROW_ON_ERROR),'history'=>json_decode($p['history_json'],true,64,JSON_THROW_ON_ERROR)];
    }
    public function requireEditable(array $r):void
    {
        $p=self::read($this->pdo,(int)$r['id']);
        if(!$p||$p['status']!=='scheduled'||!in_array($r['status'],['pending','confirmed'],true))$this->fail('preorder_closed','This scheduled cart can no longer be changed online.');
        $start=new DateTimeImmutable($r['starts_at'],new \DateTimeZone('Asia/Manila'));
        $deadline=ReservationPolicyService::enabled($this->pdo)?(new ReservationPolicyService($this->pdo,$this->clock))->deadline($r):$start->modify('-24 hours');
        if($this->clock->now()>$deadline)$this->fail('cutoff_passed','Scheduled food changes close 24 hours before dining. Please contact staff.',403);
        BillingService::protectReservation($this->pdo,(int)$r['id']);
    }
    public function edit(array $r,int $version,array $payload):bool
    {
        if(!self::enabled($this->pdo))$this->fail('preorders_disabled','Guest pre-orders are not active.',404);
        $hash=hash('sha256',json_encode([$version,self::cart($payload['cart']??null),$payload['quote_token']??null,$payload['accepted']??null],JSON_THROW_ON_ERROR));
        $p=$this->query('SELECT * FROM reservation_preorders WHERE reservation_id=? FOR UPDATE',[$r['id']])->fetch();
        if($p&&is_string($p['last_edit_hash'])&&hash_equals($p['last_edit_hash'],$hash))return false;
        $this->requireEditable($r);
        if((int)$r['version']!==$version)$this->fail('booking_changed','This booking changed. Refresh before editing the cart.');
        $snapshot=$this->accepted($r,$payload,false);
        $this->requireEditable($r);
        $history=json_decode($p['history_json'],true,64,JSON_THROW_ON_ERROR);
        $history[]=['version'=>(int)$p['version'],'quote'=>json_decode($p['current_json'],true,32,JSON_THROW_ON_ERROR),'replaced_at'=>$snapshot['accepted_at']];
        if(count($history)>50)$this->fail('edit_limit','Please ask staff for further cart changes.');
        $this->query('UPDATE reservation_preorders SET version=version+1,current_json=?,history_json=?,last_edit_hash=? WHERE reservation_id=?',[json_encode($snapshot,JSON_THROW_ON_ERROR),json_encode($history,JSON_THROW_ON_ERROR),$hash,$r['id']]);
        $this->query('UPDATE reservations SET version=version+1 WHERE id=?',[$r['id']]);return true;
    }
    public static function protectChange(PDO $pdo,int $id):void
    {
        if(self::read($pdo,$id)!==null)throw new BookingError('preorder_booking_change','This booking has an accepted food/fee quote. Please ask staff to review schedule or guest-count changes. Scheduled food can be edited separately before its deadline.',409);
    }
    public static function stop(PDO $pdo,int $id):void
    {
        if(!self::enabled($pdo))return;
        $q=$pdo->prepare("UPDATE reservation_preorders SET status='cancelled',version=version+1 WHERE reservation_id=? AND status='scheduled'");$q->execute([$id]);
    }
    public static function stageArrival(PDO $pdo,array $r,int $actor):void
    {
        $p=self::read($pdo,(int)$r['id']);if(!$p||$p['status']!=='scheduled')return;
        $lines=$p['quote']['lines'];if($lines===[])return;
        $q=$pdo->prepare('SELECT table_id FROM reservation_tables WHERE reservation_id=? AND released_at IS NULL ORDER BY table_id');$q->execute([$r['id']]);$table=$q->fetchColumn();
        if(!$table)throw new BookingError('inventory_changed','The scheduled food has no assigned table.');
        $pdo->prepare("INSERT INTO orders(reservation_id,table_id,opened_by,status,subtotal_cents,total_cents,allergy_notes) VALUES (?,?,?,'open',?,?,?)")->execute([$r['id'],$table,$actor,$p['quote']['food_cents'],$p['quote']['food_cents'],$r['special_requests']??'']);$order=(int)$pdo->lastInsertId();
        foreach($lines as $i){
            $q=$pdo->prepare('SELECT m.is_available,c.is_active FROM menu_items m JOIN menu_categories c ON c.id=m.category_id WHERE m.id=? FOR SHARE');$q->execute([$i['id']]);$menu=$q->fetch();
            if(!$menu||!(int)$menu['is_available']||!(int)$menu['is_active'])throw new BookingError('menu_unavailable','A scheduled dish is unavailable. Staff must resolve the menu before seating.',409);
        }
        foreach($lines as $i)$pdo->prepare('INSERT INTO order_items(order_id,menu_item_id,qty,unit_price_cents,item_name,station_snapshot,tags_snapshot) VALUES (?,?,?,?,?,?,?)')->execute([$order,$i['id'],$i['qty'],$i['unit_price_cents'],$i['name'],$i['station'],$i['tags_json']]);
        $pdo->prepare('UPDATE reservation_preorders SET order_id=? WHERE reservation_id=?')->execute([$order,$r['id']]);
    }
    public static function fireArrival(PDO $pdo,array $r,int $actor,string $now):void
    {
        $p=self::read($pdo,(int)$r['id']);if(!$p||$p['status']!=='scheduled')return;
        if($p['order_id']!==null){
            $pdo->prepare('INSERT INTO kitchen_tickets(order_id,allergy_snapshot,booking_notes,fired_at) VALUES (?,?,?,?)')->execute([$p['order_id'],$r['special_requests']??'',$r['special_requests']??'',$now]);$ticket=(int)$pdo->lastInsertId();
            $pdo->prepare("UPDATE orders SET status='sent_to_kitchen',version=version+1 WHERE id=?")->execute([$p['order_id']]);
            $pdo->prepare("INSERT INTO order_events(order_id,ticket_id,action,from_status,to_status,actor_user_id,reason,created_at) VALUES (?,?,'fire','open','sent_to_kitchen',?,'Accepted scheduled food released on seating',?)")->execute([$p['order_id'],$ticket,$actor,$now]);
        }
        $pdo->prepare("UPDATE reservation_preorders SET status='handed_off',version=version+1,handed_off_at=? WHERE reservation_id=?")->execute([$now,$r['id']]);
    }
}
