<?php
declare(strict_types=1);
require dirname(__DIR__) . "/src/autoload.php";
require __DIR__ . "/BookingHarness.php";
$t = new BookingHarness(); // Refuses both a main database and a missing isolated flag.
$input = json_decode(stream_get_contents(STDIN), true, 8, JSON_THROW_ON_ERROR);
$pdo = $t->pdo;
$clock = new App\Service\BookingClock($pdo);
switch ($input["action"] ?? "") {
    case "prepare":
        $t->reset();
        $now = $clock->now();
        $result = ["date" => $now->format("Y-m-d"), "orders" => []];
        foreach (["C1", "C2", "C3"] as $tableCode) {
            $table = $t->tables[$tableCode];
            $room = $pdo->prepare("SELECT room_type_id FROM rooms WHERE id=?");
            $room->execute([$table["room_id"]]);
            $pdo->prepare(
                "INSERT INTO guests(full_name,phone,email) VALUES (?,?,?)",
            )->execute([
                "Order fixture guest",
                "+639000000009",
                "orders@lumina.test",
            ]);
            $guest = (int) $pdo->lastInsertId();
            $code = "LUM-" . strtoupper(bin2hex(random_bytes(3)));
            $start = $now->modify("-5 minutes");
            $end = $now->modify("+70 minutes");
            $pdo->prepare(
                "INSERT INTO reservations(code,guest_id,room_type_id,party_size,starts_at,ends_at,blocks_until,turn_time_min,status,source,special_requests,seated_at) VALUES (?,?,?,2,?,?,?,75,'seated','phone',?,?)",
            )->execute([
                $code,
                $guest,
                $room->fetchColumn(),
                $start->format("Y-m-d H:i:s"),
                $end->format("Y-m-d H:i:s"),
                $end->modify("+15 minutes")->format("Y-m-d H:i:s"),
                "Guest reports shellfish allergy. Confirm before food preparation.",
                $now->format("Y-m-d H:i:s"),
            ]);
            $res = (int) $pdo->lastInsertId();
            $pdo->prepare(
                "INSERT INTO reservation_tables(reservation_id,table_id,slot_start) VALUES (?,?,?)",
            )->execute([$res, $table["id"], $start->format("Y-m-d H:i:s")]);
            $pdo->prepare(
                "INSERT INTO orders(reservation_id,table_id) VALUES (?,?)",
            )->execute([$res, $table["id"]]);
            $order = (int) $pdo->lastInsertId();
            $pdo->prepare(
                "INSERT INTO order_status_history(order_id,to_status) VALUES (?,'open')",
            )->execute([$order]);
            $pdo->prepare(
                "INSERT INTO reservation_status_history(reservation_id,to_status,reason) VALUES (?,'seated','Isolated order fixture')",
            )->execute([$res]);
            $result["orders"][] = [
                "id" => $order,
                "code" => $code,
                "table" => $tableCode,
            ];
        }
        $result["menu"] = (int) $pdo
            ->query(
                "SELECT id FROM menu_items WHERE is_available=1 ORDER BY id LIMIT 1",
            )
            ->fetchColumn();
        break;
    case "age":
        $id = $input["id"] ?? null;
        if (!is_int($id)) {
            throw new RuntimeException("Invalid ticket fixture");
        }
        $pdo->prepare(
            "UPDATE kitchen_tickets SET fired_at=DATE_SUB(NOW(),INTERVAL 16 MINUTE) WHERE order_id=?",
        )->execute([$id]);
        $result = ["ok" => true];
        break;
    default:
        throw new RuntimeException("Unknown order fixture action");
}
echo json_encode($result, JSON_THROW_ON_ERROR);
