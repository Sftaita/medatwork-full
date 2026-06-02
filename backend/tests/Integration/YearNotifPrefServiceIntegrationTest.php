<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Hospital;
use App\Entity\Manager;
use App\Entity\Years;
use App\Entity\YearUserNotifPref;
use App\Enum\Sexe;
use App\Enum\YearStatus;
use App\Services\YearNotifPrefService;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * P0 — YearNotifPrefService (intégration SQLite)
 *
 * RED attendu :
 *   - YearUserNotifPref entity not found → schema creation fails
 *   - YearNotifPrefService not found
 */
class YearNotifPrefServiceIntegrationTest extends KernelTestCase
{
    private static EntityManagerInterface $em;
    private static YearNotifPrefService $service;
    private static Years $year;
    private static Manager $managerA;
    private static Manager $managerB;

    public static function setUpBeforeClass(): void
    {
        self::bootKernel();
        $container = static::getContainer();

        /** @var EntityManagerInterface $em */
        self::$em = $container->get('doctrine')->getManager();

        $metadata   = self::$em->getMetadataFactory()->getAllMetadata();
        $schemaTool = new SchemaTool(self::$em);
        $schemaTool->dropSchema($metadata);
        $schemaTool->createSchema($metadata);

        self::$em->getConnection()->executeStatement('
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                refresh_token VARCHAR(128) NOT NULL,
                username VARCHAR(255) NOT NULL,
                valid DATETIME NOT NULL,
                UNIQUE (refresh_token)
            )
        ');

        /** @var UserPasswordHasherInterface $hasher */
        $hasher = $container->get(UserPasswordHasherInterface::class);

        $hospital = new Hospital();
        $hospital->setName('Hôpital Test')->setCreatedAt(new \DateTime());
        self::$em->persist($hospital);

        self::$managerA = self::createManager('manager_a@test.be', $hasher, $hospital);
        self::$managerB = self::createManager('manager_b@test.be', $hasher, $hospital);

        self::$year = new Years();
        self::$year
            ->setTitle('Cardio 2025')
            ->setPeriod('2025-2026')
            ->setDateOfStart(new \DateTime('2025-09-01'))
            ->setDateOfEnd(new \DateTime('2026-08-31'))
            ->setStatus(YearStatus::Active)
            ->setHospital($hospital)
            ->setCreatedAt(new \DateTime())
            ->setToken(bin2hex(random_bytes(4)));
        self::$em->persist(self::$year);
        self::$em->flush();

        // Récupère le service depuis le container
        self::$service = $container->get(YearNotifPrefService::class);
    }

    private static function createManager(
        string $email,
        UserPasswordHasherInterface $hasher,
        Hospital $hospital,
    ): Manager {
        $m = new Manager();
        $m->setEmail($email)
          ->setFirstname('Test')
          ->setLastname('Manager')
          ->setRole('manager')
          ->setRoles(['ROLE_MANAGER'])
          ->setSexe(Sexe::Male)
          ->setJob(null)
          ->setValidatedAt(new \DateTime())
          ->setCanCreateYear(true)
          ->setPassword($hasher->hashPassword($m, 'Password123!'))
          ->setCreatedAt(new \DateTime())
          ->addHospital($hospital);
        self::$em->persist($m);
        return $m;
    }

    protected function tearDown(): void { /* Keep kernel alive */ }

    // ── F01 : getForUser sans entrée → EVENT_DEFAULTS ─────────────────────────

    public function testGetForUserWithNoEntryReturnsDefaults(): void
    {
        $prefs = self::$service->getForUser('manager', (int) self::$managerA->getId(), self::$year);

        self::assertArrayHasKey('COMPLIANCE_ALERT', $prefs);
        self::assertArrayHasKey('email', $prefs['COMPLIANCE_ALERT']);
        self::assertTrue($prefs['COMPLIANCE_ALERT']['email']);   // default true
    }

    // ── F02 : getForUser partiel → merge avec defaults ────────────────────────

    public function testGetForUserMergesWithDefaults(): void
    {
        // Stocker seulement COMPLIANCE_ALERT.email=false
        self::$service->patchForUser(
            'manager',
            (int) self::$managerA->getId(),
            self::$year,
            ['COMPLIANCE_ALERT' => ['email' => false]]
        );

        $prefs = self::$service->getForUser('manager', (int) self::$managerA->getId(), self::$year);

        // COMPLIANCE_ALERT.email overridé
        self::assertFalse($prefs['COMPLIANCE_ALERT']['email']);
        // Les autres events sont toujours les defaults
        self::assertArrayHasKey('MONTH_VALIDATION', $prefs);
    }

    // ── F04 : isolation par yearId ─────────────────────────────────────────────

    public function testGetForUserIsIsolatedByYear(): void
    {
        // Créer une 2e année
        $hospital = self::$em->find(Hospital::class, 1);
        $year2 = new Years();
        $year2->setTitle('Cardio 2026')
              ->setPeriod('2026-2027')
              ->setDateOfStart(new \DateTime('2026-09-01'))
              ->setDateOfEnd(new \DateTime('2027-08-31'))
              ->setStatus(YearStatus::Active)
              ->setHospital($hospital)
              ->setCreatedAt(new \DateTime())
              ->setToken(bin2hex(random_bytes(4)));
        self::$em->persist($year2);
        self::$em->flush();

        // Patcher year1 email=false pour managerA
        self::$service->patchForUser(
            'manager',
            (int) self::$managerA->getId(),
            self::$year,
            ['COMPLIANCE_ALERT' => ['email' => false]]
        );

        // year2 doit avoir les defaults (pas le patch de year1)
        $prefs2 = self::$service->getForUser('manager', (int) self::$managerA->getId(), $year2);
        self::assertTrue($prefs2['COMPLIANCE_ALERT']['email']); // default true
    }

