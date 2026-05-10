<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\StaffPlanner;

use App\Entity\Manager;
use App\Entity\Resident;
use App\Entity\StaffPlannerExportBatch;
use App\Entity\StaffPlannerExportItemSnapshot;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\ResidentValidationRepository;
use App\Repository\StaffPlannerExportBatchRepository;
use App\Services\StaffPlanner\ExportBatchService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

/**
 * Tests for ExportBatchService::recordBatch().
 *
 * Covers:
 * - Batch created with correct year, batchNumber, actor, hash, size, itemCount
 * - One snapshot per captured item
 * - Snapshot fields populated (fingerprint, validatedByMds, counts, payloadLines, HRIDs)
 * - validatedByMdsAtExport correctly delegated to ResidentValidationRepository
 * - Empty capturedItems → RuntimeException (no batch created)
 * - Flush called exactly once (atomic)
 * - Manager / HospitalAdmin / AppAdmin actor resolution
 * - batchNumber from repository
 */
final class ExportBatchServiceTest extends TestCase
{
    private EntityManagerInterface&MockObject $em;
    private StaffPlannerExportBatchRepository&MockObject $batchRepo;
    private ResidentValidationRepository&MockObject $rvRepo;
    private ExportBatchService $service;

    protected function setUp(): void
    {
        $this->em        = $this->createMock(EntityManagerInterface::class);
        $this->batchRepo = $this->createMock(StaffPlannerExportBatchRepository::class);
        $this->rvRepo    = $this->createMock(ResidentValidationRepository::class);

        $this->service = new ExportBatchService($this->em, $this->batchRepo, $this->rvRepo);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private function makeYear(int $id = 1): Years&MockObject
    {
        $y = $this->createMock(Years::class);
        $y->method('getId')->willReturn($id);
        return $y;
    }

    private function makeYr(int $id = 10, ?Resident $resident = null): YearsResident&MockObject
    {
        $r = $resident ?? $this->createMock(Resident::class);
        $yr = $this->createMock(YearsResident::class);
        $yr->method('getId')->willReturn($id);
        $yr->method('getResident')->willReturn($r);
        return $yr;
    }

    private function makeCapturedItem(
        YearsResident $yr,
        int $month = 11,
        int $calYear = 2024,
        string $fingerprint = null,
        string $payloadLines = "AS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|0||\n",
    ): array {
        return [
            'yearResidentId'      => $yr->getId(),
            'month'               => $month,
            'calendarYear'        => $calYear,
            'yearsResident'       => $yr,
            'payloadLines'        => $payloadLines,
            'timesheetCount'      => 3,
            'gardeHospitalCount'  => 1,
            'absenceCount'        => 0,
            'totalMinutes'        => 720,
            'dataFingerprint'     => $fingerprint ?? str_repeat('a', 64),
            'workerHRIDAtExport'  => 'W001',
            'sectionHRIDAtExport' => 'S001',
        ];
    }

    // ── Empty capturedItems → RuntimeException ────────────────────────────────

    public function testEmptyCapturedItemsThrows(): void
    {
        $this->em->expects($this->never())->method('flush');
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('zero captured items');

        $this->service->recordBatch($this->makeYear(), 'content', [], null);
    }

    // ── Batch fields ──────────────────────────────────────────────────────────

    public function testBatchHasCorrectYearAndBatchNumber(): void
    {
        $year = $this->makeYear(42);
        $yr   = $this->makeYr();
        $item = $this->makeCapturedItem($yr);

        $this->batchRepo->method('nextBatchNumber')->willReturn(3);
        $this->rvRepo->method('checkIfMonthHasBeenValidated')->willReturn(false);

        $persisted = [];
        $this->em->method('persist')->willReturnCallback(function ($e) use (&$persisted) { $persisted[] = $e; });
        $this->em->expects($this->once())->method('flush');

        $batch = $this->service->recordBatch($year, 'file_content', [$item]);

        $this->assertSame(42, $batch->getYear()->getId());
        $this->assertSame(3, $batch->getBatchNumber());
    }

    public function testBatchHashIsSha256OfFileContent(): void
    {
        $yr   = $this->makeYr();
        $item = $this->makeCapturedItem($yr);

        $this->batchRepo->method('nextBatchNumber')->willReturn(1);
        $this->rvRepo->method('checkIfMonthHasBeenValidated')->willReturn(false);
        $this->em->method('persist');
        $this->em->method('flush');

        $content = 'SEPARATOR=|' . "\n" . "AS=|W001|S001|2024-11-04|1|activeShifts|0|0|0|0||\n";
        $batch = $this->service->recordBatch($this->makeYear(), $content, [$item]);

        $this->assertSame(hash('sha256', $content), $batch->getFileHash());
        $this->assertSame(strlen($content), $batch->getFileSizeBytes());
    }

    public function testBatchItemCountMatchesCapturedItems(): void
    {
        $yr1 = $this->makeYr(10);
        $yr2 = $this->makeYr(11);

        $this->batchRepo->method('nextBatchNumber')->willReturn(1);
        $this->rvRepo->method('checkIfMonthHasBeenValidated')->willReturn(false);
        $this->em->method('persist');
        $this->em->method('flush');

        $batch = $this->service->recordBatch(
            $this->makeYear(),
            'content',
            [$this->makeCapturedItem($yr1), $this->makeCapturedItem($yr2, 12)],
        );

        $this->assertSame(2, $batch->getItemCount());
    }

    // ── Actor resolution ──────────────────────────────────────────────────────

    public function testManagerActorResolved(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getId')->willReturn(7);

        $this->batchRepo->method('nextBatchNumber')->willReturn(1);
        $this->rvRepo->method('checkIfMonthHasBeenValidated')->willReturn(false);
        $this->em->method('persist');
        $this->em->method('flush');

        $batch = $this->service->recordBatch(
            $this->makeYear(), 'content', [$this->makeCapturedItem($this->makeYr())], $manager,
        );

        $this->assertSame('manager', $batch->getGeneratedByType());
        $this->assertSame(7, $batch->getGeneratedById());
    }

    public function testNullActorResolvesToSystem(): void
    {
        $this->batchRepo->method('nextBatchNumber')->willReturn(1);
        $this->rvRepo->method('checkIfMonthHasBeenValidated')->willReturn(false);
        $this->em->method('persist');
        $this->em->method('flush');

        $batch = $this->service->recordBatch(
            $this->makeYear(), 'content', [$this->makeCapturedItem($this->makeYr())], null,
        );

        $this->assertSame('system', $batch->getGeneratedByType());
        $this->assertNull($batch->getGeneratedById());
    }

    // ── Snapshot fields ───────────────────────────────────────────────────────

    public function testSnapshotFieldsPopulatedCorrectly(): void
    {
        $yr      = $this->makeYr(10);
        $payload = "AS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|0||\n";
        $fp      = str_repeat('b', 64);
        $item    = $this->makeCapturedItem($yr, 11, 2024, $fp, $payload);
        $item['timesheetCount']     = 5;
        $item['gardeHospitalCount'] = 2;
        $item['absenceCount']       = 1;
        $item['totalMinutes']       = 960;

        $this->batchRepo->method('nextBatchNumber')->willReturn(1);
        $this->rvRepo->method('checkIfMonthHasBeenValidated')->willReturn(true);

        $snapshots = [];
        $this->em->method('persist')->willReturnCallback(function ($e) use (&$snapshots) {
            if ($e instanceof StaffPlannerExportItemSnapshot) { $snapshots[] = $e; }
        });
        $this->em->method('flush');

        $this->service->recordBatch($this->makeYear(), 'content', [$item]);

        $this->assertCount(1, $snapshots);
        $s = $snapshots[0];
        $this->assertSame(11, $s->getMonth());
        $this->assertSame(2024, $s->getCalendarYear());
        $this->assertSame($fp, $s->getDataFingerprint());
        $this->assertTrue($s->isValidatedByMdsAtExport());
        $this->assertSame(5, $s->getTimesheetCount());
        $this->assertSame(2, $s->getGardeHospitalCount());
        $this->assertSame(1, $s->getAbsenceCount());
        $this->assertSame(960, $s->getTotalMinutes());
        $this->assertSame('W001', $s->getWorkerHRIDAtExport());
        $this->assertSame('S001', $s->getSectionHRIDAtExport());
        $this->assertSame($payload, $s->getPayloadLines());
    }

    public function testValidatedByMdsFalseWhenNotValidated(): void
    {
        $yr = $this->makeYr();
        $this->batchRepo->method('nextBatchNumber')->willReturn(1);
        $this->rvRepo->method('checkIfMonthHasBeenValidated')->willReturn(false);

        $snapshots = [];
        $this->em->method('persist')->willReturnCallback(function ($e) use (&$snapshots) {
            if ($e instanceof StaffPlannerExportItemSnapshot) { $snapshots[] = $e; }
        });
        $this->em->method('flush');

        $this->service->recordBatch($this->makeYear(), 'c', [$this->makeCapturedItem($yr)]);

        $this->assertFalse($snapshots[0]->isValidatedByMdsAtExport());
    }

    // ── Flush is atomic ───────────────────────────────────────────────────────

    public function testFlushCalledExactlyOnce(): void
    {
        $yr1 = $this->makeYr(10);
        $yr2 = $this->makeYr(11);

        $this->batchRepo->method('nextBatchNumber')->willReturn(1);
        $this->rvRepo->method('checkIfMonthHasBeenValidated')->willReturn(false);
        $this->em->method('persist');
        $this->em->expects($this->once())->method('flush');

        $this->service->recordBatch(
            $this->makeYear(), 'content',
            [$this->makeCapturedItem($yr1), $this->makeCapturedItem($yr2, 12)],
        );
    }

    // ── batchNumber delegated to repository ───────────────────────────────────

    public function testBatchNumberFromRepository(): void
    {
        $year = $this->makeYear(5);
        $yr   = $this->makeYr();

        $this->batchRepo->expects($this->once())
            ->method('nextBatchNumber')
            ->with($year)
            ->willReturn(7);

        $this->rvRepo->method('checkIfMonthHasBeenValidated')->willReturn(false);
        $this->em->method('persist');
        $this->em->method('flush');

        $batch = $this->service->recordBatch($year, 'content', [$this->makeCapturedItem($yr)]);

        $this->assertSame(7, $batch->getBatchNumber());
    }

    // ── Persist count: 1 batch + N snapshots ─────────────────────────────────

    public function testPersistCalledOncePerItemPlusOnceForBatch(): void
    {
        $yr1 = $this->makeYr(10);
        $yr2 = $this->makeYr(11);
        $yr3 = $this->makeYr(12);

        $this->batchRepo->method('nextBatchNumber')->willReturn(1);
        $this->rvRepo->method('checkIfMonthHasBeenValidated')->willReturn(false);

        $this->em->expects($this->exactly(4)) // 1 batch + 3 snapshots
            ->method('persist');
        $this->em->method('flush');

        $this->service->recordBatch(
            $this->makeYear(), 'content',
            [
                $this->makeCapturedItem($yr1),
                $this->makeCapturedItem($yr2, 12),
                $this->makeCapturedItem($yr3, 10),
            ],
        );
    }
}
