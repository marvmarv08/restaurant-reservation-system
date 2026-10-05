<?php
declare(strict_types=1);

namespace App\Service;

use App\Domain\BookingError;
use DateTimeImmutable;
use DateTimeZone;
use PDO;
use RuntimeException;

final class BookingPolicy
{
    public readonly array $settings;
    public readonly array $roomTypes;
    public readonly DateTimeZone $timezone;
    private array $hours;
    private array $turns;
    private array $pacing;

    public function __construct(PDO $pdo)
    {
        $this->settings = $pdo->query('SELECT skey, svalue FROM settings')->fetchAll(PDO::FETCH_KEY_PAIR);
        if (($this->settings['venue_timezone'] ?? '') !== 'Asia/Manila') {
            throw new RuntimeException('The local DATETIME schema requires Asia/Manila venue time');
        }
        $this->timezone = new DateTimeZone('Asia/Manila');
        $this->roomTypes = $pdo->query('SELECT * FROM room_types WHERE is_active = 1 ORDER BY sort_order, id')->fetchAll();
        $this->hours = $pdo->query('SELECT * FROM opening_hours ORDER BY id')->fetchAll();
        $this->turns = $pdo->query('SELECT * FROM turn_times ORDER BY party_min')->fetchAll();
        $this->pacing = $pdo->query('SELECT * FROM pacing_rules ORDER BY id')->fetchAll();
    }

    public function number(string $key): int
    {
        $value = $this->settings[$key] ?? null;
        if (!is_string($value) || !ctype_digit($value)) {
            throw new RuntimeException('Invalid booking setting: ' . $key);
        }
        return (int) $value;
    }

    public function date(string $date, DateTimeImmutable $now): DateTimeImmutable
    {
        $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date, $this->timezone);
        if (!$parsed || $parsed->format('Y-m-d') !== $date) {
            throw new BookingError('invalid_date', 'Use a valid date in YYYY-MM-DD format.');
        }
        $today = $now->setTimezone($this->timezone)->setTime(0, 0);
        if ($parsed < $today || $parsed > $today->modify('+' . $this->number('max_lead_time_days') . ' days')) {
            throw new BookingError('date_out_of_range', 'Choose a date within the online booking window.');
        }
        return $parsed;
    }

    public function start(string $date, string $time, DateTimeImmutable $now): DateTimeImmutable
    {
        $day = $this->date($date, $now);
        if (!preg_match('/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/D', $time)) {
            throw new BookingError('invalid_time', 'Use a valid time in HH:MM format.');
        }
        return new DateTimeImmutable($day->format('Y-m-d') . ' ' . $time, $this->timezone);
    }

    public function validateParty(int $party): void
    {
        if ($party < 1 || $party > $this->number('max_party_online') || $party > 16) {
            throw new BookingError('party_out_of_range', 'Online bookings accept parties of 1 to 16.');
        }
    }

    public function types(string $code): array
    {
        if ($code === 'any') {
            return $this->roomTypes;
        }
        $types = array_values(array_filter($this->roomTypes, static fn (array $type): bool => $type['code'] === $code));
        if ($types === []) {
            throw new BookingError('invalid_room_type', 'Choose an available room type.');
        }
        return $types;
    }

    public function turn(int $party): int
    {
        foreach ($this->turns as $turn) {
            if ($party >= (int) $turn['party_min'] && $party <= (int) $turn['party_max']) {
                return (int) $turn['turn_time_min'];
            }
        }
        throw new RuntimeException('Missing turn time');
    }

    private function services(DateTimeImmutable $start, int $typeId): array
    {
        $day = (int) $start->format('w');
        $matching = array_values(array_filter($this->hours, static fn (array $row): bool =>
            (int) $row['weekday'] === $day && $row['room_type_id'] !== null && (int) $row['room_type_id'] === $typeId));
        return $matching !== [] ? $matching : array_values(array_filter($this->hours, static fn (array $row): bool =>
            (int) $row['weekday'] === $day && $row['room_type_id'] === null));
    }

    public function interval(DateTimeImmutable $start, int $party, array $type, DateTimeImmutable $eligibleAt, int $setup = 0): ?array
    {
        if ($party < (int) $type['min_party'] || $party > (int) $type['max_party']) {
            return null;
        }
        $notice = max($this->number('min_lead_time_min') * 60, (int) $type['min_notice_hours'] * 3600);
        if ($start->getTimestamp() - $eligibleAt->getTimestamp() < $notice) {
            return null;
        }
        $turn = $this->turn($party);
        $end = $start->modify('+' . $turn . ' minutes');
        $block = $end->modify('+' . ($this->number('buffer_min') + $setup) . ' minutes');
        $grid = $this->number('slot_interval_min') * 60;
        if ($grid < 60) {
            throw new RuntimeException('Slot interval must be positive');
        }
        $last = new DateTimeImmutable($start->format('Y-m-d') . ' ' . $this->settings['last_seating_time'], $this->timezone);
        foreach ($this->services($start, (int) $type['id']) as $service) {
            if ((int) $service['is_closed'] === 1) {
                continue;
            }
            $open = new DateTimeImmutable($start->format('Y-m-d') . ' ' . $service['open_time'], $this->timezone);
            $close = new DateTimeImmutable($start->format('Y-m-d') . ' ' . $service['close_time'], $this->timezone);
            if ($close <= $open) {
                $close = $close->modify('+1 day');
            }
            if ($start >= $open && $start <= $last && $block <= $close
                && ($start->getTimestamp() - $open->getTimestamp()) % $grid === 0) {
                return ['starts_at' => $start->format('Y-m-d H:i:s'), 'ends_at' => $end->format('Y-m-d H:i:s'),
                    'blocks_until' => $block->format('Y-m-d H:i:s'), 'turn_time_min' => $turn];
            }
        }
        return null;
    }

    public function starts(DateTimeImmutable $day, array $types): array
    {
        $starts = [];
        $step = $this->number('slot_interval_min');
        if ($step < 1) {
            throw new RuntimeException('Slot interval must be positive');
        }
        foreach ($types as $type) {
            foreach ($this->services($day, (int) $type['id']) as $service) {
                if ((int) $service['is_closed'] === 1) {
                    continue;
                }
                $open = new DateTimeImmutable($day->format('Y-m-d') . ' ' . $service['open_time'], $this->timezone);
                $last = new DateTimeImmutable($day->format('Y-m-d') . ' ' . $this->settings['last_seating_time'], $this->timezone);
                for ($time = $open; $time <= $last; $time = $time->modify('+' . $step . ' minutes')) {
                    $starts[$time->format('H:i')] = $time;
                }
            }
        }
        ksort($starts);
        return array_values($starts);
    }

    public function pacingCaps(DateTimeImmutable $start): array
    {
        $covers = $this->number('max_covers_per_slot');
        $bookings = $this->number('max_reservations_per_slot');
        foreach ($this->pacing as $rule) {
            if (($rule['weekday'] === null || (int) $rule['weekday'] === (int) $start->format('w'))
                && $start->format('H:i:s') >= $rule['window_start'] && $start->format('H:i:s') <= $rule['window_end']) {
                $covers = min($covers, (int) $rule['max_covers']);
                $bookings = min($bookings, (int) $rule['max_reservations']);
            }
        }
        return [$covers, $bookings];
    }
}
