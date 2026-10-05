<?php
declare(strict_types=1);

require dirname(__DIR__) . '/src/autoload.php';
$config = require dirname(__DIR__) . '/config/database.php';
$isDemo = getenv('APP_ENV') === 'demo' && $config['database'] === 'tablebook_demo';
if (getenv('BOOKING_TEST_MODE') !== 'isolated'
    || ($config['database'] !== 'tablebook_p3_test' && !$isDemo)) {
    throw new RuntimeException('Readiness fixtures require an explicitly isolated test or disposable demo database');
}
$pdo = App\Core\Database::connect($config);
$clock = new App\Service\BookingClock($pdo);
$input = json_decode(stream_get_contents(STDIN), true, 16, JSON_THROW_ON_ERROR);
$result = [];
switch ($input['action'] ?? '') {
    case 'prepare':
        // Earlier suites leave seated parties; start this disposable rehearsal clean.
        foreach (['audit_log', 'order_actions', 'order_events', 'kitchen_tickets', 'staff_requests',
            'waitlist_offers', 'reservation_change_history', 'reservation_manage_tokens',
            'hold_reservations', 'hold_tables', 'holds', 'order_status_history', 'order_items',
            'orders', 'outbox', 'reservation_status_history', 'reservation_tables',
            'reservations', 'guests', 'blackout_dates', 'booking_days'] as $table) {
            $pdo->exec('DELETE FROM `' . $table . '`');
        }
        $auth = new App\Service\StaffAuthService($pdo, $clock);
        foreach (['admin', 'server', 'kitchen'] as $role) {
            $email = 'readiness-' . $role . '@lumina.test';
            $pdo->prepare('UPDATE users SET is_active=0, auth_version=auth_version+1 WHERE email=?')->execute([$email]);
            $result[$role] = $auth->issue($email, 'Readiness ' . ucfirst($role), $role);
        }
        break;
    case 'arrival':
        // Skip the real waiting interval only in disposable verification data.
        // The production booking and seating rules remain unchanged.
        $q = $pdo->prepare("SELECT r.id FROM reservations r JOIN guests g ON g.id=r.guest_id
            WHERE r.code=? AND g.full_name='Readiness Demo Guest' AND r.status='confirmed'");
        $q->execute([$input['code'] ?? '']);
        $id = $q->fetchColumn();
        if (!$id) throw new RuntimeException('Expected the browser-created readiness reservation');
        $pdo->beginTransaction();
        $pdo->prepare('UPDATE reservations SET starts_at=DATE_SUB(NOW(), INTERVAL 5 MINUTE),
            ends_at=DATE_ADD(NOW(), INTERVAL 70 MINUTE), blocks_until=DATE_ADD(NOW(), INTERVAL 85 MINUTE) WHERE id=?')->execute([$id]);
        $pdo->prepare('UPDATE reservation_tables SET slot_start=DATE_SUB(NOW(), INTERVAL 5 MINUTE) WHERE reservation_id=?')->execute([$id]);
        $pdo->commit();
        $result = ['id' => (int) $id, 'date' => $clock->now()->format('Y-m-d')];
        break;
    case 'verify':
        $q = $pdo->prepare("SELECT r.status, o.status AS order_status, k.status AS ticket_status,
            (SELECT COUNT(*) FROM order_items i WHERE i.order_id=o.id) AS line_count,
            (SELECT COUNT(*) FROM reservation_tables t WHERE t.reservation_id=r.id AND t.released_at IS NULL) AS occupied
            FROM reservations r JOIN guests g ON g.id=r.guest_id JOIN orders o ON o.reservation_id=r.id
            JOIN kitchen_tickets k ON k.order_id=o.id WHERE r.code=? AND g.full_name='Readiness Demo Guest'");
        $q->execute([$input['code'] ?? '']);
        $result = $q->fetch();
        if (!$result) throw new RuntimeException('Full rehearsal record missing');
        break;
    default:
        throw new RuntimeException('Unknown readiness fixture');
}
echo json_encode($result, JSON_THROW_ON_ERROR);
