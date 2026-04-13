<?php

declare(strict_types=1);

namespace App\Compliance\Timeline;

use App\Compliance\DTO\WorkSegment;
use App\Entity\Absence;
use App\Entity\Garde;
use App\Entity\Timesheet;
use App\Enum\GardeType;

/**
 * Builds a unified, sorted list of WorkSegment objects from raw Doctrine entities.
 *
 * Rules applied:
 * - Timesheet: always included, pause deducted
 * - Garde hospital: always included (intra-muros, ≤ 20 min response time)
 * - Garde callable: excluded UNLESS called = true on any overlapping Timesheet
 * - Absences are NOT included here — they are handled separately in the checkers
 *   because their counting logic depends on the rule being applied.
 *
 * @see docs/COMPLIANCE.md §7
 */
final class ResidentWorkTimelineBuilder
{
    /**
     * @param Timesheet[] $timesheets
     * @param Garde[]     $gardes
     *
     * @return WorkSegment[]  sorted by start ASC
     */
    public function build(array $timesheets, array $gardes): array
    {
        $segments = [];

        foreach ($timesheets as $ts) {
            $segments[] = new WorkSegment(
                start: \DateTimeImmutable::createFromInterface($ts->getDateOfStart()),
                end: \DateTimeImmutable::createFromInterface($ts->getDateOfEnd()),
                type: 'timesheet',
                pauseSeconds: ($ts->getPause() ?? 0) * 60,
            );
        }

        foreach ($gardes as $garde) {
            if ($garde->getType() === GardeType::Hospital) {
                $segments[] = new WorkSegment(
                    start: \DateTimeImmutable::createFromInterface($garde->getDateOfStart()),
                    end: \DateTimeImmutable::createFromInterface($garde->getDateOfEnd()),
                    type: 'garde_hospital',
                );
            }
            // Callable gardes are excluded — they only count if called,
            // and that is encoded on Timesheet.called = true, which is already
            // included above as a regular timesheet entry.
        }

        usort($segments, static fn (WorkSegment $a, WorkSegment $b) => $a->start <=> $b->start);

        return $segments;
    }

    /**
     * Returns worked seconds per ISO week number for a given set of segments,
     * restricted to [periodStart, periodEnd].
     *
     * @param WorkSegment[] $segments
     *
     * @return array<int, float>  weekNumber => hours
     */
    public function groupByWeek(array $segments, \DateTimeImmutable $periodStart, \DateTimeImmutable $periodEnd): array
    {
        $weeks = [];

        // Pre-populate all weeks in the period with 0
        $cursor = $periodStart;
        while ($cursor <= $periodEnd) {
            $weeks[(int) $cursor->format('W')] = 0.0;
            $cursor = $cursor->modify('+1 week');
        }

        foreach ($segments as $segment) {
            if ($segment->start < $periodStart || $segment->end > $periodEnd) {
                continue;
            }

            $weekNum = (int) $segment->start->format('W');
            if (!isset($weeks[$weekNum])) {
                $weeks[$weekNum] = 0.0;
            }

            $weeks[$weekNum] += $segment->durationHours();
        }

        return $weeks;
    }
}
