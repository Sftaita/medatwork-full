<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20220426065256 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE manager_years ADD years_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE manager_years ADD CONSTRAINT FK_8AD7284DAF834A90 FOREIGN KEY (years_id) REFERENCES years (id)');
        $this->addSql('CREATE INDEX IDX_8AD7284DAF834A90 ON manager_years (years_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE manager_years DROP FOREIGN KEY FK_8AD7284DAF834A90');
        $this->addSql('DROP INDEX IDX_8AD7284DAF834A90 ON manager_years');
        $this->addSql('ALTER TABLE manager_years DROP years_id');
    }
}
