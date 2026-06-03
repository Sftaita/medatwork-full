<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\Resident;
use App\Enum\HospitalAdminStatus;
use App\Enum\ManagerJob;
use App\Enum\ManagerStatus;
use App\Enum\Sexe;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Validation de non-régression sécurité — P1 Backend
 *
 * Vérifie que l'ajout du UserChecker sur le firewall `api` n'introduit
 * aucune régression pour les utilisateurs valides, et que les comportements
 * attendus pour les managers Inactive sont correctement appliqués.
 *
 * Firewalls concernés :
 *   - login  (/api/login)        : user_checker pré-existant
 *   - refresh (/api/token/refresh): AUCUN user_checker (gap documenté en SEC-P1-04)
 *   - api    (/api)              : user_checker ajouté en P1
 *
 * Scenarios :
 *   SEC-P1-01 : Manager Active → login OK + API OK
 *   SEC-P1-02 : Manager Inactive → login REFUSÉ (401) + API REFUSÉE (401)
 *   SEC-P1-03 : Manager Active + refresh token → nouveau JWT délivré
 *   SEC-P1-04 : Manager Inactive + refresh token → refresh ACCEPTÉ (gap firewall)
 *               + nouveau JWT → API REFUSÉE (UserChecker sur api firewall)
 *   SEC-P1-05 : HospitalAdmin Active → login OK + API OK
 *   SEC-P1-06 : Resident Active → login OK + API OK
 *   SEC-P1-07 : Re-run des tests ApiAuthTest existants (régression)
 */
class SecurityNonRegressionTest extends WebTestCase
{
    private static KernelBrowser $client;
    private static int $activeManagerId;
    private static int $inactiveManagerId;
    private static int $activeHospAdminId;
    private static int $activeResidentId;

    private const PASSWORD = 'Password123!';

    // Emails
    private const EMAIL_ACTIVE_MGR   = 'sec_active_mgr@test.be';
    private const EMAIL_INACTIVE_MGR = 'sec_inactive_mgr@test.be';
    private const EMAIL_HOSP_ADMIN   = 'sec_hosp_admin@test.be';
    private const EMAIL_RESIDENT     = 'sec_resident@test.be';

    // ── Setup ────────────────────────────────────────────────────────────────

    public static function setUpBeforeClass(): void
    {
        static::ensureKernelShutdown();
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

        $hospital = new Hospital();
        $hospital->setName('Sécurité Test Hôpital')->setCreatedAt(new \DateTime());
        $em->persist($hospital);

        // ── Manager Active ─────────────────────────────────────────────────
        $activeMgr = self::buildManager(self::EMAIL_ACTIVE_MGR, $hasher, $hospital);
        $activeMgr->setStatus(ManagerStatus::Active);
        $em->persist($activeMgr);

        // ── Manager Inactive ───────────────────────────────────────────────
        $inactiveMgr = self::buildManager(self::EMAIL_INACTIVE_MGR, $hasher, $hospital);
        $inactiveMgr->setStatus(ManagerStatus::Inactive);
        $em->persist($inactiveMgr);

        // ── HospitalAdmin Active ───────────────────────────────────────────
        $hospAdmin = new HospitalAdmin();
        $hospAdmin->setEmail(self::EMAIL_HOSP_ADMIN)
                  ->setFirstname('Admin')
                  ->setLastname('Sécurité')
                  ->setRoles(['ROLE_HOSPITAL_ADMIN'])
                  ->setHospital($hospital)
                  ->setStatus(HospitalAdminStatus::Active)
                  ->setPassword($hasher->hashPassword($hospAdmin, self::PASSWORD));
        $em->persist($hospAdmin);

        // ── Resident Active ────────────────────────────────────────────────
        $resident = new Resident();
        $resident->setEmail(self::EMAIL_RESIDENT)
                 ->setFirstname('Résident')
                 ->setLastname('Sécurité')
                 ->setRole('resident')
                 ->setRoles(['ROLE_RESIDENT'])
                 ->setSexe(Sexe::Male)
                 ->setDateOfMaster(new \DateTime('2020-01-01'))
                 ->setValidatedAt(new \DateTime())
                 ->setPassword($hasher->hashPassword($resident, self::PASSWORD))
                 ->setCreatedAt(new \DateTime());
        $em->persist($resident);

        $em->flush();

        self::$activeManagerId   = (int) $activeMgr->getId();
        self::$inactiveManagerId = (int) $inactiveMgr->getId();
        self::$activeHospAdminId = (int) $hospAdmin->getId();
        self::$activeResidentId  = (int) $resident->getId();
    }

