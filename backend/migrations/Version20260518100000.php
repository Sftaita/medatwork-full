<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260518100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Fix schema desync: communication_message FK, column renames, index renames, datetime types';
    }

    public function isTransactional(): bool
    {
        return false;
    }

    public function up(Schema $schema): void
    {
        // Drop FK first to allow changing id column type on communication_message
        $this->addSql('ALTER TABLE communication_message_read DROP FOREIGN KEY FK_comm_read_message');

        // communication_message
        $this->addSql('ALTER TABLE communication_message DROP read_count, CHANGE id id INT AUTO_INCREMENT NOT NULL, CHANGE type type VARCHAR(20) NOT NULL, CHANGE image_url image_url VARCHAR(500) DEFAULT NULL, CHANGE link_url link_url VARCHAR(500) DEFAULT NULL, CHANGE target_url target_url VARCHAR(500) DEFAULT NULL, CHANGE author_type author_type VARCHAR(20) NOT NULL, CHANGE scope_type scope_type VARCHAR(20) NOT NULL, CHANGE target_role target_role VARCHAR(30) DEFAULT NULL, CHANGE target_user_type target_user_type VARCHAR(30) DEFAULT NULL, CHANGE created_at created_at DATETIME NOT NULL');

        // communication_message_read: align FK column type then restore constraint
        $this->addSql('ALTER TABLE communication_message_read CHANGE id id INT AUTO_INCREMENT NOT NULL, CHANGE communication_message_id communication_message_id INT NOT NULL, CHANGE user_type user_type VARCHAR(30) NOT NULL, CHANGE read_at read_at DATETIME NOT NULL');
        $this->addSql('ALTER TABLE communication_message_read ADD CONSTRAINT FK_comm_read_message FOREIGN KEY (communication_message_id) REFERENCES communication_message (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE communication_message_read RENAME INDEX uniq_comm_read TO uq_comm_read');

        // hospital_admin_audit_log
        $this->addSql('ALTER TABLE hospital_admin_audit_log CHANGE created_at created_at DATETIME NOT NULL');

        // manager index rename
        $this->addSql('ALTER TABLE manager RENAME INDEX idx_1b2e7f07c8a0be3d TO IDX_FA2425B99B27F260');

        // staff_planner_audit_event
        $this->addSql('ALTER TABLE staff_planner_audit_event CHANGE occurred_at occurred_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\'');

        // staff_planner_export_item_snapshot: column rename (hrid_at → hridat)
        $this->addSql('ALTER TABLE staff_planner_export_item_snapshot ADD worker_hridat_export VARCHAR(255) DEFAULT NULL, ADD section_hridat_export VARCHAR(255) DEFAULT NULL, DROP worker_hrid_at_export, DROP section_hrid_at_export');

        // staff_planner_export_status
        $this->addSql('DROP INDEX idx_sp_export_dirty ON staff_planner_export_status');
        $this->addSql('DROP INDEX idx_sp_export_locked ON staff_planner_export_status');
        $this->addSql('ALTER TABLE staff_planner_export_status CHANGE treated_by_type treated_by_type VARCHAR(30) DEFAULT NULL, CHANGE created_at created_at DATETIME NOT NULL');
        $this->addSql('ALTER TABLE staff_planner_export_status RENAME INDEX idx_sp_yr TO IDX_8FCF104EDD75A30A');

        // user_setting
        $this->addSql('ALTER TABLE user_setting CHANGE updated_at updated_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\'');

        // years
        $this->addSql('ALTER TABLE years CHANGE status status VARCHAR(255) DEFAULT \'active\' NOT NULL');

    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE communication_message_read DROP FOREIGN KEY FK_comm_read_message');

        $this->addSql('ALTER TABLE communication_message ADD read_count INT DEFAULT NULL, CHANGE id id INT UNSIGNED AUTO_INCREMENT NOT NULL, CHANGE type type VARCHAR(50) DEFAULT NULL, CHANGE image_url image_url VARCHAR(2048) DEFAULT NULL, CHANGE link_url link_url VARCHAR(2048) DEFAULT NULL, CHANGE target_url target_url VARCHAR(2048) DEFAULT NULL, CHANGE author_type author_type VARCHAR(30) DEFAULT NULL, CHANGE scope_type scope_type VARCHAR(10) DEFAULT NULL, CHANGE target_role target_role VARCHAR(20) DEFAULT NULL, CHANGE target_user_type target_user_type VARCHAR(20) DEFAULT NULL, CHANGE created_at created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL');
        $this->addSql('ALTER TABLE communication_message_read CHANGE id id INT UNSIGNED AUTO_INCREMENT NOT NULL, CHANGE communication_message_id communication_message_id INT UNSIGNED NOT NULL, CHANGE user_type user_type VARCHAR(20) DEFAULT NULL, CHANGE read_at read_at DATETIME DEFAULT NULL');
        $this->addSql('ALTER TABLE communication_message_read RENAME INDEX uq_comm_read TO uniq_comm_read');
        $this->addSql('ALTER TABLE hospital_admin_audit_log CHANGE created_at created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL');
        $this->addSql('ALTER TABLE manager RENAME INDEX IDX_FA2425B99B27F260 TO idx_1b2e7f07c8a0be3d');
        $this->addSql('ALTER TABLE staff_planner_audit_event CHANGE occurred_at occurred_at DATETIME NOT NULL');
        $this->addSql('ALTER TABLE staff_planner_export_item_snapshot ADD worker_hrid_at_export VARCHAR(255) DEFAULT NULL, ADD section_hrid_at_export VARCHAR(255) DEFAULT NULL, DROP worker_hridat_export, DROP section_hridat_export');
        $this->addSql('ALTER TABLE staff_planner_export_status CHANGE treated_by_type treated_by_type VARCHAR(50) DEFAULT NULL, CHANGE created_at created_at DATETIME DEFAULT NULL');
        $this->addSql('ALTER TABLE staff_planner_export_status RENAME INDEX IDX_8FCF104EDD75A30A TO idx_sp_yr');
        $this->addSql('ALTER TABLE user_setting CHANGE updated_at updated_at DATETIME NOT NULL');
        $this->addSql('ALTER TABLE communication_message_read ADD CONSTRAINT FK_comm_read_message FOREIGN KEY (communication_message_id) REFERENCES communication_message (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE years CHANGE status status VARCHAR(255) NOT NULL');
    }
}
