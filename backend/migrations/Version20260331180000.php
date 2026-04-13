<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Compliance system — Phase 1
 *
 * - Add `compliance_alert` table for persisted compliance anomalies
 * - Add `receive_compliance_emails` column to `manager`
 */
final class Version20260331180000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add ComplianceAlert entity and Manager.receiveComplianceEmails flag';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('
            CREATE TABLE compliance_alert (
                id INT AUTO_INCREMENT NOT NULL,
                resident_id INT NOT NULL,
                issue_type VARCHAR(64) NOT NULL,
                severity VARCHAR(16) NOT NULL,
                week_start VARCHAR(10) NOT NULL,
                fingerprint VARCHAR(64) NOT NULL,
                status VARCHAR(20) NOT NULL,
                context JSON NOT NULL,
                detected_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                resolved_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                INDEX IDX_6CFF04008012C5B0 (resident_id),
                INDEX idx_compliance_alert_resident_status (resident_id, status),
                UNIQUE INDEX uq_compliance_alert_fingerprint (fingerprint),
                PRIMARY KEY(id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');

        $this->addSql('
            ALTER TABLE compliance_alert
            ADD CONSTRAINT FK_6CFF04008012C5B0
            FOREIGN KEY (resident_id) REFERENCES resident (id) ON DELETE CASCADE
        ');

        $this->addSql('
            ALTER TABLE manager
            ADD receive_compliance_emails TINYINT(1) DEFAULT 0 NOT NULL
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE compliance_alert DROP FOREIGN KEY FK_6CFF04008012C5B0');
        $this->addSql('DROP TABLE compliance_alert');
        $this->addSql('ALTER TABLE manager DROP receive_compliance_emails');
    }
}
