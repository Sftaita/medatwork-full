<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20220425193304 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE manager_years (id INT AUTO_INCREMENT NOT NULL, manager_id INT DEFAULT NULL, year_id INT DEFAULT NULL, owner TINYINT(1) NOT NULL, data_access TINYINT(1) NOT NULL, data_validation TINYINT(1) NOT NULL, INDEX IDX_8AD7284D783E3463 (manager_id), INDEX IDX_8AD7284D40C1FEA7 (year_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE manager_years ADD CONSTRAINT FK_8AD7284D783E3463 FOREIGN KEY (manager_id) REFERENCES manager (id)');
        $this->addSql('ALTER TABLE manager_years ADD CONSTRAINT FK_8AD7284D40C1FEA7 FOREIGN KEY (year_id) REFERENCES years (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE manager_years');
    }
}
