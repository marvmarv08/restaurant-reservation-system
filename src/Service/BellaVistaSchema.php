<?php
declare(strict_types=1);
namespace App\Service;

use PDO;
use RuntimeException;

/** Run as a separately backed-up schema step, before transactional catalog activation. */
final class BellaVistaSchema
{
    public function __construct(private readonly PDO $pdo) {}
    public function prepare(): void
    {
        if ($this->pdo->inTransaction()) throw new RuntimeException('Schema preparation cannot run inside an application transaction.');
        $clause=$this->clause();
        if ($clause==="(`party_size` between 1 and 20)") return;
        if ($clause!=="(`party_size` between 1 and 16)") throw new RuntimeException('Unexpected party constraint; review schema before preparation.');
        // One atomic DDL statement; do not claim that application ROLLBACK can undo it.
        $this->pdo->exec('ALTER TABLE reservations DROP CHECK chk_res_party, ADD CONSTRAINT chk_res_party CHECK (party_size BETWEEN 1 AND 20)');
    }
    public function ready(): bool {return $this->clause()==="(`party_size` between 1 and 20)";}
    private function clause(): string
    {
        $q=$this->pdo->query("SELECT cc.CHECK_CLAUSE FROM information_schema.CHECK_CONSTRAINTS cc JOIN information_schema.TABLE_CONSTRAINTS tc ON tc.CONSTRAINT_SCHEMA=cc.CONSTRAINT_SCHEMA AND tc.CONSTRAINT_NAME=cc.CONSTRAINT_NAME WHERE tc.CONSTRAINT_SCHEMA=DATABASE() AND tc.TABLE_NAME='reservations' AND tc.CONSTRAINT_NAME='chk_res_party'");
        return strtolower((string)$q->fetchColumn());
    }
}
