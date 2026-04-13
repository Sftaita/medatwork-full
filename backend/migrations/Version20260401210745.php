<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260401210745 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // Tables hospital, app_admin, hospital_admin, hospital_request, manager_hospital
        // are created fresh by Version20260403000000 — skip their ALTER statements here.
        $this->addSql('DROP TABLE IF EXISTS refresh_tokens');
        $this->addSql('ALTER TABLE absence CHANGE resident_id resident_id INT DEFAULT NULL, CHANGE year_id year_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE garde CHANGE resident_id resident_id INT DEFAULT NULL, CHANGE year_id year_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE manager CHANGE roles roles JSON NOT NULL, CHANGE sexe sexe VARCHAR(255) NOT NULL, CHANGE status status VARCHAR(255) DEFAULT \'active\' NOT NULL');
        $this->addSql('ALTER TABLE manager_week_template CHANGE manager_id manager_id INT DEFAULT NULL, CHANGE week_template_id week_template_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE notification_manager CHANGE manager_id manager_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE notification_resident CHANGE resident_id resident_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE period_validation CHANGE year_id year_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE resident CHANGE roles roles JSON NOT NULL');
        $this->addSql('ALTER TABLE resident_validation CHANGE period_validation_id period_validation_id INT DEFAULT NULL, CHANGE resident_id resident_id INT DEFAULT NULL, CHANGE validation_history validation_history JSON DEFAULT NULL');
        $this->addSql('ALTER TABLE resident_weekly_schedule CHANGE resident_id resident_id INT DEFAULT NULL, CHANGE years_week_intervals_id years_week_intervals_id INT DEFAULT NULL, CHANGE years_week_templates_id years_week_templates_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE resident_year_calendar CHANGE years_resident_id years_resident_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE week_task CHANGE week_template_id week_template_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE years CHANGE week_intervals week_intervals JSON DEFAULT NULL');
        $this->addSql('ALTER TABLE years_resident CHANGE year_id year_id INT DEFAULT NULL, CHANGE resident_id resident_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE years_week_intervals CHANGE year_id year_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE years_week_templates CHANGE year_id year_id INT DEFAULT NULL, CHANGE week_template_id week_template_id INT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE refresh_tokens (id INT AUTO_INCREMENT NOT NULL, refresh_token VARCHAR(128) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, username VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, valid DATETIME NOT NULL, UNIQUE INDEX UNIQ_9BACE7E1C74F2195 (refresh_token), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('ALTER TABLE absence CHANGE resident_id resident_id INT NOT NULL, CHANGE year_id year_id INT NOT NULL');
        $this->addSql('ALTER TABLE app_admin RENAME INDEX uniq_5edd80bbe7927c74 TO UNIQ_APP_ADMIN_EMAIL');
        $this->addSql('ALTER TABLE garde CHANGE resident_id resident_id INT NOT NULL, CHANGE year_id year_id INT NOT NULL');
        $this->addSql('ALTER TABLE hospital RENAME INDEX uniq_4282c85b5e237e06 TO UNIQ_HOSPITAL_NAME');
        $this->addSql('ALTER TABLE hospital_admin CHANGE status status VARCHAR(20) DEFAULT \'invited\' NOT NULL');
        $this->addSql('ALTER TABLE hospital_admin RENAME INDEX uniq_89549ddae7927c74 TO UNIQ_HOSPITAL_ADMIN_EMAIL');
        $this->addSql('ALTER TABLE hospital_admin RENAME INDEX idx_89549dda63dbb69 TO IDX_HOSPITAL_ADMIN_HOSPITAL');
        $this->addSql('ALTER TABLE hospital_request DROP FOREIGN KEY FK_C92AEE644DA1E751');
        $this->addSql('DROP INDEX IDX_C92AEE644DA1E751 ON hospital_request');
        $this->addSql('ALTER TABLE hospital_request CHANGE status status VARCHAR(20) DEFAULT \'pending\' NOT NULL, CHANGE requested_by_id manager_id INT NOT NULL');
        $this->addSql('ALTER TABLE hospital_request ADD CONSTRAINT FK_HOSP_REQ_MANAGER FOREIGN KEY (manager_id) REFERENCES manager (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('CREATE INDEX IDX_HOSPITAL_REQUEST_MANAGER ON hospital_request (manager_id)');
        $this->addSql('ALTER TABLE hospital_request RENAME INDEX idx_c92aee6463dbb69 TO IDX_HOSPITAL_REQUEST_HOSPITAL');
        $this->addSql('ALTER TABLE manager CHANGE roles roles LONGTEXT NOT NULL COLLATE `utf8mb4_bin`, CHANGE sexe sexe VARCHAR(100) NOT NULL, CHANGE status status VARCHAR(20) DEFAULT \'active\' NOT NULL');
        $this->addSql('ALTER TABLE manager_hospital RENAME INDEX idx_b6e8b03f783e3463 TO IDX_MH_MANAGER');
        $this->addSql('ALTER TABLE manager_hospital RENAME INDEX idx_b6e8b03f63dbb69 TO IDX_MH_HOSPITAL');
        $this->addSql('ALTER TABLE manager_week_template CHANGE manager_id manager_id INT NOT NULL, CHANGE week_template_id week_template_id INT NOT NULL');
        $this->addSql('ALTER TABLE notification_manager CHANGE manager_id manager_id INT NOT NULL');
        $this->addSql('ALTER TABLE notification_resident CHANGE resident_id resident_id INT NOT NULL');
        $this->addSql('ALTER TABLE period_validation CHANGE year_id year_id INT NOT NULL');
        $this->addSql('ALTER TABLE resident CHANGE roles roles LONGTEXT NOT NULL COLLATE `utf8mb4_bin`');
        $this->addSql('ALTER TABLE resident_validation CHANGE period_validation_id period_validation_id INT NOT NULL, CHANGE resident_id resident_id INT NOT NULL, CHANGE validation_history validation_history LONGTEXT DEFAULT NULL COLLATE `utf8mb4_bin`');
        $this->addSql('ALTER TABLE resident_weekly_schedule CHANGE resident_id resident_id INT NOT NULL, CHANGE years_week_intervals_id years_week_intervals_id INT NOT NULL, CHANGE years_week_templates_id years_week_templates_id INT NOT NULL');
        $this->addSql('ALTER TABLE resident_year_calendar CHANGE years_resident_id years_resident_id INT NOT NULL');
        $this->addSql('ALTER TABLE week_task CHANGE week_template_id week_template_id INT NOT NULL');
        $this->addSql('ALTER TABLE years DROP FOREIGN KEY FK_A308E87763DBB69');
        $this->addSql('ALTER TABLE years CHANGE week_intervals week_intervals LONGTEXT DEFAULT NULL COLLATE `utf8mb4_bin`');
        $this->addSql('ALTER TABLE years ADD CONSTRAINT FK_YEARS_HOSPITAL FOREIGN KEY (hospital_id) REFERENCES hospital (id) ON UPDATE NO ACTION ON DELETE SET NULL');
        $this->addSql('ALTER TABLE years RENAME INDEX idx_a308e87763dbb69 TO IDX_YEARS_HOSPITAL');
        $this->addSql('ALTER TABLE years_resident CHANGE year_id year_id INT NOT NULL, CHANGE resident_id resident_id INT NOT NULL');
        $this->addSql('ALTER TABLE years_week_intervals CHANGE year_id year_id INT NOT NULL');
        $this->addSql('ALTER TABLE years_week_templates CHANGE year_id year_id INT NOT NULL, CHANGE week_template_id week_template_id INT NOT NULL');
    }
}
