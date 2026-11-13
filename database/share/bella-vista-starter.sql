-- Public teammate starter database: schema and reviewed venue/menu configuration only.
-- Based on the saved 2026-11-07 preview; no account, guest, booking or session records.
-- Import only into a NEW EMPTY local database. Existing tables would be replaced.
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `actor_user_id` int unsigned DEFAULT NULL,
  `actor_role` varchar(24) DEFAULT NULL,
  `action` varchar(64) NOT NULL,
  `entity_type` varchar(32) NOT NULL,
  `entity_id` varchar(64) DEFAULT NULL,
  `before_json` json DEFAULT NULL,
  `after_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_audit_created` (`created_at`,`id`),
  KEY `fk_audit_actor` (`actor_user_id`),
  CONSTRAINT `fk_audit_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `billing_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `billing_accounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `reservation_id` bigint unsigned NOT NULL,
  `category_code` varchar(32) NOT NULL,
  `party_size` smallint unsigned NOT NULL,
  `base_fee_cents` int unsigned NOT NULL,
  `extra_cents` int unsigned NOT NULL,
  `minimum_cents` int unsigned NOT NULL,
  `status` enum('open','finalized') NOT NULL DEFAULT 'open',
  `final_snapshot` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reservation_id` (`reservation_id`),
  CONSTRAINT `fk_bill_res` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `billing_accounts` WRITE;
