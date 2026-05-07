<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Hospital;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Resident;
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
 * Consistency test — pendingInvites in dashboardStats must equal
 * count(pending residents, all years) + count(pending managers, all years).
 *
 * This test documents and guards the contract between the three endpoints:
 *   GET /api/hospital-admin/dashboard/stats   → stats.pendingInvites
 *   GET /api/hospital-admin/residents?mode=current|history  → filter status=pending
 *   GET /api/hospital-admin/managers?mode=current|history   → filter status=pending
 *
 * Root cause of the previous discrepancy:
 *   dashboard/stats counts pending across ALL years (no date filter), but the
 *   frontend was only fetching mode=current in the modal.  The fix is to fetch
 *   both modes and sum them — this test verifies the math holds.
 *
 * Fixtures (created once for the class):
 *   - 1 hospital + 1 admin-manager (used for auth)
 *   - 1 current year (dateOfEnd in the future)
 *   - 1 historical year (dateOfEnd in the past)
 *   - 2 pending MACCS in current year + 1 pending MACCS in historical year
 *   - 1 pending manager in current year  + 1 pending manager in historical year
 *   → dashboardStats.pendingInvites must equal 5
 *   → list endpoints (current + history) must also sum to 5
 */
class HospitalAdminPendingConsistencyTest extends WebTestCase
{
    private static KernelBrowser $client;
    private static string $adminEmail    = 'cons_admin@test.be';
    private static string $adminPassword = 'Password123!';

    // ── Fixtures ──────────────────────────────────────────────────────────────

    public static function setUpBeforeClass(): void
    {
        self::$client = static::createClient();

        $container = self::$client->getContainer();
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
                username      VARCHAR(255) NOT NULL,
                valid         DATETIME     NOT NULL,
                UNIQUE (refresh_token)
            )
        ');

        /** @var UserPasswordHasherInterface $hasher */
        $hasher = $container->get(UserPasswordHasherInterface::class);

        // Hospital
        $hospital = new Hospital();
        $hospital->setName('Consistency Test Hospital');
        $hospital->setCreatedAt(new \DateTime());
        $em->persist($hospital);

        // Admin manager (ROLE_HOSPITAL_ADMIN via adminHospital)
        $adminManager = new Manager();
        $adminManager->setEmail(self::$adminEmail);
        $adminManager->setFirstname('Cons');
        $adminManager->setLastname('Admin');
        $adminManager->setRole('manager');
        $adminManager->setRoles(['ROLE_MANAGER']);
        $adminManager->setSexe(Sexe::Female);
        $adminManager->setJob(null);
        $adminManager->setValidatedAt(new \DateTime());
        $adminManager->setPassword($hasher->hashPassword($adminManager, self::$adminPassword));
        $adminManager->setAdminHospital($hospital);
        $em->persist($adminManager);

        // Current year — dateOfEnd in the future
        $currentYear = new Years();
        $currentYear->setTitle('Cons Current Year');
        $currentYear->setLocation('Test');
        $currentYear->setPeriod('2025-2026');
        $currentYear->setDateOfStart(new \DateTime('-30 days'));
        $currentYear->setDateOfEnd(new \DateTime('+300 days'));
        $currentYear->setStatus(YearStatus::Active);
        $currentYear->setHospital($hospital);
        $currentYear->setCreatedAt(new \DateTime());
        $currentYear->setToken(bin2hex(random_bytes(5)));
        $em->persist($currentYear);

        // Historical year — dateOfEnd in the past
        $historicalYear = new Years();
        $historicalYear->setTitle('Cons Historical Year');
        $historicalYear->setLocation('Test');
        $historicalYear->setPeriod('2023-2024');
        $historicalYear->setDateOfStart(new \DateTime('-400 days'));
        $historicalYear->setDateOfEnd(new \DateTime('-35 days'));
        $historicalYear->setStatus(YearStatus::Closed);
        $historicalYear->setHospital($hospital);
        $historicalYear->setCreatedAt(new \DateTime());
        $historicalYear->setToken(bin2hex(random_bytes(5)));
        $em->persist($historicalYear);

        $em->flush();

        // ── 2 pending MACCS in current year ──────────────────────────────────
        self::addPendingResident($em, $hasher, $hospital, $currentYear, 'pending1@test.be');
        self::addPendingResident($em, $hasher, $hospital, $currentYear, 'pending2@test.be');

