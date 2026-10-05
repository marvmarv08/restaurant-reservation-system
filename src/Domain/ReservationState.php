<?php
declare(strict_types=1);

namespace App\Domain;

final class ReservationState
{
    public const OCCUPYING = ['pending', 'confirmed', 'seated'];

    public static function occupyingSql(): string
    {
        return "'" . implode("','", self::OCCUPYING) . "'";
    }
}
