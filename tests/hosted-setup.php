<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/autoload.php';
$config = require dirname(__DIR__) . '/config/database.php';
if (getenv('BOOKING_TEST_MODE') !== 'isolated' || $config['host'] !== 'mysql-hosted.test' || $config['database'] !== 'defaultdb') {
    throw new RuntimeException('Setup verification requires the dedicated disposable TLS database.');
}
function setupRun(array $changes = []): int {
    $env = array_merge(getenv(), ['APP_ENV' => 'hosted','HOSTED_SETUP_CONFIRM' => 'initialize-lumina-demo'], $changes);
    $process = proc_open([PHP_BINARY, dirname(__DIR__) . '/bin/setup-hosted-db.php'], [0 => ['pipe','r'], 1 => ['pipe','w'], 2 => ['pipe','w']], $pipes, null, $env);
    if (!is_resource($process)) throw new RuntimeException('Cannot launch initializer');
    fclose($pipes[0]); stream_get_contents($pipes[1]); stream_get_contents($pipes[2]);
    fclose($pipes[1]); fclose($pipes[2]); return proc_close($process);
}
$pdo = App\Core\Database::connect($config);
if ($pdo->query('SHOW TABLES')->fetchAll() !== []) throw new RuntimeException('Fresh setup fixture must be empty');
if (setupRun() !== 0) throw new RuntimeException('Fresh separate hosted database must initialize successfully');
if ((int) $pdo->query('SELECT COUNT(*) FROM menu_items')->fetchColumn() !== 36) throw new RuntimeException('Hosted menu must contain the real catalog');
if ((int) $pdo->query('SELECT COUNT(*) FROM users WHERE is_active=1')->fetchColumn() !== 0) throw new RuntimeException('Initialization must not activate staff');
echo "PASS fresh hosted schema and menu initialize without staff activation\n";
$before = (int) $pdo->query('SELECT COUNT(*) FROM reservations')->fetchColumn();
if (setupRun() !== 0 || (int) $pdo->query('SELECT COUNT(*) FROM reservations')->fetchColumn() !== $before) throw new RuntimeException('Marked initialization rerun must retain reservations');
echo "PASS marked hosted setup rerun retains database records\n";
foreach (['unconfirmed' => ['HOSTED_SETUP_CONFIRM' => ''], 'local mode' => ['APP_ENV' => 'local'], 'main database name' => ['DB_DATABASE' => 'tablebook'], 'isolated test database name' => ['DB_DATABASE' => 'tablebook_p3_test']] as $name => $changes) {
    if (setupRun($changes) === 0) throw new RuntimeException('Setup must refuse ' . $name);
    echo 'PASS setup refuses ' . $name . "\n";
}
$pdo->exec("UPDATE deployment_installation SET application='different-application' WHERE id=1");
try {
    if (setupRun() === 0) throw new RuntimeException('Setup must refuse a different installation marker');
    if ((int) $pdo->query('SELECT COUNT(*) FROM reservations')->fetchColumn() !== $before) throw new RuntimeException('Refused setup must not modify records');
    echo "PASS different installation marker refuses initialization without writes\n";
} finally { $pdo->exec("UPDATE deployment_installation SET application='lumina-vercel-demo' WHERE id=1"); }
$pdo->exec('RENAME TABLE deployment_installation TO fixture_saved_installation');
try {
    if (setupRun() === 0) throw new RuntimeException('Setup must refuse nonempty allowed database without a marker');
    if ((int) $pdo->query('SELECT COUNT(*) FROM reservations')->fetchColumn() !== $before ||
        in_array('deployment_installation', $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN), true)) {
        throw new RuntimeException('Refused unmarked database must not receive writes');
    }
    echo "PASS nonempty allowed hosted database without a marker remains untouched\n";
} finally { $pdo->exec('RENAME TABLE fixture_saved_installation TO deployment_installation'); }
$main = App\Core\Database::connect(array_merge($config,['database'=>'tablebook']));
if ($main->query('SHOW TABLES')->fetchAll() !== []) throw new RuntimeException('Refused main-name target must remain empty');
$main->exec('CREATE TABLE sentinel (id INT PRIMARY KEY)');
if (setupRun(['DB_DATABASE' => 'tablebook', 'DB_HOST' => 'mysql-hosted.test']) === 0 || $main->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) !== ['sentinel']) throw new RuntimeException('An unmarked database must remain untouched');
echo "PASS refused targets remain untouched\n";
echo "Hosted setup: 9 checks passed.\n";
