-- =====================================================================
-- FULL-STACK ECOMMERCE — Complete Database Bootstrap Script
-- =====================================================================
-- Run this script to create the entire database from scratch.
-- It will DROP the schema if it exists and recreate everything.
--
-- Execution order:
--   1. Create DB user (if needed)
--   2. Create schema
--   3. Product catalog (product_category, product)
--   4. Countries & states (country, state)
--   5. Order system (address, customer, orders, order_item)
--   6. Seed product data (100 products across 4 categories)
-- =====================================================================

-- -----------------------------------------------------------------
-- 1. DATABASE USER
-- -----------------------------------------------------------------
-- Uncomment the lines below if you need to create the app user.
-- If the user already exists, skip this section.
--
-- CREATE USER 'ecommerceapp'@'localhost' IDENTIFIED BY 'ecommerceapp';
-- GRANT ALL PRIVILEGES ON *.* TO 'ecommerceapp'@'localhost';
-- ALTER USER 'ecommerceapp'@'localhost' IDENTIFIED WITH mysql_native_password BY 'ecommerceapp';

-- -----------------------------------------------------------------
-- 2. SCHEMA
-- -----------------------------------------------------------------
DROP SCHEMA IF EXISTS `full-stack-ecommerce`;
CREATE SCHEMA `full-stack-ecommerce`;
USE `full-stack-ecommerce`;

-- -----------------------------------------------------------------
-- 3. PRODUCT CATALOG
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `product_category` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `category_name` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1;

CREATE TABLE IF NOT EXISTS `product` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `sku` VARCHAR(255) DEFAULT NULL,
  `name` VARCHAR(255) DEFAULT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `unit_price` DECIMAL(13,2) DEFAULT NULL,
  `image_url` VARCHAR(255) DEFAULT NULL,
  `active` BIT DEFAULT 1,
  `units_in_stock` INT DEFAULT NULL,
  `date_created` DATETIME(6) DEFAULT NULL,
  `last_updated` DATETIME(6) DEFAULT NULL,
  `category_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_category` (`category_id`),
  CONSTRAINT `fk_category` FOREIGN KEY (`category_id`) REFERENCES `product_category` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1;

