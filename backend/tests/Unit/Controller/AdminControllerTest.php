<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\AdminController;
use App\Controller\MailerController;
use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Entity\HospitalRequest;
use App\Entity\Manager;
use App\Enum\HospitalAdminStatus;
use App\Enum\HospitalRequestStatus;
use App\Repository\HospitalAdminRepository;
use App\Repository\HospitalRepository;
use App\Repository\HospitalRequestRepository;
use App\Repository\ManagerRepository;
use App\Repository\ResidentRepository;
use App\Services\EmailReset\PasswordResetServiceInterface;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for AdminController.
 *
 * Covers:
 * - GET /api/admin/hospitals → lists all hospitals with isActive
 * - POST /api/admin/hospitals → creates hospital, returns 201
 * - POST /api/admin/hospitals → invalid body returns 400
 * - POST /api/admin/hospitals/{id}/toggle → toggles isActive
 * - POST /api/admin/hospitals/{id}/toggle → 404 when not found
 * - GET /api/admin/hospital-requests → returns pending requests
 * - POST approve → creates hospital, activates manager, returns approved
 * - POST approve → 404 when request not found
 * - POST approve → 404 when already processed
 * - POST reject → marks as rejected
 * - POST /api/admin/hospitals/{id}/admins → invite → 201
 * - POST /api/admin/hospitals/{id}/admins → hospital not found → 404
 * - POST /api/admin/hospitals/{id}/admins → duplicate email → 200 silently
 * - GET /api/admin/users/managers → returns manager list with validatedAt non-null
 * - GET /api/admin/users/managers → validatedAt null renders as null
 * - GET /api/admin/users/managers → list sorted by lastname
 */
final class AdminControllerTest extends TestCase
{
    private MailerController $mailer;
    private EntityManagerInterface $em;
    private PasswordResetServiceInterface $passwordResetService;

    protected function setUp(): void
    {
        $this->mailer               = $this->createMock(MailerController::class);
        $this->em                   = $this->createMock(EntityManagerInterface::class);
        $this->passwordResetService = $this->createMock(PasswordResetServiceInterface::class);
    }

