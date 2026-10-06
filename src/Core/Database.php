<?php
declare(strict_types=1);
namespace App\Core;

use PDO;
use RuntimeException;

final class Database
{
    private static array $certificates = [];

    public static function connect(array $config): PDO
    {
        foreach (['host', 'port', 'database', 'username', 'password'] as $key) {
            if (!isset($config[$key]) || $config[$key] === '') {
                throw new RuntimeException('Missing database configuration: ' . $key);
            }
        }
        $options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false, PDO::ATTR_TIMEOUT => 3];
        $tls = self::tlsOptions($config);
        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $config['host'], $config['port'], $config['database']);
        $pdo = new PDO($dsn, $config['username'], $config['password'], $options + $tls);
        if ($tls !== []) {
            $row = $pdo->query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")->fetch();
            if (!$row || ($row['Value'] ?? '') === '') {
                throw new RuntimeException('Database connection requires encrypted transport.');
            }
        }
        $pdo->exec("SET time_zone = '+08:00'");
        return $pdo;
    }

    private static function tlsOptions(array $config): array
    {
        $path = (string) ($config['ssl_ca'] ?? '');
        $encoded = (string) ($config['ssl_ca_base64'] ?? '');
        if ($path === '' && $encoded === '') {
            if (getenv('APP_ENV') === 'hosted') throw new RuntimeException('Hosted database requires a trusted TLS certificate.');
            return [];
        }
        if ($path !== '' && $encoded !== '') throw new RuntimeException('Configure exactly one database certificate source.');
        if ($encoded !== '') {
            if (strlen($encoded) > 90000) throw new RuntimeException('Database certificate exceeds size limit.');
            $certificate = base64_decode($encoded, true);
            if ($certificate === false) throw new RuntimeException('Invalid database certificate encoding.');
        } else {
            if (!is_file($path) || !is_readable($path) || filesize($path) > 65536) {
                throw new RuntimeException('Database certificate file is unavailable.');
            }
            $certificate = file_get_contents($path);
        }
        if (!is_string($certificate) || strlen($certificate) > 65536 || @openssl_x509_read($certificate) === false) {
            throw new RuntimeException('Invalid database trust certificate.');
        }
        if ($encoded !== '') {
            $key = hash('sha256', $certificate);
            if (!isset(self::$certificates[$key])) {
                $stream = tmpfile();
                if ($stream === false || fwrite($stream, $certificate) !== strlen($certificate)) {
                    throw new RuntimeException('Cannot prepare database certificate.');
                }
                // Keep the private temporary file alive through all connections in this request.
                self::$certificates[$key] = $stream;
            }
            $path = stream_get_meta_data(self::$certificates[$key])['uri'];
        }
        return [PDO::MYSQL_ATTR_SSL_CA => $path, PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => true];
    }
}
