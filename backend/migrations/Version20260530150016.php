<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Sprint 3 — Incremental: supprime le champ legacy years.master (int).
 *
 * Requires Version20260530071600 and Version20260530123247 to have run first:
 *   - owner already dropped (071600)
 *   - training_supervisor_id already added and backfilled (123247)
 */
final class Version20260530150016 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Sprint 3 — Supprime years.master (champ int legacy, remplacé par training_supervisor_id).';
    }

    public function up(Schema $schema): void
    {
        // Supprimer le champ entier legacy master
        // training_supervisor_id (FK) est déjà en place depuis Version20260530123247
        $this->addSql('ALTER TABLE years DROP master');
    }

    public function down(Schema $schema): void
    {
        // Restaurer le champ legacy master et re-remplir depuis training_supervisor_id
        $this->addSql('ALTER TABLE years ADD master INT DEFAULT NULL');
        $this->addSql('UPDATE years SET master = training_supervisor_id WHERE training_supervisor_id IS NOT NULL');
    }
}
