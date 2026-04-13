<?php

declare(strict_types=1);

namespace App\Compliance\Checker;

use App\Compliance\DTO\ComplianceIssue;
use App\Compliance\DTO\WorkSegment;
use App\Compliance\Enum\ComplianceIssueType;
use App\Compliance\Enum\ComplianceSeverity;
use App\Entity\Absence;

/**
 * Art. 5 §2 — Maximum duration of a single shift: 24 h.
 *
 * Exceptions: accident survenu/imminent, nécessité imprévue.
 * Those exceptions cannot be detected programmatically — this checker
 * flags ALL violations; manual review is expected for exceptions.
 *
 * Note: this is already validated at input time in TimesheetInputValidator.
 * This checker provides an audit trail for the compliance report.
 */
final class MaxShiftDurationChecker implements ComplianceCheckerInterface
{
    private const MAX_SHIFT_HOURS = 24.0;

    public function check(
        array $segments,
        array $absences,
        \DateTimeImmutable $periodStart,
        \DateTimeImmutable $periodEnd,
        bool $optingOut,
    ): array {
        $issues = [];

        foreach ($segments as $segment) {
            if ($segment->start < $periodStart || $segment->end > $periodEnd) {
                continue;
            }

            $durationHours = $segment->durationHours();
            if ($durationHours > self::MAX_SHIFT_HOURS) {
                $weekStart = $segment->start->modify('monday this week')->format('Y-m-d');

                $issues[] = new ComplianceIssue(
                    type: ComplianceIssueType::MaxShiftDurationExceeded,
                    severity: ComplianceSeverity::Critical,
                    weekStart: $weekStart,
                    description: sprintf(
                        'La prestation du %s dure %.1f h (maximum légal : %d h).',
                        $segment->start->format('d/m/Y H:i'),
                        $durationHours,
                        self::MAX_SHIFT_HOURS,
                    ),
                    context: [
                        'shiftStart'    => $segment->start->format(\DateTimeInterface::ATOM),
                        'shiftEnd'      => $segment->end->format(\DateTimeInterface::ATOM),
                        'durationHours' => round($durationHours, 2),
                        'maxHours'      => self::MAX_SHIFT_HOURS,
                        'type'          => $segment->type,
                    ],
                );
            }
        }

        return $issues;
    }
}
