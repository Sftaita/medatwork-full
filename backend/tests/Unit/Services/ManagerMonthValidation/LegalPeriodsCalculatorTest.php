<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\ManagerMonthValidation;

use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\YearsResidentRepository;
use App\Services\ManagerMonthValidation\LegalPeriodsCalculator;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class LegalPeriodsCalculatorTest extends TestCase
{
    /** @var YearsResidentRepository&MockObject */
    private YearsResidentRepository $repo;

    private LegalPeriodsCalculator $calculator;

    protected function setUp(): void
    {
        $this->repo       = $this->createMock(YearsResidentRepository::class);
        $this->calculator = new LegalPeriodsCalculator($this->repo);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function makeYear(\DateTimeInterface $start, \DateTimeInterface $end): Years
    {
        $year = $this->createMock(Years::class);
        $year->method('getDateOfStart')->willReturn($start);
        $year->method('getDateOfEnd')->willReturn($end);

        return $year;
    }

    // ─── getLegalPeriods ──────────────────────────────────────────────────────

    public function testGetLegalPeriodsFallsBackToYearStart(): void
    {
        $start = new \DateTime('2024-01-01'); // Monday
        $end   = new \DateTime('2025-01-01');

        $year = $this->makeYear($start, $end);
        $this->repo->method('findOneBy')->willReturn(null);

        $periods = $this->calculator->getLegalPeriods($year, 42);

        $this->assertArrayHasKey('Period 1', $periods);
        $this->assertSame('2024-01-01 00:00:00', $periods['Period 1']['start']);
    }

    public function testGetLegalPeriodsUsesResidentSpecificStart(): void
    {
        $yearStart = new \DateTime('2024-01-01');
        $yearEnd   = new \DateTime('2025-01-01');
        $year      = $this->makeYear($yearStart, $yearEnd);

        $residentStart   = new \DateTime('2024-02-05'); // Monday
        $yearsResident   = $this->createMock(YearsResident::class);
        $yearsResident->method('getDateOfStart')->willReturn($residentStart);

        $this->repo->method('findOneBy')->willReturn($yearsResident);

        $periods = $this->calculator->getLegalPeriods($year, 99);

        $this->assertArrayHasKey('Period 1', $periods);
        $this->assertSame('2024-02-05 00:00:00', $periods['Period 1']['start']);
    }

    public function testGetLegalPeriodsStartsOnPreviousMondayWhenNotMonday(): void
    {
        $start = new \DateTime('2024-01-03'); // Wednesday
        $end   = new \DateTime('2025-01-01');
        $year  = $this->makeYear($start, $end);

        $this->repo->method('findOneBy')->willReturn(null);

        $periods = $this->calculator->getLegalPeriods($year, 1);

        // Period 1 should start on the previous Monday (2024-01-01)
        $this->assertSame('2024-01-01 00:00:00', $periods['Period 1']['start']);
    }

    public function testGetLegalPeriodsPeriodLengthIsThirteenWeeks(): void
    {
        $start = new \DateTime('2024-01-01'); // Monday
        $end   = new \DateTime('2025-01-01');
        $year  = $this->makeYear($start, $end);

        $this->repo->method('findOneBy')->willReturn(null);

        $periods = $this->calculator->getLegalPeriods($year, 1);

        $p1Start = new \DateTime($periods['Period 1']['start']);
        $p1End   = new \DateTime($periods['Period 1']['end']);

        // 13 weeks = 91 days → end = start + 91 - 1 = start + 90 days
        $diff = $p1Start->diff($p1End)->days;
        $this->assertSame(90, $diff);
    }

    public function testGetLegalPeriodsConsecutivePeriodsAreContiguous(): void
    {
        $start = new \DateTime('2024-01-01');
        $end   = new \DateTime('2025-01-01');
        $year  = $this->makeYear($start, $end);

        $this->repo->method('findOneBy')->willReturn(null);

        $periods = $this->calculator->getLegalPeriods($year, 1);
        $keys    = array_keys($periods);

        for ($i = 0; $i < count($keys) - 1; $i++) {
            $currentEnd  = new \DateTime($periods[$keys[$i]]['end']);
            $nextStart   = new \DateTime($periods[$keys[$i + 1]]['start']);
            $currentEnd->modify('+1 second');

            $this->assertEquals(
                $currentEnd->format('Y-m-d'),
                $nextStart->format('Y-m-d'),
                "Gap between {$keys[$i]} and {$keys[$i + 1]}"
            );
        }
    }

    public function testGetLegalPeriodsThrowsWhenNoStartDate(): void
    {
        $year = $this->createMock(Years::class);
        $year->method('getDateOfStart')->willReturn(null);
        $year->method('getDateOfEnd')->willReturn(new \DateTime('2025-01-01'));

        $this->repo->method('findOneBy')->willReturn(null);

        $this->expectException(\RuntimeException::class);
        $this->calculator->getLegalPeriods($year, 1);
    }

    public function testGetLegalPeriodsThrowsWhenNoEndDate(): void
    {
        $year = $this->createMock(Years::class);
        $year->method('getDateOfStart')->willReturn(new \DateTime('2024-01-01'));
        $year->method('getDateOfEnd')->willReturn(null);

        $this->repo->method('findOneBy')->willReturn(null);

        $this->expectException(\RuntimeException::class);
        $this->calculator->getLegalPeriods($year, 1);
    }

    // ─── getOverlappingLegalIntervals ─────────────────────────────────────────

    /** @return array<string, mixed> */
    private function makeIntervals(): array
    {
        return [
            'Period 1' => ['start' => '2024-01-01 00:00:00', 'end' => '2024-04-01 23:59:59'],
            'Period 2' => ['start' => '2024-04-02 00:00:00', 'end' => '2024-07-01 23:59:59'],
            'Period 3' => ['start' => '2024-07-02 00:00:00', 'end' => '2024-10-01 23:59:59'],
        ];
    }

    public function testOverlappingIntervalsFindsExactMatch(): void
    {
        $boundaries = [
            'startOfMonth' => '2024-01-01 00:00:00',
            'endOfMonth'   => '2024-01-31 23:59:59',
        ];

        $result = $this->calculator->getOverlappingLegalIntervals($this->makeIntervals(), $boundaries);

        $this->assertSame(['Period 1'], $result);
    }

    public function testOverlappingIntervalsMonthSpanstwoPeriods(): void
    {
        // March spans the boundary between Period 1 (ends Apr 1) and Period 2 (starts Apr 2)
        // A month that contains the boundary between periods
        $boundaries = [
            'startOfMonth' => '2024-03-01 00:00:00',
            'endOfMonth'   => '2024-04-30 23:59:59',
        ];

        $result = $this->calculator->getOverlappingLegalIntervals($this->makeIntervals(), $boundaries);

        $this->assertContains('Period 1', $result);
        $this->assertContains('Period 2', $result);
    }

    public function testOverlappingIntervalsNoMatch(): void
    {
        $boundaries = [
            'startOfMonth' => '2025-01-01 00:00:00',
            'endOfMonth'   => '2025-01-31 23:59:59',
        ];

        $result = $this->calculator->getOverlappingLegalIntervals($this->makeIntervals(), $boundaries);

        $this->assertSame([], $result);
    }

    public function testOverlappingIntervalsIntervalFullyInsideMonth(): void
    {
        // Month is very wide; the small Period 1 is fully inside it
        $boundaries = [
            'startOfMonth' => '2023-12-01 00:00:00',
            'endOfMonth'   => '2024-05-31 23:59:59',
        ];

        $result = $this->calculator->getOverlappingLegalIntervals($this->makeIntervals(), $boundaries);

        $this->assertContains('Period 1', $result);
        $this->assertContains('Period 2', $result);
    }
}
