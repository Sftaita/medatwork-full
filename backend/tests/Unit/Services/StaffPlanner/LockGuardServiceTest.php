<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\StaffPlanner;

use App\Entity\Resident;
use App\Entity\StaffPlannerExportStatus;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Exception\PeriodLockedException;
use App\Repository\StaffPlannerExportStatusRepository;
use App\Repository\YearsResidentRepository;
use App\Services\StaffPlanner\LockGuardService;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

/**
 * Tests for LockGuardService.
 *
 * Covers:
 * - assertNotLocked() — blocked when locked, silent when unlocked
 * - assertNotLockedPeriod() — blocked, silent, no YR found = silent
 * - No status found → silent (no error)
 * - Clear exception message
 * - Lock reason included in exception message
 */
final class LockGuardServiceTest extends TestCase
{
    private StaffPlannerExportStatusRepository&MockObject $statusRepo;
    private YearsResidentRepository&MockObject $yrRepo;
    private LockGuardService $service;

    protected function setUp(): void
    {
        $this->statusRepo = $this->createMock(StaffPlannerExportStatusRepository::class);
        $this->yrRepo     = $this->createMock(YearsResidentRepository::class);
        $this->service    = new LockGuardService($this->statusRepo, $this->yrRepo);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private function makeResident(): Resident&MockObject
    {
        return $this->createMock(Resident::class);
    }

    private function makeYear(): Years&MockObject
    {
        return $this->createMock(Years::class);
    }

    private function makeYr(): YearsResident&MockObject
    {
        return $this->createMock(YearsResident::class);
    }

    private function makeLockedStatus(?string $reason = 'Clôture RH'): StaffPlannerExportStatus
    {
        $s = new StaffPlannerExportStatus();
        $s->lock('manager', 1, $reason);
        return $s;
    }

    private function makeUnlockedStatus(): StaffPlannerExportStatus
    {
        return new StaffPlannerExportStatus();
    }

    // ── assertNotLockedPeriod — locked ────────────────────────────────────────

    public function testThrowsWhenPeriodIsLocked(): void
    {
        $yr = $this->makeYr();
        $this->yrRepo->method('findOneBy')->willReturn($yr);
        $this->statusRepo->method('findForItem')->willReturn($this->makeLockedStatus('Clôture décembre'));

        $this->expectException(PeriodLockedException::class);
        $this->expectExceptionMessage('Clôture décembre');

        $this->service->assertNotLockedPeriod($this->makeResident(), $this->makeYear(), 12, 2024);
    }

    public function testExceptionMessageContainsMonthAndYear(): void
    {
        $yr = $this->makeYr();
        $this->yrRepo->method('findOneBy')->willReturn($yr);
        $this->statusRepo->method('findForItem')->willReturn($this->makeLockedStatus());

        try {
            $this->service->assertNotLockedPeriod($this->makeResident(), $this->makeYear(), 11, 2024);
            $this->fail('Expected PeriodLockedException');
        } catch (PeriodLockedException $e) {
            $this->assertStringContainsString('11/2024', $e->getMessage());
        }
    }

    // ── assertNotLockedPeriod — not locked ────────────────────────────────────

    public function testSilentWhenPeriodIsNotLocked(): void
    {
        $yr = $this->makeYr();
        $this->yrRepo->method('findOneBy')->willReturn($yr);
        $this->statusRepo->method('findForItem')->willReturn($this->makeUnlockedStatus());

        // No exception expected
        $this->service->assertNotLockedPeriod($this->makeResident(), $this->makeYear(), 11, 2024);
        $this->assertTrue(true);
    }

    public function testSilentWhenNoStatusExists(): void
    {
        $yr = $this->makeYr();
        $this->yrRepo->method('findOneBy')->willReturn($yr);
        $this->statusRepo->method('findForItem')->willReturn(null);

        $this->service->assertNotLockedPeriod($this->makeResident(), $this->makeYear(), 11, 2024);
        $this->assertTrue(true);
    }

    public function testSilentWhenNoYearsResidentFound(): void
    {
        $this->yrRepo->method('findOneBy')->willReturn(null);
        $this->statusRepo->expects($this->never())->method('findForItem');

        $this->service->assertNotLockedPeriod($this->makeResident(), $this->makeYear(), 11, 2024);
        $this->assertTrue(true);
    }

    // ── assertNotLocked (date-based) ──────────────────────────────────────────

    public function testAssertNotLockedExtractsMonthFromDate(): void
    {
        $yr = $this->makeYr();
        $this->yrRepo->method('findOneBy')->willReturn($yr);
        $this->statusRepo->method('findForItem')->willReturn($this->makeLockedStatus());

        $date = new \DateTime('2024-11-15 08:00:00');

        $this->expectException(PeriodLockedException::class);
        $this->expectExceptionMessage('11/2024');

        $this->service->assertNotLocked($this->makeResident(), $this->makeYear(), $date);
    }

    public function testAssertNotLockedSilentWhenNotLocked(): void
    {
        $yr = $this->makeYr();
        $this->yrRepo->method('findOneBy')->willReturn($yr);
        $this->statusRepo->method('findForItem')->willReturn($this->makeUnlockedStatus());

        $this->service->assertNotLocked($this->makeResident(), $this->makeYear(), new \DateTime('2024-11-15'));
        $this->assertTrue(true);
    }

    // ── Lock/unlock behavior on entity ───────────────────────────────────────

    public function testUnlockedAfterUnlockMethodAllowsModification(): void
    {
        $status = $this->makeLockedStatus();
        $status->unlock();

        $yr = $this->makeYr();
        $this->yrRepo->method('findOneBy')->willReturn($yr);
        $this->statusRepo->method('findForItem')->willReturn($status);

        // Should not throw after unlock
        $this->service->assertNotLockedPeriod($this->makeResident(), $this->makeYear(), 11, 2024);
        $this->assertTrue(true);
    }
}
