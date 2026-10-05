<?php
declare(strict_types=1);
namespace App\Controller;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\StaffAccess;
use App\Core\StaffSession;
use App\Domain\BookingError;
use App\Service\BookingClock;
use App\Service\CatalogService;
use App\Service\StaffAuthService;
use App\Service\StaffReservationService;
use App\Service\StaffSettingsService;
use App\Service\WaitlistService;
use PDO;

final class StaffController
{
    private PDO $pdo;
    private BookingClock $clock;

    public function __construct()
    {
        $this->pdo = Database::connect(
            require dirname(__DIR__, 2) . "/config/database.php",
        );
        $this->clock = new BookingClock($this->pdo);
    }

    public function loginPage(Request $request): Response
    {
        return $this->page("login");
    }
    public function activationPage(Request $request): Response
    {
        return $this->page("activate");
    }
    public function adminPage(Request $request): Response
    {
        try {
            StaffAccess::require(
                $this->pdo,
                StaffSession::open($this->pdo)->requireActor(),
                "reservations.read",
            );
        } catch (BookingError $error) {
            if ($error->httpStatus === 401) {
                return new Response("", 303, "text/html; charset=utf-8", [
                    "Location" => "/staff/login",
                ]);
            }
            return new Response(
                "Your role cannot open the host dashboard.",
                403,
                "text/plain; charset=utf-8",
            );
        }
        return $this->page("admin");
    }

    private function page(string $view): Response
    {
        return new Response(
            str_replace(
                "{{view}}",
                $view,
                file_get_contents(dirname(__DIR__) . "/View/staff.php"),
            ),
        );
    }

    public function me(Request $request): Response
    {
        return $this->respond(function (): array {
            $session = StaffSession::open($this->pdo);
            $user = null;
            if ($session->actor) {
                $q = $this->pdo->prepare(
                    "SELECT u.*, r.code AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?",
                );
                $q->execute([$session->actor["id"]]);
                $user = StaffAccess::publicUser($q->fetch());
            }
            return [
                "user" => $user,
                "csrf_token" => $session->csrfToken,
                "server_time_epoch" => $this->clock->now()->getTimestamp(),
            ];
        });
    }

    public function login(Request $request): Response
    {
        return $this->respond(function () use ($request): array {
            [$session, $data] = $this->mutation($request);
            $user = (new StaffAuthService($this->pdo, $this->clock))->login(
                $this->text($data, "email", 190),
                $this->text($data, "password", 1024),
                $_SERVER["REMOTE_ADDR"] ?? "local",
            );
            $session->establish($user, $this->clock->now()->getTimestamp());
            return ["user" => StaffAccess::publicUser($user)];
        });
    }

    public function activate(Request $request): Response
    {
        return $this->respond(function () use ($request): array {
            [$session, $data] = $this->mutation($request);
            if (
                $this->text($data, "password", 1024) !==
                $this->text($data, "password_confirmation", 1024)
            ) {
                throw new BookingError(
                    "password_mismatch",
                    "Passwords do not match.",
                );
            }
            $user = (new StaffAuthService($this->pdo, $this->clock))->activate(
                $this->text($data, "token", 64),
                $data["password"],
            );
            $session->establish($user, $this->clock->now()->getTimestamp());
            return ["user" => StaffAccess::publicUser($user)];
        });
    }

    public function logout(Request $request): Response
    {
        return $this->respond(function () use ($request): array {
            [$session] = $this->mutation($request);
            $session->logout();
            if ($session->actor) {
                $q = $this->pdo->prepare(
                    "SELECT u.*, r.code AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?",
                );
                $q->execute([$session->actor["id"]]);
                $user = $q->fetch();
                if ($user) {
                    (new StaffAuthService($this->pdo, $this->clock))->audit(
                        $user,
                        "staff.logout",
                        "user",
                        (string) $user["id"],
                        null,
                        null,
                    );
                }
            }
            return [];
        });
    }

