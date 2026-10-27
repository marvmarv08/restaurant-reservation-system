<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/autoload.php';require __DIR__.'/BookingHarness.php';
define('PREORDER_FIXTURE_ONLY',true);require __DIR__.'/preorders.php';define('POLICY_FIXTURE_ONLY',true);require __DIR__.'/policies.php';define('OPERATIONS_FIXTURE_ONLY',true);require __DIR__.'/operations.php';
$t->test('B6 early validated seating is immediately Occupied before scheduled start',function($t){$b=oBook($t);(new App\Service\StaffReservationService($t->pdo,b4clock($t,'09:45:00')))->transition(oActor($t),$b['r']['code'],1,'seat','Validated early arrival');$t->assert(oTable($t,$b,oFloor($t,$t->date.' 09:45:00'))['state']==='occupied');});$t->finish();
