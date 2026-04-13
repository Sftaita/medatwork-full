<?php

declare(strict_types=1);

namespace App\Tests\Unit;

use App\Services\Utils\Tools;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for App\Services\Utils\Tools.
 * No database, no kernel — pure PHP logic.
 */
class ToolsTest extends TestCase
{
    private Tools $tools;

    protected function setUp(): void
    {
        $this->tools = new Tools();
    }

    // -------------------------------------------------------------------------
    // timeDiffInSeconds
    // -------------------------------------------------------------------------

    public function testTimeDiffInSecondsNormalRange(): void
    {
        // 08:00 → 18:00 = 10 hours = 36 000 s
        $result = $this->tools->timeDiffInSeconds('08:00', '18:00');
        $this->assertSame(36000, $result);
    }

    public function testTimeDiffInSecondsEndAt2359UsesTomorrow(): void
    {
        // When endTime === '23:59' the implementation uses strtotime('tomorrow', startTimestamp),
        // which is midnight of the next day.
        // 18:00 → midnight = 6 h = 21 600 s (NOT 21 540).
        $result = $this->tools->timeDiffInSeconds('18:00', '23:59');
        $this->assertSame(21600, $result);
    }

    public function testTimeDiffInSecondsFromMidnight(): void
    {
        // 00:00 → 08:00 = 8 hours = 28 800 s
        $result = $this->tools->timeDiffInSeconds('00:00', '08:00');
        $this->assertSame(28800, $result);
    }

    // -------------------------------------------------------------------------
    // convert_to_hours
    // -------------------------------------------------------------------------

    public function testConvertToHours90Minutes(): void
    {
        $this->assertSame('1:30', $this->tools->convert_to_hours(90));
    }

    public function testConvertToHours60Minutes(): void
    {
        $this->assertSame('1:00', $this->tools->convert_to_hours(60));
    }

    public function testConvertToHours0Minutes(): void
    {
        $this->assertSame('0:00', $this->tools->convert_to_hours(0));
    }

    public function testConvertToHours150Minutes(): void
    {
        $this->assertSame('2:30', $this->tools->convert_to_hours(150));
    }

    // -------------------------------------------------------------------------
    // weekOfYear
    // -------------------------------------------------------------------------

    public function testWeekOfYearNormalWeek(): void
    {
        // 2026-03-21 is ISO week 12
        $timestamp = strtotime('2026-03-21');
        $result = $this->tools->weekOfYear($timestamp);
        $this->assertSame(12, $result);
    }

    public function testWeekOfYearJanuaryDateInLastWeekOfPrevYear(): void
    {
        // Jan 3 2016 is ISO week 53, month = 1 → returns 0
        $timestamp = strtotime('2016-01-03');
        $this->assertSame('1', date('n', $timestamp)); // confirm month is Jan
        $this->assertGreaterThan(51, (int) date('W', $timestamp)); // confirm ISO week > 51
        $result = $this->tools->weekOfYear($timestamp);
        $this->assertSame(0, $result);
    }

    public function testWeekOfYearDecemberDateInFirstWeekOfNextYear(): void
    {
        // Dec 29 2025 is ISO week 1, month = 12 → returns 53
        $timestamp = strtotime('2025-12-29');
        $this->assertSame('12', date('n', $timestamp));   // confirm month is December
        $this->assertSame('01', date('W', $timestamp)); // confirm ISO week = 01 (zero-padded)
        $result = $this->tools->weekOfYear($timestamp);
        $this->assertSame(53, $result);
    }

    // -------------------------------------------------------------------------
    // is_array_of_digits
    // -------------------------------------------------------------------------

    public function testIsArrayOfDigitsAllDigits(): void
    {
        $this->assertTrue($this->tools->is_array_of_digits(['1', '2', '3']));
    }

    public function testIsArrayOfDigitsContainsLetter(): void
    {
        $this->assertFalse($this->tools->is_array_of_digits(['1', 'a', '3']));
    }

    public function testIsArrayOfDigitsEmptyArray(): void
    {
        // Empty array: the foreach loop body never executes, so it returns true.
        $this->assertTrue($this->tools->is_array_of_digits([]));
    }

    // -------------------------------------------------------------------------
    // checkIfDateIsInCurrentMonth
    // -------------------------------------------------------------------------

    public function testCheckIfDateIsInCurrentMonthInsideRange(): void
    {
        $result = $this->tools->checkIfDateIsInCurrentMonth(
            '2026-03-15 12:00:00',
            '2026-03-01 00:00:00',
            '2026-03-31 23:59:59'
        );
        $this->assertTrue($result);
    }

