<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260510180000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase 5 : lock RH sur staff_planner_export_status + table staff_planner_audit_event';
    }

    public function up(Schema $schema): void
    {
        // ── Champs lock sur staff_planner_export_status ─────────────────────────
        $this->addSql('ALTER TABLE staff_planner_export_status
            ADD locked          TINYINT(1)   NOT NULL DEFAULT 0,
            ADD locked_at       DATETIME      DEFAULT NULL,
            ADD locked_by_type  VARCHAR(30)   DEFAULT NULL,
            ADD locked_by_id    INT           DEFAULT NULL,
            ADD lock_reason     VARCHAR(255)  DEFAULT NULL
        ');

        // Index partiel sur locked=1 pour les requêtes "liste des items lockés"
        $this->addSql('CREATE INDEX idx_sp_export_locked ON staff_planner_export_status (locked)');

        // ── Table audit événements lock/unlock ────────────────────────────────
        // Append-only — jamais mis à jour.
        // years_resident_id : SET NULL si le MACCS est supprimé (ne pas perdre l'historique).
        $this->addSql('CREATE TABLE staff_planner_audit_event (
            id               BIGINT       NOT NULL AUTO_INCREMENT,
            years_resident_id INT          DEFAULT NULL,
            event_type       VARCHAR(60)  NOT NULL,
            month            SMALLINT     DEFAULT NULL,
            calendar_year    SMALLINT     DEFAULT NULL,
            actor_type       VARCHAR(30)  NOT NULL,
            actor_id         INT          DEFAULT NULL,
            occurred_at      DATETIME     NOT NULL,
            context          JSON         NOT NULL,
            PRIMARY KEY (id),
            INDEX idx_audit_maccs_date (years_resident_id, occurred_at),
            INDEX idx_audit_type_date  (event_type, occurred_at),
            INDEX idx_audit_date       (occurred_at),
            CONSTRAINT fk_audit_yr FOREIGN KEY (years_resident_id)
                REFERENCES years_resident (id) ON DELETE SET NULL
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB'
        );
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE staff_planner_audit_event');
        $this->addSql('DROP INDEX idx_sp_export_locked ON staff_planner_export_status');
        $this->addSql('ALTER TABLE staff_planner_export_status
            DROP COLUMN locked,
            DROP COLUMN locked_at,
            DROP COLUMN locked_by_type,
            DROP COLUMN locked_by_id,
            DROP COLUMN lock_reason
        ');
    }
}
