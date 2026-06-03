<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * P2-C — Ajoute le champ metadata JSON nullable à notification_manager.
 *
 * Ce champ permet de stocker le contexte de la notification pour les deep links :
 * yearId, yearTitle, tab, severity, version, …
 *
 * Rétrocompatibilité totale : NULL pour toutes les lignes existantes.
 */
final class Version20260604AddNotificationMetadata extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add metadata JSON NULL to notification_manager for deep links (P2-C)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(
            'ALTER TABLE notification_manager ADD COLUMN metadata JSON NULL AFTER type'
        );
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE notification_manager DROP COLUMN metadata');
    }
}
