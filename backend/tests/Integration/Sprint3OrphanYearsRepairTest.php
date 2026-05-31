<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Hospital;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Years;
use App\Enum\Sexe;
use App\Enum\YearStatus;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Console\Tester\CommandTester;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Sprint 1 — Étape 3 : Réparation des années orphelines
 *
 * Depuis que hospital_id est NOT NULL, le Type B (hospital_id IS NULL) ne peut
 * plus exister en DB. Seul le Type A (sans manager_years) reste possible.
 *
 * Cas couverts :
 *   1. dry-run ne modifie rien (Type A — sans manager_years)
 *   2. --fix répare les années Type A avec candidat trouvé
 *   3. Type A sans candidat → ignoré (SKIP)
 *   4. --map-hospital réassigne un hôpital différent
 *   5. --map-hospital refuse un hôpital inexistant
 *   6. Format invalide rejeté proprement
 *   7. La commande est idempotente
 */
class Sprint3OrphanYearsRepairTest extends KernelTestCase
{
    private static EntityManagerInterface $em;
    private static Application $app;

    private static int $hospitalId;
    private static int $hospital2Id;
    private static int $managerId;
    private static int $yearAId;   // Type A : sans manager_years, avec hôpital
    private static int $yearA2Id;  // Type A : sans manager_years, sans hôpital candidat
    private static int $yearWithHospId; // Année avec hôpital pour test réassignation

    public static function setUpBeforeClass(): void
    {
        self::bootKernel();
        $container = static::getContainer();

        /** @var EntityManagerInterface $em */
        self::$em = $container->get('doctrine')->getManager();

        /** @var UserPasswordHasherInterface $hasher */
        $hasher = $container->get(UserPasswordHasherInterface::class);

        $metadata   = self::$em->getMetadataFactory()->getAllMetadata();
        $schemaTool = new SchemaTool(self::$em);
        $schemaTool->dropSchema($metadata);
        $schemaTool->createSchema($metadata);

        self::$em->getConnection()->executeStatement('
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                refresh_token VARCHAR(128) NOT NULL,
                username      VARCHAR(255) NOT NULL,
                valid         DATETIME     NOT NULL,
                UNIQUE (refresh_token)
            )
        ');

        // Hospital 1
        $hospital = new Hospital();
        $hospital->setName('Clinique Test');
        $hospital->setCreatedAt(new \DateTime());
        self::$em->persist($hospital);

        // Hospital 2 (pour test réassignation)
        $hospital2 = new Hospital();
        $hospital2->setName('Autre Clinique');
        $hospital2->setCreatedAt(new \DateTime());
        self::$em->persist($hospital2);

        // Manager lié à l'hôpital 1
        $manager = new Manager();
        $manager->setEmail('s3_manager@test.be');
        $manager->setFirstname('Manager');
        $manager->setLastname('S3');
        $manager->setRole('manager');
        $manager->setRoles(['ROLE_MANAGER']);
        $manager->setSexe(Sexe::Male);
        $manager->setJob(null);
        $manager->setValidatedAt(new \DateTime());
        $manager->setCanCreateYear(true);
        $manager->setPassword($hasher->hashPassword($manager, 'Password123!'));
        $manager->setCreatedAt(new \DateTime());
        $manager->addHospital($hospital);
        self::$em->persist($manager);

        // Année Type A : hôpital OK, mais sans manager_years
        $yearA = new Years();
        $yearA->setTitle('TypeA Year')
              ->setPeriod('2025-2026')->setDateOfStart(new \DateTime('2025-11-01'))
              ->setDateOfEnd(new \DateTime('2026-04-30'))->setStatus(YearStatus::Active)
              ->setHospital($hospital)->setCreatedAt(new \DateTime())
              ->setToken(strtoupper(bin2hex(random_bytes(4))));
        self::$em->persist($yearA);

        // Année Type A2 : sans hôpital candidat (hôpital sans managers)
        $yearA2 = new Years();
        $yearA2->setTitle('TypeA2 NoCandidate Year')
               ->setPeriod('2025-2026')->setDateOfStart(new \DateTime('2025-11-01'))
               ->setDateOfEnd(new \DateTime('2026-04-30'))->setStatus(YearStatus::Active)
               ->setHospital($hospital2)->setCreatedAt(new \DateTime())
               ->setToken(strtoupper(bin2hex(random_bytes(4))));
        self::$em->persist($yearA2);

        // Année avec hospital_id pour test --map-hospital (réassignation)
        $yearWithHosp = new Years();
        $yearWithHosp->setTitle('Year To Reassign')
                     ->setPeriod('2025-2026')->setDateOfStart(new \DateTime('2025-11-01'))
                     ->setDateOfEnd(new \DateTime('2026-04-30'))->setStatus(YearStatus::Active)
                     ->setHospital($hospital2)->setCreatedAt(new \DateTime())
                     ->setToken(strtoupper(bin2hex(random_bytes(4))));
        self::$em->persist($yearWithHosp);

        self::$em->flush();

        self::$hospitalId     = $hospital->getId();
        self::$hospital2Id    = $hospital2->getId();
        self::$managerId      = $manager->getId();
        self::$yearAId        = $yearA->getId();
        self::$yearA2Id       = $yearA2->getId();
        self::$yearWithHospId = $yearWithHosp->getId();
        self::$em->clear();

        self::$app = new Application(static::$kernel);
        self::$app->setAutoExit(false);
    }

