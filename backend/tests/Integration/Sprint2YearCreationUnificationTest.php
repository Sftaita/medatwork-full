<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Years;
use App\Entity\YearsWeekIntervals;
use App\Enum\HospitalAdminStatus;
use App\Enum\Sexe;
use App\Enum\YearStatus;
use App\Services\YearsManagement\YearCreationInput;
use App\Services\YearsManagement\YearCreationService;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Sprint 1 — Étape 2 : Unification de la création d'année
 *
 * Cas couverts :
 *   1. Création par Manager autorisé (canCreateYear=true)
 *   2. Refus 403 si Manager sans canCreateYear
 *   3. Création par HospitalAdmin via endpoint dédié
 *   4. YearsWeekIntervals créés dans les deux flux
 *   5. Manager créateur reçoit ManagerYears avec droits complets
 *   6. HospitalAdmin ne reçoit pas de ManagerYears
 *   7. Audit log HospitalAdmin créé
 *   8. Token unique garanti
 *   9. Pas d'état partiel en cas d'hôpital introuvable
 *  10. YearCreationService seul crée bien Years + YearsWeekIntervals
 */
class Sprint2YearCreationUnificationTest extends WebTestCase
{
    private static KernelBrowser $client;

    private static string $managerEmail    = 's2_manager@test.be';
    private static string $managerPassword = 'Password123!';
    private static string $noRightEmail    = 's2_noright@test.be';
    private static string $adminEmail      = 's2_admin@test.be';
    private static string $adminPassword   = 'Password123!';
    private static int    $hospitalId;
    private static int    $managerId;

    // ── Setup ─────────────────────────────────────────────────────────────────

    public static function setUpBeforeClass(): void
    {
        self::$client = static::createClient();
        $container    = self::$client->getContainer();

        /** @var EntityManagerInterface $em */
        $em = $container->get('doctrine')->getManager();

        /** @var UserPasswordHasherInterface $hasher */
        $hasher = $container->get(UserPasswordHasherInterface::class);

        $metadata   = $em->getMetadataFactory()->getAllMetadata();
        $schemaTool = new SchemaTool($em);
        $schemaTool->dropSchema($metadata);
        $schemaTool->createSchema($metadata);

        $em->getConnection()->executeStatement('
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                refresh_token VARCHAR(128) NOT NULL,
                username      VARCHAR(255) NOT NULL,
                valid         DATETIME     NOT NULL,
                UNIQUE (refresh_token)
            )
        ');

        // Hospital
        $hospital = new Hospital();
        $hospital->setName('S2 Hospital');
        $hospital->setCreatedAt(new \DateTime());
        $em->persist($hospital);

        // Manager avec canCreateYear
        $manager = new Manager();
        $manager->setEmail(self::$managerEmail);
        $manager->setFirstname('Manager');
        $manager->setLastname('S2');
        $manager->setRole('manager');
        $manager->setRoles(['ROLE_MANAGER']);
        $manager->setSexe(Sexe::Male);
        $manager->setJob(null);
        $manager->setValidatedAt(new \DateTime());
        $manager->setCanCreateYear(true);
        $manager->setPassword($hasher->hashPassword($manager, self::$managerPassword));
        $manager->setCreatedAt(new \DateTime());
        $manager->addHospital($hospital);
        $em->persist($manager);

        // Manager SANS canCreateYear
        $noRight = new Manager();
        $noRight->setEmail(self::$noRightEmail);
        $noRight->setFirstname('NoRight');
        $noRight->setLastname('S2');
        $noRight->setRole('manager');
        $noRight->setRoles(['ROLE_MANAGER']);
        $noRight->setSexe(Sexe::Female);
        $noRight->setJob(null);
        $noRight->setValidatedAt(new \DateTime());
        $noRight->setCanCreateYear(false);
        $noRight->setPassword($hasher->hashPassword($noRight, 'Password123!'));
        $noRight->setCreatedAt(new \DateTime());
        $em->persist($noRight);

        // HospitalAdmin
        $admin = new HospitalAdmin();
        $admin->setEmail(self::$adminEmail);
        $admin->setFirstname('Admin');
        $admin->setLastname('S2');
        $admin->setRoles(['ROLE_HOSPITAL_ADMIN']);
        $admin->setHospital($hospital);
        $admin->setStatus(HospitalAdminStatus::Active);
        $admin->setPassword($hasher->hashPassword($admin, self::$adminPassword));
        $admin->setValidatedAt(new \DateTime());
        $em->persist($admin);

        $em->flush();

        self::$hospitalId = $hospital->getId();
        self::$managerId  = $manager->getId();
        $em->clear();
    }

