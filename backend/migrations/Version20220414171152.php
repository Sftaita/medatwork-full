<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20220414171152 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE years DROP FOREIGN KEY FK_A308E877EC8B7ADE');
        $this->addSql('DROP INDEX IDX_A308E877EC8B7ADE ON years');
        $this->addSql('ALTER TABLE years ADD period VARCHAR(255) NOT NULL, DROP period_id');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE years ADD period_id INT DEFAULT NULL, DROP period');
        $this->addSql('ALTER TABLE years ADD CONSTRAINT FK_A308E877EC8B7ADE FOREIGN KEY (period_id) REFERENCES periods (id)');
        $this->addSql('CREATE INDEX IDX_A308E877EC8B7ADE ON years (period_id)');
    }
}
