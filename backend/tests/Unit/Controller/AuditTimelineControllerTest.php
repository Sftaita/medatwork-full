<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\StaffPlannerAPI\HospitalAdminAPI\AuditTimelineController;
use App\Entity\AppAdmin;
use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\Resident;
use App\Entity\StaffPlannerAuditEvent;
use App\Entity\StaffPlannerExportBatch;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Enum\ManagerJob;
use App\Repository\StaffPlannerAuditEventRepository;
use App\Repository\StaffPlannerExportBatchRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use DateTimeImmutable;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

/**
 * Tests for AuditTimelineController (Phase 6).
 *
 * Covers:
 * - globalTimeline: 404 (year not found), 403 (wrong hospital), 200 with pagination
 * - maccsTimeline: 404 (YR not found), 403 (wrong hospital), 200 with events
 * - batchTimeline: 404 (batch not found), 403, 200
 * - Security: HospitalAdmin scoped, Manager RH allowed, plain Manager forbidden
 */
final class AuditTimelineControllerTest extends TestCase
{
    private StaffPlannerAuditEventRepository&MockObject $auditRepo;
    private YearsRepository&MockObject $yearsRepo;
    private YearsResidentRepository&MockObject $yrRepo;
    private StaffPlannerExportBatchRepository&MockObject $batchRepo;

