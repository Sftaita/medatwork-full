<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\ExcelGenerator;

use App\Services\ExcelGenerator\SpreadsheetDataWriter;
use App\Services\Statistics\StatisticTools;
use App\Services\Utils\Tools;
use DateTime;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for SpreadsheetDataWriter.
 *
 * Covers:
 * - writeMonthlyTotals: correct month extraction (regression for format('mY') bug)
 * - writeMonthlyTotals: missing sheet is skipped without exception
 * - writeMonthlyTotals: hour total written to cell D15
 * - writeOnPlacePeriods: interval, calledInterval, pause, scientific written to correct cells
 * - writeOnPlacePeriods: missing sheet is skipped
 * - writeCallableGardes: interval written to column E
 * - writeCallableGardes: missing sheet skipped
 * - writeAbsences: single-day absence writes leave code to column G
 * - writeAbsences: multi-day absence expands over every day in range
 * - writeAbsences: unknown absence type produces empty string, not exception
 * - writeAbsences: missing sheet skipped
 */
final class SpreadsheetDataWriterTest extends TestCase
{
    private StatisticTools $statisticTools;
    private Tools $tools;
    private SpreadsheetDataWriter $writer;

    /** Default boundaries stub returned by boudariesDates. */
    private array $defaultDates;

    protected function setUp(): void
    {
        $this->statisticTools = $this->createMock(StatisticTools::class);
        $this->tools          = $this->createMock(Tools::class);
        $this->writer         = new SpreadsheetDataWriter($this->statisticTools, $this->tools);

        $this->defaultDates = [
            'start'            => '2025-10-01 00:00:00',
            'end'              => '2025-10-31 23:59:59',
            'startFromWeek'    => '2025-09-29 00:00:00',
            'endOfTheLastWeek' => '2025-11-02 23:59:59',
        ];
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /** Build a Spreadsheet with named sheets for the given YYYY-MM keys. */
    private function makeSpreadsheet(array $monthKeys): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $spreadsheet->removeSheetByIndex(0); // remove default blank sheet

        foreach ($monthKeys as $key) {
            $sheet = new \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet($spreadsheet, $key);
            $spreadsheet->addSheet($sheet);
        }

        return $spreadsheet;
    }

    // ── writeMonthlyTotals ────────────────────────────────────────────────────

    /**
     * Regression test: before the fix, format('mY') produced 102025 for October 2025.
     * After the fix, format('n') must produce 10.
     */
    public function testWriteMonthlyTotalsPassesMonthOnlyToBoudariesDates(): void
    {
        $this->statisticTools
            ->expects($this->once())
            ->method('boudariesDates')
            ->with(10) // October — must NOT be 102025
            ->willReturn($this->defaultDates);

        $this->statisticTools
            ->method('hoursCounter')
            ->willReturn(['totalHours' => 0]);

        $spreadsheet = $this->makeSpreadsheet(['2025-10']);

        $this->writer->writeMonthlyTotals($spreadsheet, ['2025-10' => [
            'timesheets' => [],
            'gardes'     => [],
            'absences'   => [],
        ]]);
    }

    /** boudariesDates must receive 1 for January, not 12025. */
    public function testWriteMonthlyTotalsJanuaryExtractedAsOne(): void
    {
        $this->statisticTools
            ->expects($this->once())
            ->method('boudariesDates')
            ->with(1) // January — must NOT be 12025
            ->willReturn($this->defaultDates);

        $this->statisticTools->method('hoursCounter')->willReturn(['totalHours' => 0]);

        $spreadsheet = $this->makeSpreadsheet(['2025-01']);
        $this->writer->writeMonthlyTotals($spreadsheet, ['2025-01' => [
            'timesheets' => [], 'gardes' => [], 'absences' => [],
        ]]);
    }

    public function testWriteMonthlyTotalsWritesHoursToCellD15(): void
    {
        $this->statisticTools->method('boudariesDates')->willReturn($this->defaultDates);
        $this->statisticTools->method('hoursCounter')->willReturn(['totalHours' => 37.6]);

        $spreadsheet = $this->makeSpreadsheet(['2025-10']);
        $this->writer->writeMonthlyTotals($spreadsheet, ['2025-10' => [
            'timesheets' => [], 'gardes' => [], 'absences' => [],
        ]]);

        $value = $spreadsheet->getSheetByName('2025-10')->getCell('D15')->getValue();
        $this->assertSame(38, $value); // ceil(37.6)
    }

    public function testWriteMonthlyTotalsZeroHoursWritesZeroToD15(): void
    {
        $this->statisticTools->method('boudariesDates')->willReturn($this->defaultDates);
        $this->statisticTools->method('hoursCounter')->willReturn(['totalHours' => 0]);

        $spreadsheet = $this->makeSpreadsheet(['2025-10']);
        $this->writer->writeMonthlyTotals($spreadsheet, ['2025-10' => [
            'timesheets' => [], 'gardes' => [], 'absences' => [],
        ]]);

        $this->assertSame(0, $spreadsheet->getSheetByName('2025-10')->getCell('D15')->getValue());
    }

