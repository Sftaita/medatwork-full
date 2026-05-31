<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Rend years.hospital_id NOT NULL.
 *
 * PRÉ-REQUIS ABSOLU : toutes les années doivent avoir un hospital_id non-null.
 * Cette migration échoue explicitement s'il reste des années orphelines.
 *
 * Avant d'exécuter :
 *   php bin/console app:repair-orphan-years --fix
 *   php bin/console app:repair-orphan-years --fix --map-hospital="41:X,46:X,51:X,56:X,73:X"
 */
final class Version20260531HospitalIdNotNull extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Rend years.hospital_id NOT NULL — une année appartient obligatoirement à un hôpital.';
    }

    public function preUp(Schema $schema): void
    {
        // Garde de sécurité : refuse si des années orphelines existent encore
        $count = $this->connection->fetchOne(
            'SELECT COUNT(*) FROM years WHERE hospital_id IS NULL'
        );

        if ((int) $count > 0) {
            $this->abortIf(
                true,
                sprintf(
                    'Migration impossible : %d année(s) ont encore hospital_id IS NULL. '
                    . 'Exécuter d\'abord : php bin/console app:repair-orphan-years --fix',
                    (int) $count
                )
            );
        }
    }

    public function up(Schema $schema): void
    {
        // Supprimer le FK avant de modifier la colonne
        $this->addSql('ALTER TABLE years DROP FOREIGN KEY FK_A308E87763DBB69');
        $this->addSql('ALTER TABLE years MODIFY hospital_id INT NOT NULL');
        $this->addSql('ALTER TABLE years ADD CONSTRAINT FK_A308E87763DBB69 FOREIGN KEY (hospital_id) REFERENCES hospital (id) ON DELETE RESTRICT');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE years DROP FOREIGN KEY FK_A308E87763DBB69');
        $this->addSql('ALTER TABLE years MODIFY hospital_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE years ADD CONSTRAINT FK_A308E87763DBB69 FOREIGN KEY (hospital_id) REFERENCES hospital (id)');
    }
}