    private static function buildManager(
        string                      $email,
        UserPasswordHasherInterface $hasher,
        Hospital                    $hospital,
    ): Manager {
        $m = new Manager();
        $m->setEmail($email)
          ->setFirstname('Test')
          ->setLastname('Manager')
          ->setRole('manager')
          ->setRoles(['ROLE_MANAGER'])
          ->setSexe(Sexe::Male)
          ->setJob(ManagerJob::MedicalSupervisor)
          ->setValidatedAt(new \DateTime())
          ->setCanCreateYear(true)
          ->setPassword($hasher->hashPassword($m, self::PASSWORD))
          ->setCreatedAt(new \DateTime())
          ->addHospital($hospital);
        return $m;
    }

    protected function tearDown(): void { /* Keep kernel alive across tests */ }

    public static function tearDownAfterClass(): void
    {
        static::ensureKernelShutdown();
        parent::tearDownAfterClass();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function login(string $email): ?string
    {
        self::$client->request('POST', '/api/login_check', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode(['username' => $email, 'password' => self::PASSWORD]));

        if (self::$client->getResponse()->getStatusCode() !== 200) {
            return null;
        }

        $data = json_decode(self::$client->getResponse()->getContent(), true);
        return $data['token'] ?? null;
    }

    private function loginStatus(string $email): int
    {
        self::$client->request('POST', '/api/login_check', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode(['username' => $email, 'password' => self::PASSWORD]));

        return self::$client->getResponse()->getStatusCode();
    }

    private function apiRequest(string $jwt): int
    {
        self::$client->request('GET', '/api/fetchManagers', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer '.$jwt,
        ]);
        return self::$client->getResponse()->getStatusCode();
    }

    // ── SEC-P1-01 : Manager Active → login OK + API OK ────────────────────

    /**
     * Vérifie qu'un manager Actif peut toujours se connecter et utiliser l'API.
     * Régression : user_checker ne doit pas bloquer les comptes valides.
     */
    public function testSEC_P1_01_ActiveManagerLoginAndApiAccess(): void
    {
        $loginStatus = $this->loginStatus(self::EMAIL_ACTIVE_MGR);
        self::assertSame(200, $loginStatus,
            'SEC-P1-01 : Manager Active doit pouvoir se connecter (200)'
        );

        $jwt = $this->login(self::EMAIL_ACTIVE_MGR);
        self::assertNotNull($jwt, 'SEC-P1-01 : JWT doit être retourné pour Manager Active');

        $apiStatus = $this->apiRequest($jwt);
        self::assertNotSame(401, $apiStatus,
            'SEC-P1-01 : Manager Active ne doit pas être bloqué par le UserChecker (pas 401)'
        );
        self::assertNotSame(403, $apiStatus,
            'SEC-P1-01 : Manager Active ne doit pas être refusé par les droits (pas 403)'
        );
    }

    // ── SEC-P1-02 : Manager Inactive → login REFUSÉ + API REFUSÉE ──────────

    /**
     * Vérifie que :
     *   (a) Un manager Inactive est bloqué à la connexion (firewall `login` a user_checker).
     *   (b) Si un JWT a été obtenu avant la désactivation, les requêtes API sont bloquées
     *       (firewall `api` a user_checker — ajouté en P1).
     */
    public function testSEC_P1_02_InactiveManagerLoginRefused(): void
    {
        // (a) Login direct → user_checker checkPreAuth → AccountDisabledException → 401
        $loginStatus = $this->loginStatus(self::EMAIL_INACTIVE_MGR);
        self::assertSame(401, $loginStatus,
            'SEC-P1-02 : Manager Inactive doit être refusé à la connexion (401)'
        );
    }

