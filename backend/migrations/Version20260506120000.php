<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Remplace staff_planner_month_status (suivi mensuel)
 * par staff_planner_export_status (suivi par ResidentValidation).
 *
 * Sécurité prod :
 * - L'ancienne table est RENOMMÉE en staff_planner_month_status_legacy (données conservées).
 * - La nouvelle table est créée proprement.
 * - Le down() inverse l'opération.
 */
final class Version20260506120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'StaffPlanner : suivi mensuel → suivi par ResidentValidation (treatedByType polymorphic)';
    }

    public function up(Schema $schema): void
    {
        // ── 1. Conserver l'ancienne table (prod-safe) ─────────────────────────
        $this->addSql('RENAME TABLE staff_planner_month_status TO staff_planner_month_status_legacy');

        // ── 2. Créer la nouvelle table ────────────────────────────────────────
        $this->addSql(<<<'SQL'
            CREATE TABLE staff_planner_export_status (
                id                      INT AUTO_INCREMENT NOT NULL,
                resident_validation_id  INT NOT NULL,
                treated                 TINYINT(1) NOT NULL DEFAULT 0,
                treated_at              DATETIME DEFAULT NULL,
                treated_by_type         VARCHAR(30) DEFAULT NULL COMMENT 'manager|hospital_admin|app_admin',
                treated_by_id           INT DEFAULT NULL,
                updated_at              DATETIME NOT NULL,
                UNIQUE INDEX uq_sp_export_rv (resident_validation_id),
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);

        $this->addSql(<<<'SQL'
            ALTER TABLE staff_planner_export_status
                ADD CONSTRAINT FK_SPES_RV
                    FOREIGN KEY (resident_validation_id)
                    REFERENCES resident_validation (id)
                    ON DELETE CASCADE
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE staff_planner_export_status DROP FOREIGN KEY FK_SPES_RV');
        $this->addSql('DROP TABLE staff_planner_export_status');
        $this->addSql('RENAME TABLE staff_planner_month_status_legacy TO staff_planner_month_status');
    }
}
