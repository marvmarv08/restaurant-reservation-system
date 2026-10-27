<?php
declare(strict_types=1);
namespace App\Service;

use App\Core\StaffAccess;
use App\Domain\BookingError;
use DateTimeImmutable;
use PDO;

final class WaitlistService
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly BookingClock $clock,
    ) {}

    public function tableIds(): array
    {
        return array_map(
            "intval",
            $this->pdo
                ->query("SELECT id FROM `tables` ORDER BY id")
                ->fetchAll(PDO::FETCH_COLUMN),
        );
    }

    // Caller owns the service-date lock and all physical-table locks before any row mutation.
    public function promoteLocked(string $date, ?array $user = null): array
    {
        $policy = new BookingPolicy($this->pdo);
        $now = $this->clock->now();
        $query = $this->pdo
            ->prepare("SELECT r.*, rt.code AS room_code, g.email, g.phone FROM reservations r
            JOIN room_types rt ON rt.id = r.room_type_id JOIN guests g ON g.id = r.guest_id
            WHERE r.status = 'waitlisted' AND r.starts_at >= ? AND r.starts_at < ? ORDER BY r.starts_at, r.waitlist_rank, r.id FOR UPDATE");
        $query->execute([$date . " 00:00:00", $date . " 23:59:59"]);
        $rows = $query->fetchAll();
        $offered = [];
        foreach ($rows as $row) {
            $q = $this->pdo->prepare(
                "SELECT h.* FROM waitlist_offers o JOIN holds h ON h.id = o.hold_id WHERE o.reservation_id = ? FOR UPDATE",
            );
            $q->execute([$row["id"]]);
            $old = $q->fetch();
            if (
                $old &&
                $old["status"] === "active" &&
                $old["expires_at"] > $now->format("Y-m-d H:i:s")
            ) {
                continue;
            }
            if ($row["waitlist_offer_state"] === "offered") {
                if ($old && $old["status"] === "active") {
                    $this->pdo
                        ->prepare(
                            "UPDATE holds SET status = 'expired' WHERE id = ?",
                        )
                        ->execute([$old["id"]]);
                }
                $q = $this->pdo->prepare(
                    "SELECT COALESCE(MAX(waitlist_rank), 0) + 1 FROM reservations WHERE status = 'waitlisted' AND starts_at = ?",
                );
                $q->execute([$row["starts_at"]]);
                $rank = (int) $q->fetchColumn();
                $this->pdo
                    ->prepare(
                        "UPDATE reservations SET waitlist_offer_state = 'expired', waitlist_offer_expires_at = NULL, waitlist_rank = ?, version = version + 1 WHERE id = ?",
                    )
                    ->execute([$rank, $row["id"]]);
                $this->audit(
                    $user,
                    "waitlist.expire",
                    $row["id"],
                    ["rank" => $row["waitlist_rank"]],
                    ["rank" => $rank],
                );
                continue; // Give the next eligible party a turn before retrying this expired offer.
            }
            $start = new DateTimeImmutable(
                $row["starts_at"],
                $policy->timezone,
            );
            if ($start <= $now) {
                continue;
            }
            try {
                $policy->date($date, $now);
            } catch (BookingError) {
                continue;
            }
            $eligibleAt = $this->eligibleAt($row, $policy);
            $options = (new AvailabilityService(
                $this->pdo,
                $this->clock,
            ))->options(
                $start,
                (int) $row["party_size"],
                $row["room_code"],
                $now,
                null,
                $eligibleAt,
                $policy,
            );
            if ($options === []) {
                continue;
            }
            $option = $options[0];
            $expires = $now
                ->modify("+" . $policy->number("hold_ttl_sec") . " seconds")
                ->format("Y-m-d H:i:s");
            $hex = bin2hex(random_bytes(16));
            $holdToken =
                substr($hex, 0, 8) .
                "-" .
                substr($hex, 8, 4) .
                "-" .
                substr($hex, 12, 4) .
                "-" .
                substr($hex, 16, 4) .
                "-" .
                substr($hex, 20);
            $this->pdo
                ->prepare(
                    'INSERT INTO holds (hold_token, table_id, table_group_id, starts_at, ends_at, blocks_until, party_size, waitlist_reservation_id, expires_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                )
                ->execute([
                    $holdToken,
                    $option["kind"] === "table" ? $option["id"] : null,
                    $option["kind"] === "group" ? $option["id"] : null,
                    $option["starts_at"],
                    $option["ends_at"],
                    $option["blocks_until"],
                    $row["party_size"],
                    $row["id"],
                    $expires,
                    $now->format("Y-m-d H:i:s"),
                ]);
            $holdId = (int) $this->pdo->lastInsertId();
            foreach ($option["table_ids"] as $id) {
                $this->pdo
                    ->prepare(
                        "INSERT INTO hold_tables (hold_id, table_id) VALUES (?, ?)",
                    )
                    ->execute([$holdId, $id]);
            }
            $this->pdo
                ->prepare(
                    "INSERT INTO waitlist_offers (reservation_id, hold_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE hold_id = ?, offered_at = CURRENT_TIMESTAMP",
                )
                ->execute([$row["id"], $holdId, $holdId]);
            $this->pdo
                ->prepare(
                    "UPDATE reservations SET waitlist_offer_state = 'offered', waitlist_offer_expires_at = ?, version = version + 1 WHERE id = ?",
                )
                ->execute([$expires, $row["id"]]);
            $channel = $row["email"] !== null ? "email" : "sms";
            $recipient = $row["email"] ?? $row["phone"];
            $this->pdo
                ->prepare(
                    "INSERT INTO outbox (reservation_id, channel, recipient, subject, body) VALUES (?, ?, ?, ?, ?)",
                )
                ->execute([
                    $row["id"],
                    $channel,
                    $recipient,
                    "Bella Vista Dining waitlist offer",
                    "Demo notification: " .
                    $row["code"] .
                    ", tables held until " .
                    $expires .
                    " Asia/Manila. Contact the host to accept. No message was sent.",
                ]);
            $this->audit($user, "waitlist.offer", $row["id"], null, [
                "hold_id" => $holdId,
                "tables" => $option["table_ids"],
                "expires_at" => $expires,
            ]);
            $offered[] = $row["code"];
        }
        return $offered;
    }

    public function promote(array $actor, string $date): array
    {
        (new BookingPolicy($this->pdo))->date($date, $this->clock->now());
        return (new BookingTransaction($this->pdo))->run(function () use (
            $actor,
            $date,
        ): array {
            $tx = new BookingTransaction($this->pdo);
            $tx->lockDays([$date]);
            $tx->lockTables($this->tableIds(), false);
            $user = StaffAccess::require(
                $this->pdo,
                $actor,
                "reservations.write",
                true,
            );
            return ["offered" => $this->promoteLocked($date, $user)];
        });
    }

    public function claimLocked(array $row, array $user): void
    {
        $policy = new BookingPolicy($this->pdo);
        $now = $this->clock->now();
        $q = $this->pdo->prepare(
            "SELECT h.* FROM waitlist_offers o JOIN holds h ON h.id = o.hold_id WHERE o.reservation_id = ? FOR UPDATE",
        );
        $q->execute([$row["id"]]);
        $hold = $q->fetch();
        if (
            !$hold ||
            $hold["status"] !== "active" ||
            $hold["expires_at"] <= $now->format("Y-m-d H:i:s") ||
            $row["waitlist_offer_state"] !== "offered"
        ) {
            throw new BookingError(
                "offer_expired",
                "This offer has expired. Recheck the waitlist for a new available table.",
                410,
            );
        }
        $q = $this->pdo->prepare(
            "SELECT table_id FROM hold_tables WHERE hold_id = ? ORDER BY table_id",
        );
        $q->execute([$hold["id"]]);
        $ids = array_map("intval", $q->fetchAll(PDO::FETCH_COLUMN));
        $start = new DateTimeImmutable($row["starts_at"], $policy->timezone);
        $policy->date($start->format("Y-m-d"), $now);
        $eligibleAt = $this->eligibleAt($row, $policy);
        $options = (new AvailabilityService($this->pdo, $this->clock))->options(
            $start,
            (int) $row["party_size"],
            $row["room_code"],
            $now,
            (int) $hold["id"],
            $eligibleAt,
            $policy,
            true,
        );
        $matched = null;
        foreach ($options as $option) {
            if (
                $option["table_ids"] === $ids &&
                $option["starts_at"] === $hold["starts_at"] &&
                $option["ends_at"] === $hold["ends_at"] &&
                $option["blocks_until"] === $hold["blocks_until"]
            ) {
                $matched = $option;
            }
        }
        if ($matched === null) {
            throw new BookingError(
                "inventory_changed",
                "The offer no longer fits current booking rules. Recheck availability.",
                409,
            );
        }
        foreach ($ids as $id) {
            $this->pdo
                ->prepare(
                    "INSERT INTO reservation_tables (reservation_id, table_id, slot_start) VALUES (?, ?, ?)",
                )
                ->execute([$row["id"], $id, $matched["starts_at"]]);
        }
        $status = $matched["approval_required"] ? "pending" : "confirmed";
        $this->pdo
            ->prepare(
                "UPDATE reservations SET status = ?, table_group_id = ?, ends_at = ?, blocks_until = ?, turn_time_min = ?, approval_state = ?, waitlist_offer_state = 'accepted', version = version + 1 WHERE id = ?",
            )
            ->execute([
                $status,
                $matched["kind"] === "group" ? $matched["id"] : null,
                $matched["ends_at"],
                $matched["blocks_until"],
                $matched["turn_time_min"],
                $matched["approval_required"] ? "awaiting" : "not_required",
                $row["id"],
            ]);
        $this->pdo
            ->prepare("UPDATE holds SET status = 'consumed' WHERE id = ?")
            ->execute([$hold["id"]]);
        $this->pdo
            ->prepare(
                "INSERT INTO hold_reservations (hold_id, reservation_id) VALUES (?, ?)",
            )
            ->execute([$hold["id"], $row["id"]]);
        $this->pdo
            ->prepare(
                "INSERT INTO reservation_status_history (reservation_id, from_status, to_status, actor_user_id, reason) VALUES (?, ?, ?, ?, ?)",
            )
            ->execute([
                $row["id"],
                "waitlisted",
                $status,
                $user["id"],
                "Host accepted waitlist offer",
            ]);
        $this->audit(
            $user,
            "waitlist.accept",
            $row["id"],
            ["status" => "waitlisted"],
            ["status" => $status, "tables" => $ids],
        );
    }

    private function eligibleAt(
        array $row,
        BookingPolicy $policy,
    ): DateTimeImmutable {
        $start = new DateTimeImmutable($row["starts_at"], $policy->timezone);
        if (
            $row["source"] === "walk_in" &&
            in_array($row["room_code"], ["common", "terrace"], true)
        ) {
            return $start->modify(
                "-" . $policy->number("min_lead_time_min") . " minutes",
            );
        }
        return new DateTimeImmutable($row["created_at"], $policy->timezone);
    }

    private function audit(
        ?array $user,
        string $action,
        int|string $id,
        ?array $before,
        ?array $after,
    ): void {
        (new StaffAuthService($this->pdo, $this->clock))->audit(
            $user,
            $action,
            "reservation",
            (string) $id,
            $before,
            $after,
        );
    }
}
