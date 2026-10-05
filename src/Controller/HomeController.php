<?php
declare(strict_types=1);

namespace App\Controller;

use App\Core\Request;
use App\Core\Response;

final class HomeController
{
    public function index(Request $request): Response
    {
        return new Response(<<<'HTML'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lumina Kitchen & Terrace</title>
  <link rel="stylesheet" href="/assets/css/app.css">
</head>
<body>
  <main>
    <p class="eyebrow">Lumina Kitchen & Terrace</p>
    <h1>The reservation platform is starting here.</h1>
    <p>The PHP application is running. The database connection can be checked at <a href="/health">/health</a>. Guest booking is planned for later phases.</p>
    <p class="note">Phase 1 · Application foundation</p>
  </main>
</body>
</html>
HTML);
    }
}
