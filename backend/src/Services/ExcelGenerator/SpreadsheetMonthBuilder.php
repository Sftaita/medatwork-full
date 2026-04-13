<?php

declare(strict_types=1);

namespace App\Services\ExcelGenerator;

use DateInterval;
use DatePeriod;
use DateTime;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Builds the monthly sheet structure of the Excel timesheet export.
 *
 * For each month in the year's date range:
 *  - Clones the template sheet (index 0)
 *  - Inserts one row per calendar day starting at row 18
 *  - Merges week-number cells in column A
 *  - Highlights weekend rows
 *  - Writes the resident identity block (D3–D7)
 *
 * After all month sheets are created the template sheet is removed.
 *
 * Returns the ordered list of 'YYYY-MM' keys that were created so callers can
 * iterate over them for data-writing phases.
 */
final class SpreadsheetMonthBuilder
{
    private const FIRST_DATA_ROW = 18;

    /**
     * Build one sheet per month and return the 'YYYY-MM' key list.
     *
     * @param array{
     *     fullName: string,
     *     speciality: string,
     *     serviceSpeciality: string,
     *     optingOut: string,
     *     yearOfFormation: int,
     * } $residentInfo
     *
     * @return array<int, string>  e.g. ['2025-11', '2025-12', '2026-01', …]
     */
    public function buildMonthSheets(
        Spreadsheet $spreadsheet,
        \DateTimeInterface $yearStart,
        \DateTimeInterface $yearEnd,
        array $residentInfo,
    ): array {
        $monthIntervals = $this->computeMonthIntervals($yearStart, $yearEnd);

        foreach ($monthIntervals as $currentMonth) {
            $cloned = clone $spreadsheet->getSheet(0);
            $cloned->setTitle($currentMonth);
            $spreadsheet->addSheet($cloned);

            $sheet = $spreadsheet->getSheetByName($currentMonth);
            $this->populateDays($sheet, $currentMonth);
            $this->writeResidentInfo($sheet, $residentInfo);
        }

        // Remove the blank template sheet that was at index 0
        $spreadsheet->removeSheetByIndex(
            $spreadsheet->getIndex($spreadsheet->getSheet(0))
        );

        return $monthIntervals;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Returns ordered 'YYYY-MM' strings for every month between start and end.
     */
    /** @return array<int, string> */
    private function computeMonthIntervals(\DateTimeInterface $yearStart, \DateTimeInterface $yearEnd): array
    {
        $start  = DateTime::createFromInterface($yearStart)->modify('first day of this month');
        $end    = DateTime::createFromInterface($yearEnd)->modify('first day of next month');
        $period = new DatePeriod($start, DateInterval::createFromDateString('1 month'), $end);

        return array_map(fn (DateTime $dt) => $dt->format('Y-m'), iterator_to_array($period));
    }

    /**
     * Inserts one row per day of $currentMonth, sets dates in column B,
     * merges week-number cells in column A, and highlights weekend rows.
     */
    private function populateDays(Worksheet $sheet, string $currentMonth): void
    {
        $firstDay   = (new DateTime($currentMonth . '-01'))->modify('first day of this month');
        $lastDay    = (new DateTime($currentMonth . '-01'))->modify('last day of this month');
        $weekNumber = $firstDay->format('W');
        $startWeekRow = self::FIRST_DATA_ROW;
        $endWeekRow   = self::FIRST_DATA_ROW;
        $row          = self::FIRST_DATA_ROW;

        for ($day = clone $firstDay; $day <= $lastDay; $day->modify('+1 day')) {
            $sheet->setCellValue('B' . $row, $day->format('d-m-Y'));

            $week = $day->format('W');

            if ($week !== $weekNumber) {
                $this->mergeOrSetWeekCell($sheet, $startWeekRow, $endWeekRow, $weekNumber);
                $startWeekRow = $endWeekRow;
                $weekNumber   = $week;
            }

            if ($day == $lastDay) {
                $this->mergeOrSetWeekCellFull($sheet, $startWeekRow, $endWeekRow, $week);
            }

            $endWeekRow++;

            $dow = (int) $day->format('w');
            $isWeekend = ($dow === 0 || $dow === 6);

            if ($isWeekend) {
                $sheet->getStyle('B' . $row)->applyFromArray(ExcelStyles::HIGHLIGHT);
            }

            $sheet->insertNewRowBefore($row + 1, 1);
            $row++;

            if ($isWeekend) {
                $sheet->getStyle('B' . $row)->applyFromArray(ExcelStyles::RESET);
            }
        }

        $sheet->removeRow($row, 1);
        $sheet->getStyle('B1')->applyFromArray(ExcelStyles::HIGHLIGHT);
        $sheet->getStyle('B9')->applyFromArray(ExcelStyles::HIGHLIGHT);
    }

    /**
     * Merges column-A cells for a completed week (week change detected mid-month).
     */
    private function mergeOrSetWeekCell(Worksheet $sheet, int $startRow, int $endRow, string $weekNumber): void
    {
        $label = 'Sem ' . $weekNumber;

        if ($startRow !== $endRow) {
            $sheet->mergeCells('A' . $startRow . ':A' . ($endRow - 1))
                  ->setCellValue('A' . $startRow, $label);
        } else {
            $sheet->setCellValue('A' . $startRow, $label);
        }
    }

    /**
     * Merges column-A cells for the last week of the month (last day reached).
     */
    private function mergeOrSetWeekCellFull(Worksheet $sheet, int $startRow, int $endRow, string $weekNumber): void
    {
        $sheet->mergeCells('A' . $startRow . ':A' . $endRow)
              ->setCellValue('A' . $startRow, 'Sem ' . $weekNumber);
    }

    /**
     * Writes the resident identity block into cells D3–D7 of the given sheet.
     */
    /** @param array<string, mixed> $info */
    private function writeResidentInfo(Worksheet $sheet, array $info): void
    {
        $sheet->setCellValue('D3', $info['fullName'])
              ->setCellValue('D4', $info['speciality'])
              ->setCellValue('D5', $info['serviceSpeciality'])
              ->setCellValue('D6', $info['optingOut'])
              ->setCellValue('D7', $info['yearOfFormation']);
    }
}
