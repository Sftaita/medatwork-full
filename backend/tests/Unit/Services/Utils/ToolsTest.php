<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\Utils;

use App\Services\Utils\Tools;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for App\Services\Utils\Tools.
 * No database, no kernel — pure PHP date/time logic.
 */
class ToolsTest extends TestCase
{
    private Tools $tools;

    protected function setUp(): void
    {
        $this->tools = new Tools();
    }

    // =========================================================================
    // timeDiffInSeconds
    // =========================================================================

    /**
     * @dataProvider provideTimeDiffInSecondsHappyPath
     */
    public function testTimeDiffInSecondsHappyPath(string $start, string $end, int $expected): void
    {
        $this->assertSame($expected, $this->tools->timeDiffInSeconds($start, $end));
    }

    /**
     * @return array<string, array<mixed>>
     */
    public static function provideTimeDiffInSecondsHappyPath(): array
    {
        return [
            'morning shift 08:00 to 18:00 is 36000 s'   => ['08:00', '18:00', 36000],
            'midnight shift 00:00 to 08:00 is 28800 s'  => ['00:00', '08:00', 28800],
            'same time gives 0 s'                        => ['12:00', '12:00', 0],
            'one minute 09:00 to 09:01 is 60 s'          => ['09:00', '09:01', 60],
            'full day minus one minute 00:00 to 23:00'   => ['00:00', '23:00', 82800],
        ];
    }

    /**
     * Special case: endTime === '23:59' → the implementation treats end as
     * midnight of the NEXT day relative to start (i.e. `modify('tomorrow')`),
     * NOT the literal 23:59 time.  This means the result equals
     * (midnight_next_day - start_time) in seconds.
     *
     * @dataProvider provideTimeDiffInSeconds2359Edge
     */
    public function testTimeDiffInSeconds2359TreatsEndAsMidnight(string $start, int $expectedSeconds): void
    {
        // When endTime is '23:59', the code replaces endDt with
        // (new DateTime($startTime))->modify('tomorrow'), i.e. midnight of tomorrow.
        $this->assertSame($expectedSeconds, $this->tools->timeDiffInSeconds($start, '23:59'));
    }

    /**
     * @return array<string, array<mixed>>
     */
    public static function provideTimeDiffInSeconds2359Edge(): array
    {
        // Midnight tomorrow minus start = (24h - startHour) in seconds
        return [
            'start 18:00 → midnight = 6 h = 21600 s'  => ['18:00', 21600],
            'start 00:00 → midnight = 24 h = 86400 s' => ['00:00', 86400],
            'start 08:00 → midnight = 16 h = 57600 s' => ['08:00', 57600],
        ];
    }

    // =========================================================================
    // hoursdiffInSeconde
    // =========================================================================

    /**
     * @dataProvider provideHoursdiffInSeconde
     */
    public function testHoursdiffInSeconde(string $start, string $end, int $expected): void
    {
        $this->assertSame($expected, $this->tools->hoursdiffInSeconde($start, $end));
    }

    /**
     * @return array<string, array<mixed>>
     */
    public static function provideHoursdiffInSeconde(): array
    {
        return [
            'same datetime gives 0'                                    => ['2026-03-01 08:00:00', '2026-03-01 08:00:00', 0],
            '10 hours within the same day'                             => ['2026-03-01 08:00:00', '2026-03-01 18:00:00', 36000],
            'full 24-hour day'                                         => ['2026-03-01 00:00:00', '2026-03-02 00:00:00', 86400],
            'multi-day span of exactly 48 hours'                       => ['2026-03-01 00:00:00', '2026-03-03 00:00:00', 172800],
            '30 minutes expressed as seconds'                          => ['2026-03-15 10:00:00', '2026-03-15 10:30:00', 1800],
            'cross month boundary march to april'                      => ['2026-03-31 23:00:00', '2026-04-01 01:00:00', 7200],
        ];
    }

    // =========================================================================
    // weekOfYear
    // =========================================================================

    /**
     * @dataProvider provideWeekOfYearNormal
     */
    public function testWeekOfYearNormalWeeks(int $timestamp, int $expectedWeek): void
    {
        $this->assertSame($expectedWeek, $this->tools->weekOfYear($timestamp));
    }

