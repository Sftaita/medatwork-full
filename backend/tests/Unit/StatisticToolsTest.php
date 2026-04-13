<?php

declare(strict_types=1);

namespace App\Tests\Unit;

use App\Services\Statistics\StatisticTools;
use App\Services\Utils\Tools;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for App\Services\Statistics\StatisticTools.
 * Tools is injected directly — no mocking needed (no DB dependency).
 * No database, no kernel — pure PHP logic.
 */
class StatisticToolsTest extends TestCase
{
    private StatisticTools $statisticTools;

    protected function setUp(): void
    {
        $this->statisticTools = new StatisticTools(new Tools());
    }

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    /**
     * Creates a shift array whose dateOfStart is a real DateTime object,
     * matching what countNbOfHospitalGarde expects.
     */
    /** @return array<string, mixed> */
    private function makeShift(string $date, string $type): array
    {
        return ['dateOfStart' => new \DateTime($date), 'type' => $type];
    }

    // -------------------------------------------------------------------------
    // checkIfDateIsBetween
    // -------------------------------------------------------------------------

    public function testCheckIfDateIsBetweenDateInRange(): void
    {
        $result = $this->statisticTools->checkIfDateIsBetween(
            '2026-03-15 00:00:00',
            '2026-03-01 00:00:00',
            '2026-03-31 23:59:59'
        );
        $this->assertTrue($result);
    }

    public function testCheckIfDateIsBetweenDateBeforeRange(): void
    {
        $result = $this->statisticTools->checkIfDateIsBetween(
            '2026-02-28 23:59:59',
            '2026-03-01 00:00:00',
            '2026-03-31 23:59:59'
        );
        $this->assertFalse($result);
    }

    public function testCheckIfDateIsBetweenDateAfterRange(): void
    {
        $result = $this->statisticTools->checkIfDateIsBetween(
            '2026-04-01 00:00:00',
            '2026-03-01 00:00:00',
            '2026-03-31 23:59:59'
        );
        $this->assertFalse($result);
    }

    public function testCheckIfDateIsBetweenEqualToStart(): void
    {
        $result = $this->statisticTools->checkIfDateIsBetween(
            '2026-03-01 00:00:00',
            '2026-03-01 00:00:00',
            '2026-03-31 23:59:59'
        );
        $this->assertTrue($result);
    }

    public function testCheckIfDateIsBetweenEqualToEnd(): void
    {
        $result = $this->statisticTools->checkIfDateIsBetween(
            '2026-03-31 23:59:59',
            '2026-03-01 00:00:00',
            '2026-03-31 23:59:59'
        );
        $this->assertTrue($result);
    }

    // -------------------------------------------------------------------------
    // boudariesDates
    // -------------------------------------------------------------------------

    public function testBoudariesDatesReturnsRequiredKeys(): void
    {
        $result = $this->statisticTools->boudariesDates(3);

        $this->assertArrayHasKey('start', $result);
        $this->assertArrayHasKey('end', $result);
        $this->assertArrayHasKey('startFromWeek', $result);
        $this->assertArrayHasKey('endOfTheLastWeek', $result);
    }

    public function testBoudariesDatesMarStart(): void
    {
        $year   = (int) (new \DateTime())->format('Y');
        $result = $this->statisticTools->boudariesDates(3);
        $this->assertSame(sprintf('%04d-03-01 00:00:00', $year), $result['start']);
    }

    public function testBoudariesDatesMarEnd(): void
    {
        $year   = (int) (new \DateTime())->format('Y');
        $result = $this->statisticTools->boudariesDates(3);
        $this->assertSame(sprintf('%04d-03-31 23:59:59', $year), $result['end']);
    }

    public function testBoudariesDatesJanuary(): void
    {
        $year   = (int) (new \DateTime())->format('Y');
        $result = $this->statisticTools->boudariesDates(1);
        $this->assertSame(sprintf('%04d-01-01 00:00:00', $year), $result['start']);
        $this->assertSame(sprintf('%04d-01-31 23:59:59', $year), $result['end']);
    }

