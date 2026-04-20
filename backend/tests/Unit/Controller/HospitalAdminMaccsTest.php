<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\HospitalAdminController;
use App\Controller\MailerController;
use App\Entity\Hospital;
use App\Entity\Manager;
use App\Entity\Resident;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\ResidentRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use App\Enum\YearStatus;
use App\Services\EmailReset\PasswordResetServiceInterface;
use App\Services\HospitalAdminAuditService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

/**
 * Unit tests for HospitalAdminController — MACCS management endpoints.
 *
 * Covers:
 * - computeStatus() via reflection: retired / pending / incomplete / active
 * - serializeYearsResident() includes 'allowed' field (catches isAllowed() → getAllowed() regression)
 * - addResident(): invalid email → 400, missing name → 400, invalid yearId → 400
 * - addResident(): year not found → 404
 * - addResident(): duplicate link → 409
 * - editYearsResident(): yr not found → 404
 * - retireResident(): yr not found → 404
 * - resendResidentInvite(): non-pending status → 409
 * - changeResidentYear(): missing newYearId → 400
 * - listResidents(): returns 200 with correct structure (no isAllowed() crash)
 */
final class HospitalAdminMaccsTest extends TestCase
{
    private MailerController $mailer;
    private PasswordResetServiceInterface $resetService;
    private EntityManagerInterface $em;
    private UserPasswordHasherInterface $hasher;