    // ── F05 : isolation par userId ─────────────────────────────────────────────

    public function testGetForUserIsIsolatedByUserId(): void
    {
        // Patcher email=false pour managerA uniquement
        self::$service->patchForUser(
            'manager',
            (int) self::$managerA->getId(),
            self::$year,
            ['COMPLIANCE_ALERT' => ['email' => false]]
        );

        // managerB doit avoir les defaults
        $prefsB = self::$service->getForUser('manager', (int) self::$managerB->getId(), self::$year);
        self::assertTrue($prefsB['COMPLIANCE_ALERT']['email']);
    }

    // ── G01 : patch vide → aucun changement ──────────────────────────────────

    public function testPatchEmptyDoesNotChangeExistingPrefs(): void
    {
        self::$service->patchForUser(
            'manager',
            (int) self::$managerA->getId(),
            self::$year,
            ['COMPLIANCE_ALERT' => ['email' => false]]
        );

        self::$service->patchForUser(
            'manager',
            (int) self::$managerA->getId(),
            self::$year,
            [] // patch vide
        );

        $prefs = self::$service->getForUser('manager', (int) self::$managerA->getId(), self::$year);
        self::assertFalse($prefs['COMPLIANCE_ALERT']['email']); // conservé
    }

    // ── G02 : patch partiel n'efface pas les autres canaux ───────────────────

    public function testPartialPatchDoesNotOverwriteOtherChannels(): void
    {
        self::$service->patchForUser(
            'manager',
            (int) self::$managerA->getId(),
            self::$year,
            ['COMPLIANCE_ALERT' => ['email' => false, 'push' => true]]
        );

        // Patcher uniquement push=false
        self::$service->patchForUser(
            'manager',
            (int) self::$managerA->getId(),
            self::$year,
            ['COMPLIANCE_ALERT' => ['push' => false]]
        );

        $prefs = self::$service->getForUser('manager', (int) self::$managerA->getId(), self::$year);
        self::assertFalse($prefs['COMPLIANCE_ALERT']['email']); // conservé
        self::assertFalse($prefs['COMPLIANCE_ALERT']['push']);  // mis à jour
    }

    // ── H01 : suppression année → cascade préférences ────────────────────────

    public function testYearDeletionCascadesPreferences(): void
    {
        $hospital = self::$em->getRepository(Hospital::class)->findOneBy([]);
        $yearTemp = new Years();
        $yearTemp->setTitle('Temp Year')
                 ->setPeriod('2027-2028')
                 ->setDateOfStart(new \DateTime('2027-09-01'))
                 ->setDateOfEnd(new \DateTime('2028-08-31'))
                 ->setStatus(YearStatus::Active)
                 ->setHospital($hospital)
                 ->setCreatedAt(new \DateTime())
                 ->setToken(bin2hex(random_bytes(4)));
        self::$em->persist($yearTemp);
        self::$em->flush();

        // Créer une préférence pour yearTemp
        self::$service->patchForUser(
            'manager',
            (int) self::$managerA->getId(),
            $yearTemp,
            ['COMPLIANCE_ALERT' => ['email' => false]]
        );

        $yearTempId = $yearTemp->getId();

        // Supprimer l'année
        self::$em->remove($yearTemp);
        self::$em->flush();
        self::$em->clear();

        // Vérifier que la préférence a été supprimée en cascade
        $orphans = self::$em->getRepository(YearUserNotifPref::class)->findBy([
            'userId'   => self::$managerA->getId(),
            'userType' => 'manager',
        ]);

        $stillLinkedToDeletedYear = array_filter(
            $orphans,
            fn(YearUserNotifPref $p) => $p->getYear() === null
        );

        self::assertEmpty(
            $stillLinkedToDeletedYear,
            'Preferences must be deleted when the year is deleted (onDelete=CASCADE)'
        );
    }

    // ── H03 : création automatique à la première PATCH ───────────────────────

    public function testFirstPatchCreatesEntry(): void
    {
        $countBefore = count(self::$em->getRepository(YearUserNotifPref::class)->findBy([
            'userId'   => self::$managerB->getId(),
            'userType' => 'manager',
        ]));

        self::$service->patchForUser(
            'manager',
            (int) self::$managerB->getId(),
            self::$year,
            ['MONTH_VALIDATION' => ['email' => false]]
        );

        self::$em->clear();
        $countAfter = count(self::$em->getRepository(YearUserNotifPref::class)->findBy([
            'userId'   => self::$managerB->getId(),
            'userType' => 'manager',
        ]));

        self::assertGreaterThan($countBefore, $countAfter);
    }

    // ── H04 : GET après PATCH retourne les bonnes valeurs ────────────────────

    public function testGetAfterPatchReturnsUpdatedValues(): void
    {
        self::$service->patchForUser(
            'manager',
            (int) self::$managerB->getId(),
            self::$year,
            ['VALIDATION_REJECTED' => ['push' => false, 'email' => false]]
        );

        $prefs = self::$service->getForUser('manager', (int) self::$managerB->getId(), self::$year);

        self::assertFalse($prefs['VALIDATION_REJECTED']['push']);
        self::assertFalse($prefs['VALIDATION_REJECTED']['email']);
    }
}
