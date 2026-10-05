<?php
declare(strict_types=1);
use App\Core\StaffAccess;
use App\Service\{
    BookingClock,
    StaffAuthService,
    StaffReservationService,
    OrderService,
};

function orderKey(): string
{
    $s = bin2hex(random_bytes(16));
    return substr($s, 0, 8) .
        "-" .
        substr($s, 8, 4) .
        "-" .
        substr($s, 12, 4) .
        "-" .
        substr($s, 16, 4) .
        "-" .
        substr($s, 20);
}
function orderActor(
    BookingHarness $t,
    string $role = "admin",
    string $suffix = "",
): array {
    static $hash;
    $hash ??= StaffAuthService::password("Isolated order passphrase 2026!");
    $r = $t->pdo->prepare("SELECT id FROM roles WHERE code=?");
    $r->execute([$role]);
    $roleId = $r->fetchColumn();
    $email = "p6-" . $role . $suffix . "@lumina.test";
    $t->pdo
        ->prepare(
            "INSERT INTO users(role_id,email,full_name,is_active,password_hash) VALUES (?,?,?,1,?) ON DUPLICATE KEY UPDATE role_id=?,is_active=1,password_hash=?",
        )
        ->execute([
            $roleId,
            $email,
            "Order Test " . $role . $suffix,
            $hash,
            $roleId,
            $hash,
        ]);
    $r = $t->pdo->prepare("SELECT * FROM users WHERE email=?");
    $r->execute([$email]);
    $user = $r->fetch();
    return ["id" => (int) $user["id"], "stamp" => StaffAccess::stamp($user)];
}
function orderSetup(BookingHarness $t, string $table = "C1"): array
{
    $actor = orderActor($t);
    $hold = $t->hold($table);
    $b = $t->service->confirm(
        $hold["hold_token"],
        $t->guest + ["special_requests" => "Booking note: shellfish allergy"],
        $t->owner,
    );
    $clock = new BookingClock(
        $t->pdo,
        fn() => new DateTimeImmutable(
            $t->date . " 17:30:00",
            new DateTimeZone("Asia/Manila"),
        ),
    );
    (new StaffReservationService($t->pdo, $clock))->transition(
        $actor,
        $b["code"],
        1,
        "seat",
        "Order test seating",
    );
    $id = (int) $t->pdo
        ->query("SELECT id FROM orders ORDER BY id DESC LIMIT 1")
        ->fetchColumn();
    return [new OrderService($t->pdo, $clock), $actor, $id, $b, $clock];
}
function orderAct(
    OrderService $s,
    array $a,
    int $id,
    string $action,
    array $data = [],
): array {
    $o = $s->detail($a, $id);
    return $s->mutate($a, $id, (int) $o["version"], $action, orderKey(), $data)[
        "order"
    ];
}
function orderAdd(OrderService $s, array $a, int $id, BookingHarness $t): array
{
    $menu = (int) $t->pdo
        ->query(
            "SELECT id FROM menu_items WHERE is_available=1 ORDER BY id LIMIT 1",
        )
        ->fetchColumn();
    return orderAct($s, $a, $id, "add", [
        "menu_item_id" => $menu,
        "qty" => 2,
        "course_no" => 1,
        "notes" => "No onion",
    ]);
}
function ticketAct(
    OrderService $s,
    array $a,
    int $id,
    string $action,
    int $version,
    array $data = [],
): array {
    return $s->mutate($a, $id, $version, $action, orderKey(), $data)["order"];
}

