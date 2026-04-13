<?php

declare(strict_types=1);

namespace App\Services\ManagerMonthValidation;

use App\Services\Utils\Tools;
use DateInterval;
use DatePeriod;
use DateTime;

class WeeklyHoursChecker
{
    public function __construct(
        private readonly Tools $tools,
    ) {
    }

    /**
     * Calculates the worked hours for each week of a given period
     *
     * @param list<array<string, mixed>> $timesheetPeriods The timesheet periods for which the worked hours should be calculated
     * @param list<array<string, mixed>> $gardesPeriods The guard periods for which the worked hours should be calculated
     * @param list<array<string, mixed>> $absencesPeriods The absence periods for which the counted hours should be calculated
     * @param string $startOfLegalInterval The start date of the legal interval for which the hours should be calculated
     * @param string $endOfLegalInterval The end date of the legal interval for which the hours should be calculated
     *
     * @return array<int, float|int> An array with the worked hours for each week of the given period
     */
    public function hoursCounter(array $timesheetPeriods, array $gardesPeriods, array $absencesPeriods, string $startOfLegalInterval, string $endOfLegalInterval): array
    {
        // 1. Create array with every weeks numbers as key
        $startOfPeriod = new DateTime($startOfLegalInterval);
        $endOfPeriod = new DateTime($endOfLegalInterval);
        $interval = DateInterval::createFromDateString('1 week');
        $period   = new DatePeriod($startOfPeriod, $interval, $endOfPeriod);

        $weeks = [];
        foreach ($period as $dt) {
            $weeks[intval($dt->format('W'))] = 0;
        }

        // 2. Count the worked time for each timesheet period
        foreach ($timesheetPeriods as $timesheetPeriod) {
            // Check if the timesheet period is within the legal interval
            $startDate = new DateTime($timesheetPeriod['start']);
            $endDate = new DateTime($timesheetPeriod['end']);

            if ($startDate >= $startOfPeriod && $endDate <= $endOfPeriod) {
                // Calculate the worked time in seconds
                $startTime = new DateTime($timesheetPeriod['start']);
                $startTime = $startTime->format('H:i');
                $endTime = new DateTime($timesheetPeriod['end']);
                $endTime = $endTime->format('H:i');
                $workedTimeInSeconds = $this->tools->timeDiffInSeconds($startTime, $endTime) - ($timesheetPeriod['pause'] * 60);

                // Find the week number
                $weekOfMonth = intval($startDate->format('W'));

                // Add the worked time to the correct week in the $weeks array
                $weeks[$weekOfMonth] += ($workedTimeInSeconds);
            }
        }



        foreach ($gardesPeriods as $element) {

            if (strtotime($element['start']) >= strtotime($startOfLegalInterval) && strtotime($element['end']) <= strtotime($endOfLegalInterval)) {
                if ($element['type'] === 'hospital') {
                    // Count in seconde
                    $startTime =  date('H:i', strtotime($element['start']));
                    $endTime =  date('H:i', strtotime($element['end']));
                    $hours = $this->tools->timeDiffInSeconds($startTime, $endTime);

                    // Find week number
                    $date = new DateTime($element['start']);
                    $weekOfMonth = intval($date->format('W'));

                    // Add time to the correct week in Weeks array.
                    $weeks[$weekOfMonth] =  $weeks[$weekOfMonth] + $hours;
                }
            }
        }


        // 3. Working on absences:
        foreach ($absencesPeriods as $absencesPeriod) {
            // Check if the absence period is within the legal interval
            $startDate = new DateTime($absencesPeriod['start']);
            $endDate = new DateTime($absencesPeriod['end']);
            $absenceType = $absencesPeriod['type'];
            $isHoliday = $this->tools->isHoliday(strtotime($absencesPeriod['start']));

            if ($startDate >= $startOfPeriod && $endDate <= $endOfPeriod) {
                // Calculate the counted hours for the absence period
                // If the absence type is "recovery" or the day is a holiday, no hours are counted
                $countedHours = ($absenceType !== 'recovery' && $isHoliday === 0) ? (9 * 3600) + (36 * 60) : 0;

                // Find the week number of the absence period
                $weekOfMonth = intval($startDate->format('W'));

                // Add the counted hours to the corresponding week in the $weeks array
                $weeks[$weekOfMonth] += ($countedHours);
            }
        }


        // Convert seconds to hours for each week in the array
        foreach ($weeks as &$week) {
            $week = $week / 3600;
        }

        return $weeks;
    }

