<?php
declare(strict_types=1);

namespace App\Core;

use App\Domain\BookingError;
use RuntimeException;

final class GuestSession
{
    private function __construct(public readonly string $ownerHash, public readonly string $csrfToken,
        public readonly string $managementSeed)
    {
    }

    public static function open(): self
    {
        ini_set('session.use_strict_mode', '1');
        session_name('TABLEBOOK_GUEST');
        session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true,
            'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'samesite' => 'Lax']);
        if (!session_start()) {
            throw new RuntimeException('Cannot start guest session');
        }
        $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
        $_SESSION['management_seed'] ??= bin2hex(random_bytes(32));
        $session = new self(hash('sha256', session_id()), $_SESSION['csrf'], $_SESSION['management_seed']);
        // Release the PHP file lock so concurrent requests reach the database race checks.
        session_write_close();
        return $session;
    }

    public function requireCsrf(Request $request): void
    {
        if (!hash_equals($this->csrfToken, $request->header('X-CSRF-Token'))) {
            throw new BookingError('csrf_failed', 'Refresh your guest session and retry.', 403);
        }
    }
}