    /**
     * @return array<string, array<mixed>>
     */
    public static function provideWeekOfYearNormal(): array
    {
        return [
            '2026-03-21 is ISO week 12' => [strtotime('2026-03-21'), 12],
            '2026-01-05 is ISO week 2'  => [strtotime('2026-01-05'), 2],
            '2026-06-15 is ISO week 25' => [strtotime('2026-06-15'), 25],
        ];
    }

    /**
     * January with ISO week > 51 means this date actually belongs to the last
     * week of the previous year → the method returns 0.
     */
    public function testWeekOfYearJanuaryInLastWeekOfPrevYearReturnsZero(): void
    {
        // 2016-01-03: month = 1, ISO week = 53 (> 51) → returns 0
        $timestamp = strtotime('2016-01-03');

        $this->assertSame('1', date('n', $timestamp), 'Pre-condition: must be January');
        $this->assertGreaterThan(51, (int) date('W', $timestamp), 'Pre-condition: ISO week must be > 51');

        $this->assertSame(0, $this->tools->weekOfYear($timestamp));
    }

    /**
     * December with ISO week == 1 means this date belongs to week 1 of next
     * year → the method returns 53 (treating it as the 53rd week of the year).
     */
    public function testWeekOfYearDecemberInFirstWeekOfNextYearReturns53(): void
    {
        // 2025-12-29: month = 12, ISO week = 01 → returns 53
        $timestamp = strtotime('2025-12-29');

        $this->assertSame('12', date('n', $timestamp), 'Pre-condition: must be December');
        $this->assertSame('01', date('W', $timestamp), 'Pre-condition: ISO week must be 01');

        $this->assertSame(53, $this->tools->weekOfYear($timestamp));
    }

    // =========================================================================
    // weekOfMonth
    // =========================================================================

    /**
     * @dataProvider provideWeekOfMonth
     */
    public function testWeekOfMonth(string $date, int $expectedWeek): void
    {
        $this->assertSame($expectedWeek, $this->tools->weekOfMonth($date));
    }

    /**
     * @return array<string, array<mixed>>
     */
    public static function provideWeekOfMonth(): array
    {
        return [
            'March 1 2026 is first week of month'   => ['2026-03-01', 1],
            'March 8 2026 is second week of month'  => ['2026-03-08', 2],
            'March 15 2026 is third week of month'  => ['2026-03-15', 3],
            'March 31 2026 is sixth week of month'  => ['2026-03-31', 6],
            'Jan 1 2026 is first week of month'     => ['2026-01-01', 1],
            'Jan 5 2026 is second week of month'    => ['2026-01-05', 2],
            'Dec 1 2025 is first week of month'     => ['2025-12-01', 1],
            'Dec 8 2025 is second week of month'    => ['2025-12-08', 2],
            // Dec 29 2025 is ISO week 1 (of 2026) → weekOfYear returns 53; first of Dec = week 49 → 53-49+1 = 5
            'Dec 29 2025 crosses into ISO week 1 next year → week 5 of month' => ['2025-12-29', 5],
        ];
    }

    // =========================================================================
    // getWeekNumber
    // =========================================================================

    /**
     * @dataProvider provideGetWeekNumber
     */
    public function testGetWeekNumber(string $date, int $expectedWeek): void
    {
        $this->assertSame($expectedWeek, $this->tools->getWeekNumber($date));
    }

    /**
     * @return array<string, array<mixed>>
     */
    public static function provideGetWeekNumber(): array
    {
        return [
            '2026-01-01 is ISO week 1'   => ['2026-01-01', 1],
            '2026-01-05 is ISO week 2'   => ['2026-01-05', 2],
            '2026-03-21 is ISO week 12'  => ['2026-03-21', 12],
            '2026-12-28 is ISO week 53'  => ['2026-12-28', 53],
            '2025-12-29 is ISO week 1'   => ['2025-12-29', 1],
        ];
    }

    // =========================================================================
    // dateBoundaries
    // =========================================================================

    public function testDateBoundariesReturnsAllRequiredKeys(): void
    {
        $result = $this->tools->dateBoundaries(3, 2026);

        $this->assertArrayHasKey('start', $result);
        $this->assertArrayHasKey('end', $result);
        $this->assertArrayHasKey('startFromWeek', $result);
        $this->assertArrayHasKey('endOfTheLastWeek', $result);
    }

