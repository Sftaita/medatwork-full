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
 * Integration — HospitalAdminController::addManager() flow.
 *
 * Tests the 4 branches of the new addManager() logic:
 *   1. Manager in hospital.getHospitals() + account activated → auto-add (no token, NotificationManager)
 *   2. Manager in hospital.getHospitals() + account NOT activated → auto-add + resend activation
 *   3. Manager NOT in hospital.getHospitals() → year invitation (token + invitedAt)
 *   4. New manager (email unknown) → account creation (token + invitedAt)
 *   5. Manager already in this year → 409 with clear message
 *   6. resendManagerInvite: auto-added, not activated → resend activation (not year-invite)
 */
class HospitalAdminAddManagerTest extends WebTestCase
{
    private static KernelBrowser $client;
    private static string $adminEmail    = 'add_mgr_admin@test.be';
    private static string $adminPassword = 'Password123!';
    private static int $hospitalId;
    private static int $yearId;

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
        $hospital->setName('AddManager Test Hospital');
        $hospital->setCreatedAt(new \DateTime());
        $em->persist($hospital);

        // Admin manager (has adminHospital → ROLE_HOSPITAL_ADMIN via getRoles())
        $admin = new Manager();
        $admin->setEmail(self::$adminEmail);
        $admin->setFirstname('Admin');
        $admin->setLastname('Test');
        $admin->setRole('manager');
        $admin->setRoles(['ROLE_MANAGER']);
        $admin->setSexe(Sexe::Female);
        $admin->setJob(null);
        $admin->setValidatedAt(new \DateTime());
        $admin->setPassword($hasher->hashPassword($admin, self::$adminPassword));
        $admin->setAdminHospital($hospital);
        $em->persist($admin);

        $year = new Years();
        $year->setTitle('Test Year 2025');
        $year->setLocation('Test');
        $year->setPeriod('2025-2026');
        $year->setDateOfStart(new \DateTime('-30 days'));
        $year->setDateOfEnd(new \DateTime('+300 days'));
        $year->setStatus(YearStatus::Active);
        $year->setHospital($hospital);
        $year->setCreatedAt(new \DateTime());
        $year->setToken(bin2hex(random_bytes(5)));
        $em->persist($year);

