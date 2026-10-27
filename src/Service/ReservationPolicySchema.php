<?php
declare(strict_types=1);
namespace App\Service;
use PDO;
use RuntimeException;
final class ReservationPolicySchema
{
    public static function prepare(PDO $pdo):void
    {
        if($pdo->inTransaction()||!PreorderService::enabled($pdo))throw new RuntimeException('Prepare B5 explicitly after isolated B4, outside transactions.');
        $pdo->exec("CREATE TABLE IF NOT EXISTS reservation_policies (
            reservation_id BIGINT UNSIGNED PRIMARY KEY,deadline_at DATETIME NOT NULL,
            status ENUM('active','cancelled','no_show') NOT NULL DEFAULT 'active',
            accepted_json JSON NULL,accepted_at DATETIME NULL,
            forfeited_base_cents INT UNSIGNED NOT NULL DEFAULT 0,reviewed BOOLEAN NOT NULL DEFAULT FALSE,
            terminal_json JSON NULL,
            FOREIGN KEY(reservation_id) REFERENCES reservations(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $pdo->exec("CREATE TABLE IF NOT EXISTS reservation_policy_events (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,reservation_id BIGINT UNSIGNED NOT NULL,
            kind VARCHAR(24) NOT NULL,actor_user_id INT UNSIGNED NULL,detail_json JSON NOT NULL,created_at DATETIME NOT NULL,
            FOREIGN KEY(reservation_id) REFERENCES reservations(id),FOREIGN KEY(actor_user_id) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $pdo->exec("CREATE TABLE IF NOT EXISTS policy_money_events (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,reservation_id BIGINT UNSIGNED NOT NULL,actor_user_id INT UNSIGNED NOT NULL,
            request_key CHAR(36) NOT NULL,kind ENUM('extra_receipt','refund_base','refund_extra') NOT NULL,
            amount_cents INT UNSIGNED NOT NULL,method ENUM('cash','external_card') NOT NULL,reason VARCHAR(255) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE KEY uq_policy_money(actor_user_id,request_key),
            FOREIGN KEY(reservation_id) REFERENCES reservations(id),FOREIGN KEY(actor_user_id) REFERENCES users(id),CHECK(amount_cents>0)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        (new BookingTransaction($pdo))->run(function()use($pdo):array{
            $pdo->exec("INSERT IGNORE INTO reservation_policies(reservation_id,deadline_at,status) SELECT r.id,DATE_SUB(r.starts_at,INTERVAL 24 HOUR),CASE WHEN r.status IN ('cancelled','no_show') THEN r.status ELSE 'active' END FROM reservations r JOIN room_types t ON t.id=r.room_type_id WHERE t.code IN ('bv_standard','bv_family','bv_vip')");
            $pdo->exec("UPDATE settings SET svalue='1440' WHERE skey='cancel_cutoff_min'");
            $pdo->exec("UPDATE settings SET svalue='15' WHERE skey='no_show_grace_min'");
            $pdo->exec("INSERT INTO settings(skey,svalue,value_type) VALUES ('policy_profile','bella_vista_b5','string') ON DUPLICATE KEY UPDATE svalue=VALUES(svalue)");
            return [];
        });
    }
}
