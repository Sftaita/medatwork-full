<?php

declare(strict_types=1);

namespace App\Services\Utils;

use DateTime;
use Yasumi\Yasumi;

class Tools
{
    /**
     * Normalize an enum or string type value to its string representation.
     * Doctrine returns enum-typed columns as enum objects; this ensures downstream
     * code always receives a plain string.
     */
    private function typeToString(mixed $type): string
    {
        return $type instanceof \BackedEnum ? $type->value : (string) $type;
    }

    /**
     * There are two garde periods. One starting from 18pm to next day 8am, and one starting from 8am to 18pm.
     *
     */
    /** @param list<array<string, mixed>> $gardePeriod */
    public function divideCallableGardeByPeriods(array $gardePeriod, string $firstMonthDay, string $lastMonthDay): int
    {
        $callableGarde = 0;


        foreach ($gardePeriod as $period) {
            $start = $period['start'];
            $end = $period['end'];

            // 1. Check if the starting date is in the current month
            $startDt = new \DateTime($start);
            $endDt   = new \DateTime($end);
            if (($startDt->format('Y-m-d 00:00:00') >= $firstMonthDay) && ($startDt->format('Y-m-d') <= $lastMonthDay) && ($period['type'] === 'callable')) {


                if (($startDt->format('H:i') <= '08:00') && ($endDt->format('H:i') > '08:00') && ($endDt->format('H:i') <= '18:00')) {
                    $callableGarde++;
                }

                if (($startDt->format('H:i') <= '08:00') && ($endDt->format('H:i') > '18:00')) {
                    $callableGarde = $callableGarde + 2;
                }

                if (($startDt->format('H:i') > '08:00') && ($startDt->format('H:i') < '18:00') && ($endDt->format('H:i') <= '18:00')) {
                    $callableGarde++;
                }

                if (($startDt->format('H:i') > '08:00') && ($startDt->format('H:i') < '18:00') && ($endDt->format('H:i') > '18:00')) {
                    $callableGarde = $callableGarde + 2;

                }

                if (($startDt->format('H:i') >= '18:00') && ($endDt->format('H:i') > '18:00')) {
                    $callableGarde++;
                }
            }
        }
        return $callableGarde;
    }

    /**
     * Checks the type of day for a given timestamp.
     *
     * @param int $timestamp The timestamp to check.
     * @return int Returns an integer representing the type of day:
     *                    0 for a regular weekday,
     *                    1 for a Sunday,
     *                    2 for a Saturday,
     *                    3 for a public holiday that falls on a weekday.
     */
    public function isHoliday($timestamp): int
    {
        $date = new DateTime('@' . $timestamp);

        // Create a Yasumi holiday provider for Belgium for the given year
        $holidays = Yasumi::create('Belgium', (int) $date->format('Y'));

        // Get the day of the week as an integer (0 for Sunday to 6 for Saturday)
        $dayOfWeek = $date->format('w');

        // Check if the day is a Sunday (highest priority)
        if ($dayOfWeek == 0) {
            return 1;
        }
        // Check if the day is a public holiday (but not a Sunday)
        elseif ($holidays->isHoliday($date)) {
            return 3;
        }
        // Check if the day is a Saturday
        elseif ($dayOfWeek == 6) {
            return 2;
        }
        // If none of the above, it's a regular weekday
        else {
            return 0;
        }
    }

    /**
    * Calculates the difference in seconds between two times.
    *
    * @param string $startTime A string representation of the start time in the format "H:i".
    * @param string $endTime A string representation of the end time in the format "H:i".
    *
    * @return int The difference in seconds between the start and end times.
    */
    public function timeDiffInSeconds($startTime, $endTime): int
    {
        $startDt = new \DateTime($startTime);
        $endDt   = new \DateTime($endTime);

        if ($endTime == '23:59') {
            $endDt = (new \DateTime($startTime))->modify('tomorrow');
        }

        $difference = $endDt->getTimestamp() - $startDt->getTimestamp();

        return $difference;
    }


    /**
    * Calculate difference in hours separing two dates
    *
    * @return int Seconde
    */
    public function hoursdiffInSeconde(string $startdate, string $enddate): int
    {
        $starttimestamp = (new \DateTime($startdate))->getTimestamp();
        $endtimestamp   = (new \DateTime($enddate))->getTimestamp();
        $difference     = $endtimestamp - $starttimestamp;

        return $difference;
    }

