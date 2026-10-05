<?php
declare(strict_types=1);

namespace App\Controller;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use Throwable;

final class HealthController
{
    public function show(Request $request): Response
    {
        try {
            $database = Database::connect(require dirname(__DIR__, 2) . '/config/database.php');
            $database->query('SELECT 1');

            return Response::json(['ok' => true, 'db' => true]);
        } catch (Throwable $error) {
            error_log((string) $error);

            return Response::json(['ok' => false, 'db' => false], 503);
        }
    }
}
