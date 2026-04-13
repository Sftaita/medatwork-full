<?php

declare(strict_types=1);

namespace App\Services\ExcelGenerator;

use DateInterval;
use DatePeriod;
use DateTime;

/**
 * Maps a flat list of callable gardes into a per-day display map
 * used to populate the Excel timesheet.
 *
 * A "callable" garde follows Belgian medical-resident rules:
 *  - The "active" night window is 20:00 → 08:00 the next morning.
 *  - Shifts starting before 20:00 are split at 20:00.
 *  - Multi-day shifts (ending after 08:00 the next day) are spread
 *    across intermediate days in 24 h blocks (08:00 → 08:00).
 *
 * Input garde records must have:
 *   'dateOfStart' => \DateTime
 *   'dateOfEnd'   => \DateTime
 *   'type'        => string  (only 'callable' records are processed)
 *
 * Output: array keyed by 'dd-mm-YYYY' with shape:
 *   [
 *     'month'    => 'YYYY-MM',
 *     'date'     => 'YYYY-MM-DD',
 *     'interval' => 'HH:MM-HH:MM' (or multiple intervals separated by '  '),
 *     'type'     => 'callable',
 *   ]
 */
final class CallableGardeMapper
{
    /**
     * @param array<int, array{dateOfStart: \DateTime, dateOfEnd: \DateTime, type: string}> $gardes
     * @return array<string, array{month: string, date: string, interval: string, type: string}>
     */
    public function map(array $gardes): array
    {
        $result = [];

        foreach ($gardes as $garde) {
            if ($garde['type'] !== 'callable') {
                continue;
            }

            $start  = $garde['dateOfStart'];
            $end    = $garde['dateOfEnd'];

            $nextDayAt8 = $this->nextDayAt8($start);

            // ── Case 1: ends at or before 08:00 the next morning ────────────────
            if ($end <= $nextDayAt8) {
                $at20 = $this->sameDay($start, '20:00');

                if ($start >= $at20) {
                    // Starts at / after 20:00 → single interval
                    $interval = $start->format('H:i') . '-' . $end->format('H:i');
                } else {
                    // Starts before 20:00 → split at 20:00
                    $interval = $start->format('H:i') . '-20:00  20:00-' . $end->format('H:i');
                }

                $this->addToDay($result, $start->format('d-m-Y'), [
                    'month'    => $start->format('Y-m'),
                    'date'     => $start->format('Y-m-d'),
                    'interval' => $interval,
                    'type'     => 'callable',
                ]);

                continue;
            }

            // ── Case 2: ends after 08:00 next day → multi-day spread ─────────────
            $startDate = new DateTime($start->format('Y-m-d'));
            $endDate   = new DateTime($end->format('Y-m-d'));
            $period    = new DatePeriod($startDate, new DateInterval('P1D'), $endDate);

            foreach ($period as $day) {
                $dayKey = $day->format('d-m-Y');

                if ($day->format('Y-m-d') === $start->format('Y-m-d')) {
                    // First day
                    $at20 = $this->sameDay($start, '20:00');

                    if ($start < $at20) {
                        $interval = $start->format('H:i') . '-20:00  20:00-08:00';
                    } else {
                        $interval = $start->format('H:i') . '-08:00';
                    }
                } else {
                    // Intermediate / last day of the multi-day spread
                    $tomorrowAt8 = (clone $day)->modify('+1 day')->setTime(8, 0);

                    if ($end >= $tomorrowAt8) {
                        // Still going past 08:00 of the next day → full 24 h block
                        $interval = '08:00-08:00';
                    } else {
                        // Ends before 08:00 on this day's "tomorrow"
                        $interval = '08:00-' . $end->format('H:i');
                    }
                }

                $this->addToDay($result, $dayKey, [
                    'month'    => $day->format('Y-m'),
                    'date'     => $day->format('Y-m-d'),
                    'interval' => $interval,
                    'type'     => 'callable',
                ]);
            }
        }

        return $result;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Returns a DateTime set to 08:00 the next calendar day after $from.
     */
    private function nextDayAt8(DateTime $from): DateTime
    {
        return (clone $from)->modify('+1 day')->setTime(8, 0);
    }

    /**
     * Returns a DateTime for the same calendar day as $from, at $time ('HH:MM').
     */
    private function sameDay(DateTime $from, string $time): DateTime
    {
        [$h, $m] = explode(':', $time);
        return (clone $from)->setTime((int) $h, (int) $m, 0);
    }

    /**
     * Inserts or appends $entry to $result[$dayKey].
     * When two shifts fall on the same day, their interval strings are joined with '  '.
     *
     * @param array<string, array{month: string, date: string, interval: string, type: string}> $result
     * @param array{month: string, date: string, interval: string, type: string} $entry
     */
    private function addToDay(array &$result, string $dayKey, array $entry): void
    {
        if (! isset($result[$dayKey])) {
            $result[$dayKey] = $entry;
        } else {
            $result[$dayKey]['interval'] .= '  ' . $entry['interval'];
        }
    }
}
