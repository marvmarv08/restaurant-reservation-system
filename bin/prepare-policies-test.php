<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/autoload.php';
$c=require dirname(__DIR__).'/config/database.php';
if(getenv('BOOKING_TEST_MODE')!=='isolated'||$c['database']!=='tablebook_p3_test')throw new RuntimeException('B5 preparation is restricted to the isolated test database.');
App\Service\ReservationPolicySchema::prepare(App\Core\Database::connect($c));
echo "Prepared isolated B5 policies; existing acceptances are not retroactively invented.\n";
