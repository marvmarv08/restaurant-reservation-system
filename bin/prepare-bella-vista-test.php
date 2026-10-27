<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/autoload.php';
$config=require dirname(__DIR__) . '/config/database.php';
if(getenv('BOOKING_TEST_MODE')!=='isolated'||$config['database']!=='tablebook_p3_test') throw new RuntimeException('Schema preparation is restricted to the isolated test database.');
(new App\Service\BellaVistaSchema(App\Core\Database::connect($config)))->prepare();
echo "Isolated reservation capacity constraint supports 1–20; catalog is not activated by this step.\n";
