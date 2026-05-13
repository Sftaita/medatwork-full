<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260513120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'UserSetting — persistent user preferences (theme, language, calendar, notifications)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE user_setting (
            id           BIGINT          NOT NULL AUTO_INCREMENT,
            user_type    VARCHAR(30)     NOT NULL,
            user_id      INT             NOT NULL,
            settings     JSON            NOT NULL,
            updated_at   DATETIME        NOT NULL,
            PRIMARY KEY (id),
            UNIQUE INDEX uk_user_setting (user_type, user_id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE user_setting');
    }
}
