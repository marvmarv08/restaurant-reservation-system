<?php
declare(strict_types=1);

use App\Controller\HealthController;
use App\Controller\HomeController;
use App\Controller\BookingController;

return [
    ['GET', '/', [HomeController::class, 'index']],
    ['GET', '/health', [HealthController::class, 'show']],
    ['GET', '/api/session', [BookingController::class, 'session']],
    ['GET', '/api/availability', [BookingController::class, 'availability']],
    ['POST', '/api/holds', [BookingController::class, 'hold']],
    ['POST', '/api/holds/release', [BookingController::class, 'release']],
    ['POST', '/api/reservations', [BookingController::class, 'confirm']],
];
