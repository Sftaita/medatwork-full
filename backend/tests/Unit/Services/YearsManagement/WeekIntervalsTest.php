<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\YearsManagement;

use App\Entity\Years;
use App\Entity\YearsWeekIntervals;
use App\Services\YearsManagement\WeekIntervals;
use DateTime;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for App\Services\YearsManagement\WeekIntervals.
 * No database, no kernel — pure PHP date logic.
 */
class WeekIntervalsTest extends TestCase
{
    private WeekIntervals $service;

    protected function setUp(): void
    {
        $this->service = new WeekIntervals();
    }

    // =========================================================================
    // createWeekIntervals — structure
    // =========================================================================

    public function testCreateWeekIntervalsReturnsArray(): void
    {
        $result = $this->service->createWeekIntervals(
            new DateTime('2026-03-09'),
            new DateTime('2026-03-15')
        );

        $this->assertIsArray($result);
    }

    public function testCreateWeekIntervalsEachIntervalHasRequiredKeys(): void
    {
        $result = $this->service->createWeekIntervals(
            new DateTime('2026-03-09'),
            new DateTime('2026-03-15')
        );

        foreach ($result as $interval) {
            $this->assertArrayHasKey('dateOfStart', $interval);
            $this->assertArrayHasKey('dateOfEnd', $interval);
            $this->assertArrayHasKey('weekNumber', $interval);
            $this->assertArrayHasKey('monthNumber', $interval);
            $this->assertArrayHasKey('yearNumber', $interval);
            $this->assertArrayHasKey('deleted', $interval);
        }
    }

    public function testCreateWeekIntervalsDeletedIsFalseOnAllIntervals(): void
    {
        $result = $this->service->createWeekIntervals(
            new DateTime('2026-03-01'),
            new DateTime('2026-03-31')
        );

        foreach ($result as $interval) {
            $this->assertFalse($interval['deleted'], 'All new intervals must have deleted = false');
        }
    }

    // =========================================================================
    // createWeekIntervals — alignment
    // =========================================================================

    /**
     * When start and end are already a Monday–Sunday pair, exactly one
     * interval is produced.
     */
    public function testCreateWeekIntervalsExactMondaySundayProducesOneInterval(): void
    {
        // 2026-03-09 (Monday) → 2026-03-15 (Sunday)
        $result = $this->service->createWeekIntervals(
            new DateTime('2026-03-09'),
            new DateTime('2026-03-15')
        );

        $this->assertCount(1, $result);
        $this->assertSame('2026-03-09', $result[0]['dateOfStart']);
        $this->assertSame('2026-03-15', $result[0]['dateOfEnd']);
        $this->assertSame('11', $result[0]['weekNumber']);
    }

    /**
     * Start is rolled back to the nearest Monday on or before the given start.
     * 2026-03-01 is a Sunday → nearest Monday before is 2026-02-23.
     */
    public function testCreateWeekIntervalsStartAlignedToNearestMonday(): void
    {
        $result = $this->service->createWeekIntervals(
            new DateTime('2026-03-01'),
            new DateTime('2026-03-14')
        );

        $this->assertSame(
            '2026-02-23',
            $result[0]['dateOfStart'],
            'First interval must start on Monday 2026-02-23 (nearest Monday before 2026-03-01 Sunday)'
        );
    }

    /**
     * Start on Monday is NOT rolled back — the Monday itself is used.
     */
    public function testCreateWeekIntervalsStartOnMondayIsKeptAsIs(): void
    {
        // 2026-03-09 is a Monday
        $result = $this->service->createWeekIntervals(
            new DateTime('2026-03-09'),
            new DateTime('2026-03-14')
        );

        $this->assertSame('2026-03-09', $result[0]['dateOfStart']);
    }

    /**
     * End is aligned forward to the nearest Sunday on or after the given end.
     * 2026-03-14 is a Saturday → nearest Sunday after is 2026-03-15.
     */
    public function testCreateWeekIntervalsEndAlignedToNearestSunday(): void
    {
        $result = $this->service->createWeekIntervals(
            new DateTime('2026-03-09'),
            new DateTime('2026-03-14')
        );

        $this->assertNotEmpty($result);
        $lastInterval = $result[count($result) - 1];
        $this->assertSame(
            '2026-03-15',
            $lastInterval['dateOfEnd'],
            'Last interval must end on Sunday 2026-03-15 (nearest Sunday after Saturday 2026-03-14)'
        );
    }

