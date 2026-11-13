<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/autoload.php';

use App\Core\Database;
use App\Service\BookingClock;
use App\Service\StaffAccountRequestService;
use App\Domain\BookingError;

if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
if (!in_array(getenv('APP_ENV'), ['local','test','demo'], true)) {
    fwrite(STDERR, "This tool is restricted to an explicit local/test/demo environment.\n"); exit(1);
}
$action = $argv[1] ?? '';
if (!in_array($action, ['setup','list','approve'], true) || ($action === 'approve' ? count($argv) !== 4 : count($argv) !== 2)) {
    fwrite(STDERR, "Usage: php bin/staff-account-requests.php setup|list\n       php bin/staff-account-requests.php approve GMAIL ROLE\nRoles: admin, manager, host, server, kitchen\n"); exit(1);
}
try {
    $pdo = Database::connect(require dirname(__DIR__) . '/config/database.php');
    if ($action === 'setup') {
        $pdo->exec(file_get_contents(dirname(__DIR__).'/database/init/10_staff_account_requests.sql'));
        echo "Account request storage is ready. Existing records are preserved.\n";
        exit;
    }
    $service = new StaffAccountRequestService($pdo, new BookingClock($pdo));
    if ($action === 'list') {
        $pending = $service->pending();
        if ($pending === []) echo "No pending account requests.\n";
        foreach ($pending as $row) echo $row['email']."\t".$row['full_name']."\t".$row['created_at']."\n";
        exit;
    }
    $result = $service->approve($argv[2], $argv[3]);
    echo "Approved. Share this private, one-use activation link only with the authorized staff member:\n";
    echo rtrim(getenv('APP_URL') ?: 'http://localhost:18080', '/').$result['activation_path']."\n";
    echo "Expires: ".$result['expires_at']." Asia/Manila. No email was sent; Gmail ownership was not verified.\n";
} catch (BookingError $error) {
    fwrite(STDERR, $error->getMessage()."\n"); exit(1);
} catch (Throwable $error) {
    fwrite(STDERR, "Unable to complete the account request command. Check the local database and run setup first.\n"); exit(1);
}