    private function buildController(): AdminController
    {
        $controller = new AdminController(
            $this->mailer,
            'https://api.medatwork.be/api/',
            'http://localhost:3000',
            $this->passwordResetService,
        );
        $controller->setContainer(new Container());
        return $controller;
    }

    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body));
    }

    private function makeHospital(int $id, string $name, bool $active = true): Hospital
    {
        $h = $this->createMock(Hospital::class);
        $h->method('getId')->willReturn($id);
        $h->method('getName')->willReturn($name);
        $h->method('getCity')->willReturn(null);
        $h->method('getCountry')->willReturn('BE');
        $h->method('isActive')->willReturn($active);
        return $h;
    }

    // ── List hospitals ────────────────────────────────────────────────────────

    public function testListHospitalsReturns200(): void
    {
        $repo = $this->createMock(HospitalRepository::class);
        $repo->method('findAll')->willReturn([
            $this->makeHospital(1, 'CHU Liège'),
            $this->makeHospital(2, 'UZ Leuven', false),
        ]);

        $response = $this->buildController()->listHospitals($repo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertCount(2, $data);
        $this->assertArrayHasKey('isActive', $data[0]);
    }

    // ── Create hospital ───────────────────────────────────────────────────────

    public function testCreateHospitalReturns201(): void
    {
        $createdHospital = null;
        $this->em->method('persist')->willReturnCallback(function (object $obj) use (&$createdHospital): void {
            if ($obj instanceof Hospital) {
                $createdHospital = $obj;
                // Simulate Doctrine assigning an ID by using reflection
                $ref = new \ReflectionProperty(Hospital::class, 'id');
                $ref->setAccessible(true);
                $ref->setValue($obj, 42);
            }
        });

        $response = $this->buildController()->createHospital(
            $this->makeRequest(['name' => 'CHU Liège', 'city' => 'Liège', 'country' => 'BE']),
            $this->em,
        );

        $this->assertSame(201, $response->getStatusCode());
        $this->assertNotNull($createdHospital);
    }

    public function testCreateHospitalDuplicateNameReturns409(): void
    {
        $this->em->method('flush')->willThrowException(
            $this->createMock(UniqueConstraintViolationException::class)
        );

        $response = $this->buildController()->createHospital(
            $this->makeRequest(['name' => 'CHU Liège', 'city' => 'Liège', 'country' => 'BE']),
            $this->em,
        );

        $this->assertSame(409, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertStringContainsString('existe déjà', $data['message']);
    }

    public function testCreateHospitalInvalidBodyReturns400(): void
    {
        $response = $this->buildController()->createHospital(
            $this->makeRequest([]), // missing name
            $this->em,
        );

        $this->assertSame(400, $response->getStatusCode());
    }

    // ── Toggle hospital ───────────────────────────────────────────────────────

    public function testToggleHospitalFlipsIsActive(): void
    {
        $hospital = $this->createMock(Hospital::class);
        $hospital->method('isActive')->willReturn(true);
        $hospital->expects($this->once())->method('setIsActive')->with(false);

        $repo = $this->createMock(HospitalRepository::class);
        $repo->method('find')->with(1)->willReturn($hospital);

        $response = $this->buildController()->toggleHospital(1, $repo, $this->em);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testToggleHospitalNotFoundReturns404(): void
    {
        $repo = $this->createMock(HospitalRepository::class);
        $repo->method('find')->willReturn(null);

        $response = $this->buildController()->toggleHospital(99, $repo, $this->em);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ── List hospital requests ────────────────────────────────────────────────

    public function testListRequestsReturnsPendingRequests(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getId')->willReturn(3);
        $manager->method('getFirstname')->willReturn('Paul');
        $manager->method('getLastname')->willReturn('Martin');
        $manager->method('getEmail')->willReturn('paul@example.com');

        $req = $this->createMock(HospitalRequest::class);
        $req->method('getId')->willReturn(10);
        $req->method('getHospitalName')->willReturn('CHU Liège');
        $req->method('getRequestedBy')->willReturn($manager);
        $req->method('getCreatedAt')->willReturn(new \DateTime('2026-01-01'));

        $repo = $this->createMock(HospitalRequestRepository::class);
        $repo->method('findPending')->willReturn([$req]);

        $response = $this->buildController()->listRequests($repo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertCount(1, $data);
        $this->assertSame(10, $data[0]['id']);
        $this->assertSame('CHU Liège', $data[0]['hospitalName']);
        $this->assertSame('paul@example.com', $data[0]['requestedBy']['email']);
    }

    // ── Approve request ───────────────────────────────────────────────────────

    public function testApproveRequestCreatesHospitalAndActivatesManager(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->expects($this->once())->method('addHospital');
        $manager->expects($this->once())->method('setStatus');

        $req = $this->createMock(HospitalRequest::class);
        $req->method('getStatus')->willReturn(HospitalRequestStatus::Pending);
        $req->method('getHospitalName')->willReturn('CHU Liège');
        $req->method('getRequestedBy')->willReturn($manager);
        $req->expects($this->once())->method('setStatus')->with(HospitalRequestStatus::Approved);

        $requestRepo  = $this->createMock(HospitalRequestRepository::class);
        $requestRepo->method('find')->with(1)->willReturn($req);

        $hospitalRepo = $this->createMock(HospitalRepository::class);
        $hospitalRepo->method('findOneBy')->willReturn(null); // hospital does not exist yet

        $response = $this->buildController()->approveRequest(1, $requestRepo, $hospitalRepo, $this->em);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('approved', $data['message']);
    }

    public function testApproveRequestReusesExistingHospital(): void
    {
        $existingHospital = $this->makeHospital(5, 'CHU Liège');

        $manager = $this->createMock(Manager::class);
        $manager->expects($this->once())->method('addHospital')->with($existingHospital);

        $req = $this->createMock(HospitalRequest::class);
        $req->method('getStatus')->willReturn(HospitalRequestStatus::Pending);
        $req->method('getHospitalName')->willReturn('CHU Liège');
        $req->method('getRequestedBy')->willReturn($manager);

        $requestRepo  = $this->createMock(HospitalRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $hospitalRepo = $this->createMock(HospitalRepository::class);
        $hospitalRepo->method('findOneBy')->with(['name' => 'CHU Liège'])->willReturn($existingHospital);

        $this->em->expects($this->never())->method('persist'); // no new hospital persisted

        $response = $this->buildController()->approveRequest(1, $requestRepo, $hospitalRepo, $this->em);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testApproveRequestNotFoundReturns404(): void
    {
        $requestRepo  = $this->createMock(HospitalRequestRepository::class);
        $requestRepo->method('find')->willReturn(null);
        $hospitalRepo = $this->createMock(HospitalRepository::class);

        $response = $this->buildController()->approveRequest(99, $requestRepo, $hospitalRepo, $this->em);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testApproveAlreadyProcessedRequestReturns404(): void
    {
        $req = $this->createMock(HospitalRequest::class);
        $req->method('getStatus')->willReturn(HospitalRequestStatus::Approved); // already done

        $requestRepo  = $this->createMock(HospitalRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);
        $hospitalRepo = $this->createMock(HospitalRepository::class);

        $response = $this->buildController()->approveRequest(1, $requestRepo, $hospitalRepo, $this->em);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testApproveRequestSendsApprovalEmail(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getEmail')->willReturn('paul@example.com');
        $manager->method('getFirstname')->willReturn('Paul');
        $manager->method('addHospital')->willReturnSelf();
        $manager->method('setStatus')->willReturnSelf();

        $req = $this->createMock(HospitalRequest::class);
        $req->method('getStatus')->willReturn(HospitalRequestStatus::Pending);
        $req->method('getHospitalName')->willReturn('CHU Liège');
        $req->method('getRequestedBy')->willReturn($manager);

        $hospital = $this->makeHospital(5, 'CHU Liège');
        $requestRepo  = $this->createMock(HospitalRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);
        $hospitalRepo = $this->createMock(HospitalRepository::class);
        $hospitalRepo->method('findOneBy')->willReturn($hospital);

        $this->mailer->expects($this->once())
            ->method('sendEmail')
            ->with(
                'paul@example.com',
                'Votre demande a été approuvée — Medatwork',
                'email/hospitalRequestApproved.html.twig',
                $this->arrayHasKey('firstname'),
            );

        $response = $this->buildController()->approveRequest(1, $requestRepo, $hospitalRepo, $this->em);
        $this->assertSame(200, $response->getStatusCode());
    }

    public function testApproveRequestEmailFailureDoesNotBlock(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getEmail')->willReturn('paul@example.com');
        $manager->method('getFirstname')->willReturn('Paul');
        $manager->method('addHospital')->willReturnSelf();
        $manager->method('setStatus')->willReturnSelf();

        $req = $this->createMock(HospitalRequest::class);
        $req->method('getStatus')->willReturn(HospitalRequestStatus::Pending);
        $req->method('getHospitalName')->willReturn('CHU Liège');
        $req->method('getRequestedBy')->willReturn($manager);

        $hospital = $this->makeHospital(5, 'CHU Liège');
        $requestRepo  = $this->createMock(HospitalRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);
        $hospitalRepo = $this->createMock(HospitalRepository::class);
        $hospitalRepo->method('findOneBy')->willReturn($hospital);

        $this->mailer->method('sendEmail')->willThrowException(new \RuntimeException('SMTP down'));

        $response = $this->buildController()->approveRequest(1, $requestRepo, $hospitalRepo, $this->em);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('approved', json_decode((string) $response->getContent(), true)['message']);
    }

    // ── Reject request ────────────────────────────────────────────────────────

    public function testRejectRequestReturnsRejected(): void
    {
        $req = $this->createMock(HospitalRequest::class);
        $req->method('getStatus')->willReturn(HospitalRequestStatus::Pending);
        $req->expects($this->once())->method('setStatus')->with(HospitalRequestStatus::Rejected);

        $repo = $this->createMock(HospitalRequestRepository::class);
        $repo->method('find')->willReturn($req);

        $response = $this->buildController()->rejectRequest(1, $repo, $this->em);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('rejected', $data['message']);
    }

    // ── Invite hospital admin ─────────────────────────────────────────────────

    public function testInviteAdminReturns201(): void
    {
        $hospital = $this->makeHospital(1, 'CHU Liège');

        $hospitalRepo = $this->createMock(HospitalRepository::class);
        $hospitalRepo->method('find')->with(1)->willReturn($hospital);

        $adminRepo = $this->createMock(HospitalAdminRepository::class);
        $adminRepo->method('findOneBy')->willReturn(null); // email not yet used

        $this->mailer->expects($this->once())->method('sendEmail');

        $response = $this->buildController()->inviteHospitalAdmin(
            1,
            $this->makeRequest(['email' => 'newadmin@hospital.be']),
            $hospitalRepo,
            $adminRepo,
            $this->em,
        );

        $this->assertSame(201, $response->getStatusCode());
    }

    public function testInviteAdminHospitalNotFoundReturns404(): void
    {
        $hospitalRepo = $this->createMock(HospitalRepository::class);
        $hospitalRepo->method('find')->willReturn(null);
        $adminRepo    = $this->createMock(HospitalAdminRepository::class);

        $response = $this->buildController()->inviteHospitalAdmin(
            99,
            $this->makeRequest(['email' => 'admin@hospital.be']),
            $hospitalRepo,
            $adminRepo,
            $this->em,
        );

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testInviteDuplicateEmailReturns200Silently(): void
    {
        $hospital = $this->makeHospital(1, 'CHU Liège');

        $hospitalRepo = $this->createMock(HospitalRepository::class);
        $hospitalRepo->method('find')->willReturn($hospital);

        $existingAdmin = $this->createMock(HospitalAdmin::class);
        $adminRepo     = $this->createMock(HospitalAdminRepository::class);
        $adminRepo->method('findOneBy')->willReturn($existingAdmin);

        $this->em->expects($this->never())->method('persist');
        $this->mailer->expects($this->never())->method('sendEmail');

        $response = $this->buildController()->inviteHospitalAdmin(
            1,
            $this->makeRequest(['email' => 'existing@hospital.be']),
            $hospitalRepo,
            $adminRepo,
            $this->em,
        );

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testInviteAdminInvalidEmailReturns400(): void
    {
        $hospital = $this->makeHospital(1, 'CHU Liège');

        $hospitalRepo = $this->createMock(HospitalRepository::class);
        $hospitalRepo->method('find')->willReturn($hospital);
        $adminRepo    = $this->createMock(HospitalAdminRepository::class);

        $response = $this->buildController()->inviteHospitalAdmin(
            1,
            $this->makeRequest(['email' => 'not-valid']),
            $hospitalRepo,
            $adminRepo,
            $this->em,
        );

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testInviteAdminEmailFailureDoesNotBlock(): void
    {
        $hospital = $this->makeHospital(1, 'CHU Liège');

        $hospitalRepo = $this->createMock(HospitalRepository::class);
        $hospitalRepo->method('find')->willReturn($hospital);

        $adminRepo = $this->createMock(HospitalAdminRepository::class);
        $adminRepo->method('findOneBy')->willReturn(null);

        $this->mailer->method('sendEmail')->willThrowException(new \RuntimeException('SMTP down'));

        $response = $this->buildController()->inviteHospitalAdmin(
            1,
            $this->makeRequest(['email' => 'admin@hospital.be']),
            $hospitalRepo,
            $adminRepo,
            $this->em,
        );

        // Email failure must not block the invite
        $this->assertSame(201, $response->getStatusCode());
    }

    // ── List hospital admins ──────────────────────────────────────────────────

    public function testListHospitalAdminsIncludesInvitedWithTypeField(): void
    {
        $hospital = $this->makeHospital(10, 'CHU Liège');

        $invited = $this->createMock(HospitalAdmin::class);
        $invited->method('getId')->willReturn(1);
        $invited->method('getEmail')->willReturn('invite@chu.be');
        $invited->method('getFirstname')->willReturn(null);
        $invited->method('getLastname')->willReturn(null);
        $invited->method('getStatus')->willReturn(HospitalAdminStatus::Invited);
        $invited->method('getHospital')->willReturn($hospital);
        $invited->method('getCreatedAt')->willReturn(new \DateTime('2026-01-01'));

        $adminRepo   = $this->createMock(HospitalAdminRepository::class);
        $adminRepo->method('findAll')->willReturn([$invited]);

        $managerRepo = $this->createMock(ManagerRepository::class);
        $managerRepo->method('findPromotedAdmins')->willReturn([]);

        $response = $this->buildController()->listHospitalAdmins($adminRepo, $managerRepo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertCount(1, $data);
        $this->assertSame('invited', $data[0]['type']);
        $this->assertSame('invite@chu.be', $data[0]['email']);
        $this->assertSame(10, $data[0]['hospital']['id']);
    }

    public function testListHospitalAdminsIncludesPromotedManagersWithTypeField(): void
    {
        $hospital = $this->makeHospital(10, 'CHU Liège');

        $promoted = $this->createMock(Manager::class);
        $promoted->method('getId')->willReturn(5);
        $promoted->method('getEmail')->willReturn('promoted@chu.be');
        $promoted->method('getFirstname')->willReturn('Marie');
        $promoted->method('getLastname')->willReturn('Dumont');
        $promoted->method('getAdminHospital')->willReturn($hospital);
        $promoted->method('getCreatedAt')->willReturn(new \DateTime('2025-06-01'));

        $adminRepo   = $this->createMock(HospitalAdminRepository::class);
        $adminRepo->method('findAll')->willReturn([]);

        $managerRepo = $this->createMock(ManagerRepository::class);
        $managerRepo->method('findPromotedAdmins')->willReturn([$promoted]);

        $response = $this->buildController()->listHospitalAdmins($adminRepo, $managerRepo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertCount(1, $data);
        $this->assertSame('promoted', $data[0]['type']);
        $this->assertSame('active', $data[0]['status']);
        $this->assertSame('promoted@chu.be', $data[0]['email']);
        $this->assertSame(10, $data[0]['hospital']['id']);
    }

    public function testListHospitalAdminsMergesBothSources(): void
    {
        $hospital = $this->makeHospital(10, 'CHU Liège');

        $invited = $this->createMock(HospitalAdmin::class);
        $invited->method('getId')->willReturn(1);
        $invited->method('getEmail')->willReturn('invite@chu.be');
        $invited->method('getFirstname')->willReturn(null);
        $invited->method('getLastname')->willReturn(null);
        $invited->method('getStatus')->willReturn(HospitalAdminStatus::Active);
        $invited->method('getHospital')->willReturn($hospital);
        $invited->method('getCreatedAt')->willReturn(new \DateTime('2026-01-01'));

        $promoted = $this->createMock(Manager::class);
        $promoted->method('getId')->willReturn(5);
        $promoted->method('getEmail')->willReturn('promoted@chu.be');
        $promoted->method('getFirstname')->willReturn('Marie');
        $promoted->method('getLastname')->willReturn('Dumont');
        $promoted->method('getAdminHospital')->willReturn($hospital);
        $promoted->method('getCreatedAt')->willReturn(new \DateTime('2025-06-01'));

        $adminRepo   = $this->createMock(HospitalAdminRepository::class);
        $adminRepo->method('findAll')->willReturn([$invited]);

        $managerRepo = $this->createMock(ManagerRepository::class);
        $managerRepo->method('findPromotedAdmins')->willReturn([$promoted]);

        $response = $this->buildController()->listHospitalAdmins($adminRepo, $managerRepo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertCount(2, $data);

        $types = array_column($data, 'type');
        $this->assertContains('invited', $types);
        $this->assertContains('promoted', $types);
    }

    // ── Users list ────────────────────────────────────────────────────────────

    /** Build a complete Manager mock — every field read by listManagers is explicitly stubbed. */
    private function makeManagerForList(
        int $id,
        string $email,
        string $firstname,
        string $lastname,
        \App\Enum\ManagerStatus $status,
        ?\DateTimeInterface $validatedAt,
        array $hospitals = [],
    ): Manager {
        $m = $this->createMock(Manager::class);
        $m->method('getId')->willReturn($id);
        $m->method('getEmail')->willReturn($email);
        $m->method('getFirstname')->willReturn($firstname);
        $m->method('getLastname')->willReturn($lastname);
        $m->method('getStatus')->willReturn($status);
        $m->method('getValidatedAt')->willReturn($validatedAt);
        $m->method('getHospitals')->willReturn(
            new \Doctrine\Common\Collections\ArrayCollection($hospitals)
        );

        return $m;
    }

    public function testListManagersReturnsExpectedShape(): void
    {
        $hospital = $this->makeHospital(1, 'CHU Liège');

        $manager = $this->makeManagerForList(
            id: 7,
            email: 'm@example.com',
            firstname: 'Jean',
            lastname: 'Dupont',
            status: \App\Enum\ManagerStatus::Active,
            validatedAt: new \DateTime('2025-01-15 10:00:00'),
            hospitals: [$hospital],
        );

        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('findAll')->willReturn([$manager]);

        $response = $this->buildController()->listManagers($repo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertCount(1, $data);
        $this->assertSame(7, $data[0]['id']);
        $this->assertSame('active', $data[0]['status']);
        $this->assertCount(1, $data[0]['hospitals']);
        $this->assertSame(1, $data[0]['hospitals'][0]['id']);
        $this->assertSame('CHU Liège', $data[0]['hospitals'][0]['name']);
        $this->assertStringStartsWith('2025-01-15', $data[0]['validatedAt']);
    }

    public function testListManagersNullValidatedAtRendersNull(): void
    {
        $manager = $this->makeManagerForList(
            id: 8,
            email: 'pending@example.com',
            firstname: 'Alice',
            lastname: 'Martin',
            status: \App\Enum\ManagerStatus::PendingHospital,
            validatedAt: null,
        );

        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('findAll')->willReturn([$manager]);

        $response = $this->buildController()->listManagers($repo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertNull($data[0]['validatedAt']);
        $this->assertSame('pending_hospital', $data[0]['status']);
        $this->assertSame([], $data[0]['hospitals']);
    }

    public function testListManagersSortedByLastname(): void
    {
        $zeta  = $this->makeManagerForList(1, 'z@x.com', 'A', 'Zeta',  \App\Enum\ManagerStatus::Active, null);
        $alpha = $this->makeManagerForList(2, 'a@x.com', 'B', 'Alpha', \App\Enum\ManagerStatus::Active, null);
        $mu    = $this->makeManagerForList(3, 'm@x.com', 'C', 'Mu',    \App\Enum\ManagerStatus::Active, null);

        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('findAll')->willReturn([$zeta, $alpha, $mu]); // deliberately unsorted

        $response = $this->buildController()->listManagers($repo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame('Alpha', $data[0]['lastname']);
        $this->assertSame('Mu',    $data[1]['lastname']);
        $this->assertSame('Zeta',  $data[2]['lastname']);
    }
}
