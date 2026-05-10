<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\StaffPlannerAPI\HospitalAdminAPI\LockController;
use App\Entity\AppAdmin;
use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\StaffPlannerExportStatus;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Enum\ManagerJob;
use App\Repository\StaffPlannerExportStatusRepository;
use App\Repository\YearsResidentRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

/**
 * Tests for LockController (Phase 5).
 *
 * Covers:
 * - 404 when YearsResident not found
 * - 403 when year is null or hospital mismatch
 * - 400 when body missing "locked" field
 * - 400 when locking without reason
 * - 404 when no StaffPlannerExportStatus found
 * - 200 lock success (HospitalAdmin) — returns correct payload
 * - 200 unlock success — returns locked=false
 * - 200 lock with Manager RH
 * - 403 for plain Manager (not RH)
 * - AppAdmin always allowed
 */
final class LockControllerTest extends TestCase
{
    private StaffPlannerExportStatusRepository&MockObject $statusRepo;
    private YearsResidentRepository&MockObject $yrRepo;
    private EntityManagerInterface&MockObject $em;

    protected function setUp(): void
    {
        $this->statusRepo = $this->createMock(StaffPlannerExportStatusRepository::class);
        $this->yrRepo     = $this->createMock(YearsResidentRepository::class);
        $this->em         = $this->createMock(EntityManagerInterface::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function buildController(object $user): LockController
    {
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);

        $container = new Container();
        $container->set('security.token_storage', $tokenStorage);

        $ctrl = new LockController($this->statusRepo, $this->yrRepo, $this->em);
        $ctrl->setContainer($container);
        return $ctrl;
    }

    private function makeHospital(int $id = 1): Hospital&MockObject
    {
        $h = $this->createMock(Hospital::class);
        $h->method('getId')->willReturn($id);
        return $h;
    }

    private function makeYear(int $hospitalId = 1): Years&MockObject
    {
        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn(10);
        $year->method('getHospital')->willReturn($this->makeHospital($hospitalId));
        return $year;
    }

    private function makeYr(Years $year): YearsResident&MockObject
    {
        $yr = $this->createMock(YearsResident::class);
        $yr->method('getId')->willReturn(99);
        $yr->method('getYear')->willReturn($year);
        return $yr;
    }

    private function makeHospitalAdmin(int $hospitalId = 1): HospitalAdmin&MockObject
    {
        $admin = $this->createMock(HospitalAdmin::class);
        $admin->method('getId')->willReturn(1);
        $admin->method('getHospital')->willReturn($this->makeHospital($hospitalId));
        return $admin;
    }

    private function makeManagerRh(int $hospitalId = 1): Manager&MockObject
    {
        $hospital = $this->makeHospital($hospitalId);
        $mgr = $this->createMock(Manager::class);
        $mgr->method('getId')->willReturn(2);
        $mgr->method('getJob')->willReturn(ManagerJob::HumanResources);
        $mgr->method('getAdminHospital')->willReturn(null);
        $mgr->method('getHospitals')->willReturn(new \Doctrine\Common\Collections\ArrayCollection([$hospital]));
        return $mgr;
    }

    private function makePlainManager(): Manager&MockObject
    {
        $mgr = $this->createMock(Manager::class);
        $mgr->method('getId')->willReturn(3);
        $mgr->method('getJob')->willReturn(ManagerJob::Doctor);
        $mgr->method('getAdminHospital')->willReturn(null);
        $mgr->method('getHospitals')->willReturn(new \Doctrine\Common\Collections\ArrayCollection([]));
        return $mgr;
    }

    private function makeAppAdmin(): AppAdmin&MockObject
    {
        $admin = $this->createMock(AppAdmin::class);
        $admin->method('getId')->willReturn(99);
        return $admin;
    }

    private function makeUnlockedStatus(): StaffPlannerExportStatus
    {
        return new StaffPlannerExportStatus();
    }

    private function makeLockedStatus(?string $reason = 'Clôture RH'): StaffPlannerExportStatus
    {
        $s = new StaffPlannerExportStatus();
        $s->lock('hospital_admin', 1, $reason);
        return $s;
    }

    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body));
    }

    // ── 404 — YearsResident not found ────────────────────────────────────────

    public function testReturns404WhenYearsResidentNotFound(): void
    {
        $this->yrRepo->method('find')->willReturn(null);

        $ctrl     = $this->buildController($this->makeHospitalAdmin());
        $response = $ctrl->lock(99, 11, 2024, $this->makeRequest(['locked' => true, 'reason' => 'Test']));

        $this->assertSame(Response::HTTP_NOT_FOUND, $response->getStatusCode());
    }

    // ── 403 — year is null ────────────────────────────────────────────────────

    public function testReturns403WhenYearIsNull(): void
    {
        $yr = $this->createMock(YearsResident::class);
        $yr->method('getYear')->willReturn(null);
        $this->yrRepo->method('find')->willReturn($yr);

        $ctrl     = $this->buildController($this->makeHospitalAdmin());
        $response = $ctrl->lock(99, 11, 2024, $this->makeRequest(['locked' => true, 'reason' => 'Test']));

        $this->assertSame(Response::HTTP_FORBIDDEN, $response->getStatusCode());
    }

    // ── 403 — wrong hospital (HospitalAdmin from different hospital) ──────────

    public function testReturns403ForHospitalAdminFromDifferentHospital(): void
    {
        $year = $this->makeYear(hospitalId: 1);
        $yr   = $this->makeYr($year);
        $this->yrRepo->method('find')->willReturn($yr);

        $admin = $this->makeHospitalAdmin(hospitalId: 2); // different hospital
        $ctrl  = $this->buildController($admin);

        $response = $ctrl->lock(99, 11, 2024, $this->makeRequest(['locked' => true, 'reason' => 'Test']));

        $this->assertSame(Response::HTTP_FORBIDDEN, $response->getStatusCode());
    }

    // ── 403 — plain Manager (not RH) ─────────────────────────────────────────

    public function testReturns403ForPlainManager(): void
    {
        $year = $this->makeYear();
        $yr   = $this->makeYr($year);
        $this->yrRepo->method('find')->willReturn($yr);

        $ctrl     = $this->buildController($this->makePlainManager());
        $response = $ctrl->lock(99, 11, 2024, $this->makeRequest(['locked' => true, 'reason' => 'Test']));

        $this->assertSame(Response::HTTP_FORBIDDEN, $response->getStatusCode());
    }

    // ── 400 — missing "locked" field ─────────────────────────────────────────

    public function testReturns400WhenLockedFieldMissing(): void
    {
        $year = $this->makeYear();
        $yr   = $this->makeYr($year);
        $this->yrRepo->method('find')->willReturn($yr);

        $ctrl     = $this->buildController($this->makeHospitalAdmin());
        $response = $ctrl->lock(99, 11, 2024, $this->makeRequest(['reason' => 'Test']));

        $this->assertSame(Response::HTTP_BAD_REQUEST, $response->getStatusCode());
    }

    // ── 400 — lock without reason ─────────────────────────────────────────────

    public function testReturns400WhenLockingWithoutReason(): void
    {
        $year = $this->makeYear();
        $yr   = $this->makeYr($year);
        $this->yrRepo->method('find')->willReturn($yr);

        $ctrl     = $this->buildController($this->makeHospitalAdmin());
        $response = $ctrl->lock(99, 11, 2024, $this->makeRequest(['locked' => true]));

        $this->assertSame(Response::HTTP_BAD_REQUEST, $response->getStatusCode());
    }

    public function testReturns400WhenLockingWithEmptyReason(): void
    {
        $year = $this->makeYear();
        $yr   = $this->makeYr($year);
        $this->yrRepo->method('find')->willReturn($yr);

        $ctrl     = $this->buildController($this->makeHospitalAdmin());
        $response = $ctrl->lock(99, 11, 2024, $this->makeRequest(['locked' => true, 'reason' => '   ']));

        $this->assertSame(Response::HTTP_BAD_REQUEST, $response->getStatusCode());
    }

    // ── 404 — status not found ────────────────────────────────────────────────

    public function testReturns404WhenNoStatusFound(): void
    {
        $year = $this->makeYear();
        $yr   = $this->makeYr($year);
        $this->yrRepo->method('find')->willReturn($yr);
        $this->statusRepo->method('findForItem')->willReturn(null);

        $ctrl     = $this->buildController($this->makeHospitalAdmin());
        $response = $ctrl->lock(99, 11, 2024, $this->makeRequest(['locked' => true, 'reason' => 'Clôture test']));

        $this->assertSame(Response::HTTP_NOT_FOUND, $response->getStatusCode());
    }

    // ── 200 — lock success (HospitalAdmin) ───────────────────────────────────

    public function testLockSuccessReturnsLockedPayload(): void
    {
        $year   = $this->makeYear();
        $yr     = $this->makeYr($year);
        $status = $this->makeUnlockedStatus();

        $this->yrRepo->method('find')->willReturn($yr);
        $this->statusRepo->method('findForItem')->willReturn($status);
        $this->em->expects($this->once())->method('persist');
        $this->em->expects($this->once())->method('flush');

        $ctrl     = $this->buildController($this->makeHospitalAdmin());
        $response = $ctrl->lock(99, 11, 2024, $this->makeRequest(['locked' => true, 'reason' => 'Clôture nov 2024']));

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());

        $payload = json_decode($response->getContent(), true);
        $this->assertTrue($payload['locked']);
        $this->assertSame(99, $payload['yearResidentId']);
        $this->assertSame(11, $payload['month']);
        $this->assertSame(2024, $payload['calendarYear']);
        $this->assertSame('Clôture nov 2024', $payload['lockReason']);
        $this->assertSame('hospital_admin', $payload['lockedByType']);
        $this->assertTrue($status->isLocked());
    }

    // ── 200 — unlock success ──────────────────────────────────────────────────

    public function testUnlockSuccessReturnsUnlockedPayload(): void
    {
        $year   = $this->makeYear();
        $yr     = $this->makeYr($year);
        $status = $this->makeLockedStatus('Clôture initiale');

        $this->yrRepo->method('find')->willReturn($yr);
        $this->statusRepo->method('findForItem')->willReturn($status);
        $this->em->expects($this->once())->method('flush');

        $ctrl     = $this->buildController($this->makeHospitalAdmin());
        $response = $ctrl->lock(99, 11, 2024, $this->makeRequest(['locked' => false, 'reason' => '']));

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());

        $payload = json_decode($response->getContent(), true);
        $this->assertFalse($payload['locked']);
        $this->assertNull($payload['lockReason']);
        $this->assertFalse($status->isLocked());
    }

    // ── 200 — unlock does not require reason ─────────────────────────────────

    public function testUnlockWithoutReasonIsAllowed(): void
    {
        $year   = $this->makeYear();
        $yr     = $this->makeYr($year);
        $status = $this->makeLockedStatus();

        $this->yrRepo->method('find')->willReturn($yr);
        $this->statusRepo->method('findForItem')->willReturn($status);

        $ctrl     = $this->buildController($this->makeHospitalAdmin());
        $response = $ctrl->lock(99, 11, 2024, $this->makeRequest(['locked' => false]));

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
    }

    // ── 200 — Manager RH allowed ──────────────────────────────────────────────

    public function testManagerRhIsAllowedToLock(): void
    {
        $year   = $this->makeYear(hospitalId: 1);
        $yr     = $this->makeYr($year);
        $status = $this->makeUnlockedStatus();

        $this->yrRepo->method('find')->willReturn($yr);
        $this->statusRepo->method('findForItem')->willReturn($status);

        $ctrl     = $this->buildController($this->makeManagerRh(hospitalId: 1));
        $response = $ctrl->lock(99, 11, 2024, $this->makeRequest(['locked' => true, 'reason' => 'RH lock']));

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
        $this->assertTrue($status->isLocked());
    }

    // ── 200 — AppAdmin always allowed ─────────────────────────────────────────

    public function testAppAdminIsAllowedToLock(): void
    {
        $year   = $this->makeYear();
        $yr     = $this->makeYr($year);
        $status = $this->makeUnlockedStatus();

        $this->yrRepo->method('find')->willReturn($yr);
        $this->statusRepo->method('findForItem')->willReturn($status);

        $ctrl     = $this->buildController($this->makeAppAdmin());
        $response = $ctrl->lock(99, 11, 2024, $this->makeRequest(['locked' => true, 'reason' => 'Admin lock']));

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
        $payload = json_decode($response->getContent(), true);
        $this->assertSame('app_admin', $payload['lockedByType']);
    }

    // ── Audit event persisted ─────────────────────────────────────────────────

    public function testPersistIsCalledForAuditEvent(): void
    {
        $year   = $this->makeYear();
        $yr     = $this->makeYr($year);
        $status = $this->makeUnlockedStatus();

        $this->yrRepo->method('find')->willReturn($yr);
        $this->statusRepo->method('findForItem')->willReturn($status);
        $this->em->expects($this->once())->method('persist');
        $this->em->expects($this->once())->method('flush');

        $ctrl = $this->buildController($this->makeHospitalAdmin());
        $ctrl->lock(99, 11, 2024, $this->makeRequest(['locked' => true, 'reason' => 'Audit test']));
    }
}