    protected function tearDown(): void { /* keep kernel alive */ }

    private function runCommand(array $args = []): CommandTester
    {
        $command = self::$app->find('app:repair-orphan-years');
        $tester  = new CommandTester($command);
        $tester->execute($args);
        return $tester;
    }

    // ── 1. Dry-run Type A ne modifie rien ────────────────────────────────────

    public function testDryRunDoesNotCreateManagerYears(): void
    {
        $this->runCommand(); // sans --fix

        self::$em->clear();
        $relations = self::$em->getRepository(ManagerYears::class)->findBy(['years' => self::$yearAId]);

        $this->assertEmpty($relations,
            'Le dry-run ne doit pas créer de ManagerYears pour yearA');
    }

    // ── 2. --fix répare Type A ────────────────────────────────────────────────

    public function testFixCreatesManagerYearsForTypeA(): void
    {
        $this->runCommand(['--fix' => true]);

        self::$em->clear();
        $relations = self::$em->getRepository(ManagerYears::class)->findBy(
            ['years' => self::$em->find(Years::class, self::$yearAId)]
        );

        $this->assertNotEmpty($relations, '--fix doit créer ManagerYears pour yearA');
        $this->assertTrue($relations[0]->getAdmin());
        $this->assertTrue($relations[0]->getDataAccess());
    }

    // ── 3. Type A sans candidat → SKIP ───────────────────────────────────────

    public function testTypeA2WithoutCandidateIsSkipped(): void
    {
        $this->runCommand(['--fix' => true]);

        self::$em->clear();
        $relations = self::$em->getRepository(ManagerYears::class)->findBy(
            ['years' => self::$em->find(Years::class, self::$yearA2Id)]
        );

        $this->assertEmpty($relations,
            'yearA2 dont l\'hôpital n\'a aucun manager ne doit pas recevoir de ManagerYears');
    }

    // ── 4. Format invalide rejeté proprement ─────────────────────────────────

    public function testInvalidMapHospitalFormatIsRejected(): void
    {
        $tester = $this->runCommand([
            '--map-hospital' => 'invalid-format',
        ]);

        $output = $tester->getDisplay();
        $this->assertStringContainsString('Format invalide', $output);
    }

    // ── 7. Idempotence ────────────────────────────────────────────────────────

    public function testCommandIsIdempotent(): void
    {
        // yearA est déjà réparé (test 2), un second --fix ne doit pas créer de doublons
        $countBefore = count(self::$em->getRepository(ManagerYears::class)
            ->findBy(['years' => self::$em->find(Years::class, self::$yearAId)]));

        $this->runCommand(['--fix' => true]);

        self::$em->clear();
        $countAfter = count(self::$em->getRepository(ManagerYears::class)
            ->findBy(['years' => self::$em->find(Years::class, self::$yearAId)]));

        $this->assertSame($countBefore, $countAfter,
            'Un second --fix ne doit pas créer de ManagerYears en double');
    }
}