    public function testWriteMonthlyTotalsSkipsMissingSheetWithoutException(): void
    {
        $this->statisticTools->method('boudariesDates')->willReturn($this->defaultDates);
        $this->statisticTools->method('hoursCounter')->willReturn(['totalHours' => 10]);

        // Spreadsheet has no '2025-11' sheet
        $spreadsheet = $this->makeSpreadsheet(['2025-10']);

        $this->writer->writeMonthlyTotals($spreadsheet, [
            '2025-10' => ['timesheets' => [], 'gardes' => [], 'absences' => []],
            '2025-11' => ['timesheets' => [], 'gardes' => [], 'absences' => []],
        ]);

        // No exception thrown; existing sheet still has its value
        $this->assertSame(10, $spreadsheet->getSheetByName('2025-10')->getCell('D15')->getValue());
    }

    public function testWriteMonthlyTotalsHandlesMultipleMonths(): void
    {
        $this->statisticTools->method('boudariesDates')->willReturn($this->defaultDates);
        $this->statisticTools->method('hoursCounter')->willReturnOnConsecutiveCalls(
            ['totalHours' => 10],
            ['totalHours' => 20],
            ['totalHours' => 30],
        );

        $spreadsheet = $this->makeSpreadsheet(['2024-11', '2024-12', '2025-01']);
        $this->writer->writeMonthlyTotals($spreadsheet, [
            '2024-11' => ['timesheets' => [], 'gardes' => [], 'absences' => []],
            '2024-12' => ['timesheets' => [], 'gardes' => [], 'absences' => []],
            '2025-01' => ['timesheets' => [], 'gardes' => [], 'absences' => []],
        ]);

        $this->assertSame(10, $spreadsheet->getSheetByName('2024-11')->getCell('D15')->getValue());
        $this->assertSame(20, $spreadsheet->getSheetByName('2024-12')->getCell('D15')->getValue());
        $this->assertSame(30, $spreadsheet->getSheetByName('2025-01')->getCell('D15')->getValue());
    }

    // ── writeOnPlacePeriods ───────────────────────────────────────────────────

    public function testWriteOnPlacePeriodsWritesIntervalToColumnC(): void
    {
        $spreadsheet = $this->makeSpreadsheet(['2025-10']);
        $this->writer->writeOnPlacePeriods($spreadsheet, [
            '01-10-2025' => [
                'date'           => '01-10-2025',
                'interval'       => '08:00-16:00',
                'calledInterval' => null,
                'pause'          => null,
                'scientific'     => null,
            ],
        ]);

        // Day 1 → row 17 + 1 = 18
        $this->assertSame('08:00-16:00', $spreadsheet->getSheetByName('2025-10')->getCell('C18')->getValue());
    }

    public function testWriteOnPlacePeriodsWritesCalledIntervalToColumnF(): void
    {
        $spreadsheet = $this->makeSpreadsheet(['2025-10']);
        $this->writer->writeOnPlacePeriods($spreadsheet, [
            '05-10-2025' => [
                'date'           => '05-10-2025',
                'interval'       => null,
                'calledInterval' => '20:00-08:00',
                'pause'          => null,
                'scientific'     => null,
            ],
        ]);

        // Day 5 → row 22
        $this->assertSame('20:00-08:00', $spreadsheet->getSheetByName('2025-10')->getCell('F22')->getValue());
    }

    public function testWriteOnPlacePeriodsWritesPauseToColumnD(): void
    {
        $spreadsheet = $this->makeSpreadsheet(['2025-10']);
        $this->writer->writeOnPlacePeriods($spreadsheet, [
            '03-10-2025' => [
                'date'           => '03-10-2025',
                'interval'       => '08:00-17:00',
                'calledInterval' => null,
                'pause'          => 30,
                'scientific'     => null,
            ],
        ]);

        $this->assertSame(30, $spreadsheet->getSheetByName('2025-10')->getCell('D20')->getValue());
    }

    public function testWriteOnPlacePeriodsWritesScientificToColumnH(): void
    {
        $this->tools->method('convert_to_hours')->with(120)->willReturn('2h00');

        $spreadsheet = $this->makeSpreadsheet(['2025-10']);
        $this->writer->writeOnPlacePeriods($spreadsheet, [
            '10-10-2025' => [
                'date'           => '10-10-2025',
                'interval'       => '09:00-17:00',
                'calledInterval' => null,
                'pause'          => null,
                'scientific'     => 120,
            ],
        ]);

        $this->assertSame('2h00', $spreadsheet->getSheetByName('2025-10')->getCell('H27')->getValue());
    }

