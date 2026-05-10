<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260510120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'staff_planner_export_status: Phase 1 V2 — dirty flag + fingerprint';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE staff_planner_export_status
            ADD dirty_since_export    TINYINT(1)   NOT NULL DEFAULT 0,
            ADD dirty_at              DATETIME      DEFAULT NULL,
            ADD dirty_reason          VARCHAR(60)   DEFAULT NULL,
            ADD data_fingerprint      VARCHAR(64)   DEFAULT NULL,
            ADD fingerprint_computed_at DATETIME    DEFAULT NULL
        ');

        $this->addSql('CREATE INDEX idx_sp_export_dirty
            ON staff_planner_export_status (dirty_since_export)
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX idx_sp_export_dirty ON staff_planner_export_status');
        $this->addSql('ALTER TABLE staff_planner_export_status
            DROP COLUMN dirty_since_export,
            DROP COLUMN dirty_at,
            DROP COLUMN dirty_reason,
            DROP COLUMN data_fingerprint,
            DROP COLUMN fingerprint_computed_at
        ');
    }
}
