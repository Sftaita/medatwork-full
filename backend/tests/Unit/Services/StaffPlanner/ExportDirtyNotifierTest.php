<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\StaffPlanner;

use App\Entity\PeriodValidation;
use App\Entity\Resident;
use App\Entity\ResidentValidation;
use App\Entity\StaffPlannerExportStatus;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\StaffPlannerExportStatusRepository;
use App\Repository\YearsResidentRepository;
use App\Services\StaffPlanner\ExportDirtyNotifier;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

/**
 * Tests for ExportDirtyNotifier.
 *
 * Covers:
 * - Validation changed after export → dirty=true
 * - Validation changed before first export → not dirty
 * - No YearsResident found → silently skipped
 * - No ExportStatus found → silently skipped
 * - PeriodValidation missing year → silently skipped
 */
final class ExportDirtyNotifierTest extends TestCase
{
    private StaffPlannerExportStatusRepository&MockObject $statusRepo;
    private YearsResidentRepository&MockObject $yrRepo;
    private ExportDirtyNotifier $notifier;

    protected function setUp(): void
    {
        $this->statusRepo = $this->createMock(StaffPlannerExportStatusRepository::class);
        $this->yrRepo     = $this->createMock(YearsResidentRepository::class);
        $this->notifier   = new ExportDirtyNotifier($this->statusRepo, $this->yrRepo);
    }

    private function makeRv(int $month = 11, int $yearNb = 2024, ?Years $year = null): ResidentValidation
    {
        $year ??= $this->createMock(Years::class);

        $pv = $this->createMock(PeriodValidation::class);
        $pv->method('getMonth')->willReturn($month);
        $pv->method('getYearNb')->willReturn($yearNb);
        $pv->method('getYear')->willReturn($year);

        $resident = $this->createMock(Resident::class);
        $resident->method('getId')->willReturn(1);

        $rv = new ResidentValidation();
        $rv->setPeriodValidation($pv);
        $rv->setResident($resident);
        $rv->setValidated(true);

        return $rv;
    }

    private function makeStatus(int $downloadCount = 1): StaffPlannerExportStatus
    {
        $s = new StaffPlannerExportStatus();
        for ($i = 0; $i < $downloadCount; $i++) {
            $s->recordGeneration();
        }
        return $s;
    }

    // ── After export → dirty ──────────────────────────────────────────────────

    public function testValidationChangedAfterExportMarksDirty(): void
    {
        $status = $this->makeStatus(downloadCount: 1);

        $yr = $this->createMock(YearsResident::class);
        $this->yrRepo->method('findOneBy')->willReturn($yr);
        $this->statusRepo->method('findForItem')->willReturn($status);

        $this->notifier->notifyValidationChanged($this->makeRv(), 'validation_changed');

        $this->assertTrue($status->isDirtySinceExport());
        $this->assertSame('validation_changed', $status->getDirtyReason());
    }

    // ── Before first export → not dirty ──────────────────────────────────────

    public function testValidationChangedBeforeFirstExportDoesNotMarkDirty(): void
    {
        $status = $this->makeStatus(downloadCount: 0); // never exported

        $yr = $this->createMock(YearsResident::class);
        $this->yrRepo->method('findOneBy')->willReturn($yr);
        $this->statusRepo->method('findForItem')->willReturn($status);

        $this->notifier->notifyValidationChanged($this->makeRv(), 'validation_changed');

        $this->assertFalse($status->isDirtySinceExport());
    }

    // ── No YearsResident → silently skipped ──────────────────────────────────

    public function testNoYearsResidentSkipsSilently(): void
    {
        $this->yrRepo->method('findOneBy')->willReturn(null);
        $this->statusRepo->expects($this->never())->method('findForItem');

        // No exception expected
        $this->notifier->notifyValidationChanged($this->makeRv(), 'validation_changed');
        $this->assertTrue(true); // just confirming no exception
    }

    // ── No ExportStatus → silently skipped ───────────────────────────────────

    public function testNoExportStatusSkipsSilently(): void
    {
        $yr = $this->createMock(YearsResident::class);
        $this->yrRepo->method('findOneBy')->willReturn($yr);
        $this->statusRepo->method('findForItem')->willReturn(null);

        // No exception expected
        $this->notifier->notifyValidationChanged($this->makeRv(), 'validation_changed');
        $this->assertTrue(true);
    }

    // ── Missing year on PV → silently skipped ────────────────────────────────

    public function testMissingYearOnPvSkipsSilently(): void
    {
        // makeRv() defaults year to a mock — build manually for null year.
        $pv = $this->createMock(PeriodValidation::class);
        $pv->method('getYear')->willReturn(null);
        $pv->method('getMonth')->willReturn(11);
        $pv->method('getYearNb')->willReturn(2024);

        $rv = new ResidentValidation();
        $rv->setPeriodValidation($pv);
        $rv->setResident($this->createMock(Resident::class));
        $rv->setValidated(true);

        $this->yrRepo->expects($this->never())->method('findOneBy');
        $this->notifier->notifyValidationChanged($rv, 'validation_changed');
        $this->assertTrue(true);
    }
}
