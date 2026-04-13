<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20230528091816 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE resident_validation (id INT AUTO_INCREMENT NOT NULL, period_validation_id INT NOT NULL, resident_id INT NOT NULL, validated_by_id INT DEFAULT NULL, validated TINYINT(1) NOT NULL, validation_history JSON DEFAULT NULL, INDEX IDX_B5266EAE8DB40AF (period_validation_id), INDEX IDX_B5266EA8012C5B0 (resident_id), INDEX IDX_B5266EAC69DE5E5 (validated_by_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE resident_validation ADD CONSTRAINT FK_B5266EAE8DB40AF FOREIGN KEY (period_validation_id) REFERENCES period_validation (id)');
        $this->addSql('ALTER TABLE resident_validation ADD CONSTRAINT FK_B5266EA8012C5B0 FOREIGN KEY (resident_id) REFERENCES resident (id)');
        $this->addSql('ALTER TABLE resident_validation ADD CONSTRAINT FK_B5266EAC69DE5E5 FOREIGN KEY (validated_by_id) REFERENCES manager (id)');
        $this->addSql('ALTER TABLE manager CHANGE roles roles JSON NOT NULL');
        $this->addSql('ALTER TABLE resident CHANGE roles roles JSON NOT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE resident_validation');
        $this->addSql('ALTER TABLE manager CHANGE roles roles TEXT CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('ALTER TABLE resident CHANGE roles roles TEXT CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`');
    }
}
