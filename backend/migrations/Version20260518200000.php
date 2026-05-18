<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260518200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add contact_message and contact_cc_config tables';
    }

    public function isTransactional(): bool
    {
        return false;
    }

    public function up(Schema $schema): void
    {
        $this->addSql("CREATE TABLE contact_message (
            id          INT AUTO_INCREMENT NOT NULL,
            firstname   VARCHAR(100) NOT NULL,
            lastname    VARCHAR(100) NOT NULL,
            email       VARCHAR(255) NOT NULL,
            message     LONGTEXT NOT NULL,
            created_at  DATETIME NOT NULL,
            treated_at  DATETIME DEFAULT NULL,
            treated_by  VARCHAR(100) DEFAULT NULL,
            INDEX idx_contact_created (created_at),
            INDEX idx_contact_treated (treated_at),
            PRIMARY KEY (id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB");

        $this->addSql("CREATE TABLE contact_cc_config (
            id        INT AUTO_INCREMENT NOT NULL,
            email     VARCHAR(255) NOT NULL,
            name      VARCHAR(100) NOT NULL,
            is_active TINYINT(1) NOT NULL,
            UNIQUE INDEX UNIQ_3A73A6DE7927C74 (email),
            PRIMARY KEY (id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE contact_message');
        $this->addSql('DROP TABLE contact_cc_config');
    }
}
