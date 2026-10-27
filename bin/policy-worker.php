<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/autoload.php';
$c=require dirname(__DIR__).'/config/database.php';
if(getenv('BOOKING_TEST_MODE')!=='isolated'||$c['database']!=='tablebook_p3_test')throw new RuntimeException('Policy worker is restricted to the isolated preview.');
$p=App\Core\Database::connect($c);$clock=new App\Service\BookingClock($p);
do{
    try{
        if((int)$p->query("SELECT GET_LOCK('tablebook_p3_test_policy_worker',0)")->fetchColumn()===1){
            try{$n=(new App\Service\ReservationPolicyService($p,$clock))->reconcile();if($n>0)echo "Released $n absent reservation(s).\n";}
            finally{$p->query("SELECT RELEASE_LOCK('tablebook_p3_test_policy_worker')");}
        }
    }catch(Throwable $e){fwrite(STDERR,'Policy worker: '.($e instanceof App\Domain\BookingError?$e->errorCode:'reconciliation_failed')."\n");exit(1);}
    if(in_array('--once',$argv,true))break;
    usleep(5000000);
}while(true);