    protected function tearDown(): void { /* keep kernel alive */ }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function loginAs(string $email, string $password): string
    {
        self::$client->getCookieJar()->clear();
        self::$client->request(
            'POST', '/api/login_check', [], [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['username' => $email, 'password' => $password]),
        );
        $data = json_decode(self::$client->getResponse()->getContent(), true);
        return (string) ($data['token'] ?? '');
    }

    private function postCreateYear(array $body, string $token): void
    {
        self::$client->request(
            'POST', '/api/managers/years/create', [], [],
            ['HTTP_AUTHORIZATION' => "Bearer $token", 'CONTENT_TYPE' => 'application/json'],
            json_encode($body),
        );
    }

    private function postAdminCreateYear(array $body, string $token): void
    {
        self::$client->request(
            'POST', '/api/hospital-admin/years', [], [],
            ['HTTP_AUTHORIZATION' => "Bearer $token", 'CONTENT_TYPE' => 'application/json'],
            json_encode($body),
        );
    }

    private function validYearBody(int $hospitalId): array
    {
        return [
            'title'       => 'S2 Test Year',
            'speciality'  => 'Urologie',
            'period'      => '2025-2026',
            'dateOfStart' => '2025-11-01',
            'dateOfEnd'   => '2026-04-30',
            'hospitalId'  => $hospitalId,
            'isMaster'    => false,
            'location'    => '',
            'comment'     => '',
        ];
    }

    private function getEm(): EntityManagerInterface
    {
        return self::$client->getContainer()->get('doctrine')->getManager();
    }

    // ── 1. Création par Manager autorisé → 200 ───────────────────────────────

    public function testManagerWithPermissionCanCreateYear(): void
    {
        $token = $this->loginAs(self::$managerEmail, self::$managerPassword);
        $this->postCreateYear($this->validYearBody(self::$hospitalId), $token);

        $this->assertResponseStatusCodeSame(200,
            'Un manager avec canCreateYear=true doit pouvoir créer une année');
    }

    // ── 2. Refus 403 si canCreateYear=false ──────────────────────────────────

    public function testManagerWithoutPermissionGets403(): void
    {
        $token = $this->loginAs(self::$noRightEmail, 'Password123!');
        $this->postCreateYear($this->validYearBody(self::$hospitalId), $token);

        $this->assertResponseStatusCodeSame(403,
            'Un manager sans canCreateYear doit recevoir 403');
    }

    // ── 3. Hôpital introuvable → 400, aucun état partiel ────────────────────

    public function testInvalidHospitalIdReturns400(): void
    {
        $token = $this->loginAs(self::$managerEmail, self::$managerPassword);
        $body  = $this->validYearBody(99999); // ID inexistant
        $this->postCreateYear($body, $token);

        $this->assertResponseStatusCodeSame(400,
            'Un hospitalId inexistant doit retourner 400');

        // Vérifier qu'aucune année n'a été créée avec ce titre
        $em    = $this->getEm();
        $years = $em->getRepository(Years::class)->findBy(['title' => 'S2 Test Year']);
        // Peut avoir 1 (du test 1) mais pas 2
        $this->assertLessThanOrEqual(1, count($years),
            'Aucune année supplémentaire ne doit être créée avec un hospitalId invalide');
    }

    // ── 4. Manager créateur reçoit ManagerYears avec droits complets ─────────

    public function testManagerCreatorReceivesManagerYears(): void
    {
        $em      = $this->getEm();
        $manager = $em->find(Manager::class, self::$managerId);

        $repo     = $em->getRepository(ManagerYears::class);
        $relation = $repo->findOneBy(['manager' => $manager]);

        $this->assertNotNull($relation, 'Le manager créateur doit avoir une ManagerYears');
        $this->assertTrue($relation->getAdmin(), 'Le créateur doit avoir admin=true');
        $this->assertTrue($relation->getDataAccess(), 'Le créateur doit avoir dataAccess=true');
        $this->assertTrue($relation->getDataValidation());
        $this->assertTrue($relation->getDataDownload());
        $this->assertFalse(method_exists($relation, 'getOwner'),
            'getOwner() ne doit plus exister (owner supprimé étape 1)');
    }

    // ── 5. YearsWeekIntervals créés dans le flux Manager ─────────────────────

    public function testManagerFlowCreatesWeekIntervals(): void
    {
        $em    = $this->getEm();
        $years = $em->getRepository(Years::class)->findBy(['title' => 'S2 Test Year']);
        $this->assertNotEmpty($years, 'Au moins une année S2 Test Year doit exister');

        $year      = $years[0];
        $intervals = $em->getRepository(YearsWeekIntervals::class)->findBy(['year' => $year]);

        $this->assertNotEmpty($intervals,
            'Des YearsWeekIntervals doivent être créées dans le flux Manager');
    }

