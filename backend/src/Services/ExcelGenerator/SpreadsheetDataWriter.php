<?php

declare(strict_types=1);

namespace App\Services\ExcelGenerator;

use App\Services\Statistics\StatisticTools;
use App\Services\Utils\Tools;
use DateTime;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

/**
 * Writes computed data into the monthly sheets of the Excel timesheet.
 *
 * Four independent write phases, each consuming a different data set:
 *  1. Monthly hour totals  → cell D15
 *  2. On-place periods     → columns C / D / F / H (timesheets + hospital gardes)
 *  3. Callable gardes      → column E
 *  4. Absences             → column G
 *
 * All row offsets use the convention: row = 17 + day-of-month.
 */
final class SpreadsheetDataWriter
{
    /** Spreadsheet row of the first calendar day (day 1 = row 18). */
    private const DAY_ROW_OFFSET = 17;

    public function __construct(
        private readonly StatisticTools $statisticTools,
        private readonly Tools $tools,
    ) {
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Writes the monthly total-hours cell (D15) for every month.
     *
     * @param array<string, array<string, list<array<string, mixed>>>> $totalMonthHours
     *   Keyed by 'YYYY-MM', as returned by Tools::groupByMonth().
     *   Each value has keys 'timesheets', 'gardes', 'absences'.
     */
    public function writeMonthlyTotals(Spreadsheet $spreadsheet, array $totalMonthHours): void
    {
        foreach ($totalMonthHours as $monthKey => $hours) {
            $dates   = $this->statisticTools->boudariesDates(
                (int) (new DateTime($monthKey . '-01'))->format('n')
            );
            $counter = $this->statisticTools->hoursCounter(
                $hours['timesheets'],
                $hours['gardes'],
                $hours['absences'],
                $dates['start'],
                $dates['end'],
                $dates['startFromWeek'],
                $dates['endOfTheLastWeek'],
            );

            $sheet = $spreadsheet->getSheetByName($monthKey);
            if ($sheet === null) {
                continue;
            }
            $sheet->setCellValue('D15', (int) ceil($counter['totalHours']));
            $sheet->getStyle('B15')->applyFromArray(ExcelStyles::HIGHLIGHT);
            $sheet->getStyle('D15')->applyFromArray(ExcelStyles::HIGHLIGHT);
        }
    }

    /**
     * Writes on-place time intervals (timesheets + hospital gardes) into the sheet.
     *
     * @param array<string, array{date: string, interval: ?string, calledInterval: ?string, pause: ?int, scientific: ?int}> $output
     *   As returned by FetchingData::createStandardizedTable().
     */
    public function writeOnPlacePeriods(Spreadsheet $spreadsheet, array $output): void
    {
        foreach ($output as $entry) {
            $date  = new DateTime($entry['date']);
            $sheet = $spreadsheet->getSheetByName($date->format('Y-m'));
            if ($sheet === null) {
                continue;
            }
            $row   = self::DAY_ROW_OFFSET + (int) $date->format('j');

            if ($entry['interval'] !== null) {
                $sheet->setCellValue('C' . $row, $entry['interval']);
            }

            if (! empty($entry['calledInterval'])) {
                $sheet->setCellValue('F' . $row, $entry['calledInterval']);
            }

            if (! empty($entry['pause'])) {
                $sheet->setCellValue('D' . $row, $entry['pause']);
            }

            if (! empty($entry['scientific'])) {
                $sheet->setCellValue('H' . $row, $this->tools->convert_to_hours($entry['scientific']));
            }
        }
    }

    /**
     * Writes callable garde intervals into column E.
     *
     * @param array<string, array{date: string, interval: string}> $workedGardes
     *   As returned by CallableGardeMapper::map().
     */
    public function writeCallableGardes(Spreadsheet $spreadsheet, array $workedGardes): void
    {
        foreach ($workedGardes as $entry) {
            $date  = new DateTime($entry['date']);
            $sheet = $spreadsheet->getSheetByName($date->format('Y-m'));
            if ($sheet === null) {
                continue;
            }
            $row   = self::DAY_ROW_OFFSET + (int) $date->format('j');

            $sheet->setCellValue('E' . $row, $entry['interval']);
        }
    }

    /**
     * Writes absence codes (column G) for every absence day.
     *
     * Single-day absences (dateOfEnd === null) write one cell.
     * Multi-day absences loop over every date in the range.
     *
     * @param list<array{dateOfStart: \DateTimeInterface, dateOfEnd: \DateTimeInterface|null, type: string}> $absences
     */
    public function writeAbsences(Spreadsheet $spreadsheet, array $absences): void
    {
        foreach ($absences as $absence) {
            $code = ExcelStyles::LEAVE_CODES[$absence['type']] ?? '';
            $days = $this->expandAbsenceDays($absence);

            foreach ($days as $date) {
                $sheet = $spreadsheet->getSheetByName($date->format('Y-m'));
                if ($sheet === null) {
                    continue;
                }
                $row   = self::DAY_ROW_OFFSET + (int) $date->format('j');
                $sheet->setCellValue('G' . $row, $code);
            }
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Returns an iterator of DateTime objects covering the absence period.
     * For single-day absences (dateOfEnd === null) returns only the start date.
     *
     * @param array{dateOfStart: \DateTimeInterface, dateOfEnd: \DateTimeInterface|null, type: string} $absence
     * @return list<\DateTime>
     */
    private function expandAbsenceDays(array $absence): array
    {
        $start = \DateTime::createFromInterface($absence['dateOfStart']);

        if ($absence['dateOfEnd'] === null) {
            return [$start];
        }

        $end = $absence['dateOfEnd'];
        $days = [];
        for ($day = clone $start; $day <= $end; $day->modify('+1 day')) {
            $days[] = clone $day;
        }

        return $days;
    }
}
