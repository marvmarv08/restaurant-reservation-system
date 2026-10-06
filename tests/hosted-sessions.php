<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/autoload.php';
$config = require dirname(__DIR__) . '/config/database.php';
if (getenv('BOOKING_TEST_MODE') !== 'isolated' || $config['database'] !== 'tablebook_p3_test') {
    throw new RuntimeException('Hosted session tests require the isolated database.');
}
$pdo = App\Core\Database::connect($config);
$checks = 0;
$owned = [];
$userId = null;
function demand(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}
function startWorker(array $input): array {
    $process = proc_open([PHP_BINARY, __DIR__ . '/hosted-session-worker.php'], [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
    demand(is_resource($process), 'Cannot start session worker');
    fwrite($pipes[0], json_encode($input, JSON_THROW_ON_ERROR)); fclose($pipes[0]);
    return [$process, $pipes];
}
function finishWorker(array $worker): array {
    [$process, $pipes] = $worker;
    $output = stream_get_contents($pipes[1]); $error = stream_get_contents($pipes[2]);
    fclose($pipes[1]); fclose($pipes[2]);
    demand(proc_close($process) === 0 && $error === '', 'Session worker failed: ' . $error);
    return json_decode($output, true, 16, JSON_THROW_ON_ERROR);
}
function worker(array $input = []): array { return finishWorker(startWorker($input)); }
function passed(string $name): void { global $checks; $checks++; echo 'PASS ' . $name . "\n"; }
function own(array $session, string $namespace = 'TABLEBOOK_GUEST'): array {
    global $owned; $owned[] = hash('sha256', $namespace . "\0" . $session['id']); return $session;
}
try {
    $guest = own(worker());
    $reopened = own(worker(['id' => $guest['id']]));
    demand($guest === $reopened, 'Guest ID, CSRF and owner must survive another process without local session files');
    passed('Guest session survives another instance and loss of local session files');
    $unknown = str_repeat('a', 26);
    $fresh = own(worker(['id' => $unknown]));
    demand($fresh['id'] !== $unknown, 'Strict session mode must reject an unknown supplied ID');
    passed('Unknown supplied session ID is replaced');
    $q = $pdo->prepare('UPDATE web_sessions SET expires_at = UNIX_TIMESTAMP()-1 WHERE id_hash=?');
    $q->execute([hash('sha256', "TABLEBOOK_GUEST\0" . $guest['id'])]);
    $expired = own(worker(['id' => $guest['id']]));
    demand($expired['id'] !== $guest['id'], 'An expired session ID must not be revived');
    passed('Expired session cannot be revived');
    $staff = own(worker(['kind' => 'staff', 'id' => $expired['id']]), 'TABLEBOOK_STAFF');
    demand($staff['id'] !== $expired['id'] && $staff['actor'] === null, 'Guest IDs must not enter the staff namespace');
    passed('Guest and staff session namespaces are isolated');
    $counter = own(worker(['kind' => 'counter']));
    $one = startWorker(['kind' => 'counter', 'id' => $counter['id'], 'delay_us' => 250000]);
    $two = startWorker(['kind' => 'counter', 'id' => $counter['id'], 'delay_us' => 250000]);
    $a = finishWorker($one); $b = finishWorker($two);
    $values = [$a['counter'], $b['counter']]; sort($values);
    demand($values === [2,3], 'Concurrent requests must serialize rather than lose a session update');
    demand(worker(['kind' => 'counter', 'id' => $counter['id']])['counter'] === 4, 'Session lock must be released after close');
    passed('Concurrent updates serialize and release their locks');
    $active = own(worker());
    $key = hash('sha256', "TABLEBOOK_GUEST\0" . $active['id']);
    $q = $pdo->prepare('UPDATE web_sessions SET expires_at=UNIX_TIMESTAMP()+30 WHERE id_hash=?'); $q->execute([$key]);
    worker(['id' => $active['id']]);
    $q = $pdo->prepare('SELECT expires_at-UNIX_TIMESTAMP() FROM web_sessions WHERE id_hash=?'); $q->execute([$key]);
    demand((int) $q->fetchColumn() > 86000, 'Unchanged/lazy-written session must renew its lifetime');
    passed('Lazy writes renew active session expiry');
    $protected = own(worker());
    $collectible = own(worker());
    $protectedKey = hash('sha256', "TABLEBOOK_GUEST\0" . $protected['id']);
    $collectibleKey = hash('sha256', "TABLEBOOK_GUEST\0" . $collectible['id']);
    $signal = sys_get_temp_dir() . '/lumina-gc-held-' . bin2hex(random_bytes(8));
    $release = $signal . '-release';
    $holder = startWorker(['kind' => 'locked_guest', 'id' => $protected['id'], 'signal' => $signal, 'release' => $release]);
    try {
        $deadline = microtime(true) + 2;
        while (!file_exists($signal) && microtime(true) < $deadline) usleep(10000);
        demand(file_exists($signal), 'Collection fixture must hold a real guest lock');
        $q = $pdo->prepare('UPDATE web_sessions SET expires_at=UNIX_TIMESTAMP()-1 WHERE id_hash IN (?,?)');
        $q->execute([$protectedKey, $collectibleKey]);
        worker(['kind' => 'collect']);
        $q = $pdo->prepare('SELECT COUNT(*) FROM web_sessions WHERE id_hash=?');
        $q->execute([$protectedKey]); $retained = (int) $q->fetchColumn() === 1;
        $q->execute([$collectibleKey]); $collected = (int) $q->fetchColumn() === 0;
    } finally {
        touch($release); finishWorker($holder);
        if (file_exists($signal)) unlink($signal);
        unlink($release);
    }
    demand($retained, 'Garbage collection must retain a session actively locked across expiry');
    demand($collected, 'Garbage collection must still remove expired unlocked sessions');
    demand(worker(['id' => $protected['id']]) === $protected, 'Lazy renewal after collection must preserve the guest identity and payload');
    passed('Collection respects active locks across expiry and lazy renewal preserves identity');
    $independent = own(worker(['app_transaction' => true]));
    demand($independent['transaction_preserved'], 'Session close must not commit the application transaction');
    unset($independent['transaction_preserved']);
    demand(worker(['id' => $independent['id']]) === $independent, 'Application rollback must not roll back the session');
    passed('Session persistence is independent of application transactions');
    $q = $pdo->prepare('SELECT payload FROM web_sessions WHERE id_hash=?'); $q->execute([$key]);
    demand(str_contains((string) $q->fetchColumn(), $active['csrf']), 'Session data must be stored in MySQL');
    demand($pdo->query('SELECT COUNT(*) FROM web_sessions WHERE id_hash NOT REGEXP "^[a-f0-9]{64}$"')->fetchColumn() == 0, 'Raw session IDs must not be stored');
    passed('Database stores payloads with hashed session keys');
    $q = $pdo->prepare('INSERT INTO users (role_id,email,password_hash,full_name,is_active) SELECT id,?,?,?,1 FROM roles WHERE code="server"');
    $q->execute(['hosted-session-' . bin2hex(random_bytes(8)) . '@lumina.test', password_hash('Isolated session verification only', PASSWORD_BCRYPT), 'Isolated Session Staff']);
    $userId = (int) $pdo->lastInsertId();
    $logged = own(worker(['kind' => 'staff', 'id' => $staff['id'], 'action' => 'login', 'user_id' => $userId]), 'TABLEBOOK_STAFF');
    demand($logged['id'] !== $staff['id'] && $logged['csrf'] !== $staff['csrf'], 'Staff establishment must rotate both ID and CSRF');
    $replay = own(worker(['kind' => 'staff', 'id' => $staff['id']]), 'TABLEBOOK_STAFF');
    demand($replay['actor'] === null && $replay['id'] !== $staff['id'], 'Old ID must not recover authenticated state');
    passed('Staff establishment rotates identity and rejects the old session');
    $anonymous = own(worker(['kind' => 'staff']), 'TABLEBOOK_STAFF');
    $rotating = startWorker(['kind' => 'staff', 'id' => $anonymous['id'], 'action' => 'login', 'user_id' => $userId]);
    $replaying = startWorker(['kind' => 'staff', 'id' => $anonymous['id']]);
    $rotated = own(finishWorker($rotating), 'TABLEBOOK_STAFF');
    $parallelReplay = own(finishWorker($replaying), 'TABLEBOOK_STAFF');
    $afterRotation = own(worker(['kind' => 'staff', 'id' => $anonymous['id']]), 'TABLEBOOK_STAFF');
    demand($rotated['id'] !== $anonymous['id'] && (int) $rotated['actor']['id'] === $userId &&
        $parallelReplay['actor'] === null && $afterRotation['actor'] === null,
        'Concurrent rotation and old-cookie replay must not recover authenticated state');
    passed('Concurrent rotation and old-cookie replay cannot restore authentication');
    $otherInstance = worker(['kind' => 'staff', 'id' => $logged['id']]);
    demand($otherInstance === $logged && (int) $otherInstance['actor']['id'] === $userId, 'Staff login must survive another instance');
    passed('Authenticated staff session persists across processes');
    $out = own(worker(['kind' => 'staff', 'id' => $logged['id'], 'action' => 'logout']), 'TABLEBOOK_STAFF');
    $replay = own(worker(['kind' => 'staff', 'id' => $logged['id']]), 'TABLEBOOK_STAFF');
    demand($out['actor'] === null && $out['id'] !== $logged['id'] && $replay['actor'] === null, 'Logout must revoke the old authenticated session');
    passed('Logout cannot restore authenticated state through an old cookie');
    $logged = own(worker(['kind' => 'staff', 'action' => 'login', 'user_id' => $userId]), 'TABLEBOOK_STAFF');
    $pdo->prepare('UPDATE users SET auth_version=auth_version+1 WHERE id=?')->execute([$userId]);
    $revoked = own(worker(['kind' => 'staff', 'id' => $logged['id']]), 'TABLEBOOK_STAFF');
    demand($revoked['actor'] === null, 'Account version revocation must invalidate database-backed sessions');
    passed('Account version changes revoke persistent staff access');
    foreach (['idle','absolute'] as $mode) {
        $logged = own(worker(['kind' => 'staff', 'action' => 'login', 'user_id' => $userId]), 'TABLEBOOK_STAFF');
        worker(['kind' => 'staff', 'id' => $logged['id'], 'action' => $mode]);
        $aged = own(worker(['kind' => 'staff', 'id' => $logged['id']]), 'TABLEBOOK_STAFF');
        demand($aged['actor'] === null, 'Existing staff ' . $mode . ' expiry must remain enforced');
        passed('Persistent staff ' . $mode . ' expiry remains enforced');
    }
    $signal = sys_get_temp_dir() . '/lumina-held-session-' . bin2hex(random_bytes(8));
    $holder = startWorker(['kind' => 'counter', 'id' => $counter['id'], 'signal' => $signal, 'delay_us' => 6000000]);
    $deadline = microtime(true) + 2;
    while (!file_exists($signal) && microtime(true) < $deadline) usleep(10000);
    demand(file_exists($signal), 'Contended session fixture must actually acquire the lock');
    $refused = false;
    try { worker(['kind' => 'counter', 'id' => $counter['id']]); }
    catch (RuntimeException $error) { $refused = str_contains($error->getMessage(), 'Session is busy'); }
    finishWorker($holder); unlink($signal);
    demand($refused, 'A lock timeout must fail rather than proceed without a lock');
    demand(worker(['kind' => 'counter', 'id' => $counter['id']])['counter'] === 6, 'Timeout must not change data or leak the lock');
    passed('Lock contention fails closed and normal operation resumes after release');
    echo "Hosted sessions: {$checks} checks passed.\n";
} finally {
    if ($userId !== null) $pdo->prepare('DELETE FROM users WHERE id=?')->execute([$userId]);
    if ($pdo->query("SHOW TABLES LIKE 'web_sessions'")->fetchColumn()) {
        $q = $pdo->prepare('DELETE FROM web_sessions WHERE id_hash=?');
        foreach (array_unique($owned) as $key) $q->execute([$key]);
    }
}
