<?php

declare(strict_types=1);

namespace App\Services\Gardes;

class ShiftAssignmentEngine
{
    private const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    private const WEEKENDS = ['Friday', 'Saturday', 'Sunday'];

    /**
     * Assigns weekday (Mon–Thu) shifts to residents using a fair-share algorithm.
     *
     * Each resident must have:
     *   - 'id'             => int
     *   - 'lastname'       => string
     *   - 'firstname'      => string
     *   - 'unavailableDays'=> string[]  (Y-m-d)
     *
     * @param array<int, array<string, mixed>> $residents
     * @return array{nbOfShift: array<int,int>, assignedDays: array<int, array<string, mixed>>}
     */
    public function assignWeekdayDays(array $residents, string $startOfLegalInterval, string $endOfLegalInterval): array
    {
        $dates = $this->collectDates($startOfLegalInterval, $endOfLegalInterval, self::WEEKDAYS);
        shuffle($dates);

        $assignedDays = [];
        $points       = array_column($residents, null, 'id');
        $points       = array_map(fn () => 0, $points);

        foreach ($dates as $date) {
            $assigned = false;
            usort($residents, fn ($a, $b) => $points[$a['id']] - $points[$b['id']]);

            foreach ($residents as $resident) {
                if (! in_array($date, $resident['unavailableDays'], true)) {
                    $assignedDays[] = [
                        'date'     => $date,
                        'resident' => [
                            'id'        => $resident['id'],
                            'firstname' => $resident['firstname'],
                            'lastname'  => $resident['lastname'],
                        ],
                    ];
                    $points[$resident['id']]++;
                    $assigned = true;
                    break;
                }
            }

            if (! $assigned) {
                $assignedDays[] = ['date' => $date, 'id' => null, 'firstname' => null, 'lastname' => null];
            }
        }

        usort($assignedDays, fn ($a, $b) => (new \DateTime($a['date']))->getTimestamp() - (new \DateTime($b['date']))->getTimestamp());

        return ['nbOfShift' => $points, 'assignedDays' => $assignedDays];
    }

    /**
     * Assigns weekend (Fri–Sun) blocks to residents.
     * Prevents back-to-back weekends and respects unavailability.
     *
     * @param array<int, array<string, mixed>> $residents
     * @return array{nbOfShift: array<int,int>, assignedDays: array<int, array<string, mixed>>}
     */
    public function assignWeekendDays(array $residents, string $startOfLegalInterval, string $endOfLegalInterval): array
    {
        $dates         = $this->collectDates($startOfLegalInterval, $endOfLegalInterval, self::WEEKENDS);
        $weekendGroups = $this->groupIntoWeekends($dates);

        $assignedDays        = [];
        $points              = array_column($residents, null, 'id');
        $points              = array_map(fn () => 0, $points);
        $assignedLastWeekend = [];

        foreach ($weekendGroups as $group) {
            $assigned = false;
            usort($residents, fn ($a, $b) => $points[$a['id']] - $points[$b['id']]);

            foreach ($residents as $resident) {
                $available = array_intersect($group, $resident['unavailableDays']) === [];
                $overlap   = $this->checkAssignedLastWeekend($resident, $assignedLastWeekend);

                if ($available && ! $overlap) {
                    $assigned            = true;
                    $pointsToAdd         = 0;
                    $assignedLastWeekend = [];

                    foreach ($group as $date) {
                        $dow          = (int) (new \DateTime($date))->format('w');
                        $pointsToAdd += ($dow === 5) ? 2 : 3;

                        $entry               = [
                            'date'     => $date,
                            'resident' => [
                                'id'        => $resident['id'],
                                'firstname' => $resident['firstname'],
                                'lastname'  => $resident['lastname'],
                            ],
                        ];
                        $assignedDays[]        = $entry;
                        $assignedLastWeekend[] = $entry;
                    }

                    $points[$resident['id']] += $pointsToAdd;
                    break;
                }
            }

            if (! $assigned) {
                foreach ($group as $date) {
                    $assignedDays[] = ['date' => $date, 'id' => null, 'firstname' => null, 'lastname' => null];
                }
            }
        }

        usort($assignedDays, fn ($a, $b) => (new \DateTime($a['date']))->getTimestamp() - (new \DateTime($b['date']))->getTimestamp());

        return ['nbOfShift' => $points, 'assignedDays' => $assignedDays];
    }

    /**
     * Returns true if $resident appears in $assignedLastWeekend.
     */
    /**
     * @param array<string, mixed> $resident
     * @param array<int, array<string, mixed>> $assignedLastWeekend
     */
    public function checkAssignedLastWeekend(array $resident, array $assignedLastWeekend): bool
    {
        foreach ($assignedLastWeekend as $entry) {
            if ($entry['resident']['id'] === $resident['id']) {
                return true;
            }
        }

        return false;
    }

    // ─── private helpers ─────────────────────────────────────────────────────

    /**
     * @param string[] $dayNames
     * @return string[]
     */
    private function collectDates(string $start, string $end, array $dayNames): array
    {
        $dates  = [];
        $startDt = new \DateTime($start);
        $endDt   = new \DateTime($end);

        for ($i = clone $startDt; $i <= $endDt; $i->modify('+1 day')) {
            if (in_array($i->format('l'), $dayNames, true)) {
                $dates[] = $i->format('Y-m-d');
            }
        }

        return $dates;
    }

    /**
     * Groups a flat list of Fri/Sat/Sun dates into consecutive 3-day weekends.
     *
     * @param string[] $dates
     * @return array<int, string[]>
     */
    private function groupIntoWeekends(array $dates): array
    {
        $groups  = [];
        $current = [];

        foreach ($dates as $date) {
            $current[] = $date;
            if (count($current) === 3) {
                $groups[]  = $current;
                $current   = [];
            }
        }

        if ($current !== []) {
            $groups[] = $current;
        }

        return $groups;
    }
}
