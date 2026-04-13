<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20220909195913 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE allocations DROP FOREIGN KEY FK_C0E942FED033DC11');
        $this->addSql('DROP INDEX IDX_C0E942FED033DC11 ON allocations');
        $this->addSql('ALTER TABLE allocations ADD year_id INT NOT NULL, DROP year_shedule_id');
        $this->addSql('ALTER TABLE allocations ADD CONSTRAINT FK_C0E942FE40C1FEA7 FOREIGN KEY (year_id) REFERENCES years (id)');
        $this->addSql('CREATE INDEX IDX_C0E942FE40C1FEA7 ON allocations (year_id)');
        $this->addSql('ALTER TABLE years_resident DROP FOREIGN KEY FK_5B532289D033DC11');
        $this->addSql('DROP INDEX IDX_5B532289D033DC11 ON years_resident');
        $this->addSql('ALTER TABLE years_resident DROP year_shedule_id');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE allocations DROP FOREIGN KEY FK_C0E942FE40C1FEA7');
        $this->addSql('DROP INDEX IDX_C0E942FE40C1FEA7 ON allocations');
        $this->addSql('ALTER TABLE allocations ADD year_shedule_id INT DEFAULT NULL, DROP year_id');
        $this->addSql('ALTER TABLE allocations ADD CONSTRAINT FK_C0E942FED033DC11 FOREIGN KEY (year_shedule_id) REFERENCES year_shedule (id)');
        $this->addSql('CREATE INDEX IDX_C0E942FED033DC11 ON allocations (year_shedule_id)');
        $this->addSql('ALTER TABLE years_resident ADD year_shedule_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE years_resident ADD CONSTRAINT FK_5B532289D033DC11 FOREIGN KEY (year_shedule_id) REFERENCES year_shedule (id)');
        $this->addSql('CREATE INDEX IDX_5B532289D033DC11 ON years_resident (year_shedule_id)');
    }
}
