-- =============================================================================
-- Roofze Digital Hub Billing & Proposal System
-- Database Schema & Master Data Restoration Script
-- Target Database: roofzeco_billing
-- Generated for Server: 173.214.163.122
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Table: billing_location
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `billing_location`;
CREATE TABLE `billing_location` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `location_code` VARCHAR(50) NOT NULL,
  `location_name` VARCHAR(150) NOT NULL,
  `legal_name` VARCHAR(150) NULL,
  `gst_applicable` TINYINT(1) NOT NULL DEFAULT 1,
  `gstin` VARCHAR(20) NULL,
  `pan` VARCHAR(20) NULL,
  `state_name` VARCHAR(100) NULL,
  `state_code` VARCHAR(10) NULL,
  `address_line1` VARCHAR(255) NULL,
  `address_line2` VARCHAR(255) NULL,
  `city` VARCHAR(100) NULL,
  `pincode` VARCHAR(20) NULL,
  `country` VARCHAR(100) DEFAULT 'India',
  `phone` VARCHAR(50) NULL,
  `email` VARCHAR(100) NULL,
  `website` VARCHAR(150) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `default_gst_percentage` DECIMAL(5,2) NULL,
  `bank_name` VARCHAR(100) NULL,
  `account_name` VARCHAR(150) NULL,
  `account_number` VARCHAR(30) NULL,
  `ifsc_code` VARCHAR(15) NULL,
  `qr_code_url` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Table: clients
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `clients`;
CREATE TABLE `clients` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_code` VARCHAR(50) NOT NULL,
  `business_name` VARCHAR(200) NOT NULL,
  `contact_person` VARCHAR(200) NULL,
  `phone` VARCHAR(50) NULL,
  `email` VARCHAR(100) NULL,
  `billing_address` TEXT NULL,
  `city` VARCHAR(100) NULL,
  `state_id` INT NULL,
  `state_name` VARCHAR(100) NULL,
  `state_code` VARCHAR(10) NULL,
  `pincode` VARCHAR(20) NULL,
  `country` VARCHAR(100) DEFAULT 'India',
  `pan` VARCHAR(20) NULL,
  `gstin` VARCHAR(20) NULL,
  `client_type` VARCHAR(50) DEFAULT 'Business',
  `website` VARCHAR(150) NULL,
  `notes` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_clients_code` (`client_code`),
  KEY `idx_clients_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Table: financial_year
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `financial_year`;
CREATE TABLE `financial_year` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `year_code` VARCHAR(10) NOT NULL,
  `label` VARCHAR(50) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Table: tax_master
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `tax_master`;
CREATE TABLE `tax_master` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tax_name` VARCHAR(100) NOT NULL,
  `rate` DECIMAL(5,2) NOT NULL,
  `description` VARCHAR(255) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Table: invoice_sequences
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `invoice_sequences`;
CREATE TABLE `invoice_sequences` (
  `billing_location_id` INT UNSIGNED NOT NULL,
  `financial_year` CHAR(4) NOT NULL COMMENT 'e.g. 2627 for FY 2026-27',
  `last_sequence` INT UNSIGNED NOT NULL COMMENT 'last invoice sequence number handed out',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`billing_location_id`, `financial_year`),
  CONSTRAINT `fk_invseq_location` FOREIGN KEY (`billing_location_id`)
    REFERENCES `billing_location` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Table: invoices
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `invoices`;
CREATE TABLE `invoices` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `invoice_number` VARCHAR(30) NOT NULL COMMENT 'RFZ/<FY>/<0000>',
  `billing_location_id` INT UNSIGNED NOT NULL,
  `financial_year` CHAR(4) NOT NULL,
  `sequence_number` INT UNSIGNED NULL COMMENT 'assigned sequentially when paid; NULL while unpaid',
  `invoice_date` DATE NOT NULL,
  `invoice_type` ENUM('DIRECT','MILESTONE') NOT NULL DEFAULT 'DIRECT',
  `client_id` INT UNSIGNED NULL COMMENT 'link to Client Master; NULL if typed manually',
  `client_name` VARCHAR(200) NOT NULL COMMENT 'client snapshot',
  `client_contact` VARCHAR(200) NOT NULL,
  `client_address` TEXT NULL,
  `client_state` VARCHAR(60) NULL,
  `client_pan` VARCHAR(10) NULL,
  `client_gst_number` VARCHAR(15) NULL,
  `gross_amount` DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT 'sum of total_price x qty',
  `subtotal_amount` DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT 'taxable amount billed',
  `gst_percentage` DECIMAL(5,2) NULL COMMENT 'blended rate, NULL for non-GST locations',
  `gst_amount` DECIMAL(14,2) NULL,
  `total_amount` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `payment_status` ENUM('PENDING','PAID') NOT NULL DEFAULT 'PENDING',
  `paid_at` DATETIME NULL,
  `payment_mode` VARCHAR(50) NULL,
  `payment_reference` VARCHAR(100) NULL COMMENT 'reference / transaction / cheque no. entered when marked PAID',
  `payment_date` DATE NULL COMMENT 'date the payment was received',
  `amount_paid` DECIMAL(14,2) NULL COMMENT 'total amount received',
  `payment_screenshot` VARCHAR(500) NULL COMMENT 'screenshot or receipt proof url',
  `terms` TEXT NULL,
  `show_bank_details` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_invoice_number` (`billing_location_id`, `invoice_number`),
  UNIQUE KEY `uq_invoice_sequence` (`billing_location_id`, `financial_year`, `sequence_number`),
  KEY `idx_invoices_client` (`client_id`),
  KEY `idx_invoices_date` (`invoice_date`),
  KEY `idx_invoices_status` (`payment_status`),
  CONSTRAINT `fk_invoices_location` FOREIGN KEY (`billing_location_id`)
    REFERENCES `billing_location` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_invoices_client` FOREIGN KEY (`client_id`)
    REFERENCES `clients` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Table: invoice_items
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `invoice_items`;
CREATE TABLE `invoice_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `invoice_id` BIGINT UNSIGNED NOT NULL,
  `line_no` SMALLINT UNSIGNED NOT NULL,
  `service_description` VARCHAR(255) NOT NULL,
  `qty` DECIMAL(10,2) NOT NULL DEFAULT 1,
  `total_price` DECIMAL(14,2) NOT NULL COMMENT 'unit price before % split',
  `price_percentage` DECIMAL(5,2) NOT NULL DEFAULT 100 COMMENT '% billed on this invoice',
  `tax_rate` DECIMAL(5,2) NOT NULL DEFAULT 0,
  `taxable_amount` DECIMAL(14,2) NOT NULL,
  `tax_amount` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `line_total` DECIMAL(14,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_item_line` (`invoice_id`, `line_no`),
  CONSTRAINT `fk_items_invoice` FOREIGN KEY (`invoice_id`)
    REFERENCES `invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Table: invoice_item_milestones
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `invoice_item_milestones`;
CREATE TABLE `invoice_item_milestones` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `invoice_item_id` BIGINT UNSIGNED NOT NULL,
  `milestone_no` SMALLINT UNSIGNED NOT NULL,
  `label` VARCHAR(30) NOT NULL,
  `percent` DECIMAL(5,2) NOT NULL,
  `amount` DECIMAL(14,2) NOT NULL COMMENT 'total_price x qty x percent / 100',
  `is_billed` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = milestone billed on this invoice',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_item_milestone` (`invoice_item_id`, `milestone_no`),
  CONSTRAINT `fk_milestones_item` FOREIGN KEY (`invoice_item_id`)
    REFERENCES `invoice_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Table: proposal_sequences
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `proposal_sequences`;
CREATE TABLE `proposal_sequences` (
  `financial_year` CHAR(4) NOT NULL COMMENT 'e.g. 2627 for FY 2026-27',
  `last_sequence` INT UNSIGNED NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`financial_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Table: terms_master
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `terms_master`;
CREATE TABLE `terms_master` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(150) NOT NULL,
  `content` MEDIUMTEXT NOT NULL COMMENT 'HTML',
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. Table: proposals
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `proposals`;
CREATE TABLE `proposals` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `proposal_number` VARCHAR(30) NOT NULL COMMENT 'RFZ/<FY>/<0000>',
  `financial_year` CHAR(4) NOT NULL,
  `sequence_number` INT UNSIGNED NOT NULL,
  `client_id` INT UNSIGNED NULL,
  `client_name` VARCHAR(200) NULL COMMENT 'snapshot of client name',
  `proposal_title` VARCHAR(255) NOT NULL DEFAULT '',
  `cover_tagline` VARCHAR(255) NULL COMMENT 'tagline on cover page',
  `proposal_date` DATE NOT NULL,
  `valid_till` DATE NULL,
  `status` ENUM('DRAFT','FINALIZED') NOT NULL DEFAULT 'DRAFT',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_proposal_number` (`proposal_number`),
  KEY `idx_proposals_client` (`client_id`),
  KEY `idx_proposals_date` (`proposal_date`),
  KEY `idx_proposals_status` (`status`),
  CONSTRAINT `fk_proposals_client` FOREIGN KEY (`client_id`)
    REFERENCES `clients` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. Table: proposal_sections
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `proposal_sections`;
CREATE TABLE `proposal_sections` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `proposal_id` BIGINT UNSIGNED NOT NULL,
  `section_type` ENUM('CONTENT','TABLE','TERMS') NOT NULL,
  `title` VARCHAR(255) NOT NULL DEFAULT '',
  `sort_order` INT UNSIGNED NOT NULL,
  `is_mandatory` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sections_order` (`proposal_id`, `sort_order`),
  CONSTRAINT `fk_sections_proposal` FOREIGN KEY (`proposal_id`)
    REFERENCES `proposals` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 13. Table: proposal_section_contents
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `proposal_section_contents`;
CREATE TABLE `proposal_section_contents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `section_id` BIGINT UNSIGNED NOT NULL,
  `content_html` MEDIUMTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_content_section` (`section_id`),
  CONSTRAINT `fk_contents_section` FOREIGN KEY (`section_id`)
    REFERENCES `proposal_sections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 14. Table: proposal_section_tables
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `proposal_section_tables`;
CREATE TABLE `proposal_section_tables` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `section_id` BIGINT UNSIGNED NOT NULL,
  `column_count` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `row_count` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_table_section` (`section_id`),
  CONSTRAINT `fk_tables_section` FOREIGN KEY (`section_id`)
    REFERENCES `proposal_sections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 15. Table: proposal_table_columns
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `proposal_table_columns`;
CREATE TABLE `proposal_table_columns` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `section_id` BIGINT UNSIGNED NOT NULL,
  `column_index` SMALLINT UNSIGNED NOT NULL,
  `column_name` VARCHAR(255) NOT NULL DEFAULT '',
  `sort_order` SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_columns_section` (`section_id`, `sort_order`),
  CONSTRAINT `fk_columns_section` FOREIGN KEY (`section_id`)
    REFERENCES `proposal_sections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 16. Table: proposal_table_rows
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `proposal_table_rows`;
CREATE TABLE `proposal_table_rows` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `section_id` BIGINT UNSIGNED NOT NULL,
  `row_index` SMALLINT UNSIGNED NOT NULL,
  `sort_order` SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rows_section` (`section_id`, `sort_order`),
  CONSTRAINT `fk_rows_section` FOREIGN KEY (`section_id`)
    REFERENCES `proposal_sections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 17. Table: proposal_table_cells
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `proposal_table_cells`;
CREATE TABLE `proposal_table_cells` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `section_id` BIGINT UNSIGNED NOT NULL,
  `row_id` BIGINT UNSIGNED NOT NULL,
  `column_id` BIGINT UNSIGNED NOT NULL,
  `cell_value` TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cell` (`row_id`, `column_id`),
  KEY `idx_cells_section` (`section_id`),
  CONSTRAINT `fk_cells_section` FOREIGN KEY (`section_id`)
    REFERENCES `proposal_sections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cells_row` FOREIGN KEY (`row_id`)
    REFERENCES `proposal_table_rows` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cells_column` FOREIGN KEY (`column_id`)
    REFERENCES `proposal_table_columns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 18. Table: proposal_section_terms
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `proposal_section_terms`;
CREATE TABLE `proposal_section_terms` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `section_id` BIGINT UNSIGNED NOT NULL,
  `terms_master_id` BIGINT UNSIGNED NULL,
  `content_snapshot` MEDIUMTEXT NULL COMMENT 'copy of terms at save time',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_terms_section` (`section_id`),
  CONSTRAINT `fk_terms_section` FOREIGN KEY (`section_id`)
    REFERENCES `proposal_sections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_terms_master` FOREIGN KEY (`terms_master_id`)
    REFERENCES `terms_master` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- 1. Billing Locations
INSERT INTO `billing_location` (
  `id`, `location_code`, `location_name`, `legal_name`, `gst_applicable`,
  `gstin`, `pan`, `state_name`, `state_code`, `address_line1`, `address_line2`,
  `city`, `pincode`, `country`, `phone`, `email`, `website`, `is_active`,
  `default_gst_percentage`, `bank_name`, `account_name`, `account_number`, `ifsc_code`
) VALUES
(
  1, 'GST', 'GST', 'ROOFZE DIGITAL HUB LLP', 1,
  '27ABKFR6662C1ZZ', 'ABKFR6662C', 'Maharashtra', '27', 'Borivali', '',
  'Mumbai', '400092', 'India', '+91 88062 55527', 'roofzedigitalhub@gmail.com', 'www.roofze.com', 1,
  18.00, 'Indusind Bank', 'ROOFZE DIGITAL HUB LLP', '258916532869', 'INDB0001889'
),
(
  2, 'NON_GST', 'Without GST', 'ROOFZE DIGITAL HUB LLP', 0,
  NULL, NULL, 'Delhi', '07', '', '',
  'Delhi', '', 'India', '+91 88062 55527', 'roofzedigitalhub@gmail.com', 'www.roofze.com', 1,
  NULL, 'Indusind Bank', 'ROOFZE DIGITAL HUB LLP', '258916532869', 'INDB0001889'
);

-- 2. Financial Years
INSERT INTO `financial_year` (`id`, `year_code`, `label`, `start_date`, `end_date`, `is_active`) VALUES
(1, '2425', 'FY 2024-25', '2024-04-01', '2025-03-31', 0),
(2, '2526', 'FY 2025-26', '2025-04-01', '2026-03-31', 0),
(3, '2627', 'FY 2026-27', '2026-04-01', '2027-03-31', 1),
(4, '2728', 'FY 2027-28', '2027-04-01', '2028-03-31', 0);

-- 3. Tax Master
INSERT INTO `tax_master` (`id`, `tax_name`, `rate`, `description`, `is_active`) VALUES
(1, 'GST 0%', 0.00, 'Exempt / Nil Rated Services', 1),
(2, 'GST 5%', 5.00, '5% Goods & Service Tax', 1),
(3, 'GST 12%', 12.00, '12% Goods & Service Tax', 1),
(4, 'GST 18%', 18.00, 'Standard 18% Service Tax (Default)', 1),
(5, 'GST 28%', 28.00, '28% Goods & Service Tax', 1);

-- 4. Invoice Sequences Initial State
INSERT INTO `invoice_sequences` (`billing_location_id`, `financial_year`, `last_sequence`) VALUES
(1, '2627', 0),
(2, '2627', 1000);

-- 5. Proposal Sequences Initial State
INSERT INTO `proposal_sequences` (`financial_year`, `last_sequence`) VALUES
('2627', 0);

-- 6. Terms & Conditions Master Templates
INSERT INTO `terms_master` (`id`, `title`, `content`, `is_default`, `is_active`) VALUES
(
  1,
  'General Terms',
  '<p><strong>1. Payment Terms :</strong></p><ul><li>50% advance payment before starting the project.</li><li>Remaining 50% payment upon project completion and delivery.</li></ul><p><strong>2. Scope Changes :</strong></p><ul><li>This quotation is based on the scope described in this proposal. Any additional work will be quoted separately.</li></ul><p><strong>3. Cancellation Policy :</strong></p><ul><li>If the client cancels the project after the advance payment and initial work, the advance payment will not be refundable.</li><li>If we cancel the project after receiving the advance payment, the entire payment will be refunded.</li></ul><p><strong>4. Taxes :</strong></p><ul><li>GST and other applicable taxes are charged extra unless mentioned otherwise.</li></ul>',
  0,
  1
),
(
  2,
  'Website Development Terms',
  '<p><strong>1. Payment Terms :</strong></p><ul><li>50% advance payment before starting the project.</li><li>Remaining 50% payment upon project completion and delivery.</li></ul><p><strong>2. Ownership and Maintenance :</strong></p><ul><li>After project completion, if you do not wish to continue maintenance with us, your domain and website will be handed over in working condition.</li><li>Any future maintenance or service will be charged based on an AMC or request basis, as per the client’s requirements.</li></ul><p><strong>3. Cancellation Policy :</strong></p><ul><li>If the client cancels the project after the advance payment and initial work, the advance payment will not be refundable.</li><li>If we cancel the project after receiving the advance payment, the entire payment will be refunded.</li></ul><p><strong>4. Scope Changes :</strong></p><ul><li>This quotation is based on a basic website structure. Any additional advanced functionalities will be quoted separately.</li></ul><p><strong>5. Renewal Costs :</strong></p><ul><li>After the 1st year, maintenance costs ₹7,000/year.</li><li>Includes: Performance Optimization – checking speed, fixing broken links, and compressing images.</li><li>Mobile &amp; Browser Compatibility – ensuring your site looks good across all devices and browsers.</li><li>Bug Fixes &amp; Minor Tweaks – removing outdated scripts, fixing any minor errors, and improving UI.</li><li>Third-Party Integrations – if you use forms, APIs, or embedded tools, they need occasional updates and troubleshooting.</li></ul><p>We are dedicated to delivering a website that exceeds your expectations. Please feel free to share your feedback or additional requirements.</p>',
  0,
  1
),
(
  3,
  'Software Development Terms',
  '<p><strong>1. Payment Terms :</strong></p><ul><li>40% advance payment before starting the project.</li><li>30% on completion of the agreed development milestone.</li><li>30% on final delivery / go-live.</li></ul><p><strong>2. Requirements &amp; Change Requests :</strong></p><ul><li>The project is based on the requirements agreed in this proposal. Any change in requirements will be estimated and billed separately.</li></ul><p><strong>3. Intellectual Property :</strong></p><ul><li>Source code and project ownership are transferred to the client after full payment is received.</li></ul><p><strong>4. Support :</strong></p><ul><li>Free bug-fixing support for 30 days after delivery. Further support is available on an AMC or request basis.</li></ul><p><strong>5. Cancellation Policy :</strong></p><ul><li>Advance payment is non-refundable once development work has started.</li></ul>',
  0,
  1
),
(
  4,
  'Digital Marketing Terms',
  '<p><strong>1. Payment Terms :</strong></p><ul><li>Monthly fees are payable in advance, before the start of each month.</li><li>Advertising spend on Google / Meta and other platforms is paid by the client directly and is not included in our fees.</li></ul><p><strong>2. Results :</strong></p><ul><li>We work to improve reach, leads and conversions; however no specific results or rankings are guaranteed.</li></ul><p><strong>3. Client Responsibilities :</strong></p><ul><li>The client will provide timely approvals, product / service information, access to accounts and creative assets.</li></ul><p><strong>4. Minimum Commitment &amp; Cancellation :</strong></p><ul><li>A minimum commitment of 3 months applies. Either party may stop the service with 15 days’ written notice after that.</li></ul><p><strong>5. Taxes :</strong></p><ul><li>GST at 18% is charged extra on all professional fees.</li></ul>',
  0,
  1
),
(
  5,
  'Social Media Terms',
  '<p><strong>1. Payment Terms :</strong></p><ul><li>Monthly fees are payable in advance, before the start of each month.</li><li>GST at 18% is charged extra.</li></ul><p><strong>2. Content &amp; Approvals :</strong></p><ul><li>Creative posts and reels are shared for approval before publishing. Delay in approvals may affect the posting schedule.</li><li>Deliverables not used within the month do not carry over to the next month.</li></ul><p><strong>3. Client Responsibilities :</strong></p><ul><li>The client will provide brand assets, product information, and timely access to the social media accounts.</li><li>Video shoots, models and props, if required, are arranged by the client unless agreed otherwise.</li></ul><p><strong>4. Advertising Budget :</strong></p><ul><li>Ad spend paid to the platforms is separate and is billed directly to the client’s ad account.</li></ul><p><strong>5. Cancellation Policy :</strong></p><ul><li>Either party may end the service with 15 days’ written notice. Fees already paid for the running month are non-refundable.</li></ul>',
  1,
  1
);

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- Verification Query: Show all tables created
-- =============================================================================
SHOW TABLES;
