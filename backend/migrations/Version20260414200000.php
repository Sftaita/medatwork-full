<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Fix hospital_request column name mismatch:
 *   DB has manager_id, but Doctrine entity maps requestedBy → requested_by_id.
 *
 * Renames manager_id → requested_by_id, recreates FK and index to match.
 */
final class Version20260414200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Rename hospital_request.manager_id to requested_by_id (align DB with Doctrine mapping)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE hospital_request DROP FOREIGN KEY FK_HOSP_REQ_MANAGER');
        $this->addSql('DROP INDEX IDX_HOSPITAL_REQUEST_MANAGER ON hospital_request');
        $this->addSql('ALTER TABLE hospital_request CHANGE manager_id requested_by_id INT NOT NULL');
        $this->addSql('CREATE INDEX IDX_C92AEE644DA1E751 ON hospital_request (requested_by_id)');
        $this->addSql('ALTER TABLE hospital_request ADD CONSTRAINT FK_C92AEE644DA1E751 FOREIGN KEY (requested_by_id) REFERENCES manager (id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE hospital_request DROP FOREIGN KEY FK_C92AEE644DA1E751');
        $this->addSql('DROP INDEX IDX_C92AEE644DA1E751 ON hospital_request');
        $this->addSql('ALTER TABLE hospital_request CHANGE requested_by_id manager_id INT NOT NULL');
        $this->addSql('CREATE INDEX IDX_HOSPITAL_REQUEST_MANAGER ON hospital_request (manager_id)');
        $this->addSql('ALTER TABLE hospital_request ADD CONSTRAINT FK_HOSP_REQ_MANAGER FOREIGN KEY (manager_id) REFERENCES manager (id)');
    }
}
