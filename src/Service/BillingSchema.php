<?php
declare(strict_types=1);
namespace App\Service;
use PDO;
use RuntimeException;

final class BillingSchema
{
    public static function prepare(PDO $pdo): void
    {
        if($pdo->inTransaction())throw new RuntimeException('Prepare billing schema separately from application transactions.');
        if(!(new BookingPolicy($pdo))->bellaVista())throw new RuntimeException('Prepare the isolated Bella Vista catalog before billing.');
        $pdo->exec("CREATE TABLE IF NOT EXISTS billing_accounts (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          reservation_id BIGINT UNSIGNED NOT NULL UNIQUE,
          category_code VARCHAR(32) NOT NULL,party_size SMALLINT UNSIGNED NOT NULL,
          base_fee_cents INT UNSIGNED NOT NULL,extra_cents INT UNSIGNED NOT NULL,minimum_cents INT UNSIGNED NOT NULL,
          status ENUM('open','finalized') NOT NULL DEFAULT 'open',
          final_snapshot JSON NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_bill_res FOREIGN KEY(reservation_id) REFERENCES reservations(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $pdo->exec("CREATE TABLE IF NOT EXISTS billing_requests (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id INT UNSIGNED NOT NULL,request_key CHAR(36) NOT NULL,
          account_id BIGINT UNSIGNED NOT NULL,payload_hash CHAR(64) NOT NULL,response_json JSON NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_bill_request(user_id,request_key),
          FOREIGN KEY(user_id) REFERENCES users(id),FOREIGN KEY(account_id) REFERENCES billing_accounts(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $pdo->exec("CREATE TABLE IF NOT EXISTS billing_events (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,account_id BIGINT UNSIGNED NOT NULL,
          actor_user_id INT UNSIGNED NOT NULL,request_key CHAR(36) NOT NULL,
          kind ENUM('advance','payment','refund_credit','finalize') NOT NULL,
          amount_cents INT UNSIGNED NOT NULL,method ENUM('cash','external_card','none') NOT NULL,
          reason VARCHAR(255) NOT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_bill_event(actor_user_id,request_key),
          FOREIGN KEY(account_id) REFERENCES billing_accounts(id),FOREIGN KEY(actor_user_id) REFERENCES users(id),
          CONSTRAINT chk_billing_event_amount CHECK ((kind='finalize' AND amount_cents=0 AND method='none') OR (kind<>'finalize' AND amount_cents>0 AND method<>'none'))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $pdo->exec("INSERT INTO settings(skey,svalue,value_type) VALUES ('billing_profile','bella_vista_b3','string') ON DUPLICATE KEY UPDATE svalue=VALUES(svalue)");
    }
}
