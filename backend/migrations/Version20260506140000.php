<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Refactorise staff_planner_export_status :
 * clé unique passe de residentValidation → (yearsResident, month, calendarYear).
 *
 * Sécurité prod :
 * - L'ancienne table est renommée en _rv_legacy (données conservées).
 * - La nouvelle table est créée proprement.
 */
final class Version20260506140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'StaffPlannerExportStatus : clé unique residentValidation → (yearsResident, month, calendarYear)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('RENAME TABLE staff_planner_export_status TO staff_planner_export_status_rv_legacy');

        $this->addSql(<<<'SQL'
            CREATE TABLE staff_planner_export_status (
                id                  INT AUTO_INCREMENT NOT NULL,
                years_resident_id   INT NOT NULL,
                month               SMALLINT NOT NULL,
                calendar_year       SMALLINT NOT NULL,
                treated             TINYINT(1) NOT NULL DEFAULT 0,
                treated_at          DATETIME DEFAULT NULL,
                treated_by_type     VARCHAR(30) DEFAULT NULL COMMENT 'manager|hospital_admin|app_admin',
                treated_by_id       INT DEFAULT NULL,
                updated_at          DATETIME NOT NULL,
                UNIQUE INDEX uq_sp_export (years_resident_id, month, calendar_year),
                INDEX IDX_SP_YR (years_resident_id),
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);

        $this->addSql(<<<'SQL'
            ALTER TABLE staff_planner_export_status
                ADD CONSTRAINT FK_SPES_YR
                    FOREIGN KEY (years_resident_id)
                    REFERENCES years_resident (id)
                    ON DELETE CASCADE
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE staff_planner_export_status DROP FOREIGN KEY FK_SPES_YR');
        $this->addSql('DROP TABLE staff_planner_export_status');
        $this->addSql('RENAME TABLE staff_planner_export_status_rv_legacy TO staff_planner_export_status');
    }
}
