<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/autoload.php';
$config = require dirname(__DIR__) . '/config/database.php';
if (getenv('BOOKING_TEST_MODE') !== 'isolated' || $config['database'] !== 'tablebook_p3_test') {
    throw new RuntimeException('Hosted transport verification requires the isolated database.');
}
$environment = getenv('APP_ENV');
$checks = 0;
try {
    putenv('APP_ENV=hosted');
    foreach (['missing trust' => [], 'invalid base64' => ['ssl_ca_base64' => '**invalid**'],
        'malformed certificate' => ['ssl_ca_base64' => base64_encode('not a certificate')],
        'unreadable certificate' => ['ssl_ca' => '/tmp/lumina-ca-does-not-exist.pem']] as $name => $extra) {
        $refused = false;
        try { App\Core\Database::connect(array_merge($config, $extra)); }
        catch (RuntimeException $error) {
            if ($error instanceof PDOException) throw new RuntimeException('Configuration must be rejected before attempting the connection');
            $refused = true;
        }
        if (!$refused) throw new RuntimeException('Hosted connection must refuse ' . $name);
        $checks++; echo 'PASS hosted refuses ' . $name . "\n";
    }
    putenv('APP_ENV=test');
    if (!(App\Core\Database::connect($config) instanceof PDO)) throw new RuntimeException('Existing isolated connection must remain usable');
    $checks++; echo "PASS unchanged isolated connection\n";
    echo "Hosted database: {$checks} configuration checks passed.\n";
} finally {
    putenv($environment === false ? 'APP_ENV' : 'APP_ENV=' . $environment);
}
