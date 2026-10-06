<?php
declare(strict_types=1);
namespace App\Core;

use PDO;
use RuntimeException;
use SessionHandlerInterface;
use SessionUpdateTimestampHandlerInterface;

final class DatabaseSessionHandler implements SessionHandlerInterface, SessionUpdateTimestampHandlerInterface
{
    private string $namespace = '';
    private ?string $locked = null;

    public function __construct(private readonly PDO $pdo, private readonly int $ttlSeconds = 86400,
        private readonly int $lockTimeoutSeconds = 5)
    {
        if ($ttlSeconds < 1 || $lockTimeoutSeconds < 0 || $lockTimeoutSeconds > 10) {
            throw new RuntimeException('Invalid session storage limits.');
        }
    }

    public function open(string $path, string $name): bool
    {
        $this->namespace = $name;
        return true;
    }

    private function key(string $id): string
    {
        if (!preg_match('/^[a-zA-Z0-9,-]{16,128}$/D', $id)) {
            throw new RuntimeException('Invalid session identifier.');
        }
        return hash('sha256', $this->namespace . "\0" . $id);
    }

    private function acquire(string $key): void
    {
        $name = 'session:' . substr($key, 0, 56);
        if ($this->locked === $name) return;
        $this->close();
        $query = $this->pdo->prepare('SELECT GET_LOCK(?, ?)');
        $query->execute([$name, $this->lockTimeoutSeconds]);
        if ((int) $query->fetchColumn() !== 1) {
            throw new RuntimeException('Session is busy. Reload and try again.');
        }
        $this->locked = $name;
    }

    public function close(): bool
    {
        if ($this->locked !== null) {
            $name = $this->locked;
            $this->locked = null;
            $query = $this->pdo->prepare('SELECT RELEASE_LOCK(?)');
            $query->execute([$name]);
        }
        return true;
    }

    public function validateId(string $id): bool
    {
        if (!preg_match('/^[a-zA-Z0-9,-]{16,128}$/D', $id)) return false;
        $key = $this->key($id);
        // Validation and read share the lock, so rotation cannot invalidate an ID between them.
        $this->acquire($key);
        $query = $this->pdo->prepare('SELECT 1 FROM web_sessions WHERE id_hash=? AND expires_at>UNIX_TIMESTAMP()');
        $query->execute([$key]);
        $exists = (bool) $query->fetchColumn();
        if (!$exists) $this->close();
        return $exists;
    }

    public function read(string $id): string|false
    {
        $key = $this->key($id);
        $this->acquire($key);
        $query = $this->pdo->prepare('SELECT payload FROM web_sessions WHERE id_hash=? AND expires_at>UNIX_TIMESTAMP()');
        $query->execute([$key]);
        $value = $query->fetchColumn();
        return $value === false ? '' : (string) $value;
    }

    public function write(string $id, string $data): bool
    {
        if (strlen($data) > 65536) throw new RuntimeException('Session data exceeds storage limit.');
        $key = $this->key($id);
        $this->acquire($key);
        $query = $this->pdo->prepare('INSERT INTO web_sessions (id_hash,payload,expires_at)
            VALUES (?, ?, UNIX_TIMESTAMP()+?) ON DUPLICATE KEY UPDATE payload=VALUES(payload),expires_at=VALUES(expires_at)');
        return $query->execute([$key, $data, $this->ttlSeconds]);
    }

    public function destroy(string $id): bool
    {
        $key = $this->key($id);
        $this->acquire($key);
        $query = $this->pdo->prepare('DELETE FROM web_sessions WHERE id_hash=?');
        return $query->execute([$key]);
    }

    public function updateTimestamp(string $id, string $data): bool
    {
        $key = $this->key($id);
        $this->acquire($key);
        $query = $this->pdo->prepare('UPDATE web_sessions SET expires_at=UNIX_TIMESTAMP()+? WHERE id_hash=?');
        return $query->execute([$this->ttlSeconds, $key]);
    }

    public function gc(int $max_lifetime): int|false
    {
        return $this->pdo->exec('DELETE FROM web_sessions WHERE expires_at<=UNIX_TIMESTAMP() LIMIT 1000');
    }
}
