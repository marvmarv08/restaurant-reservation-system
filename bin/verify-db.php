<?php
declare(strict_types=1);

require dirname(__DIR__) . '/src/Core/Database.php';
$pdo = \App\Core\Database::connect(require dirname(__DIR__) . '/config/database.php');

function countRows(PDO $pdo, string $sql): int
{
    return (int) $pdo->query($sql)->fetchColumn();
}

function expectMysqlError(callable $action, int $number, string $label): void
{
    try {
        $action();
    } catch (PDOException $error) {
        if ((int) ($error->errorInfo[1] ?? 0) === $number) {
            return;
        }
        throw $error;
    }
    throw new RuntimeException("Expected MySQL error {$number} for {$label}");
}

function cloneReservation(PDO $pdo, int $sourceId, ?int $guestId = null, ?string $code = null): int
{
    $code ??= 'LUM-' . strtoupper(bin2hex(random_bytes(3)));
    $sql = 'INSERT INTO reservations (code, guest_id, room_type_id, party_size, starts_at,
        ends_at, blocks_until, turn_time_min, status)
        SELECT ?, ' . ($guestId === null ? 'guest_id' : '?') . ', room_type_id, party_size,
        starts_at, ends_at, blocks_until, turn_time_min, \'confirmed\'
        FROM reservations WHERE id = ?';
    $params = $guestId === null ? [$code, $sourceId] : [$code, $guestId, $sourceId];
    $pdo->prepare($sql)->execute($params);
    return (int) $pdo->lastInsertId();
}

if (countRows($pdo, 'SELECT COUNT(*) FROM `tables`') !== 25
    || countRows($pdo, 'SELECT COUNT(*) FROM menu_items') !== 36
    || countRows($pdo, 'SELECT COUNT(*) FROM reservations') < 100
    || countRows($pdo, 'SELECT COUNT(*) FROM information_schema.referential_constraints WHERE constraint_schema = DATABASE()') < 25) {
    throw new RuntimeException('Expected Phase 2 seed counts or foreign keys are missing');
}
if (countRows($pdo, 'SELECT COUNT(*) FROM reservation_tables rt JOIN reservations r ON r.id = rt.reservation_id WHERE r.table_group_id IS NOT NULL') !== 2) {
    throw new RuntimeException('The sample joined booking does not occupy both physical tables');
}
if (countRows($pdo, "SELECT COUNT(*) FROM opening_hours WHERE weekday = 1 AND is_closed = 1") !== 1) {
    throw new RuntimeException('Monday closure is missing');
}
$maxBookings = countRows($pdo, "SELECT CAST(svalue AS UNSIGNED) FROM settings WHERE skey = 'max_reservations_per_slot'");
$maxCovers = countRows($pdo, "SELECT CAST(svalue AS UNSIGNED) FROM settings WHERE skey = 'max_covers_per_slot'");
if (countRows($pdo, "SELECT COUNT(*) FROM (SELECT starts_at FROM reservations
    WHERE status IN ('pending','confirmed','seated') GROUP BY starts_at
    HAVING COUNT(*) > {$maxBookings} OR SUM(party_size) > {$maxCovers}) AS overbooked") !== 0) {
    throw new RuntimeException('The demo seed exceeds a pacing cap');
}
if (countRows($pdo, "SELECT COUNT(*) FROM reservations r JOIN reservation_tables rt ON rt.reservation_id = r.id
    JOIN reservations other ON other.id > r.id JOIN reservation_tables ort ON ort.reservation_id = other.id
      AND ort.table_id = rt.table_id
    WHERE rt.released_at IS NULL AND ort.released_at IS NULL
      AND r.starts_at < other.blocks_until AND r.blocks_until > other.starts_at") !== 0) {
    throw new RuntimeException('The demo seed contains overlapping live assignments');
}

$active = $pdo->query("SELECT r.id, rt.table_id, rt.slot_start FROM reservations r
    JOIN reservation_tables rt ON rt.reservation_id = r.id
    WHERE rt.released_at IS NULL LIMIT 1")->fetch();
$cancelled = $pdo->query("SELECT r.id, rt.table_id, rt.slot_start FROM reservations r
    JOIN reservation_tables rt ON rt.reservation_id = r.id
    WHERE r.status = 'cancelled' AND rt.released_at IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM reservation_tables occupied WHERE occupied.table_id = rt.table_id
        AND occupied.active_slot_start = rt.slot_start) LIMIT 1")->fetch();
if (!$active || !$cancelled) {
    throw new RuntimeException('Need one live and one cancelled sample assignment');
}

$pdo->beginTransaction();
try {
    expectMysqlError(fn () => cloneReservation($pdo, (int) $active['id'], null,
        (string) $pdo->query('SELECT code FROM reservations LIMIT 1')->fetchColumn()), 1062, 'duplicate booking reference');
    expectMysqlError(fn () => cloneReservation($pdo, (int) $active['id'], 4294967295), 1452, 'guest foreign key');

    $duplicate = cloneReservation($pdo, (int) $active['id']);
    $assignment = $pdo->prepare('INSERT INTO reservation_tables (reservation_id, table_id, slot_start) VALUES (?, ?, ?)');
    expectMysqlError(fn () => $assignment->execute([$duplicate, $active['table_id'], $active['slot_start']]),
        1062, 'live table slot');

    $replacement = cloneReservation($pdo, (int) $cancelled['id']);
    $assignment->execute([$replacement, $cancelled['table_id'], $cancelled['slot_start']]);
    if (countRows($pdo, "SELECT COUNT(*) FROM reservation_tables WHERE table_id = {$cancelled['table_id']}
        AND slot_start = '{$cancelled['slot_start']}'") < 2) {
        throw new RuntimeException('Cancelled assignment history was lost');
    }
    echo "Verified foreign keys, unique codes, live-slot backstop, cancelled-slot reuse, joined members, pacing, and no live overlaps.\n";
} finally {
    $pdo->rollBack();
}