    protected function setUp(): void
    {
        $this->mailer       = $this->createMock(MailerController::class);
        $this->resetService = $this->createMock(PasswordResetServiceInterface::class);
        $this->em           = $this->createMock(EntityManagerInterface::class);
        $this->hasher       = $this->createMock(UserPasswordHasherInterface::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function buildController(?Manager $user = null): HospitalAdminController
    {
        $auditService = $this->createMock(HospitalAdminAuditService::class);
        $controller = new HospitalAdminController($this->mailer, $this->resetService, 'http://localhost:3000', 'http://localhost:8000', 'http://localhost:8000/uploads', $auditService);

        // Wire a container with a token storage that returns the given user
        $container = new Container();
        if ($user !== null) {
            $token = $this->createMock(TokenInterface::class);
            $token->method('getUser')->willReturn($user);

            $tokenStorage = $this->createMock(TokenStorageInterface::class);
            $tokenStorage->method('getToken')->willReturn($token);

            $container->set('security.token_storage', $tokenStorage);
        }
        $controller->setContainer($container);

        return $controller;
    }

    private function makeHospital(int $id = 1): Hospital
    {
        $h = $this->createMock(Hospital::class);
        $h->method('getId')->willReturn($id);
        $h->method('getName')->willReturn('CHU Test');
        return $h;
    }

    private function makeManager(?Hospital $hospital = null): Manager
    {
        $m = $this->createMock(Manager::class);
        $m->method('getAdminHospital')->willReturn($hospital ?? $this->makeHospital());
        return $m;
    }

    private function makeResident(
        ?string $token = null,
        ?\DateTime $validatedAt = new \DateTime(),
    ): Resident {
        $r = $this->createMock(Resident::class);
        $r->method('getId')->willReturn(42);
        $r->method('getEmail')->willReturn('resident@test.be');
        $r->method('getFirstname')->willReturn('Alice');
        $r->method('getLastname')->willReturn('Dupont');
        $r->method('getToken')->willReturn($token);
        $r->method('getValidatedAt')->willReturn($validatedAt);
        return $r;
    }

    private function makeYear(int $id = 10, ?Hospital $hospital = null): Years
    {
        $y = $this->createMock(Years::class);
        $y->method('getId')->willReturn($id);
        $y->method('getTitle')->willReturn('2025-2026');
        $y->method('getDateOfEnd')->willReturn(new \DateTime('+1 year'));
        $y->method('getHospital')->willReturn($hospital ?? $this->makeHospital());
        $y->method('getStatus')->willReturn(YearStatus::Active);
        return $y;
    }

    private function makeYr(
        bool $allowed = true,
        ?Resident $resident = null,
        ?Years $year = null,
        int $id = 99,
    ): YearsResident {
        $yr = $this->createMock(YearsResident::class);
        $yr->method('getId')->willReturn($id);
        $yr->method('getAllowed')->willReturn($allowed);
        $yr->method('getOptingOut')->willReturn(false);
        $yr->method('getResident')->willReturn($resident ?? $this->makeResident());
        $yr->method('getYear')->willReturn($year ?? $this->makeYear());
        $yr->method('getCreatedAt')->willReturn(new \DateTime('2025-01-01'));
        return $yr;
    }

    // ── computeStatus() via reflection ────────────────────────────────────────

    /**
     * @dataProvider computeStatusProvider
     */
    public function testComputeStatus(bool $allowed, ?string $token, ?\DateTime $validatedAt, string $expected): void
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getToken')->willReturn($token);
        $resident->method('getValidatedAt')->willReturn($validatedAt);

        $yr = $this->createMock(YearsResident::class);
        $yr->method('getAllowed')->willReturn($allowed);
        $yr->method('getResident')->willReturn($resident);

        $controller = $this->buildController();
        $method     = new \ReflectionMethod(HospitalAdminController::class, 'computeStatus');

        $this->assertSame($expected, $method->invoke($controller, $yr));
    }

    /**
     * @return array<string, array{bool, string|null, \DateTime|null, string}>
     */
    public static function computeStatusProvider(): array
    {
        return [
            'retired when allowed=false'                           => [false, null, new \DateTime(), 'retired'],
            'pending when token present'                           => [true, 'sometoken', new \DateTime(), 'pending'],
            'active when no token and no validatedAt'              => [true, null, null, 'active'],
            'active when allowed, no token, validatedAt set'       => [true, null, new \DateTime(), 'active'],
        ];
    }

    // ── serializeYearsResident() — regression test for isAllowed() bug ────────

    public function testSerializeYearsResidentIncludesAllowedField(): void
    {
        $yr       = $this->makeYr(allowed: true);
        $year     = $this->makeYear();
        $resident = $this->makeResident();

        $controller = $this->buildController();
        $method     = new \ReflectionMethod(HospitalAdminController::class, 'serializeYearsResident');

        // This call would crash with "Call to undefined method isAllowed()" before the fix
        $result = $method->invoke($controller, $yr, $year, $resident);

        $this->assertArrayHasKey('allowed', $result);
        $this->assertArrayHasKey('status', $result);
        $this->assertArrayHasKey('yrId', $result);
        $this->assertArrayHasKey('email', $result);
        $this->assertArrayHasKey('yearTitle', $result);
        $this->assertTrue($result['allowed']);
        $this->assertSame('active', $result['status']);
    }

    public function testSerializeRetiredYearsResident(): void
    {
        $yr = $this->makeYr(allowed: false);

        $controller = $this->buildController();
        $method     = new \ReflectionMethod(HospitalAdminController::class, 'serializeYearsResident');
        $result     = $method->invoke($controller, $yr, $this->makeYear(), $this->makeResident());

        $this->assertFalse($result['allowed']);
        $this->assertSame('retired', $result['status']);
    }

    // ── addResident() — input validation ─────────────────────────────────────

    public function testAddResidentInvalidEmailReturns400(): void
    {
        $yearsRepo    = $this->createMock(YearsRepository::class);
        $residentRepo = $this->createMock(ResidentRepository::class);
        $yrRepo       = $this->createMock(YearsResidentRepository::class);

        $request = new Request([], [], [], [], [], [], json_encode([
            'email' => 'not-an-email',
            'firstname' => 'Jean',
            'lastname' => 'Durand',
            'yearId' => 1,
            'optingOut' => false,
        ]));

        $response = $this->buildController($this->makeManager())
            ->addResident($request, $yearsRepo, $residentRepo, $yrRepo, $this->em, $this->hasher);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testAddResidentMissingFirstnameReturns400(): void
    {
        $yearsRepo    = $this->createMock(YearsRepository::class);
        $residentRepo = $this->createMock(ResidentRepository::class);
        $yrRepo       = $this->createMock(YearsResidentRepository::class);

        $request = new Request([], [], [], [], [], [], json_encode([
            'email' => 'valid@test.be',
            'firstname' => '',
            'lastname' => 'Durand',
            'yearId' => 1,
            'optingOut' => false,
        ]));

        $response = $this->buildController($this->makeManager())
            ->addResident($request, $yearsRepo, $residentRepo, $yrRepo, $this->em, $this->hasher);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testAddResidentMissingYearIdReturns400(): void
    {
        $yearsRepo    = $this->createMock(YearsRepository::class);
        $residentRepo = $this->createMock(ResidentRepository::class);
        $yrRepo       = $this->createMock(YearsResidentRepository::class);

        $request = new Request([], [], [], [], [], [], json_encode([
            'email' => 'valid@test.be',
            'firstname' => 'Jean',
            'lastname' => 'Durand',
            'yearId' => 'not-an-int',
            'optingOut' => false,
        ]));

        $response = $this->buildController($this->makeManager())
            ->addResident($request, $yearsRepo, $residentRepo, $yrRepo, $this->em, $this->hasher);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testAddResidentYearNotFoundReturns404(): void
    {
        $yearsRepo    = $this->createMock(YearsRepository::class);
        $yearsRepo->method('find')->willReturn(null);
        $residentRepo = $this->createMock(ResidentRepository::class);
        $yrRepo       = $this->createMock(YearsResidentRepository::class);

        $request = new Request([], [], [], [], [], [], json_encode([
            'email' => 'valid@test.be',
            'firstname' => 'Jean',
            'lastname' => 'Durand',
            'yearId' => 999,
            'optingOut' => false,
        ]));

        $response = $this->buildController($this->makeManager())
            ->addResident($request, $yearsRepo, $residentRepo, $yrRepo, $this->em, $this->hasher);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testAddResidentDuplicateLinkReturns409(): void
    {
        $hospital = $this->makeHospital(1);
        $year     = $this->makeYear(10, $hospital);

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('find')->willReturn($year);

        $residentRepo = $this->createMock(ResidentRepository::class);
        $residentRepo->method('findOneBy')->willReturn($this->makeResident());

        $yrRepo = $this->createMock(YearsResidentRepository::class);
        $yrRepo->method('checkLink')->willReturn(true);

        $request = new Request([], [], [], [], [], [], json_encode([
            'email' => 'resident@test.be',
            'firstname' => 'Alice',
            'lastname' => 'Dupont',
            'yearId' => 10,
            'optingOut' => false,
        ]));

        $response = $this->buildController($this->makeManager($hospital))
            ->addResident($request, $yearsRepo, $residentRepo, $yrRepo, $this->em, $this->hasher);

        $this->assertSame(409, $response->getStatusCode());
    }

    // ── addResident() — regression: new MACCS must have ROLE_RESIDENT ────────

    public function testAddNewResidentSetsRoleResident(): void
    {
        $hospital = $this->makeHospital(1);
        $year     = $this->makeYear(10, $hospital);

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('find')->willReturn($year);

        // No existing resident → isNew = true
        $residentRepo = $this->createMock(ResidentRepository::class);
        $residentRepo->method('findOneBy')->willReturn(null);

        $yrRepo = $this->createMock(YearsResidentRepository::class);
        $yrRepo->method('checkLink')->willReturn(false);

        // Capture the Resident passed to persist()
        $persisted = null;
        $this->em->method('persist')->willReturnCallback(function ($entity) use (&$persisted) {
            if ($entity instanceof \App\Entity\Resident) {
                $persisted = $entity;
            }
        });
        $this->em->method('flush');

        $this->hasher->method('hashPassword')->willReturn('hashed');

        // MailerController::sendEmail must not throw (invitation sent)
        $this->mailer->method('sendEmail');

        $request = new Request([], [], [], [], [], [], json_encode([
            'email'     => 'new@test.be',
            'firstname' => 'Jean',
            'lastname'  => 'Dupont',
            'yearId'    => 10,
            'optingOut' => false,
        ]));

        $this->buildController($this->makeManager($hospital))
            ->addResident($request, $yearsRepo, $residentRepo, $yrRepo, $this->em, $this->hasher);

        $this->assertNotNull($persisted, 'Resident should have been persisted');
        $this->assertContains('ROLE_RESIDENT', $persisted->getRoles(), 'New MACCS must have ROLE_RESIDENT');
    }

    // ── editYearsResident() ───────────────────────────────────────────────────

    public function testEditYearsResidentNotFoundReturns404(): void
    {
        $yrRepo = $this->createMock(YearsResidentRepository::class);
        $yrRepo->method('find')->willReturn(null);

        $request  = new Request([], [], [], [], [], [], json_encode(['optingOut' => true]));
        $response = $this->buildController($this->makeManager())
            ->editYearsResident(999, $request, $yrRepo, $this->em);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ── retireResident() ──────────────────────────────────────────────────────

    public function testRetireResidentNotFoundReturns404(): void
    {
        $yrRepo = $this->createMock(YearsResidentRepository::class);
        $yrRepo->method('find')->willReturn(null);

        $response = $this->buildController($this->makeManager())
            ->retireResident(999, $yrRepo, $this->em);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ── changeResidentYear() ──────────────────────────────────────────────────

    public function testChangeResidentYearMissingNewYearIdReturns400(): void
    {
        $hospital = $this->makeHospital(1);
        $year     = $this->makeYear(10, $hospital);
        $yr       = $this->makeYr(year: $year);

        $yrRepo = $this->createMock(YearsResidentRepository::class);
        $yrRepo->method('find')->willReturn($yr);

        $yearsRepo = $this->createMock(YearsRepository::class);

        $request  = new Request([], [], [], [], [], [], json_encode(['newYearId' => 'not-int']));
        $response = $this->buildController($this->makeManager($hospital))
            ->changeResidentYear(99, $request, $yrRepo, $yearsRepo, $this->em);

        $this->assertSame(400, $response->getStatusCode());
    }

    // ── resendResidentInvite() ────────────────────────────────────────────────

    public function testResendInviteOnActiveResidentReturns409(): void
    {
        $hospital = $this->makeHospital(1);
        $year     = $this->makeYear(10, $hospital);
        // Active resident: allowed=true, token=null, validatedAt set
        $resident = $this->makeResident(token: null, validatedAt: new \DateTime());
        $yr       = $this->makeYr(allowed: true, resident: $resident, year: $year);

        $yrRepo = $this->createMock(YearsResidentRepository::class);
        $yrRepo->method('find')->willReturn($yr);

        $response = $this->buildController($this->makeManager($hospital))
            ->resendResidentInvite(99, $yrRepo, $this->em);

        $this->assertSame(409, $response->getStatusCode());
    }

    public function testResendInviteOnPendingResidentSendsEmail(): void
    {
        $hospital = $this->makeHospital(1);
        $year     = $this->makeYear(10, $hospital);

        // Pending resident: token present — stub setToken/setTokenExpiration for sendMaccsInvitation
        $resident = $this->createMock(Resident::class);
        $resident->method('getId')->willReturn(42);
        $resident->method('getEmail')->willReturn('resident@test.be');
        $resident->method('getFirstname')->willReturn('Alice');
        $resident->method('getLastname')->willReturn('Dupont');
        $resident->method('getToken')->willReturn('pending_token');
        $resident->method('getValidatedAt')->willReturn(new \DateTime());
        $resident->method('setToken')->willReturnSelf();
        $resident->method('setTokenExpiration')->willReturnSelf();

        $yr = $this->makeYr(allowed: true, resident: $resident, year: $year);

        $yrRepo = $this->createMock(YearsResidentRepository::class);
        $yrRepo->method('find')->willReturn($yr);

        $this->mailer->expects($this->once())
            ->method('sendEmail')
            ->with('resident@test.be', $this->anything(), 'email/maccsInvited.html.twig', $this->anything());

        $response = $this->buildController($this->makeManager($hospital))
            ->resendResidentInvite(99, $yrRepo, $this->em);

        $this->assertSame(200, $response->getStatusCode());
    }

    // ── listResidents() — regression: must not crash with getAllowed() ─────────

    public function testListResidentsReturns200WithNoYears(): void
    {
        $hospital = $this->makeHospital(1);

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findBy')->willReturn([]);

        $request  = new Request(['mode' => 'current']);
        $response = $this->buildController($this->makeManager($hospital))
            ->listResidents($request, $yearsRepo);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame([], json_decode((string) $response->getContent(), true));
    }

    public function testListResidentsSerializesYearsResidentWithoutCrash(): void
    {
        $hospital = $this->makeHospital(1);
        $resident = $this->makeResident();
        $yr       = $this->makeYr(allowed: true, resident: $resident);

        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn(10);
        $year->method('getTitle')->willReturn('2025-2026');
        $year->method('getDateOfEnd')->willReturn(new \DateTime('+1 year'));
        $year->method('getHospital')->willReturn($hospital);
        $year->method('getResidents')->willReturn(new \Doctrine\Common\Collections\ArrayCollection([$yr]));

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findBy')->willReturn([$year]);

        $request  = new Request(['mode' => 'current']);
        $response = $this->buildController($this->makeManager($hospital))
            ->listResidents($request, $yearsRepo);

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertCount(1, $data);
        $this->assertSame('active', $data[0]['status']);
        $this->assertTrue($data[0]['allowed']);
    }
}
