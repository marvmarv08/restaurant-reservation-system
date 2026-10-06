<?php
declare(strict_types=1);
namespace App\Service;

use App\Domain\ReservationState;
use DateTimeImmutable;
use PDO;

/** A fresh inventory view for one search or one locked booking check; never retained across calls. */
final class AvailabilitySnapshot
{
    public array $tables;
    public array $groups;
    public array $members = [];
    public array $blackouts;
    public array $reservations;
    public array $holds;
    public array $pacing = [];

    public function __construct(PDO $pdo, DateTimeImmutable $day, DateTimeImmutable $now, ?int $excludeReservation = null, ?int $excludeHold = null)
    {
        $from = $day->setTime(0, 0)->format('Y-m-d H:i:s');
        $until = $day->setTime(0, 0)->modify('+2 days')->format('Y-m-d H:i:s');
        $fetch = static function (string $sql, array $args = []) use ($pdo): array {
            $query = $pdo->prepare($sql);
            $query->execute($args);
            return $query->fetchAll();
        };
        $this->tables = $fetch('SELECT t.*, r.room_type_id FROM `tables` t JOIN rooms r ON r.id = t.room_id WHERE r.is_active = 1 AND t.is_active = 1');
        $this->groups = $fetch('SELECT g.*, r.room_type_id FROM table_groups g JOIN rooms r ON r.id = g.room_id WHERE r.is_active = 1 AND g.is_active = 1');
        foreach ($fetch('SELECT t.*, m.table_group_id FROM table_group_members m JOIN `tables` t ON t.id = m.table_id ORDER BY t.id') as $member) {
            $this->members[(int) $member['table_group_id']][] = $member;
        }
        $this->blackouts = $fetch('SELECT scope, scope_id, starts_at, ends_at FROM blackout_dates WHERE blocks_booking = 1 AND starts_at < ? AND ends_at > ?', [$until, $from]);
        $occupying = ReservationState::occupyingSql();
        $this->reservations = $fetch("SELECT rt.table_id, r.starts_at, r.blocks_until, r.status FROM reservation_tables rt JOIN reservations r ON r.id = rt.reservation_id
            WHERE rt.released_at IS NULL AND r.status IN ($occupying) AND r.id <> ? AND r.starts_at < ?
            AND (r.blocks_until > ? OR (r.status = 'seated' AND r.starts_at >= ?))", [$excludeReservation ?? 0, $until, $from, $from]);
        $this->holds = $fetch("SELECT ht.table_id, h.starts_at, h.blocks_until FROM hold_tables ht JOIN holds h ON h.id = ht.hold_id
            WHERE h.status = 'active' AND h.expires_at > ? AND h.id <> ? AND h.starts_at < ? AND h.blocks_until > ?", [$now->format('Y-m-d H:i:s'), $excludeHold ?? 0, $until, $from]);
        $rows = $fetch("SELECT starts_at, COUNT(*) bookings, SUM(party_size) covers FROM reservations WHERE status IN ($occupying)
            AND id <> ? AND starts_at >= ? AND starts_at < ? GROUP BY starts_at", [$excludeReservation ?? 0, $from, $until]);
        $held = $fetch("SELECT starts_at, COUNT(*) bookings, SUM(party_size) covers FROM holds WHERE status = 'active' AND expires_at > ? AND id <> ?
            AND starts_at >= ? AND starts_at < ? GROUP BY starts_at", [$now->format('Y-m-d H:i:s'), $excludeHold ?? 0, $from, $until]);
        foreach (array_merge($rows, $held) as $row) {
            $key = $row['starts_at'];
            $old = $this->pacing[$key] ?? [0, 0];
            $this->pacing[$key] = [$old[0] + (int) $row['bookings'], $old[1] + (int) $row['covers']];
        }
    }

    public function free(array $ids, int $roomId, int $typeId, array $interval): bool
    {
        foreach ($ids as $id) {
            foreach ($this->blackouts as $row) {
                $matches = $row['scope'] === 'venue'
                    || ($row['scope'] === 'room_type' && (int) $row['scope_id'] === $typeId)
                    || ($row['scope'] === 'room' && (int) $row['scope_id'] === $roomId)
                    || ($row['scope'] === 'table' && (int) $row['scope_id'] === $id);
                if ($matches && $row['starts_at'] < $interval['blocks_until'] && $row['ends_at'] > $interval['starts_at']) {
                    return false;
                }
            }
            foreach ($this->reservations as $row) {
                if ((int) $row['table_id'] === $id && $row['starts_at'] < $interval['blocks_until']
                    && ($row['blocks_until'] > $interval['starts_at'] || ($row['status'] === 'seated'
                        && substr($row['starts_at'], 0, 10) === substr($interval['starts_at'], 0, 10)))) {
                    return false;
                }
            }
            foreach ($this->holds as $row) {
                if ((int) $row['table_id'] === $id && $row['starts_at'] < $interval['blocks_until'] && $row['blocks_until'] > $interval['starts_at']) {
                    return false;
                }
            }
        }
        return true;
    }
}