    public function testBoudariesDatesDecember(): void
    {
        $year   = (int) (new \DateTime())->format('Y');
        $result = $this->statisticTools->boudariesDates(12);
        $this->assertSame(sprintf('%04d-12-01 00:00:00', $year), $result['start']);
        $this->assertSame(sprintf('%04d-12-31 23:59:59', $year), $result['end']);
    }

    public function testBoudariesDatesThrowsOnZero(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->statisticTools->boudariesDates(0);
    }

    public function testBoudariesDatesThrowsOnThirteen(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->statisticTools->boudariesDates(13);
    }

    // -------------------------------------------------------------------------
    // countNbOfHospitalGarde
    // -------------------------------------------------------------------------

    public function testCountNbOfHospitalGardeEmptyArray(): void
    {
        $result = $this->statisticTools->countNbOfHospitalGarde(
            [],
            '2026-03-01 00:00:00',
            '2026-03-31 23:59:59'
        );
        $this->assertSame(0, $result);
    }

    public function testCountNbOfHospitalGardeTwoHospitalOneCallable(): void
    {
        $shifts = [
            $this->makeShift('2026-03-10 08:00:00', 'hospital'),
            $this->makeShift('2026-03-15 08:00:00', 'hospital'),
            $this->makeShift('2026-03-20 08:00:00', 'callable'),
        ];

        $result = $this->statisticTools->countNbOfHospitalGarde(
            $shifts,
            '2026-03-01 00:00:00',
            '2026-03-31 23:59:59'
        );
        $this->assertSame(2, $result);
    }

    public function testCountNbOfHospitalGardeShiftsOutsideRangeNotCounted(): void
    {
        $shifts = [
            $this->makeShift('2026-02-10 08:00:00', 'hospital'), // before range
            $this->makeShift('2026-04-05 08:00:00', 'hospital'), // after range
            $this->makeShift('2026-03-20 08:00:00', 'hospital'), // in range
        ];

        $result = $this->statisticTools->countNbOfHospitalGarde(
            $shifts,
            '2026-03-01 00:00:00',
            '2026-03-31 23:59:59'
        );
        $this->assertSame(1, $result);
    }

    public function testCountNbOfHospitalGardeInvalidStartDateThrows(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->statisticTools->countNbOfHospitalGarde(
            [],
            'not-a-date',
            '2026-03-31 23:59:59'
        );
    }

    public function testCountNbOfHospitalGardeInvalidEndDateThrows(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->statisticTools->countNbOfHospitalGarde(
            [],
            '2026-03-01 00:00:00',
            'not-a-date'
        );
    }

    // -------------------------------------------------------------------------
    // hoursCounter — helpers
    // -------------------------------------------------------------------------

    /** @return array<string, mixed> */
    private function makeTimesheet(string $start, string $end, int $pauseMinutes = 0): array
    {
        return ['start' => $start, 'end' => $end, 'pause' => $pauseMinutes];
    }

    /** @return array<string, mixed> */
    private function makeGardePeriod(string $start, string $end, string $type = 'hospital'): array
    {
        return ['start' => $start, 'end' => $end, 'type' => $type];
    }

    /** @return array<string, mixed> */
    private function makeAbsence(string $start, string $end, string $type = 'annualLeave'): array
    {
        return ['start' => $start, 'end' => $end, 'type' => $type];
    }

    // ── month / week bounds for March 2026 ───────────────────────────────────

    private const MARCH_START = '2026-03-01 00:00:00';
    private const MARCH_END   = '2026-03-31 23:59:59';

    // -------------------------------------------------------------------------
    // hoursCounter — empty input
    // -------------------------------------------------------------------------

