<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/autoload.php';
$config = require dirname(__DIR__) . '/config/database.php';
if (getenv('BOOKING_TEST_MODE') !== 'isolated' || $config['database'] !== 'tablebook_p3_test') {
    throw new RuntimeException('Disabled-preorder regression requires the isolated database.');
}
$pdo = App\Core\Database::connect($config);
$pdo->beginTransaction();
try {
    $pdo->exec("DELETE FROM settings WHERE skey='preorder_profile'");
    try {
        (new App\Service\PreorderService($pdo, new App\Service\BookingClock($pdo)))
            ->edit(['id' => 0], 1, ['cart' => []]);
        throw new RuntimeException('Disabled preorders must reject cart edits.');
    } catch (App\Domain\BookingError $error) {
        if ($error->errorCode !== 'preorders_disabled' || $error->httpStatus !== 404) {
            throw new RuntimeException('Disabled cart edits must return preorders_disabled/404.');
        }
    }
    echo "PASS disabled preorders reject edits before optional-table or booking access\n";
} finally {
    $pdo->rollBack();
}
