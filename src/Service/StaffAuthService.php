<?php
declare(strict_types=1);
namespace App\Service;

use App\Core\StaffAccess;
use App\Domain\BookingError;
use PDO;

final class StaffAuthService
{
    // A real bcrypt hash ensures unknown/inactive accounts also incur password verification work.
    private const DUMMY_HASH = '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';

    public function __construct(
        private readonly PDO $pdo,
        private readonly BookingClock $clock,
    ) {}

    public static function password(string $password): string
    {
        if (
            strlen($password) < 15 ||
            strlen($password) > 72 ||
            str_contains($password, "\0")
        ) {
            throw new BookingError(
                "password_invalid",
                "Use a unique passphrase of 15–72 bytes. Spaces are allowed.",
            );
        }
        return password_hash($password, PASSWORD_BCRYPT, ["cost" => 12]);
    }

    public function login(string $email, string $password, string $ip): array
    {
        if (
            strlen($email) > 190 ||
            strlen($password) > 72 ||
            str_contains($password, "\0")
        ) {
            $password = "";
        }
        $email = strtolower(trim($email));
        $result = (new BookingTransaction($this->pdo))->run(function () use (
            $email,
            $password,
            $ip,
        ): array {
            $now = $this->clock->now();
            $keys = [
                hash("sha256", "account:" . $email) => 5,
                hash("sha256", "ip:" . $ip) => 30,
            ];
            ksort($keys);
            foreach ($keys as $key => $limit) {
                $this->pdo
                    ->prepare(
                        "INSERT IGNORE INTO staff_login_limits (key_hash, window_started_at) VALUES (?, ?)",
                    )
                    ->execute([$key, $now->format("Y-m-d H:i:s")]);
                $q = $this->pdo->prepare(
                    "SELECT * FROM staff_login_limits WHERE key_hash = ? FOR UPDATE",
                );
                $q->execute([$key]);
                $row = $q->fetch();
                if (
                    $row["window_started_at"] <=
                    $now->modify("-15 minutes")->format("Y-m-d H:i:s")
                ) {
                    $this->pdo
                        ->prepare(
                            "UPDATE staff_login_limits SET attempts = 0, window_started_at = ? WHERE key_hash = ?",
                        )
                        ->execute([$now->format("Y-m-d H:i:s"), $key]);
                    $row["attempts"] = 0;
                }
                if ((int) $row["attempts"] >= $limit) {
                    return ["error" => "rate_limited"];
                }
            }
            foreach ($keys as $key => $limit) {
                $this->pdo
                    ->prepare(
                        "UPDATE staff_login_limits SET attempts = attempts + 1 WHERE key_hash = ?",
                    )
                    ->execute([$key]);
            }
            $q = $this->pdo->prepare(
                "SELECT u.*, r.code AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE email = ? FOR UPDATE",
            );
            $q->execute([$email]);
            $user = $q->fetch();
            $valid = password_verify(
                $password,
                $user &&
                (int) $user["is_active"] &&
                $user["password_hash"] !== null
                    ? $user["password_hash"]
                    : self::DUMMY_HASH,
            );
            if (!$user || !(int) $user["is_active"] || !$valid) {
                $this->audit(null, "staff.login_failed", "auth", null, null, [
                    "account_key" => hash("sha256", "account:" . $email),
                ]);
                return ["error" => "login_failed"];
            }
            $this->pdo
                ->prepare("DELETE FROM staff_login_limits WHERE key_hash = ?")
                ->execute([hash("sha256", "account:" . $email)]);
            $this->pdo
                ->prepare("UPDATE users SET last_login_at = ? WHERE id = ?")
                ->execute([$now->format("Y-m-d H:i:s"), $user["id"]]);
            $this->audit(
                $user,
                "staff.login",
                "user",
                (string) $user["id"],
                null,
                null,
            );
            return ["user" => $user];
        });
        if (isset($result["error"])) {
            throw new BookingError(
                $result["error"],
                $result["error"] === "rate_limited"
                    ? "Too many attempts. Try again in 15 minutes."
                    : "Email or password is incorrect.",
                $result["error"] === "rate_limited" ? 429 : 401,
            );
        }
        return $result["user"];
    }