    public function testHoursCounterAllEmptyReturnsZeros(): void
    {
        $result = $this->statisticTools->hoursCounter([], [], [], self::MARCH_START, self::MARCH_END, self::MARCH_START, self::MARCH_END);

        $this->assertEqualsWithDelta(0.0, $result['totalHours'], 0.001);
        $this->assertEqualsWithDelta(0.0, $result['hardHours'], 0.001);
        $this->assertEqualsWithDelta(0.0, $result['veryHardHours'], 0.001);
        $this->assertEqualsWithDelta(0.0, $result['hospitalGardeHoursNb'], 0.001);
        $this->assertEqualsWithDelta(0.0, $result['break'], 0.001);
        $this->assertSame(0, $result['monthNbOfAbsences']);
    }

    // -------------------------------------------------------------------------
    // hoursCounter — timesheets (normal weekday = 2026-03-10, Tuesday)
    // -------------------------------------------------------------------------

    public function testHoursCounterNormalDayTimesheetCountsHours(): void
    {
        // 08:00–17:00, 30min pause → 8.5h worked, no hard hours
        $ts     = [$this->makeTimesheet('2026-03-10 08:00:00', '2026-03-10 17:00:00', 30)];
        $result = $this->statisticTools->hoursCounter($ts, [], [], self::MARCH_START, self::MARCH_END, self::MARCH_START, self::MARCH_END);

        $this->assertEqualsWithDelta(8.5, $result['totalHours'], 0.01);
        $this->assertEqualsWithDelta(0.5, $result['break'], 0.01);
        $this->assertEqualsWithDelta(0.0, $result['hardHours'], 0.001);
        $this->assertEqualsWithDelta(0.0, $result['veryHardHours'], 0.001);
    }

    public function testHoursCounterEarlyStartAddsHardHours(): void
    {
        // 06:00–14:00, no pause → 2h before 08:00 = hard
        $ts     = [$this->makeTimesheet('2026-03-10 06:00:00', '2026-03-10 14:00:00', 0)];
        $result = $this->statisticTools->hoursCounter($ts, [], [], self::MARCH_START, self::MARCH_END, self::MARCH_START, self::MARCH_END);

        $this->assertEqualsWithDelta(8.0, $result['totalHours'], 0.01);
        $this->assertEqualsWithDelta(2.0, $result['hardHours'], 0.01);
        $this->assertEqualsWithDelta(0.0, $result['veryHardHours'], 0.001);
    }

    public function testHoursCounterLateEndAddsHardHours(): void
    {
        // 14:00–22:00, no pause → 2h after 20:00 = hard
        $ts     = [$this->makeTimesheet('2026-03-10 14:00:00', '2026-03-10 22:00:00', 0)];
        $result = $this->statisticTools->hoursCounter($ts, [], [], self::MARCH_START, self::MARCH_END, self::MARCH_START, self::MARCH_END);

        $this->assertEqualsWithDelta(8.0, $result['totalHours'], 0.01);
        $this->assertEqualsWithDelta(2.0, $result['hardHours'], 0.01);
        $this->assertEqualsWithDelta(0.0, $result['veryHardHours'], 0.001);
    }

    public function testHoursCounterEarlyAndLateAddsHardHoursBothSides(): void
    {
        // 06:00–22:00, no pause → 2h before 08:00 + 2h after 20:00 = 4h hard
        $ts     = [$this->makeTimesheet('2026-03-10 06:00:00', '2026-03-10 22:00:00', 0)];
        $result = $this->statisticTools->hoursCounter($ts, [], [], self::MARCH_START, self::MARCH_END, self::MARCH_START, self::MARCH_END);

        $this->assertEqualsWithDelta(16.0, $result['totalHours'], 0.01);
        $this->assertEqualsWithDelta(4.0, $result['hardHours'], 0.01);
        $this->assertEqualsWithDelta(0.0, $result['veryHardHours'], 0.001);
    }

