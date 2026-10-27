<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/autoload.php';
$c=require dirname(__DIR__).'/config/database.php';
if(getenv('BOOKING_TEST_MODE')!=='isolated'||$c['database']!=='tablebook_p3_test')throw new RuntimeException('Billing preparation is restricted to the isolated test database.');
App\Service\BillingSchema::prepare(App\Core\Database::connect($c));
echo "Isolated billing schema/profile prepared; no main data or real payment was changed.\n";
