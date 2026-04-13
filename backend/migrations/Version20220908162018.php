<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20220908162018 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE allocations DROP FOREIGN KEY FK_C0E942FED5061C2E');
        $this->addSql('DROP TABLE year_schedule');
        $this->addSql('DROP INDEX IDX_C0E942FED5061C2E ON allocations');
        $this->addSql('ALTER TABLE allocations CHANGE year_schedule_id year_shedule_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE allocations ADD CONSTRAINT FK_C0E942FED033DC11 FOREIGN KEY (year_shedule_id) REFERENCES year_shedule (id)');
        $this->addSql('CREATE INDEX IDX_C0E942FED033DC11 ON allocations (year_shedule_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE year_schedule (id INT AUTO_INCREMENT NOT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('ALTER TABLE allocations DROP FOREIGN KEY FK_C0E942FED033DC11');
        $this->addSql('DROP INDEX IDX_C0E942FED033DC11 ON allocations');
        $this->addSql('ALTER TABLE allocations CHANGE year_shedule_id year_schedule_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE allocations ADD CONSTRAINT FK_C0E942FED5061C2E FOREIGN KEY (year_schedule_id) REFERENCES year_schedule (id)');
        $this->addSql('CREATE INDEX IDX_C0E942FED5061C2E ON allocations (year_schedule_id)');
    }
}
