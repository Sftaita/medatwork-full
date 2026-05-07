<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Hospital;
use App\Entity\Manager;
use App\Entity\PeriodValidation;
use App\Entity\Resident;
use App\Entity\ResidentValidation;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Enum\ManagerJob;
use App\Enum\Sexe;
use App\Enum\YearStatus;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Integration tests — StaffPlannerMonthsController (architecture YearsResident × month).
 *
 * GET /api/hospital-admin/years/{yearId}/staff-planner-months
 *   - 401 sans token
 *   - 200 hospital_admin, 200 HR manager, 403 doctor manager
 *   - 404 année inconnue, 403 autre hôpital
 *   - Structure : month, calendarYear, label, items[]
 *   - Tous les MACCS actifs apparaissent même sans ResidentValidation
 *   - validatedByMds = ResidentValidation.validated (false si pas de RV)
 *   - treated = false par défaut
 *
 * PATCH /api/hospital-admin/staff-planner-items/{yrId}/{month}/{calYear}/treated
 *   - 401 sans token, 200 treated true/false, 404 yrId inconnu, 400 corps invalide
 *
 * JWT — champ job pour Manager
 */
class StaffPlannerMonthsTest extends WebTestCase
{
    private static KernelBrowser $client;
    private static string $adminEmail     = 'sp3_admin@test.be';
    private static string $adminPassword  = 'AdminPass123!';
    private static string $hrEmail        = 'sp3_hr@test.be';
    private static string $hrPassword     = 'HRPass123!';
    private static string $doctorEmail    = 'sp3_doctor@test.be';
    private static string $doctorPassword = 'DoctorPass123!';
    private static int $yearId;
    private static int $otherYearId;
    private static int $yrId1;   // Alice — avec ResidentValidation validated=true
    private static int $yrId2;   // Bob   — SANS ResidentValidation

