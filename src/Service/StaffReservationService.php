<?php
declare(strict_types=1);
namespace App\Service;

use App\Core\StaffAccess;
use App\Domain\BookingError;
use DateTimeImmutable;
use PDO;
use PDOException;

final class StaffReservationService
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly BookingClock $clock,
    ) {}

    public function availability(
        array $actor,
        string $date,
        int $party,
        string $room,
        string $source = "phone",
        ?string $code = null,
    ): array {
        StaffAccess::require($this->pdo, $actor, "reservations.read");
        $policy = new BookingPolicy($this->pdo);
        $now = $this->clock->now();
        $day = $policy->date($date, $now);
        $policy->validateParty($party);
        $types = $policy->types($room);
        $original = $code === null ? null : $this->row($code);
        $exclude = $original === null ? null : (int) $original["id"];
        $slots = [];
        if (!in_array($source, ["phone", "walk_in"], true)) {
            throw new BookingError(
                "invalid_source",
                "Choose phone or walk-in.",
            );
        }
        $snapshot = new AvailabilitySnapshot($this->pdo, $day, $now, $exclude);
        $availability = new AvailabilityService($this->pdo, $this->clock);
        foreach ($policy->starts($day, $types) as $start) {
            $eligible =
                $source === "walk_in" &&
                in_array($room, ["common", "terrace"], true)
                    ? $start->modify(
                        "-" . $policy->number("min_lead_time_min") . " minutes",
                    )
                    : $now;
            if (
                $original &&
                $source !== "walk_in" &&
                $room === $original["room_code"] &&
                $start->format("Y-m-d H:i:s") === $original["starts_at"]
            ) {
                $eligible = new DateTimeImmutable(
                    $original["created_at"],
                    $policy->timezone,
                );
            }
            $options = $availability->options(
                $start,
                $party,
                $room,
                $now,
                null,
                $eligible,
                $policy,
                false,
                $exclude,
                $snapshot,
            );
            if ($options !== []) {
                $slots[] = [
                    "time" => $start->format("H:i"),
                    "options" => $options,
                ];
            }
        }
        return [
            "slots" => $slots,
            "date" => $date,
            "party_size" => $party,
            "room_type" => $room,
            "timezone" => "Asia/Manila",
        ];
    }

    public function create(
        array $actor,
        array $input,
        bool $waitlist = false,
    ): array {
        $policy = new BookingPolicy($this->pdo);
        $start = $policy->start(
            $input["date"],
            $input["time"],
            $this->clock->now(),
        );
        $party = $input["party_size"];
        $room = $input["room_type"];
        $policy->validateParty($party);
        $types = $policy->types($room);
        if (
            $room === "any" ||
            !in_array($input["source"], ["phone", "walk_in"], true)
        ) {
            throw new BookingError(
                "invalid_source",
                "Choose a specific room and phone or walk-in source.",
            );
        }
        $details = (new BookingService(
            $this->pdo,
            $this->clock,
        ))->validateGuest($input["guest"]);
        $requestKey = $input["request_key"] ?? null;
        if (
            $requestKey !== null &&
            !preg_match(
                '/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/D',
                $requestKey,
            )
        ) {
            throw new BookingError(
                "invalid_request",
                "Use a valid request key.",
            );
        }
        $payloadHash = hash(
            "sha256",
            json_encode(
                $input + ["waitlist" => $waitlist],
                JSON_THROW_ON_ERROR,
            ),
        );
        return (new BookingTransaction($this->pdo))->run(function () use (
            $actor,
            $input,
            $waitlist,
            $details,
            $party,
            $room,
            $requestKey,
            $payloadHash,
        ): array {
            $tx = new BookingTransaction($this->pdo);
            $tx->lockDays([$input["date"]]);
            $tx->lockTables(
                (new WaitlistService($this->pdo, $this->clock))->tableIds(),
                false,
            );
            $user = StaffAccess::require(
                $this->pdo,
                $actor,
                "reservations.write",
                true,
            );
            if ($requestKey !== null) {
                $saved = $this->pdo->prepare(
                    "SELECT s.payload_hash,r.code,r.status,r.version FROM staff_requests s JOIN reservations r ON r.id=s.reservation_id WHERE s.user_id=? AND s.request_key=? FOR UPDATE",
                );
                $saved->execute([$user["id"], $requestKey]);
                $row = $saved->fetch();
                if ($row) {
                    if (!hash_equals($row["payload_hash"], $payloadHash)) {
                        throw new BookingError(
                            "request_changed",
                            "A booking was already saved for this request. Reload its details before changing it.",
                            409,
                        );
                    }
                    return [
                        "code" => $row["code"],
                        "status" => $row["status"],
                        "version" => (int) $row["version"],
                    ];
                }
            }
            $policy = new BookingPolicy($this->pdo);
            $now = $this->clock->now();
            $start = $policy->start($input["date"], $input["time"], $now);
            $type = $policy->types($room)[0];
            $eligible =
                $input["source"] === "walk_in" &&
                in_array($room, ["common", "terrace"], true)
                    ? $start->modify(
                        "-" . $policy->number("min_lead_time_min") . " minutes",
                    )
                    : $now;
            $interval = $policy->interval($start, $party, $type, $eligible);
            if ($start <= $now || $interval === null) {
                throw new BookingError(
                    "unavailable",
                    "This request does not fit the room or service rules.",
                    409,
                );
            }
            $option = null;
            if (!$waitlist) {
                $options = (new AvailabilityService(
                    $this->pdo,
                    $this->clock,
                ))->options(
                    $start,
                    $party,
                    $room,
                    $now,
                    null,
                    $eligible,
                    $policy,
                );
                foreach ($options as $candidate) {
                    if (
                        !isset($input["option"]) ||
                        ($input["option"]["kind"] === $candidate["kind"] &&
                            $input["option"]["id"] === $candidate["id"])
                    ) {
                        $option = $candidate;
                        break;
                    }
                }
                if ($option === null) {
                    throw new BookingError(
                        "unavailable",
                        "The selected table is no longer available.",
                        409,
                    );
                }
                $interval = $option;
            }
            $this->pdo
                ->prepare(
                    "INSERT INTO guests (full_name, phone, email, notes) VALUES (?, ?, ?, ?)",
                )
                ->execute([
                    $details["full_name"],
                    $details["phone"],
                    $details["email"],
                    $details["special_requests"],
                ]);
            $guest = (int) $this->pdo->lastInsertId();
            $approval =
                $party >= $policy->number("manager_approval_party_min") ||
                (int) $type["requires_approval"] === 1;
            $status = $waitlist
                ? "waitlisted"
                : ($approval
                    ? "pending"
                    : "confirmed");
            $rank = null;
            if ($waitlist) {
                $q = $this->pdo->prepare(
                    "SELECT COALESCE(MAX(waitlist_rank), 0) + 1 FROM reservations WHERE starts_at = ? AND status = 'waitlisted'",
                );
                $q->execute([$interval["starts_at"]]);
                $rank = (int) $q->fetchColumn();
            }
            $insert = $this->pdo->prepare(
                "INSERT INTO reservations (code, guest_id, room_type_id, table_group_id, party_size, starts_at, ends_at, blocks_until, turn_time_min, status, source, approval_state, special_requests, waitlist_rank, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            );
            for ($attempt = 0; $attempt < 20; $attempt++) {
                $alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                $code = "LUM-";
                for ($i = 0; $i < 6; $i++) {
                    $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
                }
                try {
                    $insert->execute([
                        $code,
                        $guest,
                        $type["id"],
                        $option && $option["kind"] === "group"
                            ? $option["id"]
                            : null,
                        $party,
                        $interval["starts_at"],
                        $interval["ends_at"],
                        $interval["blocks_until"],
                        $interval["turn_time_min"],
                        $status,
                        $input["source"],
                        $approval ? "awaiting" : "not_required",
                        $details["special_requests"],
                        $rank,
                        $user["id"],
                        $now->format("Y-m-d H:i:s"),
                    ]);
                    break;
                } catch (PDOException $error) {
                    if (
                        (int) ($error->errorInfo[1] ?? 0) !== 1062 ||
                        $attempt === 19
                    ) {
                        throw $error;
                    }
                }
            }
            $id = (int) $this->pdo->lastInsertId();
            if ($requestKey !== null) {
                $this->pdo
                    ->prepare(
                        "INSERT INTO staff_requests (user_id,request_key,payload_hash,reservation_id) VALUES (?,?,?,?)",
                    )
                    ->execute([$user["id"], $requestKey, $payloadHash, $id]);
            }
            if ($option) {
                foreach ($option["table_ids"] as $tableId) {
                    $this->pdo
                        ->prepare(
                            "INSERT INTO reservation_tables (reservation_id, table_id, slot_start) VALUES (?, ?, ?)",
                        )
                        ->execute([$id, $tableId, $interval["starts_at"]]);
                }
            }
            $this->pdo
                ->prepare(
                    "INSERT INTO reservation_status_history (reservation_id, to_status, actor_user_id, reason) VALUES (?, ?, ?, ?)",
                )
                ->execute([
                    $id,
                    $status,
                    $user["id"],
                    $waitlist
                        ? "Staff added waitlist request"
                        : "Staff created reservation",
                ]);
            (new StaffAuthService($this->pdo, $this->clock))->audit(
                $user,
                $waitlist ? "waitlist.create" : "reservation.create",
                "reservation",
                (string) $id,
                null,
                [
                    "code" => $code,
                    "status" => $status,
                    "source" => $input["source"],
                    "rank" => $rank,
                ],
            );
            return ["code" => $code, "status" => $status, "version" => 1];
        });
    }

    public function transition(
        array $actor,
        string $code,
        int $version,
        string $action,
        string $reason,
    ): array {
        if (
            !in_array(
                $action,
                [
                    "approve",
                    "reject",
                    "seat",
                    "complete",
                    "cancel",
                    "no_show",
                    "accept_offer",
                ],
                true,
            ) ||
            strlen(trim($reason)) < 3 ||
            strlen($reason) > 255 ||
            preg_match('/[\x00-\x1F]/', $reason)
        ) {
            throw new BookingError(
                "invalid_action",
                "Choose an action and provide a short reason.",
            );
        }
        $initial = $this->row($code);
        $date = substr($initial["starts_at"], 0, 10);
        return (new BookingTransaction($this->pdo))->run(function () use (
            $actor,
            $code,
            $version,
            $action,
            $reason,
            $date,
        ): array {
            $tx = new BookingTransaction($this->pdo);
            $waitlist = new WaitlistService($this->pdo, $this->clock);
            $tx->lockDays([$date]);
            $tx->lockTables($waitlist->tableIds(), false);
            $user = StaffAccess::require(
                $this->pdo,
                $actor,
                in_array($action, ["approve", "reject"], true)
                    ? "reservations.approve"
                    : "reservations.write",
                true,
            );
            $row = $this->row($code, true);
            if (
                (int) $row["version"] !== $version ||
                substr($row["starts_at"], 0, 10) !== $date
            ) {
                throw new BookingError(
                    "booking_changed",
                    "Booking changed. Reload its details.",
                    409,
                );
            }
            $policy = new BookingPolicy($this->pdo);
            $now = $this->clock->now();
            $start = new DateTimeImmutable(
                $row["starts_at"],
                $policy->timezone,
            );
            if ($action === "accept_offer") {
                if ($row["status"] !== "waitlisted") {
                    throw new BookingError(
                        "invalid_transition",
                        "Only a waitlist request can accept an offer.",
                        409,
                    );
                }
                $waitlist->claimLocked($row, $user);
                return ["booking" => $this->row($code)];
            }
            $next = match ($action) {
                "approve" => "confirmed",
                "reject", "cancel" => "cancelled",
                "seat" => "seated",
                "complete" => "completed",
                "no_show" => "no_show",
            };
            $allowed = match ($action) {
                "approve", "reject" => ["pending"],
                "seat", "no_show" => ["confirmed"],
                "complete" => ["seated"],
                "cancel" => ["pending", "confirmed", "waitlisted"],
            };
            if (!in_array($row["status"], $allowed, true)) {
                throw new BookingError(
                    "invalid_transition",
                    "This action does not fit the current booking status.",
                    409,
                );
            }
            $q = $this->pdo->prepare(
                "SELECT table_id FROM reservation_tables WHERE reservation_id = ? AND released_at IS NULL ORDER BY table_id",
            );
            $q->execute([$row["id"]]);
            $ids = array_map("intval", $q->fetchAll(PDO::FETCH_COLUMN));
            if (
                in_array($action, ["approve", "seat", "complete"], true) &&
                $ids === []
            ) {
                throw new BookingError(
                    "inventory_changed",
                    "No table is assigned to this booking.",
                    409,
                );
            }
            if ($action === "approve" && $start <= $now) {
                throw new BookingError(
                    "booking_started",
                    "This pending booking has already started. Contact the guest.",
                    409,
                );
            }
            if ($action === "seat") {
                if (
                    $now < $start->modify("-30 minutes") ||
                    $now >=
                        new DateTimeImmutable(
                            $row["ends_at"],
                            $policy->timezone,
                        ) ||
                    $start->format("Y-m-d") !== $now->format("Y-m-d")
                ) {
                    throw new BookingError(
                        "seating_window",
                        "Seat on the service date, from 30 minutes before start until the dining interval ends.",
                        409,
                    );
                }
                foreach ($ids as $id) {
                    $active = $this->pdo->prepare(
                        "SELECT t.is_active, ro.is_active AS room_active, rt.is_active AS type_active, ro.id AS room_id, ro.room_type_id FROM `tables` t JOIN rooms ro ON ro.id=t.room_id JOIN room_types rt ON rt.id=ro.room_type_id WHERE t.id=?",
                    );
                    $active->execute([$id]);
                    $table = $active->fetch();
                    if (
                        !$table ||
                        !(int) $table["is_active"] ||
                        !(int) $table["room_active"] ||
                        !(int) $table["type_active"]
                    ) {
                        throw new BookingError(
                            "inventory_changed",
                            "A selected table or room is inactive.",
                            409,
                        );
                    }
                    $blocked = $this->pdo->prepare(
                        "SELECT COUNT(*) FROM blackout_dates WHERE blocks_booking=1 AND starts_at<? AND ends_at>? AND (scope='venue' OR (scope='room_type' AND scope_id=?) OR (scope='room' AND scope_id=?) OR (scope='table' AND scope_id=?))",
                    );
                    $blocked->execute([
                        $row["blocks_until"],
                        $now->format("Y-m-d H:i:s"),
                        $table["room_type_id"],
                        $table["room_id"],
                        $id,
                    ]);
                    if ((int) $blocked->fetchColumn()) {
                        throw new BookingError(
                            "table_blocked",
                            "A selected table is blocked or still being reset.",
                            409,
                        );
                    }
                    $q = $this->pdo->prepare(
                        "SELECT COUNT(*) FROM reservation_tables rt JOIN reservations r ON r.id = rt.reservation_id WHERE rt.table_id = ? AND rt.released_at IS NULL AND r.id <> ? AND (r.status = 'seated' OR (r.status IN ('pending','confirmed') AND r.starts_at <= ? AND r.blocks_until > ?))",
                    );
                    $q->execute([
                        $id,
                        $row["id"],
                        $now->format("Y-m-d H:i:s"),
                        $now->format("Y-m-d H:i:s"),
                    ]);
                    if ((int) $q->fetchColumn()) {
                        throw new BookingError(
                            "table_occupied",
                            "A selected table is still occupied or reserved for another party.",
                            409,
                        );
                    }
                }
                $this->pdo
                    ->prepare(
                        "INSERT INTO orders (reservation_id, table_id, opened_by) VALUES (?, ?, ?)",
                    )
                    ->execute([$row["id"], $ids[0], $user["id"]]);
                $orderId = (int) $this->pdo->lastInsertId();
                $this->pdo
                    ->prepare(
                        "INSERT INTO order_status_history (order_id, to_status, actor_user_id) VALUES (?, ?, ?)",
                    )
                    ->execute([$orderId, "open", $user["id"]]);
            }
            if (
                $action === "no_show" &&
                $now <
                    $start->modify(
                        "+" . $policy->number("no_show_grace_min") . " minutes",
                    )
            ) {
                throw new BookingError(
                    "no_show_too_early",
                    "The no-show grace period has not ended.",
                    409,
                );
            }
            if ($action === "complete") {
                $q = $this->pdo->prepare(
                    "SELECT COUNT(*) FROM orders WHERE reservation_id = ? AND status NOT IN ('open','paid','void','closed')",
                );
                $q->execute([$row["id"]]);
                if ((int) $q->fetchColumn()) {
                    throw new BookingError(
                        "order_in_progress",
                        "Finish the active kitchen/order workflow before completing this booking.",
                        409,
                    );
                }
                $q = $this->pdo->prepare(
                    "SELECT id FROM orders WHERE reservation_id = ? AND status = 'open' FOR UPDATE",
                );
                $q->execute([$row["id"]]);
                foreach ($q->fetchAll(PDO::FETCH_COLUMN) as $id) {
                    $count = $this->pdo->prepare(
                        "SELECT COUNT(*) FROM order_items WHERE order_id = ? AND status <> 'void'",
                    );
                    $count->execute([$id]);
                    if ((int) $count->fetchColumn()) {
                        throw new BookingError(
                            "order_in_progress",
                            "Close the order before completing this booking.",
                            409,
                        );
                    }
                    $this->pdo
                        ->prepare(
                            "UPDATE orders SET status = 'void', closed_at = ? WHERE id = ?",
                        )
                        ->execute([$now->format("Y-m-d H:i:s"), $id]);
                    $this->pdo
                        ->prepare(
                            "INSERT INTO order_status_history (order_id, from_status, to_status, actor_user_id) VALUES (?, ?, ?, ?)",
                        )
                        ->execute([$id, "open", "void", $user["id"]]);
                }
            }
            $this->pdo
                ->prepare(
                    "UPDATE reservations SET status = ?, approval_state = ?, seated_at = IF(? = 'seat', ?, seated_at), completed_at = IF(? = 'complete', ?, completed_at), cancelled_at = IF(? = 'cancelled', ?, cancelled_at), version = version + 1 WHERE id = ?",
                )
                ->execute([
                    $next,
                    $action === "approve"
                        ? "approved"
                        : ($action === "reject"
                            ? "rejected"
                            : $row["approval_state"]),
                    $action,
                    $now->format("Y-m-d H:i:s"),
                    $action,
                    $now->format("Y-m-d H:i:s"),
                    $next,
                    $now->format("Y-m-d H:i:s"),
                    $row["id"],
                ]);
            if (in_array($next, ["cancelled", "completed", "no_show"], true)) {
                $this->pdo
                    ->prepare(
                        "UPDATE reservation_tables SET released_at = ? WHERE reservation_id = ? AND released_at IS NULL",
                    )
                    ->execute([$now->format("Y-m-d H:i:s"), $row["id"]]);
                $this->pdo
                    ->prepare(
                        "UPDATE holds SET status = 'released' WHERE waitlist_reservation_id = ? AND status = 'active'",
                    )
                    ->execute([$row["id"]]);
                if (
                    $next === "completed" &&
                    $policy->number("buffer_min") > 0
                ) {
                    foreach ($ids as $id) {
                        $this->pdo
                            ->prepare(
                                "INSERT INTO blackout_dates (scope, scope_id, starts_at, ends_at, reason) VALUES ('table', ?, ?, ?, ?)",
                            )
                            ->execute([
                                $id,
                                $now->format("Y-m-d H:i:s"),
                                $now
                                    ->modify(
                                        "+" .
                                            $policy->number("buffer_min") .
                                            " minutes",
                                    )
                                    ->format("Y-m-d H:i:s"),
                                "Table reset after " . $code,
                            ]);
                    }
                }
                if ($next === "no_show") {
                    $this->pdo
                        ->prepare(
                            "UPDATE guests SET no_show_count = no_show_count + 1 WHERE id = ?",
                        )
                        ->execute([$row["guest_id"]]);
                }
            }
            $this->pdo
                ->prepare(
                    "INSERT INTO reservation_status_history (reservation_id, from_status, to_status, actor_user_id, reason) VALUES (?, ?, ?, ?, ?)",
                )
                ->execute([
                    $row["id"],
                    $row["status"],
                    $next,
                    $user["id"],
                    $reason,
                ]);
            (new StaffAuthService($this->pdo, $this->clock))->audit(
                $user,
                "reservation." . $action,
                "reservation",
                (string) $row["id"],
                ["status" => $row["status"], "version" => $row["version"]],
                [
                    "status" => $next,
                    "version" => $version + 1,
                    "reason" => $reason,
                ],
            );
            $offers = in_array(
                $next,
                ["cancelled", "completed", "no_show"],
                true,
            )
                ? $waitlist->promoteLocked($date, $user)
                : [];
            return ["booking" => $this->row($code), "offered" => $offers];
        });
    }

    public function delete(array $actor, string $code, int $version): array
    {
        StaffAccess::require($this->pdo, $actor, "reservations.delete");
        $initial = $this->row($code);
        $date = substr($initial["starts_at"], 0, 10);
        return (new BookingTransaction($this->pdo))->run(function () use ($actor, $code, $version, $date): array {
            $tx = new BookingTransaction($this->pdo);
            $waitlist = new WaitlistService($this->pdo, $this->clock);
            $tx->lockDays([$date]);
            $tx->lockTables($waitlist->tableIds(), false);
            $user = StaffAccess::require($this->pdo, $actor, "reservations.delete", true);
            $row = $this->row($code, true);
            if ((int) $row["version"] !== $version || substr($row["starts_at"], 0, 10) !== $date) {
                throw new BookingError("booking_changed", "Booking changed. Reload its details.", 409);
            }
            $orders = $this->pdo->prepare("SELECT id FROM orders WHERE reservation_id = ? LIMIT 1 FOR UPDATE");
            $orders->execute([$row["id"]]);
            if ($orders->fetchColumn() !== false || $row["status"] === "seated") {
                throw new BookingError("booking_has_orders", "Reservations with food orders or a seated party cannot be permanently deleted.", 409);
            }
            // Release every linked hold before removing its recovery/offer bindings.
            $holds = $this->pdo->prepare("SELECT DISTINCT h.id FROM holds h LEFT JOIN hold_reservations hr ON hr.hold_id=h.id LEFT JOIN waitlist_offers wo ON wo.hold_id=h.id WHERE h.waitlist_reservation_id=? OR hr.reservation_id=? OR wo.reservation_id=? ORDER BY h.id FOR UPDATE");
            $holds->execute([$row["id"], $row["id"], $row["id"]]);
            foreach ($holds->fetchAll(PDO::FETCH_COLUMN) as $holdId) {
                $this->pdo->prepare("UPDATE holds SET status='released', waitlist_reservation_id=NULL WHERE id=?")->execute([$holdId]);
            }
            foreach (["waitlist_offers", "staff_requests", "hold_reservations", "reservation_manage_tokens", "reservation_change_history", "reservation_status_history", "reservation_tables", "outbox"] as $table) {
                $this->pdo->prepare("DELETE FROM `{$table}` WHERE reservation_id=?")->execute([$row["id"]]);
            }
            $this->pdo->prepare("DELETE FROM audit_log WHERE entity_type='reservation' AND entity_id=?")->execute([(string) $row["id"]]);
            if ($row["status"] === "no_show") {
                // Clamp before subtraction: MySQL rejects unsigned zero minus one.
                $this->pdo->prepare("UPDATE guests SET no_show_count=GREATEST(no_show_count, 1)-1 WHERE id=?")->execute([$row["guest_id"]]);
            }
            $this->pdo->prepare("DELETE FROM reservations WHERE id=?")->execute([$row["id"]]);
            (new StaffAuthService($this->pdo, $this->clock))->audit($user, "reservation.delete", "reservation", (string) $row["id"], null, null);
            $offered = $waitlist->promoteLocked($date, $user);
            return ["deleted" => true, "code" => $code, "offered" => $offered];
        });
    }

    public function modify(array $actor, array $input): array
    {
        $initial = $this->row($input["code"]);
        $oldDate = substr($initial["starts_at"], 0, 10);
        return (new BookingTransaction($this->pdo))->run(function () use (
            $actor,
            $input,
            $oldDate,
        ): array {
            $tx = new BookingTransaction($this->pdo);
            $waitlist = new WaitlistService($this->pdo, $this->clock);
            $tx->lockDays([$oldDate, $input["date"]]);
            $tx->lockTables($waitlist->tableIds(), false);
            $user = StaffAccess::require(
                $this->pdo,
                $actor,
                "reservations.write",
                true,
            );
            $row = $this->row($input["code"], true);
            if (
                (int) $row["version"] !== $input["version"] ||
                substr($row["starts_at"], 0, 10) !== $oldDate
            ) {
                throw new BookingError(
                    "booking_changed",
                    "Booking changed. Reload its details.",
                    409,
                );
            }
            if (!in_array($row["status"], ["pending", "confirmed"], true)) {
                throw new BookingError(
                    "invalid_transition",
                    "Only pending or confirmed bookings can be reassigned.",
                    409,
                );
            }
            $policy = new BookingPolicy($this->pdo);
            $now = $this->clock->now();
            $start = $policy->start($input["date"], $input["time"], $now);
            $eligible =
                $row["source"] === "walk_in" &&
                in_array($input["room_type"], ["common", "terrace"], true)
                    ? $start->modify(
                        "-" . $policy->number("min_lead_time_min") . " minutes",
                    )
                    : $now;
            if (
                $row["source"] !== "walk_in" &&
                $input["room_type"] === $row["room_code"] &&
                $start->format("Y-m-d H:i:s") === $row["starts_at"]
            ) {
                $eligible = new DateTimeImmutable(
                    $row["created_at"],
                    $policy->timezone,
                );
            }
            $options = (new AvailabilityService(
                $this->pdo,
                $this->clock,
            ))->options(
                $start,
                $input["party_size"],
                $input["room_type"],
                $now,
                null,
                $eligible,
                $policy,
                false,
                (int) $row["id"],
            );
            $picked = null;
            foreach ($options as $option) {
                if (
                    $option["kind"] === $input["option"]["kind"] &&
                    $option["id"] === $input["option"]["id"]
                ) {
                    $picked = $option;
                }
            }
            if ($picked === null) {
                throw new BookingError(
                    "unavailable",
                    "The replacement is unavailable. The original booking stays reserved.",
                    409,
                );
            }
            $notes =
                $input["special_requests"] ?? ($row["special_requests"] ?? "");
            if (
                !is_string($notes) ||
                strlen($notes) > 2000 ||
                preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $notes) ||
                strlen($input["reason"]) < 3 ||
                strlen($input["reason"]) > 255 ||
                preg_match('/[\x00-\x1F]/', $input["reason"])
            ) {
                throw new BookingError(
                    "invalid_request",
                    "Check the requests and change reason.",
                );
            }
            $ids = $this->pdo->prepare(
                "SELECT table_id FROM reservation_tables WHERE reservation_id = ? AND released_at IS NULL ORDER BY table_id",
            );
            $ids->execute([$row["id"]]);
            $before = $row + [
                "table_ids" => array_map(
                    "intval",
                    $ids->fetchAll(PDO::FETCH_COLUMN),
                ),
            ];
            $this->pdo
                ->prepare(
                    "UPDATE reservation_tables SET released_at = ? WHERE reservation_id = ? AND released_at IS NULL",
                )
                ->execute([$now->format("Y-m-d H:i:s"), $row["id"]]);
            foreach ($picked["table_ids"] as $id) {
                $this->pdo
                    ->prepare(
                        "INSERT INTO reservation_tables (reservation_id, table_id, slot_start) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE slot_start = ?, released_at = NULL",
                    )
                    ->execute([
                        $row["id"],
                        $id,
                        $picked["starts_at"],
                        $picked["starts_at"],
                    ]);
            }
            $status = $picked["approval_required"] ? "pending" : "confirmed";
            $this->pdo
                ->prepare(
                    "UPDATE reservations SET room_type_id = ?, table_group_id = ?, party_size = ?, starts_at = ?, ends_at = ?, blocks_until = ?, turn_time_min = ?, status = ?, approval_state = ?, special_requests = ?, version = version + 1 WHERE id = ?",
                )
                ->execute([
                    $picked["room_type_id"],
                    $picked["kind"] === "group" ? $picked["id"] : null,
                    $input["party_size"],
                    $picked["starts_at"],
                    $picked["ends_at"],
                    $picked["blocks_until"],
                    $picked["turn_time_min"],
                    $status,
                    $picked["approval_required"] ? "awaiting" : "not_required",
                    trim($notes) === "" ? null : trim($notes),
                    $row["id"],
                ]);
            $after = $this->row($input["code"]) + [
                "table_ids" => $picked["table_ids"],
            ];
            $this->pdo
                ->prepare(
                    "INSERT INTO reservation_change_history (reservation_id,before_json,after_json) VALUES (?,?,?)",
                )
                ->execute([
                    $row["id"],
                    json_encode($before, JSON_THROW_ON_ERROR),
                    json_encode($after, JSON_THROW_ON_ERROR),
                ]);
            $this->pdo
                ->prepare(
                    "INSERT INTO reservation_status_history (reservation_id,from_status,to_status,actor_user_id,reason) VALUES (?,?,?,?,?)",
                )
                ->execute([
                    $row["id"],
                    $row["status"],
                    $status,
                    $user["id"],
                    $input["reason"],
                ]);
            $expires = (new DateTimeImmutable(
                $picked["blocks_until"],
                $policy->timezone,
            ))->modify("+1 day");
            $this->pdo
                ->prepare(
                    "UPDATE reservation_manage_tokens SET expires_at = ? WHERE reservation_id = ?",
                )
                ->execute([$expires->format("Y-m-d H:i:s"), $row["id"]]);
            (new StaffAuthService($this->pdo, $this->clock))->audit(
                $user,
                "reservation.modify",
                "reservation",
                (string) $row["id"],
                $before,
                $after,
            );
            $waitlist->promoteLocked($oldDate, $user);
            return [
                "code" => $input["code"],
                "version" => $input["version"] + 1,
                "status" => $status,
            ];
        });
    }

    public function row(string $code, bool $lock = false): array
    {
        if (!preg_match('/^LUM-[A-Z0-9]{6}$/D', $code)) {
            throw new BookingError(
                "booking_not_found",
                "Booking not found.",
                404,
            );
        }
        $q = $this->pdo->prepare(
            "SELECT r.*, rt.code AS room_code FROM reservations r JOIN room_types rt ON rt.id = r.room_type_id WHERE r.code = ?" .
                ($lock ? " FOR UPDATE" : ""),
        );
        $q->execute([$code]);
        $row = $q->fetch();
        if (!$row) {
            throw new BookingError(
                "booking_not_found",
                "Booking not found.",
                404,
            );
        }
        return $row;
    }
}
