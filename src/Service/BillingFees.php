<?php
declare(strict_types=1);
namespace App\Service;
use App\Domain\BookingError;

final class BillingFees
{
    public const MAX_CENTS = 100000000;
    public static function assess(string $category, int $party): array
    {
        [$low,$high,$base,$minimum] = match($category) {
            'bv_standard'=>[2,4,0,100000],
            'bv_family'=>[5,8,50000,0],
            'bv_vip'=>[1,20,250000,0],
            default=>throw new BookingError('billing_capacity','Choose an assigned Bella Vista category.'),
        };
        if($party<$low||$party>$high)throw new BookingError('billing_capacity','Party size does not fit the assigned category.');
        return ['base_fee_cents'=>$base,'extra_cents'=>$category==='bv_vip'?max(0,$party-15)*30000:0,'minimum_cents'=>$minimum];
    }
    public static function totals(array $fees,int $food,int $advance,int $payments,int $refunds): array
    {
        foreach([$food,$advance,$payments,$refunds] as $amount)if($amount<0||$amount>self::MAX_CENTS)throw new BookingError('invalid_amount','Amount is outside the supported centavo range.');
        if($refunds>$advance)throw new BookingError('invalid_amount','Refunds cannot exceed received consumable funds.');
        $net=$advance-$refunds;
        $credit=min($food,$net);
        // An unused food advance cannot pay the non-consumable VIP extra.
        $due=$food-$credit+$fees['extra_cents']-$payments;
        return $fees+['food_cents'=>$food,'advance_cents'=>$advance,'payment_cents'=>$payments,'refund_cents'=>$refunds,'received_cents'=>$advance+$payments-$refunds,'credit_applied_cents'=>$credit,'unused_credit_cents'=>max(0,$net-$food),'due_cents'=>max(0,$due),'minimum_met'=>$food>=$fees['minimum_cents']];
    }
}
