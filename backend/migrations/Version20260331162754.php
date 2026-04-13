<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260331162754 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE compliance_alert (id INT AUTO_INCREMENT NOT NULL, resident_id INT NOT NULL, issue_type VARCHAR(64) NOT NULL, severity VARCHAR(16) NOT NULL, week_start VARCHAR(10) NOT NULL, fingerprint VARCHAR(64) NOT NULL, status VARCHAR(20) NOT NULL, context JSON NOT NULL, detected_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', resolved_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX IDX_6CFF04008012C5B0 (resident_id), INDEX idx_compliance_alert_resident_status (resident_id, status), UNIQUE INDEX uq_compliance_alert_fingerprint (fingerprint), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE compliance_alert ADD CONSTRAINT FK_6CFF04008012C5B0 FOREIGN KEY (resident_id) REFERENCES resident (id) ON DELETE CASCADE');
        $this->addSql('DROP TABLE refresh_tokens');
        $this->addSql('ALTER TABLE absence CHANGE resident_id resident_id INT DEFAULT NULL, CHANGE year_id year_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE garde CHANGE resident_id resident_id INT DEFAULT NULL, CHANGE year_id year_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE manager ADD receive_compliance_emails TINYINT(1) DEFAULT 0 NOT NULL, CHANGE roles roles JSON NOT NULL, CHANGE sexe sexe VARCHAR(255) NOT NULL');
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
        $this->addSql('ALTER TABLE compliance_alert DROP FOREIGN KEY FK_6CFF04008012C5B0');
        $this->addSql('DROP TABLE compliance_alert');
        $this->addSql('ALTER TABLE absence CHANGE resident_id resident_id INT NOT NULL, CHANGE year_id year_id INT NOT NULL');
        $this->addSql('ALTER TABLE garde CHANGE resident_id resident_id INT NOT NULL, CHANGE year_id year_id INT NOT NULL');
        $this->addSql('ALTER TABLE manager DROP receive_compliance_emails, CHANGE roles roles LONGTEXT NOT NULL COLLATE `utf8mb4_bin`, CHANGE sexe sexe VARCHAR(100) NOT NULL');
        $this->addSql('ALTER TABLE manager_week_template CHANGE manager_id manager_id INT NOT NULL, CHANGE week_template_id week_template_id INT NOT NULL');
        $this->addSql('ALTER TABLE notification_manager CHANGE manager_id manager_id INT NOT NULL');
        $this->addSql('ALTER TABLE notification_resident CHANGE resident_id resident_id INT NOT NULL');
        $this->addSql('ALTER TABLE period_validation CHANGE year_id year_id INT NOT NULL');
        $this->addSql('ALTER TABLE resident CHANGE roles roles LONGTEXT NOT NULL COLLATE `utf8mb4_bin`');
        $this->addSql('ALTER TABLE resident_validation CHANGE period_validation_id period_validation_id INT NOT NULL, CHANGE resident_id resident_id INT NOT NULL, CHANGE validation_history validation_history LONGTEXT DEFAULT NULL COLLATE `utf8mb4_bin`');
        $this->addSql('ALTER TABLE resident_weekly_schedule CHANGE resident_id resident_id INT NOT NULL, CHANGE years_week_intervals_id years_week_intervals_id INT NOT NULL, CHANGE years_week_templates_id years_week_templates_id INT NOT NULL');
        $this->addSql('ALTER TABLE resident_year_calendar CHANGE years_resident_id years_resident_id INT NOT NULL');
        $this->addSql('ALTER TABLE week_task CHANGE week_template_id week_template_id INT NOT NULL');
        $this->addSql('ALTER TABLE years CHANGE week_intervals week_intervals LONGTEXT DEFAULT NULL COLLATE `utf8mb4_bin`');
        $this->addSql('ALTER TABLE years_resident CHANGE year_id year_id INT NOT NULL, CHANGE resident_id resident_id INT NOT NULL');
        $this->addSql('ALTER TABLE years_week_intervals CHANGE year_id year_id INT NOT NULL');
        $this->addSql('ALTER TABLE years_week_templates CHANGE year_id year_id INT NOT NULL, CHANGE week_template_id week_template_id INT NOT NULL');
    }
}