    public function testSEC_P1_02_InactiveManagerApiAccessRefusedWithPreObtainedJwt(): void
    {
        $container = self::$client->getContainer();
        /** @var EntityManagerInterface $em */
        $em = $container->get('doctrine')->getManager();

        // Créer un manager temporaire qui commence comme Active
        $hospital = $em->getRepository(Hospital::class)->findOneBy([]);
        $hasher   = $container->get(UserPasswordHasherInterface::class);

        $tempMgr = self::buildManager('sec_temp_mgr@test.be', $hasher, $hospital);
        $tempMgr->setStatus(ManagerStatus::Active);
        $em->persist($tempMgr);
        $em->flush();
        $tempMgrId = (int) $tempMgr->getId();

        // Obtenir le JWT pendant qu'il est Active
        $jwt = $this->login('sec_temp_mgr@test.be');
        self::assertNotNull($jwt, 'Le JWT doit être obtenu quand le manager est Active');

        // Recharger l'entité depuis la DB (la requête HTTP peut détacher les entités de l'EM)
        $em->clear();
        $reloaded = $em->find(Manager::class, $tempMgrId);
        self::assertNotNull($reloaded);
        $reloaded->setStatus(ManagerStatus::Inactive);
        $em->flush();
        $em->clear();

        // Utiliser le JWT (toujours cryptographiquement valide) → doit être bloqué
        $apiStatus = $this->apiRequest($jwt);
        self::assertSame(401, $apiStatus,
            'SEC-P1-02 : Manager Inactive doit être bloqué sur l\'API même avec un JWT valide (401)'
        );
    }

    // ── SEC-P1-03 : Manager Active + refresh token → nouveau JWT ───────────

    /**
     * Vérifie que le flux de refresh fonctionne normalement pour un manager Actif.
     * Régression : l'ajout du user_checker ne doit pas casser le refresh.
     */
    public function testSEC_P1_03_ActiveManagerRefreshTokenDeliversNewJwt(): void
    {
        // 1. Login → JWT + REFRESH_TOKEN cookie stocké dans le jar du browser
        $firstJwt = $this->login(self::EMAIL_ACTIVE_MGR);
        self::assertNotNull($firstJwt, 'Premier JWT requis pour tester le refresh');

        // 2. Vérifier que le cookie REFRESH_TOKEN a été posé
        $cookie = self::$client->getCookieJar()->get('REFRESH_TOKEN');

        if ($cookie === null) {
            // Le cookie peut ne pas être disponible dans le test env (secure=true sur HTTP)
            // Dans ce cas, on insère manuellement un refresh token valide en DB
            $container = self::$client->getContainer();
            /** @var EntityManagerInterface $em */
            $em = $container->get('doctrine')->getManager();

            $tokenValue  = bin2hex(random_bytes(64));
            $validUntil  = (new \DateTime())->modify('+1 hour')->format('Y-m-d H:i:s');
            $em->getConnection()->executeStatement(
                'INSERT INTO refresh_tokens (refresh_token, username, valid) VALUES (?, ?, ?)',
                [$tokenValue, self::EMAIL_ACTIVE_MGR, $validUntil]
            );

            // 3a. Refresh via body parameter (fallback si pas de cookie)
            self::$client->request('POST', '/api/token/refresh', [], [], [
                'CONTENT_TYPE' => 'application/json',
            ], json_encode(['refresh_token' => $tokenValue]));
        } else {
            // 3b. Refresh via cookie (le browser l'envoie automatiquement)
            self::$client->request('POST', '/api/token/refresh', [], [], [
                'CONTENT_TYPE' => 'application/json',
            ]);
        }

        $status = self::$client->getResponse()->getStatusCode();
        self::assertSame(200, $status,
            'SEC-P1-03 : Le refresh doit fonctionner pour un Manager Active'
        );

        $data = json_decode(self::$client->getResponse()->getContent(), true);
        self::assertArrayHasKey('token', $data,
            'SEC-P1-03 : Un nouveau JWT doit être retourné après refresh'
        );
        self::assertNotEmpty($data['token']);
    }

