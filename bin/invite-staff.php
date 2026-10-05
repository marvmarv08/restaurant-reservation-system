<?php
declare(strict_types=1);
require dirname(__DIR__) . "/src/autoload.php";

if (PHP_SAPI !== "cli" || count($argv) !== 4) {
    fwrite(STDERR, "Usage: php bin/invite-staff.php EMAIL 'FULL NAME' ROLE\n");
    exit(1);
}
$pdo = App\Core\Database::connect(
    require dirname(__DIR__) . "/config/database.php",
);
$result = (new App\Service\StaffAuthService(
    $pdo,
    new App\Service\BookingClock($pdo),
))->issue($argv[1], $argv[2], $argv[3]);
echo "Open this private, one-use activation link to choose your own password: " .
    (getenv("APP_URL") ?: "http://localhost:8080") .
    $result["activation_path"] .
    "\n";
echo "Expires: " .
    $result["expires_at"] .
    " Asia/Manila. No email has been sent.\n";