    public function testDateBoundariesValuesAreDateStrings(): void
    {
        $result = $this->tools->dateBoundaries(3, 2026);

        foreach (['start', 'end', 'startFromWeek', 'endOfTheLastWeek'] as $key) {
            $this->assertIsString($result[$key], "Key '{$key}' must be a string");
            $this->assertMatchesRegularExpression(
                '/^\d{4}-\d{2}-\d{2}/',
                $result[$key],
                "Key '{$key}' must start with a YYYY-MM-DD date"
            );
        }
    }

    /**
     * @dataProvider provideDateBoundariesMonths
     */
    public function testDateBoundariesStartAndEndOfMonth(int $month, int $year, string $expectedStart, string $expectedEnd): void
    {
        $result = $this->tools->dateBoundaries($month, $year);

        $this->assertSame($expectedStart, $result['start']);
        $this->assertSame($expectedEnd, $result['end']);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public static function provideDateBoundariesMonths(): array
    {
        return [
            'March 2026 starts on 01 ends on 31'     => [3, 2026, '2026-03-01 00:00:00', '2026-03-31 23:59:59'],
            'February 2026 starts on 01 ends on 28'  => [2, 2026, '2026-02-01 00:00:00', '2026-02-28 23:59:59'],
            'January 2026 starts on 01 ends on 31'   => [1, 2026, '2026-01-01 00:00:00', '2026-01-31 23:59:59'],
        ];
    }

    /**
     * March 2026: March 1 is a Sunday, so Monday of that week is Feb 23 2026.
     * March 31 is a Tuesday; next Monday is April 6; minus one day = April 5.
     */
    public function testDateBoundariesMarch2026WeekExtents(): void
    {
        $result = $this->tools->dateBoundaries(3, 2026);

        $this->assertSame('2026-02-23 00:00:00', $result['startFromWeek']);
        $this->assertSame('2026-04-05 23:59:59', $result['endOfTheLastWeek']);
    }

    /**
     * February 2026: Feb 1 is a Sunday, so Monday of that week is Jan 26 2026.
     * Feb 28 is a Saturday; next Monday is March 2; minus one day = March 1.
     */
    public function testDateBoundariesFebruary2026WeekExtents(): void
    {
        $result = $this->tools->dateBoundaries(2, 2026);

        $this->assertSame('2026-01-26 00:00:00', $result['startFromWeek']);
        $this->assertSame('2026-03-01 23:59:59', $result['endOfTheLastWeek']);
    }

    /**
     * startFromWeek must be on or before the first day of the month.
     * endOfTheLastWeek must be on or after the last day of the month.
     *
     * @dataProvider provideDateBoundariesWeekExtentsOrdering
     */
    public function testDateBoundariesWeekExtentsEncloseMonth(int $month, int $year): void
    {
        $result = $this->tools->dateBoundaries($month, $year);

        $this->assertLessThanOrEqual(
            $result['start'],
            $result['startFromWeek'],
            'startFromWeek must be <= start of month'
        );
        $this->assertGreaterThanOrEqual(
            $result['end'],
            $result['endOfTheLastWeek'],
            'endOfTheLastWeek must be >= end of month'
        );
    }

    /**
     * @return array<string, array<mixed>>
     */
    public static function provideDateBoundariesWeekExtentsOrdering(): array
    {
        return [
            'March 2026'    => [3, 2026],
            'January 2026'  => [1, 2026],
            'December 2025' => [12, 2025],
            'February 2024' => [2, 2024], // leap year
        ];
    }

    // =========================================================================
    // checkIfDateIsInCurrentMonth
    // =========================================================================

    /**
     * @dataProvider provideCheckIfDateIsInCurrentMonth
     */
    public function testCheckIfDateIsInCurrentMonth(
        string $date,
        string $startOfMonth,
        string $endOfMonth,
        bool $expected
    ): void {
        $this->assertSame(
            $expected,
            $this->tools->checkIfDateIsInCurrentMonth($date, $startOfMonth, $endOfMonth)
        );
    }

    /**
     * @return array<string, array<mixed>>
     */
    public static function provideCheckIfDateIsInCurrentMonth(): array
    {
        $start = '2026-03-01 00:00:00';
        $end   = '2026-03-31 23:59:59';

        return [
            'mid-month date is inside range'              => ['2026-03-15 12:00:00', $start, $end, true],
            'exact start boundary is inside range'        => ['2026-03-01 00:00:00', $start, $end, true],
            'exact end boundary is inside range'          => ['2026-03-31 23:59:59', $start, $end, true],
            'day before start is outside range'           => ['2026-02-28 23:59:59', $start, $end, false],
            'day after end is outside range'              => ['2026-04-01 00:00:00', $start, $end, false],
            'completely different month is outside range' => ['2025-06-15 00:00:00', $start, $end, false],
        ];
    }

    // =========================================================================
    // getWeeksArray
    // =========================================================================

    public function testGetWeeksArrayReturnsCorrectWeekKeys(): void
    {
        // Jan 5 to Jan 26 2026 spans ISO weeks 2, 3, 4, 5
        $result = $this->tools->getWeeksArray('2026-01-05', '2026-01-26');

        $this->assertArrayHasKey(2, $result);
        $this->assertArrayHasKey(3, $result);
        $this->assertArrayHasKey(4, $result);
        $this->assertArrayHasKey(5, $result);
        $this->assertCount(4, $result);
    }

    public function testGetWeeksArrayAllValuesAreZero(): void
    {
        $result = $this->tools->getWeeksArray('2026-01-05', '2026-01-26');

        foreach ($result as $value) {
            $this->assertSame(0, $value, 'All week array values must be initialised to 0');
        }
    }

    public function testGetWeeksArraySingleWeekRange(): void
    {
        // 2026-03-09 to 2026-03-15 is entirely within ISO week 11
        $result = $this->tools->getWeeksArray('2026-03-09', '2026-03-15');

        $this->assertArrayHasKey(11, $result);
        $this->assertCount(1, $result);
    }

    public function testGetWeeksArraySameDateReturnsSingleWeek(): void
    {
        // Start == end: only one iteration
        $result = $this->tools->getWeeksArray('2026-03-21', '2026-03-21');

        $this->assertCount(1, $result);
    }

    /**
     * @dataProvider provideGetWeeksArraySpans
     */
    public function testGetWeeksArraySpansProduceExpectedCount(
        string $start,
        string $end,
        int $expectedCount
    ): void {
        $result = $this->tools->getWeeksArray($start, $end);
        $this->assertCount($expectedCount, $result);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public static function provideGetWeeksArraySpans(): array
    {
        return [
            'two-week span produces 2 entries'   => ['2026-03-01', '2026-03-14', 2],
            'three-week span produces 3 entries' => ['2026-03-01', '2026-03-21', 3],
        ];
    }

    // =========================================================================
    // is_array_of_digits
    // =========================================================================

    /**
     * @dataProvider provideIsArrayOfDigitsTrue
     * @param array<mixed> $input
     */
    public function testIsArrayOfDigitsReturnsTrueForAllDigitStrings(array $input): void
    {
        $this->assertTrue($this->tools->is_array_of_digits($input));
    }

    /**
     * @return array<string, array<mixed>>
     */
    public static function provideIsArrayOfDigitsTrue(): array
    {
        return [
            'single digit string'            => [['5']],
            'multiple digit strings'         => [['1', '2', '3']],
            'multi-character digit strings'  => [['10', '20', '300']],
            'empty array returns true'       => [[]],
        ];
    }

    /**
     * @dataProvider provideIsArrayOfDigitsFalse
     * @param array<mixed> $input
     */
    public function testIsArrayOfDigitsReturnsFalseWhenElementIsNotDigit(array $input): void
    {
        $this->assertFalse($this->tools->is_array_of_digits($input));
    }

    /**
     * @return array<string, array<mixed>>
     */
    public static function provideIsArrayOfDigitsFalse(): array
    {
        return [
            'letter among digits'            => [['1', 'a', '3']],
            'all letters'                    => [['a', 'b', 'c']],
            'string with space'              => [['1', ' ', '3']],
            'negative number string'         => [['-1', '2']],
            'float-like string'              => [['1.5', '2']],
            'empty string in array'          => [['']],
        ];
    }
}