    public function issue(
        string $email,
        string $name,
        string $role,
        ?array $actor = null,
    ): array {
        $email = strtolower(trim($email));
        $name = trim($name);
        if (
            !filter_var($email, FILTER_VALIDATE_EMAIL) ||
            strlen($email) > 190 ||
            $name === "" ||
            strlen($name) > 120 ||
            preg_match('/[\x00-\x1F]/', $name) ||
            !array_key_exists($role, StaffAccess::PERMISSIONS)
        ) {
            throw new BookingError(
                "staff_input_invalid",
                "Check the staff name, email, and role.",
            );
        }
        $token = bin2hex(random_bytes(32));
        $issue = function () use (
            $email,
            $name,
            $role,
            $actor,
            $token,
        ): array {
            $this->pdo
                ->query(
                    "SELECT id FROM staff_security_lock WHERE id = 1 FOR UPDATE",
                )
                ->fetchColumn();
            $userActor =
                $actor === null
                    ? null
                    : StaffAccess::require(
                        $this->pdo,
                        $actor,
                        "staff.manage",
                        true,
                    );
            $roleQuery = $this->pdo->prepare(
                "SELECT id FROM roles WHERE code = ?",
            );
            $roleQuery->execute([$role]);
            $roleId = $roleQuery->fetchColumn();
            $q = $this->pdo->prepare(
                "SELECT * FROM users WHERE email = ? FOR UPDATE",
            );
            $q->execute([$email]);
            $target = $q->fetch();
            if ($target && (int) $target["is_active"]) {
                throw new BookingError(
                    "staff_already_active",
                    "Deactivate this account before issuing a new activation link.",
                    409,
                );
            }
            if ($target) {
                $this->pdo
                    ->prepare(
                        "UPDATE users SET role_id = ?, full_name = ?, password_hash = NULL, auth_version = auth_version + 1 WHERE id = ?",
                    )
                    ->execute([$roleId, $name, $target["id"]]);
                $id = (int) $target["id"];
            } else {
                $this->pdo
                    ->prepare(
                        "INSERT INTO users (role_id, email, full_name) VALUES (?, ?, ?)",
                    )
                    ->execute([$roleId, $email, $name]);
                $id = (int) $this->pdo->lastInsertId();
            }
            $now = $this->clock->now();
            $this->pdo
                ->prepare(
                    "UPDATE staff_activation_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL",
                )
                ->execute([$now->format("Y-m-d H:i:s"), $id]);
            $this->pdo
                ->prepare(
                    "INSERT INTO staff_activation_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
                )
                ->execute([
                    $id,
                    hash("sha256", $token),
                    $now->modify("+24 hours")->format("Y-m-d H:i:s"),
                ]);
            $this->audit(
                $userActor,
                "staff.invite",
                "user",
                (string) $id,
                null,
                ["email" => $email, "name" => $name, "role" => $role],
            );
            return [
                "activation_path" => "/staff/activate#token=" . $token,
                "expires_at" => $now
                    ->modify("+24 hours")
                    ->format("Y-m-d H:i:s"),
            ];
        };
        // Account-request approval wraps invitation and request state in one transaction.
        return $this->pdo->inTransaction() ? $issue() : (new BookingTransaction($this->pdo))->run($issue);
    }

    public function activate(string $token, string $password): array
    {
        if (!preg_match('/^[a-f0-9]{64}$/D', $token)) {
            throw new BookingError(
                "activation_invalid",
                "Activation link is invalid or expired.",
                404,
            );
        }
        // Reject random or expired capabilities before doing expensive password hashing.
        $preflight = $this->pdo->prepare(
            "SELECT t.expires_at, t.used_at, u.is_active FROM staff_activation_tokens t JOIN users u ON u.id=t.user_id WHERE t.token_hash=?",
        );
        $preflight->execute([hash("sha256", $token)]);
        $invitation = $preflight->fetch();
        if (
            !$invitation ||
            $invitation["used_at"] !== null ||
            (int) $invitation["is_active"] ||
            $invitation["expires_at"] <=
                $this->clock->now()->format("Y-m-d H:i:s")
        ) {
            throw new BookingError(
                "activation_invalid",
                "Activation link is invalid or expired.",
                404,
            );
        }
        $hash = self::password($password);
        return (new BookingTransaction($this->pdo))->run(function () use (
            $token,
            $hash,
        ): array {
            $this->pdo
                ->query(
                    "SELECT id FROM staff_security_lock WHERE id = 1 FOR UPDATE",
                )
                ->fetchColumn();
            $q = $this->pdo->prepare(
                "SELECT * FROM staff_activation_tokens WHERE token_hash = ? FOR UPDATE",
            );
            $q->execute([hash("sha256", $token)]);
            $invitation = $q->fetch();
            if (
                !$invitation ||
                $invitation["used_at"] !== null ||
                $invitation["expires_at"] <=
                    $this->clock->now()->format("Y-m-d H:i:s")
            ) {
                throw new BookingError(
                    "activation_invalid",
                    "Activation link is invalid or expired.",
                    404,
                );
            }
            $q = $this->pdo->prepare(
                "SELECT u.*, r.code AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ? FOR UPDATE",
            );
            $q->execute([$invitation["user_id"]]);
            $user = $q->fetch();
            if (
                (int) $user["is_active"] ||
                $invitation["expires_at"] <=
                    $this->clock->now()->format("Y-m-d H:i:s")
            ) {
                throw new BookingError(
                    "activation_invalid",
                    "Activation link is invalid or expired.",
                    404,
                );
            }
            $this->pdo
                ->prepare(
                    "UPDATE users SET password_hash = ?, is_active = 1, auth_version = auth_version + 1 WHERE id = ?",
                )
                ->execute([$hash, $user["id"]]);
            $this->pdo
                ->prepare(
                    "UPDATE staff_activation_tokens SET used_at = ? WHERE id = ?",
                )
                ->execute([
                    $this->clock->now()->format("Y-m-d H:i:s"),
                    $invitation["id"],
                ]);
            $user["password_hash"] = $hash;
            $user["is_active"] = 1;
            $user["auth_version"] = (int) $user["auth_version"] + 1;
            $this->audit(
                $user,
                "staff.activate",
                "user",
                (string) $user["id"],
                null,
                ["active" => true],
            );
            return $user;
        });
    }

