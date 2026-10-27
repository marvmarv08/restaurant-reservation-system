<?php
declare(strict_types=1);

namespace App\Controller;

use App\Core\Database;
use App\Core\GuestSession;
use App\Core\Request;
use App\Core\Response;
use App\Domain\BookingError;
use App\Service\BookingClock;
use App\Service\ManagementService;
use Closure;
use InvalidArgumentException;
use JsonException;

final class ManagementController
{
    public function show(Request $request): Response
    {
        return $this->respond(function () use ($request): array {
            return ['booking' => $this->service()->read($this->text($request->query, 'code'), $request->header('X-Booking-Token'))];
        });
    }

    public function availability(Request $request): Response
    {
        return $this->respond(function () use ($request): array {
            return ['availability' => $this->service()->search($this->text($request->query, 'code'), $request->header('X-Booking-Token'),
                $this->text($request->query, 'date'), $this->integer($request->query, 'party_size'), $this->text($request->query, 'room_type', 'any'))];
        });
    }

    public function cancel(Request $request): Response
    {
        return $this->respond(function () use ($request): array {
            $data = $this->mutation($request);
            return ['booking' => $this->service()->cancel($this->text($data, 'code'), $request->header('X-Booking-Token'), $this->integer($data, 'version'))];
        });
    }

    public function modify(Request $request): Response
    {
        return $this->respond(function () use ($request): array {
            $data = $this->mutation($request);
            $option = $data['option'] ?? null;
            if ($option !== null && !is_array($option)) {
                throw new BookingError('invalid_option', 'Choose a table or group.');
            }
            return ['booking' => $this->service()->modify($this->text($data, 'code'), $request->header('X-Booking-Token'),
                $this->integer($data, 'version'), $this->text($data, 'date'), $this->text($data, 'time'),
                $this->integer($data, 'party_size'), $this->text($data, 'room_type', 'any'),
                $option === null ? null : $this->text($option, 'kind'), $option === null ? null : $this->integer($option, 'id'),
                $this->text($data, 'special_requests', '', 2000),is_array($data['policy_acceptance']??null)?$data['policy_acceptance']:null)];
        });
    }

    public function preorderQuote(Request $request):Response
    {
        return $this->respond(function()use($request):array{
            $data=$this->mutation($request);
            return $this->service()->preorder($this->text($data,'code'),$request->header('X-Booking-Token'),$data['cart']??null);
        });
    }
    public function preorderSave(Request $request):Response
    {
        return $this->respond(function()use($request):array{
            $data=$this->mutation($request);
            return $this->service()->preorder($this->text($data,'code'),$request->header('X-Booking-Token'),null,$this->integer($data,'version'),is_array($data['preorder']??null)?$data['preorder']:[]);
        });
    }

    private function service(): ManagementService
    {
        $pdo = Database::connect(require dirname(__DIR__, 2) . '/config/database.php');
        return new ManagementService($pdo, new BookingClock($pdo));
    }

    private function mutation(Request $request): array
    {
        GuestSession::open()->requireCsrf($request);
        if (strtolower(trim(explode(';', $request->header('Content-Type'), 2)[0])) !== 'application/json') {
            throw new BookingError('unsupported_content_type', 'Send application/json.', 415);
        }
        return $request->json();
    }

    private function respond(Closure $action): Response
    {
        try {
            return Response::json(['ok' => true] + $action());
        } catch (BookingError $error) {
            return Response::json(['ok' => false, 'error' => ['code' => $error->errorCode, 'message' => $error->getMessage()]], $error->httpStatus);
        } catch (JsonException | InvalidArgumentException $error) {
            return Response::json(['ok' => false, 'error' => ['code' => 'invalid_request', 'message' => 'Check the JSON request body.']], 400);
        }
    }

    private function text(array $data, string $field, ?string $default = null, int $limit = 100): string
    {
        $value = $data[$field] ?? $default;
        if (!is_string($value) || strlen($value) > $limit) {
            throw new BookingError('invalid_request', 'Check field: ' . $field);
        }
        return $value;
    }

    private function integer(array $data, string $field): int
    {
        $value = $data[$field] ?? null;
        if ((!is_int($value) && (!is_string($value) || !ctype_digit($value))) || (float) $value > PHP_INT_MAX || (int) $value < 1) {
            throw new BookingError('invalid_request', 'Check field: ' . $field);
        }
        return (int) $value;
    }
}
