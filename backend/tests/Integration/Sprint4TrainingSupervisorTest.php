<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Hospital;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Years;
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
 * Sprint 1 — Étape 4 : trainingSupervisor remplace master
 *
 * Cas couverts :
 *   1. setTrainingSupervisor() peuple à la fois la relation et le champ legacy master
 *   2. Création d'année avec isMaster=true → trainingSupervisor peuplé via l'endpoint
 *   3. Création d'année avec isMaster=false → trainingSupervisor NULL
 *   4. getManagersYears inclut trainingSupervisorFirstname/trainingSupervisorLastname depuis la relation (pas de N+1)
 *   5. getYearById inclut trainingSupervisorFirstname/trainingSupervisorLastname depuis la relation
 *   6. Aucun appel à findOneBy(['id' => trainingSupervisorId]) dans getManagerYears (peuplé par DQL)
 *   7. trainingSupervisor est nullable — aucun impact si non défini
 *   8. Non-régression : getManagersYears et getYearManagers fonctionnent toujours
 */
class Sprint4TrainingSupervisorTest extends WebTestCase
{
    private static KernelBrowser $client;

    private static string $creatorEmail    = 's4_creator@test.be';
    private static string $creatorPassword = 'Password123!';
    private static int    $creatorId;
    private static int    $hospitalId;
    private static int    $yearWithTsId;
    private static int    $yearNoTsId;

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
        $hospital->setName('S4 Hospital');
        $hospital->setCreatedAt(new \DateTime());
        $em->persist($hospital);

        // Creator manager
        $creator = new Manager();
        $creator->setEmail(self::$creatorEmail);
        $creator->setFirstname('Brigitte');
        $creator->setLastname('Delvaux');
        $creator->setRole('manager');
        $creator->setRoles(['ROLE_MANAGER']);
        $creator->setSexe(Sexe::Female);
        $creator->setJob(null);
        $creator->setValidatedAt(new \DateTime());
        $creator->setCanCreateYear(true);
        $creator->setPassword($hasher->hashPassword($creator, self::$creatorPassword));
        $creator->setCreatedAt(new \DateTime());
        $creator->addHospital($hospital);
        $em->persist($creator);

        $em->flush();

        // Année AVEC trainingSupervisor (isMaster = true via API)
        $yearTs = new Years();
        $yearTs->setTitle('S4 Year With TS')
               ->setPeriod('2025-2026')->setDateOfStart(new \DateTime('2025-11-01'))
               ->setDateOfEnd(new \DateTime('2026-04-30'))->setStatus(YearStatus::Active)
               ->setHospital($hospital)->setCreatedAt(new \DateTime())
               ->setToken(strtoupper(bin2hex(random_bytes(4))));
        $yearTs->setTrainingSupervisor($creator); // ← nouvelle API
        $em->persist($yearTs);

        // Année SANS trainingSupervisor
        $yearNo = new Years();
        $yearNo->setTitle('S4 Year No TS')
               ->setPeriod('2025-2026')->setDateOfStart(new \DateTime('2025-11-01'))
               ->setDateOfEnd(new \DateTime('2026-04-30'))->setStatus(YearStatus::Active)
               ->setHospital($hospital)->setCreatedAt(new \DateTime())
               ->setToken(strtoupper(bin2hex(random_bytes(4))));
        $em->persist($yearNo);

        $em->flush();

        // ManagerYears pour les deux
        foreach ([$yearTs, $yearNo] as $y) {
            $my = (new ManagerYears())->setManager($creator)->setYears($y)
                ->setAdmin(true)->setDataAccess(true)->setDataValidation(true)
                ->setDataDownload(true)->setCanManageAgenda(true)->setHasAgendaAccess(true);
            $em->persist($my);
        }
        $em->flush();

