<?php
declare(strict_types=1);

namespace App\Core;

final class Response
{
    public function __construct(
        private readonly string $body,
        private readonly int $status = 200,
        private readonly string $contentType = 'text/html; charset=utf-8',
        private readonly array $headers = [],
    ) {
    }

    public static function json(array $data, int $status = 200): self
    {
        return new self(
            json_encode($data, JSON_THROW_ON_ERROR),
            $status,
            'application/json; charset=utf-8',
            ['Cache-Control' => 'no-store'],
        );
    }

    public function send(): void
    {
        http_response_code($this->status);
        header('Content-Type: ' . $this->contentType);
        foreach ($this->headers as $name => $value) {
            header($name . ': ' . $value);
        }
        echo $this->body;
    }
}
