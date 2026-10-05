<?php
declare(strict_types=1);

namespace App\Controller;

use App\Core\Database;
use App\Core\GuestSession;
use App\Core\Request;
use App\Core\Response;
use App\Domain\BookingError;
use App\Service\AvailabilityService;
use App\Service\BookingClock;
use App\Service\BookingService;
use Closure;
use InvalidArgumentException;
use JsonException;

final class BookingController
{
    public function session(Request $request): Response
    {
        $session = GuestSession::open();
        return Response::json(['ok' => true, 'csrf_token' => $session->csrfToken]);
    }

    public function availability(Request $request): Response
    {
        return $this->respond(function () use ($request): Response {
            $pdo = Database::connect(require dirname(__DIR__, 2) . '/config/database.php');
            $service = new AvailabilityService($pdo, new BookingClock($pdo));
            return Response::json(['ok' => true, 'availability' => $service->search(
                $this->string($request->query, 'date'), $this->integer($request->query, 'party_size'),
                $this->string($request->query, 'room_type', 'any'))]);
        });
    }

    public function hold(Request $request): Response
    {
        return $this->respond(function () use ($request): Response {
            [$session, $data, $service] = $this->mutation($request);
            $option = $data['option'] ?? null;
            if ($option !== null && !is_array($option)) {
                throw new BookingError('invalid_option', 'Choose a table or group.');
            }
            $hold = $service->hold($this->string($data, 'date'), $this->string($data, 'time'),
                $this->integer($data, 'party_size'), $this->string($data, 'room_type', 'any'), $session->ownerHash,
                $option === null ? null : $this->string($option, 'kind'),
                $option === null ? null : $this->integer($option, 'id'));
            return Response::json(['ok' => true, 'hold' => $hold], 201);
        });
    }

    public function confirm(Request $request): Response
    {
        return $this->respond(function () use ($request): Response {
            [$session, $data, $service] = $this->mutation($request);
            if (!isset($data['guest']) || !is_array($data['guest'])) {
                throw new BookingError('invalid_guest', 'Provide guest details.');
            }
            $booking = $service->confirm($this->string($data, 'hold_token'), $data['guest'], $session->ownerHash);
            return Response::json(['ok' => true, 'booking' => $booking], $booking['created'] ? 201 : 200);
        });
    }

    public function release(Request $request): Response
    {
        return $this->respond(function () use ($request): Response {
            [$session, $data, $service] = $this->mutation($request);
            return Response::json(['ok' => true, 'hold' => $service->release($this->string($data, 'hold_token'), $session->ownerHash)]);
        });
    }

    private function mutation(Request $request): array
    {
        $session = GuestSession::open();
        $session->requireCsrf($request);
        if (strtolower(trim(explode(';', $request->header('Content-Type'), 2)[0])) !== 'application/json') {
            throw new BookingError('unsupported_content_type', 'Send application/json.', 415);
        }
        $data = $request->json();
        $pdo = Database::connect(require dirname(__DIR__, 2) . '/config/database.php');
        return [$session, $data, new BookingService($pdo, new BookingClock($pdo))];
    }

    private function respond(Closure $action): Response
    {
        try {
            return $action();
        } catch (BookingError $error) {
            return Response::json(['ok' => false, 'error' => ['code' => $error->errorCode, 'message' => $error->getMessage()]], $error->httpStatus);
        } catch (JsonException | InvalidArgumentException $error) {
            return Response::json(['ok' => false, 'error' => ['code' => 'invalid_request', 'message' => 'Check the JSON request body.']], 400);
        }
    }

    private function string(array $data, string $key, ?string $default = null): string
    {
        $value = $data[$key] ?? $default;
        if (!is_string($value) || strlen($value) > 100) {
            throw new BookingError('invalid_request', 'Check field: ' . $key);
        }
        return $value;
    }

    private function integer(array $data, string $key): int
    {
        $value = $data[$key] ?? null;
        if ((!is_int($value) && (!is_string($value) || !ctype_digit($value)))
            || (float) $value > PHP_INT_MAX || (int) $value < 1) {
            throw new BookingError('invalid_request', 'Check field: ' . $key);
        }
        return (int) $value;
    }
}
