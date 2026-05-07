<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260506100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajout StaffPlannerMonthStatus : suivi mensuel des exports Staff Planner';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE staff_planner_month_status (
                id             INT AUTO_INCREMENT NOT NULL,
                year_id        INT NOT NULL,
                treated_by_id  INT DEFAULT NULL,
                month          SMALLINT NOT NULL,
                calendar_year  SMALLINT NOT NULL,
                treated        TINYINT(1) NOT NULL DEFAULT 0,
                treated_at     DATETIME DEFAULT NULL,
                last_generated_at DATETIME DEFAULT NULL,
                download_count INT NOT NULL DEFAULT 0,
                updated_at     DATETIME NOT NULL,
                UNIQUE INDEX uq_sp_month (year_id, month, calendar_year),
                INDEX IDX_SP_YEAR (year_id),
                INDEX IDX_SP_TREATED_BY (treated_by_id),
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);

        $this->addSql(<<<'SQL'
            ALTER TABLE staff_planner_month_status
                ADD CONSTRAINT FK_SP_YEAR
                    FOREIGN KEY (year_id) REFERENCES years (id) ON DELETE CASCADE,
                ADD CONSTRAINT FK_SP_TREATED_BY
                    FOREIGN KEY (treated_by_id) REFERENCES manager (id) ON DELETE SET NULL
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE staff_planner_month_status DROP FOREIGN KEY FK_SP_YEAR');
        $this->addSql('ALTER TABLE staff_planner_month_status DROP FOREIGN KEY FK_SP_TREATED_BY');
        $this->addSql('DROP TABLE staff_planner_month_status');
    }
}
