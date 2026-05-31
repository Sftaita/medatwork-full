<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Hospital;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Years;
use App\Enum\Sexe;
use App\Enum\YearStatus;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Integration — GET /api/managers/years/{yearId}/hospital-managers
 *
 * Vérifie que l'endpoint retourne TOUS les managers pouvant être ajoutés
 * à une année, qu'ils soient liés à l'hôpital via manager_hospital
 * OU via adminHospital.
 *
 * Cas couverts :
 *   1. Manager via manager_hospital → présent dans la réponse
 *   2. Manager via adminHospital    → présent dans la réponse (bug corrigé)
 *   3. Manager d'un autre hôpital   → absent de la réponse
 *   4. Requête sans lien à l'année  → 403
 *   5. Année inexistante            → 404
 */
class GetHospitalManagersForYearTest extends WebTestCase
{
    private static KernelBrowser $client;
    private static string $ownerEmail    = 'ghm_owner@test.be';
    private static string $ownerPassword = 'Password123!';
    private static int $yearId;
    private static int $viaJoinTableManagerId;
    private static int $viaAdminFieldManagerId;
    private static int $otherHospitalManagerId;

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

        // ── Hôpitaux ──────────────────────────────────────────────────────────
        $hospital = new Hospital();
        $hospital->setName('GHM Test Hospital');
        $hospital->setCreatedAt(new \DateTime());
        $em->persist($hospital);

        $otherHospital = new Hospital();
        $otherHospital->setName('Other Hospital');
        $otherHospital->setCreatedAt(new \DateTime());
        $em->persist($otherHospital);

        // ── Manager propriétaire (crée l'année) ───────────────────────────────
        $owner = self::makeManager($hasher, self::$ownerEmail, 'Owner', 'Manager');
        $owner->setCanCreateYear(true);
        $em->persist($owner);

        // ── Manager lié via join table ─────────────────────────────────────────
        $viaJoin = self::makeManager($hasher, 'ghm_join@test.be', 'Jean', 'JoinTable');
        $viaJoin->addHospital($hospital);
        $em->persist($viaJoin);

        // ── Manager lié via adminHospital (le bug) ────────────────────────────
        $viaAdmin = self::makeManager($hasher, 'ghm_admin@test.be', 'Brigitte', 'AdminField');
        $viaAdmin->setAdminHospital($hospital);
        $em->persist($viaAdmin);

        // ── Manager d'un autre hôpital ────────────────────────────────────────
        $otherMgr = self::makeManager($hasher, 'ghm_other@test.be', 'Paul', 'OtherHosp');
        $otherMgr->addHospital($otherHospital);
        $em->persist($otherMgr);

        // ── Année liée à l'hôpital cible ──────────────────────────────────────
        $year = new Years();
        $year->setTitle('Urologie 2025-2026 Semestre 2');
        $year->setPeriod('2025-2026');
        $year->setDateOfStart(new \DateTime('2025-11-01'));
        $year->setDateOfEnd(new \DateTime('2026-04-30'));
        $year->setStatus(YearStatus::Active);
        $year->setHospital($hospital);
        $year->setCreatedAt(new \DateTime());
        $year->setToken(strtoupper(bin2hex(random_bytes(4))));
        $em->persist($year);

        $em->flush();

        // Lier le propriétaire à l'année (simule CreateYear)
        $relation = new ManagerYears();
        $relation->setManager($owner)
            ->setYears($year)
            ->setAdmin(true)
            ->setDataAccess(true)
            ->setDataValidation(true)
            ->setDataDownload(true)
            ->setCanManageAgenda(true)
            ->setHasAgendaAccess(true);
        $em->persist($relation);
        $em->flush();

        self::$yearId                  = $year->getId();
        self::$viaJoinTableManagerId   = $viaJoin->getId();
        self::$viaAdminFieldManagerId  = $viaAdmin->getId();
        self::$otherHospitalManagerId  = $otherMgr->getId();

