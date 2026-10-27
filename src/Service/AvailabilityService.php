<?php
declare(strict_types=1);

namespace App\Service;

use DateTimeImmutable;
use PDO;

final class AvailabilityService
{
    public function __construct(private readonly PDO $pdo, private readonly BookingClock $clock)
    {
    }

    public function search(string $date, int $party, string $roomType = 'any', ?int $excludeReservation = null): array
    {
        if(ReservationPolicyService::enabled($this->pdo)&&!$this->pdo->inTransaction())(new ReservationPolicyService($this->pdo,$this->clock))->reconcile();
        $policy = new BookingPolicy($this->pdo);
        $now = $this->clock->now();
        $day = $policy->date($date, $now);
        $policy->validateParty($party);
        $types = $policy->types($roomType);
        $snapshot = new AvailabilitySnapshot($this->pdo, $day, $now, $excludeReservation);
        $slots = [];
        foreach ($policy->starts($day, $types) as $start) {
            $options = $this->options($start, $party, $roomType, $now, null, null, $policy, false, $excludeReservation, $snapshot);
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
        bool $includeGroups = false, ?int $excludeReservation = null, ?AvailabilitySnapshot $snapshot = null): array
    {
        $policy ??= new BookingPolicy($this->pdo);
        $policy->validateParty($party);
        if ($start <= $now) {
            return [];
        }
        $snapshot ??= new AvailabilitySnapshot($this->pdo, $start, $now, $excludeReservation, $excludeHold);
        if (!$this->hasPacing($start, $party, $policy, $snapshot)) {
            return [];
        }
        $singles = [];
        $groups = [];
        foreach ($policy->types($roomType) as $type) {
            $interval = $policy->interval($start, $party, $type, $eligibleAt ?? $now);
            if ($interval === null) {
                continue;
            }
            $tables = array_filter($snapshot->tables, static fn (array $row): bool =>
                (int) $row['room_type_id'] === (int) $type['id'] && (int) $row['capacity_min'] <= $party && (int) $row['capacity_max'] >= $party);
            foreach ($tables as $table) {
                if ($snapshot->free([(int) $table['id']], (int) $table['room_id'], (int) $type['id'], $interval)) {
                    $singles[] = $this->option('table', $table, [(int) $table['id']], $type, $party, $interval, $policy);
                }
            }
            $candidates = array_filter($snapshot->groups, static fn (array $row): bool =>
                (int) $row['room_type_id'] === (int) $type['id'] && (int) $row['capacity_min'] <= $party && (int) $row['capacity_max'] >= $party);
            foreach ($candidates as $group) {
                $joinedInterval = $policy->interval($start, $party, $type, $eligibleAt ?? $now, (int) $group['setup_min']);
                if ($joinedInterval === null) {
                    continue;
                }
                $members = $snapshot->members[(int) $group['id']] ?? [];
                if (count($members) < 2 || array_filter($members, static fn (array $t): bool =>
                    (int) $t['is_active'] !== 1 || (int) $t['is_joinable'] !== 1 || (int) $t['room_id'] !== (int) $group['room_id']) !== []
                    || array_sum(array_column($members, 'capacity_min')) > $party
                    || array_sum(array_column($members, 'capacity_max')) < $party) {
                    continue;
                }
                $ids = array_map(static fn (array $t): int => (int) $t['id'], $members);
                if ($snapshot->free($ids, (int) $group['room_id'], (int) $type['id'], $joinedInterval)) {
                    $groups[] = $this->option('group', $group, $ids, $type, $party, $joinedInterval, $policy);
                }
            }
        }
        $options = $includeGroups ? array_merge($singles, $groups) : ($singles !== [] ? $singles : $groups);
        if(($policy->settings['policy_profile']??'')==='bella_vista_b5')foreach($options as &$o)$o['policy_fees']=BillingFees::assess($o['room_type'],$party);
        unset($o);
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

    private function hasPacing(DateTimeImmutable $start, int $party, BookingPolicy $policy, AvailabilitySnapshot $snapshot): bool
    {
        [$bookings, $covers] = $snapshot->pacing[$start->format('Y-m-d H:i:s')] ?? [0, 0];
        [$maxCovers, $maxBookings] = $policy->pacingCaps($start);
        return $bookings < $maxBookings && $covers + $party <= $maxCovers;
    }
}
