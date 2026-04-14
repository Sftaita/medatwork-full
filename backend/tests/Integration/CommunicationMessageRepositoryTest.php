<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\CommunicationMessage;
use App\Entity\Hospital;
use App\Entity\Resident;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Enum\Sexe;
use App\Enum\YearStatus;
use App\Repository\CommunicationMessageRepository;
use App\Repository\YearsResidentRepository;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Integration tests for CommunicationMessageRepository hospital-scoping logic.
 *
 * Verifies that residents receive:
 *   - global messages (hospital IS NULL)
 *   - messages scoped to their own hospital(s) via YearsResident → Years → Hospital
 *
 * And do NOT receive:
 *   - messages scoped to a different hospital
 *
 * Uses a single in-memory SQLite database shared across all tests in the class.
 * tearDown() intentionally does NOT call parent::tearDown() to avoid shutting
 * down the kernel (which would destroy the in-memory DB).
 */
class CommunicationMessageRepositoryTest extends WebTestCase
{
    private static KernelBrowser $client;
    private static EntityManagerInterface $em;
    private static CommunicationMessageRepository $msgRepo;
    private static YearsResidentRepository $yrRepo;

    /** IDs of persisted entities used across test methods */
    private static int $residentId;
    private static int $hospitalAId;
    private static int $hospitalBId;

    // Message IDs
    private static int $globalMsgId;
    private static int $hospitalAMsgId;
    private static int $hospitalBMsgId;
    private static int $roleMsgGlobalId;
    private static int $roleMsgHospitalAId;

    public static function setUpBeforeClass(): void
    {
        self::$client = static::createClient();

        $container     = self::$client->getContainer();
        self::$em      = $container->get('doctrine')->getManager();
        self::$msgRepo = $container->get(CommunicationMessageRepository::class);
        self::$yrRepo  = $container->get(YearsResidentRepository::class);

        // ── Build schema ──────────────────────────────────────────────────────
        $metadata   = self::$em->getMetadataFactory()->getAllMetadata();
        $schemaTool = new SchemaTool(self::$em);
        $schemaTool->dropSchema($metadata);
        $schemaTool->createSchema($metadata);

        // ── Fixtures ──────────────────────────────────────────────────────────

        // Two hospitals
        $hospitalA = (new Hospital())->setName('CHU Alpha');
        $hospitalB = (new Hospital())->setName('Clinique Beta');
        self::$em->persist($hospitalA);
        self::$em->persist($hospitalB);

        // One resident
        $resident = new Resident();
        $resident->setEmail('resident.test@test.com');
        $resident->setFirstname('Jean');
        $resident->setLastname('Interne');
        $resident->setRole('resident');
        $resident->setRoles(['ROLE_RESIDENT']);
        $resident->setSexe(Sexe::Male);
        $resident->setDateOfMaster(new \DateTime('2020-01-01'));
        $resident->setPassword('hashed');
        self::$em->persist($resident);

        // Year linked to Hospital A
        $year = new Years();
        $year->setTitle('Année test');
        $year->setDateOfStart(new \DateTime('2025-10-01'));
        $year->setDateOfEnd(new \DateTime('2026-09-30'));
        $year->setCreatedAt(new \DateTime());
        $year->setLocation('CHU Alpha');
        $year->setPeriod('2025-2026');
        $year->setToken(substr(bin2hex(random_bytes(8)), 0, 10));
        $year->setHospital($hospitalA);
        $year->setStatus(YearStatus::Active);
        self::$em->persist($year);

        // Link resident to year (and thus to Hospital A)
        $yr = new YearsResident();
        $yr->setYear($year);
        $yr->setResident($resident);
        $yr->setAllowed(true);
        $yr->setCreatedAt(new \DateTime());
        self::$em->persist($yr);

        // Messages
        // 1. Global notification (no hospital, scope = all)
        $globalMsg = self::makeMessage('Notification globale', null, CommunicationMessage::SCOPE_ALL, null);
        self::$em->persist($globalMsg);

        // 2. Hospital A notification (scope = all, hospital = A)
        $hospitalAMsg = self::makeMessage('Notification hôpital A', $hospitalA, CommunicationMessage::SCOPE_ALL, null);
        self::$em->persist($hospitalAMsg);

        // 3. Hospital B notification (scope = all, hospital = B) — resident must NOT receive this
        $hospitalBMsg = self::makeMessage('Notification hôpital B', $hospitalB, CommunicationMessage::SCOPE_ALL, null);
        self::$em->persist($hospitalBMsg);

        // 4. Global role-based notification (scope = role, targetRole = resident, no hospital)
        $roleMsgGlobal = self::makeMessage('Role résidents global', null, CommunicationMessage::SCOPE_ROLE, CommunicationMessage::ROLE_RESIDENT);
        self::$em->persist($roleMsgGlobal);

        // 5. Hospital A role-based notification (scope = role, targetRole = resident, hospital = A)
        $roleMsgHospA = self::makeMessage('Role résidents hôpital A', $hospitalA, CommunicationMessage::SCOPE_ROLE, CommunicationMessage::ROLE_RESIDENT);
        self::$em->persist($roleMsgHospA);

        self::$em->flush();

        // Store IDs for assertions
        self::$residentId     = $resident->getId();
        self::$hospitalAId    = $hospitalA->getId();
        self::$hospitalBId    = $hospitalB->getId();
        self::$globalMsgId    = $globalMsg->getId();
        self::$hospitalAMsgId = $hospitalAMsg->getId();
        self::$hospitalBMsgId = $hospitalBMsg->getId();
        self::$roleMsgGlobalId    = $roleMsgGlobal->getId();
        self::$roleMsgHospitalAId = $roleMsgHospA->getId();
    }