    public function testCheckIfDateIsInCurrentMonthBeforeRange(): void
    {
        $result = $this->tools->checkIfDateIsInCurrentMonth(
            '2026-02-28 23:59:59',
            '2026-03-01 00:00:00',
            '2026-03-31 23:59:59'
        );
        $this->assertFalse($result);
    }

    public function testCheckIfDateIsInCurrentMonthAfterRange(): void
    {
        $result = $this->tools->checkIfDateIsInCurrentMonth(
            '2026-04-01 00:00:00',
            '2026-03-01 00:00:00',
            '2026-03-31 23:59:59'
        );
        $this->assertFalse($result);
    }

    // -------------------------------------------------------------------------
    // dateBoundaries
    // -------------------------------------------------------------------------

    public function testDateBoundariesReturnsRequiredKeys(): void
    {
        $result = $this->tools->dateBoundaries(3, 2026);

        $this->assertArrayHasKey('start', $result);
        $this->assertArrayHasKey('end', $result);
        $this->assertArrayHasKey('startFromWeek', $result);
        $this->assertArrayHasKey('endOfTheLastWeek', $result);
    }

    public function testDateBoundariesMarch2026StartEnd(): void
    {
        $result = $this->tools->dateBoundaries(3, 2026);

        $this->assertSame('2026-03-01 00:00:00', $result['start']);
        $this->assertSame('2026-03-31 23:59:59', $result['end']);
    }

    public function testDateBoundariesMarch2026WeekLimits(): void
    {
        // March 1 2026 is a Sunday; Monday this week = Feb 23 2026.
        // March 31 2026 is a Tuesday; next Monday = April 6 2026; minus one day = April 5 2026.
        $result = $this->tools->dateBoundaries(3, 2026);

        $this->assertSame('2026-02-23 00:00:00', $result['startFromWeek']);
        $this->assertSame('2026-04-05 23:59:59', $result['endOfTheLastWeek']);
    }

    // -------------------------------------------------------------------------
    // checkIfDateIsBeforeOfAfterCurrentMonth
    // -------------------------------------------------------------------------

    /**
     * Boundary dates used across several sub-tests (March 2026):
     *   monthFirst  = 2026-03-01 00:00:00
     *   monthLast   = 2026-03-31 23:59:59
     *   firstWeek   = 2026-02-23 00:00:00
     *   lastWeek    = 2026-04-05 23:59:59
     */
    public function testCheckBeforeOfAfterBeforeMonth(): void
    {
        // Feb 25 is after the first-week boundary (Feb 23) but before the month start (Mar 1).
        $result = $this->tools->checkIfDateIsBeforeOfAfterCurrentMonth(
            '2026-02-25 00:00:00',
            '2026-03-01 00:00:00',
            '2026-03-31 23:59:59',
            '2026-02-23 00:00:00',
            '2026-04-05 23:59:59'
        );
        $this->assertSame('before', $result);
    }

    public function testCheckBeforeOfAfterAfterMonth(): void
    {
        // Apr 3 is after the month end (Mar 31) but still within the last-week boundary (Apr 5).
        $result = $this->tools->checkIfDateIsBeforeOfAfterCurrentMonth(
            '2026-04-03 00:00:00',
            '2026-03-01 00:00:00',
            '2026-03-31 23:59:59',
            '2026-02-23 00:00:00',
            '2026-04-05 23:59:59'
        );
        $this->assertSame('after', $result);
    }

    public function testCheckBeforeOfAfterInsideMonth(): void
    {
        $result = $this->tools->checkIfDateIsBeforeOfAfterCurrentMonth(
            '2026-03-15 00:00:00',
            '2026-03-01 00:00:00',
            '2026-03-31 23:59:59',
            '2026-02-23 00:00:00',
            '2026-04-05 23:59:59'
        );
        $this->assertSame('in', $result);
    }

    public function testCheckBeforeOfAfterCompletelyOutside(): void
    {
        // Jan 1 is well before the first-week boundary (Feb 23).
        $result = $this->tools->checkIfDateIsBeforeOfAfterCurrentMonth(
            '2026-01-01 00:00:00',
            '2026-03-01 00:00:00',
            '2026-03-31 23:59:59',
            '2026-02-23 00:00:00',
            '2026-04-05 23:59:59'
        );
        $this->assertSame('out', $result);
    }

    // -------------------------------------------------------------------------
    // getWeekNumber
    // -------------------------------------------------------------------------

    public function testGetWeekNumberSecondWeekOfJanuary2026(): void
    {
        // 2026-01-05 is ISO week 2
        $result = $this->tools->getWeekNumber('2026-01-05');
        $this->assertSame(2, $result);
    }
}