    /**
     * End on Sunday is NOT rolled forward — the Sunday itself is used.
     */
    public function testCreateWeekIntervalsEndOnSundayIsKeptAsIs(): void
    {
        // 2026-03-15 is a Sunday
        $result = $this->service->createWeekIntervals(
            new DateTime('2026-03-09'),
            new DateTime('2026-03-15')
        );

        $this->assertNotEmpty($result);
        $lastInterval = $result[count($result) - 1];
        $this->assertSame('2026-03-15', $lastInterval['dateOfEnd']);
    }

    // =========================================================================
    // createWeekIntervals — interval geometry
    // =========================================================================

    public function testCreateWeekIntervalsEachIntervalSpansSixDays(): void
    {
        $result = $this->service->createWeekIntervals(
            new DateTime('2026-03-01'),
            new DateTime('2026-03-31')
        );

        foreach ($result as $interval) {
            $start = new DateTime($interval['dateOfStart']);
            $end   = new DateTime($interval['dateOfEnd']);
            $diff  = (int) $start->diff($end)->days;
            $this->assertSame(6, $diff, 'Each interval must span exactly 6 days (Mon–Sun)');
        }
    }

    public function testCreateWeekIntervalsIntervalsAreContiguous(): void
    {
        $result = $this->service->createWeekIntervals(
            new DateTime('2026-03-01'),
            new DateTime('2026-03-31')
        );

        for ($i = 1, $count = count($result); $i < $count; $i++) {
            $prevEnd   = (new DateTime($result[$i - 1]['dateOfEnd']))->modify('+1 day');
            $currStart = new DateTime($result[$i]['dateOfStart']);

            $this->assertSame(
                $prevEnd->format('Y-m-d'),
                $currStart->format('Y-m-d'),
                'Consecutive intervals must be contiguous (no gaps, no overlaps)'
            );
        }
    }

    public function testCreateWeekIntervalsFirstIntervalStartsOnMonday(): void
    {
        $result = $this->service->createWeekIntervals(
            new DateTime('2026-03-05'), // Thursday
            new DateTime('2026-03-31')
        );

        $this->assertSame(
            '1',
            (new DateTime($result[0]['dateOfStart']))->format('N'),
            'First interval must start on Monday (ISO weekday 1)'
        );
    }

    public function testCreateWeekIntervalsLastIntervalEndsOnSunday(): void
    {
        $result = $this->service->createWeekIntervals(
            new DateTime('2026-03-01'),
            new DateTime('2026-03-31')
        );

        $this->assertNotEmpty($result);
        $last = $result[count($result) - 1];
        $this->assertSame(
            '7',
            (new DateTime($last['dateOfEnd']))->format('N'),
            'Last interval must end on Sunday (ISO weekday 7)'
        );
    }

    /**
     * A single-day input must still produce exactly one full week interval.
     */
    public function testCreateWeekIntervalsSingleDayProducesOneWeek(): void
    {
        // 2026-03-11 is a Wednesday → aligned Mon 2026-03-09, Sun 2026-03-15
        $result = $this->service->createWeekIntervals(
            new DateTime('2026-03-11'),
            new DateTime('2026-03-11')
        );

        $this->assertCount(1, $result);
        $this->assertSame('2026-03-09', $result[0]['dateOfStart']);
        $this->assertSame('2026-03-15', $result[0]['dateOfEnd']);
    }

    // =========================================================================
    // createWeekIntervals — metadata
    // =========================================================================

    public function testCreateWeekIntervalsWeekNumberMatchesIsoFormat(): void
    {
        $result = $this->service->createWeekIntervals(
            new DateTime('2026-03-09'),
            new DateTime('2026-03-15')
        );

        // 2026-03-09 is ISO week 11
        $this->assertSame('11', $result[0]['weekNumber']);
    }

    public function testCreateWeekIntervalsMonthNumberMatchesStartDate(): void
    {
        $result = $this->service->createWeekIntervals(
            new DateTime('2026-03-09'),
            new DateTime('2026-03-15')
        );

        // monthNumber is format('n') of the Monday — March = 3
        $this->assertSame('3', $result[0]['monthNumber']);
    }

