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
 * Integration — HospitalAdminController manager management.
 *
 * Tests the "delete manager from hospital" flow and the rule that:
 * - manager_hospital gives NO automatic access to years
 * - ManagerYears gives explicit year access
 * - Deleting from hospital removes ManagerYears + manager_hospital link
 * - Removing from a year only removes the ManagerYears entry
 * - addManager does not create duplicates
 */
class HospitalAdminDeleteManagerTest extends WebTestCase
{
    private static KernelBrowser $client;
    private static string $adminEmail    = 'del_mgr_admin@test.be';
    private static string $adminPassword = 'Password123!';

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
                username      VARCHAR(255) NOT NULL,
                valid         DATETIME     NOT NULL,
                UNIQUE (refresh_token)
            )
        ');

        /** @var UserPasswordHasherInterface $hasher */
        $hasher = $container->get(UserPasswordHasherInterface::class);

        $hospital = new Hospital();
        $hospital->setName('Delete Test Hospital');
        $hospital->setCreatedAt(new \DateTime());
        $em->persist($hospital);

        // Admin manager
        $admin = new Manager();
        $admin->setEmail(self::$adminEmail);
        $admin->setFirstname('Admin');
        $admin->setLastname('Del');
        $admin->setRole('manager');
        $admin->setRoles(['ROLE_MANAGER']);
        $admin->setSexe(Sexe::Female);
        $admin->setJob(null);
        $admin->setValidatedAt(new \DateTime());
        $admin->setPassword($hasher->hashPassword($admin, self::$adminPassword));
        $admin->setAdminHospital($hospital);
        $em->persist($admin);

        $em->flush();
        $em->clear();
    }

    protected function tearDown(): void { /* Keep kernel alive */ }

    private function loginAndGetToken(): string
    {
        self::$client->getCookieJar()->clear();
        self::$client->request(
            'POST', '/api/login_check', [], [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['username' => self::$adminEmail, 'password' => self::$adminPassword]),
        );
        return (string) (json_decode(self::$client->getResponse()->getContent(), true)['token'] ?? '');
    }

    private function authedRequest(string $method, string $path, array $body = [], string $token = ''): array
    {
        self::$client->request(
            $method, $path, [], [],
            ['HTTP_AUTHORIZATION' => "Bearer $token", 'CONTENT_TYPE' => 'application/json'],
            $body ? json_encode($body) : null,
        );
        return json_decode((string) self::$client->getResponse()->getContent(), true) ?? [];
    }

    private function getEm(): EntityManagerInterface
    {
        return self::$client->getContainer()->get('doctrine')->getManager();
    }

    private function getHospital(): Hospital
    {
        return $this->getEm()->getRepository(Hospital::class)->findOneBy(['name' => 'Delete Test Hospital']);
    }

    private function createYear(string $suffix = ''): Years
    {
        $em       = $this->getEm();
        $hospital = $this->getHospital();

        $year = new Years();
        $year->setTitle('Del Test Year' . $suffix)
            ->setLocation('Test')
            ->setPeriod('2025-2026')
            ->setDateOfStart(new \DateTime('-30 days'))
            ->setDateOfEnd(new \DateTime('+300 days'))
            ->setStatus(YearStatus::Active)
            ->setHospital($hospital)
            ->setCreatedAt(new \DateTime())
            ->setToken(bin2hex(random_bytes(5)));
        $em->persist($year);
        $em->flush();
        $em->clear();
        return $this->getEm()->getRepository(Years::class)->findOneBy(['title' => 'Del Test Year' . $suffix]);
    }

    // ── Test: manager_hospital does NOT give automatic year access ────────────

    public function testManagerInHospitalWithoutManagerYearsDoesNotSeeYear(): void
    {
        $token = $this->loginAndGetToken();

        // Add manager to hospital membership without adding to any year
        $em       = $this->getEm();
        $hospital = $this->getHospital();
        $hasher   = self::$client->getContainer()->get(UserPasswordHasherInterface::class);

        $mgr = new Manager();
        $mgr->setEmail('no_year_mgr@test.be')
            ->setFirstname('NoYear')
            ->setLastname('Manager')
            ->setRole('manager')
            ->setRoles(['ROLE_MANAGER'])
            ->setSexe(Sexe::Male)
            ->setJob(null)
            ->setValidatedAt(new \DateTime())
            ->setPassword($hasher->hashPassword($mgr, 'Pass123!'))
            ->setCreatedAt(new \DateTime());
        $mgr->addHospital($hospital);  // belongs to hospital but has NO ManagerYears
        $em->persist($mgr);
        $em->flush();
        $em->clear();

        // This manager should NOT appear in the hospital managers list (no ManagerYears)
        self::$client->request(
            'GET', '/api/hospital-admin/managers?mode=current', [], [],
            ['HTTP_AUTHORIZATION' => "Bearer $token"],
        );
        $rows = json_decode(self::$client->getResponse()->getContent(), true) ?? [];
        $emails = array_column($rows, 'email');
        $this->assertNotContains('no_year_mgr@test.be', $emails,
            'A manager in manager_hospital without ManagerYears must NOT appear in the list');
    }

    // ── Test: ManagerYears gives explicit year access ─────────────────────────

    public function testAddManagerCreatesManagerYearsAndManagerAppearsInList(): void
    {
        $token = $this->loginAndGetToken();
        $year  = $this->createYear('A');

        $data = $this->authedRequest('POST', '/api/hospital-admin/managers', [
            'email'     => 'with_year_mgr@test.be',
            'firstname' => 'WithYear',
            'lastname'  => 'Manager',
            'yearId'    => $year->getId(),
        ], $token);

        $this->assertResponseStatusCodeSame(201);

        // Manager should now appear in the list
        self::$client->request(
            'GET', '/api/hospital-admin/managers?mode=current', [], [],
            ['HTTP_AUTHORIZATION' => "Bearer $token"],
        );
        $rows   = json_decode(self::$client->getResponse()->getContent(), true) ?? [];
        $emails = array_column($rows, 'email');
        $this->assertContains('with_year_mgr@test.be', $emails,
            'Manager added via addManager must appear in the list via ManagerYears');
    }

    // ── Test: addManager does not create duplicate ManagerYears ────────────────

    public function testAddManagerDoesNotCreateDuplicate(): void
    {
        $token = $this->loginAndGetToken();
        $year  = $this->createYear('B');

        $payload = [
            'email'     => 'dup_mgr@test.be',
            'firstname' => 'Dup',
            'lastname'  => 'Manager',
            'yearId'    => $year->getId(),
        ];

        $this->authedRequest('POST', '/api/hospital-admin/managers', $payload, $token);
        $this->assertResponseStatusCodeSame(201);

        // Second add → should return 409
        $this->authedRequest('POST', '/api/hospital-admin/managers', $payload, $token);
        $this->assertResponseStatusCodeSame(409);

        $em    = $this->getEm();
        $count = $em->getRepository(ManagerYears::class)->count(['years' => $year->getId()]);
        $this->assertSame(1, $count, 'Only one ManagerYears entry must exist even after duplicate attempt');
    }

    // ── Test: removeManagerYear removes ONLY the ManagerYears, not manager_hospital ──

    public function testRemoveManagerYearRemovesOnlyManagerYears(): void
    {
        $token = $this->loginAndGetToken();
        $year  = $this->createYear('C');

        $addData = $this->authedRequest('POST', '/api/hospital-admin/managers', [
            'email'     => 'remove_year_mgr@test.be',
            'firstname' => 'Remove',
            'lastname'  => 'YearMgr',
            'yearId'    => $year->getId(),
        ], $token);
        $this->assertResponseStatusCodeSame(201);

        $myId = $addData['myId'];
        $managerId = $addData['managerId'];

        // Remove from year
        self::$client->request(
            'DELETE', "/api/hospital-admin/manager-years/$myId", [], [],
            ['HTTP_AUTHORIZATION' => "Bearer $token"],
        );
        $this->assertResponseStatusCodeSame(204,
            'Removing from year must return 204');

        $em = $this->getEm();

        // ManagerYears entry must be gone
        $this->assertNull($em->getRepository(ManagerYears::class)->find($myId),
            'ManagerYears entry must be deleted after removeManagerYear');

        // Manager entity itself must still exist
        $manager = $em->getRepository(Manager::class)->find($managerId);
        $this->assertNotNull($manager,
            'Manager entity must NOT be deleted when removing from a single year');
    }

    // ── Test: deleteManager removes ManagerYears AND manager_hospital link ────

    public function testDeleteManagerFromHospitalRemovesManagerYearsAndHospitalLink(): void
    {
        $token = $this->loginAndGetToken();
        $year  = $this->createYear('D');

        $addData = $this->authedRequest('POST', '/api/hospital-admin/managers', [
            'email'     => 'del_from_hospital@test.be',
            'firstname' => 'DelHospital',
            'lastname'  => 'Manager',
            'yearId'    => $year->getId(),
        ], $token);
        $this->assertResponseStatusCodeSame(201);

        $managerId = $addData['managerId'];
        $this->assertNotNull($managerId);

        // Delete from hospital
        self::$client->request(
            'DELETE', "/api/hospital-admin/managers/$managerId", [], [],
            ['HTTP_AUTHORIZATION' => "Bearer $token"],
        );
        $this->assertResponseStatusCodeSame(204,
            'Deleting manager from hospital must return 204');

        $em       = $this->getEm();
        $hospital = $this->getHospital();
        $manager  = $em->getRepository(Manager::class)->find($managerId);

        $this->assertNotNull($manager, 'Manager entity itself must still exist (soft-delete or other hospitals)');

        // ManagerYears for this hospital must be gone
        $yearCount = count(array_filter(
            $em->getRepository(ManagerYears::class)->findBy(['manager' => $manager]),
            fn ($my) => $my->getYears()?->getHospital()?->getId() === $hospital->getId(),
        ));
        $this->assertSame(0, $yearCount,
            'All ManagerYears for this hospital must be deleted when deleting manager from hospital');

        // manager_hospital link must also be removed
        $em->refresh($manager);
        $hospitalIds = array_map(fn ($h) => $h->getId(), $manager->getHospitals()->toArray());
        $this->assertNotContains($hospital->getId(), $hospitalIds,
            'manager_hospital link must be removed when deleting manager from hospital (so future auto-add uses correct logic)');
    }

    // ── Test: yearPending field is returned correctly ──────────────────────────

    public function testSerializedManagerRowIncludesYearPendingField(): void
    {
        $token = $this->loginAndGetToken();
        $year  = $this->createYear('E');

        $this->authedRequest('POST', '/api/hospital-admin/managers', [
            'email'     => 'year_pending_mgr@test.be',
            'firstname' => 'YearPending',
            'lastname'  => 'Manager',
            'yearId'    => $year->getId(),
        ], $token);
        $this->assertResponseStatusCodeSame(201);

        self::$client->request(
            'GET', '/api/hospital-admin/managers?mode=current', [], [],
            ['HTTP_AUTHORIZATION' => "Bearer $token"],
        );
        $rows = json_decode(self::$client->getResponse()->getContent(), true) ?? [];

        $row = null;
        foreach ($rows as $r) {
            if ($r['email'] === 'year_pending_mgr@test.be') { $row = $r; break; }
        }

        $this->assertNotNull($row, 'The manager should appear in the list');
        $this->assertArrayHasKey('yearPending', $row,
            'Every ManagerRow must include the yearPending field');
        $this->assertIsBool($row['yearPending']);

        // This manager was added as an external (not in hospital's manager_hospital yet),
        // so invitedAt is set → yearPending=true
        $this->assertTrue($row['yearPending'],
            'A newly invited external manager must have yearPending=true (invitedAt is set)');
    }
}
