<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20220909211456 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE year_shedule_resident (year_shedule_id INT NOT NULL, resident_id INT NOT NULL, INDEX IDX_922656B3D033DC11 (year_shedule_id), INDEX IDX_922656B38012C5B0 (resident_id), PRIMARY KEY(year_shedule_id, resident_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE year_shedule_resident ADD CONSTRAINT FK_922656B3D033DC11 FOREIGN KEY (year_shedule_id) REFERENCES year_shedule (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE year_shedule_resident ADD CONSTRAINT FK_922656B38012C5B0 FOREIGN KEY (resident_id) REFERENCES resident (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE year_shedule DROP residents');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE year_shedule_resident');
        $this->addSql('ALTER TABLE year_shedule ADD residents LONGTEXT CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci` COMMENT \'(DC2Type:array)\'');
    }
}
