<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\ExcelGenerator;

use App\Services\ExcelGenerator\SpreadsheetMonthBuilder;
use DateTime;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for SpreadsheetMonthBuilder.
 *
 * Covers:
 * - computeMonthIntervals: correct YYYY-MM keys for a date range
 * - computeMonthIntervals: single-month range
 * - computeMonthIntervals: year-boundary spanning (Nov → Feb)
 * - buildMonthSheets: template sheet is removed after build
 * - buildMonthSheets: correct number of sheets created
 * - buildMonthSheets: returned array matches created sheet names
 * - buildMonthSheets: resident info written to D3–D7
 * - buildMonthSheets: B-column dates written in dd-mm-YYYY format
 */
final class SpreadsheetMonthBuilderTest extends TestCase
{
    private SpreadsheetMonthBuilder $builder;

    /** Default resident info block */
    private array $residentInfo = [
        'fullName'          => 'Dupont Jean',
        'speciality'        => 'Médecine interne',
        'serviceSpeciality' => 'Cardiologie',
        'optingOut'         => 'Non',
        'yearOfFormation'   => 3,
    ];

    protected function setUp(): void
    {
        $this->builder = new SpreadsheetMonthBuilder();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /** Build a Spreadsheet with a single blank template sheet (index 0). */
    private function makeTemplateSpreadsheet(): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        // PhpSpreadsheet starts with one sheet — that's our template
        return $spreadsheet;
    }

    // ── computeMonthIntervals (via buildMonthSheets) ──────────────────────────

    public function testSingleMonthRangeReturnsSingleKey(): void
    {
        $spreadsheet = $this->makeTemplateSpreadsheet();
        $keys = $this->builder->buildMonthSheets(
            $spreadsheet,
            new DateTime('2025-10-01'),
            new DateTime('2025-10-31'),
            $this->residentInfo,
        );

        $this->assertSame(['2025-10'], $keys);
    }

    public function testThreeMonthRangeReturnsThreeKeys(): void
    {
        $spreadsheet = $this->makeTemplateSpreadsheet();
        $keys = $this->builder->buildMonthSheets(
            $spreadsheet,
            new DateTime('2025-11-01'),
            new DateTime('2026-01-31'),
            $this->residentInfo,
        );

        $this->assertSame(['2025-11', '2025-12', '2026-01'], $keys);
    }

    public function testYearBoundaryNovToFebReturnsFourKeys(): void
    {
        $spreadsheet = $this->makeTemplateSpreadsheet();
        $keys = $this->builder->buildMonthSheets(
            $spreadsheet,
            new DateTime('2025-11-01'),
            new DateTime('2026-02-28'),
            $this->residentInfo,
        );

        $this->assertSame(['2025-11', '2025-12', '2026-01', '2026-02'], $keys);
    }

    public function testStartMidMonthStillIncludesThatMonth(): void
    {
        $spreadsheet = $this->makeTemplateSpreadsheet();
        $keys = $this->builder->buildMonthSheets(
            $spreadsheet,
            new DateTime('2025-10-15'),
            new DateTime('2025-11-30'),
            $this->residentInfo,
        );

        // computeMonthIntervals snaps start to first of month
        $this->assertContains('2025-10', $keys);
        $this->assertContains('2025-11', $keys);
    }

    // ── template sheet removal ────────────────────────────────────────────────

    public function testTemplateSheetIsRemovedAfterBuild(): void
    {
        $spreadsheet = $this->makeTemplateSpreadsheet();
        $this->builder->buildMonthSheets(
            $spreadsheet,
            new DateTime('2025-10-01'),
            new DateTime('2025-10-31'),
            $this->residentInfo,
        );

        // Sheet count must equal number of months (template removed)
        $this->assertCount(1, $spreadsheet->getAllSheets());
        $this->assertSame('2025-10', $spreadsheet->getSheet(0)->getTitle());
    }

    public function testThreeMonthBuildLeavesExactlyThreeSheets(): void
    {
        $spreadsheet = $this->makeTemplateSpreadsheet();
        $this->builder->buildMonthSheets(
            $spreadsheet,
            new DateTime('2025-11-01'),
            new DateTime('2026-01-31'),
            $this->residentInfo,
        );

        $this->assertCount(3, $spreadsheet->getAllSheets());
    }

