<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Hospital;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Years;
use App\Enum\ManagerStatus;
use App\Enum\Sexe;
use App\Enum\YearStatus;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * CTRL-P1-10 — Manager avec status=Inactive et JWT valide.
 *
 * Scénario :
 *   1. Créer un manager Active, obtenir son JWT.
 *   2. Passer son status à Inactive en DB.
 *   3. Utiliser le JWT sur un endpoint → attendu : 401.
 *
 * Comportement actuel (P0) : le UserChecker ne vérifie pas Inactive → 200 (BUGGY).
 * Comportement attendu (P1) : UserChecker bloque Inactive → 401.
 *
 * Ce test ÉCHOUE avec le code actuel et PASSE après correction du UserChecker.
 */
class YearNotifPrefControllerAccountStatusTest extends WebTestCase
{
    private static KernelBrowser $client;
    private static int $yearId;
    private static string $tokenActiveManager;
    private static int $managerId;

    private const PASSWORD = 'Password123!';
    private const BASE_URL = '/api/years';

    public static function setUpBeforeClass(): void
    {
        static::ensureKernelShutdown();
        self::$client = static::createClient();
        $container    = self::$client->getContainer();

        /** @var EntityManagerInterface $em */
        $em = $container->get('doctrine')->getManager();

        $metadata   = $em->getMetadataFactory()->getAllMetadata();
        $schemaTool = new SchemaTool($em);
        $schemaTool->dropSchema($metadata);
        $schemaTool->createSchema($metadata);

        $em->getConnection()->executeStatement('
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
        $hospital->setName('Hôpital Status Test')->setCreatedAt(new \DateTime());
        $em->persist($hospital);

        // Manager créé comme Active
        $manager = new Manager();
        $manager->setEmail('manager_status@test.be')
                ->setFirstname('Status')
                ->setLastname('Manager')
                ->setRole('manager')
                ->setRoles(['ROLE_MANAGER'])
                ->setSexe(Sexe::Male)
                ->setJob(null)
                ->setValidatedAt(new \DateTime())
                ->setCanCreateYear(true)
                ->setPassword($hasher->hashPassword($manager, self::PASSWORD))
                ->setCreatedAt(new \DateTime())
                ->addHospital($hospital);
        $em->persist($manager);

        $year = new Years();
        $year->setTitle('Status Test Year')
             ->setPeriod('2025-2026')
             ->setDateOfStart(new \DateTime('2025-09-01'))
             ->setDateOfEnd(new \DateTime('2026-08-31'))
             ->setStatus(YearStatus::Active)
             ->setHospital($hospital)
             ->setCreatedAt(new \DateTime())
             ->setToken(bin2hex(random_bytes(4)));
        $em->persist($year);

        $rel = new ManagerYears();
        $rel->setManager($manager)
            ->setYears($year)
            ->setAdmin(true)
            ->setDataAccess(true)
            ->setDataValidation(true)
            ->setDataDownload(true)
            ->setHasAgendaAccess(true)
            ->setCanManageAgenda(true);
        $em->persist($rel);

        $em->flush();

        self::$yearId    = (int) $year->getId();
        self::$managerId = (int) $manager->getId();

        // Obtenir le JWT alors que le manager est encore Active
        self::$tokenActiveManager = self::login('manager_status@test.be');
    }

    private static function login(string $email): string
    {
        self::$client->request('POST', '/api/login_check', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode(['username' => $email, 'password' => self::PASSWORD]));

        $data = json_decode(self::$client->getResponse()->getContent(), true);
        return $data['token'] ?? '';
    }

    protected function tearDown(): void { /* Keep kernel alive */ }

    // ── CTRL-P1-10 : Manager Inactive + JWT valide → 401 ─────────────────────

    /**
     * Comportement P0 BUGGY :
     *   UserChecker::checkPreAuth ne vérifie pas ManagerStatus::Inactive
     *   → le JWT est accepté → 200 retourné → TEST ÉCHOUE ✓
     *
     * Comportement P1A correct :
     *   UserChecker::checkPreAuth lance AccountDisabledException pour Inactive
     *   → Symfony rejette la requête → 401 → TEST PASSE ✓
     */
    public function testInactiveManagerWithValidJwtIsRejectedWith401(): void
    {
        $container = self::$client->getContainer();

        /** @var EntityManagerInterface $em */
        $em = $container->get('doctrine')->getManager();

        // Passer le manager à Inactive APRÈS avoir obtenu son JWT
        $manager = $em->find(Manager::class, self::$managerId);
        self::assertNotNull($manager, 'Manager doit exister en DB');

        $manager->setStatus(ManagerStatus::Inactive);
        $em->flush();
        $em->clear();

        // Utiliser le JWT (toujours cryptographiquement valide) pour accéder à l'endpoint
        self::$client->request(
            'GET',
            self::BASE_URL.'/'.self::$yearId.'/my-notif-prefs',
            [], [], [
                'HTTP_AUTHORIZATION' => 'Bearer '.self::$tokenActiveManager,
            ]
        );

        self::assertSame(
            401,
            self::$client->getResponse()->getStatusCode(),
            'Un manager Inactive doit obtenir 401 même avec un JWT valide'
        );
    }
}
