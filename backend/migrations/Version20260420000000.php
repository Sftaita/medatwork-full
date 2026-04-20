<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260420000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add canCreateYear boolean field to manager table (default false)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE manager ADD can_create_year TINYINT(1) NOT NULL DEFAULT 0");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE manager DROP COLUMN can_create_year");
    }
}
