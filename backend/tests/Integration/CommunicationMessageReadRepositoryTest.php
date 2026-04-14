<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\CommunicationMessage;
use App\Entity\Hospital;
use App\Repository\CommunicationMessageReadRepository;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Integration tests for CommunicationMessageReadRepository.
 *
 * Covers:
 *   - markAsRead() creates a read record
 *   - markAsRead() is idempotent (no duplicate on second call)
 *   - markAsUnread() removes the read record
 *   - markAsUnread() is idempotent (no error when not read)
 *   - findOneByMessageAndUser() returns null when not read
 *
 * Uses a shared in-memory SQLite database; tearDown() skips parent to
 * preserve the kernel between tests (same pattern as CommunicationMessageRepositoryTest).
 */
class CommunicationMessageReadRepositoryTest extends WebTestCase
{
    private static KernelBrowser $client;
    private static EntityManagerInterface $em;
    private static CommunicationMessageReadRepository $readRepo;

    private static int $messageId;

    public static function setUpBeforeClass(): void
    {
        self::$client   = static::createClient();
        $container      = self::$client->getContainer();
        self::$em       = $container->get('doctrine')->getManager();
        self::$readRepo = $container->get(CommunicationMessageReadRepository::class);

        // ── Schema ────────────────────────────────────────────────────────────
        $metadata   = self::$em->getMetadataFactory()->getAllMetadata();
        $schemaTool = new SchemaTool(self::$em);
        $schemaTool->dropSchema($metadata);
        $schemaTool->createSchema($metadata);

        // ── Fixtures ──────────────────────────────────────────────────────────
        $hospital = (new Hospital())->setName('Test Hôpital');
        self::$em->persist($hospital);

        $message = new CommunicationMessage();
        $message->setType(CommunicationMessage::TYPE_NOTIFICATION);
        $message->setTitle('Test notification');
        $message->setBody('Corps du test');
        $message->setAuthorType(CommunicationMessage::AUTHOR_HOSPITAL_ADMIN);
        $message->setAuthorId(1);
        $message->setScopeType(CommunicationMessage::SCOPE_ALL);
        $message->setHospital($hospital);
        $message->setIsActive(true);
        self::$em->persist($message);

        self::$em->flush();

        self::$messageId = $message->getId();
    }

    protected function setUp(): void
    {
        self::$client->getCookieJar()->clear();
    }

    protected function tearDown(): void
    {
        // Skip parent::tearDown() to preserve the in-memory SQLite DB.
    }

    public static function tearDownAfterClass(): void
    {
        static::ensureKernelShutdown();
        parent::tearDownAfterClass();
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private function getMessage(): CommunicationMessage
    {
        return self::$em->find(CommunicationMessage::class, self::$messageId);
    }

    private function clearReadRecords(): void
    {
        self::$em->getConnection()->executeStatement(
            'DELETE FROM communication_message_read WHERE communication_message_id = ?',
            [self::$messageId]
        );
        self::$em->clear();
    }

    // ── findOneByMessageAndUser ───────────────────────────────────────────────

    public function testFindOneByMessageAndUserReturnsNullWhenNotRead(): void
    {
        $this->clearReadRecords();

        $result = self::$readRepo->findOneByMessageAndUser(
            $this->getMessage(),
            CommunicationMessage::ROLE_MANAGER,
            42
        );

        $this->assertNull($result, 'Should return null when no read record exists');
    }

    // ── markAsRead ────────────────────────────────────────────────────────────

    public function testMarkAsReadCreatesReadRecord(): void
    {
        $this->clearReadRecords();
        $message = $this->getMessage();

        self::$readRepo->markAsRead($message, CommunicationMessage::ROLE_MANAGER, 99);

        $record = self::$readRepo->findOneByMessageAndUser(
            $message,
            CommunicationMessage::ROLE_MANAGER,
            99
        );

        $this->assertNotNull($record, 'markAsRead() should create a read record');
        $this->assertSame(CommunicationMessage::ROLE_MANAGER, $record->getUserType());
        $this->assertSame(99, $record->getUserId());
    }

    public function testMarkAsReadIsIdempotent(): void
    {
        $this->clearReadRecords();
        $message = $this->getMessage();

        self::$readRepo->markAsRead($message, CommunicationMessage::ROLE_MANAGER, 100);
        self::$readRepo->markAsRead($message, CommunicationMessage::ROLE_MANAGER, 100);

        $records = self::$readRepo->findBy([
            'communicationMessage' => $message,
            'userType'             => CommunicationMessage::ROLE_MANAGER,
            'userId'               => 100,
        ]);

        $this->assertCount(1, $records, 'markAsRead() must not create duplicate records');
    }

    // ── markAsUnread ──────────────────────────────────────────────────────────

    public function testMarkAsUnreadRemovesReadRecord(): void
    {
        $this->clearReadRecords();
        $message = $this->getMessage();

        // First mark as read, then unread
        self::$readRepo->markAsRead($message, CommunicationMessage::ROLE_MANAGER, 101);
        self::$readRepo->markAsUnread($message, CommunicationMessage::ROLE_MANAGER, 101);

        $record = self::$readRepo->findOneByMessageAndUser(
            $message,
            CommunicationMessage::ROLE_MANAGER,
            101
        );

        $this->assertNull($record, 'markAsUnread() should delete the read record');
    }

    public function testMarkAsUnreadIsIdempotentWhenNotRead(): void
    {
        $this->clearReadRecords();
        $message = $this->getMessage();

        // Should not throw when record does not exist
        self::$readRepo->markAsUnread($message, CommunicationMessage::ROLE_MANAGER, 999);

        $record = self::$readRepo->findOneByMessageAndUser(
            $message,
            CommunicationMessage::ROLE_MANAGER,
            999
        );

        $this->assertNull($record, 'markAsUnread() on a non-read message should be a no-op');
    }

    public function testMarkAsUnreadDoesNotAffectOtherUsers(): void
    {
        $this->clearReadRecords();
        $message = $this->getMessage();

        self::$readRepo->markAsRead($message, CommunicationMessage::ROLE_MANAGER, 200);
        self::$readRepo->markAsRead($message, CommunicationMessage::ROLE_MANAGER, 201);

        // Unread only for user 200
        self::$readRepo->markAsUnread($message, CommunicationMessage::ROLE_MANAGER, 200);

        $this->assertNull(
            self::$readRepo->findOneByMessageAndUser($message, CommunicationMessage::ROLE_MANAGER, 200),
            'User 200 read record should be deleted'
        );
        $this->assertNotNull(
            self::$readRepo->findOneByMessageAndUser($message, CommunicationMessage::ROLE_MANAGER, 201),
            'User 201 read record must remain untouched'
        );
    }
}