    public function testCreateWeekIntervalsYearNumberMatchesStartDate(): void
    {
        $result = $this->service->createWeekIntervals(
            new DateTime('2026-03-09'),
            new DateTime('2026-03-15')
        );

        $this->assertSame('2026', $result[0]['yearNumber']);
    }

    // =========================================================================
    // createWeekIntervals — week counts for full months (data provider)
    // =========================================================================

    /**
     * @dataProvider provideCreateWeekIntervalsMonthAndWeekCount
     */
    public function testCreateWeekIntervalsFullMonthProducesExpectedWeekCount(
        int $year,
        int $month,
        int $expectedWeekCount
    ): void {
        $start = new DateTime("{$year}-{$month}-01");
        $end   = (new DateTime("{$year}-{$month}-01"))->modify('last day of this month');

        $result = $this->service->createWeekIntervals($start, $end);

        $this->assertCount($expectedWeekCount, $result);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public static function provideCreateWeekIntervalsMonthAndWeekCount(): array
    {
        return [
            // Feb 2026: Feb 1 = Sun → Mon Jan 26; Feb 28 = Sat → Sun Mar 1 → 5 weeks
            'February 2026 yields 5 aligned weeks' => [2026, 2, 5],
            // March 2026: Mar 1 = Sun → Mon Feb 23; Mar 31 = Tue → Sun Apr 5 → 6 weeks
            'March 2026 yields 6 aligned weeks'    => [2026, 3, 6],
            // Jan 2026: Jan 1 = Thu → Mon Dec 29 2025; Jan 31 = Sat → Sun Feb 1 → 5 weeks
            'January 2026 yields 5 aligned weeks'  => [2026, 1, 5],
            // Apr 2026: Apr 1 = Wed → Mon Mar 30; Apr 30 = Thu → Sun May 3 → 5 weeks
            'April 2026 yields 5 aligned weeks'    => [2026, 4, 5],
        ];
    }

    // =========================================================================
    // updateWeekIntervals — helpers
    // =========================================================================

    /** Build a YearsWeekIntervals mock with fixed start/end dates. */
    private function makeExistingInterval(string $dateOfStart, string $dateOfEnd): YearsWeekIntervals
    {
        $mock = $this->createMock(YearsWeekIntervals::class);
        $mock->method('getDateOfStart')->willReturn(new DateTime($dateOfStart));
        $mock->method('getDateOfEnd')->willReturn(new DateTime($dateOfEnd));

        return $mock;
    }

    private function makeYear(): Years
    {
        return $this->createMock(Years::class);
    }

    // =========================================================================
    // updateWeekIntervals — basic contract
    // =========================================================================

    public function testUpdateWeekIntervalsReturnsArray(): void
    {
        $result = $this->service->updateWeekIntervals(
            [],
            new DateTime('2026-03-09'),
            new DateTime('2026-03-15'),
            $this->makeYear(),
        );

        $this->assertIsArray($result);
    }

    public function testUpdateWeekIntervalsWithNoExistingCreatesNewEntity(): void
    {
        $result = $this->service->updateWeekIntervals(
            [],
            new DateTime('2026-03-09'),
            new DateTime('2026-03-15'),
            $this->makeYear(),
        );

        $this->assertCount(1, $result);
        $this->assertSame(YearsWeekIntervals::class, get_class($result[0]));
    }

    public function testUpdateWeekIntervalsNewEntityHasCorrectDates(): void
    {
        $result = $this->service->updateWeekIntervals(
            [],
            new DateTime('2026-03-09'),
            new DateTime('2026-03-15'),
            $this->makeYear(),
        );

        $this->assertCount(1, $result);
        $this->assertSame('2026-03-09', $result[0]->getDateOfStart()?->format('Y-m-d'));
        $this->assertSame('2026-03-15', $result[0]->getDateOfEnd()?->format('Y-m-d'));
    }

    public function testUpdateWeekIntervalsNewEntityHasYearSet(): void
    {
        $year = $this->makeYear();

        $result = $this->service->updateWeekIntervals(
            [],
            new DateTime('2026-03-09'),
            new DateTime('2026-03-15'),
            $year,
        );

        $this->assertCount(1, $result);
        $this->assertSame($year, $result[0]->getYear());
    }

    public function testUpdateWeekIntervalsNewEntityHasDeletedFalse(): void
    {
        $result = $this->service->updateWeekIntervals(
            [],
            new DateTime('2026-03-09'),
            new DateTime('2026-03-15'),
            $this->makeYear(),
        );

        $this->assertFalse($result[0]->getDeleted());
    }

    // =========================================================================
    // updateWeekIntervals — de-duplication
    // =========================================================================

    public function testUpdateWeekIntervalsDoesNotDuplicateExistingInterval(): void
    {
        $existing = $this->makeExistingInterval('2026-03-09', '2026-03-15');

        $result = $this->service->updateWeekIntervals(
            [$existing],
            new DateTime('2026-03-09'),
            new DateTime('2026-03-15'),
            $this->makeYear(),
        );

        // One week in range, already covered → exactly one entity returned
        $this->assertCount(1, $result);
        $this->assertSame($existing, $result[0]);
    }

    public function testUpdateWeekIntervalsAddsOnlyMissingWeeks(): void
    {
        // Three-week range: week9 and week11 exist, week10 is missing
        $week9  = $this->makeExistingInterval('2026-02-23', '2026-03-01');
        $week11 = $this->makeExistingInterval('2026-03-09', '2026-03-15');

        $result = $this->service->updateWeekIntervals(
            [$week9, $week11],
            new DateTime('2026-02-23'),
            new DateTime('2026-03-15'),
            $this->makeYear(),
        );

        // Should have 3 entities: week9, week10 (new), week11
        $this->assertCount(3, $result);
    }

    // =========================================================================
    // updateWeekIntervals — out-of-range filtering
    // =========================================================================

    public function testUpdateWeekIntervalsFiltersIntervalBelowRangeOut(): void
    {
        $outOfRange = $this->makeExistingInterval('2026-02-16', '2026-02-22');
        $inRange    = $this->makeExistingInterval('2026-03-09', '2026-03-15');

        $result = $this->service->updateWeekIntervals(
            [$outOfRange, $inRange],
            new DateTime('2026-03-09'),
            new DateTime('2026-03-15'),
            $this->makeYear(),
        );

        $this->assertCount(1, $result);
        $this->assertSame($inRange, $result[0]);
    }

    public function testUpdateWeekIntervalsFiltersIntervalAboveRangeOut(): void
    {
        $inRange    = $this->makeExistingInterval('2026-03-09', '2026-03-15');
        $outOfRange = $this->makeExistingInterval('2026-03-16', '2026-03-22');

        $result = $this->service->updateWeekIntervals(
            [$inRange, $outOfRange],
            new DateTime('2026-03-09'),
            new DateTime('2026-03-15'),
            $this->makeYear(),
        );

        $this->assertCount(1, $result);
        $this->assertSame($inRange, $result[0]);
    }

    // =========================================================================
    // updateWeekIntervals — sorting
    // =========================================================================

    public function testUpdateWeekIntervalsSortsByStartDateAscending(): void
    {
        // Supply existing intervals in reverse order
        $week11 = $this->makeExistingInterval('2026-03-09', '2026-03-15');
        $week9  = $this->makeExistingInterval('2026-02-23', '2026-03-01');
        $week10 = $this->makeExistingInterval('2026-03-02', '2026-03-08');

        $result = $this->service->updateWeekIntervals(
            [$week11, $week9, $week10],
            new DateTime('2026-02-23'),
            new DateTime('2026-03-15'),
            $this->makeYear(),
        );

        $this->assertCount(3, $result);
        $this->assertSame('2026-02-23', $result[0]->getDateOfStart()?->format('Y-m-d'));
        $this->assertSame('2026-03-02', $result[1]->getDateOfStart()?->format('Y-m-d'));
        $this->assertSame('2026-03-09', $result[2]->getDateOfStart()?->format('Y-m-d'));
    }

    // =========================================================================
    // updateWeekIntervals — multi-week creation
    // =========================================================================

    public function testUpdateWeekIntervalsWithNoExistingCreatesAllWeeksInRange(): void
    {
        // Three-week range, no existing
        $result = $this->service->updateWeekIntervals(
            [],
            new DateTime('2026-02-23'),
            new DateTime('2026-03-15'),
            $this->makeYear(),
        );

        $this->assertCount(3, $result);
        $this->assertSame('2026-02-23', $result[0]->getDateOfStart()?->format('Y-m-d'));
        $this->assertSame('2026-03-02', $result[1]->getDateOfStart()?->format('Y-m-d'));
        $this->assertSame('2026-03-09', $result[2]->getDateOfStart()?->format('Y-m-d'));
    }
}
