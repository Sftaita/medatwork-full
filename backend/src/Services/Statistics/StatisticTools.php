<?php

declare(strict_types=1);

namespace App\Services\Statistics;

use App\Services\Utils\Tools;
use DateTime;
use InvalidArgumentException;

class StatisticTools
{
    public function __construct(
        private readonly Tools $tools,
    ) {
    }

    /**
    * Returns boundary dates for the given month and year
    *
    * @return array
    * - "start": The first day of the month, formatted as "Y-m-d H:i:s"
    * - "end": The last day of the month, formatted as "Y-m-d H:i:s"
    * - "startFromWeek": The first day of the first week of the month, formatted as "Y-m-d H:i:s"
    * - "endOfTheLastWeek": The last day of the last week of the month, formatted as "Y-m-d H:i:s"
    */
    /** @return array<string, string> */
    public function boudariesDates(int $month): array
    {
        if ($month < 1 || $month > 12) {
            throw new \InvalidArgumentException("Month must be between 1 and 12, got {$month}");
        }

        $year  = (int) (new \DateTime())->format('Y');
        $start = new \DateTime(sprintf('%04d-%02d-01 00:00:00', $year, $month));
        $end   = (new \DateTime(sprintf('%04d-%02d-01 +1 month', $year, $month)))->modify('-1 day')->setTime(23, 59, 59);

        $weekStart = (clone $start)->modify('Monday this week');
        $weekEnd = (clone $end)->modify('next Monday');
        $lastDayOfLastWeek = (clone $weekEnd)->modify('-1 day')->setTime(23, 59, 59);

        return [
            'start' => $start->format('Y-m-d H:i:s'),
            'end' => $end->format('Y-m-d H:i:s'),
            'startFromWeek' => $weekStart->format('Y-m-d H:i:s'),
            'endOfTheLastWeek' => $lastDayOfLastWeek->format('Y-m-d H:i:s'),
        ];
    }

    /**
    * Check if the input date is within the specified dates
    *
    * @param string $date - a string representation of a date and time in the format "Y-m-d H:i:s"
    * @param string $startDate - a string representation of the start date in the format "Y-m-d"
    * @param string $endDate - a string representation of the end date in the format "Y-m-d"
    *
    * @return bool - true if the input date is within the specified dates, false otherwise
    */
    public function checkIfDateIsBetween(string $date, string $startDate, string $endDate): bool
    {
        $currentDate = new DateTime($date);
        return $currentDate >= new DateTime($startDate) && $currentDate <= new DateTime($endDate);
    }

