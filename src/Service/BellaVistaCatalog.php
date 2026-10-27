<?php
declare(strict_types=1);
namespace App\Service;

use App\Domain\BookingError;
use PDO;

/** Explicit catalog conversion; never invoked by normal boot or schema initialization. */
final class BellaVistaCatalog
{
    public const PROFILE = 'bella_vista_b2';
    private const TYPES = [
        ['bv_standard', 'Standard Tables', 2, 4, 'bv_standard_room', 'Standard Dining', 350, 30, 510, 600],
        ['bv_family', 'Family Tables', 5, 8, 'bv_family_room', 'Family Dining', 30, 370, 280, 360],
        ['bv_vip', 'VIP Function Rooms', 1, 20, 'bv_vip_room', 'VIP Rooms', 30, 30, 280, 300],
    ];
    private const UNITS = [
        ['S1', 'Standard Table S1', 'bv_standard', 2, 4, 420, 160],
        ['S2', 'Standard Table S2', 'bv_standard', 2, 4, 680, 160],
        ['S3', 'Standard Table S3', 'bv_standard', 2, 4, 420, 400],
        ['S4', 'Standard Table S4', 'bv_standard', 2, 4, 680, 400],
        ['F1', 'Family Table F1', 'bv_family', 5, 8, 80, 445],
        ['F2', 'Family Table F2', 'bv_family', 5, 8, 80, 545],
        ['F3', 'Family Table F3', 'bv_family', 5, 8, 80, 645],
        ['VIP1', 'VIP Room 1', 'bv_vip', 1, 20, 80, 120],
        ['VIP2', 'VIP Room 2', 'bv_vip', 1, 20, 80, 240],
    ];
    public function __construct(private readonly PDO $pdo) {}

    public function stage(): array
    {
        return (new BookingTransaction($this->pdo))->run(function(): array {
            $this->lockInventory();
            return $this->stageRows();
        });
    }

    public function activate(): array
    {
        return (new BookingTransaction($this->pdo))->run(function(): array {
            $this->lockInventory();
            if (!(new BellaVistaSchema($this->pdo))->ready()) {
                throw new BookingError('schema_not_ready', 'Prepare and verify the 20-person schema constraint before activation.', 409);
            }
            if ((new BookingPolicy($this->pdo))->bellaVista()) {
                return $this->summary();
            }
            // Never strand existing parties or silently remap a future booking/checkout.
            $busy = (int)$this->pdo->query("SELECT COUNT(*) FROM reservations WHERE status IN ('pending','confirmed','seated','waitlisted')")->fetchColumn();
            $busy += (int)$this->pdo->query("SELECT COUNT(*) FROM holds WHERE status='active' AND expires_at>NOW()")->fetchColumn();
            $busy += (int)$this->pdo->query("SELECT COUNT(*) FROM orders WHERE status NOT IN ('closed','paid','void')")->fetchColumn();
            if ($busy > 0) {
                throw new BookingError('conversion_busy', 'Resolve live holds, future reservations and open service before catalog activation.', 409);
            }
            $this->stageRows();
            $this->pdo->exec('UPDATE table_groups SET is_active=0');
            $this->pdo->exec('UPDATE `tables` SET is_active=0');
            $this->pdo->exec('UPDATE rooms SET is_active=0');
            $this->pdo->exec('UPDATE room_types SET is_active=0');
            $this->pdo->exec("UPDATE room_types SET is_active=1 WHERE code IN ('bv_standard','bv_family','bv_vip')");
            $this->pdo->exec("UPDATE rooms SET is_active=1 WHERE code IN ('bv_standard_room','bv_family_room','bv_vip_room')");
            $this->pdo->exec("UPDATE `tables` SET is_active=1 WHERE code IN ('S1','S2','S3','S4','F1','F2','F3','VIP1','VIP2')");
            // Existing rows/IDs are retained; only active service configuration changes.
            $this->pdo->exec("UPDATE opening_hours SET open_time='10:00',close_time='22:00',is_closed=(weekday=1) WHERE room_type_id IS NULL");
            $q=$this->pdo->prepare("INSERT INTO opening_hours(weekday,open_time,close_time,service_name,is_closed) SELECT ?,'10:00','22:00','dining',? WHERE NOT EXISTS (SELECT 1 FROM opening_hours WHERE room_type_id IS NULL AND weekday=?)");
            for($day=0;$day<7;$day++) $q->execute([$day,(int)($day===1),$day]);
            $this->pdo->exec('UPDATE pacing_rules SET max_covers=80,max_reservations=9');
            $settings=['catalog_profile'=>self::PROFILE,'slot_interval_min'=>'15','buffer_min'=>'15','min_lead_time_min'=>'0','max_lead_time_days'=>'60','max_party_online'=>'20','max_covers_per_slot'=>'80','max_reservations_per_slot'=>'9','manager_approval_party_min'=>'21','last_seating_time'=>'20:00'];
            $q=$this->pdo->prepare("INSERT INTO settings(skey,svalue,value_type) VALUES (?,?,?) ON DUPLICATE KEY UPDATE svalue=VALUES(svalue),value_type=VALUES(value_type)");
            foreach($settings as $key=>$value)$q->execute([$key,$value,in_array($key,['catalog_profile','last_seating_time'],true)?($key==='last_seating_time'?'time':'string'):'int']);
            return $this->summary();
        });
    }

