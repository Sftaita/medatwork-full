<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20221016105923 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE staff_planner_resources (id INT AUTO_INCREMENT NOT NULL, worker_hrid VARCHAR(255) DEFAULT NULL, section_hrid VARCHAR(255) NOT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE years_resident ADD staff_planner_resources_id INT DEFAULT NULL, ADD scientific_leaves INT DEFAULT NULL, ADD legal_leaves INT DEFAULT NULL');
        $this->addSql('ALTER TABLE years_resident ADD CONSTRAINT FK_5B53228980C2D22F FOREIGN KEY (staff_planner_resources_id) REFERENCES staff_planner_resources (id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_5B53228980C2D22F ON years_resident (staff_planner_resources_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE years_resident DROP FOREIGN KEY FK_5B53228980C2D22F');
        $this->addSql('DROP TABLE staff_planner_resources');
        $this->addSql('DROP INDEX UNIQ_5B53228980C2D22F ON years_resident');
        $this->addSql('ALTER TABLE years_resident DROP staff_planner_resources_id, DROP scientific_leaves, DROP legal_leaves');
    }
}
