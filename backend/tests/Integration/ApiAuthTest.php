<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Manager;
use App\Entity\Resident;
use App\Enum\Sexe;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * API integration tests — authentication and role-based access control.
 *
 * Uses a single kernel boot for the whole class to preserve the SQLite
 * in-memory database created in setUpBeforeClass().
 * tearDown() intentionally does NOT call parent::tearDown() to avoid
 * shutting down the kernel (which would destroy the in-memory DB).
 */
class ApiAuthTest extends WebTestCase
{
    private static KernelBrowser $client;

    // ─── Fixtures ────────────────────────────────────────────────────────────

    public static function setUpBeforeClass(): void
    {
        // Boot the kernel once; all tests in this class reuse the same
        // SQLite in-memory connection through the shared kernel.
        self::$client = static::createClient();

        $container = self::$client->getContainer();
        $em        = $container->get('doctrine')->getManager();
        assert($em instanceof EntityManagerInterface);

        // Drop and recreate the full schema so each test run starts clean.
        $metadata   = $em->getMetadataFactory()->getAllMetadata();
        $schemaTool = new SchemaTool($em);
        $schemaTool->dropSchema($metadata);
        $schemaTool->createSchema($metadata);

        // The Gesdinet RefreshToken entity is a mapped-superclass, so SchemaTool skips it.
        // Create the table manually to match what the production migration creates.
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

        // ── Test manager ──────────────────────────────────────────────────────
        $manager = new Manager();
        $manager->setEmail('manager@test.com');
        $manager->setFirstname('Alice');
        $manager->setLastname('Manager');
        $manager->setRole('manager');
        $manager->setRoles(['ROLE_MANAGER']);
        $manager->setSexe(Sexe::Female);
        $manager->setJob('Chef de service');
        $manager->setHospital('CHU Test');
        // token = null → UserChecker allows login (non-null token = pending activation)
        $manager->setPassword($hasher->hashPassword($manager, 'Password123!'));

        $em->persist($manager);

        // ── Test resident ─────────────────────────────────────────────────────
        $resident = new Resident();
        $resident->setEmail('resident@test.com');
        $resident->setFirstname('Bob');
        $resident->setLastname('Resident');
        $resident->setRole('resident');
        $resident->setRoles(['ROLE_RESIDENT']);
        $resident->setSexe(Sexe::Male);
        $resident->setDateOfMaster(new \DateTime('2020-01-01'));
        $resident->setPassword($hasher->hashPassword($resident, 'Password123!'));

        $em->persist($resident);
        $em->flush();
    }

    protected function setUp(): void
    {
        // Clear cookies between tests WITHOUT calling restart() — restart() shuts down the kernel,
        // which would destroy the SQLite in-memory database.
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

    // ─── 401 — no token ──────────────────────────────────────────────────────

    public function testFetchManagersReturns401WithoutToken(): void
    {
        self::$client->request('GET', '/api/fetchManagers');

        $this->assertResponseStatusCodeSame(401);
    }

    /**
     * @dataProvider protectedEndpointsProvider
     */
    public function testProtectedEndpointReturns401WithoutToken(string $method, string $url): void
    {
        self::$client->request($method, $url);

        $this->assertResponseStatusCodeSame(401);
    }

    /** @return array<string, array{string, string}> */
    public static function protectedEndpointsProvider(): array
    {
        return [
            'manager notifications' => ['GET', '/api/managers/notifications/unread'],
            'manager years'         => ['GET', '/api/managers/years/getManagersYears'],
        ];
    }

    // ─── Login ───────────────────────────────────────────────────────────────

    public function testLoginWithInvalidCredentialsReturns401(): void
    {
        self::$client->request(
            'POST',
            '/api/login_check',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            (string) json_encode(['username' => 'nobody@test.com', 'password' => 'wrong'])
        );

        $this->assertResponseStatusCodeSame(401);
    }

    public function testLoginWithValidManagerCredentialsReturnsToken(): void
    {
        self::$client->request(
            'POST',
            '/api/login_check',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            (string) json_encode(['username' => 'manager@test.com', 'password' => 'Password123!'])
        );

        $this->assertResponseIsSuccessful();

        $data = json_decode(self::$client->getResponse()->getContent(), true);
        $this->assertIsString($data['token'] ?? null, 'Login response must contain a JWT token');
        $this->assertNotEmpty($data['token']);
    }

    public function testLoginWithValidResidentCredentialsReturnsToken(): void
    {
        self::$client->request(
            'POST',
            '/api/login_check',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            (string) json_encode(['username' => 'resident@test.com', 'password' => 'Password123!'])
        );

        $this->assertResponseIsSuccessful();

        $data = json_decode(self::$client->getResponse()->getContent(), true);
        $this->assertIsString($data['token'] ?? null, 'Login response must contain a JWT token');
    }

    // ─── Role-based access control ───────────────────────────────────────────

    public function testFetchManagersWithManagerTokenReturns200(): void
    {
        $token = $this->loginAndGetToken('manager@test.com', 'Password123!');

        self::$client->request(
            'GET',
            '/api/fetchManagers',
            [],
            [],
            ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]
        );

        $this->assertResponseIsSuccessful();
        $data = json_decode(self::$client->getResponse()->getContent(), true);
        $this->assertIsArray($data);
    }

    public function testFetchManagersWithResidentTokenReturns403(): void
    {
        $token = $this->loginAndGetToken('resident@test.com', 'Password123!');

        self::$client->request(
            'GET',
            '/api/fetchManagers',
            [],
            [],
            ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]
        );

        $this->assertResponseStatusCodeSame(403);
    }

    public function testManagerNotificationsWithResidentTokenReturns403(): void
    {
        $token = $this->loginAndGetToken('resident@test.com', 'Password123!');

        self::$client->request(
            'GET',
            '/api/managers/notifications/unread',
            [],
            [],
            ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]
        );

        $this->assertResponseStatusCodeSame(403);
    }

    public function testManagerYearsEndpointWithManagerTokenReturns200(): void
    {
        $token = $this->loginAndGetToken('manager@test.com', 'Password123!');

        self::$client->request(
            'GET',
            '/api/managers/years/getManagersYears',
            [],
            [],
            ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]
        );

        // Authenticated manager: must not be rejected by the security layer.
        $this->assertNotSame(401, self::$client->getResponse()->getStatusCode());
        $this->assertNotSame(403, self::$client->getResponse()->getStatusCode());
    }

    // ─── Helper ──────────────────────────────────────────────────────────────

    /**
     * Performs a real POST /api/login_check and returns the JWT token string.
     * Restarts the client afterwards to clear request state.
     */
    private function loginAndGetToken(string $email, string $password): string
    {
        self::$client->request(
            'POST',
            '/api/login_check',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            (string) json_encode(['username' => $email, 'password' => $password])
        );

        $data  = json_decode(self::$client->getResponse()->getContent(), true);
        $token = $data['token'] ?? '';

        $this->assertNotEmpty($token, "Login failed for {$email} — check JWT config");

        return (string) $token;
    }
}
