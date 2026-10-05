<?php
declare(strict_types=1);

namespace App\Core;

final class Request
{
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query = [],
        private readonly array $headers = [],
        private readonly ?string $body = null,
    ) {
    }

    public static function fromGlobals(): self
    {
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

        return new self(
            strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'),
            is_string($path) && $path !== '' ? $path : '/',
            $_GET,
            array_change_key_case(function_exists('getallheaders') ? getallheaders() : [], CASE_LOWER),
        );
    }

    public function header(string $name): string
    {
        $value = $this->headers[strtolower($name)] ?? '';
        return is_string($value) ? $value : '';
    }

    public function json(): array
    {
        $body = $this->body ?? file_get_contents('php://input', false, null, 0, 16385);
        if (!is_string($body) || strlen($body) > 16384 || !str_starts_with(ltrim($body), '{')) {
            throw new \InvalidArgumentException('Send a JSON object smaller than 16 KiB.');
        }
        $data = json_decode($body, true, 8, JSON_THROW_ON_ERROR);
        if (!is_array($data)) {
            throw new \InvalidArgumentException('Send a JSON object.');
        }
        return $data;
    }
}