    public static function setUpBeforeClass(): void
    {
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
        $hospital->setName('SP3 Hospital')->setCreatedAt(new \DateTime());
        $em->persist($hospital);

        $otherHospital = new Hospital();
        $otherHospital->setName('SP3 Other')->setCreatedAt(new \DateTime());
        $em->persist($otherHospital);

        $admin = new Manager();
        $admin->setEmail(self::$adminEmail)->setFirstname('Admin')->setLastname('SP3');
        $admin->setRole('manager')->setRoles(['ROLE_MANAGER']);
        $admin->setSexe(Sexe::Male)->setJob(null);
        $admin->setValidatedAt(new \DateTime());
        $admin->setPassword($hasher->hashPassword($admin, self::$adminPassword));
        $admin->setAdminHospital($hospital);
        $em->persist($admin);

        $hr = new Manager();
        $hr->setEmail(self::$hrEmail)->setFirstname('HR')->setLastname('SP3');
        $hr->setRole('manager')->setRoles(['ROLE_MANAGER']);
        $hr->setSexe(Sexe::Female)->setJob(ManagerJob::HumanResources);
        $hr->setValidatedAt(new \DateTime());
        $hr->setPassword($hasher->hashPassword($hr, self::$hrPassword));
        $hr->addHospital($hospital);
        $em->persist($hr);

        $doctor = new Manager();
        $doctor->setEmail(self::$doctorEmail)->setFirstname('Dr')->setLastname('SP3');
        $doctor->setRole('manager')->setRoles(['ROLE_MANAGER']);
        $doctor->setSexe(Sexe::Male)->setJob(ManagerJob::Doctor);
        $doctor->setValidatedAt(new \DateTime());
        $doctor->setPassword($hasher->hashPassword($doctor, self::$doctorPassword));
        $doctor->addHospital($hospital);
        $em->persist($doctor);

        // Year A — Nov 2024 → Jan 2025
        $year = new Years();
        $year->setTitle('SP3 Year')->setLocation('Test')->setPeriod('2024-2025');
        $year->setDateOfStart(new \DateTime('2024-11-01'));
        $year->setDateOfEnd(new \DateTime('2025-01-31'));
        $year->setStatus(YearStatus::Active)->setHospital($hospital);
        $year->setCreatedAt(new \DateTime())->setToken(bin2hex(random_bytes(5)));
        $em->persist($year);

        // Year B (other hospital)
        $otherYear = new Years();
        $otherYear->setTitle('Other Year')->setLocation('Other')->setPeriod('2024-2025');
        $otherYear->setDateOfStart(new \DateTime('2024-11-01'));
        $otherYear->setDateOfEnd(new \DateTime('2024-11-30'));
        $otherYear->setStatus(YearStatus::Active)->setHospital($otherHospital);
        $otherYear->setCreatedAt(new \DateTime())->setToken(bin2hex(random_bytes(5)));
        $em->persist($otherYear);

        $em->flush();

        // Resident 1 — Alice (with ResidentValidation validated=true)
        $r1 = new Resident();
        $r1->setEmail('sp3_r1@test.be')->setFirstname('Alice')->setLastname('Martin');
        $r1->setRole('resident')->setRoles(['ROLE_RESIDENT'])->setSexe(Sexe::Female);
        $r1->setDateOfMaster(new \DateTime('2020-06-01'));
        $r1->setValidatedAt(new \DateTime());
        $r1->setPassword($hasher->hashPassword($r1, 'R1Pass!'));
        $em->persist($r1);

        $yr1 = new YearsResident();
        $yr1->setYear($year)->setResident($r1)->setAllowed(true)->setCreatedAt(new \DateTime());
        $em->persist($yr1);

        $pv = new PeriodValidation();
        $pv->setYear($year)->setMonth(11)->setYearNb(2024)->setValidated(true);
        $em->persist($pv);

        $rv = new ResidentValidation();
        $rv->setPeriodValidation($pv)->setResident($r1)->setValidated(true);
        $em->persist($rv);

        // Resident 2 — Bob (NO ResidentValidation — but still appears)
        $r2 = new Resident();
        $r2->setEmail('sp3_r2@test.be')->setFirstname('Bob')->setLastname('Dupont');
        $r2->setRole('resident')->setRoles(['ROLE_RESIDENT'])->setSexe(Sexe::Male);
        $r2->setDateOfMaster(new \DateTime('2020-06-01'));
        $r2->setValidatedAt(new \DateTime());
        $r2->setPassword($hasher->hashPassword($r2, 'R2Pass!'));
        $em->persist($r2);

        $yr2 = new YearsResident();
        $yr2->setYear($year)->setResident($r2)->setAllowed(true)->setCreatedAt(new \DateTime());
        $em->persist($yr2);
        // No PeriodValidation or ResidentValidation for Bob

        $em->flush();

        self::$yearId      = $year->getId();
        self::$otherYearId = $otherYear->getId();
        self::$yrId1       = $yr1->getId();
        self::$yrId2       = $yr2->getId();
        $em->clear();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private string $token = '';

    private function login(string $email, string $password): void
    {
        self::$client->request('POST', '/api/login_check', [], [], ['CONTENT_TYPE' => 'application/json'],
            json_encode(['username' => $email, 'password' => $password]) ?: '{}');
        self::assertEquals(200, self::$client->getResponse()->getStatusCode(), "Login failed for $email");
        $this->token = json_decode(self::$client->getResponse()->getContent(), true)['token'] ?? '';
    }

    /** @return array<mixed> */
    private function jsonGet(string $url): array
    {
        self::$client->request('GET', $url, [], [], [
            'HTTP_ACCEPT'        => 'application/json',
            'HTTP_AUTHORIZATION' => 'Bearer ' . $this->token,
        ]);
        return json_decode(self::$client->getResponse()->getContent(), true) ?? [];
    }

    private function jsonPatch(string $url, array $body): void
    {
        self::$client->request('PATCH', $url, [], [], [
            'CONTENT_TYPE'       => 'application/json',
            'HTTP_AUTHORIZATION' => 'Bearer ' . $this->token,
        ], json_encode($body) ?: '{}');
    }

    private function monthsUrl(): string
    {
        return '/api/hospital-admin/years/' . self::$yearId . '/staff-planner-months';
    }

    private function patchUrl(int $yrId, int $month, int $calYear): string
    {
        return "/api/hospital-admin/staff-planner-items/{$yrId}/{$month}/{$calYear}/treated";
    }

    // ── GET — accès ───────────────────────────────────────────────────────────

    public function testGetMonths401WithoutToken(): void
    {
        self::$client->request('GET', $this->monthsUrl());
        $this->assertEquals(401, self::$client->getResponse()->getStatusCode());
    }

    public function testGetMonths200ForHospitalAdmin(): void
    {
        $this->login(self::$adminEmail, self::$adminPassword);
        $this->jsonGet($this->monthsUrl());
        $this->assertEquals(200, self::$client->getResponse()->getStatusCode());
    }

    public function testGetMonths200ForHRManager(): void
    {
        $this->login(self::$hrEmail, self::$hrPassword);
        $this->jsonGet($this->monthsUrl());
        $this->assertEquals(200, self::$client->getResponse()->getStatusCode());
    }

    public function testGetMonths403ForDoctorManager(): void
    {
        $this->login(self::$doctorEmail, self::$doctorPassword);
        $this->jsonGet($this->monthsUrl());
        $this->assertEquals(403, self::$client->getResponse()->getStatusCode());
    }

    public function testGetMonths404ForUnknownYear(): void
    {
        $this->login(self::$adminEmail, self::$adminPassword);
        $this->jsonGet('/api/hospital-admin/years/99999/staff-planner-months');
        $this->assertEquals(404, self::$client->getResponse()->getStatusCode());
    }

    public function testGetMonths403ForOtherHospital(): void
    {
        $this->login(self::$adminEmail, self::$adminPassword);
        $this->jsonGet('/api/hospital-admin/years/' . self::$otherYearId . '/staff-planner-months');
        $this->assertEquals(403, self::$client->getResponse()->getStatusCode());
    }

    // ── GET — structure ───────────────────────────────────────────────────────

    public function testGetMonthsReturns3Months(): void
    {
        $this->login(self::$adminEmail, self::$adminPassword);
        $data = $this->jsonGet($this->monthsUrl());
        $this->assertCount(3, $data); // nov, dec, jan
    }

    public function testNovemberContainsBothMaccs(): void
    {
        $this->login(self::$adminEmail, self::$adminPassword);
        $data = $this->jsonGet($this->monthsUrl());
        $nov  = current(array_filter($data, fn($m) => $m['month'] === 11 && $m['calendarYear'] === 2024));
        $this->assertCount(2, $nov['items']); // Alice + Bob
    }

    public function testBobAppearsWithoutResidentValidation(): void
    {
        $this->login(self::$adminEmail, self::$adminPassword);
        $data = $this->jsonGet($this->monthsUrl());
        $nov  = current(array_filter($data, fn($m) => $m['month'] === 11));
        $bob  = current(array_filter($nov['items'], fn($i) => $i['yearResidentId'] === self::$yrId2));
        $this->assertNotFalse($bob);
        $this->assertNull($bob['residentValidationId']);
        $this->assertFalse($bob['validatedByMds']);
    }

    public function testAliceHasValidatedByMdsTrue(): void
    {
        $this->login(self::$adminEmail, self::$adminPassword);
        $data = $this->jsonGet($this->monthsUrl());
        $nov  = current(array_filter($data, fn($m) => $m['month'] === 11));
        $alice = current(array_filter($nov['items'], fn($i) => $i['yearResidentId'] === self::$yrId1));
        $this->assertNotFalse($alice);
        $this->assertTrue($alice['validatedByMds']);
        $this->assertNotNull($alice['residentValidationId']);
    }

    public function testTreatedFalseByDefault(): void
    {
        $this->login(self::$adminEmail, self::$adminPassword);
        $data = $this->jsonGet($this->monthsUrl());
        $nov  = current(array_filter($data, fn($m) => $m['month'] === 11));
        foreach ($nov['items'] as $item) {
            $this->assertFalse($item['treated']);
        }
    }

    public function testLabelsInFrench(): void
    {
        $this->login(self::$adminEmail, self::$adminPassword);
        $data   = $this->jsonGet($this->monthsUrl());
        $labels = array_column($data, 'label');
        $this->assertContains('Novembre 2024', $labels);
        $this->assertContains('Décembre 2024', $labels);
        $this->assertContains('Janvier 2025', $labels);
    }

    public function testItemHasExpectedFields(): void
    {
        $this->login(self::$adminEmail, self::$adminPassword);
        $data = $this->jsonGet($this->monthsUrl());
        $nov  = current(array_filter($data, fn($m) => $m['month'] === 11));
        $item = $nov['items'][0];
        foreach (['yearResidentId', 'residentValidationId', 'residentId', 'residentFirstname',
                  'residentLastname', 'residentEmail', 'validatedByMds', 'treated', 'treatedAt', 'treatedByType'] as $field) {
            $this->assertArrayHasKey($field, $item);
        }
    }

    // ── PATCH treated ─────────────────────────────────────────────────────────

    public function testPatch401WithoutToken(): void
    {
        self::$client->request('PATCH', $this->patchUrl(self::$yrId1, 11, 2024), [], [],
            ['CONTENT_TYPE' => 'application/json'], '{"treated":true}');
        $this->assertEquals(401, self::$client->getResponse()->getStatusCode());
    }

    public function testPatchTreatedTrue(): void
    {
        $this->login(self::$adminEmail, self::$adminPassword);
        $this->jsonPatch($this->patchUrl(self::$yrId2, 11, 2024), ['treated' => true]);
        $this->assertEquals(200, self::$client->getResponse()->getStatusCode());
        $data = json_decode(self::$client->getResponse()->getContent(), true);
        $this->assertTrue($data['treated']);
        $this->assertSame('manager', $data['treatedByType']);
    }

    public function testPatchTreatedFalseClearsFields(): void
    {
        $this->login(self::$adminEmail, self::$adminPassword);
        $this->jsonPatch($this->patchUrl(self::$yrId2, 12, 2024), ['treated' => true]);
        $this->jsonPatch($this->patchUrl(self::$yrId2, 12, 2024), ['treated' => false]);
        $data = json_decode(self::$client->getResponse()->getContent(), true);
        $this->assertFalse($data['treated']);
        $this->assertNull($data['treatedAt']);
    }

    public function testPatchReflectsInGet(): void
    {
        $this->login(self::$adminEmail, self::$adminPassword);
        $this->jsonPatch($this->patchUrl(self::$yrId1, 1, 2025), ['treated' => true]);
        $data = $this->jsonGet($this->monthsUrl());
        $jan  = current(array_filter($data, fn($m) => $m['month'] === 1 && $m['calendarYear'] === 2025));
        $alice = current(array_filter($jan['items'], fn($i) => $i['yearResidentId'] === self::$yrId1));
        $this->assertTrue($alice['treated']);
    }

    public function testPatch404ForUnknownYr(): void
    {
        $this->login(self::$adminEmail, self::$adminPassword);
        $this->jsonPatch($this->patchUrl(99999, 11, 2024), ['treated' => true]);
        $this->assertEquals(404, self::$client->getResponse()->getStatusCode());
    }

    public function testPatch400MissingTreatedField(): void
    {
        $this->login(self::$adminEmail, self::$adminPassword);
        self::$client->request('PATCH', $this->patchUrl(self::$yrId1, 11, 2024), [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer ' . $this->token,
        ], '{}');
        $this->assertEquals(400, self::$client->getResponse()->getStatusCode());
    }

    // ── JWT ───────────────────────────────────────────────────────────────────

    public function testJwtContainsJobForHRManager(): void
    {
        self::$client->request('POST', '/api/login_check', [], [], ['CONTENT_TYPE' => 'application/json'],
            json_encode(['username' => self::$hrEmail, 'password' => self::$hrPassword]) ?: '{}');
        $body = json_decode(self::$client->getResponse()->getContent(), true);
        $this->assertSame('human resources', $body['job']);
    }

    public function testJwtJobNullForManagerWithoutJob(): void
    {
        self::$client->request('POST', '/api/login_check', [], [], ['CONTENT_TYPE' => 'application/json'],
            json_encode(['username' => self::$adminEmail, 'password' => self::$adminPassword]) ?: '{}');
        $body = json_decode(self::$client->getResponse()->getContent(), true);
        $this->assertNull($body['job']);
    }
}
