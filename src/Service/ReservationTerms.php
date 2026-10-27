<?php
declare(strict_types=1);
namespace App\Service;
use DateTimeImmutable;
final class ReservationTerms
{
    public const VERSION='bella_vista_terms_v2';
    public static function text():array{return [
        'Bella Vista Dining serves Tuesday–Sunday, 10:00–22:00; closed Monday. Dining lasts 120 minutes, followed by a separate 15-minute cleanup. Last seating is 20:00.',
        'Arrive before the 15-minute grace period ends; staff cannot seat a party after this cutoff. Overdue, unseated reservations are released when availability is next checked; an already seated party is never automatically released.',
        'Online cancellation and changes close exactly 24 hours before dining, inclusive. Earlier deadlines are preserved on rescheduling; later requests require staff review.',
        'Same-day cancellation means the same Asia/Manila calendar date. Actually received Family/VIP base reservation fees are non-refundable then; unpaid money is never described as paid or forfeited.',
        'Timely eligible unused receipts and unused VIP extra-person receipts go to authorized manager review. Refund pending is not refunded; staff record actual cash or externally completed card refunds. No automatic no-show penalty is imposed.',
        'Standard seats 2–4 with no reservation fee and at least ₱1,000 in accepted food upon seating. Family seats 5–8 with a ₱500 consumable base. VIP seats up to 20: ₱2,500 consumable base covers up to 15 guests, plus ₱300 per additional guest through 20; extras are not food credit.',
        'Only actually received base funds can be credited once against food. No online money is collected; onsite cash/external card after dining is recorded by authorized staff. Final bills use actual food and receipts.',
        'Pre-ordered food remains scheduled until validated arrival. Accepted prices are preserved; fired/prepared/served food and financial history cannot be silently removed. No outside food or beverages.'
    ];}
    public static function cancellation(DateTimeImmutable $start,DateTimeImmutable $now,DateTimeImmutable $deadline,int $netBase,string $outcome):array
    {
        return ['late'=>$now>$deadline,'same_day'=>$now->format('Y-m-d')===$start->format('Y-m-d'),'forfeited_base_cents'=>$outcome==='cancelled'&&$now->format('Y-m-d')===$start->format('Y-m-d')?$netBase:0];
    }
}