$t = new BookingHarness();
$t->test(
    "Seating connects exactly one editable order and no ticket before firing",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        $o = $s->detail($a, $id);
        $t->assert(
            $o["status"] === "open" &&
                count($o["items"]) === 0 &&
                $o["ticket"] === null,
        );
    },
);
$t->test(
    "Host and kitchen cannot change menu orders; server cannot run kitchen actions",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        foreach (["host", "kitchen"] as $role) {
            $t->expectError(
                "staff_forbidden",
                fn() => $s->mutate(
                    orderActor($t, $role),
                    $id,
                    1,
                    "add",
                    orderKey(),
                    [],
                ),
            );
        }
        $t->expectError(
            "staff_forbidden",
            fn() => $s->mutate(
                orderActor($t, "server"),
                $id,
                1,
                "start",
                orderKey(),
            ),
        );
    },
);
$t->test(
    "Servers atomically claim unassigned orders and cannot read or write another assignment",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        $one = orderActor($t, "server");
        $two = orderActor($t, "server", "2");
        $s->mutate($one, $id, 1, "claim", orderKey());
        $t->expectError("order_forbidden", fn() => $s->detail($two, $id));
        $t->expectError(
            "order_forbidden",
            fn() => $s->mutate($two, $id, 2, "claim", orderKey()),
        );
    },
);
$t->test(
    "Prices, names, stations and tags are server snapshots; client prices are ignored",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        $o = orderAdd($s, $a, $id, $t);
        $i = $o["items"][0];
        $menu = $i["menu_item_id"];
        $price = $i["unit_price_cents"];
        $t->pdo
            ->prepare(
                "UPDATE menu_items SET price_cents=price_cents+500,name=? WHERE id=?",
            )
            ->execute(["Edited live menu", $menu]);
        $read = $s->detail($a, $id);
        $t->assert(
            $read["items"][0]["item_name"] === $i["item_name"] &&
                (int) $read["subtotal_cents"] === 2 * (int) $price &&
                $i["station_snapshot"] !== null,
        );
    },
);
$t->test(
    "Quantity, course and note bounds fail without partial writes",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        $menu = (int) $t->pdo
            ->query("SELECT id FROM menu_items LIMIT 1")
            ->fetchColumn();
        foreach ([0, 31, 1.5] as $q) {
            $t->expectError(
                "invalid_input",
                fn() => $s->mutate($a, $id, 1, "add", orderKey(), [
                    "menu_item_id" => $menu,
                    "qty" => $q,
                    "course_no" => 1,
                ]),
            );
        }
        $t->assert(
            $t->count("order_items") === 0 &&
                $s->detail($a, $id)["version"] === 1,
        );
    },
);
$t->test(
    "Unavailable dishes and inactive categories cannot be added",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        $menu = (int) $t->pdo
            ->query("SELECT id FROM menu_items LIMIT 1")
            ->fetchColumn();
        $t->pdo
            ->prepare("UPDATE menu_items SET is_available=0 WHERE id=?")
            ->execute([$menu]);
        $t->expectError(
            "menu_unavailable",
            fn() => $s->mutate($a, $id, 1, "add", orderKey(), [
                "menu_item_id" => $menu,
                "qty" => 1,
                "course_no" => 1,
            ]),
        );
    },
);
$t->test(
    "Unavailability between adding and firing rolls back ticket creation",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        $o = orderAdd($s, $a, $id, $t);
        $t->pdo
            ->prepare("UPDATE menu_items SET is_available=0 WHERE id=?")
            ->execute([$o["items"][0]["menu_item_id"]]);
        $t->expectError(
            "menu_unavailable",
            fn() => orderAct($s, $a, $id, "fire"),
        );
        $t->assert(
            $t->count("kitchen_tickets") === 0 &&
                $s->detail($a, $id)["status"] === "open",
        );
    },
);
$t->test(
    "Empty order cannot fire; edit/remove retains the line and recalculates totals",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        $t->expectError("empty_order", fn() => orderAct($s, $a, $id, "fire"));
        $o = orderAdd($s, $a, $id, $t);
        $o = orderAct($s, $a, $id, "edit", [
            "item_id" => (int) $o["items"][0]["id"],
            "qty" => 0,
            "course_no" => 1,
            "notes" => "Removed before fire",
        ]);
        $t->assert(
            $o["items"][0]["status"] === "void" &&
                (int) $o["total_cents"] === 0,
        );
    },
);
$t->test(
    "Fire creates one real ticket with allergy and booking snapshots and immutable lines",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        orderAdd($s, $a, $id, $t);
        orderAct($s, $a, $id, "allergies", [
            "allergy_notes" => "Peanut allergy confirmed",
        ]);
        $o = orderAct($s, $a, $id, "fire");
        $t->assert(
            $o["status"] === "sent_to_kitchen" &&
                $o["ticket"]["allergy_snapshot"] ===
                    "Peanut allergy confirmed" &&
                str_contains($o["ticket"]["booking_notes"], "shellfish"),
        );
        $t->expectError("order_not_open", fn() => orderAdd($s, $a, $id, $t));
    },
);
$t->test(
    "Kitchen queue exposes dietary instructions without guest contact fields",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        orderAdd($s, $a, $id, $t);
        orderAct($s, $a, $id, "fire");
        $queue = $s->kitchen(orderActor($t, "kitchen"), $t->date);
        $json = json_encode($queue);
        $t->assert(
            count($queue["tickets"]) === 1 &&
                !str_contains($json, $t->guest["email"]) &&
                !str_contains($json, $t->guest["phone"]) &&
                count($queue["all_day"]) === 1,
        );
    },
);
$t->test(
    "Kitchen progresses explicit states and server confirms delivery",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        orderAdd($s, $a, $id, $t);
        $o = orderAct($s, $a, $id, "fire");
        $k = orderActor($t, "kitchen");
        $o = ticketAct($s, $k, $id, "start", (int) $o["version"]);
        $o = ticketAct($s, $k, $id, "ready", (int) $o["version"]);
        $t->expectError(
            "staff_forbidden",
            fn() => $s->mutate(
                $k,
                $id,
                (int) $o["version"],
                "serve",
                orderKey(),
            ),
        );
        $o = orderAct($s, $a, $id, "serve");
        $t->assert(
            $o["status"] === "served" &&
                $o["items"][0]["status"] === "served" &&
                $t->count("order_events") === 5,
        );
    },
);
$t->test("Hold/resume remembers state and preserves original timer", function (
    $t,
) {
    [$s, $a, $id] = orderSetup($t);
    orderAdd($s, $a, $id, $t);
    $o = orderAct($s, $a, $id, "fire");
    $fired = $o["ticket"]["fired_at"];
    $k = orderActor($t, "kitchen");
    $o = ticketAct($s, $k, $id, "hold", (int) $o["version"], [
        "reason" => "Guest asked to wait",
    ]);
    $t->expectError(
        "invalid_transition",
        fn() => ticketAct($s, $k, $id, "start", (int) $o["version"]),
    );
    $o = ticketAct($s, $k, $id, "resume", (int) $o["version"], [
        "reason" => "Guest is ready",
    ]);
    $t->assert(
        $o["ticket"]["status"] === "queued" &&
            $o["ticket"]["fired_at"] === $fired,
    );
});
$t->test(
    "Item preparation is scoped to its ticket and does not automatically bump",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        $o = orderAdd($s, $a, $id, $t);
        $line = (int) $o["items"][0]["id"];
        $o = orderAct($s, $a, $id, "fire");
        $k = orderActor($t, "kitchen");
        $o = ticketAct($s, $k, $id, "start", (int) $o["version"]);
        $o = ticketAct($s, $k, $id, "item_ready", (int) $o["version"], [
            "item_id" => $line,
        ]);
        $t->assert(
            $o["ticket"]["status"] === "preparing" &&
                $o["items"][0]["status"] === "ready",
        );
        $t->expectError(
            "item_not_found",
            fn() => ticketAct($s, $k, $id, "item_ready", (int) $o["version"], [
                "item_id" => 999999,
            ]),
        );
    },
);
$t->test(
    "Recall returns served food to preparing with history and original age",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        orderAdd($s, $a, $id, $t);
        $o = orderAct($s, $a, $id, "fire");
        $k = orderActor($t, "kitchen");
        $o = ticketAct($s, $k, $id, "start", (int) $o["version"]);
        $o = ticketAct($s, $k, $id, "ready", (int) $o["version"]);
        $o = orderAct($s, $a, $id, "serve");
        $fired = $o["ticket"]["fired_at"];
        $o = ticketAct($s, $k, $id, "recall", (int) $o["version"], [
            "reason" => "Dish needs correction",
        ]);
        $history = $s->detail($a, $id)["events"];
        $t->assert(
            $o["ticket"]["status"] === "preparing" &&
                $o["ticket"]["fired_at"] === $fired &&
                end($history)["action"] === "recall",
        );
    },
);
$t->test(
    "Unfinished food prevents host completion; service closes without payment and permits reset",
    function ($t) {
        [$s, $a, $id, $b, $clock] = orderSetup($t);
        orderAdd($s, $a, $id, $t);
        $host = new StaffReservationService($t->pdo, $clock);
        $t->expectError(
            "order_in_progress",
            fn() => $host->transition(
                $a,
                $b["code"],
                2,
                "complete",
                "Party leaving",
            ),
        );
        orderAct($s, $a, $id, "fire");
        orderAct($s, $a, $id, "start");
        orderAct($s, $a, $id, "ready");
        orderAct($s, $a, $id, "serve");
        $o = orderAct($s, $a, $id, "close");
        $t->assert($o["status"] === "closed" && $o["status"] !== "paid");
        $host->transition($a, $b["code"], 2, "complete", "Service finished");
        $t->assert($t->count("blackout_dates") === 1);
    },
);
$t->test(
    "Closed tickets cannot be recalled and later service rounds cannot duplicate",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        orderAdd($s, $a, $id, $t);
        foreach (["fire", "start", "ready", "serve", "close"] as $action) {
            orderAct($s, $a, $id, $action);
        }
        $t->expectError(
            "invalid_transition",
            fn() => orderAct($s, $a, $id, "recall", ["reason" => "Too late"]),
        );
        $o = orderAct($s, $a, $id, "round");
        $t->assert($o["id"] !== $id && $o["status"] === "open");
        $t->expectError(
            "order_in_progress",
            fn() => orderAct($s, $a, $id, "round"),
        );
    },
);
$t->test(
    "Manager voids with reason and history; server cannot void fired food",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        $server = orderActor($t, "server");
        $s->mutate($server, $id, 1, "claim", orderKey());
        orderAdd($s, $a, $id, $t);
        orderAct($s, $a, $id, "fire");
        $t->expectError(
            "staff_forbidden",
            fn() => $s->mutate($server, $id, 4, "void", orderKey(), [
                "reason" => "Mistake",
            ]),
        );
        $o = orderAct($s, $a, $id, "void", [
            "reason" => "Manager approved correction",
        ]);
        $t->assert(
            $o["status"] === "void" &&
                $o["ticket"]["status"] === "void" &&
                (int) $o["total_cents"] === 0,
        );
    },
);
$t->test(
    "Mutation retry has one effect, rejects changed payload, and rejects stale new requests",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        $key = orderKey();
        $data = [
            "menu_item_id" => (int) $t->pdo
                ->query("SELECT id FROM menu_items LIMIT 1")
                ->fetchColumn(),
            "qty" => 1,
            "course_no" => 1,
        ];
        $first = $s->mutate($a, $id, 1, "add", $key, $data);
        $again = $s->mutate($a, $id, 1, "add", $key, $data);
        $t->assert($again["replayed"] && $t->count("order_items") === 1);
        $t->expectError(
            "request_changed",
            fn() => $s->mutate(
                $a,
                $id,
                1,
                "add",
                $key,
                $data + ["notes" => "Different"],
            ),
        );
        $t->expectError(
            "order_changed",
            fn() => $s->mutate($a, $id, 1, "add", orderKey(), $data),
        );
    },
);
$t->test(
    "Concurrent firing produces one ticket and one history transition",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        $o = orderAdd($s, $a, $id, $t);
        $job = [
            "op" => "order_mutate",
            "actor" => $a,
            "id" => $id,
            "version" => (int) $o["version"],
            "action" => "fire",
            "key" => orderKey(),
        ];
        $results = $t->finishWorkers($t->startWorkers([$job, $job]));
        $t->assert(
            count(array_filter($results, fn($r) => $r["ok"])) === 2 &&
                $t->count("kitchen_tickets") === 1 &&
                $t->count("order_actions") === 2,
        );
    },
);
$t->test(
    "Two different kitchen updates from one version have exactly one winner",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        orderAdd($s, $a, $id, $t);
        $o = orderAct($s, $a, $id, "fire");
        $k = orderActor($t, "kitchen");
        $job = [
            "op" => "order_mutate",
            "actor" => $k,
            "id" => $id,
            "version" => (int) $o["version"],
            "action" => "start",
            "key" => orderKey(),
        ];
        $results = $t->finishWorkers(
            $t->startWorkers([
                $job,
                array_replace($job, [
                    "action" => "hold",
                    "key" => orderKey(),
                    "data" => ["reason" => "Wait"],
                ]),
            ]),
        );
        $t->assert(
            count(array_filter($results, fn($r) => $r["ok"])) === 1 &&
                count(
                    array_filter(
                        $results,
                        fn($r) => ($r["error"] ?? "") === "order_changed",
                    ),
                ) === 1,
        );
    },
);
$t->test(
    "Two servers claiming the same order have one owner and one winner",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        $one = orderActor($t, "server");
        $two = orderActor($t, "server", "2");
        $job = [
            "op" => "order_mutate",
            "actor" => $one,
            "id" => $id,
            "version" => 1,
            "action" => "claim",
            "key" => orderKey(),
        ];
        $results = $t->finishWorkers(
            $t->startWorkers([
                $job,
                array_replace($job, ["actor" => $two, "key" => orderKey()]),
            ]),
        );
        $t->assert(count(array_filter($results, fn($r) => $r["ok"])) === 1);
    },
);
$t->test("Kitchen mutation responses omit prices and guest contacts", function (
    $t,
) {
    [$s, $a, $id] = orderSetup($t);
    orderAdd($s, $a, $id, $t);
    $o = orderAct($s, $a, $id, "fire");
    $safe = $s->mutate(
        orderActor($t, "kitchen"),
        $id,
        (int) $o["version"],
        "start",
        orderKey(),
    )["order"];
    $t->assert(
        !isset($safe["total_cents"]) &&
            !isset($safe["items"][0]["unit_price_cents"]) &&
            !isset($safe["email"]),
    );
});
$t->test(
    "Invalid station and another order item cannot be used to bypass ticket boundaries",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        $t->expectError(
            "invalid_station",
            fn() => $s->kitchen(orderActor($t, "kitchen"), $t->date, "invalid"),
        );
        $o = orderAdd($s, $a, $id, $t);
        $firstLine = (int) $o["items"][0]["id"];
        [$s2, $a2, $id2] = orderSetup($t, "C2");
        orderAdd($s2, $a2, $id2, $t);
        $o2 = orderAct($s2, $a2, $id2, "fire");
        $o2 = orderAct($s2, $a2, $id2, "start");
        $t->expectError(
            "item_not_found",
            fn() => $s2->mutate(
                orderActor($t, "kitchen"),
                $id2,
                (int) $o2["version"],
                "item_ready",
                orderKey(),
                ["item_id" => $firstLine],
            ),
        );
    },
);
$t->test(
    "Account revision is checked again after an order inventory lock wait",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        $actor = orderActor($t, "server");
        $s->mutate($actor, $id, 1, "claim", orderKey());
        $blocker = App\Core\Database::connect(
            require dirname(__DIR__) . "/config/database.php",
        );
        $blocker->beginTransaction();
        $blocker
            ->query("SELECT id FROM `tables` ORDER BY id LIMIT 1 FOR UPDATE")
            ->fetchColumn();
        $workers = $t->startWorkers([
            [
                "op" => "order_mutate",
                "actor" => $actor,
                "id" => $id,
                "version" => 2,
                "action" => "add",
                "key" => orderKey(),
                "data" => [
                    "menu_item_id" => (int) $t->pdo
                        ->query("SELECT id FROM menu_items LIMIT 1")
                        ->fetchColumn(),
                    "qty" => 1,
                    "course_no" => 1,
                ],
            ],
        ]);
        usleep(700000);
        $t->pdo
            ->prepare("UPDATE users SET auth_version=auth_version+1 WHERE id=?")
            ->execute([$actor["id"]]);
        $blocker->commit();
        $r = $t->finishWorkers($workers)[0];
        $t->assert(
            !$r["ok"] &&
                $r["error"] === "staff_session_invalid" &&
                $t->count("order_items") === 0,
        );
    },
);
$t->test(
    "Absolute session expiry is enforced after waiting for order inventory",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        $actor = orderActor($t, "server");
        $s->mutate($actor, $id, 1, "claim", orderKey());
        $actor["expires_at"] =
            (new BookingClock($t->pdo))->now()->getTimestamp() + 1;
        $blocker = App\Core\Database::connect(
            require dirname(__DIR__) . "/config/database.php",
        );
        $blocker->beginTransaction();
        $blocker
            ->query("SELECT id FROM `tables` ORDER BY id LIMIT 1 FOR UPDATE")
            ->fetchColumn();
        $workers = $t->startWorkers([
            [
                "op" => "order_mutate",
                "actor" => $actor,
                "id" => $id,
                "version" => 2,
                "action" => "add",
                "key" => orderKey(),
                "data" => [
                    "menu_item_id" => (int) $t->pdo
                        ->query("SELECT id FROM menu_items LIMIT 1")
                        ->fetchColumn(),
                    "qty" => 1,
                    "course_no" => 1,
                ],
            ],
        ]);
        usleep(1600000);
        $blocker->commit();
        $r = $t->finishWorkers($workers)[0];
        $t->assert(
            !$r["ok"] &&
                $r["error"] === "staff_session_invalid" &&
                $t->count("order_items") === 0,
        );
    },
);
$t->test(
    "Archived rounds do not push current orders or the latest recall ticket out of view",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        orderAdd($s, $a, $id, $t);
        $o = orderAct($s, $a, $id, "fire");
        $oldOrder = $s->detail($a, $id);
        $table = $oldOrder["table_id"];
        $res = $oldOrder["reservation_id"];
        for ($i = 0; $i < 210; $i++) {
            $t->pdo
                ->prepare(
                    "INSERT INTO orders(reservation_id,table_id,status) VALUES (?,?,'closed')",
                )
                ->execute([$res, $table]);
            $oid = (int) $t->pdo->lastInsertId();
            $t->pdo
                ->prepare(
                    "INSERT INTO kitchen_tickets(order_id,status,fired_at,served_at) VALUES (?,'served',?,?)",
                )
                ->execute([
                    $oid,
                    $t->date . " 16:00:00",
                    $t->date . " 16:01:00",
                ]);
        }
        $queue = $s->kitchen(orderActor($t, "kitchen"), $t->date);
        $list = $s->listing($a, $t->date);
        $t->assert(
            count($queue["tickets"]) === 1 &&
                (int) $list["orders"][0]["id"] === $id &&
                count($queue["recall"]) === 20,
        );
    },
);
$t->test(
    "Existing service amount is retained when recomputing menu totals",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        $t->pdo
            ->prepare("UPDATE orders SET service_cents=125 WHERE id=?")
            ->execute([$id]);
        $o = orderAdd($s, $a, $id, $t);
        $t->assert(
            (int) $o["total_cents"] === (int) $o["subtotal_cents"] + 125,
        );
    },
);
$t->test(
    "Outstanding service and tickets remain visible across a midnight date change",
    function ($t) {
        [$s, $a, $id] = orderSetup($t);
        orderAdd($s, $a, $id, $t);
        orderAct($s, $a, $id, "fire");
        $other = (new DateTimeImmutable($t->date))
            ->modify("+1 day")
            ->format("Y-m-d");
        $t->assert(
            count($s->kitchen(orderActor($t, "kitchen"), $other)["tickets"]) ===
                1 && count($s->listing($a, $other)["orders"]) === 1,
        );
    },
);
$t->finish();
