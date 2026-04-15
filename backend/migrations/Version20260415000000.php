<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Add status column to hospital_admin_audit_log.
 * Default 'success' — all existing rows are assumed to be successful operations.
 */
final class Version20260415000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add status (success|error) column to hospital_admin_audit_log';
    }

    public function up(Schema $schema): void
    {
        $sm      = $this->connection->createSchemaManager();
        $columns = array_map('strtolower', array_keys($sm->introspectTable('hospital_admin_audit_log')->getColumns()));

        if (!in_array('status', $columns, true)) {
            $this->addSql("ALTER TABLE hospital_admin_audit_log ADD status VARCHAR(10) NOT NULL DEFAULT 'success'");
        }
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE hospital_admin_audit_log DROP COLUMN status');
    }
}
