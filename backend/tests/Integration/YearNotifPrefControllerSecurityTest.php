<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Years;
use App\Enum\HospitalAdminStatus;
use App\Enum\Sexe;
use App\Enum\YearStatus;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * P0 — Sécurité controller YearNotifPref
 *
 * RED attendu : 404 sur GET/PATCH /api/years/{id}/my-notif-prefs
 * (route inexistante car controller pas encore créé)
 */
class YearNotifPrefControllerSecurityTest extends WebTestCase
{
    private static KernelBrowser $client;
    private static int $yearId;
    private static string $tokenManagerA;
    private static string $tokenManagerB;    // non lié à l'année
    private static string $tokenHospAdminSameHosp;
    private static string $tokenHospAdminOtherHosp;

    private const PASSWORD = 'Password123!';
    private const BASE_URL = '/api/years';

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
                username VARCHAR(255) NOT NULL,
                valid DATETIME NOT NULL,
                UNIQUE (refresh_token)
            )
        ');

        /** @var UserPasswordHasherInterface $hasher */
        $hasher = $container->get(UserPasswordHasherInterface::class);

        // Hôpitaux
        $hospA = self::makeHospital($em, 'Hôpital A');
        $hospB = self::makeHospital($em, 'Hôpital B');

        // Manager A — lié à l'année (hôpital A)
        $mgrA = self::makeManager($em, $hasher, 'manager_a@test.be', $hospA);

        // Manager B — NON lié à l'année (hôpital A)
        $mgrB = self::makeManager($em, $hasher, 'manager_b@test.be', $hospA);

        // HospitalAdmin hôpital A
        $haA = self::makeHospAdmin($em, $hasher, 'ha_a@test.be', $hospA);

        // HospitalAdmin hôpital B (autre hôpital)
        $haB = self::makeHospAdmin($em, $hasher, 'ha_b@test.be', $hospB);

        // Année liée à l'hôpital A
        $year = new Years();
        $year->setTitle('Cardio 2025')
             ->setPeriod('2025-2026')
             ->setDateOfStart(new \DateTime('2025-09-01'))
             ->setDateOfEnd(new \DateTime('2026-08-31'))
             ->setStatus(YearStatus::Active)
             ->setHospital($hospA)
             ->setCreatedAt(new \DateTime())
             ->setToken(bin2hex(random_bytes(4)));
        $em->persist($year);

        // Lier Manager A à l'année (pas Manager B)
        $rel = new ManagerYears();
        $rel->setManager($mgrA)
            ->setYears($year)
            ->setAdmin(true)
            ->setDataAccess(true)
            ->setDataValidation(true)
            ->setDataDownload(true)
            ->setHasAgendaAccess(true)
            ->setCanManageAgenda(true);
        $em->persist($rel);

        $em->flush();
        self::$yearId = (int) $year->getId();

        // Récupère les tokens JWT via login
        self::$tokenManagerA          = self::login('manager_a@test.be');
        self::$tokenManagerB          = self::login('manager_b@test.be');
        self::$tokenHospAdminSameHosp = self::login('ha_a@test.be');
        self::$tokenHospAdminOtherHosp= self::login('ha_b@test.be');
    }

    // ── Factories ─────────────────────────────────────────────────────────────

    private static function makeHospital(EntityManagerInterface $em, string $name): Hospital
    {
        $h = new Hospital();
        $h->setName($name)->setCreatedAt(new \DateTime());
        $em->persist($h);
        return $h;
    }

    private static function makeManager(
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher,
        string $email,
        Hospital $hospital,
    ): Manager {
        $m = new Manager();
        $m->setEmail($email)
          ->setFirstname('Test')
          ->setLastname('Manager')
          ->setRole('manager')
          ->setRoles(['ROLE_MANAGER'])
          ->setSexe(Sexe::Male)
          ->setJob(null)
          ->setValidatedAt(new \DateTime())
          ->setCanCreateYear(true)
          ->setPassword($hasher->hashPassword($m, self::PASSWORD))
          ->setCreatedAt(new \DateTime())
          ->addHospital($hospital);
        $em->persist($m);
        return $m;
    }

    private static function makeHospAdmin(
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher,
        string $email,
        Hospital $hospital,
    ): HospitalAdmin {
        $ha = new HospitalAdmin();
        $ha->setEmail($email)
           ->setFirstname('Admin')
           ->setLastname('Test')
           ->setRoles(['ROLE_HOSPITAL_ADMIN'])
           ->setHospital($hospital)
           ->setStatus(HospitalAdminStatus::Active)
           ->setPassword($hasher->hashPassword($ha, self::PASSWORD));
        $em->persist($ha);
        return $ha;
    }

    private static function login(string $email): string
    {
        self::$client->request('POST', '/api/login_check', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode(['username' => $email, 'password' => self::PASSWORD]));

        $data = json_decode(self::$client->getResponse()->getContent(), true);
        return $data['token'] ?? '';
    }

    protected function tearDown(): void { /* Keep kernel alive */ }

    private function get(int $yearId, string $token): int
    {
        self::$client->request('GET', self::BASE_URL."/{$yearId}/my-notif-prefs", [], [], [
            'HTTP_AUTHORIZATION' => "Bearer {$token}",
        ]);
        return self::$client->getResponse()->getStatusCode();
    }

    private function patch(int $yearId, string $token, array $body = []): int
    {
        self::$client->request('PATCH', self::BASE_URL."/{$yearId}/my-notif-prefs", [], [], [
            'HTTP_AUTHORIZATION' => "Bearer {$token}",
            'CONTENT_TYPE'       => 'application/json',
        ], json_encode($body));
        return self::$client->getResponse()->getStatusCode();
    }

    // ── I01 : sans JWT → 401 ─────────────────────────────────────────────────

    public function testGetWithoutTokenReturns401(): void
    {
        self::$client->request('GET', self::BASE_URL.'/'.self::$yearId.'/my-notif-prefs');
        self::assertSame(401, self::$client->getResponse()->getStatusCode());
    }

    // ── I03 : année inexistante → 404 ────────────────────────────────────────

    public function testGetUnknownYearReturns404(): void
    {
        $status = $this->get(999999, self::$tokenManagerA);
        self::assertSame(404, $status);
    }

    // ── I04 : Manager non lié → 403 ──────────────────────────────────────────

    public function testGetByUnlinkedManagerReturns403(): void
    {
        $status = $this->get(self::$yearId, self::$tokenManagerB);
        self::assertSame(403, $status);
    }

    // ── I05 : Manager lié → 200 ──────────────────────────────────────────────

    public function testGetByLinkedManagerReturns200(): void
    {
        $status = $this->get(self::$yearId, self::$tokenManagerA);
        self::assertSame(200, $status);
    }

    // ── I06 : HospitalAdmin même hôpital → 200 ───────────────────────────────

    public function testGetByHospAdminSameHospitalReturns200(): void
    {
        $status = $this->get(self::$yearId, self::$tokenHospAdminSameHosp);
        self::assertSame(200, $status);
    }

    // ── I07 : HospitalAdmin autre hôpital → 403 ──────────────────────────────

    public function testGetByHospAdminOtherHospitalReturns403(): void
    {
        $status = $this->get(self::$yearId, self::$tokenHospAdminOtherHosp);
        self::assertSame(403, $status);
    }

    // ── I09 : PATCH sans JWT → 401 ───────────────────────────────────────────

    public function testPatchWithoutTokenReturns401(): void
    {
        self::$client->request('PATCH', self::BASE_URL.'/'.self::$yearId.'/my-notif-prefs', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], '{}');
        self::assertSame(401, self::$client->getResponse()->getStatusCode());
    }

    // ── I11 : PATCH Manager non lié → 403 ────────────────────────────────────

    public function testPatchByUnlinkedManagerReturns403(): void
    {
        $status = $this->patch(self::$yearId, self::$tokenManagerB, []);
        self::assertSame(403, $status);
    }

    // ── I12 : PATCH HospAdmin même hôpital → 200 ────────────────────────────

    public function testPatchByHospAdminSameHospitalReturns200(): void
    {
        $status = $this->patch(self::$yearId, self::$tokenHospAdminSameHosp, [
            'COMPLIANCE_ALERT' => ['email' => false],
        ]);
        self::assertSame(200, $status);
    }

    // ── I13 : PATCH HospAdmin autre hôpital → 403 ────────────────────────────

    public function testPatchByHospAdminOtherHospitalReturns403(): void
    {
        $status = $this->patch(self::$yearId, self::$tokenHospAdminOtherHosp, []);
        self::assertSame(403, $status);
    }

    // ── J01–J04 : isolation Manager A / B ────────────────────────────────────

    public function testManagerAAndBHaveIndependentPrefs(): void
    {
        // Manager A patches email=false
        $this->patch(self::$yearId, self::$tokenManagerA, [
            'COMPLIANCE_ALERT' => ['email' => false],
        ]);

        // Manager A voit email=false
        $this->get(self::$yearId, self::$tokenManagerA);
        $dataA = json_decode(self::$client->getResponse()->getContent(), true);

        self::assertFalse($dataA['prefs']['COMPLIANCE_ALERT']['email']);
    }

    public function testManagerBCannotReadManagerAPrefs(): void
    {
        // Manager A patches email=false
        $this->patch(self::$yearId, self::$tokenManagerA, [
            'COMPLIANCE_ALERT' => ['email' => false],
        ]);

        // Manager B est non lié → 403 (ne peut pas lire les prefs)
        $status = $this->get(self::$yearId, self::$tokenManagerB);
        self::assertSame(403, $status);
    }

    // ── J05 : userId dans le body ignoré ─────────────────────────────────────

    public function testUserIdInBodyIsIgnoredAndDoesNotModifyOtherUser(): void
    {
        // Manager A envoie un body avec userId=999 (tentative d'usurpation)
        self::$client->request('PATCH', self::BASE_URL.'/'.self::$yearId.'/my-notif-prefs', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer '.self::$tokenManagerA,
            'CONTENT_TYPE'       => 'application/json',
        ], json_encode([
            'userId'          => 999,
            'COMPLIANCE_ALERT'=> ['email' => false],
        ]));

        $status = self::$client->getResponse()->getStatusCode();
        // La requête doit réussir pour Manager A (userId ignoré)
        // ou échouer avec 400 (clé refusée par DTO)
        self::assertContains($status, [200, 400],
            'userId in body must be ignored or rejected — never modify another user'
        );

        if ($status === 200) {
            $data = json_decode(self::$client->getResponse()->getContent(), true);
            // Vérifie que la réponse ne contient pas userId dans les prefs
            self::assertArrayNotHasKey('userId', $data['prefs'] ?? []);
        }
    }

    // ── L01 : HospAdmin même hôpital → structure de réponse correcte ─────────

    public function testHospAdminSameHospitalGetsValidPrefStructure(): void
    {
        $this->get(self::$yearId, self::$tokenHospAdminSameHosp);
        $data = json_decode(self::$client->getResponse()->getContent(), true);

        self::assertArrayHasKey('prefs', $data);
        self::assertArrayHasKey('COMPLIANCE_ALERT', $data['prefs']);
        self::assertArrayHasKey('email', $data['prefs']['COMPLIANCE_ALERT']);
    }

    // ── Réponse GET Manager A contient la structure attendue ─────────────────

    public function testGetReturnsExpectedStructure(): void
    {
        $this->get(self::$yearId, self::$tokenManagerA);
        $data = json_decode(self::$client->getResponse()->getContent(), true);

        self::assertArrayHasKey('prefs', $data);

        // Tous les événements connus doivent être présents
        $knownEvents = [
            'COMPLIANCE_ALERT', 'MONTH_VALIDATION', 'STAFFPLANNER_EXPORT_DONE',
            'RESIDENT_INACTIVE', 'YEAR_ENDING', 'SCHEDULE_CHANGED', 'VALIDATION_REJECTED',
        ];
        foreach ($knownEvents as $event) {
            self::assertArrayHasKey($event, $data['prefs'], "Event {$event} missing from response");
            self::assertArrayHasKey('email', $data['prefs'][$event]);
        }
    }
}