    /**
     * This function returns an associative array where the keys are the week numbers
     * between the given start and end dates, and the values are arrays containing the
     * corresponding start and end dates of the week.
     *
     * @param string $periodStart - Start date of the period in the "Y-m-d H:i:s" format
     * @param string $periodEnd - End date of the period in the "Y-m-d H:i:s" format
     * @return array<int, array{start: string, end: string}> An associative array with the week number as keys and start and end dates of each week as values.
     */
    public function getWeeksInPeriod(string $periodStart, string $periodEnd): array
    {
        $start = new DateTime($periodStart);
        $end = new DateTime($periodEnd);
        $interval = DateInterval::createFromDateString('1 week');
        $period = new DatePeriod($start, $interval, $end);

        $weekDates = [];
        foreach ($period as $week) {
            $weekNum = (int)$week->format('W');
            $weekStart = $week->format('Y-m-d');
            $weekEnd = clone $week;
            $weekEnd->modify('+6 days');
            $weekDates[$weekNum] = ['start' => $weekStart, 'end' => $weekEnd->format('Y-m-d')];
        }

        return $weekDates;
    }

    /**
     * Check if the hours for each week are within the legal limits.
     *
     * @param array<int, int|float> $hoursPerWeek An array of hours worked per week
     * @param array<string, int|float> $limits An array of limits for the number of hours worked per week
     * @return array<string, mixed> An array containing information about warning hours, illegal hours, and any errors
     */
    public function checkWeeklyHours(array $hoursPerWeek, array $limits): array
    {
        $warningHours = [];
        $illegalHours = [];
        $errors = [];

        foreach ($hoursPerWeek as $key => $hours) {
            if (($hours > $limits['limit']) && ($hours <= $limits['highLimit'])) {
                $warningHours[$key] = $hours;
            }
            if ($hours > $limits['highLimit']) {
                $illegalHours[$key] = $hours;
                $errors[] = 'La semaine '.$key. " présente un dépassement d'heure légales.";
            }
        }

        return [
            'warningHours' => $warningHours,
            'illegalHours' => $illegalHours,
            'errors' => $errors,
        ];
    }

