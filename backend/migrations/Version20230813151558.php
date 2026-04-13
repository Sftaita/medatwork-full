<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20230813151558 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE absence ADD is_editable TINYINT(1) DEFAULT NULL');
        $this->addSql('ALTER TABLE garde ADD is_editable TINYINT(1) DEFAULT NULL');
        $this->addSql('ALTER TABLE timesheet ADD is_editable TINYINT(1) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE absence DROP is_editable');
        $this->addSql('ALTER TABLE garde DROP is_editable');
        $this->addSql('ALTER TABLE timesheet DROP is_editable');
    }
}