    public function dashboard(Request $request): Response
    {
        return $this->respond(function () use ($request): array {
            $actor = $this->actor("reservations.read");
            $date = $this->date(
                $request->query["date"] ?? $this->clock->now()->format("Y-m-d"),
            );
            $status = $this->text($request->query, "status", 16, "all");
            if (
                !in_array(
                    $status,
                    [
                        "all",
                        "pending",
                        "confirmed",
                        "seated",
                        "completed",
                        "cancelled",
                        "no_show",
                        "waitlisted",
                    ],
                    true,
                )
            ) {
                throw new BookingError(
                    "invalid_status",
                    "Choose a valid status filter.",
                );
            }
            $qText = $this->text($request->query, "q", 100, "");
            $page = $this->integer($request->query, "page", 1);
            if ($page > 10000) {
                throw new BookingError("invalid_page", "Choose a valid page.");
            }
            $base =
                " FROM reservations r JOIN guests g ON g.id=r.guest_id JOIN room_types rt ON rt.id=r.room_type_id WHERE r.starts_at>=? AND r.starts_at<DATE_ADD(?, INTERVAL 1 DAY)";
            $args = [$date . " 00:00:00", $date . " 00:00:00"];
            if ($status !== "all") {
                $base .= " AND r.status=?";
                $args[] = $status;
            }
            if ($qText !== "") {
                $base .=
                    " AND (r.code LIKE ? OR g.full_name LIKE ? OR g.phone LIKE ?)";
                array_push(
                    $args,
                    "%" . $qText . "%",
                    "%" . $qText . "%",
                    "%" . $qText . "%",
                );
            }
            $q = $this->pdo->prepare("SELECT COUNT(*)" . $base);
            $q->execute($args);
            $count = (int) $q->fetchColumn();
            $q = $this->pdo->prepare(
                "SELECT r.id,r.code,r.party_size,r.starts_at,r.ends_at,r.blocks_until,r.status,r.source,r.approval_state,r.version,r.waitlist_rank,r.waitlist_offer_state,r.waitlist_offer_expires_at,g.full_name,g.phone,rt.name AS room,
                (SELECT GROUP_CONCAT(t.code ORDER BY t.id SEPARATOR ' + ') FROM reservation_tables a JOIN `tables` t ON t.id=a.table_id WHERE a.reservation_id=r.id AND a.released_at IS NULL) AS tables" .
                    $base .
                    " ORDER BY r.starts_at,r.waitlist_rank,r.id LIMIT 25 OFFSET " .
                    ($page - 1) * 25,
            );
            $q->execute($args);
            $rows = $q->fetchAll();
            foreach ($rows as &$row) {
                if (
                    $row["waitlist_offer_state"] === "offered" &&
                    $row["waitlist_offer_expires_at"] <=
                        $this->clock->now()->format("Y-m-d H:i:s")
                ) {
                    $row["waitlist_offer_state"] = "expired";
                }
            }
            unset($row);
            $q = $this->pdo->prepare(
                "SELECT COUNT(*) AS total,SUM(status='pending') AS pending,SUM(status='confirmed') AS confirmed,SUM(status='seated') AS seated,SUM(status='waitlisted') AS waitlisted,COALESCE(SUM(IF(status IN ('seated','completed'),party_size,0)),0) AS covers FROM reservations WHERE starts_at>=? AND starts_at<DATE_ADD(?, INTERVAL 1 DAY)",
            );
            $q->execute([$date . " 00:00:00", $date . " 00:00:00"]);
            $stats = $q->fetch();
            $now = $this->clock->now();
            $time = $this->text(
                $request->query,
                "time",
                5,
                $date === $now->format("Y-m-d") ? $now->format("H:i") : "17:30",
            );
            if (!preg_match('/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/D', $time)) {
                throw new BookingError("invalid_time", "Use HH:MM.");
            }
            $at = $date . " " . $time . ":00";
            $q = $this->pdo->prepare(
                "SELECT a.table_id,r.code,r.status,g.full_name,r.party_size FROM reservation_tables a JOIN reservations r ON r.id=a.reservation_id JOIN guests g ON g.id=r.guest_id WHERE a.released_at IS NULL AND r.status IN ('pending','confirmed','seated') AND ((r.starts_at<=? AND r.blocks_until>?) OR (r.status='seated' AND DATE(r.starts_at)=?)) ORDER BY r.status='seated'",
            );
            $q->execute([$at, $at, $date]);
            $floor = $q->fetchAll();
            $q = $this->pdo->prepare(
                "SELECT ht.table_id,h.expires_at FROM hold_tables ht JOIN holds h ON h.id=ht.hold_id WHERE h.status='active' AND h.expires_at>? AND h.starts_at<=? AND h.blocks_until>?",
            );
            $q->execute([$now->format("Y-m-d H:i:s"), $at, $at]);
            $holds = $q->fetchAll();
            $q = $this->pdo->prepare(
                "SELECT * FROM blackout_dates WHERE starts_at<DATE_ADD(?,INTERVAL 1 DAY) AND ends_at>? ORDER BY starts_at,id",
            );
            $q->execute([$date . " 00:00:00", $date . " 00:00:00"]);
            return [
                "date" => $date,
                "time" => $time,
                "rows" => $rows,
                "page" => $page,
                "pages" => max(1, (int) ceil($count / 25)),
                "count" => $count,
                "stats" => $stats,
                "floor" => $floor,
                "holds" => $holds,
                "blackouts" => $q->fetchAll(),
                "server_time_epoch" => $now->getTimestamp(),
            ];
        });
    }