    /**
     * This function checks the number of hours worked in each week of a given period and creates warning messages if the hours exceed set limits.
     *
     * @param array<int, int|float> $hoursPerWeek A key-value array where the key is the week number and the value is the number of hours worked that week.
     * @param array<string, int|float> $limits A key-value array containing 'limit' and 'highLimit'. 'limit' is the threshold above which a warning message is generated. 'highLimit' is the threshold above which an illegal hours message is generated.
     * @param string $periodStart The start date of the period to check, in the format 'Y-m-d' (e.g., '2022-12-26').
     * @param string $periodEnd The end date of the period to check, in the format 'Y-m-d' (e.g., '2022-12-31').
     *
     *
     * @throws \Exception Throws an exception if a week number from the $hoursPerWeek array does not exist in the period defined by $periodStart and $periodEnd.
     * @return array<string, mixed> A key-value array with 'warningHours' (an array of week numbers and corresponding hours that triggered a warning), 'illegalHours' (an array of week numbers and corresponding hours that are above the high limit), and 'warnings' (an array of warning messages).
     */
    public function checkWeeklyHoursImproved(array $hoursPerWeek, array $limits, string $periodStart, string $periodEnd): array
    {
        $warningHours = [];
        $illegalHours = [];
        $warnings = [];

        $weekDates = $this->getWeeksInPeriod($periodStart, $periodEnd);

        foreach ($hoursPerWeek as $key => $hours) {
            // Ensure the week number exists in the weekDates array
            if (! isset($weekDates[$key])) {
                throw new \Exception("Week number {$key} does not exist in the period from {$periodStart} to {$periodEnd}");
            }

            // Get the start and end dates for this week
            $startDate = $weekDates[$key]['start'];
            $endDate = $weekDates[$key]['end'];

            if (($hours > $limits['limit']) && ($hours <= $limits['highLimit'])) {
                $warningHours[$key] = $hours;
                $warnings[] = [
                    'warningType' => 'minLimit',
                    'descitpion' => 'The maximum allowed time limit is exceeded',
                    'NumberOfHours' => $hours,
                    'week' => $key,
                    'startDate' => $startDate,
                    'endDate' => $endDate,
                ];
            }
            if ($hours > $limits['highLimit']) {
                $illegalHours[$key] = $hours;
                $warnings[] = [
                    'warningType' => 'maxLimit',
                    'descitpion' => 'The maximum unauthorized time limit is exceeded',
                    'NumberOfHours' => $hours,
                    'week' => $key,
                    'startDate' => $startDate,
                    'endDate' => $endDate,
                ];
            }
        }

        return [
            'warningHours' => $warningHours,
            'illegalHours' => $illegalHours,
            'warnings' => $warnings,
        ];
    }

    /**
     * Check if the weekly hours exceed the legal limit for a given period.
     *
     * @param array<int, int|float> $warningHours An array containing the weekly hours that exceed the legal limit
     * @param array<int, int|float> $illegalHours An array containing the weekly hours that exceed the high legal limit
     * @param string $period The period being checked, e.g. "Period 1"
     *
     * @return string|null An error message if more than two weeks exceed the limit, or null if the limit is not exceeded
     */
    public function checkWeeklyHoursExceedLimit(array $warningHours, array $illegalHours, string $period): ?string
    {
        $error = null;

        // Count the total number of weeks that exceed the legal limit
        $totalExceedingWeeks = count($warningHours) + count($illegalHours);

        if ($totalExceedingWeeks >= 2) {
            $periodNumber = substr($period, strlen('Period '));
            $error = 'Plus de deux semaines dépassent la limite légale dans la période ' . $periodNumber . '.';
        }

        return $error;
    }

    /**
     * Check if the total number of weeks that exceed the legal limit is greater than or equal to 2 within a given period. If so, warnings are generated.
     *
     * @param array<int, int|float> $warningHours An associative array where each key is a week number and its value is the total hours that exceed the minimum legal limit for that week.
     * @param array<int, int|float> $illegalHours An associative array where each key is a week number and its value is the total hours that exceed the maximum legal limit for that week.
     * @param string $period The period of time being checked, in the format "Period X" where X is the period number.
     * @param string $periodStart The starting date of the period being checked, in the format "YYYY-MM-DD".
     * @param string $periodEnd The ending date of the period being checked, in the format "YYYY-MM-DD".
     *
     * @return list<array<string, mixed>> An array of warnings if there are weeks that exceed the legal limit. Each warning is an associative array containing the warning type, the week number, and the start and end dates of the period.
     */
    public function checkWeeklyHoursExceedLimitImproved(array $warningHours, array $illegalHours, string $period, string $periodStart, string $periodEnd): array
    {
        $warnings = [];

        // Count the total number of weeks that exceed the legal limit
        $totalExceedingWeeks = count($warningHours) + count($illegalHours);

        if ($totalExceedingWeeks >= 2) {
            $periodNumber = substr($period, strlen('Period '));
            $warnings[] = [
                'warningType' => 'overruns',
                'period' => $periodNumber,
                'descitpion' => 'More than 2 weeks exceeds the legal limit',
                'startDate' => $periodStart,
                'endDate' => $periodEnd,
            ];
        }

        return $warnings;
    }
}
