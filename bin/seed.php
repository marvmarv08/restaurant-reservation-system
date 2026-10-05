<?php
declare(strict_types=1);

require dirname(__DIR__) . '/src/Core/Database.php';

date_default_timezone_set('Asia/Manila');
$pdo = \App\Core\Database::connect(require dirname(__DIR__) . '/config/database.php');
$timezone = new DateTimeZone('Asia/Manila');
$today = new DateTimeImmutable('today', $timezone);
$now = new DateTimeImmutable('now', $timezone);

$names = [
    'Maya Alvarez', 'Teodoro Bautista', 'Celine Lim', 'Rafael Cruz', 'Noor Haddad',
    'Jun Nakamura', 'Beatriz Santos', 'Emil Fischer', 'Sofia Moreau', 'Luis Delgado',
    'Hana Rossi', 'Marco Abad', 'Divina Yamada', 'Kenji Novak', 'Clara Garcia',
    'Ramon Sharma', 'Priya Silva', 'Tomas Keller', 'Iris Mendoza', 'Gabriel Weiss',
    'Lena Tan', 'Arturo Ferrer', 'Yuki Ocampo', 'Nadia Vidal', 'Felix Castro',
    'Camila Reyes', 'Ibrahim Park', 'Rosa Dizon', 'Dmitri Lagman', 'Elena Okafor',
];

function stableNumber(string $key): int
{
    return (int) sprintf('%u', crc32($key));
}

function turnForParty(PDO $pdo, int $party): int
{
    $query = $pdo->prepare('SELECT turn_time_min FROM turn_times WHERE ? BETWEEN party_min AND party_max');
    $query->execute([$party]);
    $turn = (int) $query->fetchColumn();
    if ($turn === 0) {
        throw new RuntimeException("No turn time for party size {$party}");
    }
    return $turn;
}