        // ── 1 pending MACCS in historical year ───────────────────────────────
        self::addPendingResident($em, $hasher, $hospital, $historicalYear, 'pending3@test.be');

        // ── 1 pending manager in current year ────────────────────────────────
        self::addPendingManager($em, $hasher, $hospital, $currentYear, 'mgr_pending1@test.be');

        // ── 1 pending manager in historical year ─────────────────────────────
        self::addPendingManager($em, $hasher, $hospital, $historicalYear, 'mgr_pending2@test.be');

        $em->flush();
        $em->clear();
    }

    // ── Fixture helpers ───────────────────────────────────────────────────────

    private static function addPendingResident(
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher,
        Hospital $hospital,
        Years $year,
        string $email,
    ): void {
        $resident = new Resident();
        $resident->setEmail($email);
        $resident->setFirstname('Pending');
        $resident->setLastname('MACCS');
        $resident->setRole('resident');
        $resident->setRoles(['ROLE_RESIDENT']);
        $resident->setSexe(Sexe::Female);
        $resident->setDateOfMaster(new \DateTime('1900-01-01'));
        $resident->setCreatedAt(new \DateTime());
        // Token set → pending (invitation sent, not yet activated)
        $resident->setToken(bin2hex(random_bytes(32)));
        $resident->setTokenExpiration(new \DateTime('+7 days'));
        $resident->setPassword($hasher->hashPassword($resident, bin2hex(random_bytes(16))));
        $em->persist($resident);
        $em->flush();

        $yr = new YearsResident();
        $yr->setYear($year);
        $yr->setResident($resident);
        $yr->setAllowed(true);
        $yr->setCreatedAt(new \DateTime());
        $em->persist($yr);
    }

    private static function addPendingManager(
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher,
        Hospital $hospital,
        Years $year,
        string $email,
    ): void {
        $manager = new Manager();
        $manager->setEmail($email);
        $manager->setFirstname('Pending');
        $manager->setLastname('Manager');
        $manager->setRole('manager');
        $manager->setRoles(['ROLE_MANAGER']);
        $manager->setSexe(Sexe::Male);
        $manager->setJob(null);
        $manager->setCreatedAt(new \DateTime());
        // Token set → pending (invitation sent, not yet activated)
        $manager->setToken(bin2hex(random_bytes(32)));
        $manager->setTokenExpiration(new \DateTime('+48 hours'));
        $manager->setPassword($hasher->hashPassword($manager, bin2hex(random_bytes(16))));
        $em->persist($manager);
        $em->flush();

        $my = new ManagerYears();
        $my->setManager($manager);
        $my->setYears($year);
        $my->setOwner(false);
        $my->setAdmin(false);
        $my->setDataAccess(true);
        $my->setDataValidation(false);
        $my->setDataDownload(true);
        $my->setInvitedAt(new \DateTimeImmutable());
        $em->persist($my);
    }

    protected function tearDown(): void { /* Keep kernel alive for the shared SQLite DB */ }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function loginAndGetToken(): string
    {
        self::$client->getCookieJar()->clear();
        self::$client->request(
            'POST', '/api/login_check', [], [],
            ['CONTENT_TYPE' => 'application/json'],
            (string) json_encode(['username' => self::$adminEmail, 'password' => self::$adminPassword]),
        );
        $data = json_decode((string) self::$client->getResponse()->getContent(), true);
        return (string) ($data['token'] ?? '');
    }

    private function authedGet(string $path, string $token): array
    {
        self::$client->request(
            'GET', $path, [], [],
            ['HTTP_AUTHORIZATION' => "Bearer $token", 'CONTENT_TYPE' => 'application/json'],
        );
        $this->assertResponseIsSuccessful();
        return json_decode((string) self::$client->getResponse()->getContent(), true) ?? [];
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    /**
     * Core consistency test:
     * dashboard.pendingInvites  ==  sum of pending across both list endpoints.
     *
     * This is the guard that prevents the "9 in KPI, 2 in modal" discrepancy
     * from recurring: if dashboardStats counts differently than the list
     * endpoints, this test will fail and force the team to reconcile them.
     */
    public function testDashboardPendingInvitesMatchesSumOfListEndpoints(): void
    {
        $token = $this->loginAndGetToken();

        $stats = $this->authedGet('/api/hospital-admin/dashboard/stats', $token);

        $rCurrent = $this->authedGet('/api/hospital-admin/residents?mode=current', $token);
        $rHistory = $this->authedGet('/api/hospital-admin/residents?mode=history', $token);
        $mCurrent = $this->authedGet('/api/hospital-admin/managers?mode=current',  $token);
        $mHistory = $this->authedGet('/api/hospital-admin/managers?mode=history',  $token);

        $pendingFromLists =
            count(array_filter($rCurrent, fn($r) => $r['status'] === 'pending')) +
            count(array_filter($rHistory, fn($r) => $r['status'] === 'pending')) +
            count(array_filter($mCurrent, fn($m) => $m['status'] === 'pending')) +
            count(array_filter($mHistory, fn($m) => $m['status'] === 'pending'));

        $this->assertSame(
            $stats['pendingInvites'],
            $pendingFromLists,
            'dashboard.pendingInvites must equal the sum of status=pending across ' .
            'listResidents(current+history) + listManagers(current+history)',
        );
    }

    /**
     * Explicit count check — prevents fixture drift from silently masking failures.
     */
    public function testExpectedPendingCountIs5(): void
    {
        $token = $this->loginAndGetToken();
        $stats = $this->authedGet('/api/hospital-admin/dashboard/stats', $token);

        // 2 pending MACCS (current) + 1 pending MACCS (history)
        // + 1 pending manager (current) + 1 pending manager (history) = 5
        $this->assertSame(5, $stats['pendingInvites']);
        $this->assertSame(3, $stats['maccs']['pending']);
        $this->assertSame(2, $stats['managers']['pending']);
    }

    /**
     * mode=current only sees current-year pending people (not historical).
     */
    public function testCurrentModeExcludesHistoricalPending(): void
    {
        $token = $this->loginAndGetToken();

        $rCurrent = $this->authedGet('/api/hospital-admin/residents?mode=current', $token);
        $mCurrent = $this->authedGet('/api/hospital-admin/managers?mode=current',  $token);

        $pendingResCurrent = count(array_filter($rCurrent, fn($r) => $r['status'] === 'pending'));
        $pendingMgrCurrent = count(array_filter($mCurrent, fn($m) => $m['status'] === 'pending'));

        // Current year has 2 pending MACCS + 1 pending manager
        $this->assertSame(2, $pendingResCurrent, 'Current mode must return 2 pending MACCS');
        $this->assertSame(1, $pendingMgrCurrent, 'Current mode must return 1 pending manager');

        // Current-only sum (3) must be LESS than dashboard total (5) since history is omitted
        $dashboardTotal = $this->authedGet('/api/hospital-admin/dashboard/stats', $token)['pendingInvites'];
        $this->assertLessThan(
            $dashboardTotal,
            $pendingResCurrent + $pendingMgrCurrent,
            'mode=current alone must not cover all pending — historical ones must be missing',
        );
    }

    /**
     * mode=current + mode=history together must equal dashboard total.
     */
    public function testCurrentPlusHistoryEqualsDashboard(): void
    {
        $token = $this->loginAndGetToken();

        $rCur = $this->authedGet('/api/hospital-admin/residents?mode=current', $token);
        $rHis = $this->authedGet('/api/hospital-admin/residents?mode=history', $token);
        $mCur = $this->authedGet('/api/hospital-admin/managers?mode=current',  $token);
        $mHis = $this->authedGet('/api/hospital-admin/managers?mode=history',  $token);

        $combined =
            count(array_filter($rCur, fn($r) => $r['status'] === 'pending')) +
            count(array_filter($rHis, fn($r) => $r['status'] === 'pending')) +
            count(array_filter($mCur, fn($m) => $m['status'] === 'pending')) +
            count(array_filter($mHis, fn($m) => $m['status'] === 'pending'));

        $stats = $this->authedGet('/api/hospital-admin/dashboard/stats', $token);
        $this->assertSame($stats['pendingInvites'], $combined);
    }

    /**
     * accountActivated field — MACCS.
     *
     * All pending MACCS in the fixtures are brand-new (never logged in):
     * accountActivated must be false.
     */
    public function testPendingMaccsHaveAccountActivatedFalse(): void
    {
        $token = $this->loginAndGetToken();

        $allResidents = array_merge(
            $this->authedGet('/api/hospital-admin/residents?mode=current', $token),
            $this->authedGet('/api/hospital-admin/residents?mode=history', $token),
        );

        foreach (array_filter($allResidents, fn($r) => $r['status'] === 'pending') as $r) {
            $this->assertFalse(
                $r['accountActivated'],
                "A brand-new pending MACCS must have accountActivated=false (email: {$r['email']})",
            );
        }
    }

    /**
     * accountActivated field — managers.
     *
     * The pending managers in the fixtures were created without validatedAt → accountActivated=false.
     * This test also documents the expected format of the field so a future
     * "existing-manager-pending-year" scenario can be distinguished.
     */
    public function testPendingManagersHaveAccountActivatedField(): void
    {
        $token = $this->loginAndGetToken();

        $allManagers = array_merge(
            $this->authedGet('/api/hospital-admin/managers?mode=current', $token),
            $this->authedGet('/api/hospital-admin/managers?mode=history', $token),
        );

        foreach ($allManagers as $m) {
            $this->assertArrayHasKey('accountActivated', $m, 'Every manager row must expose accountActivated');
            $this->assertIsBool($m['accountActivated']);
        }

        // All pending managers in the fixtures have validatedAt=null → accountActivated=false
        foreach (array_filter($allManagers, fn($m) => $m['status'] === 'pending') as $m) {
            $this->assertFalse(
                $m['accountActivated'],
                "Pending manager with no validatedAt must have accountActivated=false (email: {$m['email']})",
            );
        }
    }

    /**
     * Scenario: existing manager (validatedAt set) invited to a year → accountActivated=true + status=pending.
     *
     * This is the key distinction the UI uses to show "Invitation non acceptée" vs "Compte non activé".
     */
    public function testExistingManagerPendingYearHasAccountActivatedTrue(): void
    {
        $token = $this->loginAndGetToken();

        // Create an existing manager (validatedAt set) and invite them to the current year.
        $container = self::$client->getContainer();
        /** @var \Doctrine\ORM\EntityManagerInterface $em */
        $em     = $container->get('doctrine')->getManager();
        $hasher = $container->get(\Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface::class);

        // Find the current year we set up earlier
        $currentYear = $em->getRepository(Years::class)->findOneBy(['title' => 'Cons Current Year']);
        $this->assertNotNull($currentYear);

        // Existing manager: has a working account (validatedAt set, no setup token)
        $existingMgr = new Manager();
        $existingMgr->setEmail('existing_mgr@test.be');
        $existingMgr->setFirstname('Existing');
        $existingMgr->setLastname('Manager');
        $existingMgr->setRole('manager');
        $existingMgr->setRoles(['ROLE_MANAGER']);
        $existingMgr->setSexe(Sexe::Male);
        $existingMgr->setJob(null);
        $existingMgr->setCreatedAt(new \DateTime());
        $existingMgr->setValidatedAt(new \DateTime()); // account is active
        $existingMgr->setPassword($hasher->hashPassword($existingMgr, 'SomePass123!'));
        // Year-acceptance token set (simulates that they were invited but haven't accepted)
        $existingMgr->setToken(bin2hex(random_bytes(32)));
        $existingMgr->setTokenExpiration(new \DateTime('+48 hours'));
        $em->persist($existingMgr);
        $em->flush();

        $my = new ManagerYears();
        $my->setManager($existingMgr);
        $my->setYears($currentYear);
        $my->setOwner(false);
        $my->setAdmin(false);
        $my->setDataAccess(true);
        $my->setDataValidation(false);
        $my->setDataDownload(true);
        $my->setInvitedAt(new \DateTimeImmutable());
        $em->persist($my);
        $em->flush();
        $em->clear();

        // Fetch managers
        $managers = $this->authedGet('/api/hospital-admin/managers?mode=current', $token);

        $found = null;
        foreach ($managers as $m) {
            if ($m['email'] === 'existing_mgr@test.be') {
                $found = $m;
                break;
            }
        }

        $this->assertNotNull($found, 'The existing manager should appear in current managers');
        $this->assertSame('pending', $found['status']);
        $this->assertTrue(
            $found['accountActivated'],
            'An existing manager (validatedAt set) pending a year invitation must have accountActivated=true',
        );
    }
}