        $em->flush();
        self::$hospitalId = $hospital->getId();
        self::$yearId     = $year->getId();
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
        $data = json_decode(self::$client->getResponse()->getContent(), true);
        return (string) ($data['token'] ?? '');
    }

    private function authedPost(string $path, array $body, string $token): array
    {
        self::$client->request(
            'POST', $path, [], [],
            ['HTTP_AUTHORIZATION' => "Bearer $token", 'CONTENT_TYPE' => 'application/json'],
            json_encode($body),
        );
        return json_decode(self::$client->getResponse()->getContent(), true) ?? [];
    }

    private function getEm(): EntityManagerInterface
    {
        return self::$client->getContainer()->get('doctrine')->getManager();
    }

    private function getHasher(): UserPasswordHasherInterface
    {
        return self::$client->getContainer()->get(UserPasswordHasherInterface::class);
    }

    // ── 1. Manager appartenant à l'hôpital, compte activé → auto-ajouté ─────

    public function testManagerInHospitalActivatedIsAutoAdded(): void
    {
        $em     = $this->getEm();
        $hasher = $this->getHasher();
        $token  = $this->loginAndGetToken();

        $hospital = $em->find(Hospital::class, self::$hospitalId);

        $member = new Manager();
        $member->setEmail('member_activated@test.be');
        $member->setFirstname('Alice');
        $member->setLastname('Member');
        $member->setRole('manager');
        $member->setRoles(['ROLE_MANAGER']);
        $member->setSexe(Sexe::Female);
        $member->setJob(ManagerJob::MedicalSupervisor);
        $member->setValidatedAt(new \DateTime()); // compte activé
        $member->setPassword($hasher->hashPassword($member, 'Pass123!'));
        $member->setCreatedAt(new \DateTime());
        $member->addHospital($hospital);           // déjà dans l'hôpital
        $em->persist($member);
        $em->flush();
        $em->clear();

        $data = $this->authedPost(
            '/api/hospital-admin/managers',
            ['email' => 'member_activated@test.be', 'firstname' => 'Alice', 'lastname' => 'Member', 'yearId' => self::$yearId],
            $token,
        );

        $this->assertResponseStatusCodeSame(201);
        $this->assertSame('active', $data['status'],
            'Manager appartenant à l\'hôpital avec compte activé doit être active immédiatement');

        // Vérifier ManagerYears.invitedAt = null (accepté d'office)
        $em->clear();
        $my = $em->getRepository(ManagerYears::class)->find($data['myId']);
        $this->assertNotNull($my);
        $this->assertNull($my->getInvitedAt(),
            'invitedAt doit être null pour un auto-ajouté (pas en attente d\'acceptation)');

        // Vérifier qu'aucun token year-invitation n'a été généré
        $refreshedManager = $em->getRepository(Manager::class)->findOneBy(['email' => 'member_activated@test.be']);
        $this->assertNull($refreshedManager?->getToken(),
            'Aucun token year-invitation ne doit être généré pour un auto-ajouté avec compte actif');

        // Vérifier qu'une NotificationManager a été créée
        $notifs = $em->getRepository(\App\Entity\NotificationManager::class)->findBy(['manager' => $refreshedManager]);
        $this->assertNotEmpty($notifs, 'Une notification in-app doit être créée pour l\'auto-ajouté');
        $this->assertSame('year_added', $notifs[0]->getType());
    }

    // ── 2. Manager appartenant à l'hôpital, compte NON activé → auto-ajouté + activation ─

    public function testManagerInHospitalNotActivatedIsAutoAddedWithActivationResent(): void
    {
        $em     = $this->getEm();
        $hasher = $this->getHasher();
        $token  = $this->loginAndGetToken();

        $hospital = $em->find(Hospital::class, self::$hospitalId);

        $member = new Manager();
        $member->setEmail('member_pending@test.be');
        $member->setFirstname('Bob');
        $member->setLastname('Pending');
        $member->setRole('manager');
        $member->setRoles(['ROLE_MANAGER']);
        $member->setSexe(Sexe::Male);
        $member->setJob(null);
        // validatedAt non set → compte non activé
        $member->setPassword($hasher->hashPassword($member, bin2hex(random_bytes(16))));
        $member->setCreatedAt(new \DateTime());
        $member->addHospital($hospital); // déjà dans l'hôpital
        $em->persist($member);
        $em->flush();
        $em->clear();

        $this->authedPost(
            '/api/hospital-admin/managers',
            ['email' => 'member_pending@test.be', 'firstname' => 'Bob', 'lastname' => 'Pending', 'yearId' => self::$yearId],
            $token,
        );

        $this->assertResponseStatusCodeSame(201);

        $em->clear();
        $my = null;
        foreach ($em->getRepository(ManagerYears::class)->findAll() as $candidate) {
            if ($candidate->getManager()?->getEmail() === 'member_pending@test.be') {
                $my = $candidate;
                break;
            }
        }
        $this->assertNotNull($my);
        $this->assertNull($my->getInvitedAt(),
            'invitedAt doit être null — pas d\'invitation d\'année pour un auto-ajouté');

        $refreshedManager = $em->getRepository(Manager::class)->findOneBy(['email' => 'member_pending@test.be']);
        $this->assertNotNull($refreshedManager?->getToken(),
            'Un token d\'activation doit être généré pour que le manager puisse activer son compte');
    }

    // ── 3. Manager existant n'appartenant PAS à l'hôpital → invitation ───────

    public function testManagerNotInHospitalReceivesYearInvitation(): void
    {
        $em     = $this->getEm();
        $hasher = $this->getHasher();
        $token  = $this->loginAndGetToken();

        $external = new Manager();
        $external->setEmail('external_mgr@test.be');
        $external->setFirstname('Carol');
        $external->setLastname('External');
        $external->setRole('manager');
        $external->setRoles(['ROLE_MANAGER']);
        $external->setSexe(Sexe::Female);
        $external->setJob(ManagerJob::Doctor);
        $external->setValidatedAt(new \DateTime()); // compte actif
        $external->setPassword($hasher->hashPassword($external, 'Pass123!'));
        $external->setCreatedAt(new \DateTime());
        // Pas de addHospital → pas lié à cet hôpital
        $em->persist($external);
        $em->flush();
        $em->clear();

        $data = $this->authedPost(
            '/api/hospital-admin/managers',
            ['email' => 'external_mgr@test.be', 'firstname' => 'Carol', 'lastname' => 'External', 'yearId' => self::$yearId],
            $token,
        );

        $this->assertResponseStatusCodeSame(201);
        $this->assertSame('pending', $data['status'],
            'Manager externe doit avoir statut pending (invitation en attente)');
        $this->assertTrue($data['accountActivated'],
            'accountActivated=true : compte existant mais invitation non acceptée');

        $em->clear();
        $my = $em->getRepository(ManagerYears::class)->find($data['myId']);
        $this->assertNotNull($my->getInvitedAt(),
            'invitedAt doit être non-null pour un manager externe (invitation accept/refuse)');

        $refreshedManager = $em->getRepository(Manager::class)->findOneBy(['email' => 'external_mgr@test.be']);
        $this->assertNotNull($refreshedManager?->getToken(),
            'Un token year-invitation doit être généré pour le lien accept/refuse');
    }

    // ── 4. Nouveau manager (email inconnu) → création compte ─────────────────

    public function testNewManagerCreatesAccountAndYearInvitation(): void
    {
        $token = $this->loginAndGetToken();

        $data = $this->authedPost(
            '/api/hospital-admin/managers',
            ['email' => 'brand_new_mgr@test.be', 'firstname' => 'Dan', 'lastname' => 'Nouveau', 'yearId' => self::$yearId],
            $token,
        );

        $this->assertResponseStatusCodeSame(201);
        $this->assertSame('pending', $data['status']);
        $this->assertFalse($data['accountActivated'],
            'accountActivated=false : nouveau compte non activé');

        $em = $this->getEm();
        $my = $em->getRepository(ManagerYears::class)->find($data['myId']);
        $this->assertNotNull($my->getInvitedAt(),
            'invitedAt doit être non-null pour un nouveau manager (setup en attente)');

        $newManager = $em->getRepository(Manager::class)->findOneBy(['email' => 'brand_new_mgr@test.be']);
        $this->assertNotNull($newManager, 'Le manager doit avoir été créé');
        $this->assertNotNull($newManager->getToken(), 'Un token de setup doit exister');
        $this->assertNull($newManager->getValidatedAt(), 'validatedAt doit être null (compte non activé)');
    }

    // ── 5. Doublon dans cette année → 409 message clair ─────────────────────

    public function testDuplicateManagerInYearReturns409WithClearMessage(): void
    {
        $token = $this->loginAndGetToken();

        // Premier ajout
        $this->authedPost(
            '/api/hospital-admin/managers',
            ['email' => 'duplicate_mgr@test.be', 'firstname' => 'Eve', 'lastname' => 'Dup', 'yearId' => self::$yearId],
            $token,
        );

        // Deuxième ajout du même email dans la même année
        $this->authedPost(
            '/api/hospital-admin/managers',
            ['email' => 'duplicate_mgr@test.be', 'firstname' => 'Eve', 'lastname' => 'Dup', 'yearId' => self::$yearId],
            $token,
        );

        $this->assertResponseStatusCodeSame(409);
        $data = json_decode(self::$client->getResponse()->getContent(), true);
        $this->assertStringContainsString('déjà associé', $data['message'] ?? '',
            'Le message d\'erreur doit indiquer clairement le doublon');
    }

    // ── 6. resendManagerInvite : auto-ajouté, compte non activé ──────────────

    public function testResendInviteForAutoAddedNotActivatedSendsActivationEmail(): void
    {
        $em     = $this->getEm();
        $hasher = $this->getHasher();
        $token  = $this->loginAndGetToken();

        $hospital = $em->find(Hospital::class, self::$hospitalId);

        // Créer un manager auto-ajouté (invitedAt=null, token d'activation existant)
        $member = new Manager();
        $member->setEmail('resend_auto@test.be');
        $member->setFirstname('Frank');
        $member->setLastname('Auto');
        $member->setRole('manager');
        $member->setRoles(['ROLE_MANAGER']);
        $member->setSexe(Sexe::Male);
        $member->setJob(null);
        $member->setPassword($hasher->hashPassword($member, bin2hex(random_bytes(16))));
        $member->setCreatedAt(new \DateTime());
        $member->addHospital($hospital);
        $em->persist($member);
        $em->flush();

        // Ajouter via l'API (cas auto-ajouté, compte non activé)
        $addData = $this->authedPost(
            '/api/hospital-admin/managers',
            ['email' => 'resend_auto@test.be', 'firstname' => 'Frank', 'lastname' => 'Auto', 'yearId' => self::$yearId],
            $token,
        );
        $this->assertResponseStatusCodeSame(201);

        // Récupérer le myId et vérifier invitedAt=null
        $em->clear();
        $my = $em->getRepository(ManagerYears::class)->find($addData['myId']);
        $this->assertNull($my->getInvitedAt(), 'Auto-ajouté : invitedAt doit être null');

        // Appeler resendManagerInvite
        self::$client->request(
            'POST', '/api/hospital-admin/manager-years/' . $addData['myId'] . '/resend-invite',
            [], [], ['HTTP_AUTHORIZATION' => "Bearer $token", 'CONTENT_TYPE' => 'application/json'],
        );

        $this->assertResponseStatusCodeSame(200);
        // Vérifier que le token a été régénéré (activation renvoyée)
        $em->clear();
        $refreshed = $em->getRepository(Manager::class)->findOneBy(['email' => 'resend_auto@test.be']);
        $this->assertNotNull($refreshed->getToken(),
            'Un token d\'activation doit avoir été régénéré lors du resend');
    }
}