    public function testHoursCounterSaturdayTimesheetAllHard(): void
    {
        // 2026-03-14 = Saturday → all hours are hard
        $ts     = [$this->makeTimesheet('2026-03-14 09:00:00', '2026-03-14 17:00:00', 0)];
        $result = $this->statisticTools->hoursCounter($ts, [], [], self::MARCH_START, self::MARCH_END, self::MARCH_START, self::MARCH_END);

        $this->assertEqualsWithDelta(8.0, $result['totalHours'], 0.01);
        $this->assertEqualsWithDelta(8.0, $result['hardHours'], 0.01);
        $this->assertEqualsWithDelta(0.0, $result['veryHardHours'], 0.001);
    }

    public function testHoursCounterSundayTimesheetAllVeryHard(): void
    {
        // 2026-03-15 = Sunday → all hours are very hard
        $ts     = [$this->makeTimesheet('2026-03-15 09:00:00', '2026-03-15 17:00:00', 0)];
        $result = $this->statisticTools->hoursCounter($ts, [], [], self::MARCH_START, self::MARCH_END, self::MARCH_START, self::MARCH_END);

        $this->assertEqualsWithDelta(8.0, $result['totalHours'], 0.01);
        $this->assertEqualsWithDelta(0.0, $result['hardHours'], 0.001);
        $this->assertEqualsWithDelta(8.0, $result['veryHardHours'], 0.01);
    }

    public function testHoursCounterTimesheetOutsideMonthNotCounted(): void
    {
        // April timesheet not in March range
        $ts     = [$this->makeTimesheet('2026-04-05 09:00:00', '2026-04-05 17:00:00', 0)];
        $result = $this->statisticTools->hoursCounter($ts, [], [], self::MARCH_START, self::MARCH_END, self::MARCH_START, self::MARCH_END);

        $this->assertEqualsWithDelta(0.0, $result['totalHours'], 0.001);
    }

    // -------------------------------------------------------------------------
    // hoursCounter — gardes
    // -------------------------------------------------------------------------

    public function testHoursCounterHospitalGardeCountedInTotal(): void
    {
        // Hospital garde 08:00–20:00 on Tuesday → 12h total, 12h hospitalGardeHoursNb
        $gardes = [$this->makeGardePeriod('2026-03-10 08:00:00', '2026-03-10 20:00:00', 'hospital')];
        $result = $this->statisticTools->hoursCounter([], $gardes, [], self::MARCH_START, self::MARCH_END, self::MARCH_START, self::MARCH_END);

        $this->assertEqualsWithDelta(12.0, $result['totalHours'], 0.01);
        $this->assertEqualsWithDelta(12.0, $result['hospitalGardeHoursNb'], 0.01);
        $this->assertEqualsWithDelta(0.0, $result['hardHours'], 0.001);
    }

    public function testHoursCounterCallableGardeNotCounted(): void
    {
        $gardes = [$this->makeGardePeriod('2026-03-10 08:00:00', '2026-03-10 20:00:00', 'callable')];
        $result = $this->statisticTools->hoursCounter([], $gardes, [], self::MARCH_START, self::MARCH_END, self::MARCH_START, self::MARCH_END);

        $this->assertEqualsWithDelta(0.0, $result['totalHours'], 0.001);
        $this->assertEqualsWithDelta(0.0, $result['hospitalGardeHoursNb'], 0.001);
    }

    public function testHoursCounterHospitalGardeOnSundayAllVeryHard(): void
    {
        // 2026-03-15 = Sunday
        $gardes = [$this->makeGardePeriod('2026-03-15 08:00:00', '2026-03-15 20:00:00', 'hospital')];
        $result = $this->statisticTools->hoursCounter([], $gardes, [], self::MARCH_START, self::MARCH_END, self::MARCH_START, self::MARCH_END);

        $this->assertEqualsWithDelta(12.0, $result['totalHours'], 0.01);
        $this->assertEqualsWithDelta(12.0, $result['veryHardHours'], 0.01);
        $this->assertEqualsWithDelta(0.0, $result['hardHours'], 0.001);
    }