    /**
     * @param list<array<string, mixed>> $timesheetPeriods
     * @param list<array<string, mixed>> $gardePeriods
     * @param list<array<string, mixed>> $absencesPeriods
     * @return array<string, mixed>
     */
    public function hoursCounter(array $timesheetPeriods, array $gardePeriods, array $absencesPeriods, string $start, string $end, string $firstDayFirstWeek, string $lastDayLastWeek): array
    {
        $totalBreak           = 0;
        $totalHours           = 0;
        $hardHours            = 0;
        $veryHardHours        = 0;
        $hospitalGardeHoursNb = 0;
        $weeks = $this->tools->getWeeksArray($firstDayFirstWeek, $lastDayLastWeek);

        // 1. Timesheets
        foreach ($timesheetPeriods as $element) {
            $startTime      = date('H:i', strtotime($element['start']));
            $endTime        = date('H:i', strtotime($element['end']));
            $pauseInSeconds = $element['pause'] * 60;
            $totalBreak    += $pauseInSeconds;

            if ($this->checkIfDateIsBetween($element['start'], $start, $end)) {
                $workingTime = $this->tools->timeDiffInSeconds($startTime, $endTime) - $pauseInSeconds;
                [$hoursToAdd, $hardToAdd, $veryHardToAdd] = $this->classifyHours(
                    $startTime,
                    $endTime,
                    $workingTime,
                    $this->tools->isHoliday(strtotime($element['start']))
                );
                $totalHours    += $hoursToAdd;
                $hardHours     += $hardToAdd;
                $veryHardHours += $veryHardToAdd;
            }

            // Weekly count (starts on Monday, may span outside the month)
            if ($this->checkIfDateIsBetween($element['start'], $firstDayFirstWeek, $lastDayLastWeek)) {
                $weekOfYear = $this->tools->getWeekNumber($element['start']);
                $weeks[$weekOfYear] = ($weeks[$weekOfYear] ?? 0)
                    + $this->tools->timeDiffInSeconds($startTime, $endTime) - $pauseInSeconds;
            }
        }

        // 2. Hospital gardes
        foreach ($gardePeriods as $element) {
            if ($element['type'] !== 'hospital') {
                continue;
            }

            $startTime = date('H:i', strtotime($element['start']));
            $endTime   = date('H:i', strtotime($element['end']));

            if ($this->checkIfDateIsBetween($element['start'], $start, $end)) {
                $rawDuration = $this->tools->timeDiffInSeconds($startTime, $endTime);
                [$hoursToAdd, $hardToAdd, $veryHardToAdd] = $this->classifyHours(
                    $startTime,
                    $endTime,
                    $rawDuration,
                    $this->tools->isHoliday(strtotime($element['start']))
                );
                $totalHours           += $hoursToAdd;
                $hardHours            += $hardToAdd;
                $veryHardHours        += $veryHardToAdd;
                $hospitalGardeHoursNb += $rawDuration;
            }

            if ($this->checkIfDateIsBetween($element['start'], $firstDayFirstWeek, $lastDayLastWeek)) {
                $weekOfYear = $this->tools->getWeekNumber($element['start']);
                $weeks[$weekOfYear] = ($weeks[$weekOfYear] ?? 0)
                    + $this->tools->timeDiffInSeconds($startTime, $endTime);
            }
        }

        // 3. Absences
        $monthNbOfAbsences = 0;
        foreach ($absencesPeriods as $absence) {
            $isHoliday    = $this->tools->isHoliday(strtotime($absence['start']));
            $countedHours = ($isHoliday === 0 || $isHoliday === 3) && $absence['type'] !== 'recovery'
                ? (9 * 3600) + (36 * 60)
                : 0;

            if ($this->checkIfDateIsBetween($absence['start'], $start, $end)) {
                $totalHours += $countedHours;
                if ($isHoliday === 0) {
                    $monthNbOfAbsences++;
                }
            }

            if ($this->checkIfDateIsBetween($absence['start'], $firstDayFirstWeek, $lastDayLastWeek)) {
                $weekOfYear = $this->tools->getWeekNumber($absence['start']);
                $weeks[$weekOfYear] = ($weeks[$weekOfYear] ?? 0) + $countedHours;
            }
        }

        // Convert seconds → hours
        foreach ($weeks as &$week) {
            $week = $week / 3600;
        }

        return [
            'break'                => $totalBreak / 3600,
            'totalHours'           => $totalHours / 3600,
            'hardHours'            => $hardHours / 3600,
            'veryHardHours'        => $veryHardHours / 3600,
            'weeks'                => $weeks,
            'hospitalGardeHoursNb' => $hospitalGardeHoursNb / 3600,
            'monthNbOfAbsences'    => $monthNbOfAbsences,
        ];
    }

    /**
     * Classify a work block into (totalHours, hardHours, veryHardHours) in seconds.
     *
     * Rules:
     * - Sunday/holiday (isHoliday=1): all hours are "very hard"
     * - Saturday (isHoliday=2):       all hours are "hard"
     * - Normal day:                   hours before 08:00 or after 20:00 are "hard"
     *
     * @return array{int, int, int}  [totalSeconds, hardSeconds, veryHardSeconds]
     */
    private function classifyHours(string $startTime, string $endTime, int $workingSeconds, int $isHoliday): array
    {
        if ($isHoliday === 1) {
            return [$workingSeconds, 0, $workingSeconds];
        }

        if ($isHoliday === 2) {
            return [$workingSeconds, $workingSeconds, 0];
        }

        // Normal weekday — split around 08:00–20:00 window
        $hard = 0;

        if ($startTime < '08:00') {
            $hard += $this->tools->timeDiffInSeconds($startTime, min($endTime, '08:00'));
        }
        if ($endTime > '20:00') {
            $hard += $this->tools->timeDiffInSeconds(max($startTime, '20:00'), $endTime);
        }

        return [$workingSeconds, $hard, 0];
    }