    public function weekOfYear(int $date): int
    {
        $weekOfYear = intval(date('W', $date));
        if (date('n', $date) == '1' && $weekOfYear > 51) {
            // It's the last week of the previos year.
            return 0;
        } elseif (date('n', $date) == '12' && $weekOfYear == 1) {
            // It's the first week of the next year.
            return 53;
        } else {
            // It's a "normal" week.
            return $weekOfYear;
        }
    }

    public function weekOfMonth(string $date): int
    {
        //Get the first day of the month.
        $dateDt       = new \DateTime($date);
        $firstOfMonth = (new \DateTime($date))->modify('first day of this month');
        //Apply above formula.
        return $this->weekOfYear($dateDt->getTimestamp()) - $this->weekOfYear($firstOfMonth->getTimestamp()) + 1;
    }

    public function getWeekNumber(string $date): int
    {
        return (int) (new \DateTime($date))->format('W');
    }

    /**
     * Provide date limites of a month, including first week and last week of the month.
     *
     * @param int $month
     * @param int $year
     * @return array<string, string>
     */
    public function dateBoundaries($month, $year): array
    {
        // Start and end date of the month
        $start = (new \DateTime($year.'/'.$month.'/01'))->format('Y-m-01 00:00:00');
        $end = (new \DateTime($year.'/'.$month.'/01'))->modify('last day of this month')->format('Y-m-d 23:59:59');

        // Start date from the first day of the week where the month start
        $startDate = new \DateTime($start);
        $endDate = new \DateTime($end);
        $week_start = clone $startDate->modify('Monday this week');
        $week_end = clone $endDate->modify('next Monday');
        $lastDayOfLastWeek = clone $week_end->modify('-1 day');

        // Extremity
        $startFromWeek = $week_start->format('Y-m-d 00:00:00');
        $endOfTheLastWeek = $lastDayOfLastWeek->format('Y-m-d 23:59:59');

        return [
            'start' => $start,
            'end' => $end,
            'startFromWeek' => $startFromWeek,
            'endOfTheLastWeek' => $endOfTheLastWeek,
        ];
    }

    /**
     * Check if a given date falls within certain boundaries around a given month.
     *
     * This function takes a date and compares it to specific boundaries:
     * - the start and end dates of a specific month
     * - the first and last days of the weeks that are partially within the month
     *
     * @param string $date The date to be checked in "Y-m-d H:i:s" format.
     * @param string $monthFirstDate The start date of the month in "Y-m-d H:i:s" format.
     * @param string $monthLastDate The end date of the month in "Y-m-d H:i:s" format.
     * @param string $firstDayOfFirstWeek The start date of the first week that is partially within the month, in "Y-m-d H:i:s" format.
     *
     * @return string The function returns one of the four possible string values:
     * - "before": If the date is within the first week that is partially in the month, but before the start date of the month.
     * - "after": If the date is within the last week that is partially in the month, but after the end date of the month.
     * - "in": If the date is within the start and end dates of the month.
     * - "out": If the date is completely outside the first and last weeks that are partially within the month.
     */
    public function checkIfDateIsBeforeOfAfterCurrentMonth(string $date, string $monthFirstDate, string $monthLastDate, string $firstDayOfFirstWeek, string $lastDayOfLasttWeek): string
    {
        $currentDate = (new \DateTime($date))->format('Y-m-d H:i:s');
        $monthStart  = (new \DateTime($monthFirstDate))->format('Y-m-d 00:00:00');
        $monthEnd    = (new \DateTime($monthLastDate))->format('Y-m-d 23:59:59');
        $firstLimit  = (new \DateTime($firstDayOfFirstWeek))->format('Y-m-d 00:00:00');
        $lastLimit   = (new \DateTime($lastDayOfLasttWeek))->format('Y-m-d 23:59:59');

        if ($currentDate >= $firstLimit && $currentDate < $monthStart) {
            return 'before';
        } elseif ($currentDate > $monthEnd && $currentDate <= $lastLimit) {
            return 'after';
        } elseif ($currentDate >= $monthFirstDate && $currentDate <= $monthLastDate) {
            return 'in';
        } else {
            return 'out';
        }
    }

