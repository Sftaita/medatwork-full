<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260510150000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase 2 : staff_planner_export_batch + staff_planner_export_item_snapshot';
    }

    public function up(Schema $schema): void
    {
        // ── Table staff_planner_export_batch ────────────────────────────────────
        // RESTRICT on year_id : audit trails must not disappear when a year is deleted.
        $this->addSql('CREATE TABLE staff_planner_export_batch (
            id                 INT            NOT NULL AUTO_INCREMENT,
            year_id            INT            NOT NULL,
            batch_number       SMALLINT       NOT NULL,
            generated_at       DATETIME       NOT NULL COMMENT "(DC2Type:datetime_immutable)",
            generated_by_type  VARCHAR(30)    NOT NULL,
            generated_by_id    INT            DEFAULT NULL,
            item_count         SMALLINT       NOT NULL,
            file_hash          VARCHAR(64)    NOT NULL,
            file_size_bytes    INT            NOT NULL,
            notes              LONGTEXT       DEFAULT NULL,
            created_at         DATETIME       NOT NULL COMMENT "(DC2Type:datetime_immutable)",
            PRIMARY KEY (id),
            UNIQUE KEY uq_batch_year_number (year_id, batch_number),
            INDEX idx_batch_year_date (year_id, generated_at),
            CONSTRAINT fk_batch_year FOREIGN KEY (year_id) REFERENCES years (id) ON DELETE RESTRICT
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB'
        );

        // ── Table staff_planner_export_item_snapshot ────────────────────────────
        // CASCADE on batch_id : if a batch is purged (RGPD), its snapshots go with it.
        // RESTRICT on years_resident_id : snapshots are legal proof — MACCS must not be deletable.
        $this->addSql('CREATE TABLE staff_planner_export_item_snapshot (
            id                         INT            NOT NULL AUTO_INCREMENT,
            batch_id                   INT            NOT NULL,
            years_resident_id          INT            NOT NULL,
            month                      SMALLINT       NOT NULL,
            calendar_year              SMALLINT       NOT NULL,
            data_fingerprint           VARCHAR(64)    NOT NULL,
            validated_by_mds_at_export TINYINT(1)     NOT NULL,
            timesheet_count            SMALLINT       NOT NULL,
            garde_hospital_count       SMALLINT       NOT NULL,
            absence_count              SMALLINT       NOT NULL,
            total_minutes              INT            NOT NULL,
            worker_hrid_at_export      VARCHAR(255)   DEFAULT NULL,
            section_hrid_at_export     VARCHAR(255)   DEFAULT NULL,
            payload_lines              MEDIUMTEXT     NOT NULL,
            created_at                 DATETIME       NOT NULL COMMENT "(DC2Type:datetime_immutable)",
            PRIMARY KEY (id),
            UNIQUE KEY uq_snapshot_batch_item (batch_id, years_resident_id, month, calendar_year),
            INDEX idx_snapshot_maccs (years_resident_id, calendar_year, month),
            INDEX idx_snapshot_batch (batch_id),
            CONSTRAINT fk_snapshot_batch FOREIGN KEY (batch_id)
                REFERENCES staff_planner_export_batch (id) ON DELETE CASCADE,
            CONSTRAINT fk_snapshot_yr FOREIGN KEY (years_resident_id)
                REFERENCES years_resident (id) ON DELETE RESTRICT
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB'
        );
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE staff_planner_export_item_snapshot');
        $this->addSql('DROP TABLE staff_planner_export_batch');
    }
}