    public function detail(Request $request): Response
    {
        return $this->respond(function () use ($request): array {
            $this->actor("reservations.read");
            $row = (new StaffReservationService($this->pdo, $this->clock))->row(
                $this->text($request->query, "code", 10),
            );
            $q = $this->pdo->prepare(
                "SELECT full_name,phone,email FROM guests WHERE id=?",
            );
            $q->execute([$row["guest_id"]]);
            $row["guest"] = $q->fetch();
            $q = $this->pdo->prepare(
                "SELECT t.id,t.code,t.label,a.released_at,a.slot_start FROM reservation_tables a JOIN `tables` t ON t.id=a.table_id WHERE a.reservation_id=? ORDER BY t.id",
            );
            $q->execute([$row["id"]]);
            $row["tables"] = $q->fetchAll();
            $q = $this->pdo->prepare(
                "SELECT h.from_status,h.to_status,h.reason,h.changed_at,u.full_name AS actor FROM reservation_status_history h LEFT JOIN users u ON u.id=h.actor_user_id WHERE reservation_id=? ORDER BY h.id",
            );
            $q->execute([$row["id"]]);
            $row["history"] = $q->fetchAll();
            $q = $this->pdo->prepare(
                "SELECT id,status,opened_at,closed_at FROM orders WHERE reservation_id=? ORDER BY id",
            );
            $q->execute([$row["id"]]);
            $row["orders"] = $q->fetchAll();
            if (
                $row["waitlist_offer_state"] === "offered" &&
                $row["waitlist_offer_expires_at"] <=
                    $this->clock->now()->format("Y-m-d H:i:s")
            ) {
                $row["waitlist_offer_state"] = "expired";
            }
            return [
                "booking" => $row,
                "server_time_epoch" => $this->clock->now()->getTimestamp(),
                "no_show_grace_min" => (new \App\Service\BookingPolicy(
                    $this->pdo,
                ))->number("no_show_grace_min"),
            ];
        });
    }

