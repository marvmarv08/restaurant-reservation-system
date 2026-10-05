<?php
declare(strict_types=1);

namespace App\Core;

final class Router
{
    public function __construct(private readonly array $routes)
    {
    }

    public function dispatch(Request $request): Response
    {
        $allowedMethods = [];

        foreach ($this->routes as [$method, $path, $handler]) {
            if ($path !== $request->path) {
                continue;
            }

            if ($method !== $request->method) {
                $allowedMethods[] = $method;
                continue;
            }

            [$class, $action] = $handler;
            $controller = new $class();

            return $controller->$action($request);
        }

        if ($allowedMethods !== []) {
            return new Response(
                'Method not allowed',
                405,
                'text/plain; charset=utf-8',
                ['Allow' => implode(', ', array_unique($allowedMethods))],
            );
        }

        return new Response('Page not found', 404, 'text/plain; charset=utf-8');
    }
}
