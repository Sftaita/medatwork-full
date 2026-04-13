<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20220201181024 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE absence (id INT AUTO_INCREMENT NOT NULL, resident_id INT NOT NULL, year_id INT NOT NULL, type VARCHAR(255) NOT NULL, date_of_start DATE DEFAULT NULL, date_of_end DATE DEFAULT NULL, created_at DATETIME DEFAULT NULL, INDEX IDX_765AE0C98012C5B0 (resident_id), INDEX IDX_765AE0C940C1FEA7 (year_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE garde (id INT AUTO_INCREMENT NOT NULL, resident_id INT NOT NULL, year_id INT NOT NULL, date_of_start DATETIME NOT NULL, date_of_end DATETIME NOT NULL, type VARCHAR(255) NOT NULL, created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX IDX_5964B6C8012C5B0 (resident_id), INDEX IDX_5964B6C40C1FEA7 (year_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE manager (id INT AUTO_INCREMENT NOT NULL, email VARCHAR(180) NOT NULL, roles TEXT NOT NULL, password VARCHAR(255) NOT NULL, firstname VARCHAR(255) NOT NULL, lastname VARCHAR(255) NOT NULL, role VARCHAR(255) NOT NULL, token VARCHAR(255) DEFAULT NULL, validated_at DATETIME DEFAULT NULL, created_at DATETIME DEFAULT NULL, sexe VARCHAR(100) NOT NULL, job VARCHAR(255) NOT NULL, hospital VARCHAR(255) NOT NULL, UNIQUE INDEX UNIQ_FA2425B9E7927C74 (email), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE periods (id INT AUTO_INCREMENT NOT NULL, dates_interval VARCHAR(50) NOT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE resident (id INT AUTO_INCREMENT NOT NULL, email VARCHAR(180) NOT NULL, roles TEXT NOT NULL, password VARCHAR(255) NOT NULL, firstname VARCHAR(255) NOT NULL, lastname VARCHAR(255) NOT NULL, role VARCHAR(255) NOT NULL, token VARCHAR(255) DEFAULT NULL, validated_at DATETIME DEFAULT NULL, created_at DATETIME DEFAULT NULL, sexe VARCHAR(255) NOT NULL, date_of_master DATE NOT NULL, speciality VARCHAR(255) DEFAULT NULL, UNIQUE INDEX UNIQ_1D03DA06E7927C74 (email), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE timesheet (id INT AUTO_INCREMENT NOT NULL, resident_id INT DEFAULT NULL, year_id INT DEFAULT NULL, date_of_start DATETIME NOT NULL, date_of_end DATETIME NOT NULL, pause INT DEFAULT NULL, scientific INT DEFAULT NULL, created_at DATETIME DEFAULT NULL, INDEX IDX_77A4E8D48012C5B0 (resident_id), INDEX IDX_77A4E8D440C1FEA7 (year_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE years (id INT AUTO_INCREMENT NOT NULL, manager_id INT NOT NULL, period_id INT DEFAULT NULL, title VARCHAR(255) DEFAULT NULL, comment LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL, date_of_start DATE NOT NULL, date_of_end DATE NOT NULL, token VARCHAR(10) NOT NULL, location VARCHAR(255) NOT NULL, INDEX IDX_A308E877783E3463 (manager_id), INDEX IDX_A308E877EC8B7ADE (period_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE years_resident (id INT AUTO_INCREMENT NOT NULL, year_id INT NOT NULL, resident_id INT NOT NULL, created_at DATETIME NOT NULL, allowed TINYINT(1) NOT NULL, INDEX IDX_5B53228940C1FEA7 (year_id), INDEX IDX_5B5322898012C5B0 (resident_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE absence ADD CONSTRAINT FK_765AE0C98012C5B0 FOREIGN KEY (resident_id) REFERENCES resident (id)');
        $this->addSql('ALTER TABLE absence ADD CONSTRAINT FK_765AE0C940C1FEA7 FOREIGN KEY (year_id) REFERENCES years (id)');
        $this->addSql('ALTER TABLE garde ADD CONSTRAINT FK_5964B6C8012C5B0 FOREIGN KEY (resident_id) REFERENCES resident (id)');
        $this->addSql('ALTER TABLE garde ADD CONSTRAINT FK_5964B6C40C1FEA7 FOREIGN KEY (year_id) REFERENCES years (id)');
        $this->addSql('ALTER TABLE timesheet ADD CONSTRAINT FK_77A4E8D48012C5B0 FOREIGN KEY (resident_id) REFERENCES resident (id)');
        $this->addSql('ALTER TABLE timesheet ADD CONSTRAINT FK_77A4E8D440C1FEA7 FOREIGN KEY (year_id) REFERENCES years (id)');
        $this->addSql('ALTER TABLE years ADD CONSTRAINT FK_A308E877783E3463 FOREIGN KEY (manager_id) REFERENCES manager (id)');
        $this->addSql('ALTER TABLE years ADD CONSTRAINT FK_A308E877EC8B7ADE FOREIGN KEY (period_id) REFERENCES periods (id)');
        $this->addSql('ALTER TABLE years_resident ADD CONSTRAINT FK_5B53228940C1FEA7 FOREIGN KEY (year_id) REFERENCES years (id)');
        $this->addSql('ALTER TABLE years_resident ADD CONSTRAINT FK_5B5322898012C5B0 FOREIGN KEY (resident_id) REFERENCES resident (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE years DROP FOREIGN KEY FK_A308E877783E3463');
        $this->addSql('ALTER TABLE years DROP FOREIGN KEY FK_A308E877EC8B7ADE');
        $this->addSql('ALTER TABLE absence DROP FOREIGN KEY FK_765AE0C98012C5B0');
        $this->addSql('ALTER TABLE garde DROP FOREIGN KEY FK_5964B6C8012C5B0');
        $this->addSql('ALTER TABLE timesheet DROP FOREIGN KEY FK_77A4E8D48012C5B0');
        $this->addSql('ALTER TABLE years_resident DROP FOREIGN KEY FK_5B5322898012C5B0');
        $this->addSql('ALTER TABLE absence DROP FOREIGN KEY FK_765AE0C940C1FEA7');
        $this->addSql('ALTER TABLE garde DROP FOREIGN KEY FK_5964B6C40C1FEA7');
        $this->addSql('ALTER TABLE timesheet DROP FOREIGN KEY FK_77A4E8D440C1FEA7');
        $this->addSql('ALTER TABLE years_resident DROP FOREIGN KEY FK_5B53228940C1FEA7');
        $this->addSql('DROP TABLE absence');
        $this->addSql('DROP TABLE garde');
        $this->addSql('DROP TABLE manager');
        $this->addSql('DROP TABLE periods');
        $this->addSql('DROP TABLE resident');
        $this->addSql('DROP TABLE timesheet');
        $this->addSql('DROP TABLE years');
        $this->addSql('DROP TABLE years_resident');
    }
}
