<?php

declare(strict_types=1);

namespace App\Services\YearsManagement;

use App\Entity\Years;
use App\Entity\YearsWeekIntervals;
use DateTime;

class WeekIntervals
{
    /**
     * Create week intervals between given start and end dates.
     *
     * @return list<array<string, mixed>>
     */
    public function createWeekIntervals(DateTime $dateOfStart, DateTime $dateOfEnd): array
    {
        $weekIntervals = [];

        // Find the first Monday on or before the start date
        $startDate = clone $dateOfStart;
        while ($startDate->format('N') != 1) {
            $startDate->modify('-1 day');
        }

        // Find the last Sunday on or after the end date
        $endDate = clone $dateOfEnd;
        while ($endDate->format('N') != 7) {
            $endDate->modify('+1 day');
        }

        // Generate the week intervals between the start and end dates
        $currentDate = $startDate;
        while ($currentDate <= $endDate) {
            $weekStartDate = clone $currentDate;
            $weekEndDate = clone $currentDate;
            $weekEndDate->modify('+6 days');
            $weekIntervals[] = [
                'dateOfStart' => $weekStartDate->format('Y-m-d'),
                'dateOfEnd' => $weekEndDate->format('Y-m-d'),
                'weekNumber' => $weekStartDate->format('W'),
                'monthNumber' => $weekStartDate->format('n'),
                'yearNumber' => $weekStartDate->format('Y'),
                'deleted' => false,
            ];

            // Move to the next Monday
            $currentDate->modify('+1 week');
        }

        return $weekIntervals;
    }

    /**
     * Updates the existing week intervals by adding new intervals and removing
     * those that do not overlap with the specified date range.
     *
     * @param list<YearsWeekIntervals> $existingIntervals Existing entity intervals for the year.
     * @param DateTime $dateOfStart The new start date for the year.
     * @param DateTime $dateOfEnd The new end date for the year.
     * @param Years $year The year entity used when creating new interval entities.
     * @return list<YearsWeekIntervals> Updated and sorted list of interval entities.
     */
    public function updateWeekIntervals(
        array $existingIntervals,
        DateTime $dateOfStart,
        DateTime $dateOfEnd,
        Years $year,
    ): array {
        // 1. Create new plain-array intervals for the target date range
        $newIntervals = $this->createWeekIntervals($dateOfStart, $dateOfEnd);

        // 2. Index existing intervals by their start date string for O(1) lookup
        $existingByDate = [];
        foreach ($existingIntervals as $existing) {
            $start = $existing->getDateOfStart();
            if ($start !== null) {
                $existingByDate[$start->format('Y-m-d')] = true;
            }
        }

        // 3. Create entities for weeks that do not yet exist
        foreach ($newIntervals as $newInterval) {
            if (! isset($existingByDate[$newInterval['dateOfStart']])) {
                $entity = (new YearsWeekIntervals())
                    ->setYear($year)
                    ->setDateOfStart(new DateTime($newInterval['dateOfStart']))
                    ->setDateOfEnd(new DateTime($newInterval['dateOfEnd']))
                    ->setWeekNumber((int) $newInterval['weekNumber'])
                    ->setMonthNumber((int) $newInterval['monthNumber'])
                    ->setYearNumber((int) $newInterval['yearNumber'])
                    ->setDeleted(false);
                $existingIntervals[] = $entity;
            }
        }

        // 4. Keep only intervals that overlap with the new date range
        $existingIntervals = array_values(array_filter(
            $existingIntervals,
            static function (YearsWeekIntervals $interval) use ($dateOfStart, $dateOfEnd): bool {
                $start = $interval->getDateOfStart();
                $end   = $interval->getDateOfEnd();

                return $start !== null && $end !== null
                    && $end >= $dateOfStart
                    && $start <= $dateOfEnd;
            }
        ));

        // 5. Sort by start date ascending
        usort(
            $existingIntervals,
            static fn (YearsWeekIntervals $a, YearsWeekIntervals $b): int =>
                ($a->getDateOfStart()?->getTimestamp() ?? 0) <=> ($b->getDateOfStart()?->getTimestamp() ?? 0)
        );

        return $existingIntervals;
    }

}
