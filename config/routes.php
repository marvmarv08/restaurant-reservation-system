<?php
declare(strict_types=1);

use App\Controller\HealthController;
use App\Controller\HomeController;
use App\Controller\BookingController;
use App\Controller\ManagementController;

return [
    ['GET', '/', [HomeController::class, 'index']],
    ['GET', '/manage', [HomeController::class, 'manage']],
    ['GET', '/health', [HealthController::class, 'show']],
    ['GET', '/api/session', [BookingController::class, 'session']],
    ['GET', '/api/availability', [BookingController::class, 'availability']],
    ['GET', '/api/catalog', [BookingController::class, 'catalog']],
    ['GET', '/api/holds', [BookingController::class, 'inspect']],
    ['POST', '/api/holds', [BookingController::class, 'hold']],
    ['POST', '/api/holds/release', [BookingController::class, 'release']],
    ['POST', '/api/reservations', [BookingController::class, 'confirm']],
    ['GET', '/api/manage', [ManagementController::class, 'show']],
    ['GET', '/api/manage/availability', [ManagementController::class, 'availability']],
    ['POST', '/api/manage/cancel', [ManagementController::class, 'cancel']],
    ['POST', '/api/manage/modify', [ManagementController::class, 'modify']],
];
