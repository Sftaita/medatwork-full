<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Enrichit staff_planner_export_status avec :
 *   - download_count  : nombre de fois que cet item a été inclus dans un export
 *   - last_generated_at : date du dernier export (null si jamais exporté)
 *   - created_at      : date de création de la ligne
 *
 * Migration non destructive : DEFAULT pour les lignes existantes.
 */
final class Version20260507120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add download_count, last_generated_at, created_at to staff_planner_export_status';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE staff_planner_export_status
            ADD download_count SMALLINT NOT NULL DEFAULT 0,
            ADD last_generated_at DATETIME NULL,
            ADD created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE staff_planner_export_status
            DROP download_count,
            DROP last_generated_at,
            DROP created_at
        ');
    }
}
