<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Hospital;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Years;
use App\Enum\Sexe;
use App\Enum\YearStatus;
use App\Repository\ManagerYearsRepository;
use App\Services\YearsManagement\YearCreationInput;
use App\Services\YearsManagement\YearCreationService;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Sprint 1 — Suppression de ManagerYears.owner
 *
 * Vérifie que la suppression du champ `owner` ne casse aucun comportement
 * fonctionnel :
 *   1. La liste des années d'un manager est retournée sans le champ owner
 *   2. La liste des managers d'une année ne contient plus owner
 *   3. L'ajout d'un manager à une année fonctionne toujours
 *   4. La création d'une année par le service CreateYear ne dépend plus de owner
 *   5. Les réponses API structurellement utiles ne sont pas cassées
 *   6. ManagerYears peut être persisté sans le champ owner
 */
class Sprint1OwnerRemovalTest extends WebTestCase
{
    private static KernelBrowser $client;

    private static string $ownerEmail    = 's1_owner@test.be';
    private static string $ownerPassword = 'Password123!';
    private static string $guestEmail    = 's1_guest@test.be';

    private static int $yearId;
    private static int $ownerId;
    private static int $guestId;
    private static int $hospitalId;

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
        $hospital->setName('Sprint1 Hospital');
        $hospital->setCreatedAt(new \DateTime());
        $em->persist($hospital);

        // Owner manager
        $owner = new Manager();
        $owner->setEmail(self::$ownerEmail);
        $owner->setFirstname('Owner');
        $owner->setLastname('Sprint1');
        $owner->setRole('manager');
        $owner->setRoles(['ROLE_MANAGER']);
        $owner->setSexe(Sexe::Male);
        $owner->setJob(null);
        $owner->setValidatedAt(new \DateTime());
        $owner->setCanCreateYear(true);
        $owner->setPassword($hasher->hashPassword($owner, self::$ownerPassword));
        $owner->setCreatedAt(new \DateTime());
        $owner->addHospital($hospital);
        $em->persist($owner);

        // Guest manager (to be added later)
        $guest = new Manager();
        $guest->setEmail(self::$guestEmail);
        $guest->setFirstname('Guest');
        $guest->setLastname('Sprint1');
        $guest->setRole('manager');
        $guest->setRoles(['ROLE_MANAGER']);
        $guest->setSexe(Sexe::Female);
        $guest->setJob(null);
        $guest->setValidatedAt(new \DateTime());
        $guest->setPassword($hasher->hashPassword($guest, 'Password123!'));
        $guest->setCreatedAt(new \DateTime());
        $em->persist($guest);

        // Year
        $year = new Years();
        $year->setTitle('Sprint1 Year 2025');
        $year->setPeriod('2025-2026');
        $year->setDateOfStart(new \DateTime('2025-11-01'));
        $year->setDateOfEnd(new \DateTime('2026-04-30'));
        $year->setStatus(YearStatus::Active);
        $year->setHospital($hospital);
        $year->setCreatedAt(new \DateTime());
        $year->setToken(strtoupper(bin2hex(random_bytes(4))));
        $em->persist($year);

        $em->flush();

        // ManagerYears for owner — sans setOwner()
        $relation = (new ManagerYears())
            ->setManager($owner)
            ->setYears($year)
            ->setAdmin(true)
            ->setDataAccess(true)
            ->setDataValidation(true)
            ->setDataDownload(true)
            ->setCanManageAgenda(true)
            ->setHasAgendaAccess(true);
        $em->persist($relation);
        $em->flush();

