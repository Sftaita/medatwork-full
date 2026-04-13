<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\ManagerMonthValidation;

use App\Services\ManagerMonthValidation\WeeklyHoursChecker;
use App\Services\Utils\Tools;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class WeeklyHoursCheckerTest extends TestCase
{
    /** @var Tools&MockObject */
    private Tools $tools;

    private WeeklyHoursChecker $checker;

    protected function setUp(): void
    {
        $this->tools   = $this->createMock(Tools::class);
        $this->checker = new WeeklyHoursChecker($this->tools);
    }

    // ─── checkWeeklyHours ─────────────────────────────────────────────────────

    public function testCheckWeeklyHoursAllWithinLimit(): void
    {
        $limits = ['limit' => 48, 'highLimit' => 60];

        $result = $this->checker->checkWeeklyHours([1 => 40, 2 => 35], $limits);

        $this->assertSame([], $result['warningHours']);
        $this->assertSame([], $result['illegalHours']);
        $this->assertSame([], $result['errors']);
    }

    public function testCheckWeeklyHoursWarningZone(): void
    {
        $limits = ['limit' => 48, 'highLimit' => 60];

        $result = $this->checker->checkWeeklyHours([5 => 50], $limits);

        $this->assertArrayHasKey(5, $result['warningHours']);
        $this->assertSame([], $result['illegalHours']);
        $this->assertSame([], $result['errors']);
    }

    public function testCheckWeeklyHoursIllegalZone(): void
    {
        $limits = ['limit' => 48, 'highLimit' => 60];

        $result = $this->checker->checkWeeklyHours([10 => 65], $limits);

        $this->assertSame([], $result['warningHours']);
        $this->assertArrayHasKey(10, $result['illegalHours']);
        $this->assertCount(1, $result['errors']);
        $this->assertStringContainsString('10', $result['errors'][0]);
    }

    public function testCheckWeeklyHoursMixedWeeks(): void
    {
        $limits = ['limit' => 48, 'highLimit' => 60];

        $result = $this->checker->checkWeeklyHours([1 => 40, 2 => 52, 3 => 65], $limits);

        $this->assertArrayHasKey(2, $result['warningHours']);
        $this->assertArrayHasKey(3, $result['illegalHours']);
        $this->assertCount(1, $result['errors']);
    }

    // ─── checkWeeklyHoursExceedLimit ─────────────────────────────────────────

    public function testCheckWeeklyHoursExceedLimitReturnsNullWhenUnderTwo(): void
    {
        $error = $this->checker->checkWeeklyHoursExceedLimit([1 => 50], [], 'Period 2');

        $this->assertNull($error);
    }

    public function testCheckWeeklyHoursExceedLimitReturnsMessageWhenTwoOrMore(): void
    {
        $error = $this->checker->checkWeeklyHoursExceedLimit([1 => 50, 2 => 55], [], 'Period 3');

        $this->assertIsString($error);
        $this->assertStringContainsString('3', $error);
    }

    public function testCheckWeeklyHoursExceedLimitCountsIllegalToo(): void
    {
        // 1 warning + 1 illegal = 2 total → should trigger
        $error = $this->checker->checkWeeklyHoursExceedLimit([1 => 50], [2 => 65], 'Period 1');

        $this->assertIsString($error);
        $this->assertStringContainsString('1', $error);
    }

    public function testCheckWeeklyHoursExceedLimitNullWhenExactlyOne(): void
    {
        $error = $this->checker->checkWeeklyHoursExceedLimit([], [5 => 70], 'Period 4');

        $this->assertNull($error);
    }

    // ─── checkWeeklyHoursExceedLimitImproved ─────────────────────────────────

    public function testCheckWeeklyHoursExceedLimitImprovedNoWarning(): void
    {
        $warnings = $this->checker->checkWeeklyHoursExceedLimitImproved(
            [1 => 50], [], 'Period 1', '2024-01-01', '2024-04-01'
        );

        $this->assertSame([], $warnings);
    }

    public function testCheckWeeklyHoursExceedLimitImprovedReturnsWarning(): void
    {
        $warnings = $this->checker->checkWeeklyHoursExceedLimitImproved(
            [1 => 50, 2 => 55], [], 'Period 2', '2024-01-01', '2024-04-01'
        );

        $this->assertCount(1, $warnings);
        $this->assertSame('overruns', $warnings[0]['warningType']);
        $this->assertSame('2', $warnings[0]['period']);
        $this->assertSame('2024-01-01', $warnings[0]['startDate']);
        $this->assertSame('2024-04-01', $warnings[0]['endDate']);
    }

    // ─── getWeeksInPeriod ─────────────────────────────────────────────────────

    public function testGetWeeksInPeriodReturnsMondayToSunday(): void
    {
        // Week 1 of 2024 starts on 2024-01-01 (Monday)
        $weeks = $this->checker->getWeeksInPeriod('2024-01-01 00:00:00', '2024-01-08 00:00:00');

        $this->assertCount(1, $weeks);
        $weekNum = array_key_first($weeks);
        $this->assertSame('2024-01-01', $weeks[$weekNum]['start']);
        $this->assertSame('2024-01-07', $weeks[$weekNum]['end']);
    }

    public function testGetWeeksInPeriodThirteenWeeks(): void
    {
        // 13 weeks = 91 days; DatePeriod is exclusive on end, so +14 weeks to cover 13
        $weeks = $this->checker->getWeeksInPeriod('2024-01-01 00:00:00', '2024-04-01 00:00:00');

        $this->assertGreaterThanOrEqual(12, count($weeks));
        foreach ($weeks as $num => $dates) {
            $this->assertArrayHasKey('start', $dates);
            $this->assertArrayHasKey('end', $dates);
        }
    }

    // ─── hoursCounter ─────────────────────────────────────────────────────────

    public function testHoursCounterEmptyInputsReturnsZeroedWeeks(): void
    {
        // 2024-W01 (2024-01-01 Mon) and 2024-W02 (2024-01-08 Mon)
        $start = '2024-01-01 00:00:00';
        $end   = '2024-01-14 23:59:59';

        $result = $this->checker->hoursCounter([], [], [], $start, $end);

        foreach ($result as $hours) {
            $this->assertEqualsWithDelta(0.0, (float) $hours, 0.01);
        }
    }

    public function testHoursCounterTimesheetWithinInterval(): void
    {
        $start = '2024-01-01 00:00:00';
        $end   = '2024-01-14 23:59:59';

        // 8h work day: 08:00 → 16:00 = 28800 s, pause 0
        $this->tools->method('timeDiffInSeconds')->willReturn(28800);
        $this->tools->method('isHoliday')->willReturn(0);

        $timesheets = [[
            'start' => '2024-01-02 08:00:00', // Tuesday, ISO week 1
            'end'   => '2024-01-02 16:00:00',
            'pause' => 0,
        ]];

        $result = $this->checker->hoursCounter($timesheets, [], [], $start, $end);

        $week1 = 1; // 2024-01-02 is ISO week 1
        $this->assertArrayHasKey($week1, $result);
        $this->assertEqualsWithDelta(8.0, $result[$week1], 0.01);
    }

    public function testHoursCounterHospitalGardeWithinInterval(): void
    {
        $start = '2024-01-01 00:00:00';
        $end   = '2024-01-14 23:59:59';

        $this->tools->method('timeDiffInSeconds')->willReturn(43200); // 12 h

        $gardes = [[
            'start' => '2024-01-03 20:00:00', // Wednesday, ISO week 1
            'end'   => '2024-01-04 08:00:00',
            'type'  => 'hospital',
        ]];

        $result = $this->checker->hoursCounter([], $gardes, [], $start, $end);

        $week1 = 1; // 2024-01-03 is ISO week 1
        $this->assertArrayHasKey($week1, $result);
        $this->assertEqualsWithDelta(12.0, $result[$week1], 0.01);
    }

    public function testHoursCounterCallableGardeIsIgnored(): void
    {
        $start = '2024-01-01 00:00:00';
        $end   = '2024-01-14 23:59:59';

        $gardes = [[
            'start' => '2024-01-03 20:00:00',
            'end'   => '2024-01-04 08:00:00',
            'type'  => 'callable',
        ]];

        $result = $this->checker->hoursCounter([], $gardes, [], $start, $end);

        $week1 = 1;
        $this->assertEqualsWithDelta(0.0, (float) ($result[$week1] ?? 0.0), 0.01);
    }

    public function testHoursCounterAbsenceNonRecoveryNonHolidayCountsNineHoursThirtySix(): void
    {
        $start = '2024-01-01 00:00:00';
        $end   = '2024-01-14 23:59:59';

        $this->tools->method('isHoliday')->willReturn(0);

        $absences = [[
            'start' => '2024-01-02 00:00:00', // ISO week 1
            'end'   => '2024-01-02 23:59:59',
            'type'  => 'annualLeave',
        ]];

        $result = $this->checker->hoursCounter([], [], $absences, $start, $end);

        $expected = (9 * 3600 + 36 * 60) / 3600; // 9.6 h
        $week1    = 1;
        $this->assertArrayHasKey($week1, $result);
        $this->assertEqualsWithDelta($expected, $result[$week1], 0.01);
    }

    public function testHoursCounterAbsenceRecoveryCountsZero(): void
    {
        $start = '2024-01-01 00:00:00';
        $end   = '2024-01-14 23:59:59';

        $this->tools->method('isHoliday')->willReturn(0);

        $absences = [[
            'start' => '2024-01-02 00:00:00', // ISO week 1
            'end'   => '2024-01-02 23:59:59',
            'type'  => 'recovery',
        ]];

        $result = $this->checker->hoursCounter([], [], $absences, $start, $end);

        $week1 = 1;
        $this->assertEqualsWithDelta(0.0, (float) ($result[$week1] ?? 0.0), 0.01);
    }
}
