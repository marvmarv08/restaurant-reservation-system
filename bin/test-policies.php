<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/autoload.php';
require dirname(__DIR__).'/tests/BookingHarness.php';
define('PREORDER_FIXTURE_ONLY',true);require dirname(__DIR__).'/tests/preorders.php';
require dirname(__DIR__).'/tests/policies.php';