        self::$yearId     = $year->getId();
        self::$ownerId    = $owner->getId();
        self::$guestId    = $guest->getId();
        self::$hospitalId = $hospital->getId();
        $em->clear();
    }

    protected function tearDown(): void { /* keep kernel alive */ }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function loginAndGetToken(): string
    {
        self::$client->getCookieJar()->clear();
        self::$client->request(
            'POST', '/api/login_check', [], [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['username' => self::$ownerEmail, 'password' => self::$ownerPassword]),
        );
        $data = json_decode(self::$client->getResponse()->getContent(), true);
        return (string) ($data['token'] ?? '');
    }

    private function authedGet(string $path, string $token): array
    {
        self::$client->request('GET', $path, [], [], ['HTTP_AUTHORIZATION' => "Bearer $token"]);
        return json_decode(self::$client->getResponse()->getContent(), true) ?? [];
    }

    private function authedPost(string $path, array $body, string $token): void
    {
        self::$client->request(
            'POST', $path, [], [],
            ['HTTP_AUTHORIZATION' => "Bearer $token", 'CONTENT_TYPE' => 'application/json'],
            json_encode($body),
        );
    }

    // ── 1. ManagerYears peut être persisté sans owner ─────────────────────────

    public function testManagerYearsCanBePersistedWithoutOwner(): void
    {
        $container = self::$client->getContainer();
        /** @var EntityManagerInterface $em */
        $em   = $container->get('doctrine')->getManager();
        $repo = $em->getRepository(ManagerYears::class);

        $relations = $repo->findBy(['years' => self::$yearId]);
        $this->assertNotEmpty($relations, 'La relation ManagerYears doit exister');

        $relation = $relations[0];
        // getOwner() ne doit plus exister sur l'entité
        $this->assertFalse(method_exists($relation, 'getOwner'),
            'getOwner() ne doit plus exister sur ManagerYears — champ owner supprimé');
        $this->assertFalse(method_exists($relation, 'setOwner'),
            'setOwner() ne doit plus exister sur ManagerYears — champ owner supprimé');
    }

    // ── 2. Liste des années du manager — owner absent de la réponse ───────────

    public function testManagerYearsListDoesNotContainOwnerField(): void
    {
        $token = $this->loginAndGetToken();

        $data = $this->authedGet('/api/managers/years/getManagersYears', $token);
        $this->assertResponseIsSuccessful();

        // La réponse doit contenir au moins une année
        $this->assertNotEmpty($data, 'La liste des années ne doit pas être vide');

        // owner ne doit plus apparaître dans aucun élément
        foreach ($data as $year) {
            $this->assertArrayNotHasKey('owner', $year,
                'Le champ owner ne doit plus être présent dans la réponse getManagersYears');
        }
    }

    // ── 3. Liste des managers d'une année — owner absent de la réponse ────────

    public function testYearManagersListDoesNotContainOwnerField(): void
    {
        $token = $this->loginAndGetToken();

        $data = $this->authedGet('/api/managers/getYearManagers/' . self::$yearId, $token);
        $this->assertResponseIsSuccessful();

        $this->assertNotEmpty($data, 'La liste des managers de l\'année ne doit pas être vide');

        foreach ($data as $manager) {
            $this->assertArrayNotHasKey('owner', $manager,
                'Le champ owner ne doit plus être présent dans la réponse getYearManagers');
        }
    }

    // ── 4. Les champs fonctionnels restent présents ───────────────────────────

    public function testManagerYearsListContainsFunctionalFields(): void
    {
        $token = $this->loginAndGetToken();
        $data  = $this->authedGet('/api/managers/years/getManagersYears', $token);
        $this->assertResponseIsSuccessful();

        $year = $data[0] ?? null;
        $this->assertNotNull($year, 'Au moins une année attendue');

        foreach (['id', 'title', 'admin', 'dataAccess', 'dataValidation', 'dataDownload'] as $field) {
            $this->assertArrayHasKey($field, $year,
                "Le champ fonctionnel '$field' doit rester présent après suppression de owner");
        }
    }

    public function testYearManagersListContainsFunctionalFields(): void
    {
        $token = $this->loginAndGetToken();
        $data  = $this->authedGet('/api/managers/getYearManagers/' . self::$yearId, $token);
        $this->assertResponseIsSuccessful();

        $mgr = $data[0] ?? null;
        $this->assertNotNull($mgr, 'Au moins un manager attendu');

        foreach (['id', 'admin', 'dataAccess', 'dataValidation', 'dataDownload', 'managerId'] as $field) {
            $this->assertArrayHasKey($field, $mgr,
                "Le champ fonctionnel '$field' doit rester présent dans fetchYearManagers");
        }
    }

    // ── 5. Ajout d'un manager à une année fonctionne sans owner ───────────────

    public function testAddManagerToYearWorksWithoutOwner(): void
    {
        $token = $this->loginAndGetToken();

        $this->authedPost('/api/managers/years/addManager', [
            'year'           => self::$yearId,
            'guest'          => self::$guestId,
            'admin'          => false,
            'dataAccess'     => true,
            'dataValidation' => false,
            'dataDownload'   => false,
            'agenda'         => false,
            'schedule'       => false,
        ], $token);

        $this->assertResponseStatusCodeSame(200,
            'L\'ajout d\'un manager à une année doit retourner 200');

        // Vérifier que la ManagerYears a bien été créée sans owner
        $container = self::$client->getContainer();
        /** @var EntityManagerInterface $em */
        $em       = $container->get('doctrine')->getManager();
        /** @var ManagerYearsRepository $repo */
        $repo     = $em->getRepository(ManagerYears::class);
        $year     = $em->find(Years::class, self::$yearId);
        $guest    = $em->find(Manager::class, self::$guestId);
        $relation = $repo->findOneBy(['manager' => $guest, 'years' => $year]);

        $this->assertNotNull($relation, 'La ManagerYears du guest doit être créée');
        $this->assertFalse(method_exists($relation, 'getOwner'),
            'getOwner() ne doit pas exister sur la nouvelle ManagerYears créée');
        $this->assertTrue($relation->getDataAccess());
        $this->assertFalse($relation->getAdmin());
    }

    // ── 6. Création d'année via YearCreationService ne dépend plus de owner ───

    public function testCreateYearServiceDoesNotUseOwner(): void
    {
        $container = self::$client->getContainer();

        /** @var EntityManagerInterface $em */
        $em = $container->get('doctrine')->getManager();
        /** @var YearCreationService $service */
        $service = $container->get(YearCreationService::class);

        $hospital = $em->find(Hospital::class, self::$hospitalId);

        $input = new YearCreationInput(
            title:       'Test Year Owner Removed',
            speciality:  'Urologie',
            period:      '2025-2026',
            dateOfStart: '2025-11-01',
            dateOfEnd:   '2026-04-30',
            hospital:    $hospital,
        );

        // YearCreationService ne doit pas lever d'exception
        $year = $service->create($input);
        $em->flush();

        $this->assertNotNull($year->getId(), 'L\'année doit être persistée');

        // YearCreationService ne crée PAS de ManagerYears (responsabilité du controller)
        $relations = $em->getRepository(ManagerYears::class)->findBy(['years' => $year]);
        $this->assertEmpty($relations,
            'YearCreationService ne doit pas créer de ManagerYears — propriété du controller');

        // Vérifier l'absence de owner sur toute ManagerYears existante en DB
        if (!empty($em->getRepository(ManagerYears::class)->findAll())) {
            $anyRelation = $em->getRepository(ManagerYears::class)->findAll()[0];
            $this->assertFalse(method_exists($anyRelation, 'getOwner'),
                'getOwner() ne doit plus exister sur ManagerYears');
        }
    }

    // ── 7. L'accès à une année (403 si non lié) fonctionne toujours ──────────

    public function testYearAccessDeniedForUnrelatedManager(): void
    {
        // Un manager sans ManagerYears sur cette année doit recevoir 403
        $container = self::$client->getContainer();
        /** @var EntityManagerInterface $em */
        $em     = $container->get('doctrine')->getManager();
        /** @var UserPasswordHasherInterface $hasher */
        $hasher = $container->get(UserPasswordHasherInterface::class);

        $unrelated = new Manager();
        $unrelated->setEmail('s1_unrelated@test.be');
        $unrelated->setFirstname('Unrelated');
        $unrelated->setLastname('Test');
        $unrelated->setRole('manager');
        $unrelated->setRoles(['ROLE_MANAGER']);
        $unrelated->setSexe(Sexe::Male);
        $unrelated->setJob(null);
        $unrelated->setValidatedAt(new \DateTime());
        $unrelated->setPassword($hasher->hashPassword($unrelated, 'Password123!'));
        $unrelated->setCreatedAt(new \DateTime());
        $em->persist($unrelated);
        $em->flush();
        $em->clear();

        self::$client->getCookieJar()->clear();
        self::$client->request(
            'POST', '/api/login_check', [], [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['username' => 's1_unrelated@test.be', 'password' => 'Password123!']),
        );
        $data  = json_decode(self::$client->getResponse()->getContent(), true);
        $token = (string) ($data['token'] ?? '');

        self::$client->request(
            'GET', '/api/managers/GetYearResidents/' . self::$yearId,
            [], [], ['HTTP_AUTHORIZATION' => "Bearer $token"],
        );

        $this->assertResponseStatusCodeSame(403,
            'Un manager sans relation à l\'année doit recevoir 403');
    }
}