/*!40000 ALTER TABLE `billing_accounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `billing_accounts` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `billing_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `billing_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `account_id` bigint unsigned NOT NULL,
  `actor_user_id` int unsigned NOT NULL,
  `request_key` char(36) NOT NULL,
  `kind` enum('advance','payment','refund_credit','finalize') NOT NULL,
  `amount_cents` int unsigned NOT NULL,
  `method` enum('cash','external_card','none') NOT NULL,
  `reason` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bill_event` (`actor_user_id`,`request_key`),
  KEY `account_id` (`account_id`),
  CONSTRAINT `billing_events_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `billing_accounts` (`id`),
  CONSTRAINT `billing_events_ibfk_2` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `chk_billing_event_amount` CHECK ((((`kind` = _utf8mb4'finalize') and (`amount_cents` = 0) and (`method` = _utf8mb4'none')) or ((`kind` <> _utf8mb4'finalize') and (`amount_cents` > 0) and (`method` <> _utf8mb4'none'))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `billing_events` WRITE;
/*!40000 ALTER TABLE `billing_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `billing_events` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `billing_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `billing_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `request_key` char(36) NOT NULL,
  `account_id` bigint unsigned NOT NULL,
  `payload_hash` char(64) NOT NULL,
  `response_json` json NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bill_request` (`user_id`,`request_key`),
  KEY `account_id` (`account_id`),
  CONSTRAINT `billing_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `billing_requests_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `billing_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `billing_requests` WRITE;
/*!40000 ALTER TABLE `billing_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `billing_requests` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `blackout_dates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blackout_dates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime NOT NULL,
  `scope` enum('venue','room_type','room','table') NOT NULL,
  `scope_id` int unsigned DEFAULT NULL,
  `reason` varchar(160) NOT NULL,
  `blocks_booking` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `ix_blackout_range` (`starts_at`,`ends_at`),
  KEY `ix_blackout_scope` (`scope`,`scope_id`),
  CONSTRAINT `chk_blackout_range` CHECK ((`ends_at` > `starts_at`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `blackout_dates` WRITE;
/*!40000 ALTER TABLE `blackout_dates` DISABLE KEYS */;
/*!40000 ALTER TABLE `blackout_dates` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `booking_days`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_days` (
  `service_date` date NOT NULL,
  PRIMARY KEY (`service_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `booking_days` WRITE;
/*!40000 ALTER TABLE `booking_days` DISABLE KEYS */;
/*!40000 ALTER TABLE `booking_days` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `guests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `guests` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned DEFAULT NULL,
  `seed_key` varchar(64) DEFAULT NULL,
  `full_name` varchar(120) NOT NULL,
  `phone` varchar(32) NOT NULL,
  `email` varchar(190) DEFAULT NULL,
  `notes` text,
  `vip_tier` tinyint unsigned NOT NULL DEFAULT '0',
  `no_show_count` smallint unsigned NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `seed_key` (`seed_key`),
  KEY `ix_guests_phone` (`phone`),
  KEY `ix_guests_email` (`email`),
  KEY `fk_guests_user` (`user_id`),
  CONSTRAINT `fk_guests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `guests` WRITE;
/*!40000 ALTER TABLE `guests` DISABLE KEYS */;
/*!40000 ALTER TABLE `guests` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `hold_reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hold_reservations` (
  `hold_id` bigint unsigned NOT NULL,
  `reservation_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`hold_id`),
  UNIQUE KEY `reservation_id` (`reservation_id`),
  CONSTRAINT `fk_hr_hold` FOREIGN KEY (`hold_id`) REFERENCES `holds` (`id`),
  CONSTRAINT `fk_hr_res` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `hold_reservations` WRITE;
/*!40000 ALTER TABLE `hold_reservations` DISABLE KEYS */;
/*!40000 ALTER TABLE `hold_reservations` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `hold_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hold_tables` (
  `hold_id` bigint unsigned NOT NULL,
  `table_id` int unsigned NOT NULL,
  PRIMARY KEY (`hold_id`,`table_id`),
  KEY `ix_ht_table` (`table_id`,`hold_id`),
  CONSTRAINT `fk_ht_hold` FOREIGN KEY (`hold_id`) REFERENCES `holds` (`id`),
  CONSTRAINT `fk_ht_table` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `hold_tables` WRITE;
/*!40000 ALTER TABLE `hold_tables` DISABLE KEYS */;
/*!40000 ALTER TABLE `hold_tables` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `holds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `holds` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `hold_token` char(36) NOT NULL,
  `table_id` int unsigned DEFAULT NULL,
  `table_group_id` int unsigned DEFAULT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime NOT NULL,
  `blocks_until` datetime NOT NULL,
  `party_size` smallint unsigned NOT NULL,
  `session_id` char(64) DEFAULT NULL,
  `waitlist_reservation_id` bigint unsigned DEFAULT NULL,
  `status` enum('active','consumed','expired','released') NOT NULL DEFAULT 'active',
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hold_token` (`hold_token`),
  KEY `ix_holds_live` (`status`,`expires_at`,`starts_at`,`blocks_until`),
  KEY `fk_holds_table` (`table_id`),
  KEY `fk_holds_group` (`table_group_id`),
  KEY `fk_holds_waitlist` (`waitlist_reservation_id`),
  CONSTRAINT `fk_holds_group` FOREIGN KEY (`table_group_id`) REFERENCES `table_groups` (`id`),
  CONSTRAINT `fk_holds_table` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`),
  CONSTRAINT `fk_holds_waitlist` FOREIGN KEY (`waitlist_reservation_id`) REFERENCES `reservations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `holds` WRITE;
/*!40000 ALTER TABLE `holds` DISABLE KEYS */;
/*!40000 ALTER TABLE `holds` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `kitchen_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kitchen_tickets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `status` enum('queued','preparing','ready','served','held','void') NOT NULL DEFAULT 'queued',
  `resume_status` enum('queued','preparing','ready') DEFAULT NULL,
  `allergy_snapshot` varchar(1000) NOT NULL DEFAULT '',
  `booking_notes` text,
  `fired_at` datetime NOT NULL,
  `served_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_id` (`order_id`),
  KEY `ix_ticket_queue` (`status`,`fired_at`),
  CONSTRAINT `fk_ticket_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `kitchen_tickets` WRITE;
/*!40000 ALTER TABLE `kitchen_tickets` DISABLE KEYS */;
/*!40000 ALTER TABLE `kitchen_tickets` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `menu_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_categories` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `name` varchar(80) NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  `sort_order` smallint NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `menu_categories` WRITE;
/*!40000 ALTER TABLE `menu_categories` DISABLE KEYS */;
INSERT INTO `menu_categories` VALUES (1,'snacks','Opening Bites','Served at the counter while you settle',1,0),(2,'raw','Raw & Cured','Cold larder, dressed to order',2,0),(3,'fire','From the Hearth','Everything here meets flame',3,0),(4,'comfort','The Kitchen','Dishes we grew up on, taken seriously',4,0),(5,'sweet','Sweet','Pastry section, Chef Reyes',5,0),(6,'drinks','Bar','Zero-proof marked, ask the bar',6,0),(7,'tasting','Tasting Menus','Whole table, book 48 hours ahead',7,0),(8,'bv_main','Main Courses / Specialties','Filipino favourites for the centre of the table.',0,1),(9,'bv_appetizers','Appetizers & Soups','Bright beginnings, comforting bowls and garden vegetables.',1,1),(10,'bv_desserts','Desserts & Drinks','Kakanin, caramel and refreshing Filipino coolers.',2,1),(11,'bv_menu_archive_20261107','Historical menu archive','Retained for existing order and pre-order references.',99,0);
/*!40000 ALTER TABLE `menu_categories` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `category_id` int unsigned NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` text,
  `price_cents` int unsigned NOT NULL,
  `prep_time_min` smallint unsigned NOT NULL DEFAULT '15',
  `station` enum('cold','grill','fry','hot','pastry','bar') NOT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT '1',
  `image_path` varchar(255) DEFAULT NULL,
  `tags_json` json DEFAULT NULL,
  `sort_order` smallint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `ix_items_cat` (`category_id`,`is_available`),
  CONSTRAINT `fk_items_cat` FOREIGN KEY (`category_id`) REFERENCES `menu_categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `menu_items` WRITE;
/*!40000 ALTER TABLE `menu_items` DISABLE KEYS */;
INSERT INTO `menu_items` VALUES (1,'M01',1,'Charred Oyster, Burnt Lime','Local oyster over embers, lime ash, finger chilli.',18000,15,'cold',1,'oyster','[\"shellfish\"]',1),(2,'M02',1,'Smoked Taro Crisp','Taro, coconut vinegar, kalamansi salt.',14000,15,'fry',1,'taro','[\"vegan\"]',2),(3,'M03',1,'Pandesal, Cultured Butter','Overnight sourdough pandesal, seaweed butter.',16000,15,'cold',1,'bread','[\"vegetarian\", \"gluten\"]',3),(4,'M04',1,'Tuna Tartare Tostada','Yellowfin, green mango, coconut cream, crisp masa.',29000,15,'cold',1,'tartare','[\"fish\"]',4),(5,'M05',2,'Kinilaw of the Day','Line-caught fish, cane vinegar, ginger flower, chilli oil.',42000,15,'cold',1,'kinilaw','[\"fish\", \"signature\"]',5),(6,'M06',2,'Scallop, Calamansi Snow','Hand-dived scallop, frozen calamansi, nasturtium.',46000,15,'cold',1,'scallop','[\"shellfish\"]',6),(7,'M07',2,'Heirloom Tomato, Aged Ube Vinegar','Three tomatoes, ube vinegar aged eight months, basil ash.',34000,15,'cold',1,'tomato','[\"vegan\"]',7),(8,'M08',2,'Beef Tataki, Burnt Onion Dashi','Seared wagyu cap, onion dashi, pickled shallot.',52000,15,'cold',1,'tataki','[\"beef\"]',8),(9,'M09',3,'Whole Lapu-Lapu, Coconut Embers','Whole grouper buried in coconut husk coals, forty minutes. For two.',148000,15,'grill',1,'grouper','[\"fish\", \"signature\", \"for two\"]',9),(10,'M10',3,'Dry-Aged Duck, Honey Lacquer','Twenty-one day aged duck, wild honey, charred citrus.',98000,15,'grill',1,'duck','[\"poultry\", \"signature\"]',10),(11,'M11',3,'Pork Belly, Sugarcane Glaze','Twelve-hour belly, sugarcane, pickled papaya.',72000,15,'grill',1,'belly','[\"pork\"]',11),(12,'M12',3,'Hearth Cabbage, Smoked Bagoong','Whole cabbage in the embers, fermented shrimp cream, dill.',38000,15,'grill',1,'cabbage','[\"shellfish\"]',12),(13,'M13',3,'Bone Marrow, Garlic Rice Crumb','Split marrow, toasted garlic rice, herb salad.',54000,15,'grill',1,'marrow','[\"beef\"]',13),(14,'M14',3,'Grilled Squid, Ink Aioli','Whole squid over flame, its own ink, burnt lemon.',61000,15,'grill',1,'squid','[\"shellfish\"]',14),(15,'M15',3,'Lamb Ribs, Tamarind Lacquer','Slow ribs, tamarind, toasted coriander, mint.',89000,15,'grill',1,'lamb','[\"lamb\"]',15),(16,'M16',4,'Smoked Chicken Adobo','Free-range chicken, coconut vinegar, soy, bay, served dark.',62000,15,'hot',1,'adobo','[\"poultry\", \"signature\"]',16),(17,'M17',4,'Kare-Kare Oxtail','Oxtail, peanut, annatto, banana heart, bagoong.',84000,15,'hot',1,'karekare','[\"beef\", \"nuts\", \"shellfish\"]',17),(18,'M18',4,'Sinigang, Watermelon & Tuna Belly','Tamarind broth, watermelon, charred tuna belly.',68000,15,'hot',1,'sinigang','[\"fish\"]',18),(19,'M19',4,'Laing Risotto, Crab Fat','Taro leaf, coconut, crab fat, calamansi zest.',59000,15,'hot',1,'laing','[\"shellfish\"]',19),(20,'M20',4,'Pancit of Charred Leeks','Hand-pulled noodles, leek ash, soy butter.',43000,15,'hot',1,'pancit','[\"vegetarian\", \"gluten\"]',20),(21,'M21',4,'Garlic Rice, Hearth Butter','Day-old rice, confit garlic, smoked butter.',18000,15,'hot',1,'rice','[\"vegetarian\"]',21),(22,'M22',4,'Charred Greens, Anchovy Cream','Seasonal greens, anchovy, lemon, cracked pepper.',29000,15,'hot',1,'greens','[\"fish\"]',22),(23,'M23',5,'Burnt Coconut Leche Flan','Caramel taken to the edge, coconut cream, sea salt.',28000,15,'pastry',1,'flan','[\"vegetarian\", \"dairy\", \"signature\"]',23),(24,'M24',5,'Ube Soufflé, Calamansi Curd','Purple yam soufflé, calamansi curd. Twenty minutes.',34000,15,'pastry',1,'souffle','[\"vegetarian\", \"dairy\", \"eggs\"]',24),(25,'M25',5,'Mango, Sticky Rice Ice Cream','Carabao mango, toasted rice ice cream, coconut tuile.',26000,15,'pastry',1,'mango','[\"vegetarian\", \"dairy\"]',25),(26,'M26',5,'Cacao Tart, Barako Cream','Single-origin Davao cacao, Barako coffee cream.',31000,15,'pastry',1,'tart','[\"vegetarian\", \"dairy\", \"gluten\"]',26),(27,'M27',5,'Pandan Halo-Halo','Shaved ice, pandan, nine components, served to share.',29000,15,'pastry',1,'halohalo','[\"vegetarian\", \"dairy\"]',27),(28,'M28',6,'Smoked Calamansi Highball','Rum, smoked calamansi, soda, pandan oil.',42000,15,'bar',1,'highball','[\"alcohol\", \"signature\"]',28),(29,'M29',6,'Tamarind Negroni','Gin, tamarind vermouth, bitter orange.',48000,15,'bar',1,'negroni','[\"alcohol\"]',29),(30,'M30',6,'Lambanog Old Fashioned','Coconut spirit, muscovado, cacao bitters.',46000,15,'bar',1,'oldfash','[\"alcohol\"]',30),(31,'M31',6,'Pineapple Tepache, No Alcohol','Fermented pineapple, chilli, lime. Zero proof.',22000,15,'bar',1,'tepache','[\"zero proof\"]',31),(32,'M32',6,'Pandan Iced Tea','Cold-brewed pandan, jasmine, calamansi. Zero proof.',18000,15,'bar',1,'icedtea','[\"zero proof\"]',32),(33,'M33',6,'Barako Espresso','Liberica from Batangas, pulled short.',16000,15,'bar',1,'espresso','[\"zero proof\"]',33),(34,'M34',7,'Eleven Courses of Smoke & Citrus','The full progression. Two and a half hours. Whole table only.',380000,15,'grill',1,'tasting11','[\"signature\", \"whole table\"]',34),(35,'M35',7,'Seven Courses, Hearth','The shorter road through the fire. Ninety minutes.',240000,15,'grill',1,'tasting7','[\"whole table\"]',35),(36,'M36',7,'Wine Pairing, Five Glasses','Chosen the morning of service. Low intervention.',190000,15,'bar',1,'pairing','[\"alcohol\"]',36),(37,'bv_M09',11,'Whole Lapu-Lapu, Coconut Embers','Whole grouper buried in coconut husk coals, forty minutes. For two.',148000,15,'grill',0,'grouper','[\"fish\", \"signature\", \"for two\"]',9),(38,'bv_M10',11,'Dry-Aged Duck, Honey Lacquer','Twenty-one day aged duck, wild honey, charred citrus.',98000,15,'grill',0,'duck','[\"poultry\", \"signature\"]',10),(39,'bv_M11',11,'Pork Belly, Sugarcane Glaze','Twelve-hour belly, sugarcane, pickled papaya.',72000,15,'grill',0,'belly','[\"pork\"]',11),(40,'bv_M12',11,'Hearth Cabbage, Smoked Bagoong','Whole cabbage in the embers, fermented shrimp cream, dill.',38000,15,'grill',0,'cabbage','[\"shellfish\"]',12),(41,'bv_M13',11,'Bone Marrow, Garlic Rice Crumb','Split marrow, toasted garlic rice, herb salad.',54000,15,'grill',0,'marrow','[\"beef\"]',13),(42,'bv_M14',11,'Grilled Squid, Ink Aioli','Whole squid over flame, its own ink, burnt lemon.',61000,15,'grill',0,'squid','[\"shellfish\"]',14),(43,'bv_M15',11,'Lamb Ribs, Tamarind Lacquer','Slow ribs, tamarind, toasted coriander, mint.',89000,15,'grill',0,'lamb','[\"lamb\"]',15),(44,'bv_M16',11,'Smoked Chicken Adobo','Free-range chicken, coconut vinegar, soy, bay, served dark.',62000,15,'hot',0,'adobo','[\"poultry\", \"signature\"]',16),(45,'bv_M17',11,'Kare-Kare Oxtail','Oxtail, peanut, annatto, banana heart, bagoong.',84000,15,'hot',0,'karekare','[\"beef\", \"nuts\", \"shellfish\"]',17),(46,'bv_M18',11,'Sinigang, Watermelon & Tuna Belly','Tamarind broth, watermelon, charred tuna belly.',68000,15,'hot',0,'sinigang','[\"fish\"]',18),(47,'bv_M19',11,'Laing Risotto, Crab Fat','Taro leaf, coconut, crab fat, calamansi zest.',59000,15,'hot',0,'laing','[\"shellfish\"]',19),(48,'bv_M20',11,'Pancit of Charred Leeks','Hand-pulled noodles, leek ash, soy butter.',43000,15,'hot',0,'pancit','[\"vegetarian\", \"gluten\"]',20),(49,'bv_M21',11,'Garlic Rice, Hearth Butter','Day-old rice, confit garlic, smoked butter.',18000,15,'hot',0,'rice','[\"vegetarian\"]',21),(50,'bv_M22',11,'Charred Greens, Anchovy Cream','Seasonal greens, anchovy, lemon, cracked pepper.',29000,15,'hot',0,'greens','[\"fish\"]',22),(51,'bv_M34',11,'Eleven Courses of Smoke & Citrus','The full progression. Two and a half hours. Whole table only.',380000,15,'grill',0,'tasting11','[\"signature\", \"whole table\"]',34),(52,'bv_M35',11,'Seven Courses, Hearth','The shorter road through the fire. Ninety minutes.',240000,15,'grill',0,'tasting7','[\"whole table\"]',35),(53,'bv_M36',11,'Wine Pairing, Five Glasses','Chosen the morning of service. Low intervention.',190000,15,'bar',0,'pairing','[\"alcohol\"]',36),(54,'bv_M01',11,'Charred Oyster, Burnt Lime','Local oyster over embers, lime ash, finger chilli.',18000,15,'cold',0,'oyster','[\"shellfish\"]',1),(55,'bv_M02',11,'Smoked Taro Crisp','Taro, coconut vinegar, kalamansi salt.',14000,15,'fry',0,'taro','[\"vegan\"]',2),(56,'bv_M03',11,'Pandesal, Cultured Butter','Overnight sourdough pandesal, seaweed butter.',16000,15,'cold',0,'bread','[\"vegetarian\", \"gluten\"]',3),(57,'bv_M04',11,'Tuna Tartare Tostada','Yellowfin, green mango, coconut cream, crisp masa.',29000,15,'cold',0,'tartare','[\"fish\"]',4),(58,'bv_M05',11,'Kinilaw of the Day','Line-caught fish, cane vinegar, ginger flower, chilli oil.',42000,15,'cold',0,'kinilaw','[\"fish\", \"signature\"]',5),(59,'bv_M06',11,'Scallop, Calamansi Snow','Hand-dived scallop, frozen calamansi, nasturtium.',46000,15,'cold',0,'scallop','[\"shellfish\"]',6),(60,'bv_M07',11,'Heirloom Tomato, Aged Ube Vinegar','Three tomatoes, ube vinegar aged eight months, basil ash.',34000,15,'cold',0,'tomato','[\"vegan\"]',7),(61,'bv_M08',11,'Beef Tataki, Burnt Onion Dashi','Seared wagyu cap, onion dashi, pickled shallot.',52000,15,'cold',0,'tataki','[\"beef\"]',8),(62,'bv_M23',11,'Burnt Coconut Leche Flan','Caramel taken to the edge, coconut cream, sea salt.',28000,15,'pastry',0,'flan','[\"vegetarian\", \"dairy\", \"signature\"]',23),(63,'bv_M24',11,'Ube Soufflé, Calamansi Curd','Purple yam soufflé, calamansi curd. Twenty minutes.',34000,15,'pastry',0,'souffle','[\"vegetarian\", \"dairy\", \"eggs\"]',24),(64,'bv_M25',11,'Mango, Sticky Rice Ice Cream','Carabao mango, toasted rice ice cream, coconut tuile.',26000,15,'pastry',0,'mango','[\"vegetarian\", \"dairy\"]',25),(65,'bv_M26',11,'Cacao Tart, Barako Cream','Single-origin Davao cacao, Barako coffee cream.',31000,15,'pastry',0,'tart','[\"vegetarian\", \"dairy\", \"gluten\"]',26),(66,'bv_M27',11,'Pandan Halo-Halo','Shaved ice, pandan, nine components, served to share.',29000,15,'pastry',0,'halohalo','[\"vegetarian\", \"dairy\"]',27),(67,'bv_M28',11,'Smoked Calamansi Highball','Rum, smoked calamansi, soda, pandan oil.',42000,15,'bar',0,'highball','[\"alcohol\", \"signature\"]',28),(68,'bv_M29',11,'Tamarind Negroni','Gin, tamarind vermouth, bitter orange.',48000,15,'bar',0,'negroni','[\"alcohol\"]',29),(69,'bv_M30',11,'Lambanog Old Fashioned','Coconut spirit, muscovado, cacao bitters.',46000,15,'bar',0,'oldfash','[\"alcohol\"]',30),(70,'bv_M31',11,'Pineapple Tepache, No Alcohol','Fermented pineapple, chilli, lime. Zero proof.',22000,15,'bar',0,'tepache','[\"zero proof\"]',31),(71,'bv_M32',11,'Pandan Iced Tea','Cold-brewed pandan, jasmine, calamansi. Zero proof.',18000,15,'bar',0,'icedtea','[\"zero proof\"]',32),(72,'bv_M33',11,'Barako Espresso','Liberica from Batangas, pulled short.',16000,15,'bar',0,'espresso','[\"zero proof\"]',33),(73,'bv26_inasal',8,'Garden-Flame Chicken Inasal','Calamansi-marinated chicken grilled with annatto and lemongrass; bright, smoky and made for the middle of the table.',58000,15,'grill',1,'bv26_inasal','[\"poultry\", \"signature\", \"for sharing\"]',1),(74,'bv26_adobo',8,'Claypot Garlic Adobo','Chicken simmered in soy, vinegar and bay, finished with tender garlic and a glossy savoury sauce.',52000,15,'hot',1,'bv26_adobo','[\"poultry\", \"soy\"]',2),(75,'bv26_kawali',8,'Golden Kawali Platter','Crisp-skinned pork belly with a tender centre, served with a tangy dipping sauce for sharing.',62000,15,'fry',1,'bv26_kawali','[\"pork\", \"for sharing\"]',3),(76,'bv26_karekare',8,'Heritage Oxtail Kare-Kare','Tender oxtail and vegetables in a rich peanut sauce, with bagoong served on the side.',78000,15,'hot',1,'bv26_karekare','[\"beef\", \"peanuts\", \"shellfish\"]',4),(77,'bv26_kaldereta',8,'Slow-Simmered Beef Kaldereta','Beef, potatoes and peppers in a deep tomato sauce, gently simmered until tender.',68000,15,'hot',1,'bv26_kaldereta','[\"beef\", \"for sharing\"]',5),(78,'bv26_prawns',8,'Golden Garlic Butter Prawns','Shell-on prawns tossed in garlic butter with a lively citrus finish.',64000,15,'hot',1,'bv26_prawns','[\"shellfish\", \"dairy\", \"for sharing\"]',6),(79,'bv26_palabok',8,'Fiesta Palabok','Rice noodles with savoury shrimp sauce, egg, crisp toppings and calamansi to squeeze over.',42000,15,'hot',1,'bv26_palabok','[\"shellfish\", \"eggs\", \"pork\"]',7),(80,'bv26_rice',8,'Garden Garlic Fried Rice','Rice wok-tossed with garlic, egg and garden vegetables; a colourful bowl for sharing.',15000,15,'hot',1,'bv26_rice','[\"vegetarian\", \"eggs\", \"for sharing\"]',8),(81,'bv26_lumpia',9,'Golden Shanghai Rolls','Crisp rolls filled with seasoned pork and vegetables, with a sweet and tangy dipping sauce.',24000,15,'fry',1,'bv26_lumpia','[\"pork\", \"gluten\", \"eggs\"]',9),(82,'bv26_sinigang',9,'Tamarind Garden Shrimp Sinigang','Prawns, tomatoes and greens in a clear tamarind broth with a bright, comforting sourness.',52000,15,'hot',1,'bv26_sinigang','[\"shellfish\", \"for sharing\"]',10),(83,'bv26_chopsuey',9,'Market Garden Chopsuey','Colourful vegetables, prawns and tender meat in a light savoury sauce.',36000,15,'hot',1,'bv26_chopsuey','[\"shellfish\", \"pork\", \"soy\", \"eggs\"]',11),(84,'bv26_tomato',9,'Sun-Ripened Tomato Ensalada','Juicy tomatoes, onion and fresh leaves with a light, tangy dressing.',26000,15,'cold',1,'bv26_tomato','[\"vegetarian\"]',12),(85,'bv26_kinilaw',9,'Coastal Citrus Kinilaw','Fish dressed in vinegar and citrus with ginger, onion and a gentle chilli warmth.',39000,15,'cold',1,'bv26_kinilaw','[\"fish\", \"signature\"]',13),(86,'bv26_flan',10,'Golden Caramel Leche Flan','Silky egg-and-milk custard finished with a pool of amber caramel.',18000,15,'pastry',1,'bv26_flan','[\"eggs\", \"dairy\"]',14),(87,'bv26_ube',10,'Velvet Ube Halaya','Slow-cooked purple yam with a creamy finish and toasted coconut curds.',19000,15,'pastry',1,'bv26_ube','[\"dairy\"]',15),(88,'bv26_maja',10,'Coconut & Sweetcorn Maja','Soft coconut pudding dotted with sweetcorn and finished with toasted latik.',16000,15,'pastry',1,'bv26_maja','[\"dairy\"]',16),(89,'bv26_bibingka',10,'Garden Oven Bibingka','Warm coconut rice cake with a buttery top, cheese and salted egg.',19000,15,'pastry',1,'bv26_bibingka','[\"eggs\", \"dairy\"]',17),(90,'bv26_turon',10,'Caramel-Crisp Banana Turon','Golden banana rolls with jackfruit, a delicate crisp wrapper and caramelised sugar.',18000,15,'pastry',1,'bv26_turon','[\"gluten\"]',18),(91,'bv26_sapin',10,'Three-Layer Sapin-Sapin','Soft layers of coconut rice cake in classic colours, finished with fragrant latik.',17000,15,'pastry',1,'bv26_sapin','[\"vegetarian\"]',19),(92,'bv26_ginataan',10,'Coconut Bilo-Bilo Bowl','Chewy rice dumplings, fruit and root crops gently simmered in sweet coconut milk.',21000,15,'pastry',1,'bv26_ginataan','[\"vegetarian\"]',20),(93,'bv26_buko',10,'Creamy Young Coconut Cooler','Chilled coconut water, tender coconut strips and a splash of milk, served over ice.',14000,5,'bar',1,'bv26_buko','[\"dairy\", \"zero proof\"]',21),(94,'bv26_mangoshake',10,'Mango Orchard Shake','Ripe mango blended with milk and ice into a smooth tropical shake.',18000,5,'bar',1,'bv26_mangoshake','[\"dairy\", \"zero proof\"]',22),(95,'bv26_sago',10,'Amber Sago & Gulaman','Sago pearls and jelly in a chilled brown-sugar cooler with a hint of vanilla.',15000,5,'bar',1,'bv26_sago','[\"zero proof\"]',23),(96,'bv26_icedtea',10,'Honey-Calamansi Garden Tea','Chilled tea lifted with calamansi and a touch of honey.',14000,5,'bar',1,'bv26_icedtea','[\"zero proof\"]',24);
/*!40000 ALTER TABLE `menu_items` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `opening_hours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `opening_hours` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `room_type_id` int unsigned DEFAULT NULL,
  `weekday` tinyint unsigned NOT NULL,
  `open_time` time NOT NULL,
  `close_time` time NOT NULL,
  `service_name` varchar(32) NOT NULL DEFAULT 'dinner',
  `is_closed` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hours` (`room_type_id`,`weekday`,`service_name`),
  CONSTRAINT `fk_hours_type` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`id`),
  CONSTRAINT `chk_weekday` CHECK ((`weekday` <= 6))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `opening_hours` WRITE;
/*!40000 ALTER TABLE `opening_hours` DISABLE KEYS */;
INSERT INTO `opening_hours` VALUES (1,NULL,0,'10:00:00','22:00:00','dinner',0),(2,NULL,1,'10:00:00','22:00:00','dinner',1),(3,NULL,2,'10:00:00','22:00:00','dinner',0),(4,NULL,3,'10:00:00','22:00:00','dinner',0),(5,NULL,4,'10:00:00','22:00:00','dinner',0),(6,NULL,5,'10:00:00','22:00:00','dinner',0),(7,NULL,6,'10:00:00','22:00:00','dinner',0);
/*!40000 ALTER TABLE `opening_hours` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `order_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_actions` (
  `user_id` int unsigned NOT NULL,
  `request_key` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `payload_hash` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `order_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`user_id`,`request_key`),
  KEY `fk_action_order` (`order_id`),
  CONSTRAINT `fk_action_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_action_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `order_actions` WRITE;
/*!40000 ALTER TABLE `order_actions` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_actions` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `order_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `ticket_id` bigint unsigned DEFAULT NULL,
  `action` varchar(24) NOT NULL,
  `from_status` varchar(24) DEFAULT NULL,
  `to_status` varchar(24) NOT NULL,
  `actor_user_id` int unsigned NOT NULL,
  `reason` varchar(255) NOT NULL DEFAULT '',
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_order_event` (`order_id`,`id`),
  KEY `fk_event_ticket` (`ticket_id`),
  KEY `fk_event_actor` (`actor_user_id`),
  CONSTRAINT `fk_event_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_event_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_event_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `kitchen_tickets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `order_events` WRITE;
/*!40000 ALTER TABLE `order_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_events` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `menu_item_id` int unsigned NOT NULL,
  `qty` smallint unsigned NOT NULL DEFAULT '1',
  `unit_price_cents` int unsigned NOT NULL,
  `course_no` tinyint unsigned NOT NULL DEFAULT '1',
  `notes` varchar(255) DEFAULT NULL,
  `status` enum('queued','preparing','ready','served','void') NOT NULL DEFAULT 'queued',
  `item_name` varchar(120) DEFAULT NULL,
  `station_snapshot` varchar(16) DEFAULT NULL,
  `tags_snapshot` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_oi_order` (`order_id`),
  KEY `ix_oi_status` (`status`),
  KEY `fk_oi_item` (`menu_item_id`),
  CONSTRAINT `fk_oi_item` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`),
  CONSTRAINT `fk_oi_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `order_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_status_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `from_status` varchar(20) DEFAULT NULL,
  `to_status` varchar(20) NOT NULL,
  `actor_user_id` int unsigned DEFAULT NULL,
  `changed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_osh_order` (`order_id`,`changed_at`),
  KEY `fk_osh_actor` (`actor_user_id`),
  CONSTRAINT `fk_osh_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_osh_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `order_status_history` WRITE;
/*!40000 ALTER TABLE `order_status_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_status_history` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `reservation_id` bigint unsigned DEFAULT NULL,
  `table_id` int unsigned NOT NULL,
  `opened_by` int unsigned DEFAULT NULL,
  `status` enum('open','sent_to_kitchen','preparing','ready','served','paid','void','closed') NOT NULL DEFAULT 'open',
  `subtotal_cents` int unsigned NOT NULL DEFAULT '0',
  `service_cents` int unsigned NOT NULL DEFAULT '0',
  `total_cents` int unsigned NOT NULL DEFAULT '0',
  `opened_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` datetime DEFAULT NULL,
  `version` int unsigned NOT NULL DEFAULT '1',
  `assigned_server_id` int unsigned DEFAULT NULL,
  `allergy_notes` varchar(1000) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `ix_orders_status` (`status`,`opened_at`),
  KEY `ix_orders_res` (`reservation_id`),
  KEY `fk_orders_table` (`table_id`),
  KEY `fk_orders_user` (`opened_by`),
  KEY `fk_order_server` (`assigned_server_id`),
  CONSTRAINT `fk_order_server` FOREIGN KEY (`assigned_server_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_orders_res` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_orders_table` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`opened_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `outbox`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `outbox` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `reservation_id` bigint unsigned DEFAULT NULL,
  `channel` enum('email','sms') NOT NULL,
  `recipient` varchar(190) NOT NULL,
  `subject` varchar(190) DEFAULT NULL,
  `body` text NOT NULL,
  `status` enum('queued','viewed') NOT NULL DEFAULT 'queued',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_outbox_status` (`status`,`created_at`),
  KEY `fk_outbox_res` (`reservation_id`),
  CONSTRAINT `fk_outbox_res` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `outbox` WRITE;
/*!40000 ALTER TABLE `outbox` DISABLE KEYS */;
/*!40000 ALTER TABLE `outbox` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `pacing_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pacing_rules` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `weekday` tinyint unsigned DEFAULT NULL,
  `window_start` time NOT NULL,
  `window_end` time NOT NULL,
  `max_covers` smallint unsigned NOT NULL,
  `max_reservations` smallint unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `pacing_rules` WRITE;
/*!40000 ALTER TABLE `pacing_rules` DISABLE KEYS */;
INSERT INTO `pacing_rules` VALUES (1,'dinner-default',NULL,'17:30:00','21:45:00',80,9);
/*!40000 ALTER TABLE `pacing_rules` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `policy_money_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `policy_money_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `reservation_id` bigint unsigned NOT NULL,
  `actor_user_id` int unsigned NOT NULL,
  `request_key` char(36) NOT NULL,
  `kind` enum('extra_receipt','refund_base','refund_extra') NOT NULL,
  `amount_cents` int unsigned NOT NULL,
  `method` enum('cash','external_card') NOT NULL,
  `reason` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_policy_money` (`actor_user_id`,`request_key`),
  KEY `reservation_id` (`reservation_id`),
  CONSTRAINT `policy_money_events_ibfk_1` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`),
  CONSTRAINT `policy_money_events_ibfk_2` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `policy_money_events_chk_1` CHECK ((`amount_cents` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `policy_money_events` WRITE;
/*!40000 ALTER TABLE `policy_money_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `policy_money_events` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `preorder_quotes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `preorder_quotes` (
  `scope_key` varchar(80) NOT NULL,
  `hold_id` bigint unsigned DEFAULT NULL,
  `reservation_id` bigint unsigned DEFAULT NULL,
  `token` char(64) NOT NULL,
  `quote_json` json NOT NULL,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`scope_key`),
  UNIQUE KEY `hold_id` (`hold_id`),
  UNIQUE KEY `reservation_id` (`reservation_id`),
  CONSTRAINT `preorder_quotes_ibfk_1` FOREIGN KEY (`hold_id`) REFERENCES `holds` (`id`) ON DELETE CASCADE,
  CONSTRAINT `preorder_quotes_ibfk_2` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `preorder_quotes` WRITE;
/*!40000 ALTER TABLE `preorder_quotes` DISABLE KEYS */;
/*!40000 ALTER TABLE `preorder_quotes` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `reservation_change_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservation_change_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `reservation_id` bigint unsigned NOT NULL,
  `before_json` json NOT NULL,
  `after_json` json NOT NULL,
  `changed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_change_res` (`reservation_id`,`changed_at`),
  CONSTRAINT `fk_change_res` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `reservation_change_history` WRITE;
/*!40000 ALTER TABLE `reservation_change_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `reservation_change_history` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `reservation_manage_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservation_manage_tokens` (
  `reservation_id` bigint unsigned NOT NULL,
  `token_hash` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`reservation_id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  CONSTRAINT `fk_manage_res` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `reservation_manage_tokens` WRITE;
/*!40000 ALTER TABLE `reservation_manage_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `reservation_manage_tokens` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `reservation_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservation_policies` (
  `reservation_id` bigint unsigned NOT NULL,
  `deadline_at` datetime NOT NULL,
  `status` enum('active','cancelled','no_show') NOT NULL DEFAULT 'active',
  `accepted_json` json DEFAULT NULL,
  `accepted_at` datetime DEFAULT NULL,
  `forfeited_base_cents` int unsigned NOT NULL DEFAULT '0',
  `reviewed` tinyint(1) NOT NULL DEFAULT '0',
  `terminal_json` json DEFAULT NULL,
  PRIMARY KEY (`reservation_id`),
  CONSTRAINT `reservation_policies_ibfk_1` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `reservation_policies` WRITE;
/*!40000 ALTER TABLE `reservation_policies` DISABLE KEYS */;
/*!40000 ALTER TABLE `reservation_policies` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `reservation_policy_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservation_policy_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `reservation_id` bigint unsigned NOT NULL,
  `kind` varchar(24) NOT NULL,
  `actor_user_id` int unsigned DEFAULT NULL,
  `detail_json` json NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `reservation_id` (`reservation_id`),
  KEY `actor_user_id` (`actor_user_id`),
  CONSTRAINT `reservation_policy_events_ibfk_1` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`),
  CONSTRAINT `reservation_policy_events_ibfk_2` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `reservation_policy_events` WRITE;
/*!40000 ALTER TABLE `reservation_policy_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `reservation_policy_events` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `reservation_preorders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservation_preorders` (
  `reservation_id` bigint unsigned NOT NULL,
  `version` int unsigned NOT NULL DEFAULT '1',
  `status` enum('scheduled','handed_off','cancelled') NOT NULL DEFAULT 'scheduled',
  `accepted_json` json NOT NULL,
  `current_json` json NOT NULL,
  `history_json` json NOT NULL,
  `confirmation_hash` char(64) NOT NULL,
  `last_edit_hash` char(64) DEFAULT NULL,
  `order_id` bigint unsigned DEFAULT NULL,
  `accepted_at` datetime NOT NULL,
  `handed_off_at` datetime DEFAULT NULL,
  PRIMARY KEY (`reservation_id`),
  UNIQUE KEY `order_id` (`order_id`),
  CONSTRAINT `reservation_preorders_ibfk_1` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`),
  CONSTRAINT `reservation_preorders_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `reservation_preorders` WRITE;
/*!40000 ALTER TABLE `reservation_preorders` DISABLE KEYS */;
/*!40000 ALTER TABLE `reservation_preorders` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `reservation_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservation_status_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `reservation_id` bigint unsigned NOT NULL,
  `from_status` varchar(16) DEFAULT NULL,
  `to_status` varchar(16) NOT NULL,
  `actor_user_id` int unsigned DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `changed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_rsh_res` (`reservation_id`,`changed_at`),
  KEY `fk_rsh_actor` (`actor_user_id`),
  CONSTRAINT `fk_rsh_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_rsh_res` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `reservation_status_history` WRITE;
/*!40000 ALTER TABLE `reservation_status_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `reservation_status_history` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `reservation_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservation_tables` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `reservation_id` bigint unsigned NOT NULL,
  `table_id` int unsigned NOT NULL,
  `slot_start` datetime NOT NULL,
  `released_at` datetime DEFAULT NULL,
  `active_slot_start` datetime GENERATED ALWAYS AS ((case when (`released_at` is null) then `slot_start` else NULL end)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_res_table` (`reservation_id`,`table_id`),
  UNIQUE KEY `uq_table_active_slot` (`table_id`,`active_slot_start`),
  KEY `ix_rt_table` (`table_id`),
  CONSTRAINT `fk_rt_res` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`),
  CONSTRAINT `fk_rt_table` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `reservation_tables` WRITE;
/*!40000 ALTER TABLE `reservation_tables` DISABLE KEYS */;
/*!40000 ALTER TABLE `reservation_tables` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` char(10) NOT NULL,
  `seed_key` varchar(64) DEFAULT NULL,
  `guest_id` int unsigned NOT NULL,
  `room_type_id` int unsigned NOT NULL,
  `table_group_id` int unsigned DEFAULT NULL,
  `party_size` smallint unsigned NOT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime NOT NULL,
  `blocks_until` datetime NOT NULL,
  `turn_time_min` smallint unsigned NOT NULL,
  `status` enum('pending','confirmed','seated','completed','cancelled','no_show','waitlisted') NOT NULL DEFAULT 'pending',
  `source` enum('web','phone','walk_in','admin') NOT NULL DEFAULT 'web',
  `deposit_cents` int unsigned NOT NULL DEFAULT '0',
  `deposit_status` enum('none','required','paid','refunded','forfeited') NOT NULL DEFAULT 'none',
  `approval_state` enum('not_required','awaiting','approved','rejected') NOT NULL DEFAULT 'not_required',
  `special_requests` text,
  `seated_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `waitlist_rank` int unsigned DEFAULT NULL,
  `waitlist_offer_state` enum('none','offered','accepted','expired') NOT NULL DEFAULT 'none',
  `waitlist_offer_expires_at` datetime DEFAULT NULL,
  `version` int unsigned NOT NULL DEFAULT '1',
  `created_by` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `seed_key` (`seed_key`),
  KEY `ix_res_window` (`starts_at`,`blocks_until`),
  KEY `ix_res_status_day` (`status`,`starts_at`),
  KEY `ix_res_guest` (`guest_id`),
  KEY `ix_res_waitlist` (`status`,`starts_at`,`waitlist_rank`),
  KEY `fk_res_type` (`room_type_id`),
  KEY `fk_res_group` (`table_group_id`),
  KEY `fk_res_creator` (`created_by`),
  CONSTRAINT `fk_res_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_res_group` FOREIGN KEY (`table_group_id`) REFERENCES `table_groups` (`id`),
  CONSTRAINT `fk_res_guest` FOREIGN KEY (`guest_id`) REFERENCES `guests` (`id`),
  CONSTRAINT `fk_res_type` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`id`),
  CONSTRAINT `chk_res_code` CHECK (regexp_like(`code`,_utf8mb4'^LUM-[A-Z0-9]{6}$')),
  CONSTRAINT `chk_res_party` CHECK ((`party_size` between 1 and 20)),
  CONSTRAINT `chk_res_time` CHECK (((`starts_at` < `ends_at`) and (`ends_at` <= `blocks_until`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `reservations` WRITE;
/*!40000 ALTER TABLE `reservations` DISABLE KEYS */;
/*!40000 ALTER TABLE `reservations` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` tinyint unsigned NOT NULL,
  `code` varchar(24) NOT NULL,
  `name` varchar(48) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'admin','Owner / administrator'),(2,'manager','Manager'),(3,'host','Host'),(4,'server','Server'),(5,'kitchen','Kitchen');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `room_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `room_types` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `name` varchar(80) NOT NULL,
  `description` text,
  `min_party` smallint unsigned NOT NULL,
  `max_party` smallint unsigned NOT NULL,
  `min_notice_hours` smallint unsigned NOT NULL DEFAULT '0',
  `min_spend_cents` int unsigned NOT NULL DEFAULT '0',
  `requires_approval` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` smallint NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `room_types` WRITE;
/*!40000 ALTER TABLE `room_types` DISABLE KEYS */;
INSERT INTO `room_types` VALUES (1,'vip','VIP Rooms','Private suites with dedicated host.',2,10,12,650000,0,1,0),(2,'common','Main Dining','Open dining room around the hearth.',1,4,0,0,0,2,0),(3,'group','Group Tables','Communal tables for larger parties.',5,16,12,320000,0,3,0),(4,'terrace','Terrace & Bar','Open-air harbour-side seating.',1,6,0,0,0,4,0),(59,'bv_standard','Standard Tables','Bella Vista assignment catalog',2,4,0,0,0,0,1),(60,'bv_family','Family Tables','Bella Vista assignment catalog',5,8,0,0,0,1,1),(61,'bv_vip','VIP Function Rooms','Bella Vista assignment catalog',1,20,0,0,0,2,1);
/*!40000 ALTER TABLE `room_types` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rooms` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `room_type_id` int unsigned NOT NULL,
  `name` varchar(80) NOT NULL,
  `floor_x` smallint NOT NULL DEFAULT '0',
  `floor_y` smallint NOT NULL DEFAULT '0',
  `floor_w` smallint unsigned NOT NULL DEFAULT '1000',
  `floor_h` smallint unsigned NOT NULL DEFAULT '700',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `fk_rooms_type` (`room_type_id`),
  CONSTRAINT `fk_rooms_type` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `rooms` WRITE;
/*!40000 ALTER TABLE `rooms` DISABLE KEYS */;
INSERT INTO `rooms` VALUES (1,'r_vip',1,'Suites',40,40,280,300,0),(2,'r_common',2,'Main Dining',350,40,430,420,0),(3,'r_group',3,'The Long Room',40,370,280,290,0),(4,'r_terrace',4,'Terrace',810,40,150,620,0),(56,'bv_standard_room',59,'Standard Dining',350,30,510,600,1),(57,'bv_family_room',60,'Family Dining',30,370,280,360,1),(58,'bv_vip_room',61,'VIP Rooms',30,30,280,300,1);
/*!40000 ALTER TABLE `rooms` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `skey` varchar(64) NOT NULL,
  `svalue` varchar(255) NOT NULL,
  `value_type` enum('int','string','bool','json','time') NOT NULL DEFAULT 'string',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`skey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES ('billing_profile','bella_vista_b3','string','2026-10-18 09:03:54'),('buffer_min','15','int','2026-10-18 09:02:57'),('cancel_cutoff_min','1440','int','2026-10-18 15:09:31'),('catalog_profile','bella_vista_b2','string','2026-10-18 09:03:53'),('hold_ttl_sec','600','int','2026-10-18 09:02:57'),('last_seating_time','20:00','time','2026-10-18 09:03:53'),('manager_approval_party_min','21','int','2026-10-18 09:03:53'),('max_covers_per_slot','80','int','2026-10-18 09:03:53'),('max_lead_time_days','60','int','2026-10-18 09:02:57'),('max_party_online','20','int','2026-10-18 09:03:53'),('max_reservations_per_slot','9','int','2026-10-18 09:03:53'),('min_lead_time_min','0','int','2026-10-18 09:03:53'),('no_show_grace_min','15','int','2026-10-18 15:09:31'),('operations_profile','bella_vista_b6','string','2026-10-18 19:51:46'),('policy_profile','bella_vista_b5','string','2026-10-18 15:09:31'),('preorder_profile','bella_vista_b4','string','2026-10-18 09:28:41'),('slot_interval_min','15','int','2026-10-18 09:02:57'),('venue_timezone','Asia/Manila','string','2026-10-18 09:02:57');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `staff_activation_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_activation_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `token_hash` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `ix_activation_user` (`user_id`),
  CONSTRAINT `fk_activation_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `staff_activation_tokens` WRITE;
/*!40000 ALTER TABLE `staff_activation_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_activation_tokens` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `staff_login_limits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_login_limits` (
  `key_hash` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `attempts` int unsigned NOT NULL DEFAULT '0',
  `window_started_at` datetime NOT NULL,
  PRIMARY KEY (`key_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `staff_login_limits` WRITE;
/*!40000 ALTER TABLE `staff_login_limits` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_login_limits` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `staff_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_requests` (
  `user_id` int unsigned NOT NULL,
  `request_key` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `payload_hash` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `reservation_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`user_id`,`request_key`),
  KEY `fk_staff_request_res` (`reservation_id`),
  CONSTRAINT `fk_staff_request_res` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`),
  CONSTRAINT `fk_staff_request_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `staff_requests` WRITE;
/*!40000 ALTER TABLE `staff_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_requests` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `staff_security_lock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_security_lock` (
  `id` tinyint unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `staff_security_lock` WRITE;
/*!40000 ALTER TABLE `staff_security_lock` DISABLE KEYS */;
INSERT INTO `staff_security_lock` VALUES (1);
/*!40000 ALTER TABLE `staff_security_lock` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `table_group_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_group_members` (
  `table_group_id` int unsigned NOT NULL,
  `table_id` int unsigned NOT NULL,
  PRIMARY KEY (`table_group_id`,`table_id`),
  KEY `ix_tgm_table` (`table_id`),
  CONSTRAINT `fk_tgm_group` FOREIGN KEY (`table_group_id`) REFERENCES `table_groups` (`id`),
  CONSTRAINT `fk_tgm_table` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `table_group_members` WRITE;
/*!40000 ALTER TABLE `table_group_members` DISABLE KEYS */;
INSERT INTO `table_group_members` VALUES (1,17),(1,18);
/*!40000 ALTER TABLE `table_group_members` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `table_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_groups` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `room_id` int unsigned NOT NULL,
  `name` varchar(80) NOT NULL,
  `capacity_min` smallint unsigned NOT NULL,
  `capacity_max` smallint unsigned NOT NULL,
  `setup_min` smallint unsigned NOT NULL DEFAULT '10',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `fk_tgroups_room` (`room_id`),
  CONSTRAINT `fk_tgroups_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  CONSTRAINT `chk_group_capacity` CHECK (((`capacity_min` >= 1) and (`capacity_max` >= `capacity_min`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `table_groups` WRITE;
/*!40000 ALTER TABLE `table_groups` DISABLE KEYS */;
INSERT INTO `table_groups` VALUES (1,'G1-G2',3,'Long A + Long B',11,16,10,0);
/*!40000 ALTER TABLE `table_groups` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tables` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `room_id` int unsigned NOT NULL,
  `code` varchar(16) NOT NULL,
  `label` varchar(32) NOT NULL,
  `capacity_min` smallint unsigned NOT NULL,
  `capacity_max` smallint unsigned NOT NULL,
  `is_joinable` tinyint(1) NOT NULL DEFAULT '0',
  `shape` enum('round','square','rect','booth','counter') NOT NULL DEFAULT 'rect',
  `pos_x` smallint NOT NULL DEFAULT '0',
  `pos_y` smallint NOT NULL DEFAULT '0',
  `pos_w` smallint unsigned DEFAULT NULL,
  `pos_h` smallint unsigned DEFAULT NULL,
  `radius` smallint unsigned DEFAULT NULL,
  `priority` smallint NOT NULL DEFAULT '100',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `ix_tables_room_capacity` (`room_id`,`capacity_max`,`capacity_min`),
  CONSTRAINT `fk_tables_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  CONSTRAINT `chk_table_capacity` CHECK (((`capacity_min` >= 1) and (`capacity_max` >= `capacity_min`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `tables` WRITE;
/*!40000 ALTER TABLE `tables` DISABLE KEYS */;
INSERT INTO `tables` VALUES (1,1,'V1','Suite 1',2,6,0,'round',110,110,NULL,NULL,42,3,0),(2,1,'V2','Suite 2',4,10,0,'round',240,130,NULL,NULL,50,3,0),(3,1,'V3','Suite 3',2,4,0,'round',105,255,NULL,NULL,36,3,0),(4,1,'V4','Suite 4',4,8,0,'round',243,272,NULL,NULL,45,3,0),(5,2,'C1','12',1,2,0,'square',400,95,52,52,NULL,1,0),(6,2,'C2','14',1,2,0,'square',480,95,52,52,NULL,1,0),(7,2,'C3','16',2,4,0,'square',575,95,66,62,NULL,1,0),(8,2,'C4','18',2,4,0,'square',683,95,66,62,NULL,1,0),(9,2,'C5','20',1,2,0,'square',400,195,52,52,NULL,1,0),(10,2,'C6','22',2,4,0,'square',480,190,66,62,NULL,1,0),(11,2,'C7','24',2,4,0,'square',683,190,66,62,NULL,1,0),(12,2,'C8','26',1,2,0,'square',400,295,52,52,NULL,1,0),(13,2,'C9','28',2,4,0,'square',480,290,66,62,NULL,1,0),(14,2,'C10','30',2,4,0,'square',683,290,66,62,NULL,1,0),(15,2,'C11','32',2,4,0,'rect',565,380,96,54,NULL,1,0),(16,2,'C12','34',2,4,0,'rect',415,380,96,54,NULL,1,0),(17,3,'G1','Long A',5,10,1,'rect',90,430,180,58,NULL,2,0),(18,3,'G2','Long B',5,10,1,'rect',90,530,180,58,NULL,2,0),(19,3,'G3','Oak',6,16,0,'rect',90,620,180,48,NULL,2,0),(20,4,'T1','B1',1,2,0,'square',860,100,48,48,NULL,1,0),(21,4,'T2','B2',1,2,0,'square',860,175,48,48,NULL,1,0),(22,4,'T3','B3',2,4,0,'square',860,255,60,56,NULL,1,0),(23,4,'T4','B4',2,4,0,'square',860,345,60,56,NULL,1,0),(24,4,'T5','B5',2,6,0,'rect',845,440,92,56,NULL,1,0),(25,4,'T6','B6',1,2,0,'square',860,540,48,48,NULL,1,0),(146,56,'S1','Standard Table S1',2,4,0,'rect',420,160,100,50,NULL,100,1),(147,56,'S2','Standard Table S2',2,4,0,'rect',680,160,100,50,NULL,100,1),(148,56,'S3','Standard Table S3',2,4,0,'rect',420,400,100,50,NULL,100,1),(149,56,'S4','Standard Table S4',2,4,0,'rect',680,400,100,50,NULL,100,1),(150,57,'F1','Family Table F1',5,8,0,'rect',80,445,100,50,NULL,100,1),(151,57,'F2','Family Table F2',5,8,0,'rect',80,545,100,50,NULL,100,1),(152,57,'F3','Family Table F3',5,8,0,'rect',80,645,100,50,NULL,100,1),(153,58,'VIP1','VIP Room 1',1,20,0,'rect',80,120,100,50,NULL,100,1),(154,58,'VIP2','VIP Room 2',1,20,0,'rect',80,240,100,50,NULL,100,1);
/*!40000 ALTER TABLE `tables` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `turn_times`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `turn_times` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `party_min` smallint unsigned NOT NULL,
  `party_max` smallint unsigned NOT NULL,
  `turn_time_min` smallint unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `party_min` (`party_min`),
  CONSTRAINT `chk_turn_range` CHECK ((`party_max` >= `party_min`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `turn_times` WRITE;
/*!40000 ALTER TABLE `turn_times` DISABLE KEYS */;
INSERT INTO `turn_times` VALUES (1,1,2,75),(2,3,4,90),(3,5,6,105),(4,7,10,120),(5,11,16,150);
/*!40000 ALTER TABLE `turn_times` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `role_id` tinyint unsigned NOT NULL,
  `email` varchar(190) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `full_name` varchar(120) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `auth_version` int unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_role` (`role_id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `chk_active_user_hash` CHECK (((`is_active` = false) or (`password_hash` is not null)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `waitlist_offers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `waitlist_offers` (
  `reservation_id` bigint unsigned NOT NULL,
  `hold_id` bigint unsigned NOT NULL,
  `offered_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`reservation_id`),
  UNIQUE KEY `hold_id` (`hold_id`),
  CONSTRAINT `fk_offer_hold` FOREIGN KEY (`hold_id`) REFERENCES `holds` (`id`),
  CONSTRAINT `fk_offer_res` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `waitlist_offers` WRITE;
/*!40000 ALTER TABLE `waitlist_offers` DISABLE KEYS */;
/*!40000 ALTER TABLE `waitlist_offers` ENABLE KEYS */;
UNLOCK TABLES;


DROP TABLE IF EXISTS `web_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `web_sessions` (
  `id_hash` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `payload` mediumblob NOT NULL,
  `expires_at` bigint unsigned NOT NULL,
  PRIMARY KEY (`id_hash`),
  KEY `idx_web_sessions_expiry` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


LOCK TABLES `web_sessions` WRITE;
/*!40000 ALTER TABLE `web_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `web_sessions` ENABLE KEYS */;
UNLOCK TABLES;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

CREATE TABLE IF NOT EXISTS staff_account_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  status ENUM('pending','approved') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME NULL,
  KEY ix_account_request_pending (status,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
