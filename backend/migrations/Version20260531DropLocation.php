<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Supprime la colonne years.location.
 *
 * La source de vérité est désormais years.hospital_id → hospital.name.
 * Pré-requis : Version20260531HospitalIdNotNull doit avoir été appliquée.
 */
final class Version20260531DropLocation extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Supprime years.location — source de vérité : hospital.name via hospital_id.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE years DROP COLUMN location');
    }

    public function down(Schema $schema): void
    {
        // Restaurer la colonne (vide — les données sont perdues définitivement)
        $this->addSql("ALTER TABLE years ADD COLUMN location VARCHAR(255) NOT NULL DEFAULT ''");
    }
}