    /**
    * Separate timesheets into days
    *
    * @param list<array<string, mixed>> $timesheet The array of timesheets to be separated
    * @return list<array<string, mixed>> An array of separated timesheets with the following properties:
    *               start (string), end (string), pause (int in minutes), scientific (int in minutes), called (bool)
    */
    public function separateTimesheetsByDay(array $timesheet): array
    {

        $results = [];

        foreach ($timesheet as $period) {

            $date1 = date_format($period['dateOfStart'], 'Y-m-d H:i:s');
            $date2 = date_format($period['dateOfEnd'], 'Y-m-d H:i:s');

            $dtF1  = new \DateTime($date1);
            $dtF2  = new \DateTime(substr($date1, 0, 10) . ' 23:59:59');
            $dtEnd = new \DateTime($date2);

            $break = 0;
            if ($period['pause'] !== 0) {
                $break = $period['pause'];
            }

            $scientific = 0;
            if ($period['scientific'] !== 0) {
                $scientific = $period['scientific'];
            }

            while ($dtF2 < $dtEnd) {

                $results[] = ['start' => $dtF1->format('Y-m-d H:i:s'), 'end' => $dtF2->format('Y-m-d H:i:s'), 'pause' => $break, 'scientific' => $scientific, 'called' => $period['called']];
                $dtF1 = (clone $dtF2)->modify('+1 second');
                $dtF2 = (clone $dtF2)->modify('+1 day');
                $break = 0;
                $scientific = 0;
            }
            $results[] = ['start' => $dtF1->format('Y-m-d H:i:s'), 'end' => $date2, 'pause' => $break, 'scientific' => $scientific, 'called' => $period['called']];
        }
        return $results;
    }

    /**
     * Split timesheet periods that cross midnight into per-day slices.
     *
     * @param list<array<string, mixed>> $timesheet  Each row must have dateOfStart (DateTime), dateOfEnd (DateTime),
     *                          pause (int, seconds), called (mixed)
     * @return list<array{start:string,end:string,pause:int,called:mixed}>
     */
    public function separateByDay(array $timesheet): array
    {
        $results = [];

        foreach ($timesheet as $period) {
            $date1 = date_format($period['dateOfStart'], 'Y-m-d H:i:s');
            $date2 = date_format($period['dateOfEnd'], 'Y-m-d H:i:s');

            $dtF1  = new \DateTime($date1);
            $dtF2  = new \DateTime(substr($date1, 0, 10) . ' 23:59:59');
            $dtEnd = new \DateTime($date2);
            $break = $period['pause'] !== 0 ? $period['pause'] : 0;

            while ($dtF2 < $dtEnd) {
                $results[] = ['start' => $dtF1->format('Y-m-d H:i:s'), 'end' => $dtF2->format('Y-m-d H:i:s'), 'pause' => $break, 'called' => $period['called']];
                $dtF1  = (clone $dtF2)->modify('+1 second');
                $dtF2  = (clone $dtF2)->modify('+1 day');
                $break = 0;
            }
            $results[] = ['start' => $dtF1->format('Y-m-d H:i:s'), 'end' => $date2, 'pause' => $break, 'called' => $period['called']];
        }

        return $results;
    }

    /**
     * Calculate difference in hours between two datetime strings.
     */
    public function hoursdiff(string $startdate, string $enddate): float
    {
        return round((new \DateTime($enddate))->getTimestamp() - (new \DateTime($startdate))->getTimestamp(), 0, PHP_ROUND_HALF_UP) / 3600;
    }

    /**
    * Separate garde into days
    *
    * @param list<array<string, mixed>> $garde The array of garde to be separated
    * @return list<array<string, mixed>> An array of separated garde with the following properties:
    *                  start (string), end (string), type (string)
    */
    public function separateGardeByDay(array $garde): array
    {

        $results = [];

        foreach ($garde as $period) {
            $date1 = date_format($period['dateOfStart'], 'Y-m-d H:i:s');
            $date2 = date_format($period['dateOfEnd'], 'Y-m-d H:i:s');

            $dtF1  = new \DateTime($date1);
            $dtF2  = new \DateTime(substr($date1, 0, 10) . ' 23:59:59');
            $dtEnd = new \DateTime($date2);

            while ($dtF2 < $dtEnd) {

                $results[] = ['start' => $dtF1->format('Y-m-d H:i:s'), 'end' => $dtF2->format('Y-m-d H:i:s'), 'type' => $this->typeToString($period['type'])];
                $dtF1 = (clone $dtF2)->modify('+1 second');
                $dtF2 = (clone $dtF2)->modify('+1 day');
            }
            $results[] = ['start' => $dtF1->format('Y-m-d H:i:s'), 'end' => $date2, 'type' => $this->typeToString($period['type'])];
        }
        return $results;
    }


