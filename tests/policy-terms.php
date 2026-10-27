<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/autoload.php';
use App\Service\ReservationTerms;
$zone=new DateTimeZone('Asia/Manila');
$start=new DateTimeImmutable('2026-11-04 14:00:00',$zone);
if(!class_exists(ReservationTerms::class))throw new RuntimeException('Missing ReservationTerms decision calculator');
$cases=[['2026-11-03 14:00:00',false,false,0],['2026-11-03 14:00:01',true,false,0],['2026-11-04 09:00:00',true,true,250000]];
foreach($cases as [$time,$late,$same,$forfeit]){
 $q=ReservationTerms::cancellation($start,new DateTimeImmutable($time,$zone),$start->modify('-24 hours'),250000,'cancelled');
 if($q['late']!==$late||$q['same_day']!==$same||$q['forfeited_base_cents']!==$forfeit)throw new RuntimeException('Cancellation boundary mismatch');
 echo "PASS cancellation boundary $time\n";
}
$q=ReservationTerms::cancellation($start,new DateTimeImmutable('2026-11-04 14:15:00',$zone),$start->modify('-24 hours'),250000,'no_show');
if($q['forfeited_base_cents']!==0)throw new RuntimeException('No-show must not invent a forfeiture');
echo "PASS no-show is separate from same-day cancellation\n";
$q=ReservationTerms::cancellation($start,new DateTimeImmutable('2026-11-04 09:00:00',$zone),$start->modify('-24 hours'),0,'cancelled');
if($q['forfeited_base_cents']!==0)throw new RuntimeException('Unpaid fees are not forfeited receipts');
echo "PASS unpaid cancellation does not fabricate money\n";
$terms=implode(' ',ReservationTerms::text());
if(ReservationTerms::VERSION==='bella_vista_terms_v1'||!str_contains($terms,'availability is next checked')||str_contains($terms,'released at start plus 15 minutes')){
 throw new RuntimeException('Versioned guest terms must describe request-driven release without promising a continuously running worker.');
}
echo "PASS versioned arrival terms explain the cutoff and availability-driven release\n";
