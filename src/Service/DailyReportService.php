<?php
declare(strict_types=1);
namespace App\Service;
use App\Core\StaffAccess;
use App\Domain\BookingError;
use DateTimeImmutable;
use DateTimeZone;
use PDO;
final class DailyReportService
{
    public function __construct(private readonly PDO $pdo,private readonly BookingClock $clock){}
    private function rows(string $sql,array $args=[]):array{$q=$this->pdo->prepare($sql);$q->execute($args);return $q->fetchAll();}
    public function daily(array $actor,string $date):array
    {
        $day=DateTimeImmutable::createFromFormat('!Y-m-d',$date,new DateTimeZone('Asia/Manila'));
        if(!$day||$day->format('Y-m-d')!==$date)throw new BookingError('invalid_date','Choose a valid Manila report date.');
        if($this->pdo->inTransaction())throw new \LogicException('Reports need their own consistent read snapshot.');
        $this->pdo->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');$this->pdo->beginTransaction();
        try{
            $user=StaffAccess::require($this->pdo,$actor,'orders.read');
            if(!in_array($user['role'],['admin','manager'],true))throw new BookingError('staff_forbidden','Only administrators and managers may read financial reports.',403);
            if(!OperationsProfile::enabled($this->pdo))throw new BookingError('reports_unavailable','Daily reports are not activated in this application.',404);
            $r=$this->snapshot($date,$day->modify('+1 day')->format('Y-m-d'));$this->pdo->commit();return $r;
        }catch(\Throwable $e){if($this->pdo->inTransaction())$this->pdo->rollBack();throw $e;}
    }
    private function snapshot(string $date,string $next):array
    {
        $window=[$date.' 00:00:00',$next.' 00:00:00'];
        $bookings=$this->rows('SELECT r.id,r.code,r.starts_at,r.status,r.party_size,t.code AS category,t.name AS category_name,a.status AS bill_status,a.base_fee_cents,a.extra_cents,a.minimum_cents,a.final_snapshot,p.forfeited_base_cents FROM reservations r JOIN room_types t ON t.id=r.room_type_id LEFT JOIN billing_accounts a ON a.reservation_id=r.id LEFT JOIN reservation_policies p ON p.reservation_id=r.id WHERE r.starts_at>=? AND r.starts_at<? ORDER BY r.starts_at,r.id',$window);
        // Each child ledger is reduced on its own; joining raw lines and receipts multiplies money.
        $food=[];foreach($this->rows("SELECT o.reservation_id,SUM(i.qty*i.unit_price_cents) AS cents FROM order_items i JOIN orders o ON o.id=i.order_id JOIN reservations r ON r.id=o.reservation_id WHERE r.starts_at>=? AND r.starts_at<? AND i.status<>'void' AND o.status<>'void' GROUP BY o.reservation_id",$window) as $v)$food[(int)$v['reservation_id']]=(int)$v['cents'];
        $receipts=[];foreach($this->rows('SELECT a.reservation_id,e.kind,SUM(e.amount_cents) AS cents FROM billing_events e JOIN billing_accounts a ON a.id=e.account_id JOIN reservations r ON r.id=a.reservation_id WHERE r.starts_at>=? AND r.starts_at<? GROUP BY a.reservation_id,e.kind',$window) as $v)$receipts[(int)$v['reservation_id']][$v['kind']]=(int)$v['cents'];
        $policy=[];foreach($this->rows('SELECT e.reservation_id,e.kind,SUM(e.amount_cents) AS cents FROM policy_money_events e JOIN reservations r ON r.id=e.reservation_id WHERE r.starts_at>=? AND r.starts_at<? GROUP BY e.reservation_id,e.kind',$window) as $v)$policy[(int)$v['reservation_id']][$v['kind']]=(int)$v['cents'];
        $counts=array_fill_keys(['total','pending','confirmed','seated','completed','cancelled','no_show','waitlisted','covers'],0);
        $totals=['finalized_cents'=>0,'unfinalized_ordered_cents'=>0,'credit_applied_cents'=>0,'base_assessed_cents'=>0,'extras_assessed_cents'=>0];$rows=[];
        foreach($bookings as $b){
            $id=(int)$b['id'];$counts['total']++;$counts[$b['status']]++;if(in_array($b['status'],['seated','completed'],true))$counts['covers']+=(int)$b['party_size'];
            $f=$food[$id]??0;$e=$receipts[$id]??[];$p=$policy[$id]??[];$terminal=in_array($b['status'],['cancelled','no_show'],true);
            $fees=$b['base_fee_cents']!==null?['base_fee_cents'=>(int)$b['base_fee_cents'],'extra_cents'=>(int)$b['extra_cents'],'minimum_cents'=>(int)$b['minimum_cents']]:(str_starts_with($b['category'],'bv_')?BillingFees::assess($b['category'],(int)$b['party_size']):['base_fee_cents'=>0,'extra_cents'=>0,'minimum_cents'=>0]);
            $bill=BillingFees::totals($fees,$f,$e['advance']??0,$e['payment']??0,($e['refund_credit']??0)+($p['refund_base']??0));
            $netExtra=($p['extra_receipt']??0)-($p['refund_extra']??0);$due=$terminal?0:max(0,$bill['due_cents']-$netExtra);$sales=0;$credit=0;
            if($b['bill_status']==='finalized'){
                $saved=json_decode($b['final_snapshot']??'null',true,64,JSON_THROW_ON_ERROR);
                if(!is_array($saved)||(int)($saved['food_cents']??-1)!==$f)throw new BookingError('report_conflict','Finalized food differs from its protected snapshot. Ask a manager to investigate.',409);
                if(!$terminal){$sales=$f;$credit=(int)$saved['credit_applied_cents'];}
            }elseif(!$terminal)$totals['unfinalized_ordered_cents']+=$f;
            $totals['finalized_cents']+=$sales;$totals['credit_applied_cents']+=$credit;$totals['base_assessed_cents']+=$fees['base_fee_cents'];$totals['extras_assessed_cents']+=$fees['extra_cents'];
            $rows[]=['code'=>$b['code'],'starts_at'=>$b['starts_at'],'status'=>$b['status'],'party_size'=>(int)$b['party_size'],'category'=>$b['category_name'],'bill_status'=>$b['bill_status']??'unopened','food_ordered_cents'=>$f,'food_sales_cents'=>$sales,'base_assessed_cents'=>$fees['base_fee_cents'],'extra_assessed_cents'=>$fees['extra_cents'],'credit_applied_cents'=>$credit,'received_cents'=>$bill['received_cents']+$netExtra,'due_cents'=>$due,'retained_base_cents'=>(int)($b['forfeited_base_cents']??0)];
        }
        $money=array_fill_keys(['advance_cents','payment_cents','extra_receipt_cents','refund_credit_cents','refund_base_cents','refund_extra_cents','received_cents','refunded_cents','net_cents'],0);$methods=['cash'=>['received_cents'=>0,'refunded_cents'=>0,'net_cents'=>0],'external_card'=>['received_cents'=>0,'refunded_cents'=>0,'net_cents'=>0]];
        $transactions=array_merge($this->rows("SELECT kind,method,SUM(amount_cents) AS cents FROM billing_events WHERE created_at>=? AND created_at<? AND kind<>'finalize' GROUP BY kind,method",$window),$this->rows('SELECT kind,method,SUM(amount_cents) AS cents FROM policy_money_events WHERE created_at>=? AND created_at<? GROUP BY kind,method',$window));
        foreach($transactions as $e){$n=(int)$e['cents'];$money[$e['kind'].'_cents']+=$n;$field=str_starts_with($e['kind'],'refund_')?'refunded_cents':'received_cents';$money[$field]+=$n;$methods[$e['method']][$field]+=$n;}
        $money['net_cents']=$money['received_cents']-$money['refunded_cents'];foreach($methods as &$m)$m['net_cents']=$m['received_cents']-$m['refunded_cents'];unset($m);
        $retained=$this->rows("SELECT COALESCE(SUM(p.forfeited_base_cents),0) AS cents FROM reservation_policy_events e JOIN reservation_policies p ON p.reservation_id=e.reservation_id WHERE e.kind='cancelled' AND e.created_at>=? AND e.created_at<?",$window);
        return ['date'=>$date,'timezone'=>'Asia/Manila','reservations'=>$counts,'food'=>$totals,'transactions'=>$money,'methods'=>$methods,'retained_cents'=>(int)$retained[0]['cents'],'rows'=>$rows,'generated_at'=>$this->clock->now()->format('Y-m-d H:i:s'),'basis'=>['food'=>'Finalized non-void food by dining service date. Unfinalized orders are shown separately.','transactions'=>'Actual receipts/refunds by transaction date; not additional food sales.','retained'=>'Actual base retained by cancellation decision date; already-received funds, not new cash or food sales.']];
    }
}