    protected function setUp(): void
    {
        // Clear cookies between tests WITHOUT restarting kernel — restart() would destroy
        // the in-memory SQLite database created in setUpBeforeClass().
        self::$client->getCookieJar()->clear();
    }

    protected function tearDown(): void
    {
        // Intentionally skip parent::tearDown() — it calls ensureKernelShutdown(),
        // which would destroy the SQLite in-memory DB and break subsequent tests.
    }

    public static function tearDownAfterClass(): void
    {
        static::ensureKernelShutdown();
        parent::tearDownAfterClass();
    }

    // ── YearsResidentRepository::findHospitalIdsByResident ───────────────────

    public function testFindHospitalIdsByResidentReturnsHospitalA(): void
    {
        $ids = self::$yrRepo->findHospitalIdsByResident(self::$residentId);

        $this->assertContains(self::$hospitalAId, $ids, 'Resident should be linked to Hospital A via their year');
        $this->assertNotContains(self::$hospitalBId, $ids, 'Resident should NOT be linked to Hospital B');
    }

    public function testFindHospitalIdsByResidentReturnsEmptyForUnknownResident(): void
    {
        $ids = self::$yrRepo->findHospitalIdsByResident(99999);

        $this->assertSame([], $ids);
    }

    // ── CommunicationMessageRepository — resident with hospital context ───────

    public function testResidentReceivesGlobalMessage(): void
    {
        $hospitalIds = self::$yrRepo->findHospitalIdsByResident(self::$residentId);
        $messages    = self::$msgRepo->findAllForUser(
            CommunicationMessage::ROLE_RESIDENT,
            self::$residentId,
            $hospitalIds,
            CommunicationMessage::TYPE_NOTIFICATION
        );

        $ids = array_column(array_map(fn ($m) => ['id' => $m->getId()], $messages), 'id');
        $this->assertContains(self::$globalMsgId, $ids, 'Resident should receive the global message');
    }

    public function testResidentReceivesHospitalAScopedMessage(): void
    {
        $hospitalIds = self::$yrRepo->findHospitalIdsByResident(self::$residentId);
        $messages    = self::$msgRepo->findAllForUser(
            CommunicationMessage::ROLE_RESIDENT,
            self::$residentId,
            $hospitalIds,
            CommunicationMessage::TYPE_NOTIFICATION
        );

        $ids = array_map(fn ($m) => $m->getId(), $messages);
        $this->assertContains(self::$hospitalAMsgId, $ids, 'Resident should receive messages scoped to Hospital A');
    }