    /**
     * @param list<array<string, mixed>> $scheduledCalendarPeriods
     * @return array<string, mixed>
     */
    public function scheduledHoursCounter(array $scheduledCalendarPeriods, string $start, string $end, string $firstDayFirstWeek, string $lastDayLastWeek): array
    {
        $totalHours = 0;
        $weeks = $this->tools->getWeeksArray($firstDayFirstWeek, $lastDayLastWeek);

        // Iterate over the scheduled periods
        foreach ($scheduledCalendarPeriods as $period) {
            $startDate = $period['start'];
            $endDate = $period['end'];

            // Calculate duration in seconds
            $duration = $this->tools->timeDiffInSeconds($startDate, $endDate);

            // Check if the period is within the dates range
            if ($this->checkIfDateIsBetween($startDate, $start, $end)) {
                $totalHours += $duration;
            }

            if ($this->checkIfDateIsBetween($startDate, $firstDayFirstWeek, $lastDayLastWeek)) {
                $weekOfYear = $this->tools->getWeekNumber($startDate);

                if (! isset($weeks[$weekOfYear])) {
                    $weeks[$weekOfYear] = 0;
                }
                $weeks[$weekOfYear] += $duration;
            }
        }

        // Convert seconds to hours
        $totalHours = $totalHours / 3600;
        foreach ($weeks as $week => $time) {
            $weeks[$week] = $time / 3600;
        }

        return [
            'totalHours' => $totalHours,
            'weeks' => $weeks,
        ];
    }


    /**
    * Counts the number of hospital shifts between the start and end dates.
    *
    * @param array $shifts An array of shift data.
    * @param string $start The start date in 'Y-m-d H:i:s' format.
    * @param string $end The end date in 'Y-m-d H:i:s' format.
    * @throws InvalidArgumentException if the input format is invalid.
    * @return int The number of hospital shifts within the specified time period.
    */
    /** @param list<array<string, mixed>> $shifts */
    public function countNbOfHospitalGarde(array $shifts, string $start, string $end): int
    {
        if (! strtotime($start) || ! strtotime($end)) {
            throw new InvalidArgumentException('Invalid date format');
        }

        $hospitalGardeNb = 0;

        foreach ($shifts as $shift) {

            $shiftDateStr = $shift['dateOfStart']->format('Y-m-d H:i:s');
            $shiftDate = date_create_from_format('Y-m-d H:i:s', $shiftDateStr);

            if (! $shiftDate) {
                throw new InvalidArgumentException('Invalid date format');
            }

            if (strtotime($shiftDateStr) >= strtotime($start) && strtotime($shiftDateStr) <= strtotime($end)) {

                if ($shift['type'] === 'hospital') {
                    $hospitalGardeNb++;
                }
            }
        };

        return $hospitalGardeNb;
    }

    /**
     * Process the provided array of absences for a year, counting the different types of absences.
     *
     * @param list<\App\Entity\Absence> $array The array of absence objects.
     * @return array<string, int> An array containing the total count of each type of absence for the year.
     */
    /** @param list<\App\Entity\Absence> $array
     *  @return array<string, int>
     */
    public function yearAbsenceProcessing(array $array): array
    {
        // Initialize the data array with zero counts for each type of absence.
        $data = [
            'YearTotalAbsenceDay' => 0,
            'yearLegalLeaves' => 0,
            'yearScientificLeaves' => 0,
            'yearPaternityLeaves' => 0,
            'yearMaternityLeaves' => 0,
            'yearUnpaidLeaves' => 0,
        ];

        // Format the absence array into a more usable form.
        $formatedAbsence = [];
        foreach ($array as $arr) {

            $formatedAbsence[] = [
                'dateOfStart' => $arr->getDateOfStart(),
                'dateOfEnd' => $arr->getDateOfEnd(),
                'type' => $arr->getType()->value,
                'id' => $arr->getId(),
                'yearId' => $arr->getYear()->getId(),
            ];
        }
        // Separate absences by day.
        $absencePeriods = $this->tools->separateAbsenceByDay($formatedAbsence);


        // Iterate through the absence periods and update the counts in the data array.
        foreach ($absencePeriods as $period) {

            // Increment the count for the specific type of absence.
            switch ($period['type']) {
                case 'annualLeave':
                    $data['yearLegalLeaves'] += 1;
                    $data['YearTotalAbsenceDay'] += 1;
                    break;
                case 'scientificLeave':
                    $data['yearScientificLeaves'] += 1;
                    $data['YearTotalAbsenceDay'] += 1;
                    break;
                case 'paternityLeave':
                    $data['yearPaternityLeaves'] += 1;
                    $data['YearTotalAbsenceDay'] += 1;
                    break;
                case 'maternityLeave':
                    $data['yearMaternityLeaves'] += 1;
                    $data['YearTotalAbsenceDay'] += 1;
                    break;
                case 'unpaidLeave':
                    $data['yearUnpaidLeaves'] += 1;
                    $data['YearTotalAbsenceDay'] += 1;
                    break;
            }
        }

        // Return the updated data array.
        return $data;
    }
}
