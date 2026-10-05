<?php
declare(strict_types=1);
require dirname(__DIR__) . "/src/autoload.php";
$config = require dirname(__DIR__) . "/config/database.php";
if (
    getenv("BOOKING_TEST_MODE") !== "isolated" ||
    $config["database"] !== "tablebook_p3_test"
) {
    throw new RuntimeException("Staff fixtures require the isolated database");
}
$pdo = App\Core\Database::connect($config);
$clock = new App\Service\BookingClock($pdo);
$input = json_decode(stream_get_contents(STDIN), true, 16, JSON_THROW_ON_ERROR);
$result = [];
switch ($input["action"] ?? "") {
    case "prepare":
        $pdo->exec("UPDATE users SET is_active=0, auth_version=auth_version+1");
        $pdo->exec("DELETE FROM staff_activation_tokens");
        $pdo->exec("DELETE FROM staff_login_limits");
        $auth = new App\Service\StaffAuthService($pdo, $clock);
        foreach (["admin", "manager", "host", "server", "kitchen"] as $role) {
            $result[$role] = $auth->issue(
                "p5-http-" . $role . "@lumina.test",
                "HTTP Staff " . $role,
                $role,
            );
        }
        break;
    case "limits":
        $pdo->exec(
            "UPDATE staff_login_limits SET window_started_at=DATE_SUB(NOW(),INTERVAL 15 MINUTE)",
        );
        break;
    case "session":
        $id = $input["id"] ?? "";
        if (!is_string($id) || !preg_match('/^[a-zA-Z0-9,-]{16,128}$/D', $id)) {
            throw new RuntimeException("Invalid fixture session");
        }
        session_name("TABLEBOOK_STAFF");
        session_id($id);
        if (!@session_start()) {
            throw new RuntimeException(
                "Cannot open the isolated fixture session. Run the fixture as www-data.",
            );
        }
        if (($input["mode"] ?? "") === "idle") {
            $_SESSION["seen"] = $clock->now()->getTimestamp() - 1800;
        } elseif (($input["mode"] ?? "") === "absolute") {
            $_SESSION["seen"] = $clock->now()->getTimestamp();
            $_SESSION["issued"] = $clock->now()->getTimestamp() - 28800;
        } elseif (($input["mode"] ?? "") === "recent") {
            $_SESSION["issued"] = $clock->now()->getTimestamp() - 900;
        } else {
            throw new RuntimeException("Invalid fixture session mode");
        }
        session_write_close();
        break;
    case "ready":
        $q = $pdo->query(
            "SELECT r.id FROM reservations r JOIN guests g ON g.id=r.guest_id WHERE g.full_name IN ('Staff Fixture Seat','Staff Fixture No-show')",
        );
        foreach ($q->fetchAll(PDO::FETCH_COLUMN) as $id) {
            $pdo->prepare(
                "UPDATE reservations SET status='cancelled' WHERE id=?",
            )->execute([$id]);
            $pdo->prepare(
                "UPDATE reservation_tables SET released_at=NOW() WHERE reservation_id=?",
            )->execute([$id]);
        }
        foreach (
            [
                "seat" => ["C11", "Staff Fixture Seat", 10],
                "no_show" => ["C12", "Staff Fixture No-show", 21],
            ]
            as $kind => [$code, $name, $minutes]
        ) {
            $pdo->prepare(
                "INSERT INTO guests (full_name,phone,email) VALUES (?,?,?)",
            )->execute([$name, "+639000000006", "staff-fixture@lumina.test"]);
            $guest = (int) $pdo->lastInsertId();
            $q = $pdo->prepare(
                "SELECT t.id,r.room_type_id FROM `tables` t JOIN rooms r ON r.id=t.room_id WHERE t.code=?",
            );
            $q->execute([$code]);
            $table = $q->fetch();
            $start = $clock->now()->modify("-" . $minutes . " minutes");
            $end = $start->modify("+90 minutes");
            $block = $end->modify("+15 minutes");
            $reference =
                "LUM-" . strtoupper(substr(bin2hex(random_bytes(8)), 0, 6));
            $pdo->prepare(
                "INSERT INTO reservations (code,guest_id,room_type_id,party_size,starts_at,ends_at,blocks_until,turn_time_min,status,source) VALUES (?,?,?,4,?,?,?,90,'confirmed','phone')",
            )->execute([
                $reference,
                $guest,
                $table["room_type_id"],
                $start->format("Y-m-d H:i:s"),
                $end->format("Y-m-d H:i:s"),
                $block->format("Y-m-d H:i:s"),
            ]);
            $id = (int) $pdo->lastInsertId();
            $pdo->prepare(
                "INSERT INTO reservation_tables (reservation_id,table_id,slot_start) VALUES (?,?,?)",
            )->execute([$id, $table["id"], $start->format("Y-m-d H:i:s")]);
            $pdo->prepare(
                "INSERT INTO reservation_status_history (reservation_id,to_status,reason) VALUES (?,'confirmed','Isolated browser service fixture')",
            )->execute([$id]);
            $result[$kind] = $reference;
        }
        break;
    default:
        throw new RuntimeException("Unknown staff fixture");
}
echo json_encode($result, JSON_THROW_ON_ERROR);
