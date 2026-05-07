<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\ExcelGenerator;

use App\Entity\Resident;
use App\Entity\Years;
use App\Enum\GardeType;
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

    // ── getExcelTransformedData — type normalisation ───────────────────────────
    //
    // Regression tests for: GardeRepository::findByYear() returns GardeType enum
    // objects (not strings) in Doctrine ORM partial selects.  The fix in
    // getExcelTransformedData() must normalize them to strings so that
    // onPlaceDayPeriod() and CallableGardeMapper::map() can compare correctly.

    public function testGetExcelTransformedDataConvertsGardeTypeEnumToString(): void
    {
        $year     = $this->createMock(Years::class);
        $resident = $this->createMock(Resident::class);

        // Repository returns GardeType enum object (Doctrine ORM partial-select behaviour)
        $gardeRepo = $this->createMock(GardeRepository::class);
        $gardeRepo->method('findByYear')->willReturn([
            [
                'id'          => 1,
                'dateOfStart' => new \DateTime('2025-11-20 20:00:00'),
                'dateOfEnd'   => new \DateTime('2025-11-21 08:00:00'),
                'type'        => GardeType::Callable,   // enum object, NOT a string
            ],
            [
                'id'          => 2,
                'dateOfStart' => new \DateTime('2025-11-22 08:00:00'),
                'dateOfEnd'   => new \DateTime('2025-11-22 20:00:00'),
                'type'        => GardeType::Hospital,   // enum object, NOT a string
            ],
        ]);

        $timesheetRepo = $this->createMock(TimesheetRepository::class);
        $timesheetRepo->method('findBy')->willReturn([]);
        $absenceRepo   = $this->createMock(AbsenceRepository::class);
        $absenceRepo->method('findBy')->willReturn([]);
        $tools         = $this->createMock(Tools::class);

        $fetching = new FetchingData($timesheetRepo, $gardeRepo, $absenceRepo, $tools);
        $data     = $fetching->getExcelTransformedData($year, $resident);

        $this->assertSame('callable', $data['gardes'][0]['type'],
            'GardeType::Callable enum must be normalized to string "callable"');
        $this->assertSame('hospital', $data['gardes'][1]['type'],
            'GardeType::Hospital enum must be normalized to string "hospital"');
    }

    public function testGetExcelTransformedDataAlsoWorksWithStringTypes(): void
    {
        // Ensure backward compat: if repository already returns strings, nothing breaks
        $year     = $this->createMock(Years::class);
        $resident = $this->createMock(Resident::class);

        $gardeRepo = $this->createMock(GardeRepository::class);
        $gardeRepo->method('findByYear')->willReturn([
            [
                'id'          => 1,
                'dateOfStart' => new \DateTime('2025-11-20 20:00:00'),
                'dateOfEnd'   => new \DateTime('2025-11-21 08:00:00'),
                'type'        => 'callable',   // already a string
            ],
        ]);

        $timesheetRepo = $this->createMock(TimesheetRepository::class);
        $timesheetRepo->method('findBy')->willReturn([]);
        $absenceRepo   = $this->createMock(AbsenceRepository::class);
        $absenceRepo->method('findBy')->willReturn([]);
        $tools         = $this->createMock(Tools::class);

        $fetching = new FetchingData($timesheetRepo, $gardeRepo, $absenceRepo, $tools);
        $data     = $fetching->getExcelTransformedData($year, $resident);

        $this->assertSame('callable', $data['gardes'][0]['type']);
    }

    // ── onPlaceDayPeriod — hospital gardes filtered correctly ─────────────────

    public function testOnPlaceDayPeriodSelectsOnlyHospitalGardes(): void
    {
        // Simulated gardes AFTER type normalization (strings, as getExcelTransformedData delivers)
        $hospitalGarde = [
            'id'          => 1,
            'dateOfStart' => new \DateTime('2025-11-10 08:00:00'),
            'dateOfEnd'   => new \DateTime('2025-11-10 20:00:00'),
            'type'        => 'hospital',
        ];
        $callableGarde = [
            'id'          => 2,
            'dateOfStart' => new \DateTime('2025-11-11 20:00:00'),
            'dateOfEnd'   => new \DateTime('2025-11-12 08:00:00'),
            'type'        => 'callable',
        ];

        $timesheetRepo = $this->createMock(TimesheetRepository::class);
        $gardeRepo     = $this->createMock(GardeRepository::class);
        $absenceRepo   = $this->createMock(AbsenceRepository::class);

        // Tools::separateTimesheetsByDay and separateGardeByDay must be real for this test
        $tools = $this->createMock(Tools::class);
        $tools->method('separateTimesheetsByDay')->willReturn([]);
        $tools->method('separateGardeByDay')->willReturnCallback(function (array $gardes) {
            // Return one entry per garde so we can count what was passed
            return array_map(fn($g) => [
                'start' => $g['dateOfStart']->format('Y-m-d H:i:s'),
                'end'   => $g['dateOfEnd']->format('Y-m-d H:i:s'),
                'type'  => $g['type'],
            ], $gardes);
        });

        $fetching = new FetchingData($timesheetRepo, $gardeRepo, $absenceRepo, $tools);
        $result   = $fetching->onPlaceDayPeriod([], [$hospitalGarde, $callableGarde]);

        // Only the hospital garde should appear (callable gardes go to col E via CallableGardeMapper)
        $gardeEntries = array_filter($result, fn($e) => ($e['index'] ?? '') === 'garde');
        $this->assertCount(1, $gardeEntries, 'Only hospital gardes must appear in onPlaceDayPeriod output');

        $gardePeriod = array_values($gardeEntries)[0];
        $this->assertStringContainsString('2025-11-10', $gardePeriod['start'],
            'The hospital garde (2025-11-10) must be in the output');
    }

    public function testOnPlaceDayPeriodIgnoresCallableGardes(): void
    {
        $callableGarde = [
            'id'          => 1,
            'dateOfStart' => new \DateTime('2025-11-20 20:00:00'),
            'dateOfEnd'   => new \DateTime('2025-11-21 08:00:00'),
            'type'        => 'callable',
        ];

        $timesheetRepo = $this->createMock(TimesheetRepository::class);
        $gardeRepo     = $this->createMock(GardeRepository::class);
        $absenceRepo   = $this->createMock(AbsenceRepository::class);
        $tools         = $this->createMock(Tools::class);
        $tools->method('separateTimesheetsByDay')->willReturn([]);
        $tools->method('separateGardeByDay')->willReturn([]);

        $fetching = new FetchingData($timesheetRepo, $gardeRepo, $absenceRepo, $tools);
        $result   = $fetching->onPlaceDayPeriod([], [$callableGarde]);

        $this->assertSame([], $result,
            'Callable gardes must NOT appear in onPlaceDayPeriod — they belong in col E via CallableGardeMapper');
    }
}
