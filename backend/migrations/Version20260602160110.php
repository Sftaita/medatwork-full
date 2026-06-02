<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Ajoute la table year_user_notif_pref.
 * Préférences personnelles de notification par (userType × userId × year_id).
 */
final class Version20260602160110 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add year_user_notif_pref — annual personal notification preferences';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('
            CREATE TABLE year_user_notif_pref (
                id         BIGINT AUTO_INCREMENT NOT NULL,
                year_id    INT         NOT NULL,
                user_type  VARCHAR(30) NOT NULL,
                user_id    INT         NOT NULL,
                prefs      JSON        NOT NULL,
                updated_at DATETIME(6) NOT NULL COMMENT "(DC2Type:datetime_immutable)",
                PRIMARY KEY (id),
                UNIQUE INDEX uk_yunp (user_type, user_id, year_id),
                INDEX idx_yunp_user (user_type, user_id),
                INDEX idx_yunp_year (year_id),
                CONSTRAINT fk_yunp_year FOREIGN KEY (year_id)
                    REFERENCES years (id)
                    ON DELETE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4
              COLLATE utf8mb4_unicode_ci
              ENGINE = InnoDB
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE year_user_notif_pref');
    }
}