    public function availability(Request $request): Response
    {
        return $this->respond(
            fn() => [
                "availability" => (new StaffReservationService(
                    $this->pdo,
                    $this->clock,
                ))->availability(
                    $this->actor("reservations.read"),
                    $this->text($request->query, "date", 10),
                    $this->integer($request->query, "party_size"),
                    $this->text($request->query, "room_type", 24),
                    $this->text($request->query, "source", 16, "phone"),
                    isset($request->query["code"])
                        ? $this->text($request->query, "code", 10)
                        : null,
                ),
            ],
        );
    }
    public function create(Request $request): Response
    {
        return $this->newReservation($request, false);
    }
    public function enqueue(Request $request): Response
    {
        return $this->newReservation($request, true);
    }
    private function newReservation(Request $request, bool $waitlist): Response
    {
        return $this->respond(function () use ($request, $waitlist): array {
            [$session, $data] = $this->mutation($request);
            $actor = $session->requireActor();
            StaffAccess::require($this->pdo, $actor, "reservations.write");
            $input = $this->bookingInput($data);
            $input["request_key"] = $this->requestKey($data, "request_key");
            $input["source"] = $this->text($data, "source", 16);
            if (!is_array($data["guest"] ?? null)) {
                throw new BookingError("invalid_guest", "Enter guest details.");
            }
            $input["guest"] = $data["guest"];
            return [
                "booking" => (new StaffReservationService(
                    $this->pdo,
                    $this->clock,
                ))->create($actor, $input, $waitlist),
            ];
        });
    }
    public function status(Request $request): Response
    {
        return $this->respond(function () use ($request): array {
            [$session, $data] = $this->mutation($request);
            $actor = $session->requireActor();
            StaffAccess::require($this->pdo, $actor, "reservations.write");
            return (new StaffReservationService(
                $this->pdo,
                $this->clock,
            ))->transition(
                $actor,
                $this->text($data, "code", 10),
                $this->integer($data, "version"),
                $this->text($data, "action", 24),
                $this->text($data, "reason", 255),
            );
        });
    }
    public function modify(Request $request): Response
    {
        return $this->respond(function () use ($request): array {
            [$session, $data] = $this->mutation($request);
            $actor = $session->requireActor();
            StaffAccess::require($this->pdo, $actor, "reservations.write");
            $input = $this->bookingInput($data);
            $input += [
                "code" => $this->text($data, "code", 10),
                "version" => $this->integer($data, "version"),
                "reason" => $this->text($data, "reason", 255),
                "special_requests" => $this->text(
                    $data,
                    "special_requests",
                    2000,
                    "",
                ),
            ];
            if (!isset($input["option"])) {
                throw new BookingError(
                    "invalid_option",
                    "Choose a replacement table.",
                );
            }
            return [
                "booking" => (new StaffReservationService(
                    $this->pdo,
                    $this->clock,
                ))->modify($actor, $input),
            ];
        });
    }
    public function promote(Request $request): Response
    {
        return $this->respond(function () use ($request): array {
            [$session, $data] = $this->mutation($request);
            return (new WaitlistService($this->pdo, $this->clock))->promote(
                $session->requireActor(),
                $this->text($data, "date", 10),
            );
        });
    }
    public function settings(Request $request): Response
    {
        return $this->respond(
            fn() => [
                "configuration" => (new StaffSettingsService(
                    $this->pdo,
                    $this->clock,
                ))->get($this->actor("settings.read")),
            ],
        );
    }
    public function saveSettings(Request $request): Response
    {
        return $this->respond(function () use ($request): array {
            [$session, $data] = $this->mutation($request);
            if (!is_array($data["values"] ?? null)) {
                throw new BookingError(
                    "invalid_settings",
                    "Send valid settings.",
                );
            }
            return [
                "configuration" => (new StaffSettingsService(
                    $this->pdo,
                    $this->clock,
                ))->save(
                    $session->requireActor(),
                    $this->text($data, "revision", 64),
                    $this->text($data, "kind", 24),
                    $data["values"],
                ),
            ];
        });
    }
    public function blackout(Request $request): Response
    {
        return $this->respond(function () use ($request): array {
            [$session, $data] = $this->mutation($request);
            if (isset($data["delete_id"])) {
                $data = ["delete_id" => $this->integer($data, "delete_id")];
            }
            return (new StaffSettingsService(
                $this->pdo,
                $this->clock,
            ))->blackout($session->requireActor(), $data);
        });
    }
    public function staff(Request $request): Response
    {
        return $this->respond(function (): array {
            $this->actor("staff.manage");
            return [
                "users" => $this->pdo
                    ->query(
                        "SELECT u.id,u.full_name,u.email,u.is_active,u.last_login_at,r.code AS role FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.id",
                    )
                    ->fetchAll(),
            ];
        });
    }
    public function invite(Request $request): Response
    {
        return $this->respond(function () use ($request): array {
            [$session, $data] = $this->mutation($request);
            $session->requireRecent($this->pdo);
            return (new StaffAuthService($this->pdo, $this->clock))->issue(
                $this->text($data, "email", 190),
                $this->text($data, "full_name", 120),
                $this->text($data, "role", 24),
                $session->requireActor(),
            );
        });
    }
    public function changeStaff(Request $request): Response
    {
        return $this->respond(function () use ($request): array {
            [$session, $data] = $this->mutation($request);
            $session->requireRecent($this->pdo);
            if (!is_bool($data["is_active"] ?? null)) {
                throw new BookingError(
                    "staff_input_invalid",
                    "Choose active or inactive.",
                );
            }
            (new StaffAuthService($this->pdo, $this->clock))->change(
                $session->requireActor(),
                $this->integer($data, "id"),
                $this->text($data, "role", 24),
                $data["is_active"],
            );
            return [];
        });
    }
    public function audit(Request $request): Response
    {
        return $this->respond(function () use ($request): array {
            $this->actor("audit.read");
            $page = $this->integer($request->query, "page", 1);
            if ($page > 10000) {
                throw new BookingError("invalid_page", "Choose a valid page.");
            }
            $q = $this->pdo->prepare(
                "SELECT a.*,u.full_name AS actor FROM audit_log a LEFT JOIN users u ON u.id=a.actor_user_id ORDER BY a.id DESC LIMIT 50 OFFSET " .
                    ($page - 1) * 50,
            );
            $q->execute();
            return [
                "events" => $q->fetchAll(),
                "page" => $page,
                "pages" => max(
                    1,
                    (int) ceil(
                        (int) $this->pdo
                            ->query("SELECT COUNT(*) FROM audit_log")
                            ->fetchColumn() / 50,
                    ),
                ),
            ];
        });
    }
    public function outbox(Request $request): Response
    {
        return $this->respond(function (): array {
            $this->actor("audit.read");
            return [
                "messages" => $this->pdo
                    ->query(
                        "SELECT o.id,o.channel,o.recipient,o.subject,o.body,o.created_at,r.code FROM outbox o LEFT JOIN reservations r ON r.id=o.reservation_id ORDER BY o.id DESC LIMIT 100",
                    )
                    ->fetchAll(),
            ];
        });
    }

