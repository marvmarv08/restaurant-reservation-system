<?php
declare(strict_types=1);

namespace App\Core;

use PDO;
use RuntimeException;

final class Database
{
    public static function connect(array $config): PDO
    {
        foreach (['host', 'port', 'database', 'username', 'password'] as $key) {
            if (!isset($config[$key]) || $config[$key] === '') {
                throw new RuntimeException('Missing database configuration: ' . $key);
            }
        }

        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            $config['host'],
            $config['port'],
            $config['database'],
        );

        $pdo = new PDO($dsn, $config['username'], $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 3,
        ]);
        $pdo->exec("SET time_zone = '+08:00'");
        return $pdo;
    }
}
