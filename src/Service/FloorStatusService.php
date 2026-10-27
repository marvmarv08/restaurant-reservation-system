<?php
declare(strict_types=1);
namespace App\Service;
use PDO;
final class FloorStatusService
{
    public function __construct(private readonly PDO $pdo,private readonly BookingClock $clock){}
    private function rows(string $sql,array $args=[]):array{$q=$this->pdo->prepare($sql);$q->execute($args);return $q->fetchAll();}
    public function snapshot(string $at):array
    {
        $own=!$this->pdo->inTransaction();
        if($own){$this->pdo->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');$this->pdo->beginTransaction();}
        try{$result=$this->read($at);if($own)$this->pdo->commit();return $result;}
        catch(\Throwable $e){if($own&&$this->pdo->inTransaction())$this->pdo->rollBack();throw $e;}
    }
    private function read(string $at):array
    {
        $tables=$this->rows('SELECT t.id,t.code,t.room_id,r.room_type_id FROM `tables` t JOIN rooms r ON r.id=t.room_id WHERE t.is_active=1 AND r.is_active=1 ORDER BY t.id');
        $bookings=$this->rows("SELECT a.table_id,r.code,r.status FROM reservation_tables a JOIN reservations r ON r.id=a.reservation_id WHERE a.released_at IS NULL AND (r.status='seated' OR (r.status IN ('pending','confirmed') AND r.starts_at<=? AND r.blocks_until>?)) ORDER BY r.status='seated',r.id",[$at,$at]);
        $holds=$this->rows("SELECT ht.table_id FROM hold_tables ht JOIN holds h ON h.id=ht.hold_id WHERE h.status='active' AND h.expires_at>? AND h.starts_at<=? AND h.blocks_until>?",[$this->clock->now()->format('Y-m-d H:i:s'),$at,$at]);
        $blocks=$this->rows("SELECT b.*,EXISTS(SELECT 1 FROM reservations r JOIN reservation_tables a ON a.reservation_id=r.id WHERE r.status='completed' AND a.table_id=b.scope_id AND b.scope='table' AND r.completed_at=b.starts_at AND b.reason=CONCAT('Table reset after ',r.code)) AS cleanup FROM blackout_dates b WHERE b.blocks_booking=1 AND b.starts_at<=? AND b.ends_at>?",[$at,$at]);
        $labels=['available'=>'Available','reserved'=>'Reserved','occupied'=>'Occupied','clean_up'=>'Clean-up','held'=>'Temporary hold','blocked'=>'Unavailable'];$result=[];
        foreach($tables as $t){
            $booking=null;$closure=false;$cleanup=false;$held=false;
            foreach($bookings as $b)if((int)$b['table_id']===(int)$t['id'])$booking=$b;
            foreach($holds as $h)if((int)$h['table_id']===(int)$t['id'])$held=true;
            foreach($blocks as $b){
                $match=$b['scope']==='venue'||($b['scope']==='table'&&(int)$b['scope_id']===(int)$t['id'])||($b['scope']==='room'&&(int)$b['scope_id']===(int)$t['room_id'])||($b['scope']==='room_type'&&(int)$b['scope_id']===(int)$t['room_type_id']);
                if($match){if((int)$b['cleanup'])$cleanup=true;else $closure=true;}
            }
            $state=$booking&&$booking['status']==='seated'?'occupied':($closure?'blocked':($cleanup?'clean_up':($booking?'reserved':($held?'held':'available'))));
            $result[]=['id'=>(int)$t['id'],'code'=>$t['code'],'state'=>$state,'label'=>$labels[$state],'reservation_code'=>$booking['code']??null];
        }
        return $result;
    }
}