    public function requestStatus(Request $request): Response
    {
        return $this->respond(function () use ($request): array {
            $actor = $this->actor("reservations.read");
            $key = $this->requestKey($request->query, "key");
            $q = $this->pdo->prepare(
                "SELECT r.code,r.status,r.version FROM staff_requests s JOIN reservations r ON r.id=s.reservation_id WHERE s.user_id=? AND s.request_key=?",
            );
            $q->execute([$actor["id"], $key]);
            $row = $q->fetch();
            if (!$row) {
                throw new BookingError(
                    "request_not_found",
                    "No saved booking was found for this request.",
                    404,
                );
            }
            return ["booking" => $row];
        });
    }
    private function requestKey(array $data, string $key): string
    {
        $value = $this->text($data, $key, 36);
        if (
            !preg_match(
                '/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/D',
                $value,
            )
        ) {
            throw new BookingError(
                "invalid_request",
                "Use a valid booking request key.",
            );
        }
        return $value;
    }

    private function actor(string $permission): array
    {
        $actor = StaffSession::open($this->pdo)->requireActor();
        StaffAccess::require($this->pdo, $actor, $permission);
        return $actor;
    }
    private function mutation(Request $request): array
    {
        $session = StaffSession::open($this->pdo);
        $session->csrf($request);
        if (
            strtolower(
                trim(explode(";", $request->header("Content-Type"), 2)[0]),
            ) !== "application/json"
        ) {
            throw new BookingError(
                "unsupported_content_type",
                "Send application/json.",
                415,
            );
        }
        return [$session, $request->json()];
    }
    private function bookingInput(array $data): array
    {
        $input = [
            "date" => $this->text($data, "date", 10),
            "time" => $this->text($data, "time", 5),
            "party_size" => $this->integer($data, "party_size"),
            "room_type" => $this->text($data, "room_type", 24),
        ];
        if (isset($data["option"])) {
            if (
                !is_array($data["option"]) ||
                !in_array(
                    $data["option"]["kind"] ?? null,
                    ["table", "group"],
                    true,
                )
            ) {
                throw new BookingError(
                    "invalid_option",
                    "Choose a table or declared group.",
                );
            }
            $input["option"] = [
                "kind" => $data["option"]["kind"],
                "id" => $this->integer($data["option"], "id"),
            ];
        }
        return $input;
    }
    private function text(
        array $data,
        string $key,
        int $max,
        ?string $default = null,
    ): string {
        $value = $data[$key] ?? $default;
        if (!is_string($value) || strlen($value) > $max) {
            throw new BookingError("invalid_request", "Check field: " . $key);
        }
        return $value;
    }
    private function integer(
        array $data,
        string $key,
        ?int $default = null,
    ): int {
        $value = $data[$key] ?? $default;
        if (
            (!is_int($value) && (!is_string($value) || !ctype_digit($value))) ||
            (float) $value > PHP_INT_MAX ||
            (int) $value < 1
        ) {
            throw new BookingError("invalid_request", "Check field: " . $key);
        }
        return (int) $value;
    }
    private function date(mixed $value): string
    {
        if (!is_string($value)) {
            throw new BookingError(
                "invalid_date",
                "Choose a valid service date.",
            );
        }
        $date = \DateTimeImmutable::createFromFormat(
            "!Y-m-d",
            $value,
            new \DateTimeZone("Asia/Manila"),
        );
        if (!$date || $date->format("Y-m-d") !== $value) {
            throw new BookingError(
                "invalid_date",
                "Choose a valid service date.",
            );
        }
        return $value;
    }
    private function respond(\Closure $action): Response
    {
        try {
            return Response::json(["ok" => true] + $action());
        } catch (BookingError $error) {
            return Response::json(
                [
                    "ok" => false,
                    "error" => [
                        "code" => $error->errorCode,
                        "message" => $error->getMessage(),
                    ],
                ],
                $error->httpStatus,
            );
        } catch (\JsonException | \InvalidArgumentException $error) {
            return Response::json(
                [
                    "ok" => false,
                    "error" => [
                        "code" => "invalid_request",
                        "message" => "Send a valid JSON object.",
                    ],
                ],
                400,
            );
        }
    }
}