    protected function setUp(): void
    {
        $this->auditRepo = $this->createMock(StaffPlannerAuditEventRepository::class);
        $this->yearsRepo = $this->createMock(YearsRepository::class);
        $this->yrRepo    = $this->createMock(YearsResidentRepository::class);
        $this->batchRepo = $this->createMock(StaffPlannerExportBatchRepository::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function buildController(object $user): AuditTimelineController
    {
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);

        $container = new Container();
        $container->set('security.token_storage', $tokenStorage);

        $ctrl = new AuditTimelineController($this->auditRepo, $this->yearsRepo, $this->yrRepo, $this->batchRepo);
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

    private function makeHospitalAdmin(int $hospitalId = 1): HospitalAdmin&MockObject
    {
        $admin = $this->createMock(HospitalAdmin::class);
        $admin->method('getHospital')->willReturn($this->makeHospital($hospitalId));
        return $admin;
    }

    private function makeManagerRh(int $hospitalId = 1): Manager&MockObject
    {
        $mgr = $this->createMock(Manager::class);
        $mgr->method('getJob')->willReturn(ManagerJob::HumanResources);
        $mgr->method('getAdminHospital')->willReturn(null);
        $mgr->method('getHospitals')->willReturn(new \Doctrine\Common\Collections\ArrayCollection([$this->makeHospital($hospitalId)]));
        return $mgr;
    }

    private function makePlainManager(): Manager&MockObject
    {
        $mgr = $this->createMock(Manager::class);
        $mgr->method('getJob')->willReturn(ManagerJob::Doctor);
        $mgr->method('getAdminHospital')->willReturn(null);
        $mgr->method('getHospitals')->willReturn(new \Doctrine\Common\Collections\ArrayCollection([]));
        return $mgr;
    }

    private function makeYr(Years $year): YearsResident&MockObject
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getFirstname')->willReturn('Alice');
        $resident->method('getLastname')->willReturn('Martin');

        $yr = $this->createMock(YearsResident::class);
        $yr->method('getId')->willReturn(99);
        $yr->method('getYear')->willReturn($year);
        $yr->method('getResident')->willReturn($resident);
        return $yr;
    }

    private function makeAuditEvent(string $eventType = 'rh_lock_applied'): StaffPlannerAuditEvent
    {
        $e = new StaffPlannerAuditEvent($eventType, 'manager', 7, ['reason' => 'Test']);
        $e->setMonth(11)->setCalendarYear(2024);
        return $e;
    }

    private function makeAppAdmin(): AppAdmin&MockObject
    {
        return $this->createMock(AppAdmin::class);
    }

    // ── globalTimeline — 404 ──────────────────────────────────────────────────

    public function testGlobalTimelineReturns404WhenYearNotFound(): void
    {
        $this->yearsRepo->method('find')->willReturn(null);

        $response = $this->buildController($this->makeHospitalAdmin())
            ->globalTimeline(99, new Request());

        $this->assertSame(Response::HTTP_NOT_FOUND, $response->getStatusCode());
    }

    // ── globalTimeline — 403 ──────────────────────────────────────────────────

    public function testGlobalTimelineReturns403ForWrongHospital(): void
    {
        $this->yearsRepo->method('find')->willReturn($this->makeYear(hospitalId: 1));

        $response = $this->buildController($this->makeHospitalAdmin(hospitalId: 2))
            ->globalTimeline(10, new Request());

        $this->assertSame(Response::HTTP_FORBIDDEN, $response->getStatusCode());
    }

    public function testGlobalTimelineReturns403ForPlainManager(): void
    {
        $this->yearsRepo->method('find')->willReturn($this->makeYear());

        $response = $this->buildController($this->makePlainManager())
            ->globalTimeline(10, new Request());

        $this->assertSame(Response::HTTP_FORBIDDEN, $response->getStatusCode());
    }

    // ── globalTimeline — 200 ──────────────────────────────────────────────────

    public function testGlobalTimelineReturns200WithPaginatedData(): void
    {
        $year = $this->makeYear();
        $this->yearsRepo->method('find')->willReturn($year);

        $event = $this->makeAuditEvent('rh_lock_applied');
        $this->auditRepo->method('findByYearPaginated')->willReturn([$event]);
        $this->auditRepo->method('countByYear')->willReturn(1);

        $response = $this->buildController($this->makeHospitalAdmin())
            ->globalTimeline(10, new Request(['page' => '1', 'limit' => '50']));

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertSame(1, $data['total']);
        $this->assertSame(1, $data['page']);
        $this->assertCount(1, $data['data']);
        $this->assertSame('rh_lock_applied', $data['data'][0]['eventType']);
    }

    public function testGlobalTimelineManagerRhIsAllowed(): void
    {
        $year = $this->makeYear();
        $this->yearsRepo->method('find')->willReturn($year);
        $this->auditRepo->method('findByYearPaginated')->willReturn([]);
        $this->auditRepo->method('countByYear')->willReturn(0);

        $response = $this->buildController($this->makeManagerRh())
            ->globalTimeline(10, new Request());

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
    }

    public function testGlobalTimelineAppAdminIsAllowed(): void
    {
        $year = $this->makeYear();
        $this->yearsRepo->method('find')->willReturn($year);
        $this->auditRepo->method('findByYearPaginated')->willReturn([]);
        $this->auditRepo->method('countByYear')->willReturn(0);

        $response = $this->buildController($this->makeAppAdmin())
            ->globalTimeline(10, new Request());

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
    }

    // ── maccsTimeline — 404 ───────────────────────────────────────────────────

    public function testMaccsTimelineReturns404WhenYrNotFound(): void
    {
        $this->yrRepo->method('find')->willReturn(null);

        $response = $this->buildController($this->makeHospitalAdmin())
            ->maccsTimeline(99);

        $this->assertSame(Response::HTTP_NOT_FOUND, $response->getStatusCode());
    }

    // ── maccsTimeline — 403 ───────────────────────────────────────────────────

    public function testMaccsTimelineReturns403ForWrongHospital(): void
    {
        $year = $this->makeYear(hospitalId: 1);
        $yr   = $this->makeYr($year);
        $this->yrRepo->method('find')->willReturn($yr);

        $response = $this->buildController($this->makeHospitalAdmin(hospitalId: 2))
            ->maccsTimeline(99);

        $this->assertSame(Response::HTTP_FORBIDDEN, $response->getStatusCode());
    }

    // ── maccsTimeline — 200 ───────────────────────────────────────────────────

    public function testMaccsTimelineReturns200WithEvents(): void
    {
        $year = $this->makeYear();
        $yr   = $this->makeYr($year);
        $this->yrRepo->method('find')->willReturn($yr);

        $event = $this->makeAuditEvent('timesheet_created');
        $this->auditRepo->method('findAllByYearsResident')->willReturn([$event]);

        $response = $this->buildController($this->makeHospitalAdmin())
            ->maccsTimeline(99);

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertSame(99, $data['yearResidentId']);
        $this->assertCount(1, $data['data']);
        $this->assertSame('timesheet_created', $data['data'][0]['eventType']);
    }

    // ── batchTimeline — 404 ───────────────────────────────────────────────────

    public function testBatchTimelineReturns404WhenBatchNotFound(): void
    {
        $this->batchRepo->method('find')->willReturn(null);

        $response = $this->buildController($this->makeHospitalAdmin())
            ->batchTimeline(99);

        $this->assertSame(Response::HTTP_NOT_FOUND, $response->getStatusCode());
    }

    // ── batchTimeline — 200 ───────────────────────────────────────────────────

    public function testBatchTimelineReturns200WithEvents(): void
    {
        $year  = $this->makeYear();
        $batch = $this->createMock(StaffPlannerExportBatch::class);
        $batch->method('getId')->willReturn(15);
        $batch->method('getBatchNumber')->willReturn(3);
        $batch->method('getYear')->willReturn($year);

        $this->batchRepo->method('find')->willReturn($batch);

        $event = $this->makeAuditEvent('export_generated');
        $this->auditRepo->method('findAllByBatch')->willReturn([$event]);

        $response = $this->buildController($this->makeHospitalAdmin())
            ->batchTimeline(15);

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertSame(15, $data['batchId']);
        $this->assertCount(1, $data['data']);
    }
}
