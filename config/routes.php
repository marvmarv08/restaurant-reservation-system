<?php
declare(strict_types=1);

use App\Controller\HealthController;
use App\Controller\HomeController;

return [
    ['GET', '/', [HomeController::class, 'index']],
    ['GET', '/health', [HealthController::class, 'show']],
];
