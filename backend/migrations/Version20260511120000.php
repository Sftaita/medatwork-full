<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260511120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase 6 : étendre staff_planner_audit_event — year_id, batch_id, indices acteur';
    }

    public function up(Schema $schema): void
    {
        // Lier un audit event à une année (pour la timeline globale par year)
        $this->addSql('ALTER TABLE staff_planner_audit_event
            ADD year_id  INT DEFAULT NULL,
            ADD batch_id INT DEFAULT NULL
        ');

        $this->addSql('ALTER TABLE staff_planner_audit_event
            ADD CONSTRAINT fk_audit_year  FOREIGN KEY (year_id)  REFERENCES years (id) ON DELETE SET NULL,
            ADD CONSTRAINT fk_audit_batch FOREIGN KEY (batch_id) REFERENCES staff_planner_export_batch (id) ON DELETE SET NULL
        ');

        // Requêtes par acteur (qui a fait quoi ?) et par période (quel mois ?)
        $this->addSql('CREATE INDEX idx_audit_year       ON staff_planner_audit_event (year_id, occurred_at)');
        $this->addSql('CREATE INDEX idx_audit_actor      ON staff_planner_audit_event (actor_type, actor_id, occurred_at)');
        $this->addSql('CREATE INDEX idx_audit_period     ON staff_planner_audit_event (month, calendar_year, occurred_at)');
        $this->addSql('CREATE INDEX idx_audit_batch      ON staff_planner_audit_event (batch_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE staff_planner_audit_event
            DROP FOREIGN KEY fk_audit_year,
            DROP FOREIGN KEY fk_audit_batch
        ');
        $this->addSql('DROP INDEX idx_audit_year    ON staff_planner_audit_event');
        $this->addSql('DROP INDEX idx_audit_actor   ON staff_planner_audit_event');
        $this->addSql('DROP INDEX idx_audit_period  ON staff_planner_audit_event');
        $this->addSql('DROP INDEX idx_audit_batch   ON staff_planner_audit_event');
        $this->addSql('ALTER TABLE staff_planner_audit_event DROP COLUMN year_id, DROP COLUMN batch_id');
    }
}