    // ── 6. Création par HospitalAdmin → 201 ──────────────────────────────────

    public function testHospitalAdminCanCreateYear(): void
    {
        $token = $this->loginAs(self::$adminEmail, self::$adminPassword);
        $this->postAdminCreateYear([
            'title'       => 'S2 Admin Year',
            'location'    => 'S2 Hospital',
            'period'      => '2025-2026',
            'dateOfStart' => '2025-11-01',
            'dateOfEnd'   => '2026-04-30',
            'speciality'  => 'Cardiologie',
        ], $token);

        $this->assertResponseStatusCodeSame(201,
            'Un HospitalAdmin doit pouvoir créer une année et recevoir 201');
    }

    // ── 7. HospitalAdmin NE reçoit PAS de ManagerYears ───────────────────────

    public function testHospitalAdminDoesNotReceiveManagerYears(): void
    {
        $em   = $this->getEm();
        $year = $em->getRepository(Years::class)->findOneBy(['title' => 'S2 Admin Year']);

        $this->assertNotNull($year, 'L\'année créée par HospitalAdmin doit exister');

        $relations = $em->getRepository(ManagerYears::class)->findBy(['years' => $year]);
        $this->assertEmpty($relations,
            'Un HospitalAdmin ne doit pas recevoir de ManagerYears — accès via YearAccessVoter');
    }

    // ── 8. YearsWeekIntervals créés dans le flux HospitalAdmin ───────────────

    public function testHospitalAdminFlowCreatesWeekIntervals(): void
    {
        $em   = $this->getEm();
        $year = $em->getRepository(Years::class)->findOneBy(['title' => 'S2 Admin Year']);

        $this->assertNotNull($year);

        $intervals = $em->getRepository(YearsWeekIntervals::class)->findBy(['year' => $year]);
        $this->assertNotEmpty($intervals,
            'Des YearsWeekIntervals doivent être créées dans le flux HospitalAdmin');
    }

    // ── 9. Token unique — deux années ne partagent pas le même token ──────────

    public function testTokenIsUnique(): void
    {
        $em    = $this->getEm();
        $years = $em->getRepository(Years::class)->findAll();

        $tokens = array_map(fn(Years $y) => $y->getToken(), $years);
        $unique = array_unique($tokens);

        $this->assertCount(count($tokens), $unique,
            'Chaque année doit avoir un token unique');
    }

    // ── 10. YearCreationService seul — Years + YearsWeekIntervals ────────────

    public function testYearCreationServiceBuildsYearAndWeekIntervals(): void
    {
        $container = self::$client->getContainer();
        /** @var YearCreationService $service */
        $service = $container->get(YearCreationService::class);
        /** @var EntityManagerInterface $em */
        $em = $container->get('doctrine')->getManager();

        $hospital = $em->find(Hospital::class, self::$hospitalId);

        $input = new YearCreationInput(
            title:       'Service Direct Year',
            speciality:  'Neurologie',
            period:      '2025-2026',
            dateOfStart: '2025-11-01',
            dateOfEnd:   '2026-04-30',
            hospital:    $hospital,
        );

        $year = $service->create($input);
        $em->flush();

        $this->assertNotNull($year->getId(), 'La Years doit avoir un ID après flush');
        $this->assertSame('S2 Hospital', $year->getLocation(),
            'La location doit être le nom de l\'hôpital');

        $intervals = $em->getRepository(YearsWeekIntervals::class)->findBy(['year' => $year]);
        $this->assertNotEmpty($intervals,
            'YearCreationService doit créer des YearsWeekIntervals');

        // Pas de ManagerYears créée par le service lui-même
        $relations = $em->getRepository(ManagerYears::class)->findBy(['years' => $year]);
        $this->assertEmpty($relations,
            'YearCreationService ne doit pas créer de ManagerYears — responsabilité du controller');
    }

    // ── 11. Audit log créé pour HospitalAdmin ────────────────────────────────

    public function testHospitalAdminYearCreationIsAudited(): void
    {
        $em       = $this->getEm();
        $auditLog = $em->getRepository(\App\Entity\HospitalAdminAuditLog::class)->findOneBy([
            'action' => 'create_year',
        ]);

        $this->assertNotNull($auditLog,
            'La création d\'année par HospitalAdmin doit générer un audit log');
        $this->assertStringContainsString('S2 Admin Year', $auditLog->getDescription(),
            'L\'audit log doit mentionner le titre de l\'année');
    }
}
