<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260505220000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'manager.job: string libre → enum nullable (ManagerJob)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE manager CHANGE job job VARCHAR(255) DEFAULT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("UPDATE manager SET job = 'medical supervisor' WHERE job IS NULL");
        $this->addSql("ALTER TABLE manager CHANGE job job VARCHAR(255) NOT NULL");
    }
}
