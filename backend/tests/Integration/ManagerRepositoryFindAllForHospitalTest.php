<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Hospital;
use App\Entity\Manager;
use App\Enum\Sexe;
use App\Repository\ManagerRepository;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Integration — ManagerRepository::findAllForHospital()
 *
 * Vérifie que la méthode retourne TOUS les managers liés à un hôpital,
 * qu'ils soient liés via la join table manager_hospital (ManyToMany)
 * OU via le champ adminHospital (ManyToOne sur Manager).
 *
 * Cas couverts :
 *   1. Manager via manager_hospital → présent
 *   2. Manager via adminHospital    → présent (le bug corrigé)
 *   3. Manager dans les deux        → présent une seule fois (déduplication)
 *   4. Manager d'un autre hôpital   → absent
 *   5. Manager sans lien            → absent
 */
class ManagerRepositoryFindAllForHospitalTest extends KernelTestCase
{
    private static EntityManagerInterface $em;
    private static ManagerRepository $repo;
    private static int $hospitalId;
    private static int $otherHospitalId;

    // Manager IDs
    private static int $viaJoinTableId;
    private static int $viaAdminFieldId;
    private static int $viaBothId;
    private static int $otherHospitalId2;
    private static int $noLinkId;

    public static function setUpBeforeClass(): void
    {
        self::bootKernel();
        $container = static::getContainer();

        /** @var EntityManagerInterface $em */
        self::$em   = $container->get('doctrine')->getManager();
        self::$repo = $container->get(ManagerRepository::class);

        /** @var UserPasswordHasherInterface $hasher */
        $hasher = $container->get(UserPasswordHasherInterface::class);

        $metadata   = self::$em->getMetadataFactory()->getAllMetadata();
        $schemaTool = new SchemaTool(self::$em);
        $schemaTool->dropSchema($metadata);
        $schemaTool->createSchema($metadata);

        self::$em->getConnection()->executeStatement('
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
        $hospital->setName('Hôpital Cible');
        $hospital->setCreatedAt(new \DateTime());
        self::$em->persist($hospital);

        $otherHospital = new Hospital();
        $otherHospital->setName('Autre Hôpital');
        $otherHospital->setCreatedAt(new \DateTime());
        self::$em->persist($otherHospital);

        // ── Managers ──────────────────────────────────────────────────────────

        // 1. Lié via manager_hospital (ManyToMany)
        $viaJoinTable = self::makeManager($hasher, 'join@test.be', 'Jean', 'JoinTable');
        $viaJoinTable->addHospital($hospital);
        self::$em->persist($viaJoinTable);

        // 2. Lié via adminHospital (ManyToOne) — le bug était ici
        $viaAdminField = self::makeManager($hasher, 'admin@test.be', 'Brigitte', 'AdminField');
        $viaAdminField->setAdminHospital($hospital);
        self::$em->persist($viaAdminField);

        // 3. Lié des deux façons → doit apparaître UNE seule fois
        $viaBoth = self::makeManager($hasher, 'both@test.be', 'Sophie', 'Both');
        $viaBoth->addHospital($hospital);
        $viaBoth->setAdminHospital($hospital);
        self::$em->persist($viaBoth);

        // 4. Lié à l'AUTRE hôpital → ne doit pas apparaître
        $otherHosp = self::makeManager($hasher, 'other@test.be', 'Paul', 'OtherHosp');
        $otherHosp->addHospital($otherHospital);
        self::$em->persist($otherHosp);

        // 5. Aucun lien → ne doit pas apparaître
        $noLink = self::makeManager($hasher, 'nolink@test.be', 'Marc', 'NoLink');
        self::$em->persist($noLink);

        self::$em->flush();

        self::$hospitalId      = $hospital->getId();
        self::$otherHospitalId = $otherHospital->getId();
        self::$viaJoinTableId  = $viaJoinTable->getId();
        self::$viaAdminFieldId = $viaAdminField->getId();
        self::$viaBothId       = $viaBoth->getId();
        self::$otherHospitalId2 = $otherHosp->getId();
        self::$noLinkId        = $noLink->getId();

        self::$em->clear();
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

    protected function tearDown(): void { /* keep kernel alive across test methods */ }

    // ── 1. Manager via join table ─────────────────────────────────────────────

    public function testManagerViaJoinTableIsReturned(): void
    {
        $hospital = self::$em->find(Hospital::class, self::$hospitalId);
        $results  = self::$repo->findAllForHospital($hospital);
        $ids      = array_map(fn(Manager $m) => $m->getId(), $results);

        $this->assertContains(self::$viaJoinTableId, $ids,
            'Un manager lié via manager_hospital doit apparaître dans findAllForHospital()');
    }

    // ── 2. Manager via adminHospital (le bug corrigé) ─────────────────────────

    public function testManagerViaAdminHospitalIsReturned(): void
    {
        $hospital = self::$em->find(Hospital::class, self::$hospitalId);
        $results  = self::$repo->findAllForHospital($hospital);
        $ids      = array_map(fn(Manager $m) => $m->getId(), $results);

        $this->assertContains(self::$viaAdminFieldId, $ids,
            'Un manager lié via adminHospital doit apparaître dans findAllForHospital() — régression du bug Brigitte Delvaux');
    }

    // ── 3. Manager dans les deux — dédupliqué ─────────────────────────────────

    public function testManagerInBothIsReturnedOnlyOnce(): void
    {
        $hospital = self::$em->find(Hospital::class, self::$hospitalId);
        $results  = self::$repo->findAllForHospital($hospital);
        $ids      = array_map(fn(Manager $m) => $m->getId(), $results);

        $occurrences = array_count_values($ids)[self::$viaBothId] ?? 0;

        $this->assertSame(1, $occurrences,
            'Un manager lié des deux façons ne doit apparaître qu\'une seule fois (déduplication)');
    }

    // ── 4. Manager d'un autre hôpital — absent ────────────────────────────────

    public function testManagerFromOtherHospitalIsAbsent(): void
    {
        $hospital = self::$em->find(Hospital::class, self::$hospitalId);
        $results  = self::$repo->findAllForHospital($hospital);
        $ids      = array_map(fn(Manager $m) => $m->getId(), $results);

        $this->assertNotContains(self::$otherHospitalId2, $ids,
            'Un manager lié à un autre hôpital ne doit pas apparaître');
    }

    // ── 5. Manager sans lien — absent ────────────────────────────────────────

    public function testManagerWithNoLinkIsAbsent(): void
    {
        $hospital = self::$em->find(Hospital::class, self::$hospitalId);
        $results  = self::$repo->findAllForHospital($hospital);
        $ids      = array_map(fn(Manager $m) => $m->getId(), $results);

        $this->assertNotContains(self::$noLinkId, $ids,
            'Un manager sans lien avec l\'hôpital ne doit pas apparaître');
    }

    // ── 6. Compte total cohérent ──────────────────────────────────────────────

    public function testTotalCountIsCorrect(): void
    {
        $hospital = self::$em->find(Hospital::class, self::$hospitalId);
        $results  = self::$repo->findAllForHospital($hospital);

        // viaJoinTable + viaAdminField + viaBoth = 3 managers
        $this->assertCount(3, $results,
            'findAllForHospital() doit retourner exactement les 3 managers liés à cet hôpital');
    }
}
