<?php
declare(strict_types=1);
namespace App\Service;
use PDO;
use RuntimeException;

final class PreorderSchema
{
    public static function prepare(PDO $pdo): void
    {
        if($pdo->inTransaction() || !BillingService::enabled($pdo))throw new RuntimeException('Prepare B4 explicitly after isolated B2/B3, outside application transactions.');
        $pdo->exec("CREATE TABLE IF NOT EXISTS preorder_quotes (
            scope_key VARCHAR(80) PRIMARY KEY,hold_id BIGINT UNSIGNED NULL UNIQUE,reservation_id BIGINT UNSIGNED NULL UNIQUE,
            token CHAR(64) NOT NULL,quote_json JSON NOT NULL,expires_at DATETIME NOT NULL,
            FOREIGN KEY(hold_id) REFERENCES holds(id) ON DELETE CASCADE,
            FOREIGN KEY(reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $pdo->exec("CREATE TABLE IF NOT EXISTS reservation_preorders (
            reservation_id BIGINT UNSIGNED PRIMARY KEY,version INT UNSIGNED NOT NULL DEFAULT 1,
            status ENUM('scheduled','handed_off','cancelled') NOT NULL DEFAULT 'scheduled',
            accepted_json JSON NOT NULL,current_json JSON NOT NULL,history_json JSON NOT NULL,
            confirmation_hash CHAR(64) NOT NULL,last_edit_hash CHAR(64) NULL,
            order_id BIGINT UNSIGNED NULL UNIQUE,accepted_at DATETIME NOT NULL,handed_off_at DATETIME NULL,
            FOREIGN KEY(reservation_id) REFERENCES reservations(id),FOREIGN KEY(order_id) REFERENCES orders(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        if(PreorderService::enabled($pdo))return;
        (new BookingTransaction($pdo))->run(function()use($pdo):array{
            $groups=[
                ['bv_main','Main Courses / Specialties',['From the Hearth','The Kitchen','Tasting Menus']],
                ['bv_appetizers','Appetizers & Soups',['Opening Bites','Raw & Cured']],
                ['bv_desserts','Desserts & Drinks',['Sweet','Bar']],
            ];
            foreach($groups as $sort=>[$code,$name,$sources]){
                $pdo->prepare('INSERT INTO menu_categories(code,name,note,sort_order) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),is_active=1')->execute([$code,$name,'Assignment menu; existing recipe/prices retained',$sort]);
                $q=$pdo->prepare('SELECT id FROM menu_categories WHERE code=?');$q->execute([$code]);$category=(int)$q->fetchColumn();
                $q=$pdo->prepare('SELECT m.* FROM menu_items m JOIN menu_categories c ON c.id=m.category_id WHERE c.name IN ('.implode(',',array_fill(0,count($sources),'?')).') ORDER BY m.id');$q->execute($sources);
                foreach($q->fetchAll() as $item){
                    $pdo->prepare('INSERT INTO menu_items(code,category_id,name,description,price_cents,prep_time_min,station,is_available,image_path,tags_json,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE code=VALUES(code)')->execute(['bv_'.$item['code'],$category,$item['name'],$item['description'],$item['price_cents'],$item['prep_time_min'],$item['station'],$item['is_available'],$item['image_path'],$item['tags_json'],$item['sort_order']]);
                }
                $q=$pdo->prepare('SELECT COUNT(*) FROM menu_items WHERE category_id=? AND is_available=1');$q->execute([$category]);
                if((int)$q->fetchColumn()<3)throw new RuntimeException('Each assigned menu category needs at least three available dishes.');
            }
            $pdo->exec("UPDATE menu_categories SET is_active=(code IN ('bv_main','bv_appetizers','bv_desserts'))");
            $pdo->exec("INSERT INTO settings(skey,svalue,value_type) VALUES ('preorder_profile','bella_vista_b4','string') ON DUPLICATE KEY UPDATE svalue=VALUES(svalue)");
            return [];
        });
    }
}
