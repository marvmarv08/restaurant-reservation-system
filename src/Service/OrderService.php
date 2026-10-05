<?php
declare(strict_types=1);
namespace App\Service;

use App\Core\StaffAccess;
use App\Domain\BookingError;
use PDO;

final class OrderService
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly BookingClock $clock,
    ) {}

    private function query(string $sql, array $args = []): \PDOStatement
    {
        $q = $this->pdo->prepare($sql);
        $q->execute($args);
        return $q;
    }
    private function fail(
        string $code,
        string $message,
        int $status = 409,
    ): never {
        throw new BookingError($code, $message, $status);
    }
    private function owner(
        array $user,
        array $order,
        bool $allowUnassigned = false,
    ): void {
        if (
            $user["role"] === "server" &&
            (int) $order["assigned_server_id"] !== (int) $user["id"] &&
            !($allowUnassigned && $order["assigned_server_id"] === null)
        ) {
            $this->fail(
                "order_forbidden",
                "This order is assigned to another server.",
                403,
            );
        }
    }
    public function catalog(array $actor): array
    {
        StaffAccess::require($this->pdo, $actor, "orders.read");
        return $this->query(
            "SELECT m.id,m.name,m.description,m.price_cents,m.station,m.tags_json,m.is_available,c.name AS category FROM menu_items m JOIN menu_categories c ON c.id=m.category_id WHERE c.is_active=1 ORDER BY c.sort_order,m.sort_order",
        )->fetchAll();
    }
    public function listing(array $actor, string $date): array
    {
        $user = StaffAccess::require($this->pdo, $actor, "orders.read");
        $rows = $this->query(
            "SELECT o.*,r.code,r.party_size,r.status AS reservation_status,u.full_name AS server_name,
          (SELECT GROUP_CONCAT(t.code ORDER BY t.id SEPARATOR ' + ') FROM reservation_tables rt JOIN `tables` t ON t.id=rt.table_id WHERE rt.reservation_id=r.id AND rt.released_at IS NULL) AS tables
          FROM orders o JOIN reservations r ON r.id=o.reservation_id LEFT JOIN users u ON u.id=o.assigned_server_id
          WHERE ((r.starts_at>=? AND r.starts_at<DATE_ADD(?,INTERVAL 1 DAY)) OR (r.status='seated' AND o.status NOT IN ('closed','void','paid')))" .
                ($user["role"] === "server"
                    ? " AND (o.assigned_server_id IS NULL OR o.assigned_server_id=?)"
                    : "") .
                " ORDER BY (o.status NOT IN ('closed','void','paid')) DESC,o.id DESC LIMIT 100",
            $user["role"] === "server"
                ? [$date, $date, $user["id"]]
                : [$date, $date],
        )->fetchAll();
        return [
            "orders" => $rows,
            "server_time_epoch" => $this->clock->now()->getTimestamp(),
        ];
    }
    public function detail(array $actor, int $id): array
    {
        $user = StaffAccess::require($this->pdo, $actor, "orders.read");
        $order = $this->row($id);
        $this->owner($user, $order, true);
        return $this->snapshot($id);
    }
    private function row(int $id, bool $lock = false): array
    {
        $row = $this->query(
            "SELECT * FROM orders WHERE id=?" . ($lock ? " FOR UPDATE" : ""),
            [$id],
        )->fetch();
        if (!$row) {
            $this->fail("order_not_found", "Order not found.", 404);
        }
        return $row;
    }
    private function snapshot(int $id): array
    {
        $order = $this->query(
            "SELECT o.*,r.code,r.party_size,r.status AS reservation_status FROM orders o JOIN reservations r ON r.id=o.reservation_id WHERE o.id=?",
            [$id],
        )->fetch();
        $order["items"] = $this->query(
            "SELECT oi.*,COALESCE(oi.item_name,m.name) AS item_name,COALESCE(oi.station_snapshot,m.station) AS station_snapshot FROM order_items oi JOIN menu_items m ON m.id=oi.menu_item_id WHERE oi.order_id=? ORDER BY oi.id",
            [$id],
        )->fetchAll();
        $order["tables"] = $this->query(
            "SELECT t.code FROM reservation_tables rt JOIN `tables` t ON t.id=rt.table_id WHERE rt.reservation_id=? AND rt.released_at IS NULL ORDER BY t.id",
            [$order["reservation_id"]],
        )->fetchAll(PDO::FETCH_COLUMN);
        $order["ticket"] =
            $this->query(
                "SELECT *,UNIX_TIMESTAMP(fired_at) AS fired_epoch FROM kitchen_tickets WHERE order_id=?",
                [$id],
            )->fetch() ?:
            null;
        $order["events"] = $this->query(
            "SELECT e.action,e.from_status,e.to_status,e.reason,e.created_at,u.full_name AS actor FROM order_events e JOIN users u ON u.id=e.actor_user_id WHERE e.order_id=? ORDER BY e.id",
            [$id],
        )->fetchAll();
        return $order;
    }
    private function resultFor(array $user, int $id): array
    {
        $order = $this->snapshot($id);
        if ($user["role"] !== "kitchen") {
            return $order;
        }
        $safe = array_intersect_key(
            $order,
            array_flip([
                "id",
                "version",
                "status",
                "code",
                "party_size",
                "tables",
                "ticket",
            ]),
        );
        $safe["items"] = array_map(
            fn($i) => array_intersect_key(
                $i,
                array_flip([
                    "id",
                    "qty",
                    "item_name",
                    "station_snapshot",
                    "notes",
                    "status",
                    "course_no",
                    "tags_snapshot",
                ]),
            ),
            $order["items"],
        );
        return $safe;
    }
    public function kitchen(
        array $actor,
        string $date,
        string $station = "all",
    ): array {
        StaffAccess::require($this->pdo, $actor, "kitchen.read");
        if (
            !in_array(
                $station,
                ["all", "cold", "grill", "fry", "hot", "pastry", "bar"],
                true,
            )
        ) {
            $this->fail("invalid_station", "Choose a station.", 422);
        }
        // The full ticket is returned even with a station filter: whole-ticket actions must never hide other stations.
        $rows = $this->query(
            "SELECT kt.*,o.version,o.status AS order_status,o.reservation_id,r.code,r.party_size,u.full_name AS server_name,UNIX_TIMESTAMP(kt.fired_at) AS fired_epoch,
          (SELECT GROUP_CONCAT(t.code ORDER BY t.id SEPARATOR ' + ') FROM reservation_tables rt JOIN `tables` t ON t.id=rt.table_id WHERE rt.reservation_id=r.id AND rt.released_at IS NULL) AS tables
          FROM kitchen_tickets kt JOIN orders o ON o.id=kt.order_id JOIN reservations r ON r.id=o.reservation_id LEFT JOIN users u ON u.id=o.assigned_server_id
          WHERE (kt.status<>'served' OR (r.starts_at>=? AND r.starts_at<DATE_ADD(?,INTERVAL 1 DAY))) AND kt.status<>'void'" .
                ($station === "all"
                    ? ""
                    : " AND EXISTS (SELECT 1 FROM order_items i WHERE i.order_id=o.id AND i.status<>'void' AND i.station_snapshot=?)") .
                " ORDER BY (kt.status='served'),CASE WHEN kt.status='served' THEN kt.served_at END DESC,kt.fired_at,kt.id LIMIT 200",
            $station === "all" ? [$date, $date] : [$date, $date, $station],
        )->fetchAll();
        $active = [];
        $recall = [];
        $counts = [];
        foreach ($rows as $row) {
            $row["items"] = $this->query(
                'SELECT id,item_name,qty,course_no,notes,status,station_snapshot,tags_snapshot FROM order_items WHERE order_id=? AND status<>\'void\' ORDER BY course_no,id',
                [$row["order_id"]],
            )->fetchAll();
            if ($row["status"] === "served") {
                $row["can_recall"] = $row["order_status"] === "served";
                $recall[] = $row;
                continue;
            }
            foreach ($row["items"] as $i) {
                if ($i["status"] !== "ready" && $i["status"] !== "served") {
                    $key = $i["station_snapshot"] . " · " . $i["item_name"];
                    $counts[$key] = ($counts[$key] ?? 0) + (int) $i["qty"];
                }
            }
            $active[] = $row;
        }
        usort(
            $recall,
            fn($a, $b) => strcmp(
                $b["served_at"] ?? "",
                $a["served_at"] ?? "",
            ) ?:
            $b["id"] <=> $a["id"],
        );
        return [
            "tickets" => $active,
            "recall" => array_slice($recall, 0, 20),
            "all_day" => $counts,
            "server_time_epoch" => $this->clock->now()->getTimestamp(),
        ];
    }

    public function mutate(
        array $actor,
        int $id,
        int $version,
        string $action,
        string $key,
        array $data = [],
    ): array {
        $permission = match ($action) {
            "start",
            "ready",
            "hold",
            "resume",
            "recall",
            "item_ready",
            "item_prepare"
                => "kitchen.write",
            "void" => "orders.void",
            "claim",
            "add",
            "edit",
            "allergies",
            "fire",
            "serve",
            "close",
            "round"
                => "orders.write",
            default => $this->fail(
                "invalid_action",
                "Unknown order action.",
                422,
            ),
        };
        if (
            !preg_match(
                '/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/D',
                $key,
            )
        ) {
            $this->fail("invalid_request", "Use a request UUID.", 422);
        }
        StaffAccess::require($this->pdo, $actor, $permission);
        ksort($data);
        $hash = hash(
            "sha256",
            json_encode([$id, $version, $action, $data], JSON_THROW_ON_ERROR),
        );
        $initial = $this->row($id);
        if (!$initial["reservation_id"]) {
            $this->fail("invalid_order", "A seated reservation is required.");
        }
        $res = $this->query("SELECT * FROM reservations WHERE id=?", [
            $initial["reservation_id"],
        ])->fetch();
        return (new BookingTransaction($this->pdo))->run(function () use (
            $actor,
            $id,
            $version,
            $action,
            $key,
            $data,
            $hash,
            $permission,
            $res,
        ): array {
            $tx = new BookingTransaction($this->pdo);
            $tx->lockDays([substr($res["starts_at"], 0, 10)]);
            $tx->lockTables(
                $this->query("SELECT id FROM `tables` ORDER BY id")->fetchAll(
                    PDO::FETCH_COLUMN,
                ),
                false,
            );
            $reservation = $this->query(
                "SELECT * FROM reservations WHERE id=? FOR UPDATE",
                [$res["id"]],
            )->fetch();
            $order = $this->row($id, true);
            $user = StaffAccess::require($this->pdo, $actor, $permission, true);
            if ($user["role"] === "server") {
                $this->owner($user, $order, $action === "claim");
            }
            $previous = $this->query(
                "SELECT * FROM order_actions WHERE user_id=? AND request_key=?",
                [$user["id"], $key],
            )->fetch();
            if ($previous) {
                if (!hash_equals($previous["payload_hash"], $hash)) {
                    $this->fail(
                        "request_changed",
                        "This request ID was used for different input.",
                    );
                }
                return [
                    "order" => $this->resultFor(
                        $user,
                        (int) $previous["order_id"],
                    ),
                    "replayed" => true,
                ];
            }
            if ((int) $order["version"] !== $version) {
                $this->fail(
                    "order_changed",
                    "This order changed in another tab. Refresh and review.",
                );
            }
            if ($reservation["status"] !== "seated") {
                $this->fail(
                    "reservation_not_seated",
                    "Only seated parties can order or change tickets.",
                );
            }
            $ticket =
                $this->query(
                    "SELECT * FROM kitchen_tickets WHERE order_id=? FOR UPDATE",
                    [$id],
                )->fetch() ?:
                null;
            $from = $ticket["status"] ?? $order["status"];
            $now = $this->clock->now()->format("Y-m-d H:i:s");
            $reason = $this->text($data, "reason", 255, "");
            $resultId = $id;
            if (
                in_array($action, ["void", "hold", "resume", "recall"], true) &&
                trim($reason) === ""
            ) {
                $this->fail("reason_required", "Enter a reason.", 422);
            }
            if (
                in_array(
                    $action,
                    ["add", "edit", "allergies", "fire", "claim"],
                    true,
                ) &&
                $order["status"] !== "open"
            ) {
                $this->fail(
                    "order_not_open",
                    "Only an open order can be edited or sent.",
                );
            }
            if ($action === "claim") {
                if (
                    $order["assigned_server_id"] !== null &&
                    (int) $order["assigned_server_id"] !== (int) $user["id"]
                ) {
                    $this->fail(
                        "order_claimed",
                        "Another server already claimed this order.",
                    );
                }
                $this->query(
                    "UPDATE orders SET assigned_server_id=? WHERE id=?",
                    [$user["id"], $id],
                );
            } elseif ($action === "add") {
                $menu = $this->query(
                    "SELECT m.*,c.is_active AS category_active FROM menu_items m JOIN menu_categories c ON c.id=m.category_id WHERE m.id=? FOR SHARE",
                    [$this->number($data, "menu_item_id")],
                )->fetch();
                if (
                    !$menu ||
                    !(int) $menu["is_available"] ||
                    !(int) $menu["category_active"]
                ) {
                    $this->fail(
                        "menu_unavailable",
                        "This dish is unavailable.",
                    );
                }
                if (
                    (int) $this->query(
                        "SELECT COUNT(*) FROM order_items WHERE order_id=? AND status<>'void'",
                        [$id],
                    )->fetchColumn() >= 50
                ) {
                    $this->fail(
                        "order_limit",
                        "An order supports at most 50 lines.",
                        422,
                    );
                }
                $qty = $this->number($data, "qty", 1, 30);
                $course = $this->number($data, "course_no", 1, 3);
                $this->query(
                    "INSERT INTO order_items(order_id,menu_item_id,qty,unit_price_cents,course_no,notes,item_name,station_snapshot,tags_snapshot) VALUES (?,?,?,?,?,?,?,?,?)",
                    [
                        $id,
                        $menu["id"],
                        $qty,
                        $menu["price_cents"],
                        $course,
                        $this->text($data, "notes", 255, ""),
                        $menu["name"],
                        $menu["station"],
                        $menu["tags_json"],
                    ],
                );
            } elseif ($action === "edit") {
                $itemId = $this->number($data, "item_id");
                $item = $this->query(
                    "SELECT * FROM order_items WHERE id=? AND order_id=? AND status<>'void' FOR UPDATE",
                    [$itemId, $id],
                )->fetch();
                if (!$item) {
                    $this->fail("item_not_found", "Order line not found.", 404);
                }
                $qty = $this->number($data, "qty", 0, 30);
                $this->query(
                    "UPDATE order_items SET qty=?,course_no=?,notes=?,status=? WHERE id=?",
                    [
                        max(1, $qty),
                        $this->number($data, "course_no", 1, 3),
                        $this->text($data, "notes", 255, ""),
                        $qty === 0 ? "void" : "queued",
                        $itemId,
                    ],
                );
            } elseif ($action === "allergies") {
                $this->query("UPDATE orders SET allergy_notes=? WHERE id=?", [
                    $this->text($data, "allergy_notes", 1000),
                    $id,
                ]);
            } elseif ($action === "fire") {
                $items = $this->query(
                    "SELECT * FROM order_items WHERE order_id=? AND status<>'void' ORDER BY id FOR UPDATE",
                    [$id],
                )->fetchAll();
                if (!$items) {
                    $this->fail(
                        "empty_order",
                        "Add a dish before sending to the kitchen.",
                    );
                }
                foreach ($items as $i) {
                    $menu = $this->query(
                        "SELECT m.is_available,c.is_active FROM menu_items m JOIN menu_categories c ON c.id=m.category_id WHERE m.id=? FOR SHARE",
                        [$i["menu_item_id"]],
                    )->fetch();
                    if (
                        !$menu ||
                        !(int) $menu["is_available"] ||
                        !(int) $menu["is_active"]
                    ) {
                        $this->fail(
                            "menu_unavailable",
                            "An order dish is now unavailable. Review before sending.",
                        );
                    }
                }
                $this->query(
                    "INSERT INTO kitchen_tickets(order_id,allergy_snapshot,booking_notes,fired_at) VALUES (?,?,?,?)",
                    [
                        $id,
                        $order["allergy_notes"],
                        $reservation["special_requests"],
                        $now,
                    ],
                );
                $ticket = [
                    "id" => (int) $this->pdo->lastInsertId(),
                    "status" => "queued",
                ];
                $this->query(
                    "UPDATE orders SET status='sent_to_kitchen' WHERE id=?",
                    [$id],
                );
            } elseif ($action === "round") {
                if (!in_array($order["status"], ["closed", "void"], true)) {
                    $this->fail(
                        "order_in_progress",
                        "Close the previous service round first.",
                    );
                }
                if (
                    (int) $this->query(
                        "SELECT COUNT(*) FROM orders WHERE reservation_id=? AND status NOT IN ('closed','void','paid')",
                        [$reservation["id"]],
                    )->fetchColumn()
                ) {
                    $this->fail(
                        "order_in_progress",
                        "Another round is already open.",
                    );
                }
                $table = $this->query(
                    "SELECT table_id FROM reservation_tables WHERE reservation_id=? AND released_at IS NULL ORDER BY table_id LIMIT 1",
                    [$reservation["id"]],
                )->fetchColumn();
                if (!$table) {
                    $this->fail(
                        "inventory_changed",
                        "No active table is assigned.",
                    );
                }
                $this->query(
                    "INSERT INTO orders(reservation_id,table_id,opened_by,assigned_server_id,allergy_notes) VALUES (?,?,?,?,?)",
                    [
                        $reservation["id"],
                        $table,
                        $user["id"],
                        $order["assigned_server_id"] ?? $user["id"],
                        $order["allergy_notes"],
                    ],
                );
                $resultId = (int) $this->pdo->lastInsertId();
            } elseif ($action === "close") {
                if (
                    $order["status"] !== "served" ||
                    !$ticket ||
                    $ticket["status"] !== "served"
                ) {
                    $this->fail(
                        "order_in_progress",
                        "All food must be served before closing service.",
                    );
                }
                $this->query(
                    "UPDATE orders SET status='closed',closed_at=? WHERE id=?",
                    [$now, $id],
                );
            } elseif ($action === "void") {
                if (
                    in_array($order["status"], ["closed", "paid", "void"], true)
                ) {
                    $this->fail(
                        "invalid_transition",
                        "This order is already closed.",
                    );
                }
                $this->query(
                    "UPDATE orders SET status='void',closed_at=? WHERE id=?",
                    [$now, $id],
                );
                $this->query(
                    "UPDATE order_items SET status='void' WHERE order_id=?",
                    [$id],
                );
                if ($ticket) {
                    $this->query(
                        "UPDATE kitchen_tickets SET status='void',resume_status=NULL WHERE id=?",
                        [$ticket["id"]],
                    );
                }
            } else {
                if (!$ticket) {
                    $this->fail(
                        "ticket_not_found",
                        "Send the order to the kitchen first.",
                    );
                }
                if (
                    in_array($order["status"], ["closed", "paid", "void"], true)
                ) {
                    $this->fail("invalid_transition", "The order is closed.");
                }
                $state = $ticket["status"];
                $next = $state;
                switch ($action) {
                    case "start":
                        if ($state !== "queued") {
                            $this->fail(
                                "invalid_transition",
                                "Only queued tickets can start.",
                            );
                        }
                        $next = "preparing";
                        break;
                    case "ready":
                        if ($state !== "preparing") {
                            $this->fail(
                                "invalid_transition",
                                "Start preparation before marking ready.",
                            );
                        }
                        $next = "ready";
                        break;
                    case "serve":
                        if ($state !== "ready") {
                            $this->fail(
                                "invalid_transition",
                                "Only ready food can be marked served.",
                            );
                        }
                        $next = "served";
                        break;
                    case "hold":
                        if (
                            !in_array(
                                $state,
                                ["queued", "preparing", "ready"],
                                true,
                            )
                        ) {
                            $this->fail(
                                "invalid_transition",
                                "This ticket cannot be held.",
                            );
                        }
                        $next = "held";
                        $this->query(
                            "UPDATE kitchen_tickets SET resume_status=? WHERE id=?",
                            [$state, $ticket["id"]],
                        );
                        break;
                    case "resume":
                        if ($state !== "held") {
                            $this->fail(
                                "invalid_transition",
                                "This ticket is not held.",
                            );
                        }
                        $next = $ticket["resume_status"];
                        break;
                    case "recall":
                        if (
                            $state !== "served" ||
                            $order["status"] !== "served"
                        ) {
                            $this->fail(
                                "invalid_transition",
                                "Only a served, unclosed ticket can be recalled.",
                            );
                        }
                        $next = "preparing";
                        break;
                    case "item_ready":
                    case "item_prepare":
                        if ($state !== "preparing") {
                            $this->fail(
                                "invalid_transition",
                                "Item actions require a preparing ticket.",
                            );
                        }
                        $line = $this->query(
                            "SELECT id FROM order_items WHERE id=? AND order_id=? AND status<>'void'",
                            [$this->number($data, "item_id"), $id],
                        )->fetchColumn();
                        if (!$line) {
                            $this->fail(
                                "item_not_found",
                                "Ticket line not found.",
                                404,
                            );
                        }
                        $this->query(
                            "UPDATE order_items SET status=? WHERE id=?",
                            [
                                $action === "item_ready"
                                    ? "ready"
                                    : "preparing",
                                $line,
                            ],
                        );
                        break;
                }
                if (!in_array($action, ["item_ready", "item_prepare"], true)) {
                    $this->query(
                        'UPDATE kitchen_tickets SET status=?,resume_status=IF(?=\'held\',resume_status,NULL),served_at=IF(?=\'served\',?,served_at) WHERE id=?',
                        [$next, $next, $next, $now, $ticket["id"]],
                    );
                    if ($next !== "held") {
                        $orderState =
                            $next === "queued" ? "sent_to_kitchen" : $next;
                        $this->query("UPDATE orders SET status=? WHERE id=?", [
                            $orderState,
                            $id,
                        ]);
                        if ($action !== "resume") {
                            $this->query(
                                "UPDATE order_items SET status=? WHERE order_id=? AND status<>'void'",
                                [$next === "queued" ? "queued" : $next, $id],
                            );
                        }
                    }
                }
            }
            $this->query("UPDATE orders SET version=version+1 WHERE id=?", [
                $id,
            ]);
            $total = (int) $this->query(
                "SELECT COALESCE(SUM(qty*unit_price_cents),0) FROM order_items WHERE order_id=? AND status<>'void'",
                [$id],
            )->fetchColumn();
            $grandTotal =
                $total +
                ($action === "void" ? 0 : (int) $order["service_cents"]);
            if ($grandTotal > 4294967295) {
                $this->fail(
                    "order_limit",
                    "Order total exceeds the supported limit.",
                    422,
                );
            }
            $this->query(
                "UPDATE orders SET subtotal_cents=?,total_cents=? WHERE id=?",
                [$total, $grandTotal, $id],
            );
            $after = $this->row($id);
            $ticketAfter =
                $this->query("SELECT * FROM kitchen_tickets WHERE order_id=?", [
                    $id,
                ])->fetch() ?:
                null;
            $this->query(
                "INSERT INTO order_events(order_id,ticket_id,action,from_status,to_status,actor_user_id,reason,created_at) VALUES (?,?,?,?,?,?,?,?)",
                [
                    $resultId,
                    $resultId === $id ? $ticketAfter["id"] ?? null : null,
                    $action,
                    $from,
                    $resultId === $id
                        ? $ticketAfter["status"] ?? $after["status"]
                        : "open",
                    $user["id"],
                    $reason,
                    $now,
                ],
            );
            if ($order["status"] !== $after["status"]) {
                $this->query(
                    "INSERT INTO order_status_history(order_id,from_status,to_status,actor_user_id,changed_at) VALUES (?,?,?,?,?)",
                    [
                        $id,
                        $order["status"],
                        $after["status"],
                        $user["id"],
                        $now,
                    ],
                );
            }
            if ($resultId !== $id) {
                $this->query(
                    "INSERT INTO order_status_history(order_id,to_status,actor_user_id,changed_at) VALUES (?,'open',?,?)",
                    [$resultId, $user["id"], $now],
                );
            }
            (new StaffAuthService($this->pdo, $this->clock))->audit(
                $user,
                "order." . $action,
                "order",
                (string) $resultId,
                ["status" => $order["status"], "version" => $order["version"]],
                [
                    "status" => $this->row($resultId)["status"],
                    "version" => $this->row($resultId)["version"],
                    "reason" => $reason,
                ],
            );
            $this->query(
                "INSERT INTO order_actions(user_id,request_key,payload_hash,order_id) VALUES (?,?,?,?)",
                [$user["id"], $key, $hash, $resultId],
            );
            return [
                "order" => $this->resultFor($user, $resultId),
                "replayed" => false,
            ];
        });
    }
    private function text(
        array $data,
        string $name,
        int $max,
        ?string $default = null,
    ): string {
        $value = $data[$name] ?? $default;
        if (
            !is_string($value) ||
            strlen($value) > $max ||
            str_contains($value, "\0")
        ) {
            $this->fail("invalid_input", "Check " . $name . ".", 422);
        }
        return $value;
    }
    private function number(
        array $data,
        string $name,
        int $min = 1,
        int $max = PHP_INT_MAX,
    ): int {
        $value = $data[$name] ?? null;
        if (!is_int($value) || $value < $min || $value > $max) {
            $this->fail("invalid_input", "Check " . $name . ".", 422);
        }
        return $value;
    }
}
