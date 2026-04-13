<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20220426190201 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE years_manager_years (years_id INT NOT NULL, manager_years_id INT NOT NULL, INDEX IDX_302CF775AF834A90 (years_id), INDEX IDX_302CF7755BE932F4 (manager_years_id), PRIMARY KEY(years_id, manager_years_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE years_manager_years ADD CONSTRAINT FK_302CF775AF834A90 FOREIGN KEY (years_id) REFERENCES years (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE years_manager_years ADD CONSTRAINT FK_302CF7755BE932F4 FOREIGN KEY (manager_years_id) REFERENCES manager_years (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE years_manager_years');
    }
}
