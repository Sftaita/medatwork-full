<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\ExcelGenerator;

use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\TimesheetRepository;
use App\Services\ExcelGenerator\FetchingData;
use App\Services\Utils\Tools;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for FetchingData.
 *
 * The repository methods are mocked; only the pure-logic methods
 * (createStandardizedTable, onPlaceDayPeriod) are exercised here.
 *
 * Covers createStandardizedTable:
 * - Timesheet not-called → 'interval' column, 'calledInterval' = null
 * - Timesheet called     → 'calledInterval' column, 'interval' = null
 * - Two not-called timesheets same day → intervals concatenated with '  '
 * - Timesheet + garde same day        → intervals concatenated
 * - Garde alone                       → 'interval' column, pause/scientific = null
 * - Empty input                       → empty output
 * - Output key uses 'dd-mm-YYYY' date format
 * - 'date' field in output matches key
 */
final class FetchingDataTest extends TestCase
{
    private FetchingData $fetchingData;

    protected function setUp(): void
    {
        $timesheetRepo  = $this->createMock(TimesheetRepository::class);
        $gardeRepo      = $this->createMock(GardeRepository::class);
        $absenceRepo    = $this->createMock(AbsenceRepository::class);
        $tools          = $this->createMock(Tools::class);

        $this->fetchingData = new FetchingData($timesheetRepo, $gardeRepo, $absenceRepo, $tools);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /** Build a typical day-period entry as returned by separateTimesheetsByDay. */
    private function makeTimesheetPeriod(
        string $start,
        string $end,
        bool $called,
        int $pause = 0,
        int $scientific = 0,
    ): array {
        return [
            'start'      => $start,
            'end'        => $end,
            'pause'      => $pause,
            'scientific' => $scientific,
            'called'     => $called,
            'index'      => 'timesheet',
            'timestamp'  => strtotime($start),
        ];
    }

    /** Build a garde day-period entry. */
    private function makeGardePeriod(string $start, string $end): array
    {
        return [
            'start'     => $start,
            'end'       => $end,
            'index'     => 'garde',
            'timestamp' => strtotime($start),
        ];
    }

    // ── createStandardizedTable ───────────────────────────────────────────────

    public function testEmptyInputReturnsEmptyOutput(): void
    {
        $result = $this->fetchingData->createStandardizedTable([]);
        $this->assertSame([], $result);
    }

    public function testNotCalledTimesheetGoesToIntervalColumn(): void
    {
        $period = $this->makeTimesheetPeriod('2025-10-07 08:00:00', '2025-10-07 16:00:00', false);
        $result = $this->fetchingData->createStandardizedTable([$period]);

        $key = '07-10-2025';
        $this->assertArrayHasKey($key, $result);
        $this->assertSame('08:00-16:00', $result[$key]['interval']);
        $this->assertNull($result[$key]['calledInterval']);
    }

    public function testCalledTimesheetGoesToCalledIntervalColumn(): void
    {
        $period = $this->makeTimesheetPeriod('2025-10-07 20:00:00', '2025-10-08 08:00:00', true);
        $result = $this->fetchingData->createStandardizedTable([$period]);

        $key = '07-10-2025';
        $this->assertArrayHasKey($key, $result);
        $this->assertNull($result[$key]['interval']);
        $this->assertSame('20:00-08:00', $result[$key]['calledInterval']);
    }

    public function testTwoNotCalledTimesheetsSameDayConcatenated(): void
    {
        $p1 = $this->makeTimesheetPeriod('2025-10-10 08:00:00', '2025-10-10 12:00:00', false, 30, 0);
        $p2 = $this->makeTimesheetPeriod('2025-10-10 14:00:00', '2025-10-10 17:00:00', false, 0,  60);
        $result = $this->fetchingData->createStandardizedTable([$p1, $p2]);

        $key = '10-10-2025';
        $this->assertArrayHasKey($key, $result);
        $this->assertStringContainsString('08:00-12:00', $result[$key]['interval']);
        $this->assertStringContainsString('14:00-17:00', $result[$key]['interval']);
        $this->assertSame(30, $result[$key]['pause']);
        $this->assertSame(60, $result[$key]['scientific']);
    }

    public function testTimesheetAndGardeSameDayMergeIntervals(): void
    {
        $ts    = $this->makeTimesheetPeriod('2025-10-15 08:00:00', '2025-10-15 16:00:00', false);
        $garde = $this->makeGardePeriod('2025-10-15 20:00:00', '2025-10-16 08:00:00');
        $result = $this->fetchingData->createStandardizedTable([$ts, $garde]);

        $key = '15-10-2025';
        $this->assertStringContainsString('08:00-16:00', $result[$key]['interval']);
        $this->assertStringContainsString('20:00-08:00', $result[$key]['interval']);
    }

    public function testGardeAloneCreatesIntervalWithNullPauseScientific(): void
    {
        $garde = $this->makeGardePeriod('2025-10-20 20:00:00', '2025-10-21 08:00:00');
        $result = $this->fetchingData->createStandardizedTable([$garde]);

        $key = '20-10-2025';
        $this->assertArrayHasKey($key, $result);
        $this->assertSame('20:00-08:00', $result[$key]['interval']);
        $this->assertNull($result[$key]['calledInterval']);
        $this->assertNull($result[$key]['pause']);
        $this->assertNull($result[$key]['scientific']);
    }

    public function testOutputKeyIsDdMmYyyyyFormat(): void
    {
        $period = $this->makeTimesheetPeriod('2025-01-05 09:00:00', '2025-01-05 17:00:00', false);
        $result = $this->fetchingData->createStandardizedTable([$period]);

        $this->assertArrayHasKey('05-01-2025', $result);
    }

    public function testOutputDateFieldMatchesKey(): void
    {
        $period = $this->makeTimesheetPeriod('2025-03-31 08:00:00', '2025-03-31 16:00:00', false);
        $result = $this->fetchingData->createStandardizedTable([$period]);

        $key = '31-03-2025';
        $this->assertSame($key, $result[$key]['date']);
    }

    public function testPauseAndScientificAccumulatedAcrossTimesheets(): void
    {
        $p1 = $this->makeTimesheetPeriod('2025-10-10 08:00:00', '2025-10-10 12:00:00', false, 15, 30);
        $p2 = $this->makeTimesheetPeriod('2025-10-10 13:00:00', '2025-10-10 17:00:00', false, 20, 45);
        $result = $this->fetchingData->createStandardizedTable([$p1, $p2]);

        $this->assertSame(35, $result['10-10-2025']['pause']);
        $this->assertSame(75, $result['10-10-2025']['scientific']);
    }

    public function testMultipleDifferentDaysProduceSeparateEntries(): void
    {
        $p1 = $this->makeTimesheetPeriod('2025-10-01 08:00:00', '2025-10-01 16:00:00', false);
        $p2 = $this->makeTimesheetPeriod('2025-10-02 08:00:00', '2025-10-02 16:00:00', false);
        $result = $this->fetchingData->createStandardizedTable([$p1, $p2]);

        $this->assertCount(2, $result);
        $this->assertArrayHasKey('01-10-2025', $result);
        $this->assertArrayHasKey('02-10-2025', $result);
    }
}
