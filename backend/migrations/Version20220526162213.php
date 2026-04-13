<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20220526162213 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE period_validation ADD validated_by_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE period_validation ADD CONSTRAINT FK_7EA536EDC69DE5E5 FOREIGN KEY (validated_by_id) REFERENCES manager (id)');
        $this->addSql('CREATE INDEX IDX_7EA536EDC69DE5E5 ON period_validation (validated_by_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE period_validation DROP FOREIGN KEY FK_7EA536EDC69DE5E5');
        $this->addSql('DROP INDEX IDX_7EA536EDC69DE5E5 ON period_validation');
        $this->addSql('ALTER TABLE period_validation DROP validated_by_id INT DEFAULT NULL');
    }
}
