<?php
declare(strict_types=1);
namespace App\Controller;
use App\Core\{Database, Request, Response, StaffAccess, StaffSession};
use App\Domain\BookingError;
use App\Service\{BookingClock, OrderService};
use PDO;

final class OrderController
{
    private PDO $pdo;
    private BookingClock $clock;
    private OrderService $service;
    public function __construct()
    {
        $this->pdo = Database::connect(
            require dirname(__DIR__, 2) . "/config/database.php",
        );
        $this->clock = new BookingClock($this->pdo);
        $this->service = new OrderService($this->pdo, $this->clock);
    }
    public function serverPage(Request $r): Response
    {
        return $this->page("server", "orders.read");
    }
    public function kitchenPage(Request $r): Response
    {
        return $this->page("kitchen", "kitchen.read");
    }
    private function page(string $mode, string $permission): Response
    {
        try {
            StaffAccess::require(
                $this->pdo,
                StaffSession::open($this->pdo)->requireActor(),
                $permission,
            );
        } catch (BookingError $e) {
            return $e->httpStatus === 401
                ? new Response("", 303, "text/html", [
                    "Location" => "/staff/login",
                ])
                : new Response(
                    "Your role cannot open this workspace.",
                    403,
                    "text/plain",
                );
        }
        return new Response(
            str_replace(
                "{{mode}}",
                $mode,
                file_get_contents(dirname(__DIR__) . "/View/service.php"),
            ),
        );
    }
    public function menu(Request $r): Response
    {
        return $this->respond(
            fn() => ["menu" => $this->service->catalog($this->actor())],
        );
    }
    public function orders(Request $r): Response
    {
        return $this->respond(
            fn() => $this->service->listing($this->actor(), $this->date($r)),
        );
    }
    public function detail(Request $r): Response
    {
        return $this->respond(
            fn() => [
                "order" => $this->service->detail(
                    $this->actor(),
                    $this->id($r->query, "id"),
                ),
            ],
        );
    }
    public function kitchen(Request $r): Response
    {
        return $this->respond(function () use ($r): array {
            $station = $r->query["station"] ?? "all";
            if (!is_string($station)) {
                throw new BookingError("invalid_station", "Choose a station.");
            }
            return $this->service->kitchen(
                $this->actor(),
                $this->date($r),
                $station,
            );
        });
    }
    public function mutate(Request $r): Response
    {
        return $this->respond(function () use ($r): array {
            $session = StaffSession::open($this->pdo);
            $actor = $session->requireActor();
            $session->csrf($r);
            if (
                strtolower(
                    trim(explode(";", $r->header("Content-Type"), 2)[0]),
                ) !== "application/json"
            ) {
                throw new BookingError(
                    "unsupported_content_type",
                    "Send application/json.",
                    415,
                );
            }
            $data = $r->json();
            if (
                !is_string($data["action"] ?? null) ||
                !is_string($data["request_key"] ?? null) ||
                !is_array($data["data"] ?? [])
            ) {
                throw new BookingError(
                    "invalid_request",
                    "Check the order action.",
                );
            }
            return $this->service->mutate(
                $actor,
                $this->id($data, "id"),
                $this->id($data, "version"),
                $data["action"],
                $data["request_key"],
                $data["data"] ?? [],
            );
        });
    }
    private function actor(): array
    {
        return StaffSession::open($this->pdo)->requireActor();
    }
    private function id(array $data, string $key): int
    {
        $v = $data[$key] ?? null;
        if (
            (!is_int($v) && (!is_string($v) || !ctype_digit($v))) ||
            (float) $v > PHP_INT_MAX ||
            (int) $v < 1
        ) {
            throw new BookingError("invalid_request", "Check " . $key . ".");
        }
        return (int) $v;
    }
    private function date(Request $r): string
    {
        $v = $r->query["date"] ?? $this->clock->now()->format("Y-m-d");
        $d = is_string($v)
            ? \DateTimeImmutable::createFromFormat("!Y-m-d", $v)
            : false;
        if (!$d || $d->format("Y-m-d") !== $v) {
            throw new BookingError(
                "invalid_date",
                "Choose a valid service date.",
            );
        }
        return $v;
    }
    private function respond(\Closure $fn): Response
    {
        try {
            return Response::json(["ok" => true] + $fn());
        } catch (BookingError $e) {
            return Response::json(
                [
                    "ok" => false,
                    "error" => [
                        "code" => $e->errorCode,
                        "message" => $e->getMessage(),
                    ],
                ],
                $e->httpStatus,
            );
        } catch (\JsonException | \InvalidArgumentException $e) {
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
