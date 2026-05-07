<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Hospital;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Years;
use App\Enum\ManagerJob;
use App\Enum\Sexe;
use App\Enum\YearStatus;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Integration — orphaned manager_years row must not crash hospital-admin endpoints.
 *
 * Regression test for the bug where a Manager row was hard-deleted from the DB
 * while the corresponding manager_years row remained.  Doctrine's lazy-loader then
 * threw EntityNotFoundException the first time a manager property was accessed,
 * which propagated as HTTP 500.
 *
 * Setup (once per class):
 *   - hospital + admin-manager (used for authentication)
 *   - year linked to that hospital
 *   - admin-manager linked to the year via manager_years
 *   - orphaned manager_years row: manager_id points to a non-existent manager
 *
 * The orphaned row is inserted via raw SQL with FK enforcement off so the test
 * works regardless of whether the DBAL driver enforces foreign keys.
 */
class HospitalAdminOrphanTest extends WebTestCase
{
    private static KernelBrowser $client;
    private static string $adminEmail    = 'ha_orphan_admin@test.be';
    private static string $adminPassword = 'Password123!';

    // ── Fixtures ──────────────────────────────────────────────────────────────

    public static function setUpBeforeClass(): void
    {
        self::$client = static::createClient();

        $container = self::$client->getContainer();
        /** @var EntityManagerInterface $em */
        $em = $container->get('doctrine')->getManager();

        // Reset schema.
        $metadata   = $em->getMetadataFactory()->getAllMetadata();
        $schemaTool = new SchemaTool($em);
        $schemaTool->dropSchema($metadata);
        $schemaTool->createSchema($metadata);

        // Lexik RefreshToken is a mapped superclass — create the table manually.
        $em->getConnection()->executeStatement('
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                refresh_token VARCHAR(128) NOT NULL,
                username      VARCHAR(255) NOT NULL,
                valid         DATETIME     NOT NULL,
                UNIQUE (refresh_token)
            )
        ');

        /** @var UserPasswordHasherInterface $hasher */
        $hasher = $container->get(UserPasswordHasherInterface::class);

        // Hospital
        $hospital = new Hospital();
        $hospital->setName('Orphan Test Hospital');
        $hospital->setCreatedAt(new \DateTime());
        $em->persist($hospital);

        // Admin manager — has adminHospital set → getRoles() includes ROLE_HOSPITAL_ADMIN.
        $adminManager = new Manager();
        $adminManager->setEmail(self::$adminEmail);
        $adminManager->setFirstname('Admin');
        $adminManager->setLastname('Orphan');
        $adminManager->setRole('manager');
        $adminManager->setRoles(['ROLE_MANAGER']);
        $adminManager->setSexe(Sexe::Female);
        $adminManager->setJob(null);
        $adminManager->setValidatedAt(new \DateTime());
        $adminManager->setPassword($hasher->hashPassword($adminManager, self::$adminPassword));
        $adminManager->setAdminHospital($hospital);
        $em->persist($adminManager);

        // Year
        $year = new Years();
        $year->setTitle('Orphan Year 2025');
        $year->setLocation('Test Location');
        $year->setPeriod('2025');
        $year->setDateOfStart(new \DateTime('2025-01-01'));
        $year->setDateOfEnd(new \DateTime('2025-12-31'));
        $year->setStatus(YearStatus::Active);
        $year->setHospital($hospital);
        $year->setCreatedAt(new \DateTime());
        $year->setToken(bin2hex(random_bytes(5)));
        $em->persist($year);

        $em->flush();

        // Link admin-manager to year (valid entry — must survive orphan scenario).
        $myAdmin = new ManagerYears();
        $myAdmin->setManager($adminManager);
        $myAdmin->setYears($year);
        $myAdmin->setOwner(true);
        $myAdmin->setAdmin(true);
        $myAdmin->setDataAccess(true);
        $myAdmin->setDataValidation(true);
        $myAdmin->setDataDownload(true);
        $myAdmin->setInvitedAt(new \DateTimeImmutable());
        $em->persist($myAdmin);
        $em->flush();

        // Insert a manager_years row whose manager_id doesn't exist — simulates a
        // manager that was hard-deleted from the DB leaving the join row behind.
        // Disable FK enforcement temporarily so SQLite accepts the orphaned row.
        $conn    = $em->getConnection();
        $yearId  = $year->getId();
        $conn->executeStatement('PRAGMA foreign_keys = OFF');
        $conn->executeStatement(
            'INSERT INTO manager_years
                 (manager_id, years_id, owner, admin, data_access, data_validation, data_download)
             VALUES (99999, ?, 0, 0, 1, 0, 1)',
            [$yearId],
        );
        $conn->executeStatement('PRAGMA foreign_keys = ON');

        // Clear the identity map so Doctrine has to hit the DB when lazy-loading.
        // Without this, cached objects could mask the missing row.
        $em->clear();
    }

