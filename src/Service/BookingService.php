<?php
declare(strict_types=1);

namespace App\Service;

use App\Domain\BookingError;
use Closure;
use DateTimeImmutable;
use DateTimeZone;
use PDO;
use PDOException;
use RuntimeException;
use Throwable;

final class BookingService
{
    private AvailabilityService $availability;

    public function __construct(private readonly PDO $pdo, private readonly BookingClock $clock,
        private readonly ?Closure $testCodeGenerator = null)
    {
        $this->availability = new AvailabilityService($pdo, $clock);
    }

    public function hold(string $date, string $time, int $party, string $roomType, string $session,
        ?string $kind = null, ?int $optionId = null): array
    {
        $this->validateSession($session);
        if (($kind === null) !== ($optionId === null) || ($kind !== null && !in_array($kind, ['table', 'group'], true))
            || ($optionId !== null && $optionId < 1)) {
            throw new BookingError('invalid_option', 'Choose a table or declared table group.');
        }
        $policy = new BookingPolicy($this->pdo);
        $policy->start($date, $time, $this->clock->now());
        $policy->validateParty($party);
        $policy->types($roomType);
        return $this->transaction(function () use ($date, $time, $party, $roomType, $session, $kind, $optionId): array {
            $this->lockDay($date);
            $policy = new BookingPolicy($this->pdo);
            $now = $this->clock->now();
            $start = $policy->start($date, $time, $now);
            $option = $this->choose($this->availability->options($start, $party, $roomType, $now, null, null, $policy), $kind, $optionId);
            $this->lockTables($option['table_ids']);
            // Refresh server time after waiting for locks; an old check must never extend an expired hold.
            $now = $this->clock->now();
            $policy = new BookingPolicy($this->pdo);
            $start = $policy->start($date, $time, $now);
            $option = $this->choose($this->availability->options($start, $party, $roomType, $now, null, null, $policy), $option['kind'], $option['id']);
            $ttl = $policy->number('hold_ttl_sec');
            if ($ttl < 1) {
                throw new RuntimeException('Hold TTL must be positive');
            }
            $token = $this->uuid();
            $expires = $now->modify('+' . $ttl . ' seconds')->format('Y-m-d H:i:s');
            $insert = $this->pdo->prepare('INSERT INTO holds
                (hold_token, table_id, table_group_id, starts_at, ends_at, blocks_until, party_size, session_id, expires_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $insert->execute([$token, $option['kind'] === 'table' ? $option['id'] : null,
                $option['kind'] === 'group' ? $option['id'] : null, $option['starts_at'], $option['ends_at'],
                $option['blocks_until'], $party, $session, $expires, $now->format('Y-m-d H:i:s')]);
            $holdId = (int) $this->pdo->lastInsertId();
            $insert = $this->pdo->prepare('INSERT INTO hold_tables (hold_id, table_id) VALUES (?, ?)');
            foreach ($option['table_ids'] as $id) {
                $insert->execute([$holdId, $id]);
            }
            return ['hold_token' => $token, 'expires_at' => $expires, 'timezone' => 'Asia/Manila',
                'party_size' => $party, 'option' => $option];
        });
    }

    public function confirm(string $token, array $details, string $session): array
    {
        $details = $this->guestDetails($details);
        return $this->transaction(function () use ($token, $details, $session): array {
            $hold = $this->lockOwnedHold($token, $session);
            if ($hold['status'] === 'consumed') {
                $query = $this->pdo->prepare('SELECT reservation_id FROM hold_reservations WHERE hold_id = ?');
                $query->execute([$hold['id']]);
                $id = $query->fetchColumn();
                if ($id === false) {
                    throw new RuntimeException('Consumed hold has no reservation');
                }
                return $this->booking((int) $id, false);
            }
            $now = $this->clock->now();
            if ($hold['status'] !== 'active' || $hold['expires_at'] <= $now->format('Y-m-d H:i:s')) {
                throw new BookingError('hold_expired', 'The hold has ended. Search again to choose a table.', 410);
            }
            $policy = new BookingPolicy($this->pdo);
            $start = new DateTimeImmutable($hold['starts_at'], $policy->timezone);
            $policy->date($start->format('Y-m-d'), $now);
            $query = $this->pdo->prepare('SELECT rt.code FROM `tables` t JOIN rooms r ON r.id = t.room_id
                JOIN room_types rt ON rt.id = r.room_type_id WHERE t.id = ?');
            $query->execute([$hold['members'][0]]);
            $roomType = (string) $query->fetchColumn();
            // Lead/notice are measured at hold creation, preserving the promised form-completion window.
            // Other current policy and conflict checks still run before confirmation.
            $createdAt = new DateTimeImmutable($hold['created_at'], $policy->timezone);
            $options = $this->availability->options($start, (int) $hold['party_size'], $roomType, $now,
                (int) $hold['id'], $createdAt, $policy, true);
            $kind = $hold['table_group_id'] === null ? 'table' : 'group';
            $optionId = (int) ($hold['table_group_id'] ?? $hold['table_id']);
            $option = $this->choose($options, $kind, $optionId);
            if ($option['table_ids'] !== $hold['members']) {
                throw new BookingError('inventory_changed', 'The held table combination changed. Search again.', 409);
            }
            $insert = $this->pdo->prepare('INSERT INTO guests (full_name, phone, email, notes) VALUES (?, ?, ?, ?)');
            $insert->execute([$details['full_name'], $details['phone'], $details['email'], $details['special_requests']]);
            $guestId = (int) $this->pdo->lastInsertId();
            $status = $option['approval_required'] ? 'pending' : 'confirmed';
            $insert = $this->pdo->prepare('INSERT INTO reservations
                (code, guest_id, room_type_id, table_group_id, party_size, starts_at, ends_at, blocks_until,
                 turn_time_min, status, source, approval_state, special_requests)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'web\', ?, ?)');
            for ($attempt = 0; $attempt < 20; $attempt++) {
                $code = $this->confirmationCode($attempt);
                try {
                    $insert->execute([$code, $guestId, $option['room_type_id'], $kind === 'group' ? $optionId : null,
                        $hold['party_size'], $option['starts_at'], $option['ends_at'], $option['blocks_until'],
                        $option['turn_time_min'], $status, $option['approval_required'] ? 'awaiting' : 'not_required',
                        $details['special_requests']]);
                    break;
                } catch (PDOException $error) {
                    $lookup = $this->pdo->prepare('SELECT id FROM reservations WHERE code = ?');
                    $lookup->execute([$code]);
                    if ((int) ($error->errorInfo[1] ?? 0) !== 1062 || $lookup->fetchColumn() === false || $attempt === 19) {
                        throw $error;
                    }
                }
            }
            $reservationId = (int) $this->pdo->lastInsertId();
            $insert = $this->pdo->prepare('INSERT INTO reservation_tables (reservation_id, table_id, slot_start) VALUES (?, ?, ?)');
            foreach ($hold['members'] as $id) {
                $insert->execute([$reservationId, $id, $option['starts_at']]);
            }
            $this->pdo->prepare('INSERT INTO hold_reservations (hold_id, reservation_id) VALUES (?, ?)')->execute([$hold['id'], $reservationId]);
            $this->pdo->prepare("UPDATE holds SET status = 'consumed' WHERE id = ?")->execute([$hold['id']]);
            $this->history($reservationId, null, $status, 'Guest booking');
            if ($details['email'] !== null) {
                $this->pdo->prepare("INSERT INTO outbox (reservation_id, channel, recipient, subject, body)
                    VALUES (?, 'email', ?, 'Lumina booking', ?)")
                    ->execute([$reservationId, $details['email'], "Demo notification: {$code}, {$status}, {$option['starts_at']} Asia/Manila. No payment collected."]);
            }
            return $this->booking($reservationId, true);
        });
    }

    public function release(string $token, string $session): array
    {
        return $this->transaction(function () use ($token, $session): array {
            $hold = $this->lockOwnedHold($token, $session);
            if ($hold['status'] === 'consumed') {
                throw new BookingError('hold_consumed', 'This hold has already produced a booking.', 409);
            }
            $status = $hold['status'];
            if ($status === 'active') {
                $status = $hold['expires_at'] <= $this->clock->now()->format('Y-m-d H:i:s') ? 'expired' : 'released';
                $this->pdo->prepare('UPDATE holds SET status = ? WHERE id = ?')->execute([$status, $hold['id']]);
            }
            return ['status' => $status];
        });
    }

    // Internal domain operation. P4/P5 controllers must authorize the caller before invoking it.
    public function cancel(int $reservationId, string $reason): array
    {
        return $this->transaction(function () use ($reservationId, $reason): array {
            $query = $this->pdo->prepare('SELECT starts_at FROM reservations WHERE id = ?');
            $query->execute([$reservationId]);
            $start = $query->fetchColumn();
            if ($start === false) {
                throw new BookingError('booking_not_found', 'Booking not found.', 404);
            }
            $this->lockDay(substr((string) $start, 0, 10));
            $query = $this->pdo->prepare('SELECT table_id FROM reservation_tables WHERE reservation_id = ? ORDER BY table_id');
            $query->execute([$reservationId]);
            $this->lockTables(array_map('intval', $query->fetchAll(PDO::FETCH_COLUMN)), false);
            $query = $this->pdo->prepare('SELECT status FROM reservations WHERE id = ? FOR UPDATE');
            $query->execute([$reservationId]);
            $status = (string) $query->fetchColumn();
            if ($status !== 'cancelled') {
                if (!in_array($status, ['pending', 'confirmed', 'waitlisted'], true)) {
                    throw new BookingError('invalid_transition', 'This booking cannot be cancelled in its current state.', 409);
                }
                $now = $this->clock->now()->format('Y-m-d H:i:s');
                $this->pdo->prepare("UPDATE reservations SET status = 'cancelled', cancelled_at = ?, version = version + 1 WHERE id = ?")
                    ->execute([$now, $reservationId]);
                $this->pdo->prepare('UPDATE reservation_tables SET released_at = ? WHERE reservation_id = ? AND released_at IS NULL')
                    ->execute([$now, $reservationId]);
                $this->history($reservationId, $status, 'cancelled', $reason);
            }
            return $this->booking($reservationId, false);
        });
    }

    public function expireHolds(): int
    {
        $query = $this->pdo->prepare("UPDATE holds SET status = 'expired' WHERE status = 'active' AND expires_at <= ?");
        $query->execute([$this->clock->now()->format('Y-m-d H:i:s')]);
        return $query->rowCount();
    }

    private function lockOwnedHold(string $token, string $session): array
    {
        $this->validateSession($session);
        if (!preg_match('/^[0-9a-f-]{36}$/Di', $token)) {
            throw new BookingError('hold_not_found', 'Hold not found.', 404);
        }
        $query = $this->pdo->prepare('SELECT * FROM holds WHERE hold_token = ?');
        $query->execute([$token]);
        $hold = $query->fetch();
        if (!$hold || !is_string($hold['session_id']) || !hash_equals($hold['session_id'], $session)) {
            throw new BookingError('hold_not_found', 'Hold not found.', 404);
        }
        $this->lockDay(substr($hold['starts_at'], 0, 10));
        $query = $this->pdo->prepare('SELECT table_id FROM hold_tables WHERE hold_id = ? ORDER BY table_id');
        $query->execute([$hold['id']]);
        $members = array_map('intval', $query->fetchAll(PDO::FETCH_COLUMN));
        if ($members === []) {
            throw new RuntimeException('Hold has no physical table membership');
        }
        $this->lockTables($members, false);
        $query = $this->pdo->prepare('SELECT * FROM holds WHERE id = ? FOR UPDATE');
        $query->execute([$hold['id']]);
        return $query->fetch() + ['members' => $members];
    }

    private function lockDay(string $date): void
    {
        $this->pdo->prepare('INSERT INTO booking_days (service_date) VALUES (?) ON DUPLICATE KEY UPDATE service_date = service_date')->execute([$date]);
        $this->pdo->prepare('SELECT service_date FROM booking_days WHERE service_date = ? FOR UPDATE')->execute([$date]);
    }

    private function lockTables(array $ids, bool $requireActive = true): void
    {
        sort($ids, SORT_NUMERIC);
        $query = $this->pdo->prepare('SELECT is_active FROM `tables` WHERE id = ? FOR UPDATE');
        foreach ($ids as $id) {
            $query->execute([$id]);
            $active = $query->fetchColumn();
            if ($active === false || ($requireActive && (int) $active !== 1)) {
                throw new BookingError('inventory_changed', 'Table inventory changed. Search again.', 409);
            }
        }
    }

    private function choose(array $options, ?string $kind, ?int $id): array
    {
        foreach ($options as $option) {
            if ($kind === null || ($option['kind'] === $kind && $option['id'] === $id)) {
                return $option;
            }
        }
        throw new BookingError('unavailable', 'This slot or table is unavailable under the current booking rules.', 409);
    }

    private function transaction(Closure $action): array
    {
        for ($attempt = 0; $attempt < 3; $attempt++) {
            try {
                $this->pdo->exec('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
                $this->pdo->beginTransaction();
                $result = $action();
                $this->pdo->commit();
                return $result;
            } catch (Throwable $error) {
                if ($this->pdo->inTransaction()) {
                    $this->pdo->rollBack();
                }
                $number = $error instanceof PDOException ? (int) ($error->errorInfo[1] ?? 0) : 0;
                if (in_array($number, [1213, 1205], true) && $attempt < 2) {
                    usleep(random_int(10000, 40000));
                    continue;
                }
                if (in_array($number, [1213, 1205, 1062], true)) {
                    throw new BookingError('booking_conflict', 'Inventory is busy. Search again and retry.', 409);
                }
                throw $error;
            }
        }
        throw new RuntimeException('Transaction retry exhausted');
    }

    private function guestDetails(array $details): array
    {
        $result = [];
        foreach (['full_name' => 120, 'phone' => 32, 'email' => 190, 'special_requests' => 2000] as $field => $limit) {
            $value = $details[$field] ?? '';
            if (!is_string($value) || strlen(trim($value)) > $limit || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $value)) {
                throw new BookingError('invalid_guest', 'Please check the guest details.');
            }
            $result[$field] = trim($value);
        }
        $digits = preg_replace('/\D/', '', $result['phone']);
        if ($result['full_name'] === '' || !preg_match('/^\+?[0-9 ()-]+$/D', $result['phone'])
            || strlen($digits) < 7 || strlen($digits) > 15
            || ($result['email'] !== '' && !filter_var($result['email'], FILTER_VALIDATE_EMAIL))) {
            throw new BookingError('invalid_guest', 'Provide a name, valid phone number, and valid email if supplied.');
        }
        $result['email'] = $result['email'] === '' ? null : $result['email'];
        $result['special_requests'] = $result['special_requests'] === '' ? null : $result['special_requests'];
        return $result;
    }

    private function booking(int $id, bool $created): array
    {
        $query = $this->pdo->prepare('SELECT code, status, party_size, starts_at, ends_at, approval_state FROM reservations WHERE id = ?');
        $query->execute([$id]);
        $booking = $query->fetch();
        $policy = new BookingPolicy($this->pdo);
        $start = new DateTimeImmutable($booking['starts_at'], $policy->timezone);
        return $booking + ['created' => $created, 'timezone' => 'Asia/Manila',
            'cancel_deadline' => $start->modify('-' . $policy->number('cancel_cutoff_min') . ' minutes')->format('Y-m-d H:i:s')];
    }

    private function history(int $id, ?string $from, string $to, string $reason): void
    {
        $this->pdo->prepare('INSERT INTO reservation_status_history (reservation_id, from_status, to_status, reason) VALUES (?, ?, ?, ?)')
            ->execute([$id, $from, $to, substr($reason, 0, 255)]);
    }

    private function validateSession(string $session): void
    {
        if (!preg_match('/^[a-f0-9]{64}$/D', $session)) {
            throw new BookingError('invalid_session', 'Start a guest session before booking.', 403);
        }
    }

    private function confirmationCode(int $attempt): string
    {
        if ($this->testCodeGenerator !== null) {
            $code = ($this->testCodeGenerator)($attempt);
        } else {
            $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            $code = 'LUM-';
            for ($i = 0; $i < 6; $i++) {
                $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
        }
        if (!is_string($code) || !preg_match('/^LUM-[A-Z0-9]{6}$/D', $code)) {
            throw new RuntimeException('Invalid generated confirmation code');
        }
        return $code;
    }

    private function uuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        $hex = bin2hex($bytes);
        return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
    }
}
