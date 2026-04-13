<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20230716145507 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE year_shedule_resident DROP FOREIGN KEY FK_922656B3D033DC11');
        $this->addSql('CREATE TABLE manager_week_template (id INT AUTO_INCREMENT NOT NULL, manager_id INT NOT NULL, week_template_id INT NOT NULL, can_edit TINYINT(1) NOT NULL, can_share TINYINT(1) NOT NULL, INDEX IDX_D8869F47783E3463 (manager_id), INDEX IDX_D8869F477E6B04C1 (week_template_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE resident_weekly_schedule (id INT AUTO_INCREMENT NOT NULL, resident_id INT NOT NULL, years_week_intervals_id INT NOT NULL, years_week_templates_id INT NOT NULL, INDEX IDX_CC9E782E8012C5B0 (resident_id), INDEX IDX_CC9E782E7DE352EA (years_week_intervals_id), INDEX IDX_CC9E782E64DAE4A0 (years_week_templates_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE resident_year_calendar (id INT AUTO_INCREMENT NOT NULL, years_resident_id INT NOT NULL, years_week_templates_id INT DEFAULT NULL, resident_weekly_schedule_id INT DEFAULT NULL, title VARCHAR(255) NOT NULL, description VARCHAR(255) DEFAULT NULL, date_of_start DATETIME NOT NULL, date_of_end DATETIME NOT NULL, type VARCHAR(255) NOT NULL, location VARCHAR(255) DEFAULT NULL, is_all_day TINYINT(1) NOT NULL, color VARCHAR(255) NOT NULL, INDEX IDX_91B3E3C7DD75A30A (years_resident_id), INDEX IDX_91B3E3C764DAE4A0 (years_week_templates_id), INDEX IDX_91B3E3C7A4C3E3AB (resident_weekly_schedule_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE week_task (id INT AUTO_INCREMENT NOT NULL, week_template_id INT NOT NULL, title VARCHAR(255) NOT NULL, description VARCHAR(255) DEFAULT NULL, day_of_week INT NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL, INDEX IDX_9804D4957E6B04C1 (week_template_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE years_week_intervals (id INT AUTO_INCREMENT NOT NULL, year_id INT NOT NULL, date_of_start DATE NOT NULL, date_of_end DATE NOT NULL, week_number INT NOT NULL, month_number INT NOT NULL, year_number INT NOT NULL, deleted TINYINT(1) DEFAULT NULL, INDEX IDX_1FCE9B9D40C1FEA7 (year_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE years_week_templates (id INT AUTO_INCREMENT NOT NULL, year_id INT NOT NULL, week_template_id INT NOT NULL, INDEX IDX_6747F4CF40C1FEA7 (year_id), INDEX IDX_6747F4CF7E6B04C1 (week_template_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE manager_week_template ADD CONSTRAINT FK_D8869F47783E3463 FOREIGN KEY (manager_id) REFERENCES manager (id)');
        $this->addSql('ALTER TABLE manager_week_template ADD CONSTRAINT FK_D8869F477E6B04C1 FOREIGN KEY (week_template_id) REFERENCES week_templates (id)');
        $this->addSql('ALTER TABLE resident_weekly_schedule ADD CONSTRAINT FK_CC9E782E8012C5B0 FOREIGN KEY (resident_id) REFERENCES resident (id)');
        $this->addSql('ALTER TABLE resident_weekly_schedule ADD CONSTRAINT FK_CC9E782E7DE352EA FOREIGN KEY (years_week_intervals_id) REFERENCES years_week_intervals (id)');
        $this->addSql('ALTER TABLE resident_weekly_schedule ADD CONSTRAINT FK_CC9E782E64DAE4A0 FOREIGN KEY (years_week_templates_id) REFERENCES years_week_templates (id)');
        $this->addSql('ALTER TABLE resident_year_calendar ADD CONSTRAINT FK_91B3E3C7DD75A30A FOREIGN KEY (years_resident_id) REFERENCES years_resident (id)');
        $this->addSql('ALTER TABLE resident_year_calendar ADD CONSTRAINT FK_91B3E3C764DAE4A0 FOREIGN KEY (years_week_templates_id) REFERENCES years_week_templates (id)');
        $this->addSql('ALTER TABLE resident_year_calendar ADD CONSTRAINT FK_91B3E3C7A4C3E3AB FOREIGN KEY (resident_weekly_schedule_id) REFERENCES resident_weekly_schedule (id)');
        $this->addSql('ALTER TABLE week_task ADD CONSTRAINT FK_9804D4957E6B04C1 FOREIGN KEY (week_template_id) REFERENCES week_templates (id)');
        $this->addSql('ALTER TABLE years_week_intervals ADD CONSTRAINT FK_1FCE9B9D40C1FEA7 FOREIGN KEY (year_id) REFERENCES years (id)');
        $this->addSql('ALTER TABLE years_week_templates ADD CONSTRAINT FK_6747F4CF40C1FEA7 FOREIGN KEY (year_id) REFERENCES years (id)');
        $this->addSql('ALTER TABLE years_week_templates ADD CONSTRAINT FK_6747F4CF7E6B04C1 FOREIGN KEY (week_template_id) REFERENCES week_templates (id)');
        $this->addSql('DROP TABLE allocations');
        $this->addSql('DROP TABLE task');
        $this->addSql('DROP TABLE year_shedule');
        $this->addSql('DROP TABLE year_shedule_resident');
        $this->addSql('ALTER TABLE manager CHANGE roles roles JSON NOT NULL');
        $this->addSql('ALTER TABLE manager_years ADD can_manage_agenda TINYINT(1) DEFAULT NULL, ADD has_agenda_access TINYINT(1) DEFAULT NULL');
        $this->addSql('ALTER TABLE resident CHANGE roles roles JSON NOT NULL');
        $this->addSql('ALTER TABLE resident_validation CHANGE validation_history validation_history JSON DEFAULT NULL');
        $this->addSql('ALTER TABLE week_templates DROP FOREIGN KEY FK_4FFFB78E783E3463');
        $this->addSql('DROP INDEX IDX_4FFFB78E783E3463 ON week_templates');
        $this->addSql('ALTER TABLE week_templates DROP manager_id');
        $this->addSql('ALTER TABLE years CHANGE week_intervals week_intervals JSON DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE resident_year_calendar DROP FOREIGN KEY FK_91B3E3C7A4C3E3AB');
        $this->addSql('ALTER TABLE resident_weekly_schedule DROP FOREIGN KEY FK_CC9E782E7DE352EA');
        $this->addSql('ALTER TABLE resident_weekly_schedule DROP FOREIGN KEY FK_CC9E782E64DAE4A0');
        $this->addSql('ALTER TABLE resident_year_calendar DROP FOREIGN KEY FK_91B3E3C764DAE4A0');
        $this->addSql('CREATE TABLE allocations (id INT AUTO_INCREMENT NOT NULL, year_id INT NOT NULL, text VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, INDEX IDX_C0E942FE40C1FEA7 (year_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE task (id INT AUTO_INCREMENT NOT NULL, week_template_id INT NOT NULL, title VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, description VARCHAR(255) CHARACTER SET utf8mb4 DEFAULT NULL COLLATE `utf8mb4_unicode_ci`, day_of_week INT NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL, INDEX IDX_527EDB257E6B04C1 (week_template_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE year_shedule (id INT AUTO_INCREMENT NOT NULL, year_id INT DEFAULT NULL, title VARCHAR(255) CHARACTER SET utf8mb4 DEFAULT NULL COLLATE `utf8mb4_unicode_ci`, notes LONGTEXT CHARACTER SET utf8mb4 DEFAULT NULL COLLATE `utf8mb4_unicode_ci`, start_date DATETIME NOT NULL, end_date DATETIME NOT NULL, allocation INT NOT NULL, UNIQUE INDEX UNIQ_F5D8E62840C1FEA7 (year_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE year_shedule_resident (year_shedule_id INT NOT NULL, resident_id INT NOT NULL, INDEX IDX_922656B3D033DC11 (year_shedule_id), INDEX IDX_922656B38012C5B0 (resident_id), PRIMARY KEY(year_shedule_id, resident_id)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('ALTER TABLE allocations ADD CONSTRAINT FK_C0E942FE40C1FEA7 FOREIGN KEY (year_id) REFERENCES years (id)');
        $this->addSql('ALTER TABLE task ADD CONSTRAINT FK_527EDB257E6B04C1 FOREIGN KEY (week_template_id) REFERENCES week_templates (id)');
        $this->addSql('ALTER TABLE year_shedule ADD CONSTRAINT FK_F5D8E62840C1FEA7 FOREIGN KEY (year_id) REFERENCES years (id)');
        $this->addSql('ALTER TABLE year_shedule_resident ADD CONSTRAINT FK_922656B38012C5B0 FOREIGN KEY (resident_id) REFERENCES resident (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE year_shedule_resident ADD CONSTRAINT FK_922656B3D033DC11 FOREIGN KEY (year_shedule_id) REFERENCES year_shedule (id) ON DELETE CASCADE');
        $this->addSql('DROP TABLE manager_week_template');
        $this->addSql('DROP TABLE resident_weekly_schedule');
        $this->addSql('DROP TABLE resident_year_calendar');
        $this->addSql('DROP TABLE week_task');
        $this->addSql('DROP TABLE years_week_intervals');
        $this->addSql('DROP TABLE years_week_templates');
        $this->addSql('ALTER TABLE manager CHANGE roles roles LONGTEXT CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_bin`');
        $this->addSql('ALTER TABLE manager_years DROP can_manage_agenda, DROP has_agenda_access');
        $this->addSql('ALTER TABLE resident CHANGE roles roles LONGTEXT CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_bin`');
        $this->addSql('ALTER TABLE resident_validation CHANGE validation_history validation_history LONGTEXT CHARACTER SET utf8mb4 DEFAULT NULL COLLATE `utf8mb4_bin`');
        $this->addSql('ALTER TABLE week_templates ADD manager_id INT NOT NULL');
        $this->addSql('ALTER TABLE week_templates ADD CONSTRAINT FK_4FFFB78E783E3463 FOREIGN KEY (manager_id) REFERENCES manager (id)');
        $this->addSql('CREATE INDEX IDX_4FFFB78E783E3463 ON week_templates (manager_id)');
        $this->addSql('ALTER TABLE years CHANGE week_intervals week_intervals LONGTEXT CHARACTER SET utf8mb4 DEFAULT NULL COLLATE `utf8mb4_bin`');
    }
}
