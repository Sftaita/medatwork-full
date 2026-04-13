<?php

declare(strict_types=1);

namespace App\Services\Gardes;

use DateTime;

class GardeDistributionEngine
{
    /**
     * Returns all Mon–Thu dates between $start_date and $end_date.
     *
     * @return string[] Y-m-d strings
     */
    public function getLevel1Blocks(string $start_date, string $end_date): array
    {
        $start = new DateTime($start_date);
        $end   = new DateTime($end_date);
        $dates = [];

        for ($i = $start; $i <= $end; $i->modify('+1 day')) {
            if ($i->format('N') >= 1 && $i->format('N') <= 4) {
                $dates[] = $i->format('Y-m-d');
            }
        }

        return $dates;
    }

    /**
     * Returns Fri/Sat/Sun dates grouped by ISO week number between $start_date and $end_date.
     *
     * @return array<int|string, list<string>> weekNumber => dates
     */
    public function getLevel2Blocks(string $start_date, string $end_date): array
    {
        $start       = new DateTime($start_date);
        $end         = new DateTime($end_date);
        $weekendDays = [];

        for ($i = $start; $i <= $end; $i->modify('+1 day')) {
            if ($i->format('N') >= 5) {
                $weekendDays[] = $i->format('Y-m-d');
            }
        }

        $grouped = [];
        foreach ($weekendDays as $day) {
            $week = (new DateTime($day))->format('W');
            $grouped[$week][] = $day;
        }

        return $grouped;
    }

    /**
     * Distributes dates among participants respecting unavailability.
     *
     * Each participant must have:
     *   - 'name'           => string
     *   - 'unavailability' => string[]  (Y-m-d dates)
     *
     * @param  array<int, mixed>  $participants
     * @return array{
     *   assigned_dates:  array<string, string[]>,
     *   unassigned_dates: string[],
     *   justice_table:   array<string, int>
     * }
     */
    public function distributeDates(string $start_date, string $end_date, array $participants): array
    {
        $level1Dates = $this->getLevel1Blocks($start_date, $end_date);
        $level2Dates = $this->getLevel2Blocks($start_date, $end_date);

        $assignedDates  = [];
        $unassignedDates = [];
        $justiceTable   = [];

        foreach ($participants as $p) {
            $justiceTable[$p['name']] = 0;
        }

        // Distribute weekday (Mon–Thu) dates
        foreach ($level1Dates as $date) {
            $assigned = false;
            foreach ($participants as $p) {
                if (! in_array($date, $p['unavailability'], true)) {
                    $assignedDates[$p['name']][] = $date;
                    $justiceTable[$p['name']]++;
                    $assigned = true;
                    break;
                }
            }
            if (! $assigned) {
                $unassignedDates[] = $date;
            }
        }

        // Distribute weekend blocks (Fri–Sun grouped by week)
        foreach ($level2Dates as $block) {
            $assigned = false;
            foreach ($participants as $p) {
                if (array_intersect($block, $p['unavailability']) === []) {
                    foreach ($block as $date) {
                        $assignedDates[$p['name']][] = $date;
                    }
                    $justiceTable[$p['name']] += 2;
                    $assigned = true;
                    break;
                }
            }
            if (! $assigned) {
                foreach ($block as $date) {
                    $unassignedDates[] = $date;
                }
            }
        }

        return [
            'assigned_dates'  => $assignedDates,
            'unassigned_dates' => $unassignedDates,
            'justice_table'   => $justiceTable,
        ];
    }
}
