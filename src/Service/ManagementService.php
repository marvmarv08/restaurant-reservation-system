<?php
declare(strict_types=1);

namespace App\Service;

use App\Domain\BookingError;
use DateTimeImmutable;
use DateTimeZone;
use PDO;
use RuntimeException;

final class ManagementService
{
    private BookingTransaction $transactions;
    private AvailabilityService $availability;

    public function __construct(private readonly PDO $pdo, private readonly BookingClock $clock)
    {
        $this->transactions = new BookingTransaction($pdo);
        $this->availability = new AvailabilityService($pdo, $clock);
    }

    public function issueForHold(string $holdToken, string $owner, string $sessionSeed): string
    {
        if (!preg_match('/^[a-f0-9]{64}$/D', $sessionSeed)) {
            throw new RuntimeException('Invalid management session seed');
        }
        $query = $this->pdo->prepare("SELECT r.id, r.code, r.blocks_until FROM holds h
            JOIN hold_reservations hr ON hr.hold_id = h.id JOIN reservations r ON r.id = hr.reservation_id
            WHERE h.hold_token = ? AND h.session_id = ? AND h.status = 'consumed'");
        $query->execute([$holdToken, $owner]);
        $row = $query->fetch();
        if (!$row) {
            $this->invalidLink();
        }
        // The private session seed makes retries reproduce one capability without storing it in MySQL.
        $token = hash_hmac('sha256', $row['id'] . ':' . $row['code'], $sessionSeed);
        $expires = (new DateTimeImmutable($row['blocks_until'], new DateTimeZone('Asia/Manila')))->modify('+1 day');
        $this->pdo->prepare('INSERT INTO reservation_manage_tokens (reservation_id, token_hash, expires_at)
            VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reservation_id = reservation_id')
            ->execute([$row['id'], hash('sha256', $token), $expires->format('Y-m-d H:i:s')]);
        $this->authorize($row['code'], $token);
        return '/manage#code=' . $row['code'] . '&token=' . $token;
    }

    public function read(string $code, string $token): array
    {
        return $this->details($this->authorize($code, $token));
    }

    public function search(string $code, string $token, string $date, int $party, string $room): array
    {
        $row = $this->authorize($code, $token);
        $this->requireChangeAllowed($row);
        return $this->availability->search($date, $party, $room, (int) $row['id']);
    }

    public function cancel(string $code, string $token, int $version): array
    {
        $initial = $this->authorize($code, $token);
        $service = new BookingService($this->pdo, $this->clock);
        $service->cancel((int) $initial['id'], 'Guest self-service cancellation', function () use ($code, $token, $version): void {
            $row = $this->authorize($code, $token, true);
            if ($row['status'] !== 'cancelled') {
                $this->requireChangeAllowed($row);
                $this->requireVersion($row, $version);
            }
        });
        return $this->read($code, $token);
    }

    public function modify(string $code, string $token, int $version, string $date, string $time,
        int $party, string $room, ?string $kind, ?int $optionId, string $notes, ?array $policyAcceptance=null): array
    {
        if (($kind === null) !== ($optionId === null) || ($kind !== null && !in_array($kind, ['table', 'group'], true))
            || ($optionId !== null && $optionId < 1) || strlen($notes) > 2000
            || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $notes)) {
            throw new BookingError('invalid_request', 'Check the selected table or special requests.');
        }
        $initial = $this->authorize($code, $token);
        $oldDate = substr($initial['starts_at'], 0, 10);
        $policy = new BookingPolicy($this->pdo);
        $policy->start($date, $time, $this->clock->now());
        $policy->validateParty($party);
        $policy->types($room);
        return $this->transactions->run(function () use ($code, $token, $version, $date, $time, $party, $room, $kind, $optionId, $notes, $oldDate, $policyAcceptance): array {
            $this->transactions->lockDays([$oldDate, $date]);
            $current = $this->authorize($code, $token);
            if (substr($current['starts_at'], 0, 10) !== $oldDate) {
                throw new BookingError('booking_changed', 'Your booking changed in another tab. Reload its details.', 409);
            }
            $this->requireVersion($current, $version);
            $this->requireChangeAllowed($current);
            $policy = new BookingPolicy($this->pdo);
            $now = $this->clock->now();
            $start = $policy->start($date, $time, $now);
            $options = $this->availability->options($start, $party, $room, $now, null, null, $policy, false, (int) $current['id']);
            $option = $this->choose($options, $kind, $optionId);
            $before = $this->snapshot((int) $current['id']);
            $waitlist = new WaitlistService($this->pdo, $this->clock);
            $this->transactions->lockTables($waitlist->tableIds(), false);
            $current = $this->authorize($code, $token, true);
            if(ReservationPolicyService::enabled($this->pdo))(new ReservationPolicyService($this->pdo,$this->clock))->checkChange($current,$option['room_type'],$party,$policyAcceptance);
            else{BillingService::protectReservation($this->pdo,(int)$current['id']);PreorderService::protectChange($this->pdo,(int)$current['id']);}
            $this->requireVersion($current, $version);
            $this->requireChangeAllowed($current);
            $policy = new BookingPolicy($this->pdo);
            $now = $this->clock->now();
            $start = $policy->start($date, $time, $now);
            $option = $this->choose($this->availability->options($start, $party, $room, $now, null, null, $policy,
                false, (int) $current['id']), $option['kind'], $option['id']);
            $status = $option['approval_required'] ? 'pending' : 'confirmed';
            $this->pdo->prepare('UPDATE reservation_tables SET released_at = ? WHERE reservation_id = ? AND released_at IS NULL')
                ->execute([$now->format('Y-m-d H:i:s'), $current['id']]);
            $assign = $this->pdo->prepare('INSERT INTO reservation_tables (reservation_id, table_id, slot_start) VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE slot_start = ?, released_at = NULL');
            foreach ($option['table_ids'] as $tableId) {
                $assign->execute([$current['id'], $tableId, $option['starts_at'], $option['starts_at']]);
            }
            $this->pdo->prepare('UPDATE reservations SET room_type_id = ?, table_group_id = ?, party_size = ?,
                starts_at = ?, ends_at = ?, blocks_until = ?, turn_time_min = ?, status = ?, approval_state = ?,
                special_requests = ?, version = version + 1 WHERE id = ?')
                ->execute([$option['room_type_id'], $option['kind'] === 'group' ? $option['id'] : null, $party,
                    $option['starts_at'], $option['ends_at'], $option['blocks_until'], $option['turn_time_min'],
                    $status, $option['approval_required'] ? 'awaiting' : 'not_required', trim($notes) === '' ? null : trim($notes), $current['id']]);
            if(ReservationPolicyService::enabled($this->pdo)){
                $updated=$this->authorize($code,$token);
                (new ReservationPolicyService($this->pdo,$this->clock))->changed($current,$updated);
                $this->requireChangeAllowed($updated);
            }
            $after = $this->snapshot((int) $current['id']);
            $this->pdo->prepare('INSERT INTO reservation_change_history (reservation_id, before_json, after_json) VALUES (?, ?, ?)')
                ->execute([$current['id'], json_encode($before, JSON_THROW_ON_ERROR), json_encode($after, JSON_THROW_ON_ERROR)]);
            $this->pdo->prepare('INSERT INTO reservation_status_history (reservation_id, from_status, to_status, reason) VALUES (?, ?, ?, ?)')
                ->execute([$current['id'], $current['status'], $status, 'Guest changed date, party, or table']);
            $expires = (new DateTimeImmutable($option['blocks_until'], $policy->timezone))->modify('+1 day');
            $this->pdo->prepare('UPDATE reservation_manage_tokens SET expires_at = ? WHERE reservation_id = ?')
                ->execute([$expires->format('Y-m-d H:i:s'), $current['id']]);
            $waitlist->promoteLocked($oldDate);
            return $this->details($this->authorize($code, $token));
        });
    }

    public function preorder(string $code,string $token,mixed $cart,?int $version=null,?array $payload=null):array
    {
        return $this->transactions->run(function()use($code,$token,$cart,$version,$payload):array{
            $row=$this->authorize($code,$token,true);
            $service=new PreorderService($this->pdo,$this->clock);
            if($payload===null){$service->requireEditable($row);return ['quote'=>$service->review($row,$cart,false)];}
            $service->edit($row,$version??0,$payload);
            return ['booking'=>$this->details($this->authorize($code,$token))];
        });
    }

    private function authorize(string $code, string $token, bool $lock = false): array
    {
        if (!preg_match('/^LUM-[A-Z0-9]{6}$/D', $code) || !preg_match('/^[a-f0-9]{64}$/D', $token)) {
            $this->invalidLink();
        }
        $query = $this->pdo->prepare('SELECT r.*, t.expires_at AS link_expires_at, t.revoked_at FROM reservation_manage_tokens t
            JOIN reservations r ON r.id = t.reservation_id WHERE t.token_hash = ? AND r.code = ?' . ($lock ? ' FOR UPDATE' : ''));
        $query->execute([hash('sha256', $token), $code]);
        $row = $query->fetch();
        if (!$row || $row['revoked_at'] !== null || $row['link_expires_at'] <= $this->clock->now()->format('Y-m-d H:i:s')) {
            $this->invalidLink();
        }
        return $row;
    }

    private function invalidLink(): never
    {
        throw new BookingError('manage_link_invalid', 'This private booking link is invalid or expired. Contact the restaurant.', 404);
    }

    private function requireVersion(array $row, int $version): void
    {
        if ((int) $row['version'] !== $version) {
            throw new BookingError('booking_changed', 'Your booking changed in another tab. Reload its details.', 409);
        }
    }

    private function requireChangeAllowed(array $row): void
    {
        if (!in_array($row['status'], ['pending', 'confirmed'], true)) {
            throw new BookingError('booking_closed', 'This booking can no longer be changed online.', 409);
        }
        $policy = new BookingPolicy($this->pdo);
        $start = new DateTimeImmutable($row['starts_at'], $policy->timezone);
        if(ReservationPolicyService::enabled($this->pdo)){if($this->clock->now()>(new ReservationPolicyService($this->pdo,$this->clock))->deadline($row))throw new BookingError('cutoff_passed','Online changes and cancellation have closed. Please contact staff.',403);return;}
        // Applies to modifications too, preventing a last-minute move from bypassing cancellation policy.
        if ($start->getTimestamp() - $this->clock->now()->getTimestamp() < (PreorderService::read($this->pdo,(int)$row['id'])!==null?1440:$policy->number('cancel_cutoff_min')) * 60) {
            throw new BookingError('cutoff_passed', 'Online changes and cancellation have closed. Please contact the restaurant.', 403);
        }
    }

    private function choose(array $options, ?string $kind, ?int $id): array
    {
        foreach ($options as $option) {
            if ($kind === null || ($kind === $option['kind'] && $id === $option['id'])) {
                return $option;
            }
        }
        throw new BookingError('unavailable', 'The requested change is unavailable. Your original booking is still reserved.', 409);
    }

    private function snapshot(int $id): array
    {
        $query = $this->pdo->prepare('SELECT code, room_type_id, table_group_id, party_size, starts_at, ends_at, blocks_until,
            turn_time_min, status, approval_state, version, special_requests FROM reservations WHERE id = ?');
        $query->execute([$id]);
        $row = $query->fetch();
        $query = $this->pdo->prepare('SELECT table_id FROM reservation_tables WHERE reservation_id = ? AND released_at IS NULL ORDER BY table_id');
        $query->execute([$id]);
        $row['table_ids'] = array_map('intval', $query->fetchAll(PDO::FETCH_COLUMN));
        return $row;
    }

    private function details(array $row): array
    {
        $policy = new BookingPolicy($this->pdo);
        $now = $this->clock->now();
        $start = new DateTimeImmutable($row['starts_at'], $policy->timezone);
        $deadline = $start->modify('-' . (PreorderService::read($this->pdo,(int)$row['id'])!==null?1440:$policy->number('cancel_cutoff_min')) . ' minutes');
        $query = $this->pdo->prepare('SELECT full_name, phone, email FROM guests WHERE id = ?');
        $query->execute([$row['guest_id']]);
        $guest = $query->fetch();
        $query = $this->pdo->prepare('SELECT id, name, code, min_spend_cents FROM room_types WHERE id = ?');
        $query->execute([$row['room_type_id']]);
        $room = $query->fetch();
        $query = $this->pdo->prepare('SELECT t.id, t.code, t.label FROM reservation_tables rt JOIN `tables` t ON t.id = rt.table_id
            WHERE rt.reservation_id = ? AND rt.released_at IS NULL ORDER BY t.id');
        $query->execute([$row['id']]);
        $tables = $query->fetchAll();
        if ($tables === []) {
            $query = $this->pdo->prepare('SELECT after_json FROM reservation_change_history WHERE reservation_id = ? ORDER BY id DESC LIMIT 1');
            $query->execute([$row['id']]);
            $history = $query->fetchColumn();
            $ids = $history === false ? [] : json_decode($history, true, 16, JSON_THROW_ON_ERROR)['table_ids'];
            $query = $this->pdo->prepare('SELECT t.id, t.code, t.label FROM reservation_tables rt JOIN `tables` t ON t.id = rt.table_id
                WHERE rt.reservation_id = ? AND rt.slot_start = ? ORDER BY t.id');
            $query->execute([$row['id'], $row['starts_at']]);
            $tables = $query->fetchAll();
            if ($ids !== []) {
                $tables = array_values(array_filter($tables, static fn (array $table): bool => in_array((int) $table['id'], $ids, true)));
            }
        }
        if(ReservationPolicyService::enabled($this->pdo))$deadline=(new ReservationPolicyService($this->pdo,$this->clock))->deadline($row);
        $policyState=ReservationPolicyService::read($this->pdo,(int)$row['id']);
        $refund=null;
        if($policyState&&in_array($row['status'],['cancelled','no_show'],true)){
            $balance=(new ReservationPolicyService($this->pdo,$this->clock))->balances((int)$row['id']);
            $refund=['reviewed'=>$policyState['reviewed'],'forfeited_base_cents'=>$policyState['forfeited_base_cents'],'eligible_base_cents'=>max(0,$balance['net_base_cents']-$policyState['forfeited_base_cents']),'eligible_extra_cents'=>$balance['net_extra_cents'],'refunded_cents'=>$balance['refund_base']+$balance['refund_extra']];
        }
        return ['policy'=>$policyState,'policy_refund'=>$refund,'preorder'=>PreorderService::read($this->pdo,(int)$row['id']), 'code' => $row['code'], 'version' => (int) $row['version'], 'status' => $row['status'],
            'party_size' => (int) $row['party_size'], 'starts_at' => $row['starts_at'], 'ends_at' => $row['ends_at'],
            'approval_state' => $row['approval_state'], 'room' => $room, 'tables' => $tables, 'guest' => $guest,
            'special_requests' => $row['special_requests'], 'cancel_deadline' => $deadline->format('Y-m-d H:i:s'),
            'can_manage' => in_array($row['status'], ['pending', 'confirmed'], true) && $now <= $deadline,
            'link_expires_at' => $row['link_expires_at'], 'server_time_epoch' => $now->getTimestamp(),
            'timezone' => 'Asia/Manila', 'notification' => 'Simulated; no email or SMS has been sent.'];
    }
}
