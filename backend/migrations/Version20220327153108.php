<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20220327153108 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE partners (id INT AUTO_INCREMENT NOT NULL, manager_id INT NOT NULL, year_id INT NOT NULL, data_access TINYINT(1) DEFAULT NULL, data_validation TINYINT(1) DEFAULT NULL, INDEX IDX_EFEB5164783E3463 (manager_id), INDEX IDX_EFEB516440C1FEA7 (year_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE partners ADD CONSTRAINT FK_EFEB5164783E3463 FOREIGN KEY (manager_id) REFERENCES manager (id)');
        $this->addSql('ALTER TABLE partners ADD CONSTRAINT FK_EFEB516440C1FEA7 FOREIGN KEY (year_id) REFERENCES years (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE partners');
    }
}
