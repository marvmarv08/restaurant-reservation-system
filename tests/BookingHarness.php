<?php
declare(strict_types=1);

use App\Core\Database;
use App\Domain\BookingError;
use App\Service\AvailabilityService;
use App\Service\BookingClock;
use App\Service\BookingService;

final class BookingHarness
{
    public PDO $pdo;
    public BookingService $service;
    public AvailabilityService $availability;
    public string $date;
    public string $owner;
    public array $tables;
    public array $guest = ['full_name' => 'Test Guest', 'phone' => '+639000000001', 'email' => 'guest@lumina.test'];
    private array $snapshots = [];
    private array $members;
    private int $passed = 0;
    private int $failed = 0;

    public function __construct()
    {
        $config = require dirname(__DIR__) . '/config/database.php';
        if (getenv('BOOKING_TEST_MODE') !== 'isolated' || $config['database'] !== 'tablebook_p3_test') {
            throw new RuntimeException('Booking tests require BOOKING_TEST_MODE=isolated and DB_DATABASE=tablebook_p3_test');
        }
        $this->pdo = Database::connect($config);
        $clock = new BookingClock($this->pdo);
        $this->service = new BookingService($this->pdo, $clock);
        $this->availability = new AvailabilityService($this->pdo, $clock);
        $this->date = $clock->now()->modify('+14 days')->modify('next tuesday')->format('Y-m-d');
        $this->owner = hash('sha256', 'test-owner');
        $this->tables = array_column($this->pdo->query('SELECT * FROM `tables`')->fetchAll(), null, 'code');
        foreach (['settings' => 'skey', 'room_types' => 'id', 'rooms' => 'id', 'tables' => 'id',
            'opening_hours' => 'id', 'turn_times' => 'id', 'pacing_rules' => 'id'] as $table => $key) {
            $this->snapshots[$table] = [$key, $this->pdo->query("SELECT * FROM `{$table}`")->fetchAll()];
        }
        $this->members = $this->pdo->query('SELECT * FROM table_group_members')->fetchAll();
    }

    public function reset(): void
    {
        foreach (['hold_reservations', 'hold_tables', 'holds', 'order_status_history', 'order_items', 'orders', 'outbox',
            'reservation_status_history', 'reservation_tables', 'reservations', 'guests', 'blackout_dates', 'booking_days'] as $table) {
            $this->pdo->exec("DELETE FROM `{$table}`");
        }
        foreach ($this->snapshots as $table => [$key, $rows]) {
            foreach ($rows as $row) {
                $columns = array_values(array_diff(array_keys($row), [$key]));
                $sql = "UPDATE `{$table}` SET " . implode(', ', array_map(static fn (string $col): string => "`{$col}` = ?", $columns)) . " WHERE `{$key}` = ?";
                $this->pdo->prepare($sql)->execute([...array_map(static fn (string $col) => $row[$col], $columns), $row[$key]]);
            }
        }
        $this->pdo->exec('DELETE FROM table_group_members');
        foreach ($this->members as $row) {
            $this->pdo->prepare('INSERT INTO table_group_members (table_group_id, table_id) VALUES (?, ?)')->execute(array_values($row));
        }
    }

    public function test(string $name, Closure $test): void
    {
        try {
            $this->reset();
            $test($this);
            $this->passed++;
            echo "PASS {$name}\n";
        } catch (Throwable $error) {
            $this->failed++;
            echo "FAIL {$name}: {$error->getMessage()}\n";
        }
    }

    public function expectError(string $code, Closure $action): void
    {
        try {
            $action();
        } catch (BookingError $error) {
            $this->assert($error->errorCode === $code, "Expected {$code}, received {$error->errorCode}");
            return;
        }
        throw new RuntimeException("Expected {$code}, but the operation succeeded");
    }

    public function assert(bool $condition, string $message = 'Assertion failed'): void
    {
        if (!$condition) {
            throw new RuntimeException($message);
        }
    }

    public function hold(string $table = 'C1', string $time = '17:30', int $party = 2, ?string $owner = null): array
    {
        $room = match ($table[0]) { 'C' => 'common', 'V' => 'vip', 'G' => 'group', 'T' => 'terrace' };
        return $this->service->hold($this->date, $time, $party, $room, $owner ?? $this->owner, 'table', (int) $this->tables[$table]['id']);
    }

    public function setting(string $key, string $value): void
    {
        $this->pdo->prepare('UPDATE settings SET svalue = ? WHERE skey = ?')->execute([$value, $key]);
    }

    public function count(string $table): int
    {
        return (int) $this->pdo->query("SELECT COUNT(*) FROM `{$table}`")->fetchColumn();
    }

    public function fixed(string $time): array
    {
        $clock = new BookingClock($this->pdo, static fn (): DateTimeImmutable =>
            new DateTimeImmutable($time, new DateTimeZone('Asia/Manila')));
        return [new BookingService($this->pdo, $clock), new AvailabilityService($this->pdo, $clock), $clock->now()];
    }

    public function startWorkers(array $jobs): array
    {
        $workers = [];
        $at = microtime(true) + 0.5;
        foreach ($jobs as $job) {
            $process = proc_open([PHP_BINARY, __DIR__ . '/booking-worker.php'],
                [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
            if (!is_resource($process)) {
                throw new RuntimeException('Cannot start booking race worker');
            }
            fwrite($pipes[0], json_encode($job + ['at' => $at], JSON_THROW_ON_ERROR));
            fclose($pipes[0]);
            $workers[] = [$process, $pipes];
        }
        return $workers;
    }

    public function finishWorkers(array $workers): array
    {
        $results = [];
        foreach ($workers as [$process, $pipes]) {
            $out = stream_get_contents($pipes[1]);
            $errors = stream_get_contents($pipes[2]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            $status = proc_close($process);
            $this->assert($status === 0 && $errors === '', 'Worker failed: ' . $errors . $out);
            $results[] = json_decode($out, true, 8, JSON_THROW_ON_ERROR);
        }
        return $results;
    }

    public function finish(): never
    {
        $this->reset();
        printf("Booking tests: %d passed, %d failed.\n", $this->passed, $this->failed);
        exit($this->failed === 0 ? 0 : 1);
    }
}