    private function lockInventory(): void
    {
        // Same ordered table locks as booking mutations; shared setting serializes two conversions.
        $this->pdo->query("SELECT skey FROM settings WHERE skey='venue_timezone' FOR UPDATE")->fetch();
        (new BookingTransaction($this->pdo))->lockTables($this->pdo->query('SELECT id FROM `tables` ORDER BY id')->fetchAll(PDO::FETCH_COLUMN),false);
    }

    private function stageRows(): array
    {
        if ((new BookingPolicy($this->pdo))->bellaVista()) return $this->summary();
        $rooms=[];
        foreach(self::TYPES as $index=>$type){
            [$code,$name,$low,$high,$roomCode,$roomName,$x,$y,$w,$h]=$type;
            $q=$this->pdo->prepare("INSERT INTO room_types(code,name,description,min_party,max_party,min_notice_hours,min_spend_cents,requires_approval,sort_order,is_active) VALUES (?,?,?, ?,?,0,0,0,?,0) ON DUPLICATE KEY UPDATE id=id");
            $q->execute([$code,$name,'Bella Vista assignment catalog',$low,$high,$index]);
            $q=$this->pdo->prepare('SELECT * FROM room_types WHERE code=?');$q->execute([$code]);$row=$q->fetch();
            if($row['description']!=='Bella Vista assignment catalog'||(int)$row['min_party']!==$low||(int)$row['max_party']!==$high||(int)$row['is_active']!==0||(int)$row['min_notice_hours']!==0||(int)$row['requires_approval']!==0||(int)$row['min_spend_cents']!==0)$this->conflict();
            $q=$this->pdo->prepare('INSERT INTO rooms(code,room_type_id,name,floor_x,floor_y,floor_w,floor_h,is_active) VALUES (?,?,?,?,?,?,?,0) ON DUPLICATE KEY UPDATE id=id');
            $q->execute([$roomCode,$row['id'],$roomName,$x,$y,$w,$h]);
            $q=$this->pdo->prepare('SELECT * FROM rooms WHERE code=?');$q->execute([$roomCode]);$room=$q->fetch();
            if((int)$room['room_type_id']!==(int)$row['id']||(int)$room['is_active']!==0)$this->conflict();
            $rooms[$code]=(int)$room['id'];
        }
        foreach(self::UNITS as [$code,$label,$type,$low,$high,$x,$y]){
            $q=$this->pdo->prepare("INSERT INTO `tables`(room_id,code,label,capacity_min,capacity_max,is_joinable,shape,pos_x,pos_y,pos_w,pos_h,is_active) VALUES (?,?,?,?,?,0,'rect',?,?,100,50,0) ON DUPLICATE KEY UPDATE id=id");
            $q->execute([$rooms[$type],$code,$label,$low,$high,$x,$y]);
            $q=$this->pdo->prepare('SELECT * FROM `tables` WHERE code=?');$q->execute([$code]);$row=$q->fetch();
            if((int)$row['room_id']!==$rooms[$type]||(int)$row['capacity_min']!==$low||(int)$row['capacity_max']!==$high||(int)$row['is_active']!==0||(int)$row['is_joinable']!==0)$this->conflict();
        }
        return $this->summary();
    }
    private function conflict(): never {throw new BookingError('conversion_conflict','Target catalog codes already exist with unexpected values; review before activation.',409);}
    private function summary(): array {return ['profile'=>(new BookingPolicy($this->pdo))->settings['catalog_profile']??'legacy','target_units'=>9];}
}
