<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/autoload.php';
$config=require dirname(__DIR__) . '/config/database.php';
if(getenv('BOOKING_TEST_MODE')!=='isolated'||$config['database']!=='tablebook_p3_test') {
    throw new RuntimeException('This command only activates the isolated Bella Vista test catalog; main activation is not provided.');
}
$pdo=App\Core\Database::connect($config);
$result=(new App\Service\BellaVistaCatalog($pdo))->activate();
echo json_encode($result,JSON_THROW_ON_ERROR)."\n";
