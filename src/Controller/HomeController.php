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
        $public = dirname(__DIR__, 2) . '/public';
        // Changed file contents get a new URL so returning browsers cannot reuse older assets.
        $html = preg_replace_callback(
            '~((?:src|href)=")(/assets/(?:js|css)/[a-zA-Z0-9_-]+\.(?:js|css))(")~',
            static function (array $match) use ($public): string {
                $version = substr(hash_file('sha256', $public . $match[2]), 0, 12);
                return $match[1] . $match[2] . '?v=' . $version . $match[3];
            },
            $html
        );
        return new Response(str_replace('{{page}}', $page, $html), 200, 'text/html; charset=utf-8', ['Cache-Control' => 'no-store']);
    }
}