    // -------------------------------------------------------------------------
    // hoursCounter — absences
    // -------------------------------------------------------------------------

    public function testHoursCounterAnnualLeaveOnWeekdayCounts9h36AndIncrementsAbsences(): void
    {
        $absences = [$this->makeAbsence('2026-03-10 00:00:00', '2026-03-10 23:59:59', 'annualLeave')];
        $result   = $this->statisticTools->hoursCounter([], [], $absences, self::MARCH_START, self::MARCH_END, self::MARCH_START, self::MARCH_END);

        // 9h36 = 9.6h
        $this->assertEqualsWithDelta(9.6, $result['totalHours'], 0.01);
        $this->assertSame(1, $result['monthNbOfAbsences']);
    }

    public function testHoursCounterRecoveryAbsenceCountsZeroHoursButStillADay(): void
    {
        // 'recovery' → 0h counted, mais c'est quand même un jour d'absence sur un jour ouvré
        $absences = [$this->makeAbsence('2026-03-10 00:00:00', '2026-03-10 23:59:59', 'recovery')];
        $result   = $this->statisticTools->hoursCounter([], [], $absences, self::MARCH_START, self::MARCH_END, self::MARCH_START, self::MARCH_END);

        $this->assertEqualsWithDelta(0.0, $result['totalHours'], 0.001);
        $this->assertSame(1, $result['monthNbOfAbsences']);
    }

    public function testHoursCounterAbsenceOnSaturdayNotCountedAsAbsenceDay(): void
    {
        // Saturday: isHoliday=2, so countedHours=0 and monthNbOfAbsences not incremented
        $absences = [$this->makeAbsence('2026-03-14 00:00:00', '2026-03-14 23:59:59', 'annualLeave')];
        $result   = $this->statisticTools->hoursCounter([], [], $absences, self::MARCH_START, self::MARCH_END, self::MARCH_START, self::MARCH_END);

        $this->assertEqualsWithDelta(0.0, $result['totalHours'], 0.001);
        $this->assertSame(0, $result['monthNbOfAbsences']);
    }

    public function testHoursCounterAbsenceOutsideMonthNotCounted(): void
    {
        $absences = [$this->makeAbsence('2026-04-05 00:00:00', '2026-04-05 23:59:59', 'annualLeave')];
        $result   = $this->statisticTools->hoursCounter([], [], $absences, self::MARCH_START, self::MARCH_END, self::MARCH_START, self::MARCH_END);

        $this->assertEqualsWithDelta(0.0, $result['totalHours'], 0.001);
        $this->assertSame(0, $result['monthNbOfAbsences']);
    }

    // -------------------------------------------------------------------------
    // hoursCounter — combined
    // -------------------------------------------------------------------------

    public function testHoursCounterCombinesTimesheetAndGardeAndAbsence(): void
    {
        $ts       = [$this->makeTimesheet('2026-03-10 09:00:00', '2026-03-10 13:00:00', 0)]; // 4h, normal
        $gardes   = [$this->makeGardePeriod('2026-03-11 08:00:00', '2026-03-11 20:00:00', 'hospital')]; // 12h hospital (Wednesday)
        $absences = [$this->makeAbsence('2026-03-12 00:00:00', '2026-03-12 23:59:59', 'annualLeave')]; // 9.6h (Thursday)

        $result = $this->statisticTools->hoursCounter($ts, $gardes, $absences, self::MARCH_START, self::MARCH_END, self::MARCH_START, self::MARCH_END);

        $this->assertEqualsWithDelta(4.0 + 12.0 + 9.6, $result['totalHours'], 0.01);
        $this->assertEqualsWithDelta(12.0, $result['hospitalGardeHoursNb'], 0.01);
        $this->assertSame(1, $result['monthNbOfAbsences']);
    }
}