-- -----------------------------------------------------------------
-- 4. COUNTRIES & STATES
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `country` (
  `id` SMALLINT UNSIGNED NOT NULL,
  `code` VARCHAR(2) DEFAULT NULL,
  `name` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `state` (
  `id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) DEFAULT NULL,
  `country_id` SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_country` (`country_id`),
  CONSTRAINT `fk_country` FOREIGN KEY (`country_id`) REFERENCES `country` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1;

-- -----------------------------------------------------------------
-- 5. ORDER SYSTEM (address, customer, orders, order_item)
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `address` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `city` VARCHAR(255) DEFAULT NULL,
  `country` VARCHAR(255) DEFAULT NULL,
  `state` VARCHAR(255) DEFAULT NULL,
  `street` VARCHAR(255) DEFAULT NULL,
  `zip_code` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `customer` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `first_name` VARCHAR(255) DEFAULT NULL,
  `last_name` VARCHAR(255) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `password` VARCHAR(255) DEFAULT NULL,
  `default_shipping_address_id` BIGINT DEFAULT NULL,
  `default_billing_address_id` BIGINT DEFAULT NULL,
  `card_type` VARCHAR(50) DEFAULT NULL,
  `name_on_card` VARCHAR(255) DEFAULT NULL,
  `card_number` VARCHAR(20) DEFAULT NULL,
  `card_expiration_month` INT DEFAULT NULL,
  `card_expiration_year` INT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_customer_email` (`email`),
  KEY `K_default_shipping_address_id` (`default_shipping_address_id`),
  KEY `K_default_billing_address_id` (`default_billing_address_id`),
  CONSTRAINT `FK_default_shipping_address` FOREIGN KEY (`default_shipping_address_id`) REFERENCES `address` (`id`),
  CONSTRAINT `FK_default_billing_address` FOREIGN KEY (`default_billing_address_id`) REFERENCES `address` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `order_tracking_number` VARCHAR(255) DEFAULT NULL,
  `total_price` DECIMAL(19,2) DEFAULT NULL,
  `total_quantity` INT DEFAULT NULL,
  `billing_address_id` BIGINT DEFAULT NULL,
  `customer_id` BIGINT DEFAULT NULL,
  `shipping_address_id` BIGINT DEFAULT NULL,
  `status` VARCHAR(128) DEFAULT NULL,
  `date_created` DATETIME(6) DEFAULT NULL,
  `last_updated` DATETIME(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_billing_address_id` (`billing_address_id`),
  UNIQUE KEY `UK_shipping_address_id` (`shipping_address_id`),
  KEY `K_customer_id` (`customer_id`),
  CONSTRAINT `FK_customer_id` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`id`),
  CONSTRAINT `FK_billing_address_id` FOREIGN KEY (`billing_address_id`) REFERENCES `address` (`id`),
  CONSTRAINT `FK_shipping_address_id` FOREIGN KEY (`shipping_address_id`) REFERENCES `address` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `order_item` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `image_url` VARCHAR(255) DEFAULT NULL,
  `quantity` INT DEFAULT NULL,
  `unit_price` DECIMAL(19,2) DEFAULT NULL,
  `order_id` BIGINT DEFAULT NULL,
  `product_id` BIGINT DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `K_order_id` (`order_id`),
  CONSTRAINT `FK_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `FK_product_id` FOREIGN KEY (`product_id`) REFERENCES `product` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- SEED DATA
-- =================================================================

-- -----------------------------------------------------------------
-- Countries
-- -----------------------------------------------------------------
INSERT INTO `country` VALUES
(1,'BR','Brazil'),
(2,'CA','Canada'),
(3,'DE','Germany'),
(4,'IN','India'),
(5,'TR','Turkey'),
(6,'US','United States');

-- -----------------------------------------------------------------
-- States
-- -----------------------------------------------------------------
INSERT INTO `state` VALUES
(1,'Acre',1),
(2,'Alagoas',1),
(3,'Amapá',1),
(4,'Amazonas',1),
(5,'Bahia',1),
(6,'Ceará',1),
(7,'Distrito Federal',1),
(8,'Espírito Santo',1),
(9,'Goiás',1),
(10,'Maranhão',1),
(11,'Mato Grosso do Sul',1),
(12,'Mato Grosso',1),
(13,'Minas Gerais',1),
(14,'Paraná',1),
(15,'Paraíba',1),
(16,'Pará',1),
(17,'Pernambuco',1),
(18,'Piaui',1),
(19,'Rio de Janeiro',1),
(20,'Rio Grande do Norte',1),
(21,'Rio Grande do Sul',1),
(22,'Rondônia',1),
(23,'Roraima',1),
(24,'Santa Catarina',1),
(25,'Sergipe',1),
(26,'São Paulo',1),
(27,'Tocantins',1),
(28,'Alberta',2),
(29,'British Columbia',2),
(30,'Manitoba',2),
(31,'New Brunswick',2),
(32,'Newfoundland and Labrador',2),
(33,'Northwest Territories',2),
(34,'Nova Scotia',2),
(35,'Nunavut',2),
(36,'Ontario',2),
(37,'Prince Edward Island',2),
(38,'Quebec',2),
(39,'Saskatchewan',2),
(40,'Yukon',2),
(41,'Baden-Württemberg',3),
(42,'Bavaria',3),
(43,'Berlin',3),
(44,'Brandenburg',3),
(45,'Bremen',3),
(46,'Hamburg',3),
(47,'Hesse',3),
(48,'Lower Saxony',3),
(49,'Mecklenburg-Vorpommern',3),
(50,'North Rhine-Westphalia',3),
(51,'Rhineland-Palatinate',3),
(52,'Saarland',3),
(53,'Saxony',3),
(54,'Saxony-Anhalt',3),
(55,'Schleswig-Holstein',3),
(56,'Thuringia',3),
(57,'Andhra Pradesh',4),
(58,'Arunachal Pradesh',4),
(59,'Assam',4),
(60,'Bihar',4),
(61,'Chhattisgarh',4),
(62,'Goa',4),
(63,'Gujarat',4),
(64,'Haryana',4),
(65,'Himachal Pradesh',4),
(66,'Jammu & Kashmir',4),
(67,'Jharkhand',4),
(68,'Karnataka',4),
(69,'Kerala',4),
(70,'Madhya Pradesh',4),
(71,'Maharashtra',4),
(72,'Manipur',4),
(73,'Meghalaya',4),
(74,'Mizoram',4),
(75,'Nagaland',4),
(76,'Odisha',4),
(77,'Punjab',4),
(78,'Rajasthan',4),
(79,'Sikkim',4),
(80,'Tamil Nadu',4),
(81,'Telangana',4),
(82,'Tripura',4),
(83,'Uttar Pradesh',4),
(84,'Uttarakhand',4),
(85,'West Bengal',4),
(86,'Andaman and Nicobar Islands',4),
(87,'Chandigarh',4),
(88,'Dadra and Nagar Haveli',4),
(89,'Daman & Diu',4),
(90,'Lakshadweep',4),
(91,'Puducherry',4),
(92,'The Government of NCT of Delhi',4),
(93,'Alabama',6),
(94,'Alaska',6),
(95,'Arizona',6),
(96,'Arkansas',6),
(97,'California',6),
(98,'Colorado',6),
(99,'Connecticut',6),
(100,'Delaware',6),
(101,'District Of Columbia',6),
(102,'Florida',6),
(103,'Georgia',6),
(104,'Hawaii',6),
(105,'Idaho',6),
(106,'Illinois',6),
(107,'Indiana',6),
(108,'Iowa',6),
(109,'Kansas',6),
(110,'Kentucky',6),
(111,'Louisiana',6),
(112,'Maine',6),
(113,'Maryland',6),
(114,'Massachusetts',6),
(115,'Michigan',6),
(116,'Minnesota',6),
(117,'Mississippi',6),
(118,'Missouri',6),
(119,'Montana',6),
(120,'Nebraska',6),
(121,'Nevada',6),
(122,'New Hampshire',6),
(123,'New Jersey',6),
(124,'New Mexico',6),
(125,'New York',6),
(126,'North Carolina',6),
(127,'North Dakota',6),
(128,'Ohio',6),
(129,'Oklahoma',6),
(130,'Oregon',6),
(131,'Pennsylvania',6),
(132,'Rhode Island',6),
(133,'South Carolina',6),
(134,'South Dakota',6),
(135,'Tennessee',6),
(136,'Texas',6),
(137,'Utah',6),
(138,'Vermont',6),
(139,'Virginia',6),
(140,'Washington',6),
(141,'West Virginia',6),
(142,'Wisconsin',6),
(143,'Wyoming',6),
(144,'Adıyaman',5),
(145,'Afyonkarahisar',5),
(146,'Ağrı',5),
(147,'Aksaray',5),
(148,'Amasya',5),
(149,'Ankara',5),
(150,'Antalya',5),
(151,'Ardahan',5),
(152,'Artvin',5),
(153,'Aydın',5),
(154,'Balıkesir',5),
(155,'Bartın',5),
(156,'Batman',5),
(157,'Bayburt',5),
(158,'Bilecik',5),
(159,'Bingöl',5),
(160,'Bitlis',5),
(161,'Bolu',5),
(162,'Burdur',5),
(163,'Bursa',5),
(164,'Çanakkale',5),
(165,'Çankırı',5),
(166,'Çorum',5),
(167,'Denizli',5),
(168,'Diyarbakır',5),
(169,'Düzce',5),
(170,'Edirne',5),
(171,'Elazığ',5),
(172,'Erzincan',5),
(173,'Erzurum',5),
(174,'Eskişehir',5),
(175,'Gaziantep',5),
(176,'Giresun',5),
(177,'Gümüşhane',5),
(178,'Hakkâri',5),
(179,'Hatay',5),
(180,'Iğdır',5),
(181,'Isparta',5),
(182,'İstanbul',5),
(183,'İzmir',5),
(184,'Kahramanmaraş',5),
(185,'Karabük',5),
(186,'Karaman',5),
(187,'Kars',5),
(188,'Kastamonu',5),
(189,'Kayseri',5),
(190,'Kırıkkale',5),
(191,'Kırklareli',5),
(192,'Kırşehir',5),
(193,'Kilis',5),
(194,'Kocaeli',5),
(195,'Konya',5),
(196,'Kütahya',5),
(197,'Malatya',5),
(198,'Manisa',5),
(199,'Mardin',5),
(200,'Mersin',5),
(201,'Muğla',5),
(202,'Muş',5),
(203,'Nevşehir',5),
(204,'Niğde',5),
(205,'Ordu',5),
(206,'Osmaniye',5),
(207,'Rize',5),
(208,'Sakarya',5),
(209,'Samsun',5),
(210,'Siirt',5),
(211,'Sinop',5),
(212,'Sivas',5),
(213,'Şanlıurfa',5),
(214,'Şırnak',5),
(215,'Tekirdağ',5),
(216,'Tokat',5),
(217,'Trabzon',5),
(218,'Tunceli',5),
(219,'Uşak',5),
(220,'Van',5),
(221,'Yalova',5),
(222,'Yozgat',5),
(223,'Zonguldak',5);

-- -----------------------------------------------------------------
-- Product Categories
-- -----------------------------------------------------------------
INSERT INTO `product_category` (`category_name`) VALUES ('AI & Automation');
INSERT INTO `product_category` (`category_name`) VALUES ('Developer Survival Gear');
INSERT INTO `product_category` (`category_name`) VALUES ('Cybersecurity & Spy Tech');
INSERT INTO `product_category` (`category_name`) VALUES ('Future Tech & Lifestyle');

-- -----------------------------------------------------------------
-- Products (100 total — 25 per category)
-- -----------------------------------------------------------------

-- AI & Automation (category_id = 1)
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1000', 'AI Code Reviewer Pro', 'An AI code reviewer that analyzes pull requests, suggests improvements, and learns your coding patterns for increasingly accurate feedback with every sprint.', 'images/products/ai-automation/ai-automation-1000.png', 1, 250, 149.00, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1001', 'Auto-Deploy Button', 'One tap to ship. This physical button connects to your CI/CD pipeline and triggers deployments with a single press. Includes rollback guard and status LEDs.', 'images/products/ai-automation/ai-automation-1001.png', 1, 180, 196.92, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1002', 'Bug Prediction Engine', 'Stop chasing bugs — predict them. Scans your codebase for high-risk patterns and flags likely defect zones before they ever reach production.', 'images/products/ai-automation/ai-automation-1002.png', 1, 95, 244.83, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1003', 'Smart Log Analyzer', 'Tired of reading logs line by line? This AI-driven analyzer surfaces anomalies, correlates events across services, and generates plain-language summaries.', 'images/products/ai-automation/ai-automation-1003.png', 1, 60, 292.75, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1004', 'AI Standup Generator', 'Auto-generates standup updates from your Git commits, Jira tickets, and Slack threads. Never scramble for what to say in the morning meeting again.', 'images/products/ai-automation/ai-automation-1004.png', 1, 40, 340.67, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1005', 'Requirements-to-Code Converter', 'Paste in your product requirements and watch scaffolding appear. Generates boilerplate code, data models, and API stubs from natural-language specs.', 'images/products/ai-automation/ai-automation-1005.png', 1, 250, 388.58, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1006', 'Voice-Controlled Dev Assistant', 'Code hands-free. Run terminal commands, navigate files, and trigger autocomplete using just your voice — no keyboard required.', 'images/products/ai-automation/ai-automation-1006.png', 1, 180, 436.50, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1007', 'Predictive Incident Manager', 'Know about outages before your users do. Monitors system health and predicts incidents using historical patterns and real-time signals.', 'images/products/ai-automation/ai-automation-1007.png', 1, 95, 484.42, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1008', 'Self-Healing Infrastructure Module', 'Your infrastructure, but smarter. Detects configuration drift, auto-patches anomalies, and restores service health without human intervention.', 'images/products/ai-automation/ai-automation-1008.png', 1, 60, 532.33, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1009', 'AI Test Case Generator', 'Never write a boring test again. Reads your code and generates comprehensive test suites with edge cases, boundary conditions, and mocking strategies.', 'images/products/ai-automation/ai-automation-1009.png', 1, 40, 580.25, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1010', 'Codebase Summarizer Engine', 'Onboard new developers in minutes. Scans your entire repo and generates architecture overviews, dependency maps, and module-level summaries on demand.', 'images/products/ai-automation/ai-automation-1010.png', 1, 250, 628.17, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1011', 'Natural Language Query Engine for DBs', 'Ask your database questions in plain English. Translates natural-language queries into optimized SQL and returns formatted, shareable results instantly.', 'images/products/ai-automation/ai-automation-1011.png', 1, 180, 676.08, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1012', 'Smart Refactoring Tool', 'Refactor with confidence. Identifies code smells, suggests improvements, and applies safe, consistent changes across your entire codebase in seconds.', 'images/products/ai-automation/ai-automation-1012.png', 1, 95, 724.00, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1013', 'AI Pair Programmer Console', 'Like pair programming, but your partner never needs a coffee break. Offers real-time code suggestions, architecture advice, and inline documentation.', 'images/products/ai-automation/ai-automation-1013.png', 1, 60, 771.92, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1014', 'Auto-Scaling Intelligence Unit', 'Scale on instinct, not guesswork. Uses predictive analytics to auto-scale services ahead of traffic spikes and scale down during off-peak hours.', 'images/products/ai-automation/ai-automation-1014.png', 1, 40, 819.83, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1015', 'AI Security Vulnerability Scanner', 'Scans your codebase for security vulnerabilities using AI-driven pattern recognition. Identifies OWASP Top 10 risks and suggests targeted, actionable fixes.', 'images/products/ai-automation/ai-automation-1015.png', 1, 250, 867.75, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1016', 'Intelligent API Gateway', 'Route, throttle, and secure your APIs with AI-driven traffic analysis. Adapts rate limits dynamically and detects abuse patterns in real time.', 'images/products/ai-automation/ai-automation-1016.png', 1, 180, 915.67, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1017', 'ML Pipeline Builder Kit', 'Build, train, and deploy machine learning pipelines without writing boilerplate. Includes pre-built connectors for popular data sources and model registries.', 'images/products/ai-automation/ai-automation-1017.png', 1, 95, 963.58, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1018', 'Feature Flag Optimization Engine', 'Go beyond simple toggles. Uses real-time analytics to recommend optimal rollout strategies and audience segments for maximum impact and minimum risk.', 'images/products/ai-automation/ai-automation-1018.png', 1, 60, 1011.50, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1019', 'AI Product Manager Assistant', 'Summarize user feedback, prioritize backlogs, and draft roadmaps with AI. Keep your product strategy data-driven and your stakeholders aligned.', 'images/products/ai-automation/ai-automation-1019.png', 1, 40, 1059.42, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1020', 'ChatOps Automation Hub', 'Automate DevOps workflows from Slack or Teams. Deploy, monitor, rollback, and triage — all through simple chat commands powered by AI.', 'images/products/ai-automation/ai-automation-1020.png', 1, 250, 1107.33, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1021', 'Continuous Optimization Engine', 'Monitors app performance around the clock and suggests optimizations for speed, cost, and resource utilization across your cloud environments.', 'images/products/ai-automation/ai-automation-1021.png', 1, 180, 1155.25, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1022', 'Autonomous Data Cleanup Bot', 'Detects and resolves data quality issues like duplicates, missing values, and format inconsistencies — automatically and across all your databases.', 'images/products/ai-automation/ai-automation-1022.png', 1, 95, 1203.17, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1023', 'AI Cost Optimization Advisor', 'Analyze your cloud spending and get actionable recommendations to cut costs without sacrificing performance. Supports AWS, Azure, and GCP.', 'images/products/ai-automation/ai-automation-1023.png', 1, 60, 1251.08, 1, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('AIA-1024', 'Multi-Agent Workflow Orchestrator', 'Coordinate multiple AI agents to handle complex, multi-step workflows. Define goals in natural language and let the orchestrator build the plan.', 'images/products/ai-automation/ai-automation-1024.png', 1, 40, 1299.00, 1, NOW());

-- Developer Survival Gear (category_id = 2)
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1000', 'Infinite Coffee Mug', 'The mug that never runs dry — at least in spirit. Features a heat-reactive fill gauge and a motivational quote that changes with every refill.', 'images/products/developer-gear/developer-gear-1000.png', 1, 250, 19.00, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1001', 'Works on My Machine Sticker Pack', '24 premium vinyl stickers featuring classic developer excuses. Waterproof, laptop-safe, and guaranteed to deflect blame in any code review.', 'images/products/developer-gear/developer-gear-1001.png', 1, 180, 28.58, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1002', 'Rubber Duck Debugging Assistant', 'The original debugging tool, upgraded. This premium rubber duck comes with a tiny lab coat and a monitor stand. Surprisingly effective.', 'images/products/developer-gear/developer-gear-1002.png', 1, 95, 38.17, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1003', 'Legacy Code Survival Kit', 'Everything you need to survive a legacy codebase: stress ball, aspirin, sticky notes, a flashlight, and a copy of the last known documentation.', 'images/products/developer-gear/developer-gear-1003.png', 1, 60, 47.75, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1004', 'Kubernetes Stress Ball', 'Squeeze away your orchestration anxiety. Shaped like the K8s helm wheel, this stress ball is perfect for cluster meltdowns and YAML nightmares.', 'images/products/developer-gear/developer-gear-1004.png', 1, 40, 57.33, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1005', 'PagerDuty Panic Button', 'A big red button for your desk that plays an alarm sound and flashes when pressed. Perfect for dramatizing production incidents or startling interns.', 'images/products/developer-gear/developer-gear-1005.png', 1, 250, 66.92, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1006', 'Dark Mode Everywhere Glasses', 'Tinted lenses that make the whole world look like dark mode. Reduces eye strain and makes fluorescent office lighting slightly more bearable.', 'images/products/developer-gear/developer-gear-1006.png', 1, 180, 76.50, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1007', 'Standup Blocker Headphones', 'Noise-canceling headphones with a built-in LED that reads In Flow State. Automatically mutes Slack notifications the moment you put them on.', 'images/products/developer-gear/developer-gear-1007.png', 1, 95, 86.08, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1008', 'Keyboard of Infinite Productivity', 'A mechanical keyboard with custom developer keycaps and a dedicated Deploy key. Cherry MX switches deliver that satisfying click with every commit.', 'images/products/developer-gear/developer-gear-1008.png', 1, 60, 95.67, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1009', 'Stack Overflow Offline Archive Drive', 'A portable SSD preloaded with the most popular Stack Overflow threads. For when your internet goes down but your deadlines do not.', 'images/products/developer-gear/developer-gear-1009.png', 1, 40, 105.25, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1010', 'Git Merge Conflict Resolver Wand', 'Wave this wand at your screen and feel the merge conflicts melt away. Does not actually resolve conflicts — emotional support only.', 'images/products/developer-gear/developer-gear-1010.png', 1, 250, 114.83, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1011', 'Instant Environment Replicator', 'A compact USB device that snapshots your local dev environment and recreates it anywhere. No more environment mismatch excuses.', 'images/products/developer-gear/developer-gear-1011.png', 1, 180, 124.42, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1012', 'Syntax Error Translator', 'A desk gadget that parses your compiler errors and translates them into plain English. Pairs with any IDE and supports 20+ languages.', 'images/products/developer-gear/developer-gear-1012.png', 1, 95, 134.00, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1013', 'Code Freeze Blanket', 'A cozy weighted blanket printed with frozen code snippets. Perfect for wrapping up during production freezes or post-deployment naps.', 'images/products/developer-gear/developer-gear-1013.png', 1, 60, 143.58, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1014', 'Weekend Protection Shield', 'A decorative desk shield that reads My weekend is not your sprint buffer. Place it prominently for maximum boundary-setting effectiveness.', 'images/products/developer-gear/developer-gear-1014.png', 1, 40, 153.17, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1015', 'Technical Debt Vacuum', 'A miniature desk vacuum shaped like a server rack. Cleans crumbs off your keyboard while reminding you of the tech debt you keep ignoring.', 'images/products/developer-gear/developer-gear-1015.png', 1, 250, 162.75, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1016', 'Infinite Undo Device', 'A retro gadget with a single button labeled Undo. Press it for reassuring clicks. Does not undo actual code, but you will feel better.', 'images/products/developer-gear/developer-gear-1016.png', 1, 180, 172.33, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1017', 'Burnout Prevention Smartwatch', 'Tracks your screen time, posture, and hydration. Sends gentle nudges to take breaks and stretch before burnout sneaks up on you.', 'images/products/developer-gear/developer-gear-1017.png', 1, 95, 181.92, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1018', 'Jira Ticket Auto-Completer', 'A smart notepad that drafts Jira ticket descriptions, acceptance criteria, and story points from rough notes. Say goodbye to backlog grooming.', 'images/products/developer-gear/developer-gear-1018.png', 1, 60, 191.50, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1019', 'Deployment Confidence Booster', 'A handheld device that plays a triumphant fanfare every time you deploy successfully. Includes a sad trombone mode for failed builds.', 'images/products/developer-gear/developer-gear-1019.png', 1, 40, 201.08, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1020', 'Debugging Time Machine', 'A novelty desk clock that counts backward, reminding you how much time debugging has claimed. Motivational or depressing — your call.', 'images/products/developer-gear/developer-gear-1020.png', 1, 250, 210.67, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1021', 'API Mock Generator Cube', 'Shake this desk cube and it generates realistic mock API responses. Great for front-end devs tired of waiting on backend teams.', 'images/products/developer-gear/developer-gear-1021.png', 1, 180, 220.25, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1022', 'CI Pipeline Speed Booster Chip', 'A decorative chip you place near your build server for good luck. Does it make CI faster? Probably not. But hope is a powerful thing.', 'images/products/developer-gear/developer-gear-1022.png', 1, 95, 229.83, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1023', 'Focus Mode Desk Light', 'An ambient LED desk light that syncs with your IDE. Turns green during productive flow states and red when your build is broken.', 'images/products/developer-gear/developer-gear-1023.png', 1, 60, 239.42, 2, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('DSG-1024', 'Slack Auto-Responder Beacon', 'A desk beacon that auto-replies to Slack with In deep work mode when activated. Pairs with your calendar to block focus time automatically.', 'images/products/developer-gear/developer-gear-1024.png', 1, 40, 249.00, 2, NOW());

-- Cybersecurity & Spy Tech (category_id = 3)
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1000', 'Self-Destructing USB Drive', 'Store sensitive files and set a timer. When it expires — or the wrong password is entered — the drive wipes itself clean, securely and permanently.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1000.png', 1, 250, 89.00, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1001', 'Encrypted Messaging Watch', 'A wrist-worn device that sends and receives end-to-end encrypted messages over a secure peer-to-peer channel. No cloud, no logs, no trace.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1001.png', 1, 180, 293.58, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1002', 'Voice Masking Tie Clip', 'Clip it on and alter your voice in real time during calls. Choose from multiple voice profiles — perfect for red team exercises and anonymous ops.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1002.png', 1, 95, 498.17, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1003', 'Portable Faraday Backpack', 'Block all wireless signals to your devices instantly. This RF-shielding backpack keeps phones, laptops, and trackers invisible to the network.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1003.png', 1, 60, 702.75, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1004', 'Biometric Spoofing Detector', 'Detects fake fingerprints, synthetic faces, and deepfake audio in real time. Protect your authentication systems from sophisticated spoofing attacks.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1004.png', 1, 40, 907.33, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1005', 'Zero-Trace VPN Router', 'A portable router that channels all connected traffic through an encrypted multi-hop VPN. Leaves no DNS or traffic logs. Travel-ready and field-tested.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1005.png', 1, 250, 1111.92, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1006', 'Ethical Password Audit Rig', 'A pre-configured hardware rig for testing password strength across your organization. Runs dictionary and brute-force audits ethically and with consent.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1006.png', 1, 180, 1316.50, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1007', 'Multi-Factor Authentication Keychain', 'A hardware security key supporting FIDO2, TOTP, and biometric verification. Compact, durable, and compatible with all major identity providers.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1007.png', 1, 95, 1521.08, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1008', 'Invisible Ink Smart Pen', 'Write notes invisible to the naked eye but readable with the included UV scanner app. Ideal for secure brainstorming and classified doodling.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1008.png', 1, 60, 1725.67, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1009', 'Network Intrusion Detection Appliance', 'A plug-and-play appliance that monitors your network for suspicious activity, unauthorized access, and data exfiltration attempts around the clock.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1009.png', 1, 40, 1930.25, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1010', 'Air-Gapped Laptop Kit', 'A fully configured laptop with no wireless hardware — no Wi-Fi, no Bluetooth, no cellular. The ultimate air-gapped workstation for sensitive work.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1010.png', 1, 250, 2134.83, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1011', 'Signal Interception Scanner', 'Scans for rogue cell towers, wireless skimmers, and unauthorized signal emitters in your vicinity. Alerts you to surveillance threats in real time.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1011.png', 1, 180, 2339.42, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1012', 'Deepfake Detection Glasses', 'AR-enabled glasses that analyze video feeds and flag deepfake content in real time. Highlights manipulation artifacts invisible to the naked eye.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1012.png', 1, 95, 2544.00, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1013', 'Secure File Drop Device', 'An encrypted dead-drop device for anonymous file sharing over short-range radio. No internet required. Files auto-delete after retrieval.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1013.png', 1, 60, 2748.58, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1014', 'Hardware Encryption Module', 'A tamper-resistant module that handles all encryption and key management in hardware. Meets FIPS 140-2 standards for enterprise-grade protection.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1014.png', 1, 40, 2953.17, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1015', 'GPS Spoofing Simulator', 'Test your fleet or app against GPS spoofing attacks. Generates fake GPS signals in a controlled RF environment for authorized security research.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1015.png', 1, 250, 3157.75, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1016', 'Anti-Phishing Filter AI', 'Analyzes emails, URLs, and messages in real time to detect phishing attempts. Learns your communication patterns to reduce false positives over time.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1016.png', 1, 180, 3362.33, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1017', 'Digital Identity Cloaking Service', 'Masks your digital footprint across the web. Rotates browser fingerprints, spoofs metadata, and blocks tracking pixels — all from a single device.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1017.png', 1, 95, 3566.92, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1018', 'Red Team Toolkit Case', 'A rugged carrying case pre-loaded with ethical hacking tools, network adapters, lock picks, and reference cards. Everything a pentester needs.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1018.png', 1, 60, 3771.50, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1019', 'Secure Boot Verification Chip', 'Verifies boot sequence integrity on every startup. Detects rootkits, bootkits, and firmware tampering before the OS even loads.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1019.png', 1, 40, 3976.08, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1020', 'Tamper-Proof Server Rack', 'A reinforced server rack with biometric locks, vibration sensors, and intrusion alerts. Stops physical attacks before they reach your hardware.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1020.png', 1, 250, 4180.67, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1021', 'AI Threat Intelligence Dashboard', 'Aggregates threat feeds from across the web and uses AI to prioritize risks specific to your organization. Visualize attack surfaces at a glance.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1021.png', 1, 180, 4385.25, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1022', 'Quantum-Resistant Encryption Module', 'Future-proof your data with post-quantum cryptographic algorithms designed to protect sensitive information against emerging quantum computing threats.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1022.png', 1, 95, 4589.83, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1023', 'Secure Chat Room Device', 'A self-contained encrypted device that hosts private chat rooms over a local mesh network. No internet, no metadata, no compromise.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1023.png', 1, 60, 4794.42, 3, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('CST-1024', 'Data Exfiltration Prevention System', 'Monitors all outbound data channels and uses behavioral AI to detect and block unauthorized transfers before sensitive information leaves your network.', 'images/products/cybersecurity-spy-tech/cybersecurity-spy-tech-1024.png', 1, 40, 4999.00, 3, NOW());

-- Future Tech & Lifestyle (category_id = 4)
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1000', 'Dream Recorder', 'Capture your dreams as audio journals the moment you wake. Uses EEG sensors and AI narration to turn subconscious adventures into shareable stories.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1000.png', 1, 250, 199.00, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1001', 'Memory Backup Drive', 'Back up your favorite memories as immersive 3D recordings. Relive birthdays, vacations, and milestones in full sensory detail whenever you want.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1001.png', 1, 180, 607.33, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1002', 'Focus Amplifier Headband', 'An EEG-powered headband that monitors brainwaves and plays adaptive sound frequencies to deepen concentration. Perfect for study sessions and deep work.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1002.png', 1, 95, 1015.67, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1003', 'Smart Mirror Honest Edition', 'A connected mirror that shows weather, calendar events, and health stats — plus brutally honest outfit feedback powered by a style-trained AI model.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1003.png', 1, 60, 1424.00, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1004', 'AI Life Planner', 'An AI assistant that syncs your goals, habits, and calendar to generate a personalized daily plan. Adapts in real time as priorities shift.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1004.png', 1, 40, 1832.33, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1005', 'Sleep Optimization Pod', 'A temperature-controlled pod with ambient sound, light therapy, and biometric tracking. Optimizes your sleep cycles for maximum rest in minimum time.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1005.png', 1, 250, 2240.67, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1006', 'Decision Fatigue Eliminator', 'Feed it your options — from dinner to career moves — and get AI-powered recommendations based on your values, goals, and past decisions.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1006.png', 1, 180, 2649.00, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1007', 'Time Perception Accelerator', 'A wearable that subtly adjusts ambient light and sound to make tedious tasks feel shorter. Warning: may cause meetings to seem almost bearable.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1007.png', 1, 95, 3057.33, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1008', 'Personal Drone Assistant', 'A compact, voice-controlled drone that follows you, carries small items, takes photos, and provides aerial navigation. Your personal flying sidekick.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1008.png', 1, 60, 3465.67, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1009', 'Smart Nutrition Scanner', 'Point it at any food and instantly get a breakdown of calories, macros, allergens, and ingredient quality. Syncs with your diet plan for live tracking.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1009.png', 1, 40, 3874.00, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1010', 'Emotion Regulation Wristband', 'Uses biometric sensors to detect stress, anxiety, and mood shifts. Delivers gentle haptic feedback and guided breathing exercises to help you recalibrate.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1010.png', 1, 250, 4282.33, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1011', 'Brain-Computer Interface Lite', 'Control simple apps, smart home devices, and media playback using only your thoughts. A consumer-friendly brain-computer interface for everyday use.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1011.png', 1, 180, 4690.67, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1012', 'AR Productivity Glasses', 'See your task list, calendar, and notifications overlaid on the real world. Voice-controlled and gesture-aware, with a sleek design for all-day wear.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1012.png', 1, 95, 5099.00, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1013', 'Home Automation Core AI', 'The brain of your smart home. Learns your routines and automates lighting, temperature, security, and appliances — adapting to your lifestyle over time.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1013.png', 1, 60, 5507.33, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1014', 'Personal Finance Optimization AI', 'Tracks spending, forecasts expenses, and suggests savings strategies tailored to your goals. Automates budgeting so you can focus on what matters.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1014.png', 1, 40, 5915.67, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1015', 'Biofeedback Training System', 'A full biofeedback rig with heart rate, skin conductance, and breathing sensors. Train your stress response through guided exercises and visualizations.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1015.png', 1, 250, 6324.00, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1016', 'Instant Language Translator Earbuds', 'Hear any language translated into yours in real time. Supports 50+ languages with sub-second latency — perfect for travel, business, and new friendships.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1016.png', 1, 180, 6732.33, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1017', 'Cognitive Load Balancer', 'Monitors your mental workload through eye tracking and EEG, then redistributes tasks across your devices to prevent cognitive overload.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1017.png', 1, 95, 7140.67, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1018', 'Digital Clone Assistant', 'Train a digital twin that handles your emails, schedules meetings, and responds just like you would. Free up hours every day for the work that matters.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1018.png', 1, 60, 7549.00, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1019', 'Virtual Workspace Projector', 'Project a full holographic workspace anywhere — desk, wall, or mid-air. Multiple virtual monitors, gesture controls, and spatial audio included.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1019.png', 1, 40, 7957.33, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1020', 'Health Risk Prediction Engine', 'Analyzes your biometrics, genetics, and lifestyle data to predict health risks years in advance. Get actionable recommendations to stay ahead of problems.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1020.png', 1, 250, 8365.67, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1021', 'Neural Learning Booster', 'Enhances memory retention and learning speed through targeted neurostimulation. Master new skills, languages, or certifications in record time.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1021.png', 1, 180, 8774.00, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1022', 'Personalized News Filter AI', 'Cuts through the noise and delivers only the news that matters to you. Filters out misinformation, bias, and clickbait using advanced language analysis.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1022.png', 1, 95, 9182.33, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1023', 'Life Analytics Dashboard Hub', 'Aggregates data from all your devices and apps into one dashboard. Tracks sleep, fitness, finances, productivity, and mood — all in one clear view.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1023.png', 1, 60, 9590.67, 4, NOW());
INSERT INTO `product` (`sku`, `name`, `description`, `image_url`, `active`, `units_in_stock`, `unit_price`, `category_id`, `date_created`) VALUES ('FTL-1024', 'Habit Formation Engine', 'Uses behavioral science and AI nudges to help you build lasting habits. Tracks streaks, adjusts difficulty, and celebrates milestones along the way.', 'images/products/future-tech-lifestyle/future-tech-lifestyle-1024.png', 1, 40, 9999.00, 4, NOW());
