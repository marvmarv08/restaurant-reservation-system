<?php
declare(strict_types=1);

use App\Service\BookingClock;
use App\Service\BookingService;
use App\Service\ManagementService;

function createManaged(BookingHarness $t, string $table = 'C1', int $party = 2): array
{
    $hold = $t->hold($table, '17:30', $party);
    $t->service->confirm($hold['hold_token'], $t->guest, $t->owner);
    $service = new ManagementService($t->pdo, new BookingClock($t->pdo));
    $path = $service->issueForHold($hold['hold_token'], $t->owner, hash('sha256', 'test-session-seed'));
    parse_str(substr($path, strpos($path, '#') + 1), $parts);
    $parts['service'] = $service;
    $parts['hold'] = $hold;
    $parts['id'] = (int) $t->pdo->query('SELECT id FROM reservations ORDER BY id DESC LIMIT 1')->fetchColumn();
    return $parts;
}

$tests = new BookingHarness();
$tests->test('R18 management uses a hash-only capability bound to one booking', function (BookingHarness $t): void {
    $a = createManaged($t);
    $b = createManaged($t, 'C2');
    $stored = (string) $t->pdo->query('SELECT token_hash FROM reservation_manage_tokens ORDER BY reservation_id LIMIT 1')->fetchColumn();
    $t->assert($stored === hash('sha256', $a['token']) && $stored !== $a['token']);
    $t->expectError('manage_link_invalid', fn () => $a['service']->read($a['code'], str_repeat('0', 64)));
    $t->expectError('manage_link_invalid', fn () => $a['service']->read($b['code'], $a['token']));
    $t->expectError('manage_link_invalid', fn () => $a['service']->cancel($b['code'], $a['token'], 1));
    $t->assert($t->count('reservations') === 2);
});
$tests->test('Management expiry and revocation deny access without mutation', function (BookingHarness $t): void {
    $a = createManaged($t);
    $t->pdo->exec('UPDATE reservation_manage_tokens SET expires_at = NOW()');
    $t->expectError('manage_link_invalid', fn () => $a['service']->read($a['code'], $a['token']));
    $t->pdo->exec('UPDATE reservation_manage_tokens SET expires_at = DATE_ADD(NOW(), INTERVAL 1 DAY), revoked_at = NOW()');
    $t->expectError('manage_link_invalid', fn () => $a['service']->cancel($a['code'], $a['token'], 1));
    $t->assert((string) $t->pdo->query('SELECT status FROM reservations LIMIT 1')->fetchColumn() === 'confirmed');
});
$tests->test('Confirmation and hold inspection reproduce the same private link', function (BookingHarness $t): void {
    $a = createManaged($t);
    $b = $a['service']->issueForHold($a['hold']['hold_token'], $t->owner, hash('sha256', 'test-session-seed'));
    $t->assert(str_contains($b, $a['token']) && $t->count('reservation_manage_tokens') === 1);
    $peek = $t->service->inspectHold($a['hold']['hold_token'], $t->owner);
    $t->assert($peek['status'] === 'consumed' && $peek['booking']['code'] === $a['code']);
    $t->expectError('hold_not_found', fn () => $t->service->inspectHold($a['hold']['hold_token'], hash('sha256', 'other')));
});
$tests->test('R21 exactly two hours permits cancellation, retains history, frees table', function (BookingHarness $t): void {
    $a = createManaged($t);
    $now = new DateTimeImmutable($t->date . ' 15:30:00', new DateTimeZone('Asia/Manila'));
    $service = new ManagementService($t->pdo, new BookingClock($t->pdo, static fn (): DateTimeImmutable => $now));
    $t->assert($service->read($a['code'], $a['token'])['can_manage']);
    $cancelled = $service->cancel($a['code'], $a['token'], 1);
    $t->assert($cancelled['status'] === 'cancelled' && !$cancelled['can_manage']);
    $t->assert($service->cancel($a['code'], $a['token'], 1)['status'] === 'cancelled');
    $t->hold();
    $t->assert($t->count('reservation_status_history') === 2 && $t->count('reservation_tables') === 1);
});
$tests->test('R21 119 minutes refuses both cancellation and a cutoff-bypass modification', function (BookingHarness $t): void {
    $a = createManaged($t);
    $now = new DateTimeImmutable($t->date . ' 15:31:00', new DateTimeZone('Asia/Manila'));
    $service = new ManagementService($t->pdo, new BookingClock($t->pdo, static fn (): DateTimeImmutable => $now));
    $t->assert(!$service->read($a['code'], $a['token'])['can_manage']);
    $t->expectError('cutoff_passed', fn () => $service->cancel($a['code'], $a['token'], 1));
    $t->expectError('cutoff_passed', fn () => $service->modify($a['code'], $a['token'], 1, $t->date, '20:30', 2, 'common', null, null, ''));
    $t->assert((string) $t->pdo->query('SELECT status FROM reservations LIMIT 1')->fetchColumn() === 'confirmed');
});
$tests->test('Same-table modification excludes itself, keeps code, and archives old time', function (BookingHarness $t): void {
    $a = createManaged($t);
    $t->setting('max_reservations_per_slot', '1');
    $available = $a['service']->search($a['code'], $a['token'], $t->date, 2, 'common');
    $t->assert(in_array('17:30', array_column($available['slots'], 'time'), true));
    $changed = $a['service']->modify($a['code'], $a['token'], 1, $t->date, '20:30', 2, 'common', 'table', (int) $t->tables['C1']['id'], 'Quiet corner');
    $t->assert($changed['code'] === $a['code'] && $changed['version'] === 2 && $changed['starts_at'] === $t->date . ' 20:30:00');
    $history = json_decode((string) $t->pdo->query('SELECT before_json FROM reservation_change_history LIMIT 1')->fetchColumn(), true);
    $t->assert($history['starts_at'] === $t->date . ' 17:30:00');
    $t->hold();
});
$tests->test('Different-table modification releases old inventory and saves the new party', function (BookingHarness $t): void {
    $a = createManaged($t);
    $changed = $a['service']->modify($a['code'], $a['token'], 1, $t->date, '19:00', 4, 'common', 'table', (int) $t->tables['C3']['id'], 'Allergy notes');
    $t->assert($changed['party_size'] === 4 && (int) $changed['tables'][0]['id'] === (int) $t->tables['C3']['id']);
    $t->hold();
    $t->assert((int) $t->pdo->query('SELECT COUNT(*) FROM reservation_tables WHERE released_at IS NOT NULL')->fetchColumn() === 1);
    $t->assert($t->count('reservation_change_history') === 1);
});
$tests->test('Failed replacement keeps original booking and assignments unchanged', function (BookingHarness $t): void {
    $a = createManaged($t);
    $busy = $t->hold('C2');
    $t->service->confirm($busy['hold_token'], $t->guest, $t->owner);
    $t->expectError('unavailable', fn () => $a['service']->modify($a['code'], $a['token'], 1, $t->date, '17:30', 2, 'common', 'table', (int) $t->tables['C2']['id'], ''));
    $current = $a['service']->read($a['code'], $a['token']);
    $t->assert($current['version'] === 1 && (int) $current['tables'][0]['id'] === (int) $t->tables['C1']['id']);
    $t->assert($t->count('reservation_change_history') === 0);
});
$tests->test('Joined modification releases both old members and recalculates approval', function (BookingHarness $t): void {
    $t->pdo->exec("UPDATE `tables` SET is_active = 0 WHERE code = 'G3'");
    $hold = $t->service->hold($t->date, '17:30', 16, 'group', $t->owner);
    $booking = $t->service->confirm($hold['hold_token'], $t->guest, $t->owner);
    $service = new ManagementService($t->pdo, new BookingClock($t->pdo));
    $path = $service->issueForHold($hold['hold_token'], $t->owner, hash('sha256', 'test-session-seed'));
    parse_str(substr($path, strpos($path, '#') + 1), $parts);
    $changed = $service->modify($booking['code'], $parts['token'], 1, $t->date, '20:30', 6, 'group', 'table', (int) $t->tables['G1']['id'], '');
    $t->assert($changed['status'] === 'confirmed' && count($changed['tables']) === 1);
    $t->hold('G2', '17:30', 6);
    $before = json_decode((string) $t->pdo->query('SELECT before_json FROM reservation_change_history LIMIT 1')->fetchColumn(), true);
    $t->assert(count($before['table_ids']) === 2);
});
$tests->test('Stale version cannot overwrite a change from another tab', function (BookingHarness $t): void {
    $a = createManaged($t);
    $a['service']->modify($a['code'], $a['token'], 1, $t->date, '20:30', 2, 'common', null, null, '');
    $t->expectError('booking_changed', fn () => $a['service']->modify($a['code'], $a['token'], 1, $t->date, '19:00', 2, 'common', null, null, ''));
    $t->expectError('booking_changed', fn () => $a['service']->cancel($a['code'], $a['token'], 1));
    $t->assert($a['service']->read($a['code'], $a['token'])['starts_at'] === $t->date . ' 20:30:00');
});
$tests->test('Moving to another date refreshes private-link expiry and current policy', function (BookingHarness $t): void {
    $a = createManaged($t);
    $next = (new DateTimeImmutable($t->date))->modify('+1 day')->format('Y-m-d');
    $changed = $a['service']->modify($a['code'], $a['token'], 1, $next, '17:30', 2, 'common', null, null, '');
    $t->assert(substr($changed['link_expires_at'], 0, 10) === (new DateTimeImmutable($next))->modify('+1 day')->format('Y-m-d'));
    $t->expectError('party_out_of_range', fn () => $a['service']->modify($a['code'], $a['token'], 2, $next, '17:30', 17, 'group', null, null, ''));
});
$tests->test('Concurrent modifications compete for one replacement table', function (BookingHarness $t): void {
    $a = createManaged($t);
    $b = createManaged($t, 'C2');
    $job = ['op' => 'modify', 'date' => $t->date, 'time' => '20:30', 'party' => 4, 'room' => 'common',
        'kind' => 'table', 'id' => (int) $t->tables['C3']['id'], 'version' => 1];
    $results = $t->finishWorkers($t->startWorkers([
        $job + ['code' => $a['code'], 'token' => $a['token']], $job + ['code' => $b['code'], 'token' => $b['token']],
    ]));
    $t->assert(count(array_filter($results, static fn (array $r): bool => $r['ok'])) === 1);
    $t->assert($t->count('reservations') === 2 && $t->count('reservation_change_history') === 1);
});
$tests->test('Two tabs modifying one version produce one change', function (BookingHarness $t): void {
    $a = createManaged($t);
    $job = ['op' => 'modify', 'code' => $a['code'], 'token' => $a['token'], 'date' => $t->date,
        'party' => 2, 'room' => 'common', 'version' => 1];
    $results = $t->finishWorkers($t->startWorkers([$job + ['time' => '20:30'], $job + ['time' => '19:00']]));
    $t->assert(count(array_filter($results, static fn (array $r): bool => $r['ok'])) === 1 && $t->count('reservation_change_history') === 1);
});
$tests->test('A link expiring while cancellation waits for a lock is rejected', function (BookingHarness $t): void {
    $a = createManaged($t);
    $t->pdo->exec('UPDATE reservation_manage_tokens SET expires_at = DATE_ADD(NOW(), INTERVAL 1 SECOND)');
    $t->pdo->beginTransaction();
    $t->pdo->prepare('SELECT service_date FROM booking_days WHERE service_date = ? FOR UPDATE')->execute([$t->date]);
    $workers = $t->startWorkers([['op' => 'cancel', 'code' => $a['code'], 'token' => $a['token'], 'version' => 1]]);
    usleep(2200000);
    $t->pdo->commit();
    $results = $t->finishWorkers($workers);
    $t->assert(!$results[0]['ok'] && $results[0]['error'] === 'manage_link_invalid');
    $t->assert((string) $t->pdo->query('SELECT status FROM reservations LIMIT 1')->fetchColumn() === 'confirmed');
});

$tests->finish();