    // ── sheet names match returned keys ──────────────────────────────────────

    public function testReturnedKeysMatchSheetNames(): void
    {
        $spreadsheet = $this->makeTemplateSpreadsheet();
        $keys = $this->builder->buildMonthSheets(
            $spreadsheet,
            new DateTime('2025-11-01'),
            new DateTime('2026-01-31'),
            $this->residentInfo,
        );

        $sheetNames = array_map(fn (Worksheet $s) => $s->getTitle(), $spreadsheet->getAllSheets());

        foreach ($keys as $key) {
            $this->assertContains($key, $sheetNames);
        }
    }

    // ── resident info written to D3–D7 ───────────────────────────────────────

    public function testResidentFullNameWrittenToD3(): void
    {
        $spreadsheet = $this->makeTemplateSpreadsheet();
        $this->builder->buildMonthSheets(
            $spreadsheet,
            new DateTime('2025-10-01'),
            new DateTime('2025-10-31'),
            $this->residentInfo,
        );

        $sheet = $spreadsheet->getSheetByName('2025-10');
        $this->assertSame('Dupont Jean', $sheet->getCell('D3')->getValue());
    }

    public function testResidentSpecialityWrittenToD4(): void
    {
        $spreadsheet = $this->makeTemplateSpreadsheet();
        $this->builder->buildMonthSheets(
            $spreadsheet,
            new DateTime('2025-10-01'),
            new DateTime('2025-10-31'),
            $this->residentInfo,
        );

        $this->assertSame('Médecine interne', $spreadsheet->getSheetByName('2025-10')->getCell('D4')->getValue());
    }

    public function testResidentOptingOutWrittenToD6(): void
    {
        $spreadsheet = $this->makeTemplateSpreadsheet();
        $this->builder->buildMonthSheets(
            $spreadsheet,
            new DateTime('2025-10-01'),
            new DateTime('2025-10-31'),
            $this->residentInfo,
        );

        $this->assertSame('Non', $spreadsheet->getSheetByName('2025-10')->getCell('D6')->getValue());
    }

    public function testResidentYearOfFormationWrittenToD7(): void
    {
        $spreadsheet = $this->makeTemplateSpreadsheet();
        $this->builder->buildMonthSheets(
            $spreadsheet,
            new DateTime('2025-10-01'),
            new DateTime('2025-10-31'),
            $this->residentInfo,
        );

        $this->assertSame(3, $spreadsheet->getSheetByName('2025-10')->getCell('D7')->getValue());
    }

    // ── calendar rows written ─────────────────────────────────────────────────

    public function testFirstDayOfOctoberWrittenToB18(): void
    {
        $spreadsheet = $this->makeTemplateSpreadsheet();
        $this->builder->buildMonthSheets(
            $spreadsheet,
            new DateTime('2025-10-01'),
            new DateTime('2025-10-31'),
            $this->residentInfo,
        );

        $value = $spreadsheet->getSheetByName('2025-10')->getCell('B18')->getValue();
        $this->assertSame('01-10-2025', $value);
    }

    public function testLastDayOfOctoberWrittenToCorrectRow(): void
    {
        $spreadsheet = $this->makeTemplateSpreadsheet();
        $this->builder->buildMonthSheets(
            $spreadsheet,
            new DateTime('2025-10-01'),
            new DateTime('2025-10-31'),
            $this->residentInfo,
        );

        // October has 31 days → last row = 18 + 30 = 48
        $value = $spreadsheet->getSheetByName('2025-10')->getCell('B48')->getValue();
        $this->assertSame('31-10-2025', $value);
    }

    public function testWeekLabelWrittenToColumnA(): void
    {
        $spreadsheet = $this->makeTemplateSpreadsheet();
        $this->builder->buildMonthSheets(
            $spreadsheet,
            new DateTime('2025-10-01'),
            new DateTime('2025-10-31'),
            $this->residentInfo,
        );

        // Week cell in column A must start with 'Sem '
        $sheet = $spreadsheet->getSheetByName('2025-10');
        $aValue = (string) $sheet->getCell('A18')->getValue();
        $this->assertStringStartsWith('Sem ', $aValue);
    }
}
