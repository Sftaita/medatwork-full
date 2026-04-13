<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260403100000 extends AbstractMigration
{
    public function getDescription(): string { return 'Add inactive status to manager'; }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE manager MODIFY COLUMN status ENUM('pending_hospital','active','inactive') NOT NULL DEFAULT 'active'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE manager MODIFY COLUMN status ENUM('pending_hospital','active') NOT NULL DEFAULT 'active'");
    }
}
