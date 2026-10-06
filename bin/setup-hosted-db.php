<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/autoload.php';

$config = require dirname(__DIR__) . '/config/database.php';
if (PHP_SAPI !== 'cli' || getenv('APP_ENV') !== 'hosted' || getenv('HOSTED_SETUP_CONFIRM') !== 'initialize-lumina-demo') {
    throw new RuntimeException('Hosted setup requires CLI, hosted mode and explicit confirmation.');
}
$host = strtolower((string) $config['host']);
if (!preg_match('/^[a-z0-9.-]+$/D', $host) || !str_contains($host, '.') ||
    in_array($host, ['localhost', 'db', 'host.docker.internal'], true) || filter_var($host, FILTER_VALIDATE_IP) ||
    !in_array($config['database'], ['defaultdb', 'tablebook_hosted_demo'], true)) {
    throw new RuntimeException('Refusing local/main/test or unrecognized hosted database target.');
}
$pdo = App\Core\Database::connect($config);
$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
if ($tables !== []) {
    if (!in_array('deployment_installation', $tables, true) ||
        $pdo->query('SELECT application FROM deployment_installation WHERE id=1')->fetchColumn() !== 'lumina-vercel-demo') {
        throw new RuntimeException('Hosted setup refuses an existing database without a matching installation marker.');
    }
} else {
    $pdo->exec('CREATE TABLE deployment_installation (id TINYINT UNSIGNED PRIMARY KEY, application VARCHAR(64) NOT NULL, initialized_at DATETIME NULL) ENGINE=InnoDB');
    $pdo->exec("INSERT INTO deployment_installation (id,application) VALUES (1,'lumina-vercel-demo')");
}
foreach (glob(dirname(__DIR__) . '/database/init/*.sql') as $file) $pdo->exec(file_get_contents($file));
$pdo = null;
$process = proc_open([PHP_BINARY, __DIR__ . '/seed.php'], [0 => STDIN, 1 => STDOUT, 2 => STDERR], $pipes);
if (!is_resource($process) || proc_close($process) !== 0) throw new RuntimeException('Hosted demo seed did not complete.');
$pdo = App\Core\Database::connect($config);
$pdo->exec('UPDATE deployment_installation SET initialized_at=COALESCE(initialized_at,NOW()) WHERE id=1');
echo "Hosted demo schema initialized. Staff remain inactive until private activation.\n";
