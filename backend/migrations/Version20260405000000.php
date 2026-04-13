<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260405000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create communication_message and communication_message_read tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('
            CREATE TABLE communication_message (
                id           INT UNSIGNED AUTO_INCREMENT NOT NULL,
                hospital_id  INT DEFAULT NULL,
                type         VARCHAR(20)  NOT NULL COMMENT "notification|modal",
                title        VARCHAR(255) NOT NULL,
                body         LONGTEXT     NOT NULL,
                image_url    VARCHAR(2048) DEFAULT NULL,
                link_url     VARCHAR(2048) DEFAULT NULL,
                button_label VARCHAR(100)  DEFAULT NULL,
                target_url   VARCHAR(2048) DEFAULT NULL,
                priority     INT          DEFAULT NULL,
                author_type  VARCHAR(30)  NOT NULL COMMENT "super_admin|hospital_admin",
                author_id    INT          NOT NULL,
                scope_type   VARCHAR(10)  NOT NULL COMMENT "all|role|user",
                target_role  VARCHAR(20)  DEFAULT NULL,
                target_user_id   INT      DEFAULT NULL,
                target_user_type VARCHAR(20) DEFAULT NULL,
                is_active    TINYINT(1)   NOT NULL DEFAULT 1,
                read_count   INT          NOT NULL DEFAULT 0,
                created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                INDEX idx_comm_type_active (type, is_active),
                INDEX idx_comm_hospital_active (hospital_id, is_active),
                CONSTRAINT FK_comm_hospital FOREIGN KEY (hospital_id) REFERENCES hospital (id) ON DELETE SET NULL
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');

        $this->addSql('
            CREATE TABLE communication_message_read (
                id                      INT UNSIGNED AUTO_INCREMENT NOT NULL,
                communication_message_id INT UNSIGNED NOT NULL,
                user_type               VARCHAR(20)  NOT NULL,
                user_id                 INT          NOT NULL,
                read_at                 DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE INDEX uniq_comm_read (communication_message_id, user_type, user_id),
                INDEX idx_comm_read_user (user_type, user_id),
                CONSTRAINT FK_comm_read_message FOREIGN KEY (communication_message_id)
                    REFERENCES communication_message (id) ON DELETE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS communication_message_read');
        $this->addSql('DROP TABLE IF EXISTS communication_message');
    }
}
