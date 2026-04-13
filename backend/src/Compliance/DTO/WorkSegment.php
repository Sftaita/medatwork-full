<?php

declare(strict_types=1);

namespace App\Compliance\DTO;

/**
 * Represents a single contiguous block of work time on the resident's timeline.
 *
 * Sources:
 *   - Timesheet entries (type = 'timesheet')
 *   - Hospital gardes (type = 'garde_hospital') — counted in full
 *   - Callable garde interventions where called = true (type = 'garde_callable_called')
 *
 * Callable gardes where called = false are NOT included in the timeline
 * because they do not count as working time (Convention collective Art. 5).
 */
final class WorkSegment
{
    public function __construct(
        public readonly \DateTimeImmutable $start,
        public readonly \DateTimeImmutable $end,
        /** 'timesheet' | 'garde_hospital' | 'garde_callable_called' */
        public readonly string $type,
        /** Pause duration in seconds (timesheets only, 0 for gardes) */
        public readonly int $pauseSeconds = 0,
    ) {
    }

    /** Net worked duration in seconds (end - start - pause) */
    public function durationSeconds(): int
    {
        return $this->end->getTimestamp() - $this->start->getTimestamp() - $this->pauseSeconds;
    }

    /** Net worked duration in hours */
    public function durationHours(): float
    {
        return $this->durationSeconds() / 3600;
    }
}
