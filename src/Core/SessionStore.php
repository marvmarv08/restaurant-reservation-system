<?php
declare(strict_types=1);
namespace App\Core;

use RuntimeException;

final class SessionStore
{
    private static bool $configured = false;

    public static function configure(): void
    {
        if (self::$configured) return;
        $driver = getenv('SESSION_DRIVER') ?: 'files';
        if (!in_array($driver, ['files', 'database'], true)) {
            throw new RuntimeException('Unsupported session storage driver.');
        }
        if (getenv('APP_ENV') === 'hosted' && $driver !== 'database') {
            throw new RuntimeException('Hosted sessions require database storage.');
        }
        if ($driver === 'database') {
            // Session locks and writes must not share the application's transaction connection.
            $pdo = Database::connect(require dirname(__DIR__, 2) . '/config/database.php');
            if (!session_set_save_handler(new DatabaseSessionHandler($pdo), true)) {
                throw new RuntimeException('Cannot configure session storage.');
            }
        }
        self::$configured = true;
    }

    public static function secureCookie(): bool
    {
        return getenv('APP_ENV') === 'hosted' || (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    }
}
