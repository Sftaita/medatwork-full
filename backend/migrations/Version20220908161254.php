<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20220908161254 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE allocations (id INT AUTO_INCREMENT NOT NULL, year_schedule_id INT DEFAULT NULL, text VARCHAR(255) NOT NULL, INDEX IDX_C0E942FED5061C2E (year_schedule_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE year_schedule (id INT AUTO_INCREMENT NOT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE year_shedule (id INT AUTO_INCREMENT NOT NULL, title VARCHAR(255) DEFAULT NULL, notes LONGTEXT DEFAULT NULL, start_date DATETIME NOT NULL, end_date DATETIME NOT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE allocations ADD CONSTRAINT FK_C0E942FED5061C2E FOREIGN KEY (year_schedule_id) REFERENCES year_schedule (id)');
        $this->addSql('ALTER TABLE years_resident ADD year_shedule_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE years_resident ADD CONSTRAINT FK_5B532289D033DC11 FOREIGN KEY (year_shedule_id) REFERENCES year_shedule (id)');
        $this->addSql('CREATE INDEX IDX_5B532289D033DC11 ON years_resident (year_shedule_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE allocations DROP FOREIGN KEY FK_C0E942FED5061C2E');
        $this->addSql('ALTER TABLE years_resident DROP FOREIGN KEY FK_5B532289D033DC11');
        $this->addSql('DROP TABLE allocations');
        $this->addSql('DROP TABLE year_schedule');
        $this->addSql('DROP TABLE year_shedule');
        $this->addSql('DROP INDEX IDX_5B532289D033DC11 ON years_resident');
        $this->addSql('ALTER TABLE years_resident DROP year_shedule_id');
    }
}
