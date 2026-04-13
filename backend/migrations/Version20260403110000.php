<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260403110000 extends AbstractMigration
{
    public function getDescription(): string { return 'Add admin_hospital_id FK to manager table'; }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE manager ADD admin_hospital_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE manager ADD CONSTRAINT FK_1B2E7F07C8A0BE3D FOREIGN KEY (admin_hospital_id) REFERENCES hospital (id) ON DELETE SET NULL');
        $this->addSql('CREATE INDEX IDX_1B2E7F07C8A0BE3D ON manager (admin_hospital_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE manager DROP FOREIGN KEY FK_1B2E7F07C8A0BE3D');
        $this->addSql('DROP INDEX IDX_1B2E7F07C8A0BE3D ON manager');
        $this->addSql('ALTER TABLE manager DROP COLUMN admin_hospital_id');
    }
}
