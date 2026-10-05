<?php
declare(strict_types=1);

namespace App\Service;

use App\Domain\BookingError;
use Closure;
use PDO;
use PDOException;
use RuntimeException;
use Throwable;

final class BookingTransaction
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function lockDays(array $dates): void
    {
        $dates = array_unique($dates);
        sort($dates, SORT_STRING);
        foreach ($dates as $date) {
            $this->pdo->prepare('INSERT INTO booking_days (service_date) VALUES (?) ON DUPLICATE KEY UPDATE service_date = service_date')->execute([$date]);
            $this->pdo->prepare('SELECT service_date FROM booking_days WHERE service_date = ? FOR UPDATE')->execute([$date]);
        }
    }

    public function lockTables(array $ids, bool $requireActive = true): void
    {
        $ids = array_unique($ids);
        sort($ids, SORT_NUMERIC);
        $query = $this->pdo->prepare('SELECT is_active FROM `tables` WHERE id = ? FOR UPDATE');
        foreach ($ids as $id) {
            $query->execute([$id]);
            $active = $query->fetchColumn();
            if ($active === false || ($requireActive && (int) $active !== 1)) {
                throw new BookingError('inventory_changed', 'Table inventory changed. Search again.', 409);
            }
        }
    }

    public function run(Closure $action): array
    {
        for ($attempt = 0; $attempt < 3; $attempt++) {
            try {
                $this->pdo->exec('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
                $this->pdo->beginTransaction();
                $result = $action();
                $this->pdo->commit();
                return $result;
            } catch (Throwable $error) {
                if ($this->pdo->inTransaction()) {
                    $this->pdo->rollBack();
                }
                $number = $error instanceof PDOException ? (int) ($error->errorInfo[1] ?? 0) : 0;
                if (in_array($number, [1213, 1205], true) && $attempt < 2) {
                    usleep(random_int(10000, 40000));
                    continue;
                }
                if (in_array($number, [1213, 1205, 1062], true)) {
                    throw new BookingError('booking_conflict', 'Inventory is busy. Search again and retry.', 409);
                }
                throw $error;
            }
        }
        throw new RuntimeException('Transaction retry exhausted');
    }
}
