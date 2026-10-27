<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/autoload.php';
if(!class_exists(App\Service\BillingFees::class)){fwrite(STDERR,"FAIL missing server-owned billing fee calculator\n");exit(1);}
$f=App\Service\BillingFees::class;$n=0;
$assert=function(bool $ok)use(&$n){if(!$ok)throw new RuntimeException('Fee assertion failed');$n++;};
foreach([['bv_standard',2,0,0,100000],['bv_standard',4,0,0,100000],['bv_family',5,50000,0,0],['bv_family',8,50000,0,0],['bv_vip',1,250000,0,0],['bv_vip',15,250000,0,0],['bv_vip',16,250000,30000,0],['bv_vip',20,250000,150000,0]] as [$type,$party,$base,$extra,$min]){
 $a=$f::assess($type,$party);$assert($a['base_fee_cents']===$base&&$a['extra_cents']===$extra&&$a['minimum_cents']===$min);
}
foreach([['bv_standard',1],['bv_family',9],['bv_vip',21],['legacy',2]] as [$type,$party]){try{$f::assess($type,$party);throw new RuntimeException('Invalid category accepted');}catch(App\Domain\BookingError $e){$assert($e->errorCode==='billing_capacity');}}
$a=$f::totals($f::assess('bv_family',5),200000,50000,0,0);$assert($a['due_cents']===150000&&$a['credit_applied_cents']===50000);
$a=$f::totals($f::assess('bv_family',5),200000,0,200000,0);$assert($a['due_cents']===0&&$a['received_cents']===200000);
$a=$f::totals($f::assess('bv_vip',16),500000,250000,0,0);$assert($a['due_cents']===280000);
$a=$f::totals($f::assess('bv_vip',16),200000,250000,0,0);$assert($a['due_cents']===30000&&$a['unused_credit_cents']===50000);
$a=$f::totals($f::assess('bv_standard',2),99900,0,0,0);$assert(!$a['minimum_met']);
$a=$f::totals($f::assess('bv_standard',2),100000,0,0,0);$assert($a['minimum_met']);
echo "Billing fees: $n checks passed.\n";
