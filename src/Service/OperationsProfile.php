<?php
declare(strict_types=1);
namespace App\Service;
use PDO;
final class OperationsProfile
{
    public static function enabled(PDO $pdo):bool
    {
        return $pdo->query("SELECT svalue FROM settings WHERE skey='operations_profile'")->fetchColumn()==='bella_vista_b6';
    }
}