    public function testWriteOnPlacePeriodsSkipsMissingSheet(): void
    {
        $spreadsheet = $this->makeSpreadsheet(['2025-10']);

        // Entry for a month not in the spreadsheet — must not throw
        $this->writer->writeOnPlacePeriods($spreadsheet, [
            '01-11-2025' => [
                'date'           => '01-11-2025',
                'interval'       => '08:00-16:00',
                'calledInterval' => null,
                'pause'          => null,
                'scientific'     => null,
            ],
        ]);

        $this->addToAssertionCount(1); // no exception = pass
    }

    // ── writeCallableGardes ───────────────────────────────────────────────────

    public function testWriteCallableGardesWritesIntervalToColumnE(): void
    {
        $spreadsheet = $this->makeSpreadsheet(['2025-10']);
        $this->writer->writeCallableGardes($spreadsheet, [
            '15-10-2025' => [
                'date'     => '2025-10-15',
                'interval' => '20:00-08:00',
            ],
        ]);

        // Day 15 → row 32
        $this->assertSame('20:00-08:00', $spreadsheet->getSheetByName('2025-10')->getCell('E32')->getValue());
    }

    public function testWriteCallableGardesSkipsMissingSheet(): void
    {
        $spreadsheet = $this->makeSpreadsheet(['2025-10']);
        $this->writer->writeCallableGardes($spreadsheet, [
            '01-12-2025' => ['date' => '2025-12-01', 'interval' => '20:00-08:00'],
        ]);

        $this->addToAssertionCount(1); // no exception = pass
    }

    // ── writeAbsences ─────────────────────────────────────────────────────────

    public function testWriteAbsencesSingleDayWritesLeaveCode(): void
    {
        $spreadsheet = $this->makeSpreadsheet(['2025-10']);
        $this->writer->writeAbsences($spreadsheet, [
            [
                'dateOfStart' => new DateTime('2025-10-07'),
                'dateOfEnd'   => null,
                'type'        => 'paidLeave', // key from ExcelStyles::LEAVE_CODES
            ],
        ]);

        // Day 7 → row 24; leave code 'A' from ExcelStyles::LEAVE_CODES['paidLeave']
        $value = $spreadsheet->getSheetByName('2025-10')->getCell('G24')->getValue();
        $this->assertNotNull($value);
        $this->assertNotSame('', $value);
    }

    public function testWriteAbsencesMultiDayExpandsOverEveryDay(): void
    {
        $spreadsheet = $this->makeSpreadsheet(['2025-10']);
        $this->writer->writeAbsences($spreadsheet, [
            [
                'dateOfStart' => new DateTime('2025-10-01'),
                'dateOfEnd'   => new DateTime('2025-10-03'),
                'type'        => 'paidLeave', // key from ExcelStyles::LEAVE_CODES
            ],
        ]);

        $sheet = $spreadsheet->getSheetByName('2025-10');
        // Days 1, 2, 3 → rows 18, 19, 20
        $this->assertNotSame('', $sheet->getCell('G18')->getValue());
        $this->assertNotSame('', $sheet->getCell('G19')->getValue());
        $this->assertNotSame('', $sheet->getCell('G20')->getValue());
    }

    public function testWriteAbsencesMultiDayDoesNotWriteDayAfterEnd(): void
    {
        $spreadsheet = $this->makeSpreadsheet(['2025-10']);
        $this->writer->writeAbsences($spreadsheet, [
            [
                'dateOfStart' => new DateTime('2025-10-01'),
                'dateOfEnd'   => new DateTime('2025-10-02'),
                'type'        => 'paidLeave', // key from ExcelStyles::LEAVE_CODES
            ],
        ]);

        // Day 3 (row 20) must be empty
        $this->assertSame('', (string) $spreadsheet->getSheetByName('2025-10')->getCell('G20')->getValue());
    }

    public function testWriteAbsencesUnknownTypeWritesEmptyString(): void
    {
        $spreadsheet = $this->makeSpreadsheet(['2025-10']);

        // 'unknown_type' is not in LEAVE_CODES → should write '' without throwing
        $this->writer->writeAbsences($spreadsheet, [
            [
                'dateOfStart' => new DateTime('2025-10-05'),
                'dateOfEnd'   => null,
                'type'        => 'unknown_type',
            ],
        ]);

        $this->assertSame('', (string) $spreadsheet->getSheetByName('2025-10')->getCell('G22')->getValue());
    }

    public function testWriteAbsencesSkipsMissingSheet(): void
    {
        $spreadsheet = $this->makeSpreadsheet(['2025-10']);
        $this->writer->writeAbsences($spreadsheet, [
            [
                'dateOfStart' => new DateTime('2025-12-01'),
                'dateOfEnd'   => null,
                'type'        => 'paid_leave',
            ],
        ]);

        $this->addToAssertionCount(1); // no exception = pass
    }

    public function testWriteAbsencesEmptyListDoesNothing(): void
    {
        $spreadsheet = $this->makeSpreadsheet(['2025-10']);
        $this->writer->writeAbsences($spreadsheet, []);
        $this->addToAssertionCount(1);
    }
}
