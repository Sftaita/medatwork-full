<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\StaffPlannerAPI\HospitalAdminAPI\ExportBatchController;
use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\Resident;
use App\Entity\StaffPlannerExportBatch;
use App\Entity\StaffPlannerExportItemSnapshot;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Enum\ManagerJob;
use App\Repository\StaffPlannerExportBatchRepository;
use App\Repository\StaffPlannerExportItemSnapshotRepository;
use App\Repository\YearsRepository;
use DateTimeImmutable;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

/**
 * Tests for ExportBatchController.
 *
 * Covers:
 * - list() — pagination, 200, filters applied, 404, 403
 * - detail() — 200, 404, 403
 * - snapshots() — 200 with payloadLines absent, 404, 403
 * - snapshotDetail() — 200 with payloadLines present, 404, 403
 * - Security: HospitalAdmin scoped, Manager RH allowed, plain Manager forbidden
 */
final class ExportBatchControllerTest extends TestCase
{
    private StaffPlannerExportBatchRepository&MockObject $batchRepo;
    private StaffPlannerExportItemSnapshotRepository&MockObject $snapshotRepo;

    protected function setUp(): void
    {
        $this->batchRepo    = $this->createMock(StaffPlannerExportBatchRepository::class);
        $this->snapshotRepo = $this->createMock(StaffPlannerExportItemSnapshotRepository::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function buildController(object $user): ExportBatchController
    {
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);

        $container = new Container();
        $container->set('security.token_storage', $tokenStorage);

        $ctrl = new ExportBatchController($this->batchRepo, $this->snapshotRepo);
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
        $hospital = $this->makeHospital($hospitalId);
        $mgr = $this->createMock(Manager::class);
        $mgr->method('getJob')->willReturn(ManagerJob::HumanResources);
        $mgr->method('getAdminHospital')->willReturn(null);
        $mgr->method('getHospitals')->willReturn(new \Doctrine\Common\Collections\ArrayCollection([$hospital]));
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

    private function makeBatch(Years $year, int $number = 1): StaffPlannerExportBatch&MockObject
    {
        $batch = $this->createMock(StaffPlannerExportBatch::class);
        $batch->method('getId')->willReturn($number);
        $batch->method('getYear')->willReturn($year);
        $batch->method('getBatchNumber')->willReturn($number);
        $batch->method('getGeneratedAt')->willReturn(new DateTimeImmutable('2024-11-20 10:00:00'));
        $batch->method('getGeneratedByType')->willReturn('manager');
        $batch->method('getGeneratedById')->willReturn(42);
        $batch->method('getItemCount')->willReturn(3);
        $batch->method('getFileHash')->willReturn(str_repeat('a', 64));
        $batch->method('getFileSizeBytes')->willReturn(1024);
        $batch->method('getNotes')->willReturn(null);
        $batch->method('getCreatedAt')->willReturn(new DateTimeImmutable('2024-11-20 10:00:00'));
        return $batch;
    }

    private function makeSnapshot(StaffPlannerExportBatch $batch): StaffPlannerExportItemSnapshot&MockObject
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getFirstname')->willReturn('Alice');
        $resident->method('getLastname')->willReturn('Martin');

        $yr = $this->createMock(YearsResident::class);
        $yr->method('getId')->willReturn(10);
        $yr->method('getResident')->willReturn($resident);

        $snap = $this->createMock(StaffPlannerExportItemSnapshot::class);
        $snap->method('getId')->willReturn(99);
        $snap->method('getBatch')->willReturn($batch);
        $snap->method('getYearsResident')->willReturn($yr);
        $snap->method('getMonth')->willReturn(11);
        $snap->method('getCalendarYear')->willReturn(2024);
        $snap->method('getDataFingerprint')->willReturn(str_repeat('b', 64));
        $snap->method('isValidatedByMdsAtExport')->willReturn(true);
        $snap->method('getTimesheetCount')->willReturn(5);
        $snap->method('getGardeHospitalCount')->willReturn(1);
        $snap->method('getAbsenceCount')->willReturn(0);
        $snap->method('getTotalMinutes')->willReturn(480);
        $snap->method('getWorkerHRIDAtExport')->willReturn('W001');
        $snap->method('getSectionHRIDAtExport')->willReturn('S001');
        $snap->method('getPayloadLines')->willReturn("AS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|0||\n");
        $snap->method('getCreatedAt')->willReturn(new DateTimeImmutable('2024-11-20 10:00:01'));
        return $snap;
    }

    private function makeYearsRepo(Years $year): YearsRepository&MockObject
    {
        $repo = $this->createMock(YearsRepository::class);
        $repo->method('find')->willReturn($year);
        return $repo;
    }

    // ── list() ────────────────────────────────────────────────────────────────

    public function testListReturns200WithPaginatedBatches(): void
    {
        $year  = $this->makeYear();
        $batch = $this->makeBatch($year);
        $admin = $this->makeHospitalAdmin();

        $this->batchRepo->method('findByYearPaginated')->willReturn([$batch]);
        $this->batchRepo->method('countByYear')->willReturn(1);

        $response = $this->buildController($admin)
            ->list(10, new Request(), $this->makeYearsRepo($year));

        $this->assertSame(200, $response->getStatusCode());
        $body = json_decode((string) $response->getContent(), true);
        $this->assertArrayHasKey('data', $body);
        $this->assertArrayHasKey('total', $body);
        $this->assertSame(1, $body['total']);
        $this->assertCount(1, $body['data']);
    }

    public function testListPaginationPassedToRepository(): void
    {
        $year  = $this->makeYear();
        $admin = $this->makeHospitalAdmin();

        $this->batchRepo->expects($this->once())
            ->method('findByYearPaginated')
            ->with($year, 2, 10, $this->anything())
            ->willReturn([]);
        $this->batchRepo->method('countByYear')->willReturn(0);

        $request = new Request(['page' => '2', 'limit' => '10']);
        $this->buildController($admin)->list(10, $request, $this->makeYearsRepo($year));
    }

    public function testListReturns404WhenYearNotFound(): void
    {
        $admin     = $this->makeHospitalAdmin();
        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('find')->willReturn(null);

        $response = $this->buildController($admin)->list(99, new Request(), $yearsRepo);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testListReturns403WhenHospitalMismatch(): void
    {
        $year  = $this->makeYear(hospitalId: 1);
        $admin = $this->makeHospitalAdmin(hospitalId: 2); // different hospital

        $response = $this->buildController($admin)->list(10, new Request(), $this->makeYearsRepo($year));

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testListAllowsManagerRh(): void
    {
        $year = $this->makeYear(1);
        $mgr  = $this->makeManagerRh(1);

        $this->batchRepo->method('findByYearPaginated')->willReturn([]);
        $this->batchRepo->method('countByYear')->willReturn(0);

        $response = $this->buildController($mgr)->list(10, new Request(), $this->makeYearsRepo($year));

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testListForbidsPlainManager(): void
    {
        $year = $this->makeYear();
        $mgr  = $this->makePlainManager();

        $response = $this->buildController($mgr)->list(10, new Request(), $this->makeYearsRepo($year));

        $this->assertSame(403, $response->getStatusCode());
    }

    // ── detail() ─────────────────────────────────────────────────────────────

    public function testDetailReturns200(): void
    {
        $year  = $this->makeYear();
        $batch = $this->makeBatch($year);
        $admin = $this->makeHospitalAdmin();

        $this->batchRepo->method('find')->willReturn($batch);

        $response = $this->buildController($admin)->detail(1);

        $this->assertSame(200, $response->getStatusCode());
        $body = json_decode((string) $response->getContent(), true);
        $this->assertArrayHasKey('batchNumber', $body);
        $this->assertArrayHasKey('fileHash', $body);
    }

    public function testDetailReturns404WhenBatchNotFound(): void
    {
        $this->batchRepo->method('find')->willReturn(null);
        $response = $this->buildController($this->makeHospitalAdmin())->detail(999);
        $this->assertSame(404, $response->getStatusCode());
    }

    public function testDetailReturns403OnWrongHospital(): void
    {
        $year  = $this->makeYear(hospitalId: 1);
        $batch = $this->makeBatch($year);
        $admin = $this->makeHospitalAdmin(hospitalId: 2);

        $this->batchRepo->method('find')->willReturn($batch);

        $response = $this->buildController($admin)->detail(1);
        $this->assertSame(403, $response->getStatusCode());
    }

    // ── snapshots() ───────────────────────────────────────────────────────────

    public function testSnapshotsReturns200WithoutPayloadLines(): void
    {
        $year     = $this->makeYear();
        $batch    = $this->makeBatch($year);
        $snapshot = $this->makeSnapshot($batch);
        $admin    = $this->makeHospitalAdmin();

        $this->batchRepo->method('find')->willReturn($batch);
        $this->snapshotRepo->method('findByBatchWithResident')->willReturn([$snapshot]);

        $response = $this->buildController($admin)->snapshots(1, new Request());

        $this->assertSame(200, $response->getStatusCode());
        $body = json_decode((string) $response->getContent(), true);

        $this->assertArrayHasKey('data', $body);
        $this->assertArrayHasKey('total', $body);
        $this->assertSame(1, $body['total']);

        // payloadLines must NOT appear in list response
        $this->assertArrayNotHasKey('payloadLines', $body['data'][0]);
    }

    public function testSnapshotsReturns404WhenBatchNotFound(): void
    {
        $this->batchRepo->method('find')->willReturn(null);
        $response = $this->buildController($this->makeHospitalAdmin())->snapshots(999, new Request());
        $this->assertSame(404, $response->getStatusCode());
    }

    public function testSnapshotsReturns403OnWrongHospital(): void
    {
        $year  = $this->makeYear(hospitalId: 1);
        $batch = $this->makeBatch($year);
        $admin = $this->makeHospitalAdmin(hospitalId: 2);

        $this->batchRepo->method('find')->willReturn($batch);
        $response = $this->buildController($admin)->snapshots(1, new Request());
        $this->assertSame(403, $response->getStatusCode());
    }

    public function testSnapshotsReturnsResidentName(): void
    {
        $year     = $this->makeYear();
        $batch    = $this->makeBatch($year);
        $snapshot = $this->makeSnapshot($batch);
        $admin    = $this->makeHospitalAdmin();

        $this->batchRepo->method('find')->willReturn($batch);
        $this->snapshotRepo->method('findByBatchWithResident')->willReturn([$snapshot]);

        $response = $this->buildController($admin)->snapshots(1, new Request());
        $body     = json_decode((string) $response->getContent(), true);

        $this->assertSame('Alice', $body['data'][0]['residentFirstname']);
        $this->assertSame('Martin', $body['data'][0]['residentLastname']);
    }

    // ── snapshotDetail() ──────────────────────────────────────────────────────

    public function testSnapshotDetailReturns200WithPayloadLines(): void
    {
        $year     = $this->makeYear();
        $batch    = $this->makeBatch($year);
        $snapshot = $this->makeSnapshot($batch);
        $admin    = $this->makeHospitalAdmin();

        $this->snapshotRepo->method('findByIdWithDetails')->willReturn($snapshot);

        $response = $this->buildController($admin)->snapshotDetail(99);

        $this->assertSame(200, $response->getStatusCode());
        $body = json_decode((string) $response->getContent(), true);
        $this->assertArrayHasKey('payloadLines', $body);
        $this->assertStringContainsString('AS=', $body['payloadLines']);
    }

    public function testSnapshotDetailReturns404WhenNotFound(): void
    {
        $this->snapshotRepo->method('findByIdWithDetails')->willReturn(null);
        $response = $this->buildController($this->makeHospitalAdmin())->snapshotDetail(999);
        $this->assertSame(404, $response->getStatusCode());
    }

    public function testSnapshotDetailReturns403OnWrongHospital(): void
    {
        $year     = $this->makeYear(hospitalId: 1);
        $batch    = $this->makeBatch($year);
        $snapshot = $this->makeSnapshot($batch);
        $admin    = $this->makeHospitalAdmin(hospitalId: 2);

        $this->snapshotRepo->method('findByIdWithDetails')->willReturn($snapshot);
        $response = $this->buildController($admin)->snapshotDetail(99);
        $this->assertSame(403, $response->getStatusCode());
    }

    public function testSnapshotDetailIncludesBatchNumber(): void
    {
        $year     = $this->makeYear();
        $batch    = $this->makeBatch($year, number: 5);
        $snapshot = $this->makeSnapshot($batch);
        $admin    = $this->makeHospitalAdmin();

        $this->snapshotRepo->method('findByIdWithDetails')->willReturn($snapshot);

        $response = $this->buildController($admin)->snapshotDetail(99);
        $body     = json_decode((string) $response->getContent(), true);

        $this->assertSame(5, $body['batchNumber']);
    }
}
