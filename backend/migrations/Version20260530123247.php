<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Sprint 1 — Incremental: adds years.training_supervisor_id (FK → manager) with backfill from legacy master.
 *
 * Requires Version20260530071600 to have run first (owner already dropped,
 * schema already synced, refresh_tokens already dropped, etc.).
 */
final class Version20260530123247 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Sprint 1 — Ajoute years.training_supervisor_id (FK → manager) + backfill depuis master.';
    }

    public function up(Schema $schema): void
    {
        // Ajouter la colonne FK training_supervisor_id
        $this->addSql('ALTER TABLE years ADD training_supervisor_id INT DEFAULT NULL');

        // Contrainte FK et index
        $this->addSql('ALTER TABLE years ADD CONSTRAINT FK_A308E8776740C3CE FOREIGN KEY (training_supervisor_id) REFERENCES manager (id) ON DELETE SET NULL');
        $this->addSql('CREATE INDEX IDX_A308E8776740C3CE ON years (training_supervisor_id)');

        // Backfill depuis le champ legacy master — ignore les orphelins dont l'ID n'existe plus
        $this->addSql('UPDATE years SET training_supervisor_id = master WHERE master IS NOT NULL AND master IN (SELECT id FROM manager)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE years DROP FOREIGN KEY FK_A308E8776740C3CE');
        $this->addSql('DROP INDEX IDX_A308E8776740C3CE ON years');
        $this->addSql('ALTER TABLE years DROP training_supervisor_id');
    }
}