    public function change(
        array $actor,
        int $id,
        string $role,
        bool $active,
    ): void {
        (new BookingTransaction($this->pdo))->run(function () use (
            $actor,
            $id,
            $role,
            $active,
        ): array {
            $this->pdo
                ->query(
                    "SELECT id FROM staff_security_lock WHERE id = 1 FOR UPDATE",
                )
                ->fetchColumn();
            $user = StaffAccess::require(
                $this->pdo,
                $actor,
                "staff.manage",
                true,
            );
            $q = $this->pdo->prepare(
                "SELECT u.*, r.code AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ? FOR UPDATE",
            );
            $q->execute([$id]);
            $target = $q->fetch();
            if (
                !$target ||
                !array_key_exists($role, StaffAccess::PERMISSIONS)
            ) {
                throw new BookingError(
                    "staff_input_invalid",
                    "Choose an existing staff account and role.",
                );
            }
            if ($active && $target["password_hash"] === null) {
                throw new BookingError(
                    "activation_required",
                    "This staff member must choose a password using an activation link.",
                    409,
                );
            }
            if (
                $target["role"] === "admin" &&
                (int) $target["is_active"] &&
                (!$active || $role !== "admin")
            ) {
                $count = (int) $this->pdo
                    ->query(
                        "SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'admin' AND u.is_active = 1",
                    )
                    ->fetchColumn();
                if ($count < 2) {
                    throw new BookingError(
                        "last_admin",
                        "Keep at least one active administrator.",
                        409,
                    );
                }
            }
            $q = $this->pdo->prepare("SELECT id FROM roles WHERE code = ?");
            $q->execute([$role]);
            $roleId = $q->fetchColumn();
            $this->pdo
                ->prepare(
                    "UPDATE users SET role_id = ?, is_active = ?, auth_version = auth_version + 1 WHERE id = ?",
                )
                ->execute([$roleId, (int) $active, $id]);
            if (!$active) {
                $this->pdo
                    ->prepare(
                        "UPDATE staff_activation_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL",
                    )
                    ->execute([
                        $this->clock->now()->format("Y-m-d H:i:s"),
                        $id,
                    ]);
            }
            $this->audit(
                $user,
                "staff.change",
                "user",
                (string) $id,
                [
                    "role" => $target["role"],
                    "active" => (bool) $target["is_active"],
                ],
                ["role" => $role, "active" => $active],
            );
            return [];
        });
    }

    public function audit(
        ?array $user,
        string $action,
        string $type,
        ?string $id,
        ?array $before,
        ?array $after,
    ): void {
        $this->pdo
            ->prepare(
                "INSERT INTO audit_log (actor_user_id, actor_role, action, entity_type, entity_id, before_json, after_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
            )
            ->execute([
                $user["id"] ?? null,
                $user["role"] ?? null,
                $action,
                $type,
                $id,
                $before === null
                    ? null
                    : json_encode($before, JSON_THROW_ON_ERROR),
                $after === null
                    ? null
                    : json_encode($after, JSON_THROW_ON_ERROR),
            ]);
    }
}