        $em->clear();
    }

    private static function makeManager(UserPasswordHasherInterface $hasher, string $email, string $first, string $last): Manager
    {
        $m = new Manager();
        $m->setEmail($email);
        $m->setFirstname($first);
        $m->setLastname($last);
        $m->setRole('manager');
        $m->setRoles(['ROLE_MANAGER']);
        $m->setSexe(Sexe::Female);
        $m->setJob(null);
        $m->setValidatedAt(new \DateTime());
        $m->setPassword($hasher->hashPassword($m, 'Password123!'));
        $m->setCreatedAt(new \DateTime());
        return $m;
    }

    protected function tearDown(): void { /* keep kernel alive */ }

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

    private function getHospitalManagers(int $yearId, string $token): array
    {
        self::$client->request(
            'GET',
            "/api/managers/years/$yearId/hospital-managers",
            [], [],
            ['HTTP_AUTHORIZATION' => "Bearer $token"],
        );
        return json_decode(self::$client->getResponse()->getContent(), true) ?? [];
    }

    // ── 1. Manager via join table → présent ───────────────────────────────────

    public function testManagerViaJoinTableAppearsInList(): void
    {
        $token   = $this->loginAndGetToken();
        $results = $this->getHospitalManagers(self::$yearId, $token);
        $this->assertResponseIsSuccessful();

        $ids = array_column($results, 'id');
        $this->assertContains(self::$viaJoinTableManagerId, $ids,
            'Un manager lié via manager_hospital doit apparaître dans la liste de l\'endpoint');
    }

    // ── 2. Manager via adminHospital → présent (bug corrigé) ──────────────────

    public function testManagerViaAdminHospitalAppearsInList(): void
    {
        $token   = $this->loginAndGetToken();
        $results = $this->getHospitalManagers(self::$yearId, $token);
        $this->assertResponseIsSuccessful();

        $ids = array_column($results, 'id');
        $this->assertContains(self::$viaAdminFieldManagerId, $ids,
            'Un manager lié via adminHospital (ex: Brigitte Delvaux) doit apparaître dans la liste — '
            . 'régression du bug où les admins hôpital étaient invisibles dans la recherche d\'ajout de partenaire');
    }

    // ── 3. Manager d'un autre hôpital → absent ────────────────────────────────

    public function testManagerFromOtherHospitalIsAbsent(): void
    {
        $token   = $this->loginAndGetToken();
        $results = $this->getHospitalManagers(self::$yearId, $token);
        $this->assertResponseIsSuccessful();

        $ids = array_column($results, 'id');
        $this->assertNotContains(self::$otherHospitalManagerId, $ids,
            'Un manager d\'un autre hôpital ne doit pas être proposable pour cette année');
    }

    // ── 4. Sans accès à l'année → 403 ────────────────────────────────────────

    public function testUnauthorizedManagerGets403(): void
    {
        // On crée un manager non lié à l'année et on essaie de fetch la liste
        $container = self::$client->getContainer();
        /** @var EntityManagerInterface $em */
        $em     = $container->get('doctrine')->getManager();
        $hasher = $container->get(UserPasswordHasherInterface::class);

        $outsider = self::makeManager($hasher, 'ghm_outsider@test.be', 'Outsider', 'User');
        $em->persist($outsider);
        $em->flush();
        $em->clear();

        self::$client->getCookieJar()->clear();
        self::$client->request(
            'POST', '/api/login_check', [], [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['username' => 'ghm_outsider@test.be', 'password' => 'Password123!']),
        );
        $data  = json_decode(self::$client->getResponse()->getContent(), true);
        $token = (string) ($data['token'] ?? '');

        self::$client->request(
            'GET',
            '/api/managers/years/' . self::$yearId . '/hospital-managers',
            [], [],
            ['HTTP_AUTHORIZATION' => "Bearer $token"],
        );

        $this->assertResponseStatusCodeSame(403,
            'Un manager sans lien avec l\'année doit recevoir 403');
    }

    // ── 5. Année inexistante → 404 ────────────────────────────────────────────

    public function testNonExistentYearGets404(): void
    {
        $token = $this->loginAndGetToken();

        self::$client->request(
            'GET',
            '/api/managers/years/999999/hospital-managers',
            [], [],
            ['HTTP_AUTHORIZATION' => "Bearer $token"],
        );

        $this->assertResponseStatusCodeSame(404,
            'Une année inexistante doit retourner 404');
    }
}
