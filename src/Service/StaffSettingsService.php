<?php
declare(strict_types=1);
namespace App\Service;

use App\Core\StaffAccess;
use App\Domain\BookingError;
use PDO;

final class StaffSettingsService
{
    public const LIMITS = [
        "slot_interval_min" => [5, 60],
        "buffer_min" => [0, 60],
        "hold_ttl_sec" => [60, 900],
        "min_lead_time_min" => [0, 1440],
        "max_lead_time_days" => [1, 365],
        "max_party_online" => [1, 16],
        "max_covers_per_slot" => [1, 200],
        "max_reservations_per_slot" => [1, 50],
        "cancel_cutoff_min" => [0, 1440],
        "no_show_grace_min" => [5, 120],
        "manager_approval_party_min" => [2, 16],
    ];

    public function __construct(
        private readonly PDO $pdo,
        private readonly BookingClock $clock,
    ) {}

    public function get(array $actor): array
    {
        StaffAccess::require($this->pdo, $actor, "settings.read");
        return $this->snapshot();
    }

    private function snapshot(): array
    {
        $data = [
            "settings" => $this->pdo
                ->query("SELECT skey, svalue FROM settings ORDER BY skey")
                ->fetchAll(PDO::FETCH_KEY_PAIR),
            "hours" => $this->pdo
                ->query("SELECT * FROM opening_hours ORDER BY id")
                ->fetchAll(),
            "turns" => $this->pdo
                ->query("SELECT * FROM turn_times ORDER BY id")
                ->fetchAll(),
            "pacing" => $this->pdo
                ->query("SELECT * FROM pacing_rules ORDER BY id")
                ->fetchAll(),
        ];
        return $data + [
            "revision" => hash(
                "sha256",
                json_encode($data, JSON_THROW_ON_ERROR),
            ),
            "limits" => self::LIMITS,
        ];
    }

    public function save(
        array $actor,
        string $revision,
        string $kind,
        array $values,
    ): array {
        if (
            !in_array($kind, ["settings", "hours", "turns", "pacing"], true) ||
            $values === [] ||
            count($values) > 30
        ) {
            throw new BookingError(
                "invalid_settings",
                "Choose valid settings to save.",
            );
        }
        return (new BookingTransaction($this->pdo))->run(function () use (
            $actor,
            $revision,
            $kind,
            $values,
        ): array {
            (new BookingTransaction($this->pdo))->lockTables(
                (new WaitlistService($this->pdo, $this->clock))->tableIds(),
                false,
            );
            $user = StaffAccess::require(
                $this->pdo,
                $actor,
                in_array($kind, ["hours", "turns"], true)
                    ? "settings.service"
                    : "settings.write",
                true,
            );
            $before = $this->snapshot();
            if (!hash_equals($before["revision"], $revision)) {
                throw new BookingError(
                    "settings_changed",
                    "Settings changed in another tab. Reload before saving.",
                    409,
                );
            }
            if ($kind === "settings") {
                foreach ($values as $key => $value) {
                    if ($key === "last_seating_time") {
                        $this->time($value);
                    } elseif (
                        !isset(self::LIMITS[$key]) ||
                        !is_int($value) ||
                        $value < self::LIMITS[$key][0] ||
                        $value > self::LIMITS[$key][1]
                    ) {
                        throw new BookingError(
                            "invalid_settings",
                            "Check the value for " . $key,
                        );
                    }
                    $this->pdo
                        ->prepare(
                            "UPDATE settings SET svalue = ? WHERE skey = ?",
                        )
                        ->execute([(string) $value, $key]);
                }
            } else {
                foreach ($values as $row) {
                    if (!is_array($row) || !is_int($row["id"] ?? null)) {
                        throw new BookingError(
                            "invalid_settings",
                            "Choose an existing configuration row.",
                        );
                    }
                    if ($kind === "hours") {
                        $this->time($row["open_time"] ?? null);
                        $this->time($row["close_time"] ?? null);
                        if (
                            $row["open_time"] >= $row["close_time"] ||
                            !is_bool($row["is_closed"] ?? null)
                        ) {
                            throw new BookingError(
                                "invalid_settings",
                                "Closing time must be after opening time.",
                            );
                        }
                        $this->exists("opening_hours", $row["id"]);
                        $this->pdo
                            ->prepare(
                                "UPDATE opening_hours SET open_time = ?, close_time = ?, is_closed = ? WHERE id = ?",
                            )
                            ->execute([
                                $row["open_time"],
                                $row["close_time"],
                                (int) $row["is_closed"],
                                $row["id"],
                            ]);
                    } elseif ($kind === "turns") {
                        if (
                            !is_int($row["turn_time_min"] ?? null) ||
                            $row["turn_time_min"] < 30 ||
                            $row["turn_time_min"] > 240
                        ) {
                            throw new BookingError(
                                "invalid_settings",
                                "Dining time must be 30–240 minutes.",
                            );
                        }
                        $this->exists("turn_times", $row["id"]);
                        $this->pdo
                            ->prepare(
                                "UPDATE turn_times SET turn_time_min = ? WHERE id = ?",
                            )
                            ->execute([$row["turn_time_min"], $row["id"]]);
                    } else {
                        foreach (["max_covers", "max_reservations"] as $key) {
                            if (
                                !is_int($row[$key] ?? null) ||
                                $row[$key] < 1 ||
                                $row[$key] > ($key === "max_covers" ? 200 : 50)
                            ) {
                                throw new BookingError(
                                    "invalid_settings",
                                    "Check service pacing caps.",
                                );
                            }
                        }
                        $this->exists("pacing_rules", $row["id"]);
                        $this->pdo
                            ->prepare(
                                "UPDATE pacing_rules SET max_covers = ?, max_reservations = ? WHERE id = ?",
                            )
                            ->execute([
                                $row["max_covers"],
                                $row["max_reservations"],
                                $row["id"],
                            ]);
                    }
                }
            }
            $after = $this->snapshot();
            (new StaffAuthService($this->pdo, $this->clock))->audit(
                $user,
                "settings." . $kind,
                "settings",
                $kind,
                $before,
                $after,
            );
            return $after;
        });
    }

