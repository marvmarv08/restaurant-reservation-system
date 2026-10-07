<?php
declare(strict_types=1);
namespace App\Core;

use App\Domain\BookingError;
use PDO;

final class StaffAccess
{
    public const PERMISSIONS = [
        "admin" => [
            "reservations.delete",
            "reservations.read",
            "reservations.write",
            "reservations.approve",
            "settings.read",
            "settings.write",
            "settings.service",
            "staff.manage",
            "audit.read",
            "orders.read",
            "orders.write",
            "kitchen.read",
            "kitchen.write",
            "orders.void",
        ],
        "manager" => [
            "reservations.read",
            "reservations.write",
            "reservations.approve",
            "settings.read",
            "settings.service",
            "audit.read",
            "orders.read",
            "orders.write",
            "kitchen.read",
            "kitchen.write",
            "orders.void",
        ],
        "host" => ["reservations.read", "reservations.write"],
        "server" => ["orders.read", "orders.write"],
        "kitchen" => ["kitchen.read", "kitchen.write"],
    ];

    public static function stamp(array $user): string
    {
        return hash(
            "sha256",
            $user["id"] .
                ":" .
                $user["role_id"] .
                ":" .
                $user["is_active"] .
                ":" .
                $user["password_hash"] .
                ":" .
                $user["auth_version"],
        );
    }

    public static function require(
        PDO $pdo,
        array $actor,
        string $permission,
        bool $lock = false,
    ): array {
        $query = $pdo->prepare(
            "SELECT u.*, r.code AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?" .
                ($lock ? " FOR UPDATE" : ""),
        );
        $query->execute([$actor["id"] ?? 0]);
        $user = $query->fetch();
        if (
            !$user ||
            !(int) $user["is_active"] ||
            !hash_equals(self::stamp($user), $actor["stamp"] ?? "")
        ) {
            throw new BookingError(
                "staff_session_invalid",
                "Your staff session ended. Sign in again.",
                401,
            );
        }
        $now = (new \App\Service\BookingClock($pdo))->now()->getTimestamp();
        if (isset($actor["expires_at"]) && $now >= $actor["expires_at"]) {
            throw new BookingError(
                "staff_session_invalid",
                "Your staff session ended. Sign in again.",
                401,
            );
        }
        if (
            $lock &&
            $permission === "staff.manage" &&
            isset($actor["authenticated_at"]) &&
            $now - $actor["authenticated_at"] >= 900
        ) {
            throw new BookingError(
                "reauth_required",
                "Sign out and sign in again before managing staff accounts.",
                403,
            );
        }
        if (
            !in_array($permission, self::PERMISSIONS[$user["role"]] ?? [], true)
        ) {
            throw new BookingError(
                "staff_forbidden",
                "Your role cannot perform this action.",
                403,
            );
        }
        return $user;
    }

    public static function publicUser(array $user): array
    {
        return [
            "id" => (int) $user["id"],
            "full_name" => $user["full_name"],
            "email" => $user["email"],
            "role" => $user["role"],
            "permissions" => self::PERMISSIONS[$user["role"]] ?? [],
        ];
    }
}
