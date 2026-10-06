<?php
declare(strict_types=1);

require dirname(__DIR__) . '/src/autoload.php';
$config = require dirname(__DIR__) . '/config/database.php';
if (getenv('BOOKING_TEST_MODE') !== 'isolated' || $config['database'] !== 'tablebook_p3_test') {
    throw new RuntimeException('Browser fixtures require the isolated test database');
}
$pdo = App\Core\Database::connect($config);
$input = json_decode(stream_get_contents(STDIN), true, 16, JSON_THROW_ON_ERROR);
switch ($input['action'] ?? '') {
    case 'expire':
        $pdo->prepare("UPDATE holds SET expires_at = DATE_SUB(NOW(), INTERVAL 1 SECOND) WHERE hold_token = ? AND status = 'active'")
            ->execute([$input['hold_token']]);
        break;
    case 'shorten':
        $pdo->prepare("UPDATE holds SET expires_at = DATE_ADD(NOW(), INTERVAL 3 SECOND) WHERE hold_token = ? AND status = 'active'")
            ->execute([$input['hold_token']]);
        break;
    case 'joined':
        $pdo->prepare("INSERT INTO blackout_dates (scope, scope_id, starts_at, ends_at, reason) VALUES ('table', ?, ?, ?, 'Browser joined fixture')")
            ->execute([$pdo->query("SELECT id FROM `tables` WHERE code = 'G3'")->fetchColumn(), $input['date'] . ' 00:00:00', $input['date'] . ' 23:59:59']);
        break;
    case 'showcase-block':
        $table = $pdo->prepare('SELECT id FROM `tables` WHERE code = ?');
        $table->execute([$input['table']]);
        $id = $table->fetchColumn();
        if (!$id || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $input['date'])) throw new RuntimeException('Invalid showcase fixture');
        $pdo->prepare("INSERT INTO blackout_dates (scope, scope_id, starts_at, ends_at, reason) VALUES ('table', ?, ?, ?, 'Showcase verification')")
            ->execute([$id, $input['date'] . ' 00:00:00', $input['date'] . ' 23:59:59']);
        break;
    case 'showcase-unblock':
        $pdo->exec("DELETE FROM blackout_dates WHERE reason = 'Showcase verification'");
        break;
    case 'cleanup':
        $pdo->exec("DELETE FROM blackout_dates WHERE reason = 'Browser joined fixture'");
        break;
    default:
        throw new RuntimeException('Unknown browser fixture');
}
echo "Fixture applied to isolated database.\n";
