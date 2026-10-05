<?php
declare(strict_types=1);

use App\Service\BookingClock;
use App\Service\BookingPolicy;
use App\Service\BookingService;

$tests = new BookingHarness();

$tests->test('R01 Monday closure and outside service hours', function (BookingHarness $t): void {
    $monday = (new DateTimeImmutable($t->date))->modify('next monday')->format('Y-m-d');
    $t->assert($t->availability->search($monday, 2)['slots'] === []);
    $t->expectError('unavailable', fn () => $t->hold('C1', '17:15'));
    $t->expectError('unavailable', fn () => $t->hold('C1', '22:00'));
});
$tests->test('R02 59-minute lead rejected, exact 60 accepted', function (BookingHarness $t): void {
    [$service] = $t->fixed($t->date . ' 16:31:00');
    $t->expectError('unavailable', fn () => $service->hold($t->date, '17:30', 2, 'common', $t->owner));
    [$service] = $t->fixed($t->date . ' 16:30:00');
    $hold = $service->hold($t->date, '17:30', 2, 'common', $t->owner);
    $t->assert($hold['expires_at'] === $t->date . ' 16:40:00');
});
$tests->test('R03 advance window is inclusive at 60 calendar days', function (BookingHarness $t): void {
    $policy = new BookingPolicy($t->pdo);
    $now = (new BookingClock($t->pdo))->now();
    $policy->date($now->modify('+60 days')->format('Y-m-d'), $now);
    $t->expectError('date_out_of_range', fn () => $policy->date($now->modify('+61 days')->format('Y-m-d'), $now));
    $t->expectError('invalid_date', fn () => $policy->date('2026-02-30', $now));
});
$tests->test('R04 turn plus reset must fit before closing', function (BookingHarness $t): void {
    $t->hold('C1', '21:45', 2);
    $t->expectError('unavailable', fn () => $t->hold('T5', '21:45', 6));
    $t->expectError('unavailable', fn () => $t->hold('C2', '17:37', 2));
});
$tests->test('R05 each room and physical table must fit the party', function (BookingHarness $t): void {
    $t->expectError('unavailable', fn () => $t->service->hold($t->date, '17:30', 1, 'vip', $t->owner));
    $t->expectError('unavailable', fn () => $t->service->hold($t->date, '17:30', 5, 'common', $t->owner));
    $t->expectError('unavailable', fn () => $t->hold('V3', '17:30', 6));
});
$tests->test('R06 scoped blackout leaves unaffected rooms available', function (BookingHarness $t): void {
    $t->pdo->prepare("INSERT INTO blackout_dates (starts_at, ends_at, scope, scope_id, reason)
        VALUES (?, ?, 'room_type', 4, 'Test terrace closure')")
        ->execute([$t->date . ' 17:30:00', $t->date . ' 23:30:00']);
    $types = array_unique(array_merge(...array_map(static fn (array $slot): array => array_column($slot['options'], 'room_type'),
        $t->availability->search($t->date, 2)['slots'])));
    $t->assert(!in_array('terrace', $types, true) && in_array('common', $types, true));
});
$tests->test('R07 venue blackout blocks every room', function (BookingHarness $t): void {
    $t->pdo->prepare("INSERT INTO blackout_dates (starts_at, ends_at, scope, reason) VALUES (?, ?, 'venue', 'Test buyout')")
        ->execute([$t->date . ' 17:00:00', $t->date . ' 23:59:00']);
    $t->assert($t->availability->search($t->date, 2)['slots'] === []);
    $t->expectError('unavailable', fn () => $t->hold());
});
$tests->test('Room and table blackouts include the full blocked interval', function (BookingHarness $t): void {
    $t->pdo->prepare("INSERT INTO blackout_dates (starts_at, ends_at, scope, scope_id, reason) VALUES (?, ?, 'table', ?, 'Reset blackout')")
        ->execute([$t->date . ' 18:50:00', $t->date . ' 19:10:00', $t->tables['C1']['id']]);
    $t->expectError('unavailable', fn () => $t->hold());
    $t->hold('C2');
    $t->pdo->prepare("INSERT INTO blackout_dates (starts_at, ends_at, scope, scope_id, reason) VALUES (?, ?, 'room', 2, 'Room closure')")
        ->execute([$t->date . ' 20:00:00', $t->date . ' 23:30:00']);
    $t->expectError('unavailable', fn () => $t->hold('C3', '20:30', 4));
});
$tests->test('Informational blackout does not consume inventory', function (BookingHarness $t): void {
    $t->pdo->prepare("INSERT INTO blackout_dates (starts_at, ends_at, scope, reason, blocks_booking) VALUES (?, ?, 'venue', 'Live music', 0)")
        ->execute([$t->date . ' 17:00:00', $t->date . ' 23:30:00']);
    $t->hold();
});
$tests->test('R08 reservation pacing includes active holds and conversion counts once', function (BookingHarness $t): void {
    $t->setting('max_reservations_per_slot', '1');
    $hold = $t->hold();
    $t->expectError('unavailable', fn () => $t->hold('C2'));
    $booking = $t->service->confirm($hold['hold_token'], $t->guest, $t->owner);
    $t->assert($booking['status'] === 'confirmed');
    $t->expectError('unavailable', fn () => $t->hold('C2'));
});
$tests->test('R08 cover pacing and service-window cap', function (BookingHarness $t): void {
    $t->hold('G3', '17:30', 16);
    $t->hold('V2', '17:30', 10);
    $t->hold('G1', '17:30', 10);
    $t->expectError('unavailable', fn () => $t->hold('T5', '17:30', 6));
    $t->pdo->exec('UPDATE pacing_rules SET max_covers = 3');
    $t->expectError('unavailable', fn () => $t->hold('C3', '20:30', 4));
});
$tests->test('Different-start overlap rejected; touching half-open intervals accepted', function (BookingHarness $t): void {
    $hold = $t->hold();
    $t->service->confirm($hold['hold_token'], $t->guest, $t->owner);
    $t->expectError('unavailable', fn () => $t->hold('C1', '18:45'));
    $t->hold('C1', '19:00');
});
$tests->test('R10 expiry exactly at deadline rejects confirmation and frees inventory', function (BookingHarness $t): void {
    $time = new DateTimeImmutable($t->date . ' 12:00:00', new DateTimeZone('Asia/Manila'));
    $clock = new BookingClock($t->pdo, static function () use (&$time): DateTimeImmutable { return $time; });
    $service = new BookingService($t->pdo, $clock);
    $hold = $service->hold($t->date, '17:30', 2, 'common', $t->owner, 'table', (int) $t->tables['C1']['id']);
    $time = $time->modify('+600 seconds');
    $t->expectError('hold_expired', fn () => $service->confirm($hold['hold_token'], $t->guest, $t->owner));
    $service->hold($t->date, '17:30', 2, 'common', $t->owner, 'table', (int) $t->tables['C1']['id']);
    $t->assert($service->expireHolds() === 1 && $t->count('reservations') === 0);
});
$tests->test('Active hold preserves the lead-time form-completion window', function (BookingHarness $t): void {
    $time = new DateTimeImmutable($t->date . ' 16:30:00', new DateTimeZone('Asia/Manila'));
    $service = new BookingService($t->pdo, new BookingClock($t->pdo, static function () use (&$time): DateTimeImmutable { return $time; }));
    $hold = $service->hold($t->date, '17:30', 2, 'common', $t->owner);
    $time = $time->modify('+5 minutes');
    $t->assert($service->confirm($hold['hold_token'], $t->guest, $t->owner)['status'] === 'confirmed');
});
$tests->test('R11 joined hold and booking protect every member', function (BookingHarness $t): void {
    $t->pdo->exec("UPDATE `tables` SET is_active = 0 WHERE code = 'G3'");
    $hold = $t->service->hold($t->date, '17:30', 16, 'group', $t->owner);
    $t->assert($hold['option']['kind'] === 'group' && count($hold['option']['table_ids']) === 2);
    $t->assert($t->count('hold_tables') === 2);
    $t->expectError('unavailable', fn () => $t->hold('G1', '17:30', 6));
    $booking = $t->service->confirm($hold['hold_token'], $t->guest, $t->owner);
    $t->assert($booking['status'] === 'pending' && $booking['approval_state'] === 'awaiting');
    $t->assert($t->count('reservation_tables') === 2);
});
$tests->test('R12 single table preferred; held group survives a newly freed single', function (BookingHarness $t): void {
    $single = $t->service->hold($t->date, '17:30', 16, 'group', $t->owner);
    $t->assert($single['option']['kind'] === 'table');
    $joined = $t->service->hold($t->date, '17:30', 16, 'group', $t->owner);
    $t->assert($joined['option']['kind'] === 'group');
    $t->service->release($single['hold_token'], $t->owner);
    $t->service->confirm($joined['hold_token'], $t->guest, $t->owner);
});
$tests->test('R13 cancellation releases slots and retains assignments/history', function (BookingHarness $t): void {
    $hold = $t->hold();
    $booking = $t->service->confirm($hold['hold_token'], $t->guest, $t->owner);
    $id = (int) $t->pdo->query('SELECT id FROM reservations LIMIT 1')->fetchColumn();
    $t->service->cancel($id, 'Test cancellation');
    $replacement = $t->hold();
    $t->service->confirm($replacement['hold_token'], $t->guest, $t->owner);
    $t->assert($t->count('reservations') === 2 && $t->count('reservation_tables') === 2 && $t->count('reservation_status_history') === 3);
    $t->assert((int) $t->pdo->query('SELECT COUNT(*) FROM reservation_tables WHERE released_at IS NOT NULL')->fetchColumn() === 1);
});
$tests->test('Joined cancellation releases both members without losing history', function (BookingHarness $t): void {
    $t->pdo->exec("UPDATE `tables` SET is_active = 0 WHERE code = 'G3'");
    $hold = $t->service->hold($t->date, '17:30', 16, 'group', $t->owner);
    $t->service->confirm($hold['hold_token'], $t->guest, $t->owner);
    $id = (int) $t->pdo->query('SELECT id FROM reservations LIMIT 1')->fetchColumn();
    $t->service->cancel($id, 'Test joined cancellation');
    $t->hold('G1', '17:30', 6);
    $t->assert((int) $t->pdo->query('SELECT COUNT(*) FROM reservation_tables WHERE released_at IS NOT NULL')->fetchColumn() === 2);
});
$tests->test('R14 confirmation-code collision retries safely', function (BookingHarness $t): void {
    $first = new BookingService($t->pdo, new BookingClock($t->pdo), static fn (): string => 'LUM-AAAAAA');
    $first->confirm($t->hold()['hold_token'], $t->guest, $t->owner);
    $second = new BookingService($t->pdo, new BookingClock($t->pdo), static fn (int $attempt): string => $attempt === 0 ? 'LUM-AAAAAA' : 'LUM-BBBBBB');
    $booking = $second->confirm($t->hold('C2')['hold_token'], $t->guest, $t->owner);
    $t->assert($booking['code'] === 'LUM-BBBBBB' && $t->count('reservations') === 2);
});
$tests->test('Exhausted code collision rolls back guest and booking writes', function (BookingHarness $t): void {
    $service = new BookingService($t->pdo, new BookingClock($t->pdo), static fn (): string => 'LUM-AAAAAA');
    $service->confirm($t->hold()['hold_token'], $t->guest, $t->owner);
    $hold = $t->hold('C2');
    $t->expectError('booking_conflict', fn () => $service->confirm($hold['hold_token'], $t->guest, $t->owner));
    $t->assert($t->count('guests') === 1 && $t->count('reservations') === 1 && $t->count('hold_reservations') === 1);
});
$tests->test('Confirmation retries return one persisted booking and one notification', function (BookingHarness $t): void {
    $hold = $t->hold();
    $a = $t->service->confirm($hold['hold_token'], $t->guest, $t->owner);
    $b = $t->service->confirm($hold['hold_token'], $t->guest, $t->owner);
    $t->assert($a['code'] === $b['code'] && $a['created'] && !$b['created']);
    $t->assert($t->count('reservations') === 1 && $t->count('outbox') === 1 && $t->count('reservation_status_history') === 1);
});
$tests->test('Guest session ownership enforced on confirm and release', function (BookingHarness $t): void {
    $hold = $t->hold();
    $other = hash('sha256', 'other-owner');
    $t->expectError('hold_not_found', fn () => $t->service->confirm($hold['hold_token'], $t->guest, $other));
    $t->expectError('hold_not_found', fn () => $t->service->release($hold['hold_token'], $other));
    $t->expectError('invalid_guest', fn () => $t->service->confirm($hold['hold_token'], ['full_name' => '', 'phone' => 'x'], $t->owner));
    $t->assert($t->count('reservations') === 0 && $t->count('guests') === 0);
    $t->service->release($hold['hold_token'], $t->owner);
    $t->hold();
});
$tests->test('R17 current buffer and opening-hours settings rechecked', function (BookingHarness $t): void {
    $a = $t->hold();
    $t->hold('C1', '19:00');
    $t->setting('buffer_min', '30');
    $t->expectError('unavailable', fn () => $t->service->confirm($a['hold_token'], $t->guest, $t->owner));
    $t->setting('buffer_min', '15');
    $t->pdo->exec('UPDATE opening_hours SET is_closed = 1');
    $t->expectError('unavailable', fn () => $t->service->confirm($a['hold_token'], $t->guest, $t->owner));
    $t->assert($t->count('guests') === 0);
});
$tests->test('R17 current lead and advance settings rechecked at confirmation', function (BookingHarness $t): void {
    $hold = $t->hold();
    $t->setting('min_lead_time_min', '40000');
    $t->expectError('unavailable', fn () => $t->service->confirm($hold['hold_token'], $t->guest, $t->owner));
    $t->setting('min_lead_time_min', '60');
    $t->setting('max_lead_time_days', '1');
    $t->expectError('date_out_of_range', fn () => $t->service->confirm($hold['hold_token'], $t->guest, $t->owner));
    $t->assert($t->count('reservations') === 0);
});
$tests->test('Room-specific closure overrides global hours for Any room', function (BookingHarness $t): void {
    $weekday = (int) (new DateTimeImmutable($t->date))->format('w');
    $t->pdo->prepare("INSERT INTO opening_hours (room_type_id, weekday, open_time, close_time, is_closed)
        VALUES (4, ?, '17:30:00', '23:30:00', 1)")->execute([$weekday]);
    try {
        $slots = $t->availability->search($t->date, 2)['slots'];
        $types = array_unique(array_merge(...array_map(static fn (array $slot): array => array_column($slot['options'], 'room_type'), $slots)));
        $t->assert(!in_array('terrace', $types, true) && in_array('common', $types, true));
    } finally {
        $t->pdo->exec('DELETE FROM opening_hours WHERE room_type_id = 4');
    }
});
$tests->test('R17 changed grid, turn time and TTL apply to new holds', function (BookingHarness $t): void {
    $t->setting('slot_interval_min', '30');
    $t->expectError('unavailable', fn () => $t->hold('C1', '17:45'));
    $t->setting('hold_ttl_sec', '300');
    $t->pdo->exec('UPDATE turn_times SET turn_time_min = 90 WHERE party_min = 1');
    $hold = $t->hold();
    $t->assert($hold['option']['ends_at'] === $t->date . ' 19:00:00');
    $query = $t->pdo->query('SELECT TIMESTAMPDIFF(SECOND, created_at, expires_at) FROM holds LIMIT 1');
    $t->assert((int) $query->fetchColumn() === 300);
});
$tests->test('R19 large party needs approval; party above 16 rejected', function (BookingHarness $t): void {
    $hold = $t->hold('G3', '17:30', 13);
    $booking = $t->service->confirm($hold['hold_token'], $t->guest, $t->owner);
    $t->assert($booking['status'] === 'pending' && $booking['approval_state'] === 'awaiting');
    $t->expectError('party_out_of_range', fn () => $t->service->hold($t->date, '20:30', 17, 'group', $t->owner));
});
$tests->test('R20 VIP 48 hours and Group 24 hours notice boundaries', function (BookingHarness $t): void {
    $start = new DateTimeImmutable($t->date . ' 17:30:00', new DateTimeZone('Asia/Manila'));
    foreach ([['vip', 2, 48], ['group', 6, 24]] as [$room, $party, $hours]) {
        [$service] = $t->fixed($start->modify('-' . ($hours - 1) . ' hours')->format('Y-m-d H:i:s'));
        $t->expectError('unavailable', fn () => $service->hold($t->date, '17:30', $party, $room, $t->owner));
        [$service] = $t->fixed($start->modify('-' . $hours . ' hours')->format('Y-m-d H:i:s'));
        $service->hold($t->date, '17:30', $party, $room, $t->owner);
    }
});
$tests->test('Joined membership edits cannot silently change the confirmed assignment', function (BookingHarness $t): void {
    $t->pdo->exec("UPDATE `tables` SET is_active = 0 WHERE code = 'G3'");
    $hold = $t->service->hold($t->date, '17:30', 16, 'group', $t->owner);
    $t->pdo->prepare('DELETE FROM table_group_members WHERE table_id = ?')->execute([$t->tables['G2']['id']]);
    $t->expectError('unavailable', fn () => $t->service->confirm($hold['hold_token'], $t->guest, $t->owner));
    $t->assert($t->count('reservations') === 0);
});
$tests->test('R09 independent clients race for the final VIP table', function (BookingHarness $t): void {
    for ($round = 0; $round < 3; $round++) {
        $t->reset();
        $t->pdo->exec("UPDATE `tables` SET is_active = (code = 'V3')");
        $job = ['op' => 'hold', 'date' => $t->date, 'time' => '17:30', 'party' => 2, 'room' => 'vip'];
        $results = $t->finishWorkers($t->startWorkers([
            $job + ['owner' => hash('sha256', 'race-a')], $job + ['owner' => hash('sha256', 'race-b')],
        ]));
        $t->assert(count(array_filter($results, static fn (array $r): bool => $r['ok'])) === 1 && $t->count('holds') === 1);
    }
});
$tests->test('Different-start overlapping requests race for one physical table', function (BookingHarness $t): void {
    $t->pdo->exec("UPDATE `tables` SET is_active = (code = 'C1')");
    $job = ['op' => 'hold', 'date' => $t->date, 'party' => 2, 'room' => 'common'];
    $results = $t->finishWorkers($t->startWorkers([
        $job + ['time' => '17:30', 'owner' => hash('sha256', 'race-a')],
        $job + ['time' => '17:45', 'owner' => hash('sha256', 'race-b')],
    ]));
    $t->assert(count(array_filter($results, static fn (array $r): bool => $r['ok'])) === 1 && $t->count('holds') === 1);
});
$tests->test('Different physical tables compete for one pacing allowance', function (BookingHarness $t): void {
    $t->setting('max_reservations_per_slot', '1');
    $job = ['op' => 'hold', 'date' => $t->date, 'time' => '17:30', 'party' => 2, 'room' => 'common', 'kind' => 'table'];
    $results = $t->finishWorkers($t->startWorkers([
        $job + ['id' => (int) $t->tables['C1']['id'], 'owner' => hash('sha256', 'race-a')],
        $job + ['id' => (int) $t->tables['C2']['id'], 'owner' => hash('sha256', 'race-b')],
    ]));
    $t->assert(count(array_filter($results, static fn (array $r): bool => $r['ok'])) === 1 && $t->count('holds') === 1);
});
$tests->test('Joined group and one member compete atomically', function (BookingHarness $t): void {
    $t->pdo->exec("UPDATE `tables` SET is_active = 0 WHERE code = 'G3'");
    $job = ['op' => 'hold', 'date' => $t->date, 'time' => '17:30', 'room' => 'group'];
    $results = $t->finishWorkers($t->startWorkers([
        $job + ['party' => 16, 'owner' => hash('sha256', 'race-a')],
        $job + ['party' => 6, 'kind' => 'table', 'id' => (int) $t->tables['G1']['id'], 'owner' => hash('sha256', 'race-b')],
    ]));
    $t->assert(count(array_filter($results, static fn (array $r): bool => $r['ok'])) === 1 && $t->count('holds') === 1);
});
$tests->test('Simultaneous confirmations create exactly one booking', function (BookingHarness $t): void {
    $hold = $t->hold();
    $job = ['op' => 'confirm', 'token' => $hold['hold_token'], 'owner' => $t->owner];
    $results = $t->finishWorkers($t->startWorkers([$job, $job]));
    $t->assert($results[0]['ok'] && $results[1]['ok'] && $results[0]['code'] === $results[1]['code']);
    $t->assert($t->count('reservations') === 1 && $t->count('guests') === 1 && $t->count('hold_reservations') === 1);
});
$tests->test('Hold expiring while waiting for a database lock is rejected', function (BookingHarness $t): void {
    $hold = $t->hold();
    $t->pdo->exec("UPDATE holds SET expires_at = DATE_ADD(NOW(), INTERVAL 1 SECOND)");
    $t->pdo->beginTransaction();
    $t->pdo->prepare('SELECT service_date FROM booking_days WHERE service_date = ? FOR UPDATE')->execute([$t->date]);
    $workers = $t->startWorkers([['op' => 'confirm', 'token' => $hold['hold_token'], 'owner' => $t->owner]]);
    usleep(2200000);
    $t->pdo->commit();
    $results = $t->finishWorkers($workers);
    $t->assert(!$results[0]['ok'] && $results[0]['error'] === 'hold_expired' && $t->count('reservations') === 0);
});

$tests->test('Manual demo seed respects engine-held inventory and pacing', function (BookingHarness $t): void {
    $now = (new BookingClock($t->pdo))->now();
    $date = null;
    for ($offset = 3; $offset <= 10; $offset++) {
        $day = $now->modify('+' . $offset . ' days');
        $key = 'demo-' . $day->format('Ymd') . '-20:30-C1';
        if ($day->format('N') !== '1' && (int) sprintf('%u', crc32($key)) % 5 === 0) {
            $date = $day->format('Y-m-d');
            break;
        }
    }
    $t->assert($date !== null, 'Need a deterministic seed candidate');
    $t->setting('max_reservations_per_slot', '1');
    $t->service->hold($date, '20:45', 2, 'common', $t->owner, 'table', (int) $t->tables['C1']['id']);
    $t->service->hold($date, '17:30', 2, 'common', $t->owner, 'table', (int) $t->tables['C2']['id']);
    $process = proc_open([PHP_BINARY, dirname(__DIR__) . '/bin/seed.php'],
        [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
    fclose($pipes[0]);
    $output = stream_get_contents($pipes[1]);
    $errors = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $t->assert(proc_close($process) === 0 && $errors === '', 'Seeder failed: ' . $errors . $output);
    $query = $t->pdo->prepare('SELECT COUNT(*) FROM reservations WHERE seed_key = ?');
    $query->execute(['demo-' . str_replace('-', '', $date) . '-20:30-C1']);
    $t->assert((int) $query->fetchColumn() === 0, 'Seeder overlapped held inventory');
    $query = $t->pdo->prepare("SELECT COUNT(*) FROM reservations WHERE starts_at = ? AND status IN ('pending','confirmed','seated')");
    $query->execute([$date . ' 17:30:00']);
    $t->assert((int) $query->fetchColumn() === 0, 'Seeder exceeded pacing reserved by a live hold');
});

$tests->finish();