    // ── SEC-P1-04 : Manager Inactive + refresh → gap documenté ─────────────

    /**
     * Documente le gap sécurité : le firewall `refresh` N'A PAS de user_checker.
     *
     * Comportement observé :
     *   - Le refresh lui-même RÉUSSIT (200) — le UserChecker n'est pas appelé
     *   - Le nouveau JWT, utilisé sur l'API, est BLOQUÉ (401) — api firewall a user_checker
     *
     * Recommandation : ajouter user_checker au firewall `refresh` dans security.yaml.
     */
    public function testSEC_P1_04_InactiveManagerRefreshBehaviorDocumented(): void
    {
        $container = self::$client->getContainer();
        /** @var EntityManagerInterface $em */
        $em = $container->get('doctrine')->getManager();

        // Créer un manager qui sera désactivé après avoir obtenu un refresh token
        $hospital  = $em->getRepository(Hospital::class)->findOneBy([]);
        $hasher    = $container->get(UserPasswordHasherInterface::class);

        $email = 'sec_inactive_refresh@test.be';
        $mgr   = self::buildManager($email, $hasher, $hospital);
        $mgr->setStatus(ManagerStatus::Active);
        $em->persist($mgr);
        $em->flush();

        // Insérer un refresh token valide pour ce manager
        $tokenValue = bin2hex(random_bytes(64));
        $validUntil = (new \DateTime())->modify('+1 hour')->format('Y-m-d H:i:s');
        $em->getConnection()->executeStatement(
            'INSERT INTO refresh_tokens (refresh_token, username, valid) VALUES (?, ?, ?)',
            [$tokenValue, $email, $validUntil]
        );

        // Passer le manager à Inactive
        $mgr->setStatus(ManagerStatus::Inactive);
        $em->flush();
        $em->clear();

        // Tenter le refresh : firewall `refresh` n'a pas user_checker → RÉUSSIT (gap connu)
        self::$client->request('POST', '/api/token/refresh', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode(['refresh_token' => $tokenValue]));

        $refreshStatus = self::$client->getResponse()->getStatusCode();

        // COMPORTEMENT ACTUEL DOCUMENTÉ : le refresh réussit malgré le statut Inactive
        // Ce test est intentionnellement assertSame(200, ...) pour DOCUMENTER le gap.
        // TODO P2 : ajouter user_checker sur le firewall `refresh` dans security.yaml
        self::assertSame(200, $refreshStatus,
            'SEC-P1-04 GAP DOCUMENTÉ : le firewall `refresh` n\'a pas de user_checker — '.
            'un manager Inactive peut toujours rafraîchir son token. '.
            'Recommandation P2 : ajouter user_checker au firewall refresh.'
        );

        // Mais le nouveau JWT, utilisé sur l'API, est bloqué par user_checker
        $refreshData = json_decode(self::$client->getResponse()->getContent(), true);
        if (isset($refreshData['token'])) {
            $newJwt    = $refreshData['token'];
            $apiStatus = $this->apiRequest($newJwt);
            self::assertSame(401, $apiStatus,
                'SEC-P1-04 : Le nouveau JWT d\'un manager Inactive doit être bloqué sur l\'API (401)'
            );
        }
    }

    // ── SEC-P1-05 : HospitalAdmin Active → login OK + API OK ────────────────