    protected function tearDown(): void
    {
        // Do NOT call parent::tearDown() — it would shut down the kernel and destroy
        // the SQLite in-memory DB, breaking subsequent tests in this class.
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function loginAndGetToken(): string
    {
        self::$client->getCookieJar()->clear();
        self::$client->request(
            'POST',
            '/api/login_check',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            (string) json_encode([
                'username' => self::$adminEmail,
                'password' => self::$adminPassword,
            ]),
        );

        $data = json_decode((string) self::$client->getResponse()->getContent(), true);
        return (string) ($data['token'] ?? '');
    }

    private function authedGet(string $path): void
    {
        $token = $this->loginAndGetToken();
        self::$client->request(
            'GET',
            $path,
            [],
            [],
            [
                'HTTP_AUTHORIZATION' => "Bearer $token",
                'CONTENT_TYPE'       => 'application/json',
            ],
        );
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function testAdminCanLoginDespiteOrphanedManagerYearsRow(): void
    {
        self::$client->getCookieJar()->clear();
        self::$client->request(
            'POST',
            '/api/login_check',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            (string) json_encode([
                'username' => self::$adminEmail,
                'password' => self::$adminPassword,
            ]),
        );

        $this->assertResponseIsSuccessful();
        $data = json_decode((string) self::$client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('token', $data);
        $this->assertSame('hospital_admin', $data['role'] ?? null);
    }

    public function testListYearsReturns200WithOrphanedManagerYearsRow(): void
    {
        $this->authedGet('/api/hospital-admin/years');

        $this->assertResponseStatusCodeSame(200, 'listYears() must return 200 even with an orphaned manager_years row');
    }

    public function testListYearsOmitsOrphanedManagerFromOutput(): void
    {
        $this->authedGet('/api/hospital-admin/years');

        $years = json_decode((string) self::$client->getResponse()->getContent(), true);

        $this->assertCount(1, $years);
        $managers = $years[0]['managers'];

        // Only the admin manager (firstname 'Admin') should appear — not the ghost.
        $firstnames = array_column($managers, 'firstname');
        $this->assertContains('Admin', $firstnames);

        // managerCount reflects the raw collection size (includes orphaned row);
        // the serialised 'managers' array must only contain resolvable entries.
        $this->assertCount(1, $managers, 'Orphaned manager_years must be excluded from serialised output');
    }

    public function testDashboardStatsReturns200WithOrphanedManagerYearsRow(): void
    {
        $this->authedGet('/api/hospital-admin/dashboard/stats');

        $this->assertResponseStatusCodeSame(200, 'dashboardStats() must return 200 even with an orphaned manager_years row');
    }

    public function testDashboardStatsDoesNotCountOrphanedManager(): void
    {
        $this->authedGet('/api/hospital-admin/dashboard/stats');

        $data = json_decode((string) self::$client->getResponse()->getContent(), true);

        // The admin-manager (active, token=null) counts as 1.
        // The orphaned manager_years row must be skipped → total stays at 1.
        $this->assertSame(1, $data['managers']['total'], 'Only resolvable managers should be counted');
    }
}
