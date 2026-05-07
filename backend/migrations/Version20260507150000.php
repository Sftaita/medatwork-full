<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Rend resident.date_of_master nullable.
 * Les valeurs existantes '1900-01-01' (placeholder) sont remplacées par NULL.
 */
final class Version20260507150000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Make resident.date_of_master nullable, replace 1900-01-01 placeholder with NULL';
    }

    public function up(Schema $schema): void
    {
        // Nettoyer les valeurs placeholder avant de rendre le champ nullable
        $this->addSql("UPDATE resident SET date_of_master = NULL WHERE date_of_master = '1900-01-01'");
        $this->addSql('ALTER TABLE resident CHANGE date_of_master date_of_master DATE DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql("UPDATE resident SET date_of_master = '1900-01-01' WHERE date_of_master IS NULL");
        $this->addSql('ALTER TABLE resident CHANGE date_of_master date_of_master DATE NOT NULL');
    }
}
