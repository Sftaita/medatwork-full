<?php

declare(strict_types=1);

namespace App\Compliance\Checker;

use App\Compliance\DTO\ComplianceIssue;
use App\Compliance\DTO\WorkSegment;
use App\Compliance\Enum\ComplianceIssueType;
use App\Compliance\Enum\ComplianceSeverity;
use App\Entity\Absence;

/**
 * Art. 5 §3 — Minimum rest period after a long shift.
 *
 * Rule: after any shift ≥ 12 h, at least 12 h of consecutive rest must follow
 * before the next shift starts.
 *
 * This rule applies even with opting-out (Art. 7 explicitly preserves Art. 5 §3).
 *
 * The segments array is expected to be sorted ASC by start.
 */
final class MinimumRestChecker implements ComplianceCheckerInterface
{
    private const LONG_SHIFT_THRESHOLD_HOURS = 12.0;
    private const MIN_REST_HOURS             = 12.0;

    public function check(
        array $segments,
        array $absences,
        \DateTimeImmutable $periodStart,
        \DateTimeImmutable $periodEnd,
        bool $optingOut,
    ): array {
        $issues = [];

        $count = count($segments);
        for ($i = 0; $i < $count - 1; $i++) {
            $current = $segments[$i];

            if ($current->start < $periodStart || $current->end > $periodEnd) {
                continue;
            }

            if ($current->durationHours() < self::LONG_SHIFT_THRESHOLD_HOURS) {
                continue;
            }

            $next = $segments[$i + 1];
            $restSeconds = $next->start->getTimestamp() - $current->end->getTimestamp();
            $restHours   = $restSeconds / 3600;

            if ($restHours < self::MIN_REST_HOURS) {
                $weekStart = $current->start->modify('monday this week')->format('Y-m-d');

                $issues[] = new ComplianceIssue(
                    type: ComplianceIssueType::MinimumRestViolated,
                    severity: ComplianceSeverity::Critical,
                    weekStart: $weekStart,
                    description: sprintf(
                        'Après la prestation du %s (%.1f h), seulement %.1f h de repos avant la prestation suivante (minimum requis : %d h).',
                        $current->start->format('d/m/Y H:i'),
                        $current->durationHours(),
                        $restHours,
                        self::MIN_REST_HOURS,
                    ),
                    context: [
                        'shiftStart'        => $current->start->format(\DateTimeInterface::ATOM),
                        'shiftEnd'          => $current->end->format(\DateTimeInterface::ATOM),
                        'shiftDurationHours'=> round($current->durationHours(), 2),
                        'nextShiftStart'    => $next->start->format(\DateTimeInterface::ATOM),
                        'restHours'         => round($restHours, 2),
                        'minRestHours'      => self::MIN_REST_HOURS,
                    ],
                );
            }
        }

        return $issues;
    }
}
