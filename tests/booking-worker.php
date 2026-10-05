<?php
declare(strict_types=1);

require dirname(__DIR__) . '/src/autoload.php';
if (getenv('BOOKING_TEST_MODE') !== 'isolated' || getenv('DB_DATABASE') !== 'tablebook_p3_test') {
    throw new RuntimeException('Race worker requires the isolated test database');
}
$job = json_decode(stream_get_contents(STDIN), true, 8, JSON_THROW_ON_ERROR);
$pdo = \App\Core\Database::connect(require dirname(__DIR__) . '/config/database.php');
$service = new \App\Service\BookingService($pdo, new \App\Service\BookingClock($pdo));
while (microtime(true) < $job['at']) {
    usleep(1000);
}
try {
    $result = match ($job['op']) {
        'hold' => $service->hold($job['date'], $job['time'], $job['party'], $job['room'], $job['owner'], $job['kind'] ?? null, $job['id'] ?? null),
        'confirm' => $service->confirm($job['token'], ['full_name' => 'Race Guest', 'phone' => '+639000000002'], $job['owner']),
        default => throw new RuntimeException('Unknown race operation'),
    };
    // Test output intentionally excludes hold tokens and guest details.
    echo json_encode(['ok' => true, 'code' => $result['code'] ?? null, 'created' => $result['created'] ?? null], JSON_THROW_ON_ERROR);
} catch (\App\Domain\BookingError $error) {
    echo json_encode(['ok' => false, 'error' => $error->errorCode, 'status' => $error->httpStatus], JSON_THROW_ON_ERROR);
}