    /**
    * Separate absence into days
    * Rules: Every day of leave is considered as 09:36 hours of work
    *
    * @param list<array<string, mixed>> $absences  - An array of absence information
    * @return list<array<string, mixed>> [$start, $end, $type] - An array of start date, end date, and type of absence
    */
    public function separateAbsenceByDay(array $absences): array
    {
        $results = []; // initialize an array to store the result

        // loop through each period of absence in the input array
        foreach ($absences as $period) {
            // format the start date of the period
            $date1 = date_format($period['dateOfStart'], 'Y-m-d H:i:s');

            // if the end date is not specified, set it equal to the start date
            if ($period['dateOfEnd'] === null) {
                $date2 = date_format($period['dateOfStart'], 'Y-m-d H:i:s');
                // add the start time of 8:00 AM and end time of 5:36 PM to the results array
                $results[] = ['start' => date_format($period['dateOfStart'], 'Y-m-d 08:00:00'), 'end' => date_format($period['dateOfStart'], 'Y-m-d 17:36:00'), 'type' => $this->typeToString($period['type'])];
            }

            // if the end date is specified
            if ($period['dateOfEnd'] !== null) {
                $date2 = date_format($period['dateOfEnd'], 'Y-m-d H:i:s');

                // convert the start and end dates to DateTime objects
                $dtF1  = new \DateTime($date1);
                $dtF2  = new \DateTime(substr($date1, 0, 10) . ' 23:59:59');
                $dtEnd = new \DateTime($date2);

                // loop through each day until the end date is reached
                while ($dtF2 < $dtEnd) {
                    // add the start time of 8:00 AM and end time of 5:36 PM for each day to the results array
                    $results[] = ['start' => $dtF1->format('Y-m-d 08:00:00'), 'end' => $dtF2->format('Y-m-d 17:36:00'), 'type' => $this->typeToString($period['type'])];
                    // update the start and end DateTime objects for the next day
                    $dtF1 = (clone $dtF2)->modify('+1 second');
                    $dtF2 = (clone $dtF2)->modify('+1 day');
                }

                // add the start time of 8:00 AM and the actual end time for the last day to the results array
                $results[] = ['start' => $dtF1->format('Y-m-d 08:00:00'), 'end' => date_format($period['dateOfEnd'], 'Y-m-d 17:36:00'), 'type' => $this->typeToString($period['type'])];
            }
        }

        return $results;
    }

    /**
     * @param list<array<string, mixed>> $scheduledCalendarPeriods
     * @return list<array<string, mixed>>
     */
    public function separateScheduledCalendarByDay(array $scheduledCalendarPeriods): array
    {
        $results = []; // initialize an array to store the result

        // loop through each period of scheduled calendar in the input array
        foreach ($scheduledCalendarPeriods as $period) {
            // format the start date and end date of the period
            $startDate = $period['dateOfStart']->format('Y-m-d H:i:s');
            $endDate = $period['dateOfEnd']->format('Y-m-d H:i:s');

            // convert the start and end dates to DateTime objects
            $dtF1  = new \DateTime($startDate);
            $dtF2  = new \DateTime(substr($startDate, 0, 10) . ' 23:59:59');
            $dtEnd = new \DateTime($endDate);

            // loop through each day until the end date is reached
            while ($dtF2 < $dtEnd) {
                // add the start time and end time for each day to the results array
                $results[] = [
                    'start' => $dtF1->format('Y-m-d H:i:s'),
                    'end' => $dtF2->format('Y-m-d H:i:s'),
                    'type' => $this->typeToString($period['type']),
                    'id' => $period['id'],
                    'firstname' => $period['firstname'],
                    'lastname' => $period['lastname'],
                    'title' => $period['title'],
                    'yearId' => $period['yearId'],
                ];

                // update the start and end DateTime objects for the next day
                $dtF1 = (clone $dtF2)->modify('+1 second');
                $dtF2 = (clone $dtF2)->modify('+1 day');
            }

            // add the start time and the actual end time for the last day to the results array
            $results[] = [
                'start' => $dtF1->format('Y-m-d H:i:s'),
                'end' => $endDate,
                'type' => $this->typeToString($period['type']),
                'id' => $period['id'],
                'firstname' => $period['firstname'],
                'lastname' => $period['lastname'],
                'title' => $period['title'],
                'yearId' => $period['yearId'],
            ];
        }

        return $results;
    }



