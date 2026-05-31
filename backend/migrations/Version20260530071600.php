<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260530071600 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Sprint 1 — Supprime manager_years.owner (champ zombie sans usage fonctionnel) + sync schéma.';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE staff_planner_month_status (id INT AUTO_INCREMENT NOT NULL, year_id INT NOT NULL, treated_by_id INT DEFAULT NULL, month SMALLINT NOT NULL, calendar_year SMALLINT NOT NULL, treated TINYINT(1) DEFAULT 0 NOT NULL, treated_at DATETIME DEFAULT NULL, last_generated_at DATETIME DEFAULT NULL, download_count INT DEFAULT 0 NOT NULL, updated_at DATETIME NOT NULL, INDEX IDX_5C0A005240C1FEA7 (year_id), INDEX IDX_5C0A0052794E2304 (treated_by_id), UNIQUE INDEX uq_sp_month (year_id, month, calendar_year), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE staff_planner_month_status ADD CONSTRAINT FK_5C0A005240C1FEA7 FOREIGN KEY (year_id) REFERENCES years (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE staff_planner_month_status ADD CONSTRAINT FK_5C0A0052794E2304 FOREIGN KEY (treated_by_id) REFERENCES manager (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE staff_planner_export_status_rv_legacy DROP FOREIGN KEY FK_SPES_RV');
        $this->addSql('ALTER TABLE staff_planner_month_status_legacy DROP FOREIGN KEY FK_SP_TREATED_BY');
        $this->addSql('ALTER TABLE staff_planner_month_status_legacy DROP FOREIGN KEY FK_SP_YEAR');
        $this->addSql('DROP TABLE refresh_tokens');
        $this->addSql('DROP TABLE staff_planner_export_status_rv_legacy');
        $this->addSql('DROP TABLE staff_planner_month_status_legacy');
        $this->addSql('ALTER TABLE app_admin CHANGE roles roles JSON NOT NULL');
        $this->addSql('ALTER TABLE app_admin RENAME INDEX uniq_app_admin_email TO UNIQ_5EDD80BBE7927C74');
        $this->addSql('ALTER TABLE compliance_alert CHANGE context context JSON NOT NULL');
        $this->addSql('ALTER TABLE hospital RENAME INDEX uniq_hospital_name TO UNIQ_4282C85B5E237E06');
        $this->addSql('ALTER TABLE hospital_admin CHANGE roles roles JSON NOT NULL, CHANGE status status VARCHAR(255) DEFAULT \'invited\' NOT NULL');
        $this->addSql('ALTER TABLE hospital_admin RENAME INDEX uniq_hospital_admin_email TO UNIQ_89549DDAE7927C74');
        $this->addSql('ALTER TABLE hospital_admin RENAME INDEX idx_hospital_admin_hospital TO IDX_89549DDA63DBB69');
        $this->addSql('ALTER TABLE hospital_admin_audit_log CHANGE changes changes JSON DEFAULT NULL');
        $this->addSql('ALTER TABLE hospital_request CHANGE status status VARCHAR(255) DEFAULT \'pending\' NOT NULL');
        $this->addSql('ALTER TABLE hospital_request RENAME INDEX idx_hospital_request_hospital TO IDX_C92AEE6463DBB69');
        $this->addSql('ALTER TABLE manager CHANGE roles roles JSON NOT NULL');
        $this->addSql('ALTER TABLE manager_hospital RENAME INDEX idx_mh_manager TO IDX_B6E8B03F783E3463');
        $this->addSql('ALTER TABLE manager_hospital RENAME INDEX idx_mh_hospital TO IDX_B6E8B03F63DBB69');
        $this->addSql('ALTER TABLE manager_years DROP owner');
        $this->addSql('ALTER TABLE resident CHANGE roles roles JSON NOT NULL');
        $this->addSql('ALTER TABLE resident_validation CHANGE validation_history validation_history JSON DEFAULT NULL');
        $this->addSql('ALTER TABLE staff_planner_audit_event CHANGE context context JSON NOT NULL');
        $this->addSql('ALTER TABLE user_setting CHANGE settings settings JSON NOT NULL');
        $this->addSql('ALTER TABLE years DROP FOREIGN KEY FK_YEARS_HOSPITAL');
        $this->addSql('ALTER TABLE years CHANGE week_intervals week_intervals JSON DEFAULT NULL');
        $this->addSql('ALTER TABLE years ADD CONSTRAINT FK_A308E87763DBB69 FOREIGN KEY (hospital_id) REFERENCES hospital (id)');
        $this->addSql('ALTER TABLE years RENAME INDEX idx_years_hospital TO IDX_A308E87763DBB69');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE refresh_tokens (id INT AUTO_INCREMENT NOT NULL, refresh_token VARCHAR(128) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, username VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, valid DATETIME NOT NULL, UNIQUE INDEX UNIQ_9BACE7E1C74F2195 (refresh_token), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE staff_planner_export_status_rv_legacy (id INT AUTO_INCREMENT NOT NULL, resident_validation_id INT NOT NULL, treated TINYINT(1) DEFAULT 0 NOT NULL, treated_at DATETIME DEFAULT NULL, treated_by_type VARCHAR(30) CHARACTER SET utf8mb4 DEFAULT NULL COLLATE `utf8mb4_unicode_ci` COMMENT \'manager|hospital_admin|app_admin\', treated_by_id INT DEFAULT NULL, updated_at DATETIME NOT NULL, UNIQUE INDEX uq_sp_export_rv (resident_validation_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE staff_planner_month_status_legacy (id INT AUTO_INCREMENT NOT NULL, year_id INT NOT NULL, treated_by_id INT DEFAULT NULL, month SMALLINT NOT NULL, calendar_year SMALLINT NOT NULL, treated TINYINT(1) DEFAULT 0 NOT NULL, treated_at DATETIME DEFAULT NULL, last_generated_at DATETIME DEFAULT NULL, download_count INT DEFAULT 0 NOT NULL, updated_at DATETIME NOT NULL, UNIQUE INDEX uq_sp_month (year_id, month, calendar_year), INDEX IDX_SP_YEAR (year_id), INDEX IDX_SP_TREATED_BY (treated_by_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('ALTER TABLE staff_planner_export_status_rv_legacy ADD CONSTRAINT FK_SPES_RV FOREIGN KEY (resident_validation_id) REFERENCES resident_validation (id) ON UPDATE NO ACTION ON DELETE CASCADE');
        $this->addSql('ALTER TABLE staff_planner_month_status_legacy ADD CONSTRAINT FK_SP_TREATED_BY FOREIGN KEY (treated_by_id) REFERENCES manager (id) ON UPDATE NO ACTION ON DELETE SET NULL');
        $this->addSql('ALTER TABLE staff_planner_month_status_legacy ADD CONSTRAINT FK_SP_YEAR FOREIGN KEY (year_id) REFERENCES years (id) ON UPDATE NO ACTION ON DELETE CASCADE');
        $this->addSql('ALTER TABLE staff_planner_month_status DROP FOREIGN KEY FK_5C0A005240C1FEA7');
        $this->addSql('ALTER TABLE staff_planner_month_status DROP FOREIGN KEY FK_5C0A0052794E2304');
        $this->addSql('DROP TABLE staff_planner_month_status');
        $this->addSql('ALTER TABLE app_admin CHANGE roles roles LONGTEXT NOT NULL COLLATE `utf8mb4_bin`');
        $this->addSql('ALTER TABLE app_admin RENAME INDEX uniq_5edd80bbe7927c74 TO UNIQ_APP_ADMIN_EMAIL');
        $this->addSql('ALTER TABLE compliance_alert CHANGE context context LONGTEXT NOT NULL COLLATE `utf8mb4_bin`');
        $this->addSql('ALTER TABLE hospital RENAME INDEX uniq_4282c85b5e237e06 TO UNIQ_HOSPITAL_NAME');
        $this->addSql('ALTER TABLE hospital_admin CHANGE roles roles LONGTEXT NOT NULL COLLATE `utf8mb4_bin`, CHANGE status status VARCHAR(20) DEFAULT \'invited\' NOT NULL');
        $this->addSql('ALTER TABLE hospital_admin RENAME INDEX uniq_89549ddae7927c74 TO UNIQ_HOSPITAL_ADMIN_EMAIL');
        $this->addSql('ALTER TABLE hospital_admin RENAME INDEX idx_89549dda63dbb69 TO IDX_HOSPITAL_ADMIN_HOSPITAL');
        $this->addSql('ALTER TABLE hospital_admin_audit_log CHANGE changes changes LONGTEXT DEFAULT NULL COLLATE `utf8mb4_bin`');
        $this->addSql('ALTER TABLE hospital_request CHANGE status status VARCHAR(20) DEFAULT \'pending\' NOT NULL');
        $this->addSql('ALTER TABLE hospital_request RENAME INDEX idx_c92aee6463dbb69 TO IDX_HOSPITAL_REQUEST_HOSPITAL');
        $this->addSql('ALTER TABLE manager CHANGE roles roles LONGTEXT NOT NULL COLLATE `utf8mb4_bin`');
        $this->addSql('ALTER TABLE manager_hospital RENAME INDEX idx_b6e8b03f783e3463 TO IDX_MH_MANAGER');
        $this->addSql('ALTER TABLE manager_hospital RENAME INDEX idx_b6e8b03f63dbb69 TO IDX_MH_HOSPITAL');
        $this->addSql('ALTER TABLE manager_years ADD owner TINYINT(1) NOT NULL');
        $this->addSql('ALTER TABLE resident CHANGE roles roles LONGTEXT NOT NULL COLLATE `utf8mb4_bin`');
        $this->addSql('ALTER TABLE resident_validation CHANGE validation_history validation_history LONGTEXT DEFAULT NULL COLLATE `utf8mb4_bin`');
        $this->addSql('ALTER TABLE staff_planner_audit_event CHANGE context context LONGTEXT NOT NULL COLLATE `utf8mb4_bin`');
        $this->addSql('ALTER TABLE user_setting CHANGE settings settings LONGTEXT NOT NULL COLLATE `utf8mb4_bin`');
        $this->addSql('ALTER TABLE years DROP FOREIGN KEY FK_A308E87763DBB69');
        $this->addSql('ALTER TABLE years CHANGE week_intervals week_intervals LONGTEXT DEFAULT NULL COLLATE `utf8mb4_bin`');
        $this->addSql('ALTER TABLE years ADD CONSTRAINT FK_YEARS_HOSPITAL FOREIGN KEY (hospital_id) REFERENCES hospital (id) ON UPDATE NO ACTION ON DELETE SET NULL');
        $this->addSql('ALTER TABLE years RENAME INDEX idx_a308e87763dbb69 TO IDX_YEARS_HOSPITAL');
    }
}
