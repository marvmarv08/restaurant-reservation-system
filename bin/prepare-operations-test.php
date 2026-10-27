<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/autoload.php';
$c=require dirname(__DIR__).'/config/database.php';
if(getenv('BOOKING_TEST_MODE')!=='isolated'||$c['database']!=='tablebook_p3_test')throw new RuntimeException('B6 preparation is restricted to the isolated preview.');
$p=App\Core\Database::connect($c);
if(!App\Service\ReservationPolicyService::enabled($p))throw new RuntimeException('Prepare isolated B5 before B6.');
$p->exec("INSERT INTO settings(skey,svalue,value_type) VALUES('operations_profile','bella_vista_b6','string') ON DUPLICATE KEY UPDATE svalue=VALUES(svalue)");
echo "Prepared isolated B6 operations/reports; no schema, main data or money transfer changed.\n";
