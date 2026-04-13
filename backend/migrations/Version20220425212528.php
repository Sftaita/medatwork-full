<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20220425212528 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE years DROP FOREIGN KEY FK_A308E877783E3463');
        $this->addSql('DROP INDEX IDX_A308E877783E3463 ON years');
        $this->addSql('ALTER TABLE years DROP manager_id');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE years ADD manager_id INT NOT NULL');
        $this->addSql('ALTER TABLE years ADD CONSTRAINT FK_A308E877783E3463 FOREIGN KEY (manager_id) REFERENCES manager (id)');
        $this->addSql('CREATE INDEX IDX_A308E877783E3463 ON years (manager_id)');
    }
}
