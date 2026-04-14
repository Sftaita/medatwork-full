<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Sprint 1 — Hospital feature
 *
 * Creates:
 *   - hospital              (master list)
 *   - app_admin             (super-admin applicatif)
 *   - hospital_admin        (admin RH par hôpital)
 *   - hospital_request      (demandes d'ajout d'hôpital)
 *   - manager_hospital      (pivot ManyToMany)
 *
 * Modifies:
 *   - manager: hospital nullable, add status, add hospital_id (legacy compat)
 *   - years:   add hospital_id nullable FK
 *
 * Data migration:
 *   - Crée un Hospital par valeur distincte de manager.hospital
 *   - Lie chaque manager à son Hospital via manager_hospital
 */
final class Version20260403000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Hospital entity, AppAdmin, HospitalAdmin, HospitalRequest, manager_hospital pivot, Years.hospital_id';
    }

    public function up(Schema $schema): void
    {
        // ── hospital ──────────────────────────────────────────────────────────
        $this->addSql(<<<'SQL'
            CREATE TABLE hospital (
                id         INT AUTO_INCREMENT NOT NULL,
                name       VARCHAR(150) NOT NULL,
                city       VARCHAR(100) DEFAULT NULL,
                country    VARCHAR(2)   NOT NULL DEFAULT 'BE',
                is_active  TINYINT(1)   NOT NULL DEFAULT 1,
                created_at DATETIME     NOT NULL,
                UNIQUE INDEX UNIQ_HOSPITAL_NAME (name),
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);

        // ── app_admin ─────────────────────────────────────────────────────────
        $this->addSql(<<<'SQL'
            CREATE TABLE app_admin (
                id         INT AUTO_INCREMENT NOT NULL,
                email      VARCHAR(180) NOT NULL,
                password   VARCHAR(255) NOT NULL,
                firstname  VARCHAR(100) NOT NULL,
                lastname   VARCHAR(100) NOT NULL,
                roles      JSON         NOT NULL,
                created_at DATETIME     NOT NULL,
                UNIQUE INDEX UNIQ_APP_ADMIN_EMAIL (email),
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);

        // ── hospital_admin ────────────────────────────────────────────────────
        $this->addSql(<<<'SQL'
            CREATE TABLE hospital_admin (
                id               INT AUTO_INCREMENT NOT NULL,
                hospital_id      INT          NOT NULL,
                email            VARCHAR(180) NOT NULL,
                password         VARCHAR(255) DEFAULT NULL,
                firstname        VARCHAR(100) DEFAULT NULL,
                lastname         VARCHAR(100) DEFAULT NULL,
                roles            JSON         NOT NULL,
                status           VARCHAR(20)  NOT NULL DEFAULT 'invited',
                token            VARCHAR(255) DEFAULT NULL,
                token_expiration DATETIME     DEFAULT NULL,
                validated_at     DATETIME     DEFAULT NULL,
                created_at       DATETIME     NOT NULL,
                UNIQUE INDEX UNIQ_HOSPITAL_ADMIN_EMAIL (email),
                INDEX IDX_HOSPITAL_ADMIN_HOSPITAL (hospital_id),
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);

        $this->addSql('ALTER TABLE hospital_admin ADD CONSTRAINT FK_HOSPITAL_ADMIN_HOSPITAL FOREIGN KEY (hospital_id) REFERENCES hospital (id)');

        // ── hospital_request ──────────────────────────────────────────────────
        $this->addSql(<<<'SQL'
            CREATE TABLE hospital_request (
                id               INT AUTO_INCREMENT NOT NULL,
                requested_by_id  INT          NOT NULL,
                hospital_id      INT          DEFAULT NULL,
                hospital_name    VARCHAR(150) NOT NULL,
                status           VARCHAR(20)  NOT NULL DEFAULT 'pending',
                created_at       DATETIME     NOT NULL,
                reviewed_at      DATETIME     DEFAULT NULL,
                INDEX IDX_C92AEE644DA1E751 (requested_by_id),
                INDEX IDX_HOSPITAL_REQUEST_HOSPITAL (hospital_id),
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);

        $this->addSql('ALTER TABLE hospital_request ADD CONSTRAINT FK_C92AEE644DA1E751  FOREIGN KEY (requested_by_id) REFERENCES manager (id)');
        $this->addSql('ALTER TABLE hospital_request ADD CONSTRAINT FK_HOSP_REQ_HOSPITAL FOREIGN KEY (hospital_id)      REFERENCES hospital (id)');

        // ── manager_hospital pivot ────────────────────────────────────────────
        $this->addSql(<<<'SQL'
            CREATE TABLE manager_hospital (
                manager_id  INT NOT NULL,
                hospital_id INT NOT NULL,
                INDEX IDX_MH_MANAGER  (manager_id),
                INDEX IDX_MH_HOSPITAL (hospital_id),
                PRIMARY KEY (manager_id, hospital_id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);

        $this->addSql('ALTER TABLE manager_hospital ADD CONSTRAINT FK_MH_MANAGER  FOREIGN KEY (manager_id)  REFERENCES manager (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE manager_hospital ADD CONSTRAINT FK_MH_HOSPITAL FOREIGN KEY (hospital_id) REFERENCES hospital (id) ON DELETE CASCADE');

        // ── manager: make hospital nullable + add status ───────────────────────
        $this->addSql('ALTER TABLE manager MODIFY hospital VARCHAR(255) DEFAULT NULL');
        $this->addSql("ALTER TABLE manager ADD status VARCHAR(20) NOT NULL DEFAULT 'active'");

        // ── years: add hospital_id FK ─────────────────────────────────────────
        $this->addSql('ALTER TABLE years ADD hospital_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE years ADD CONSTRAINT FK_YEARS_HOSPITAL FOREIGN KEY (hospital_id) REFERENCES hospital (id) ON DELETE SET NULL');
        $this->addSql('CREATE INDEX IDX_YEARS_HOSPITAL ON years (hospital_id)');

        // ── data migration ────────────────────────────────────────────────────
        // 1. Create one Hospital per distinct non-null manager.hospital value
        $this->addSql(<<<'SQL'
            INSERT INTO hospital (name, created_at)
            SELECT DISTINCT hospital, NOW()
            FROM manager
            WHERE hospital IS NOT NULL AND hospital != ''
        SQL);

        // 2. Populate manager_hospital from existing manager.hospital string
        $this->addSql(<<<'SQL'
            INSERT INTO manager_hospital (manager_id, hospital_id)
            SELECT m.id, h.id
            FROM manager m
            JOIN hospital h ON h.name = m.hospital
            WHERE m.hospital IS NOT NULL AND m.hospital != ''
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE years DROP FOREIGN KEY FK_YEARS_HOSPITAL');
        $this->addSql('DROP INDEX IDX_YEARS_HOSPITAL ON years');
        $this->addSql('ALTER TABLE years DROP COLUMN hospital_id');

        $this->addSql('ALTER TABLE manager DROP COLUMN status');
        $this->addSql('ALTER TABLE manager MODIFY hospital VARCHAR(255) NOT NULL');

        $this->addSql('ALTER TABLE manager_hospital DROP FOREIGN KEY FK_MH_MANAGER');
        $this->addSql('ALTER TABLE manager_hospital DROP FOREIGN KEY FK_MH_HOSPITAL');
        $this->addSql('DROP TABLE manager_hospital');

        $this->addSql('ALTER TABLE hospital_request DROP FOREIGN KEY FK_HOSP_REQ_MANAGER');
        $this->addSql('ALTER TABLE hospital_request DROP FOREIGN KEY FK_HOSP_REQ_HOSPITAL');
        $this->addSql('DROP TABLE hospital_request');

        $this->addSql('ALTER TABLE hospital_admin DROP FOREIGN KEY FK_HOSPITAL_ADMIN_HOSPITAL');
        $this->addSql('DROP TABLE hospital_admin');
        $this->addSql('DROP TABLE app_admin');
        $this->addSql('DROP TABLE hospital');
    }
}