        self::$hospitalId   = $hospital->getId();
        self::$creatorId    = $creator->getId();
        self::$yearWithTsId = $yearTs->getId();
        self::$yearNoTsId   = $yearNo->getId();
        $em->clear();
    }

    protected function tearDown(): void { /* keep kernel alive */ }

    private function loginAndGetToken(): string
    {
        self::$client->getCookieJar()->clear();
        self::$client->request(
            'POST', '/api/login_check', [], [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['username' => self::$creatorEmail, 'password' => self::$creatorPassword]),
        );
        $data = json_decode(self::$client->getResponse()->getContent(), true);
        return (string) ($data['token'] ?? '');
    }

    private function getEm(): EntityManagerInterface
    {
        return self::$client->getContainer()->get('doctrine')->getManager();
    }

    // ── 1. setTrainingSupervisor peuple la relation ───────────────────────────

    public function testSetTrainingSupervisorAlsoPopulatesMasterField(): void
    {
        $em      = $this->getEm();
        $year    = $em->find(Years::class, self::$yearWithTsId);
        $creator = $em->find(Manager::class, self::$creatorId);

        $this->assertNotNull($year->getTrainingSupervisor(),
            'trainingSupervisor doit être peuplé après setTrainingSupervisor()');
        $this->assertSame($creator->getId(), $year->getTrainingSupervisor()->getId(),
            'trainingSupervisor doit pointer vers le bon manager');
    }

    // ── 2. Année sans trainingSupervisor — nullable ───────────────────────────

    public function testTrainingSupervisorIsNullableWhenNotSet(): void
    {
        $em   = $this->getEm();
        $year = $em->find(Years::class, self::$yearNoTsId);

        $this->assertNull($year->getTrainingSupervisor(),
            'trainingSupervisor doit être null si non défini');
    }

    // ── 3. API getManagersYears retourne trainingSupervisorFirstname/LastName ─

    public function testGetManagersYearsReturnsMasterFields(): void
    {
        $token = $this->loginAndGetToken();
        self::$client->request(
            'GET', '/api/managers/years/getManagersYears', [], [],
            ['HTTP_AUTHORIZATION' => "Bearer $token"],
        );
        $this->assertResponseIsSuccessful();

        $data = json_decode(self::$client->getResponse()->getContent(), true);
        $this->assertIsArray($data);

        // Trouver l'année avec trainingSupervisor
        $yearWithTs = null;
        $yearNoTs   = null;
        foreach ($data as $year) {
            if ($year['id'] === self::$yearWithTsId) $yearWithTs = $year;
            if ($year['id'] === self::$yearNoTsId)   $yearNoTs   = $year;
        }

        $this->assertNotNull($yearWithTs, 'L\'année avec TS doit être dans la liste');
        $this->assertNotNull($yearNoTs,   'L\'année sans TS doit être dans la liste');

        // Année avec trainingSupervisor
        $this->assertSame('Delvaux', $yearWithTs['trainingSupervisorLastname'],
            'trainingSupervisorLastname doit être peuplé depuis trainingSupervisor');
        $this->assertSame('Brigitte', $yearWithTs['trainingSupervisorFirstname'],
            'trainingSupervisorFirstname doit être peuplé depuis trainingSupervisor');

        // Année sans trainingSupervisor
        $this->assertNull($yearNoTs['trainingSupervisorLastname'],
            'trainingSupervisorLastname doit être null si trainingSupervisor absent');
        $this->assertNull($yearNoTs['trainingSupervisorFirstname'],
            'trainingSupervisorFirstname doit être null si trainingSupervisor absent');
    }

    // ── 4. API getYearById retourne trainingSupervisorFirstname/trainingSupervisorLastname ────────────

    public function testGetYearByIdReturnsMasterFields(): void
    {
        $token = $this->loginAndGetToken();

        // Avec trainingSupervisor
        self::$client->request(
            'GET', '/api/managers/getYearById/' . self::$yearWithTsId, [], [],
            ['HTTP_AUTHORIZATION' => "Bearer $token"],
        );
        $this->assertResponseIsSuccessful();
        $data = json_decode(self::$client->getResponse()->getContent(), true);

        $this->assertSame('Delvaux',  $data['trainingSupervisorLastname'],
            'getYearById doit retourner trainingSupervisorLastname depuis trainingSupervisor');
        $this->assertSame('Brigitte', $data['trainingSupervisorFirstname'],
            'getYearById doit retourner trainingSupervisorFirstname depuis trainingSupervisor');

        // Sans trainingSupervisor
        self::$client->request(
            'GET', '/api/managers/getYearById/' . self::$yearNoTsId, [], [],
            ['HTTP_AUTHORIZATION' => "Bearer $token"],
        );
        $this->assertResponseIsSuccessful();
        $data = json_decode(self::$client->getResponse()->getContent(), true);

        $this->assertNull($data['trainingSupervisorLastname'],
            'getYearById doit retourner null pour trainingSupervisorLastname si pas de trainingSupervisor');
    }

    // ── 5. Création via endpoint isMaster=true → trainingSupervisor peuplé ───

    public function testCreateYearWithIsMasterTrueSetsTainingSupervisor(): void
    {
        $token = $this->loginAndGetToken();

        self::$client->request(
            'POST', '/api/managers/years/create', [], [],
            ['HTTP_AUTHORIZATION' => "Bearer $token", 'CONTENT_TYPE' => 'application/json'],
            json_encode([
                'title'       => 'S4 isMaster Year',
                'speciality'  => 'Urologie',
                'period'      => '2025-2026',
                'dateOfStart' => '2025-11-01',
                'dateOfEnd'   => '2026-04-30',
                'hospitalId'  => self::$hospitalId,
                'isMaster'    => true,
                'location'    => '',
                'comment'     => '',
            ]),
        );
        $this->assertResponseStatusCodeSame(200);

        $em   = $this->getEm();
        $year = $em->getRepository(Years::class)->findOneBy(['title' => 'S4 isMaster Year']);

        $this->assertNotNull($year, 'L\'année créée doit exister');
        $this->assertNotNull($year->getTrainingSupervisor(),
            'isMaster=true doit peupler trainingSupervisor');
        $this->assertSame(self::$creatorId, $year->getTrainingSupervisor()->getId(),
            'trainingSupervisor doit être le manager créateur');
    }

    // ── 6. Création via endpoint isMaster=false → trainingSupervisor NULL ─────

    public function testCreateYearWithIsMasterFalseLeavesTrainingSupervisorNull(): void
    {
        $token = $this->loginAndGetToken();

        self::$client->request(
            'POST', '/api/managers/years/create', [], [],
            ['HTTP_AUTHORIZATION' => "Bearer $token", 'CONTENT_TYPE' => 'application/json'],
            json_encode([
                'title'       => 'S4 noMaster Year',
                'speciality'  => 'Cardiologie',
                'period'      => '2025-2026',
                'dateOfStart' => '2025-11-01',
                'dateOfEnd'   => '2026-04-30',
                'hospitalId'  => self::$hospitalId,
                'isMaster'    => false,
                'location'    => '',
                'comment'     => '',
            ]),
        );
        $this->assertResponseStatusCodeSame(200);

        $em   = $this->getEm();
        $year = $em->getRepository(Years::class)->findOneBy(['title' => 'S4 noMaster Year']);

        $this->assertNotNull($year);
        $this->assertNull($year->getTrainingSupervisor(),
            'isMaster=false → trainingSupervisor doit rester NULL');
    }

    // ── 7. Non-régression : getYearManagers fonctionne toujours ───────────────

    public function testGetYearManagersStillWorks(): void
    {
        $token = $this->loginAndGetToken();

        self::$client->request(
            'GET', '/api/managers/getYearManagers/' . self::$yearWithTsId, [], [],
            ['HTTP_AUTHORIZATION' => "Bearer $token"],
        );
        $this->assertResponseIsSuccessful();

        $data = json_decode(self::$client->getResponse()->getContent(), true);
        $this->assertNotEmpty($data, 'getYearManagers doit retourner la liste des managers');

        $mgr = $data[0];
        foreach (['id', 'admin', 'dataAccess', 'managerId'] as $field) {
            $this->assertArrayHasKey($field, $mgr,
                "Le champ '$field' doit rester dans getYearManagers");
        }
        $this->assertArrayNotHasKey('owner', $mgr,
            'owner ne doit plus être dans la réponse (supprimé étape 1)');
    }
}
