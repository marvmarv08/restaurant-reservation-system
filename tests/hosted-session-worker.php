<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/autoload.php';
$config = require dirname(__DIR__) . '/config/database.php';
if (getenv('BOOKING_TEST_MODE') !== 'isolated' || $config['database'] !== 'tablebook_p3_test') {
    throw new RuntimeException('Session verification requires the isolated test database.');
}
$input = json_decode(stream_get_contents(STDIN), true, 16, JSON_THROW_ON_ERROR);
$path = sys_get_temp_dir() . '/lumina-session-' . bin2hex(random_bytes(8));
mkdir($path, 0700);
ini_set('session.save_path', $path);
putenv('SESSION_DRIVER=database');
if (isset($input['id'])) session_id($input['id']);
$kind = $input['kind'] ?? 'guest';
try {
    $application = null;
    if ($input['app_transaction'] ?? false) {
        $application = App\Core\Database::connect($config);
        $application->beginTransaction();
    }
    if ($kind === 'guest') {
        $session = App\Core\GuestSession::open();
        $result = ['id' => session_id(), 'csrf' => $session->csrfToken, 'owner' => $session->ownerHash];
        if ($application !== null) {
            $result['transaction_preserved'] = $application->inTransaction();
            if ($application->inTransaction()) $application->rollBack();
        }
    } elseif ($kind === 'staff') {
        $pdo = App\Core\Database::connect($config);
        $session = App\Core\StaffSession::open($pdo);
        if (($input['action'] ?? '') === 'login') {
            $query = $pdo->prepare('SELECT * FROM users WHERE id = ?');
            $query->execute([$input['user_id']]);
            $session->establish($query->fetch(), time());
            $session = App\Core\StaffSession::open($pdo);
        } elseif (($input['action'] ?? '') === 'logout') {
            $session->logout();
            $session = App\Core\StaffSession::open($pdo);
        }
        if (in_array($input['action'] ?? '', ['idle', 'absolute'], true)) {
            if (!session_start()) throw new RuntimeException('Cannot age isolated staff session');
            $_SESSION[$input['action'] === 'idle' ? 'seen' : 'issued'] = time() - ($input['action'] === 'idle' ? 1800 : 28800);
            session_write_close();
        }
        $result = ['id' => session_id(), 'csrf' => $session->csrfToken, 'actor' => $session->actor];
    } elseif ($kind === 'collect') {
        $handler = new App\Core\DatabaseSessionHandler(App\Core\Database::connect($config));
        $handler->open('', 'TABLEBOOK_GUEST');
        $result = ['collected' => $handler->gc(86400)];
    } elseif ($kind === 'locked_guest') {
        App\Core\SessionStore::configure();
        session_name('TABLEBOOK_GUEST');
        ini_set('session.use_strict_mode', '1');
        if (!session_start()) throw new RuntimeException('Cannot hold guest session');
        touch($input['signal']);
        $deadline = microtime(true) + 5;
        while (!file_exists($input['release']) && microtime(true) < $deadline) usleep(10000);
        if (!file_exists($input['release'])) throw new RuntimeException('Session collection test release timed out');
        session_write_close();
        $result = ['id' => session_id(), 'csrf' => $_SESSION['csrf']];
    } elseif ($kind === 'counter') {
        App\Core\SessionStore::configure();
        session_name('TABLEBOOK_GUEST');
        ini_set('session.use_strict_mode', '1');
        if (!session_start()) throw new RuntimeException('Cannot start counter session');
        if (isset($input['signal'])) touch($input['signal']);
        $value = (int) ($_SESSION['counter'] ?? 0);
        usleep((int) ($input['delay_us'] ?? 0));
        $_SESSION['counter'] = $value + 1;
        session_write_close();
        $result = ['id' => session_id(), 'counter' => $value + 1];
    } else throw new RuntimeException('Unknown session verification action');
    echo json_encode($result, JSON_THROW_ON_ERROR);
} finally {
    foreach (glob($path . '/*') as $file) unlink($file);
    rmdir($path);
}
