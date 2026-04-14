<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260414100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add avatar_path column to hospital_admin, manager and resident tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE hospital_admin ADD avatar_path VARCHAR(255) DEFAULT NULL");
        $this->addSql("ALTER TABLE manager ADD avatar_path VARCHAR(255) DEFAULT NULL");
        $this->addSql("ALTER TABLE resident ADD avatar_path VARCHAR(255) DEFAULT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE hospital_admin DROP COLUMN avatar_path");
        $this->addSql("ALTER TABLE manager DROP COLUMN avatar_path");
        $this->addSql("ALTER TABLE resident DROP COLUMN avatar_path");
    }
}
