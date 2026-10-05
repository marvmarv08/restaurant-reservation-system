<?php
declare(strict_types=1);

namespace App\Controller;

use App\Core\Request;
use App\Core\Response;

final class HomeController
{
    public function index(Request $request): Response
    {
        return $this->page('guest');
    }

    public function manage(Request $request): Response
    {
        return $this->page('manage');
    }

    private function page(string $page): Response
    {
        $html = file_get_contents(dirname(__DIR__) . '/View/guest.php');
        return new Response(str_replace('{{page}}', $page, $html), 200, 'text/html; charset=utf-8', ['Cache-Control' => 'no-store']);
    }
}
