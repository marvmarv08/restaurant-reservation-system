<?php
declare(strict_types=1);

require dirname(__DIR__) . '/src/autoload.php';

use App\Core\Request;
use App\Core\Response;
use App\Core\Router;

date_default_timezone_set(getenv('APP_TZ') ?: 'Asia/Manila');

try {
    $request = Request::fromGlobals();
    $router = new Router(require dirname(__DIR__) . '/config/routes.php');
    $response = $router->dispatch($request);
} catch (Throwable $error) {
    error_log((string) $error);
    $response = Response::json(['ok' => false, 'error' => 'Internal server error'], 500);
}

$response->send();
