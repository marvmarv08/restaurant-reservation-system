<?php
declare(strict_types=1);

namespace App\Service;

use App\Domain\ReservationState;
use DateTimeImmutable;
use PDO;

final class AvailabilityService
{
    public function __construct(private readonly PDO $pdo, private readonly BookingClock $clock)
    {
    }

    public function search(string $date, int $party, string $roomType = 'any', ?int $excludeReservation = null): array
    {
        $policy = new BookingPolicy($this->pdo);
        $now = $this->clock->now();
        $day = $policy->date($date, $now);
        $policy->validateParty($party);
        $types = $policy->types($roomType);
        $slots = [];
        foreach ($policy->starts($day, $types) as $start) {
            $options = $this->options($start, $party, $roomType, $now, null, null, $policy, false, $excludeReservation);
            if ($options !== []) {
                $slots[] = ['time' => $start->format('H:i'), 'options' => $options];
            }
        }
        return ['date' => $date, 'party_size' => $party, 'room_type' => $roomType,
            'timezone' => 'Asia/Manila', 'slots' => $slots,
            'message' => $slots === [] ? 'No slots fit the opening hours, booking rules, or remaining inventory.' : null];
    }

    public function options(DateTimeImmutable $start, int $party, string $roomType, DateTimeImmutable $now,
        ?int $excludeHold = null, ?DateTimeImmutable $eligibleAt = null, ?BookingPolicy $policy = null,
        bool $includeGroups = false, ?int $excludeReservation = null): array
    {
        $policy ??= new BookingPolicy($this->pdo);
        $policy->validateParty($party);
        if ($start <= $now || !$this->hasPacing($start, $party, $now, $excludeHold, $policy, $excludeReservation)) {
            return [];
        }
        $singles = [];
        $groups = [];
        foreach ($policy->types($roomType) as $type) {
            $interval = $policy->interval($start, $party, $type, $eligibleAt ?? $now);
            if ($interval === null) {
                continue;
            }
            $query = $this->pdo->prepare('SELECT t.*, r.room_type_id FROM `tables` t JOIN rooms r ON r.id = t.room_id
                WHERE r.room_type_id = ? AND r.is_active = 1 AND t.is_active = 1
                AND t.capacity_min <= ? AND t.capacity_max >= ?');
            $query->execute([$type['id'], $party, $party]);
            foreach ($query as $table) {
                if ($this->membersFree([(int) $table['id']], (int) $table['room_id'], (int) $type['id'], $interval, $now, $excludeHold, $excludeReservation)) {
                    $singles[] = $this->option('table', $table, [(int) $table['id']], $type, $party, $interval, $policy);
                }
            }
            $query = $this->pdo->prepare('SELECT g.* FROM table_groups g JOIN rooms r ON r.id = g.room_id
                WHERE r.room_type_id = ? AND r.is_active = 1 AND g.is_active = 1
                AND g.capacity_min <= ? AND g.capacity_max >= ?');
            $query->execute([$type['id'], $party, $party]);
            foreach ($query as $group) {
                $joinedInterval = $policy->interval($start, $party, $type, $eligibleAt ?? $now, (int) $group['setup_min']);
                if ($joinedInterval === null) {
                    continue;
                }
                $members = $this->pdo->prepare('SELECT t.* FROM table_group_members m JOIN `tables` t ON t.id = m.table_id
                    WHERE m.table_group_id = ? ORDER BY t.id');
                $members->execute([$group['id']]);
                $members = $members->fetchAll();
                if (count($members) < 2 || array_filter($members, static fn (array $t): bool =>
                    (int) $t['is_active'] !== 1 || (int) $t['is_joinable'] !== 1 || (int) $t['room_id'] !== (int) $group['room_id']) !== []
                    || array_sum(array_column($members, 'capacity_min')) > $party
                    || array_sum(array_column($members, 'capacity_max')) < $party) {
                    continue;
                }
                $ids = array_map(static fn (array $t): int => (int) $t['id'], $members);
                if ($this->membersFree($ids, (int) $group['room_id'], (int) $type['id'], $joinedInterval, $now, $excludeHold, $excludeReservation)) {
                    $groups[] = $this->option('group', $group, $ids, $type, $party, $joinedInterval, $policy);
                }
            }
        }
        $options = $includeGroups ? array_merge($singles, $groups) : ($singles !== [] ? $singles : $groups);
        usort($options, static fn (array $a, array $b): int =>
            [$a['capacity_max'], $a['priority'], $a['id']] <=> [$b['capacity_max'], $b['priority'], $b['id']]);
        return $options;
    }

    private function option(string $kind, array $row, array $ids, array $type, int $party, array $interval, BookingPolicy $policy): array
    {
        return $interval + ['kind' => $kind, 'id' => (int) $row['id'], 'label' => $row['label'] ?? $row['name'],
            'room_type_id' => (int) $type['id'], 'room_type' => $type['code'], 'room_id' => (int) $row['room_id'],
            'table_ids' => $ids, 'capacity_max' => (int) $row['capacity_max'], 'priority' => (int) ($row['priority'] ?? 100),
            'min_spend_cents' => (int) $type['min_spend_cents'],
            'approval_required' => $party >= $policy->number('manager_approval_party_min') || (int) $type['requires_approval'] === 1];
    }

    private function hasPacing(DateTimeImmutable $start, int $party, DateTimeImmutable $now, ?int $excludeHold,
        BookingPolicy $policy, ?int $excludeReservation): bool
    {
        $query = $this->pdo->prepare('SELECT COUNT(*), COALESCE(SUM(party_size), 0) FROM reservations
            WHERE starts_at = ? AND status IN (' . ReservationState::occupyingSql() . ') AND id <> ?');
        $query->execute([$start->format('Y-m-d H:i:s'), $excludeReservation ?? 0]);
        [$bookings, $covers] = $query->fetch(PDO::FETCH_NUM);
        $query = $this->pdo->prepare("SELECT COUNT(*), COALESCE(SUM(party_size), 0) FROM holds
            WHERE starts_at = ? AND status = 'active' AND expires_at > ? AND id <> ?");
        $query->execute([$start->format('Y-m-d H:i:s'), $now->format('Y-m-d H:i:s'), $excludeHold ?? 0]);
        [$heldBookings, $heldCovers] = $query->fetch(PDO::FETCH_NUM);
        [$maxCovers, $maxBookings] = $policy->pacingCaps($start);
        return (int) $bookings + (int) $heldBookings < $maxBookings
            && (int) $covers + (int) $heldCovers + $party <= $maxCovers;
    }

    private function membersFree(array $ids, int $roomId, int $typeId, array $interval, DateTimeImmutable $now,
        ?int $excludeHold, ?int $excludeReservation): bool
    {
        foreach ($ids as $id) {
            $query = $this->pdo->prepare("SELECT COUNT(*) FROM blackout_dates WHERE blocks_booking = 1
                AND starts_at < ? AND ends_at > ? AND (scope = 'venue'
                    OR (scope = 'room_type' AND scope_id = ?) OR (scope = 'room' AND scope_id = ?)
                    OR (scope = 'table' AND scope_id = ?))");
            $query->execute([$interval['blocks_until'], $interval['starts_at'], $typeId, $roomId, $id]);
            if ((int) $query->fetchColumn() > 0) {
                return false;
            }
            $query = $this->pdo->prepare('SELECT COUNT(*) FROM reservation_tables rt JOIN reservations r ON r.id = rt.reservation_id
                WHERE rt.table_id = ? AND rt.released_at IS NULL AND r.status IN (' . ReservationState::occupyingSql() . ')
                AND r.starts_at < ? AND (r.blocks_until > ? OR (r.status = \'seated\' AND DATE(r.starts_at) = ?)) AND r.id <> ?');
            $query->execute([$id, $interval['blocks_until'], $interval['starts_at'], substr($interval['starts_at'], 0, 10), $excludeReservation ?? 0]);
            if ((int) $query->fetchColumn() > 0) {
                return false;
            }
            $query = $this->pdo->prepare("SELECT COUNT(*) FROM hold_tables ht JOIN holds h ON h.id = ht.hold_id
                WHERE ht.table_id = ? AND h.status = 'active' AND h.expires_at > ? AND h.id <> ?
                AND h.starts_at < ? AND h.blocks_until > ?");
            $query->execute([$id, $now->format('Y-m-d H:i:s'), $excludeHold ?? 0, $interval['blocks_until'], $interval['starts_at']]);
            if ((int) $query->fetchColumn() > 0) {
                return false;
            }
        }
        return true;
    }
}
