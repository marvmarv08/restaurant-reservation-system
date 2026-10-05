<?php
declare(strict_types=1);

namespace App\Service;

use Closure;
use DateTimeImmutable;
use DateTimeZone;
use PDO;

final class BookingClock
{
    public function __construct(private readonly PDO $pdo, private readonly ?Closure $testClock = null)
    {
    }

    public function now(): DateTimeImmutable
    {
        return $this->testClock !== null ? ($this->testClock)()
            : new DateTimeImmutable((string) $this->pdo->query('SELECT NOW()')->fetchColumn(), new DateTimeZone('Asia/Manila'));
    }
}
