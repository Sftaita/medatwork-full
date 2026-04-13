<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20220426065006 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE manager_years DROP FOREIGN KEY FK_8AD7284D40C1FEA7');
        $this->addSql('DROP INDEX IDX_8AD7284D40C1FEA7 ON manager_years');
        $this->addSql('ALTER TABLE manager_years DROP year_id');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE manager_years ADD year_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE manager_years ADD CONSTRAINT FK_8AD7284D40C1FEA7 FOREIGN KEY (year_id) REFERENCES years (id)');
        $this->addSql('CREATE INDEX IDX_8AD7284D40C1FEA7 ON manager_years (year_id)');
    }
}
