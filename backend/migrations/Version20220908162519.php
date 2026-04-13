<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20220908162519 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE year_shedule ADD year_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE year_shedule ADD CONSTRAINT FK_F5D8E62840C1FEA7 FOREIGN KEY (year_id) REFERENCES years (id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_F5D8E62840C1FEA7 ON year_shedule (year_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE year_shedule DROP FOREIGN KEY FK_F5D8E62840C1FEA7');
        $this->addSql('DROP INDEX UNIQ_F5D8E62840C1FEA7 ON year_shedule');
        $this->addSql('ALTER TABLE year_shedule DROP year_id');
    }
}