    public function blackout(array $actor, array $data): array
    {
        return (new BookingTransaction($this->pdo))->run(function () use (
            $actor,
            $data,
        ): array {
            (new BookingTransaction($this->pdo))->lockTables(
                (new WaitlistService($this->pdo, $this->clock))->tableIds(),
                false,
            );
            $user = StaffAccess::require(
                $this->pdo,
                $actor,
                "settings.service",
                true,
            );
            if (isset($data["delete_id"])) {
                $q = $this->pdo->prepare(
                    "SELECT * FROM blackout_dates WHERE id = ? FOR UPDATE",
                );
                $q->execute([$data["delete_id"]]);
                $before = $q->fetch();
                if (
                    !$before ||
                    !str_starts_with($before["reason"], "Staff blackout: ")
                ) {
                    throw new BookingError(
                        "invalid_blackout",
                        "Only staff-created blackouts can be removed.",
                    );
                }
                $this->pdo
                    ->prepare("DELETE FROM blackout_dates WHERE id = ?")
                    ->execute([$before["id"]]);
                (new StaffAuthService($this->pdo, $this->clock))->audit(
                    $user,
                    "blackout.remove",
                    "blackout",
                    (string) $before["id"],
                    $before,
                    null,
                );
                return [];
            }
            $scope = $data["scope"] ?? "";
            $scopeId = $data["scope_id"] ?? null;
            if (
                !in_array(
                    $scope,
                    ["venue", "room_type", "room", "table"],
                    true,
                ) ||
                ($scope !== "venue" && (!is_int($scopeId) || $scopeId < 1)) ||
                !is_string($data["reason"] ?? null) ||
                strlen(trim($data["reason"])) < 3 ||
                strlen($data["reason"]) > 130 ||
                preg_match('/[\x00-\x1F]/', $data["reason"])
            ) {
                throw new BookingError(
                    "invalid_blackout",
                    "Check blackout scope and reason.",
                );
            }
            if (
                !is_string($data["starts_at"] ?? null) ||
                !is_string($data["ends_at"] ?? null)
            ) {
                throw new BookingError(
                    "invalid_blackout",
                    "Choose a valid blackout interval.",
                );
            }
            $zone = new \DateTimeZone("Asia/Manila");
            $start = \DateTimeImmutable::createFromFormat(
                "!Y-m-d H:i",
                $data["starts_at"] ?? "",
                $zone,
            );
            $end = \DateTimeImmutable::createFromFormat(
                "!Y-m-d H:i",
                $data["ends_at"] ?? "",
                $zone,
            );
            if (
                !$start ||
                !$end ||
                $start->format("Y-m-d H:i") !== $data["starts_at"] ||
                $end->format("Y-m-d H:i") !== $data["ends_at"] ||
                $end <= $start ||
                $end <= $this->clock->now()
            ) {
                throw new BookingError(
                    "invalid_blackout",
                    "Choose a valid upcoming blackout interval.",
                );
            }
            if ($scope !== "venue") {
                $table = [
                    "room_type" => "room_types",
                    "room" => "rooms",
                    "table" => "tables",
                ][$scope];
                $this->exists($table, $scopeId);
            }
            $where = match ($scope) {
                "venue" => "1 = 1",
                "room_type" => "ro.room_type_id = ?",
                "room" => "ro.id = ?",
                "table" => "t.id = ?",
            };
            $args = $scope === "venue" ? [] : [$scopeId];
            $q = $this->pdo->prepare(
                "SELECT COUNT(*) FROM reservation_tables rt JOIN reservations r ON r.id = rt.reservation_id JOIN `tables` t ON t.id = rt.table_id JOIN rooms ro ON ro.id = t.room_id WHERE rt.released_at IS NULL AND r.status IN ('pending','confirmed','seated') AND r.starts_at < ? AND r.blocks_until > ? AND " .
                    $where,
            );
            $q->execute([
                $end->format("Y-m-d H:i:s"),
                $start->format("Y-m-d H:i:s"),
                ...$args,
            ]);
            if ((int) $q->fetchColumn()) {
                throw new BookingError(
                    "blackout_conflict",
                    "Existing bookings overlap this blackout. Review them before blocking service.",
                    409,
                );
            }
            $q = $this->pdo->prepare(
                "SELECT COUNT(*) FROM hold_tables ht JOIN holds h ON h.id = ht.hold_id JOIN `tables` t ON t.id = ht.table_id JOIN rooms ro ON ro.id = t.room_id WHERE h.status = 'active' AND h.expires_at > ? AND h.starts_at < ? AND h.blocks_until > ? AND " .
                    $where,
            );
            $q->execute([
                $this->clock->now()->format("Y-m-d H:i:s"),
                $end->format("Y-m-d H:i:s"),
                $start->format("Y-m-d H:i:s"),
                ...$args,
            ]);
            if ((int) $q->fetchColumn()) {
                throw new BookingError(
                    "blackout_conflict",
                    "An active table hold overlaps this blackout. Wait for it to finish.",
                    409,
                );
            }
            $this->pdo
                ->prepare(
                    "INSERT INTO blackout_dates (scope, scope_id, starts_at, ends_at, reason) VALUES (?, ?, ?, ?, ?)",
                )
                ->execute([
                    $scope,
                    $scope === "venue" ? null : $scopeId,
                    $start->format("Y-m-d H:i:s"),
                    $end->format("Y-m-d H:i:s"),
                    "Staff blackout: " . trim($data["reason"]),
                ]);
            $id = (int) $this->pdo->lastInsertId();
            (new StaffAuthService($this->pdo, $this->clock))->audit(
                $user,
                "blackout.create",
                "blackout",
                (string) $id,
                null,
                [
                    "scope" => $scope,
                    "scope_id" => $scopeId,
                    "starts_at" => $data["starts_at"],
                    "ends_at" => $data["ends_at"],
                    "reason" => $data["reason"],
                ],
            );
            return ["id" => $id];
        });
    }

    private function time(mixed $value): void
    {
        if (
            !is_string($value) ||
            !preg_match('/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/D', $value)
        ) {
            throw new BookingError(
                "invalid_settings",
                "Use a valid HH:MM time.",
            );
        }
    }

    private function exists(string $table, int $id): void
    {
        $q = $this->pdo->prepare(
            "SELECT id FROM `" . $table . "` WHERE id = ?",
        );
        $q->execute([$id]);
        if ($q->fetchColumn() === false) {
            throw new BookingError(
                "invalid_settings",
                "The selected row no longer exists.",
            );
        }
    }
}