    public function testResidentDoesNotReceiveHospitalBScopedMessage(): void
    {
        $hospitalIds = self::$yrRepo->findHospitalIdsByResident(self::$residentId);
        $messages    = self::$msgRepo->findAllForUser(
            CommunicationMessage::ROLE_RESIDENT,
            self::$residentId,
            $hospitalIds,
            CommunicationMessage::TYPE_NOTIFICATION
        );

        $ids = array_map(fn ($m) => $m->getId(), $messages);
        $this->assertNotContains(self::$hospitalBMsgId, $ids, 'Resident must NOT receive messages scoped to Hospital B');
    }

    public function testResidentReceivesGlobalRoleMessage(): void
    {
        $hospitalIds = self::$yrRepo->findHospitalIdsByResident(self::$residentId);
        $messages    = self::$msgRepo->findAllForUser(
            CommunicationMessage::ROLE_RESIDENT,
            self::$residentId,
            $hospitalIds,
            CommunicationMessage::TYPE_NOTIFICATION
        );

        $ids = array_map(fn ($m) => $m->getId(), $messages);
        $this->assertContains(self::$roleMsgGlobalId, $ids, 'Resident should receive global role-scoped messages');
    }

    public function testResidentReceivesHospitalARoleMessage(): void
    {
        $hospitalIds = self::$yrRepo->findHospitalIdsByResident(self::$residentId);
        $messages    = self::$msgRepo->findAllForUser(
            CommunicationMessage::ROLE_RESIDENT,
            self::$residentId,
            $hospitalIds,
            CommunicationMessage::TYPE_NOTIFICATION
        );

        $ids = array_map(fn ($m) => $m->getId(), $messages);
        $this->assertContains(self::$roleMsgHospitalAId, $ids, 'Resident should receive role-scoped messages for Hospital A');
    }

    // ── Resident with no hospitals (null context) ─────────────────────────────

    public function testResidentWithNullContextReceivesOnlyGlobalMessages(): void
    {
        $messages = self::$msgRepo->findAllForUser(
            CommunicationMessage::ROLE_RESIDENT,
            self::$residentId,
            null, // no hospital context
            CommunicationMessage::TYPE_NOTIFICATION
        );

        $ids = array_map(fn ($m) => $m->getId(), $messages);
        $this->assertContains(self::$globalMsgId, $ids, 'Global messages must be delivered even with null context');
        $this->assertNotContains(self::$hospitalAMsgId, $ids, 'Hospital-scoped messages must be excluded with null context');
        $this->assertNotContains(self::$hospitalBMsgId, $ids, 'Hospital-scoped messages must be excluded with null context');
    }

    // ── Unread count ──────────────────────────────────────────────────────────

    public function testUnreadCountIncludesHospitalAMessages(): void
    {
        $hospitalIds = self::$yrRepo->findHospitalIdsByResident(self::$residentId);

        $count = self::$msgRepo->countUnreadNotificationsForUser(
            CommunicationMessage::ROLE_RESIDENT,
            self::$residentId,
            $hospitalIds
        );

        // Expect: globalMsg + hospitalAMsg + roleMsgGlobal + roleMsgHospitalA = 4
        $this->assertSame(4, $count, 'Unread count should include all global and Hospital-A-scoped messages');
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private static function makeMessage(
        string    $title,
        ?Hospital $hospital,
        string    $scopeType,
        ?string   $targetRole,
    ): CommunicationMessage {
        $m = new CommunicationMessage();
        $m->setType(CommunicationMessage::TYPE_NOTIFICATION);
        $m->setTitle($title);
        $m->setBody('Corps du message : ' . $title);
        $m->setAuthorType(CommunicationMessage::AUTHOR_HOSPITAL_ADMIN);
        $m->setAuthorId(1);
        $m->setScopeType($scopeType);
        $m->setTargetRole($targetRole);
        $m->setHospital($hospital);
        $m->setIsActive(true);

        return $m;
    }
}
