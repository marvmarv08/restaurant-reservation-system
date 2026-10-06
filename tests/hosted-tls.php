<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/autoload.php';
$config = require dirname(__DIR__) . '/config/database.php';
if (getenv('BOOKING_TEST_MODE') !== 'isolated' || $config['database'] !== 'tablebook_p3_test' || $config['host'] !== 'mysql-hosted.test') {
    throw new RuntimeException('TLS checks require the dedicated disposable MySQL fixture.');
}
putenv('APP_ENV=hosted');
$pdo = App\Core\Database::connect($config);
$row = $pdo->query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")->fetch();
if (($row['Value'] ?? '') === '') throw new RuntimeException('Trusted database transport must be encrypted');
echo "PASS trusted certificate establishes real encrypted MySQL transport\n";
$encoded = $config; $encoded['ssl_ca'] = ''; $encoded['ssl_ca_base64'] = base64_encode(file_get_contents($config['ssl_ca']));
App\Core\Database::connect($encoded);
echo "PASS environment certificate establishes real encrypted transport\n";
foreach (['wrong trust' => ['ssl_ca' => '/tmp/lumina-hosted-wrong-ca.pem'], 'wrong hostname' => ['host' => 'mysql-wrong-name.test']] as $name => $change) {
    $refused = false;
    try { App\Core\Database::connect(array_merge($config, $change)); }
    catch (PDOException $error) { $refused = true; }
    if (!$refused) throw new RuntimeException('TLS verification must refuse ' . $name);
    echo 'PASS TLS refuses ' . $name . "\n";
}
echo "Hosted TLS: 4 real transport checks passed.\n";
