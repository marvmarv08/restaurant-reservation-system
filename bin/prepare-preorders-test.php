<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/autoload.php';
$config=require dirname(__DIR__).'/config/database.php';
if(getenv('BOOKING_TEST_MODE')!=='isolated'||$config['database']!=='tablebook_p3_test')throw new RuntimeException('B4 preparation is restricted to the isolated test database.');
App\Service\PreorderSchema::prepare(App\Core\Database::connect($config));
echo "Prepared isolated B4 scheduled food and assigned menu; no main activation.\n";
