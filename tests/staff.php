<?php
declare(strict_types=1);
use App\Core\StaffAccess;
use App\Service\BookingClock;
use App\Service\StaffAuthService;
use App\Service\StaffReservationService;
use App\Service\StaffSettingsService;
use App\Service\WaitlistService;

const STAFF_TEST_PASSWORD = "Isolated staff passphrase 2026!";
function staffActor(BookingHarness $t, string $role = "admin"): array
{
    static $hash;
    $hash ??= StaffAuthService::password(STAFF_TEST_PASSWORD);
    $email = "p5-test-" . $role . "@lumina.test";
    $q = $t->pdo->prepare("SELECT id FROM roles WHERE code=?");
    $q->execute([$role]);
    $roleId = $q->fetchColumn();
    $t->pdo
        ->prepare(
            "INSERT INTO users (role_id,email,full_name,is_active,password_hash) VALUES (?,?,?,1,?) ON DUPLICATE KEY UPDATE role_id=?,is_active=1,password_hash=?",
        )
        ->execute([
            $roleId,
            $email,
            "Staff Test " . $role,
            $hash,
            $roleId,
            $hash,
        ]);
    $q = $t->pdo->prepare("SELECT * FROM users WHERE email=?");
    $q->execute([$email]);
    $user = $q->fetch();
    return ["id" => (int) $user["id"], "stamp" => StaffAccess::stamp($user)];
}
function staffService(
    BookingHarness $t,
    ?string $fixed = null,
): StaffReservationService {
    return new StaffReservationService(
        $t->pdo,
        new BookingClock(
            $t->pdo,
            $fixed === null
                ? null
                : static fn() => new DateTimeImmutable(
                    $fixed,
                    new DateTimeZone("Asia/Manila"),
                ),
        ),
    );
}
function staffInput(
    BookingHarness $t,
    int $party = 2,
    string $room = "common",
    string $time = "17:30",
): array {
    return [
        "date" => $t->date,
        "time" => $time,
        "party_size" => $party,
        "room_type" => $room,
        "source" => "phone",
        "guest" => $t->guest,
    ];
}
function staffBooking(
    BookingHarness $t,
    string $table = "C1",
    int $party = 2,
): array {
    $hold = $t->hold($table, "17:30", $party);
    return $t->service->confirm($hold["hold_token"], $t->guest, $t->owner);
}
function invitationToken(array $invitation): string
{
    parse_str(explode("#", $invitation["activation_path"])[1], $params);
    return $params["token"];
}
$tests = new BookingHarness();
$tests->test(
    "Activation stores hashes, validates passphrases, and consumes its capability once",
    function (BookingHarness $t): void {
        $service = new StaffAuthService($t->pdo, new BookingClock($t->pdo));
        $link = $service->issue(
            "activation-p5@lumina.test",
            "Activation Test",
            "host",
        );
        $token = invitationToken($link);
        $t->expectError(
            "password_invalid",
            fn() => $service->activate($token, "short"),
        );
        $user = $service->activate($token, STAFF_TEST_PASSWORD);
        $t->assert(
            $user["password_hash"] !== STAFF_TEST_PASSWORD &&
                password_verify(STAFF_TEST_PASSWORD, $user["password_hash"]),
        );
        $q = $t->pdo->prepare(
            "SELECT token_hash,used_at FROM staff_activation_tokens WHERE user_id=? ORDER BY id DESC LIMIT 1",
        );
        $q->execute([$user["id"]]);
        $row = $q->fetch();
        $t->assert(
            $row["token_hash"] === hash("sha256", $token) &&
                $row["used_at"] !== null,
        );
        $t->expectError(
            "activation_invalid",
            fn() => $service->activate($token, STAFF_TEST_PASSWORD),
        );
        $t->pdo
            ->prepare("UPDATE users SET is_active=0 WHERE id=?")
            ->execute([$user["id"]]);
    },
);
$tests->test(
    "Activation expiry and superseded invitations are refused",
    function (BookingHarness $t): void {
        $service = new StaffAuthService($t->pdo, new BookingClock($t->pdo));
        $old = $service->issue("expiry-p5@lumina.test", "Expiry Test", "host");
        $new = $service->issue("expiry-p5@lumina.test", "Expiry Test", "host");
        $t->expectError(
            "activation_invalid",
            fn() => $service->activate(
                invitationToken($old),
                STAFF_TEST_PASSWORD,
            ),
        );
        $t->pdo->exec("UPDATE staff_activation_tokens SET expires_at=NOW()");
        $t->expectError(
            "activation_invalid",
            fn() => $service->activate(
                invitationToken($new),
                STAFF_TEST_PASSWORD,
            ),
        );
    },
);
$tests->test(
    "Login throttles five account failures and permits login after its window",
    function (BookingHarness $t): void {
        staffActor($t, "host");
        $t->pdo->exec("DELETE FROM staff_login_limits");
        $service = new StaffAuthService($t->pdo, new BookingClock($t->pdo));
        for ($i = 0; $i < 5; $i++) {
            $t->expectError(
                "login_failed",
                fn() => $service->login(
                    "p5-test-host@lumina.test",
                    "wrong password",
                    "test-ip",
                ),
            );
        }
        $t->expectError(
            "rate_limited",
            fn() => $service->login(
                "p5-test-host@lumina.test",
                STAFF_TEST_PASSWORD,
                "other-ip",
            ),
        );
        $now = (new BookingClock($t->pdo))->now()->modify("+15 minutes");
        $later = new StaffAuthService(
            $t->pdo,
            new BookingClock($t->pdo, fn() => $now),
        );
        $user = $later->login(
            "p5-test-host@lumina.test",
            STAFF_TEST_PASSWORD,
            "test-ip",
        );
        $t->assert($user["role"] === "host");
    },
);
$tests->test(
    "IP throttle applies across accounts and inactive/unknown users share a failure",
    function (BookingHarness $t): void {
        $t->pdo->exec("DELETE FROM staff_login_limits");
        $service = new StaffAuthService($t->pdo, new BookingClock($t->pdo));
        $t->expectError(
            "login_failed",
            fn() => $service->login(
                "missing@lumina.test",
                STAFF_TEST_PASSWORD,
                "test-ip",
            ),
        );
        $t->expectError(
            "login_failed",
            fn() => $service->login(
                "mika@lumina.test",
                STAFF_TEST_PASSWORD,
                "test-ip",
            ),
        );
        $key = hash("sha256", "ip:test-ip");
        $t->pdo
            ->prepare(
                "UPDATE staff_login_limits SET attempts=30 WHERE key_hash=?",
            )
            ->execute([$key]);
        $t->expectError(
            "rate_limited",
            fn() => $service->login(
                "new-account@lumina.test",
                STAFF_TEST_PASSWORD,
                "test-ip",
            ),
        );
    },
);
$tests->test(
    "Roles and changed security stamps deny unauthorized service calls",
    function (BookingHarness $t): void {
        $host = staffActor($t, "host");
        $manager = staffActor($t, "manager");
        $server = staffActor($t, "server");
        $kitchen = staffActor($t, "kitchen");
        foreach ([$server, $kitchen] as $actor) {
            $t->expectError(
                "staff_forbidden",
                fn() => StaffAccess::require(
                    $t->pdo,
                    $actor,
                    "reservations.read",
                ),
            );
        }
        $t->expectError(
            "staff_forbidden",
            fn() => StaffAccess::require(
                $t->pdo,
                $host,
                "reservations.approve",
            ),
        );
        $t->expectError(
            "staff_forbidden",
            fn() => StaffAccess::require($t->pdo, $manager, "staff.manage"),
        );
        $t->pdo
            ->prepare("UPDATE users SET is_active=0 WHERE id=?")
            ->execute([$host["id"]]);
        $t->expectError(
            "staff_session_invalid",
            fn() => StaffAccess::require($t->pdo, $host, "reservations.write"),
        );
        $t->expectError(
            "staff_session_invalid",
            fn() => StaffAccess::require(
                $t->pdo,
                ["id" => $manager["id"], "stamp" => str_repeat("0", 64)],
                "reservations.read",
            ),
        );
    },
);
$tests->test(
    "Last active administrator cannot be removed or demoted",
    function (BookingHarness $t): void {
        $t->pdo->exec("UPDATE users SET is_active=0 WHERE role_id=1");
        $admin = staffActor($t);
        $service = new StaffAuthService($t->pdo, new BookingClock($t->pdo));
        $t->expectError(
            "last_admin",
            fn() => $service->change($admin, $admin["id"], "host", true),
        );
        $t->expectError(
            "last_admin",
            fn() => $service->change($admin, $admin["id"], "admin", false),
        );
    },
);
$tests->test(
    "Admin staff changes revoke old permission stamps and retain audit identity",
    function (BookingHarness $t): void {
        $admin = staffActor($t);
        $host = staffActor($t, "host");
        $service = new StaffAuthService($t->pdo, new BookingClock($t->pdo));
        $service->change($admin, $host["id"], "manager", true);
        $t->expectError(
            "staff_session_invalid",
            fn() => StaffAccess::require($t->pdo, $host, "reservations.read"),
        );
        $t->assert($t->count("audit_log") === 1);
    },
);
$tests->test(
    "Host creates a phone booking with actor history and current inventory",
    function (BookingHarness $t): void {
        $host = staffActor($t, "host");
        $booking = staffService($t)->create($host, staffInput($t));
        $row = staffService($t)->row($booking["code"]);
        $t->assert(
            $row["source"] === "phone" &&
                (int) $row["created_by"] === $host["id"],
        );
        $t->assert(
            $t->count("reservation_tables") === 1 &&
                $t->count("audit_log") === 1,
        );
    },
);
$tests->test(
    "Walk-in bypass is limited to online lead in main/terrace, retaining service and room rules",
    function (BookingHarness $t): void {
        $host = staffActor($t, "host");
        $service = staffService($t, $t->date . " 17:20:00");
        $input = staffInput($t);
        $input["source"] = "walk_in";
        $booking = $service->create($host, $input);
        $t->assert($booking["status"] === "confirmed");
        $vip = staffInput($t, 2, "vip");
        $vip["source"] = "walk_in";
        $t->expectError("unavailable", fn() => $service->create($host, $vip));
        $bad = $input;
        $bad["time"] = "12:00";
        $t->expectError("unavailable", fn() => $service->create($host, $bad));
    },
);
$tests->test(
    "Host cannot approve; manager approves pending groups with audited identity",
    function (BookingHarness $t): void {
        $booking = staffBooking($t, "G3", 13);
        $host = staffActor($t, "host");
        $manager = staffActor($t, "manager");
        $t->expectError(
            "staff_forbidden",
            fn() => staffService($t)->transition(
                $host,
                $booking["code"],
                1,
                "approve",
                "Manager approval",
            ),
        );
        $changed = staffService($t)->transition(
            $manager,
            $booking["code"],
            1,
            "approve",
            "Reviewed party request",
        );
        $t->assert(
            $changed["booking"]["status"] === "confirmed" &&
                $changed["booking"]["approval_state"] === "approved",
        );
        $q = $t->pdo->query(
            "SELECT actor_user_id FROM reservation_status_history ORDER BY id DESC LIMIT 1",
        );
        $t->assert((int) $q->fetchColumn() === $manager["id"]);
    },
);
$tests->test(
    "Seating window prevents premature seats and creates one persisted order",
    function (BookingHarness $t): void {
        $booking = staffBooking($t);
        $host = staffActor($t, "host");
        $t->expectError(
            "seating_window",
            fn() => staffService($t, $t->date . " 16:59:59")->transition(
                $host,
                $booking["code"],
                1,
                "seat",
                "Guest arrived",
            ),
        );
        staffService($t, $t->date . " 17:00:00")->transition(
            $host,
            $booking["code"],
            1,
            "seat",
            "Guest arrived",
        );
        $t->assert(
            $t->count("orders") === 1 &&
                $t->count("order_status_history") === 1,
        );
        $t->expectError(
            "booking_changed",
            fn() => staffService($t, $t->date . " 17:01:00")->transition(
                $host,
                $booking["code"],
                1,
                "seat",
                "Duplicate click",
            ),
        );
        $t->assert($t->count("orders") === 1);
    },
);
$tests->test("Pending, inactive, or blocked tables cannot be seated", function (
    BookingHarness $t,
): void {
    $booking = staffBooking($t, "G3", 13);
    $host = staffActor($t, "host");
    $t->expectError(
        "invalid_transition",
        fn() => staffService($t, $t->date . " 17:30:00")->transition(
            $host,
            $booking["code"],
            1,
            "seat",
            "Guest arrived",
        ),
    );
    $booking = staffBooking($t, "C1");
    $t->pdo->exec("UPDATE `tables` SET is_active=0 WHERE code='C1'");
    $t->expectError(
        "inventory_changed",
        fn() => staffService($t, $t->date . " 17:30:00")->transition(
            $host,
            $booking["code"],
            1,
            "seat",
            "Guest arrived",
        ),
    );
});
$tests->test(
    "No-show enforces exact twenty-minute grace, releases inventory, and counts once",
    function (BookingHarness $t): void {
        $booking = staffBooking($t);
        $host = staffActor($t, "host");
        $t->expectError(
            "no_show_too_early",
            fn() => staffService($t, $t->date . " 17:49:59")->transition(
                $host,
                $booking["code"],
                1,
                "no_show",
                "Guest absent",
            ),
        );
        staffService($t, $t->date . " 17:50:00")->transition(
            $host,
            $booking["code"],
            1,
            "no_show",
            "Guest absent after grace",
        );
        $t->assert(
            (int) $t->pdo
                ->query("SELECT no_show_count FROM guests LIMIT 1")
                ->fetchColumn() === 1,
        );
        $t->assert(
            (int) $t->pdo
                ->query(
                    "SELECT COUNT(*) FROM reservation_tables WHERE released_at IS NULL",
                )
                ->fetchColumn() === 0,
        );
    },
);
$tests->test(
    "Completion releases all members and preserves a real reset buffer",
    function (BookingHarness $t): void {
        $booking = staffBooking($t);
        $host = staffActor($t, "host");
        staffService($t, $t->date . " 17:30:00")->transition(
            $host,
            $booking["code"],
            1,
            "seat",
            "Guest arrived",
        );
        staffService($t, $t->date . " 17:40:00")->transition(
            $host,
            $booking["code"],
            2,
            "complete",
            "Party departed",
        );
        $t->assert(
            $t->pdo
                ->query("SELECT status FROM orders LIMIT 1")
                ->fetchColumn() === "void",
        );
        $input = staffInput($t, 2, "common", "17:45");
        $input["source"] = "walk_in";
        $input["option"] = [
            "kind" => "table",
            "id" => (int) $t->tables["C1"]["id"],
        ];
        $t->expectError(
            "unavailable",
            fn() => staffService($t, $t->date . " 17:40:00")->create(
                $host,
                $input,
            ),
        );
        $input["time"] = "18:00";
        $t->assert(
            staffService($t, $t->date . " 17:40:00")->create($host, $input)[
                "status"
            ] === "confirmed",
        );
    },
);
$tests->test(
    "An unfinished order prevents completion instead of silently discarding food",
    function (BookingHarness $t): void {
        $booking = staffBooking($t);
        $host = staffActor($t, "host");
        staffService($t, $t->date . " 17:30:00")->transition(
            $host,
            $booking["code"],
            1,
            "seat",
            "Guest arrived",
        );
        $t->pdo->exec("UPDATE orders SET status='preparing'");
        $t->expectError(
            "order_in_progress",
            fn() => staffService($t, $t->date . " 18:00:00")->transition(
                $host,
                $booking["code"],
                2,
                "complete",
                "Party departed",
            ),
        );
        $t->assert(
            staffService($t)->row($booking["code"])["status"] === "seated",
        );
    },
);
$tests->test(
    "Overdue seated tables remain unavailable and cannot be seated twice",
    function (BookingHarness $t): void {
        $booking = staffBooking($t);
        $host = staffActor($t, "host");
        staffService($t, $t->date . " 17:30:00")->transition(
            $host,
            $booking["code"],
            1,
            "seat",
            "Guest arrived",
        );
        $input = staffInput($t, 2, "common", "19:15");
        $input["source"] = "walk_in";
        $input["option"] = [
            "kind" => "table",
            "id" => (int) $t->tables["C1"]["id"],
        ];
        $t->expectError(
            "unavailable",
            fn() => staffService($t, $t->date . " 19:01:00")->create(
                $host,
                $input,
            ),
        );
    },
);
$tests->test(
    "Staff changes preserve code, archive old assignments, and reject stale versions",
    function (BookingHarness $t): void {
        $booking = staffBooking($t);
        $host = staffActor($t, "host");
        $input = staffInput($t, 4, "common", "19:00") + [
            "code" => $booking["code"],
            "version" => 1,
            "reason" => "Guest requested larger party",
            "option" => [
                "kind" => "table",
                "id" => (int) $t->tables["C3"]["id"],
            ],
        ];
        $changed = staffService($t)->modify($host, $input);
        $t->assert(
            $changed["code"] === $booking["code"] && $changed["version"] === 2,
        );
        $t->assert($t->count("reservation_change_history") === 1);
        $t->expectError(
            "booking_changed",
            fn() => staffService($t)->modify($host, $input),
        );
        $t->hold("C1");
    },
);
$tests->test(
    "R15 cancellation promotes the highest fitting rank only after a real hold exists",
    function (BookingHarness $t): void {
        $host = staffActor($t, "host");
        $t->pdo->exec(
            "UPDATE `tables` SET is_active=0 WHERE code LIKE 'C%' AND code<>'C1'",
        );
        $booking = staffBooking($t);
        $large = staffService($t)->create($host, staffInput($t, 4), true);
        $small = staffService($t)->create($host, staffInput($t, 2), true);
        $t->service->cancel(
            (int) staffService($t)->row($booking["code"])["id"],
            "Guest cancellation",
        );
        $t->assert(
            staffService($t)->row($large["code"])["waitlist_offer_state"] ===
                "none",
        );
        $t->assert(
            staffService($t)->row($small["code"])["waitlist_offer_state"] ===
                "offered",
        );
        $t->assert($t->count("waitlist_offers") === 1);
        $t->expectError("unavailable", fn() => $t->hold("C1"));
        $t->assert(
            (int) $t->pdo
                ->query(
                    "SELECT COUNT(*) FROM outbox WHERE subject='Lumina waitlist offer'",
                )
                ->fetchColumn() === 1,
        );
    },
);
$tests->test(
    "Waitlist acceptance consumes the hold, keeps the code, and reserves all joined members",
    function (BookingHarness $t): void {
        $host = staffActor($t, "host");
        $t->pdo->exec("UPDATE `tables` SET is_active=0 WHERE code='G3'");
        $queued = staffService($t)->create(
            $host,
            staffInput($t, 13, "group"),
            true,
        );
        (new WaitlistService($t->pdo, new BookingClock($t->pdo)))->promote(
            $host,
            $t->date,
        );
        staffService($t)->transition(
            $host,
            $queued["code"],
            2,
            "accept_offer",
            "Guest accepted by phone",
        );
        $row = staffService($t)->row($queued["code"]);
        $t->assert(
            $row["status"] === "pending" &&
                $row["waitlist_offer_state"] === "accepted",
        );
        $t->assert(
            $t->count("reservation_tables") === 2 &&
                $t->count("hold_reservations") === 1,
        );
    },
);
$tests->test(
    "Expired waitlist offer is rejected and next rank gets the available hold",
    function (BookingHarness $t): void {
        $host = staffActor($t, "host");
        $t->pdo->exec(
            "UPDATE `tables` SET is_active=0 WHERE code LIKE 'C%' AND code<>'C1'",
        );
        $first = staffService($t)->create($host, staffInput($t), true);
        $second = staffService($t)->create($host, staffInput($t), true);
        (new WaitlistService($t->pdo, new BookingClock($t->pdo)))->promote(
            $host,
            $t->date,
        );
        $t->pdo->exec("UPDATE holds SET expires_at=NOW()");
        $t->expectError(
            "offer_expired",
            fn() => staffService($t)->transition(
                $host,
                $first["code"],
                2,
                "accept_offer",
                "Guest accepted",
            ),
        );
        (new WaitlistService($t->pdo, new BookingClock($t->pdo)))->promote(
            $host,
            $t->date,
        );
        $t->assert(
            staffService($t)->row($first["code"])["waitlist_offer_state"] ===
                "expired" &&
                staffService($t)->row($second["code"])[
                    "waitlist_offer_state"
                ] === "offered",
        );
    },
);
$tests->test(
    "R16 independent cancellations create one waitlist hold and one notification",
    function (BookingHarness $t): void {
        $host = staffActor($t, "host");
        $a = staffBooking($t, "C1");
        $b = staffBooking($t, "C2");
        $t->pdo->exec(
            "UPDATE `tables` SET is_active=0 WHERE code LIKE 'C%' AND code NOT IN ('C1','C2')",
        );
        staffService($t)->create($host, staffInput($t), true);
        $results = $t->finishWorkers(
            $t->startWorkers([
                [
                    "op" => "staff_transition",
                    "actor" => $host,
                    "code" => $a["code"],
                    "version" => 1,
                    "action" => "cancel",
                ],
                [
                    "op" => "staff_transition",
                    "actor" => $host,
                    "code" => $b["code"],
                    "version" => 1,
                    "action" => "cancel",
                ],
            ]),
        );
        $t->assert(
            count(array_filter($results, fn($r) => $r["ok"])) === 2 &&
                $t->count("waitlist_offers") === 1,
        );
        $t->assert(
            (int) $t->pdo
                ->query(
                    "SELECT COUNT(*) FROM outbox WHERE subject='Lumina waitlist offer'",
                )
                ->fetchColumn() === 1,
        );
    },
);
$tests->test("Two hosts cannot accept one offer twice", function (
    BookingHarness $t,
): void {
    $host = staffActor($t, "host");
    $q = staffService($t)->create($host, staffInput($t), true);
    (new WaitlistService($t->pdo, new BookingClock($t->pdo)))->promote(
        $host,
        $t->date,
    );
    $results = $t->finishWorkers(
        $t->startWorkers([
            [
                "op" => "staff_transition",
                "actor" => $host,
                "code" => $q["code"],
                "version" => 2,
                "action" => "accept_offer",
            ],
            [
                "op" => "staff_transition",
                "actor" => $host,
                "code" => $q["code"],
                "version" => 2,
                "action" => "accept_offer",
            ],
        ]),
    );
    $t->assert(
        count(array_filter($results, fn($r) => $r["ok"])) === 1 &&
            $t->count("hold_reservations") === 1 &&
            $t->count("reservation_tables") === 1,
    );
});
$tests->test(
    "Settings enforce roles, validation, shared policy, and stale-revision protection",
    function (BookingHarness $t): void {
        $admin = staffActor($t);
        $manager = staffActor($t, "manager");
        $host = staffActor($t, "host");
        $service = new StaffSettingsService($t->pdo, new BookingClock($t->pdo));
        $config = $service->get($admin);
        $t->expectError("staff_forbidden", fn() => $service->get($host));
        $t->expectError(
            "staff_forbidden",
            fn() => $service->save($manager, $config["revision"], "settings", [
                "hold_ttl_sec" => 120,
            ]),
        );
        $t->expectError(
            "invalid_settings",
            fn() => $service->save($admin, $config["revision"], "settings", [
                "venue_timezone" => "UTC",
            ]),
        );
        $new = $service->save($admin, $config["revision"], "settings", [
            "hold_ttl_sec" => 120,
        ]);
        $t->assert($new["settings"]["hold_ttl_sec"] === "120");
        $hold = $t->hold();
        $t->assert(
            $hold["expires_at_epoch"] - $hold["server_time_epoch"] === 120,
        );
        $t->expectError(
            "settings_changed",
            fn() => $service->save($admin, $config["revision"], "settings", [
                "hold_ttl_sec" => 600,
            ]),
        );
    },
);
$tests->test(
    "Manager changes dining times with audit; blackouts preserve existing bookings",
    function (BookingHarness $t): void {
        $manager = staffActor($t, "manager");
        $service = new StaffSettingsService($t->pdo, new BookingClock($t->pdo));
        $config = $service->get($manager);
        $turn = $config["turns"][0];
        $service->save($manager, $config["revision"], "turns", [
            ["id" => (int) $turn["id"], "turn_time_min" => 90],
        ]);
        $hold = $t->hold();
        $t->assert($hold["option"]["turn_time_min"] === 90);
        $blackout = [
            "scope" => "venue",
            "starts_at" => $t->date . " 17:30",
            "ends_at" => $t->date . " 20:00",
            "reason" => "Private service event",
        ];
        $t->expectError(
            "blackout_conflict",
            fn() => $service->blackout($manager, $blackout),
        );
        $t->service->release($hold["hold_token"], $t->owner);
        $id = $service->blackout($manager, $blackout)["id"];
        $t->expectError("unavailable", fn() => $t->hold());
        $service->blackout($manager, ["delete_id" => $id]);
        $t->hold();
    },
);
$tests->test(
    "Concurrent staff request retries create one booking and reject a changed payload",
    function (BookingHarness $t): void {
        $host = staffActor($t, "host");
        $input = staffInput($t) + [
            "request_key" => "a1111111-1111-4111-a111-111111111111",
        ];
        $results = $t->finishWorkers(
            $t->startWorkers([
                ["op" => "staff_create", "actor" => $host, "input" => $input],
                ["op" => "staff_create", "actor" => $host, "input" => $input],
            ]),
        );
        $t->assert(
            $results[0]["ok"] &&
                $results[1]["ok"] &&
                $results[0]["code"] === $results[1]["code"] &&
                $t->count("reservations") === 1 &&
                $t->count("staff_requests") === 1,
        );
        $changed = $input;
        $changed["party_size"] = 3;
        $t->expectError(
            "request_changed",
            fn() => staffService($t)->create($host, $changed),
        );
    },
);
$tests->test(
    "Waitlist expiry is rechecked after waiting for physical-table locks",
    function (BookingHarness $t): void {
        $host = staffActor($t, "host");
        $queued = staffService($t)->create($host, staffInput($t), true);
        (new WaitlistService($t->pdo, new BookingClock($t->pdo)))->promote(
            $host,
            $t->date,
        );
        $t->pdo->exec(
            "UPDATE holds SET expires_at=DATE_ADD(NOW(),INTERVAL 1 SECOND)",
        );
        $blocker = App\Core\Database::connect(
            require dirname(__DIR__) . "/config/database.php",
        );
        $blocker->beginTransaction();
        $blocker
            ->query("SELECT id FROM `tables` ORDER BY id LIMIT 1 FOR UPDATE")
            ->fetchColumn();
        $workers = $t->startWorkers([
            [
                "op" => "staff_transition",
                "actor" => $host,
                "code" => $queued["code"],
                "version" => 2,
                "action" => "accept_offer",
            ],
        ]);
        usleep(2200000);
        $blocker->commit();
        $result = $t->finishWorkers($workers)[0];
        $t->assert(
            !$result["ok"] &&
                $result["error"] === "offer_expired" &&
                $t->count("reservation_tables") === 0,
        );
    },
);
$tests->test(
    "Account revocation is rechecked after an inventory lock wait",
    function (BookingHarness $t): void {
        $host = staffActor($t, "host");
        $booking = staffBooking($t);
        $blocker = App\Core\Database::connect(
            require dirname(__DIR__) . "/config/database.php",
        );
        $blocker->beginTransaction();
        $blocker
            ->query("SELECT id FROM `tables` ORDER BY id LIMIT 1 FOR UPDATE")
            ->fetchColumn();
        $workers = $t->startWorkers([
            [
                "op" => "staff_transition",
                "actor" => $host,
                "code" => $booking["code"],
                "version" => 1,
                "action" => "cancel",
            ],
        ]);
        usleep(700000);
        $t->pdo
            ->prepare("UPDATE users SET is_active=0 WHERE id=?")
            ->execute([$host["id"]]);
        $blocker->commit();
        $result = $t->finishWorkers($workers)[0];
        $t->assert(
            !$result["ok"] &&
                $result["error"] === "staff_session_invalid" &&
                staffService($t)->row($booking["code"])["status"] ===
                    "confirmed",
        );
    },
);
$tests->test(
    "Reactivation and role round trips never restore an earlier session capability",
    function (BookingHarness $t): void {
        $admin = staffActor($t);
        $host = staffActor($t, "host");
        $auth = new StaffAuthService($t->pdo, new BookingClock($t->pdo));
        $auth->change($admin, $host["id"], "host", false);
        $auth->change($admin, $host["id"], "host", true);
        $t->expectError(
            "staff_session_invalid",
            fn() => StaffAccess::require($t->pdo, $host, "reservations.read"),
        );
        $fresh = staffActor($t, "host");
        $auth->change($admin, $fresh["id"], "manager", true);
        $auth->change($admin, $fresh["id"], "host", true);
        $t->expectError(
            "staff_session_invalid",
            fn() => StaffAccess::require($t->pdo, $fresh, "reservations.read"),
        );
    },
);
$tests->test(
    "Staff can reassign an existing future seating without restarting its online lead time",
    function (BookingHarness $t): void {
        $host = staffActor($t, "host");
        $booking = staffBooking($t);
        $service = staffService($t, $t->date . " 17:20:00");
        $slots = $service->availability(
            $host,
            $t->date,
            2,
            "common",
            "phone",
            $booking["code"],
        )["slots"];
        $t->assert(in_array("17:30", array_column($slots, "time"), true));
        $input = staffInput($t) + [
            "code" => $booking["code"],
            "version" => 1,
            "reason" => "Reassign before arrival",
            "option" => [
                "kind" => "table",
                "id" => (int) $t->tables["C2"]["id"],
            ],
        ];
        $t->assert($service->modify($host, $input)["version"] === 2);
    },
);
$tests->test(
    "Activation expiry is rechecked after the account row lock",
    function (BookingHarness $t): void {
        $auth = new StaffAuthService($t->pdo, new BookingClock($t->pdo));
        $invitation = $auth->issue(
            "locked-activation@lumina.test",
            "Locked Activation",
            "host",
        );
        $token = invitationToken($invitation);
        $q = $t->pdo->prepare("SELECT id FROM users WHERE email=?");
        $q->execute(["locked-activation@lumina.test"]);
        $id = (int) $q->fetchColumn();
        $t->pdo
            ->prepare(
                "UPDATE staff_activation_tokens SET expires_at=DATE_ADD(NOW(),INTERVAL 2 SECOND) WHERE user_id=?",
            )
            ->execute([$id]);
        $blocker = App\Core\Database::connect(
            require dirname(__DIR__) . "/config/database.php",
        );
        $blocker->beginTransaction();
        $blocker
            ->query("SELECT id FROM users WHERE id=" . $id . " FOR UPDATE")
            ->fetchColumn();
        $workers = $t->startWorkers([
            [
                "op" => "staff_activate",
                "token" => $token,
                "password" => STAFF_TEST_PASSWORD,
            ],
        ]);
        usleep(3200000);
        $blocker->commit();
        $result = $t->finishWorkers($workers)[0];
        $t->assert(!$result["ok"] && $result["error"] === "activation_invalid");
    },
);
$tests->test(
    "Absolute staff session expiry is rechecked after an inventory lock wait",
    function (BookingHarness $t): void {
        $host = staffActor($t, "host");
        $host["expires_at"] =
            (new BookingClock($t->pdo))->now()->getTimestamp() + 1;
        $booking = staffBooking($t);
        $blocker = App\Core\Database::connect(
            require dirname(__DIR__) . "/config/database.php",
        );
        $blocker->beginTransaction();
        $blocker
            ->query("SELECT id FROM `tables` ORDER BY id LIMIT 1 FOR UPDATE")
            ->fetchColumn();
        $workers = $t->startWorkers([
            [
                "op" => "staff_transition",
                "actor" => $host,
                "code" => $booking["code"],
                "version" => 1,
                "action" => "cancel",
            ],
        ]);
        usleep(2200000);
        $blocker->commit();
        $result = $t->finishWorkers($workers)[0];
        $t->assert(
            !$result["ok"] &&
                $result["error"] === "staff_session_invalid" &&
                staffService($t)->row($booking["code"])["status"] ===
                    "confirmed",
        );
    },
);
$tests->finish();