    /**
     * Check if a dateTime is in the given range of dateTime
     *
     * @return boolean
     */
    public function checkIfDateIsInCurrentMonth(string $dateTime, string $monthFirstDate, string $monthLastDate): bool
    {
        $currentDate = (new \DateTime($dateTime))->getTimestamp();
        $start       = (new \DateTime((new \DateTime($monthFirstDate))->format('Y-m-d 00:00:00')))->getTimestamp();
        $end         = (new \DateTime((new \DateTime($monthLastDate))->format('Y-m-d 23:59:59')))->getTimestamp();

        if (($currentDate >= $start) && ($currentDate <= $end)) {
            return true;

        } else {
            return false;
        }
    }

    /**
    * Check if all elements in the array are digits
    *
    * @param array<mixed> $array The input array to be checked
    * @return boolean True if all elements are digits, False otherwise
    */
    public function is_array_of_digits(array $array): bool
    {

        foreach ($array as $element) {
            if (! ctype_digit($element)) {
                return false;
            }
        }
        return true;
    }


    /**
    * Converts a number of minutes to hours and minutes in the format of "h:mm".
    *
    * @param int $minutes The number of minutes to be converted.
    * @return string The conversion in hours and minutes in the format of "h:mm".
    */
    public function convert_to_hours($minutes): string
    {
        $hours = floor($minutes / 60);
        $minutes = $minutes % 60;
        return sprintf('%d:%02d', $hours, $minutes);
    }

    /**
    * Get an associative array of week numbers between two dates
    *
    * @param string $start The start date in string format
    * @param string $end The end date in string format
    * @return array<int, int> An associative array where the keys are the week numbers between the start and end dates
    */
    public function getWeeksArray($start, $end): array
    {
        // Convert the start and end date strings to DateTime objects
        $startDt = new \DateTime($start);
        $endDt   = new \DateTime($end);

        // Initialize the weeks array
        $weeks = [];

        // Loop through each week between the start and end dates
        for ($current = clone $startDt; $current <= $endDt; $current->modify('+1 week')) {
            // Get the week number for the current date
            $weekNumber = (int) $current->format('W');

            // If the week number hasn't been added to the weeks array yet, add it
            if (! isset($weeks[$weekNumber])) {
                $weeks[$weekNumber] = 0;
            }
        }

        // Return the weeks array
        return $weeks;
    }

    /**
     * @param list<string> $monthIntervals
     * @param list<array<string, mixed>> $timesheetPeriods
     * @param list<array<string, mixed>> $gardePeriods
     * @param list<array<string, mixed>> $absencesPeriods
     * @return array<string, array<string, list<array<string, mixed>>>>
     */
    public function groupByMonth(array $monthIntervals, array $timesheetPeriods, array $gardePeriods, array $absencesPeriods): array
    {
        // Initialisation de la structure vide pour chaque mois
        $groupedByMonth = [];
        foreach ($monthIntervals as $month) {
            $groupedByMonth[$month] = [
                'timesheets' => [],
                'gardes' => [],
                'absences' => [],
            ];
        }

        $getYearMonth = static fn (string $date): string => (new DateTime($date))->format('Y-m');

        // Regroupement de $timesheetPeriods par mois
        foreach ($timesheetPeriods as $timesheet) {
            $month = $getYearMonth($timesheet['start']);
            if (isset($groupedByMonth[$month])) {
                $groupedByMonth[$month]['timesheets'][] = $timesheet;
            }
        }

        // Regroupement de $gardePeriods par mois
        foreach ($gardePeriods as $garde) {
            $month = $getYearMonth($garde['start']);
            if (isset($groupedByMonth[$month])) {
                $groupedByMonth[$month]['gardes'][] = $garde;
            }
        }

        // Regroupement de $absencesPeriods par mois
        foreach ($absencesPeriods as $absence) {
            $month = $getYearMonth($absence['start']);
            if (isset($groupedByMonth[$month])) {
                $groupedByMonth[$month]['absences'][] = $absence;
            }
        }

        return $groupedByMonth;
    }
}