function slotHasCapacity(PDO $pdo, DateTimeImmutable $start, int $party, int $maxBookings, int $maxCovers): bool
{
    $query = $pdo->prepare("SELECT COUNT(*), COALESCE(SUM(party_size), 0) FROM reservations
        WHERE starts_at = ? AND status IN ('pending','confirmed','seated')");
    $query->execute([$start->format('Y-m-d H:i:s')]);
    [$bookings, $covers] = $query->fetch(PDO::FETCH_NUM);
    return (int) $bookings < $maxBookings && (int) $covers + $party <= $maxCovers;
}

function reconcileDemoPacing(PDO $pdo, DateTimeImmutable $now, int $maxBookings, int $maxCovers): int
{
    $query = $pdo->prepare("SELECT id, seed_key, party_size, status, starts_at FROM reservations
        WHERE starts_at > ? AND status IN ('pending','confirmed')
        ORDER BY starts_at,
          CASE WHEN seed_key IS NULL THEN 0 WHEN table_group_id IS NOT NULL THEN 1
               WHEN seed_key LIKE '%-G3' THEN 2 ELSE 3 END, id");
    $query->execute([$now->format('Y-m-d H:i:s')]);
    $cancel = $pdo->prepare("UPDATE reservations SET status = 'cancelled', cancelled_at = NOW(),
        version = version + 1 WHERE id = ? AND seed_key IS NOT NULL");
    $release = $pdo->prepare('UPDATE reservation_tables SET released_at = NOW() WHERE reservation_id = ? AND released_at IS NULL');
    $history = $pdo->prepare("INSERT INTO reservation_status_history
        (reservation_id, from_status, to_status, reason) VALUES (?, ?, 'cancelled', 'Demo seed pacing correction')");
    $slot = null;
    $bookings = 0;
    $covers = 0;
    $corrected = 0;
    foreach ($query as $row) {
        if ($row['starts_at'] !== $slot) {
            $slot = $row['starts_at'];
            $bookings = 0;
            $covers = 0;
        }
        $party = (int) $row['party_size'];
        if ($row['seed_key'] !== null && ($bookings >= $maxBookings || $covers + $party > $maxCovers)) {
            $cancel->execute([$row['id']]);
            $release->execute([$row['id']]);
            $history->execute([$row['id'], $row['status']]);
            $corrected++;
            continue;
        }
        $bookings++;
        $covers += $party;
    }
    return $corrected;
}

function seedReservation(
    PDO $pdo,
    string $key,
    int $guestId,
    int $roomTypeId,
    array $memberIds,
    ?int $groupId,
    int $party,
    DateTimeImmutable $start,
    string $status
): bool {
    $lookup = $pdo->prepare('SELECT id FROM reservations WHERE seed_key = ?');
    $lookup->execute([$key]);
    if ($lookup->fetchColumn() !== false) {
        return false;
    }

    $turn = turnForParty($pdo, $party);
    $end = $start->modify("+{$turn} minutes");
    $block = $end->modify('+' . (15 + ($groupId === null ? 0 : 10)) . ' minutes');
    $approval = $party >= 13 ? 'awaiting' : 'not_required';
    $released = in_array($status, ['completed', 'cancelled', 'no_show'], true)
        ? $block->format('Y-m-d H:i:s') : null;
    for ($attempt = 0; $attempt < 20; $attempt++) {
        $code = 'LUM-' . strtoupper(substr(hash('sha256', $key . ':' . $attempt), 0, 6));
        try {
            $insert = $pdo->prepare('INSERT INTO reservations
                (code, seed_key, guest_id, room_type_id, table_group_id, party_size, starts_at,
                 ends_at, blocks_until, turn_time_min, status, source, approval_state, seated_at, completed_at, cancelled_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'web\', ?, ?, ?, ?)');
            $insert->execute([
                $code, $key, $guestId, $roomTypeId, $groupId, $party,
                $start->format('Y-m-d H:i:s'), $end->format('Y-m-d H:i:s'),
                $block->format('Y-m-d H:i:s'), $turn, $status, $approval,
                $status === 'seated' ? $start->format('Y-m-d H:i:s') : null,
                $status === 'completed' ? $end->format('Y-m-d H:i:s') : null,
                $status === 'cancelled' ? $start->modify('-1 day')->format('Y-m-d H:i:s') : null,
            ]);
            break;
        } catch (PDOException $error) {
            if ($error->errorInfo[1] !== 1062 || !str_contains($error->getMessage(), 'code')) {
                throw $error;
            }
            if ($attempt === 19) {
                throw new RuntimeException('Could not allocate a unique confirmation code', 0, $error);
            }
        }
    }
    $reservationId = (int) $pdo->lastInsertId();
    $membership = $pdo->prepare('INSERT INTO reservation_tables (reservation_id, table_id, slot_start, released_at) VALUES (?, ?, ?, ?)');
    foreach ($memberIds as $tableId) {
        $membership->execute([$reservationId, $tableId, $start->format('Y-m-d H:i:s'), $released]);
    }
    $history = $pdo->prepare('INSERT INTO reservation_status_history (reservation_id, from_status, to_status, reason) VALUES (?, NULL, ?, ?)');
    $history->execute([$reservationId, $status, 'Demo sample']);
    return true;
}

$pdo->beginTransaction();
try {
    $guestIds = [];
    $guestInsert = $pdo->prepare('INSERT INTO guests (seed_key, full_name, phone, email) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)');
    foreach ($names as $index => $name) {
        $number = $index + 1;
        $guestInsert->execute([
            sprintf('demo-guest-%02d', $number), $name,
            sprintf('+639000000%03d', $number),
            sprintf('guest%02d@lumina.test', $number),
        ]);
        $guestIds[] = (int) $pdo->lastInsertId();
    }

    $tables = $pdo->query('SELECT t.id, t.code, t.capacity_min, t.capacity_max, rt.id AS room_type_id,
        rt.min_notice_hours FROM `tables` t JOIN rooms r ON r.id = t.room_id
        JOIN room_types rt ON rt.id = r.room_type_id WHERE t.is_active = 1 ORDER BY t.id')->fetchAll();
    if (count($tables) !== 25) {
        throw new RuntimeException('Expected the 25 prototype tables before reservation seeding');
    }
    $byCode = array_column($tables, null, 'code');
    $groupId = (int) $pdo->query("SELECT id FROM table_groups WHERE code = 'G1-G2'")->fetchColumn();
    if ($groupId === 0) {
        throw new RuntimeException('Missing joined table group');
    }

    $maxBookings = (int) $pdo->query("SELECT svalue FROM settings WHERE skey = 'max_reservations_per_slot'")->fetchColumn();
    $maxCovers = (int) $pdo->query("SELECT svalue FROM settings WHERE skey = 'max_covers_per_slot'")->fetchColumn();
    if ($maxBookings < 1 || $maxCovers < 1) {
        throw new RuntimeException('Missing pacing settings');
    }
    $corrected = reconcileDemoPacing($pdo, $now, $maxBookings, $maxCovers);
    $new = 0;
    $joinedDay = $today->modify('next saturday');
    while ((new DateTimeImmutable($joinedDay->format('Y-m-d') . ' 17:30', $timezone))->getTimestamp()
        - $now->getTimestamp() < 24 * 3600) {
        $joinedDay = $joinedDay->modify('+7 days');
    }
    for ($offset = -10; $offset <= 10; $offset++) {
        $day = $today->modify(($offset >= 0 ? '+' : '') . $offset . ' days');
        if ($day->format('N') === '1') {
            continue;
        }
        foreach (['17:30', '20:30'] as $time) {
            $start = new DateTimeImmutable($day->format('Y-m-d') . ' ' . $time, $timezone);
            if ($day == $joinedDay && $time === '17:30'
                && slotHasCapacity($pdo, $start, 16, $maxBookings, $maxCovers)) {
                $new += (int) seedReservation($pdo, 'demo-joined-' . $joinedDay->format('Ymd'),
                    $guestIds[0], (int) $byCode['G1']['room_type_id'],
                    [(int) $byCode['G1']['id'], (int) $byCode['G2']['id']], $groupId, 16, $start, 'pending');
            }
            foreach ($tables as $table) {
                $code = $table['code'];
                $key = 'demo-' . $day->format('Ymd') . '-' . $time . '-' . $code;
                if (stableNumber($key) % 5 !== 0 && !($day == $joinedDay && $time === '17:30' && $code === 'G3')) {
                    continue;
                }
                if ($day == $joinedDay && $time === '17:30' && in_array($code, ['G1', 'G2'], true)) {
                    continue;
                }
                $notice = (int) $table['min_notice_hours'];
                if ($start > $now && $start->getTimestamp() - $now->getTimestamp() < max(60 * 60, $notice * 3600)) {
                    continue;
                }
                $min = (int) $table['capacity_min'];
                $max = (int) $table['capacity_max'];
                $party = $min + stableNumber($key . '-party') % ($max - $min + 1);
                if (!slotHasCapacity($pdo, $start, $party, $maxBookings, $maxCovers)) {
                    continue;
                }
                $block = $start->modify('+' . (turnForParty($pdo, $party) + 15) . ' minutes');
                $status = $block <= $now
                    ? (['completed', 'completed', 'completed', 'no_show', 'cancelled'][stableNumber($key . '-status') % 5])
                    : ($start <= $now ? 'seated' : ($party >= 13 ? 'pending' : 'confirmed'));
                $guestId = $guestIds[stableNumber($key . '-guest') % count($guestIds)];
                $new += (int) seedReservation($pdo, $key, $guestId, (int) $table['room_type_id'],
                    [(int) $table['id']], null, $party, $start, $status);
            }
        }
    }

    $pdo->commit();
    printf("Seed complete: %d new reservations, %d demo pacing corrections; %d total.\n", $new, $corrected,
        (int) $pdo->query('SELECT COUNT(*) FROM reservations')->fetchColumn());
} catch (Throwable $error) {
    $pdo->rollBack();
    fwrite(STDERR, $error->getMessage() . "\n");
    exit(1);
}
