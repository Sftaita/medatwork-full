<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * HospitalAdmin improvements (2026-04-13):
 * - years.status  : YearStatus enum (draft|active|closed|archived)
 * - manager.is_deleted + manager.deleted_at : soft-delete support
 * - hospital_admin_audit_log : traçabilité des actions admin
 */
final class Version20260413000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'HospitalAdmin improvements: year status, manager soft-delete, audit log';
    }

    public function up(Schema $schema): void
    {
        // 1. Statut des années
        $this->addSql("ALTER TABLE years ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'draft|active|closed|archived'");

        // 2. Soft-delete manager
        $this->addSql('ALTER TABLE manager ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0');
        $this->addSql('ALTER TABLE manager ADD COLUMN deleted_at DATETIME DEFAULT NULL');

        // 3. Audit log
        $this->addSql('
            CREATE TABLE hospital_admin_audit_log (
                id                  INT AUTO_INCREMENT NOT NULL,
                hospital_admin_id   INT NOT NULL,
                admin_name          VARCHAR(255) NOT NULL,
                hospital_id         INT NOT NULL,
                action              VARCHAR(50) NOT NULL,
                entity_type         VARCHAR(50) NOT NULL,
                entity_id           INT DEFAULT NULL,
                description         VARCHAR(500) NOT NULL,
                changes             JSON DEFAULT NULL,
                created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                INDEX idx_audit_admin_date (hospital_admin_id, created_at),
                INDEX idx_audit_hospital_date (hospital_id, created_at)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE years DROP COLUMN status');
        $this->addSql('ALTER TABLE manager DROP COLUMN is_deleted, DROP COLUMN deleted_at');
        $this->addSql('DROP TABLE IF EXISTS hospital_admin_audit_log');
    }
}