    /**
     * Vérifie qu'un HospitalAdmin Active n'est pas impacté par les changements P1.
     * UserChecker ne bloque que HospitalAdminStatus::Invited, pas Active.
     */
    public function testSEC_P1_05_ActiveHospAdminLoginAndApiAccess(): void
    {
        $loginStatus = $this->loginStatus(self::EMAIL_HOSP_ADMIN);
        self::assertSame(200, $loginStatus,
            'SEC-P1-05 : HospitalAdmin Active doit pouvoir se connecter (200)'
        );

        $jwt = $this->login(self::EMAIL_HOSP_ADMIN);
        self::assertNotNull($jwt, 'SEC-P1-05 : JWT doit être retourné pour HospitalAdmin Active');

        // Vérifier que le JWT est accepté par le firewall api (user_checker ne bloque pas Active)
        self::$client->request('GET', '/api/fetchManagers', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer '.$jwt,
        ]);
        $apiStatus = self::$client->getResponse()->getStatusCode();
        self::assertNotSame(401, $apiStatus,
            'SEC-P1-05 : HospitalAdmin Active ne doit pas être bloqué par le UserChecker'
        );
    }

    // ── SEC-P1-06 : Resident Active → login OK + API OK ─────────────────────

    /**
     * Vérifie qu'un Resident Active n'est pas impacté par les changements P1.
     */
    public function testSEC_P1_06_ActiveResidentLoginAndApiAccess(): void
    {
        $loginStatus = $this->loginStatus(self::EMAIL_RESIDENT);
        self::assertSame(200, $loginStatus,
            'SEC-P1-06 : Resident Active doit pouvoir se connecter (200)'
        );

        $jwt = $this->login(self::EMAIL_RESIDENT);
        self::assertNotNull($jwt, 'SEC-P1-06 : JWT doit être retourné pour Resident Active');

        // Endpoint accessible aux résidents
        self::$client->request('GET', '/api/managers/years/getManagersYears', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer '.$jwt,
        ]);
        $apiStatus = self::$client->getResponse()->getStatusCode();
        self::assertNotSame(401, $apiStatus,
            'SEC-P1-06 : Resident Active ne doit pas être bloqué par le UserChecker (pas 401)'
        );
    }

    // ── SEC-P1-07 : Tests existants ApiAuthTest inchangés ────────────────────

    /**
     * Re-vérifie les comportements couverts par ApiAuthTest dans ce contexte.
     * Garantit qu'aucun test de sécurité existant n'a changé de comportement.
     */
    public function testSEC_P1_07_LoginWithInvalidCredentialsStillReturns401(): void
    {
        self::$client->request('POST', '/api/login_check', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode(['username' => 'nobody@sec.test', 'password' => 'wrong']));

        self::assertSame(401, self::$client->getResponse()->getStatusCode(),
            'SEC-P1-07 : login invalide doit retourner 401 (régression ApiAuthTest)'
        );
    }

    public function testSEC_P1_07_ApiEndpointWithoutTokenStillReturns401(): void
    {
        self::$client->request('GET', '/api/fetchManagers');
        self::assertSame(401, self::$client->getResponse()->getStatusCode(),
            'SEC-P1-07 : endpoint sans token doit retourner 401 (régression ApiAuthTest)'
        );
    }

    public function testSEC_P1_07_ActiveManagerJwtStillGrantsAccess(): void
    {
        $jwt = $this->login(self::EMAIL_ACTIVE_MGR);
        self::assertNotNull($jwt);

        self::$client->request('GET', '/api/fetchManagers', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer '.$jwt,
        ]);
        self::assertSame(200, self::$client->getResponse()->getStatusCode(),
            'SEC-P1-07 : Manager Active doit accéder à fetchManagers (régression ApiAuthTest)'
        );
    }

    public function testSEC_P1_07_ResidentJwtStillRefusedOnManagerEndpoint(): void
    {
        $jwt = $this->login(self::EMAIL_RESIDENT);
        self::assertNotNull($jwt);

        self::$client->request('GET', '/api/fetchManagers', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer '.$jwt,
        ]);
        self::assertSame(403, self::$client->getResponse()->getStatusCode(),
            'SEC-P1-07 : Resident doit être refusé sur endpoint Manager (régression ApiAuthTest)'
        );
    }
}
