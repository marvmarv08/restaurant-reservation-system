<?php
declare(strict_types=1);

require dirname(__DIR__) . '/src/autoload.php';
$config = require dirname(__DIR__) . '/config/database.php';
if (getenv('BOOKING_TEST_MODE') !== 'isolated' || $config['database'] !== 'tablebook_p3_test') {
    throw new RuntimeException('Test schema upgrade requires the isolated test database');
}
$pdo = App\Core\Database::connect($config);
foreach (glob(dirname(__DIR__) . '/database/init/*.sql') as $file) {
    $pdo->exec(file_get_contents($file));
}
echo "Isolated test schema upgraded additively.\n";
