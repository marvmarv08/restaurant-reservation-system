<?php
declare(strict_types=1);
namespace App\Core;

use App\Domain\BookingError;
use App\Service\BookingClock;
use PDO;

final class StaffSession
{
    private function __construct(
        public readonly string $csrfToken,
        public readonly ?array $actor,
        public readonly int $authenticatedAt,
    ) {}

    private static function start(): void
    {
        ini_set("session.use_strict_mode", "1");
        ini_set("session.use_only_cookies", "1");
        session_name("TABLEBOOK_STAFF");
        session_set_cookie_params([
            "lifetime" => 0,
            "path" => "/",
            "httponly" => true,
            "secure" => isset($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off",
            "samesite" => "Strict",
        ]);
        if (!session_start()) {
            throw new \RuntimeException("Cannot open staff session");
        }
    }

    public static function open(PDO $pdo): self
    {
        self::start();
        $now = (new BookingClock($pdo))->now()->getTimestamp();
        $actor = $_SESSION["actor"] ?? null;
        $issued = (int) ($_SESSION["issued"] ?? 0);
        if ($actor !== null) {
            $query = $pdo->prepare("SELECT * FROM users WHERE id = ?");
            $query->execute([$actor["id"] ?? 0]);
            $user = $query->fetch();
            if (
                !$user ||
                !(int) $user["is_active"] ||
                !hash_equals(
                    StaffAccess::stamp($user),
                    $actor["stamp"] ?? "",
                ) ||
                $now - (int) ($_SESSION["seen"] ?? 0) >= 1800 ||
                $now - $issued >= 28800
            ) {
                session_regenerate_id(true);
                $_SESSION = [];
                $actor = null;
                $issued = 0;
            } else {
                $_SESSION["seen"] = $now;
            }
        }
        $_SESSION["csrf"] ??= bin2hex(random_bytes(32));
        $session = new self($_SESSION["csrf"], $actor, $issued);
        session_write_close();
        return $session;
    }

    public function csrf(Request $request): void
    {
        if (!hash_equals($this->csrfToken, $request->header("X-CSRF-Token"))) {
            throw new BookingError(
                "csrf_failed",
                "Reload this page before trying again.",
                403,
            );
        }
    }

    public function requireActor(): array
    {
        if ($this->actor === null) {
            throw new BookingError(
                "staff_login_required",
                "Sign in to continue.",
                401,
            );
        }
        return array_merge($this->actor, [
            "expires_at" => $this->authenticatedAt + 28800,
            "authenticated_at" => $this->authenticatedAt,
        ]);
    }

    public function requireRecent(PDO $pdo): void
    {
        $this->requireActor();
        if (
            (new BookingClock($pdo))->now()->getTimestamp() -
                $this->authenticatedAt >=
            900
        ) {
            throw new BookingError(
                "reauth_required",
                "Sign out and sign in again before managing staff accounts.",
                403,
            );
        }
    }

    public function establish(array $user, int $now): void
    {
        self::start();
        session_regenerate_id(true);
        $_SESSION = [
            "actor" => [
                "id" => (int) $user["id"],
                "stamp" => StaffAccess::stamp($user),
            ],
            "issued" => $now,
            "seen" => $now,
            "csrf" => bin2hex(random_bytes(32)),
        ];
        session_write_close();
    }

    public function logout(): void
    {
        self::start();
        $_SESSION = [];
        session_regenerate_id(true);
        $_SESSION["csrf"] = bin2hex(random_bytes(32));
        session_write_close();
    }
}
