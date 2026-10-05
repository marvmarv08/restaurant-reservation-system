<?php
declare(strict_types=1);

require dirname(__DIR__) . '/src/autoload.php';
$pdo = \App\Core\Database::connect(require dirname(__DIR__) . '/config/database.php');
$service = new \App\Service\BookingService($pdo, new \App\Service\BookingClock($pdo));
printf("Expired %d holds.\n", $service->expireHolds());
