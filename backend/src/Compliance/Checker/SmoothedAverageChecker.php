<?php

declare(strict_types=1);

namespace App\Compliance\Checker;

use App\Compliance\DTO\ComplianceIssue;
use App\Compliance\DTO\WorkSegment;
use App\Compliance\Enum\ComplianceIssueType;
use App\Compliance\Enum\ComplianceSeverity;
use App\Compliance\Timeline\ResidentWorkTimelineBuilder;
use App\Entity\Absence;
use App\Enum\AbsenceType;
use App\Services\Utils\Tools;

/**
 * Art. 5 §1 — Smoothed average over 13 consecutive weeks.
 *
 * Thresholds:
 *   Without opting-out: warning > 48 h, critical > 60 h
 *   With opting-out:    warning > 60 h, critical > 72 h
 */
final class SmoothedAverageChecker implements ComplianceCheckerInterface
{
    private const ABSENCE_DAILY_SECONDS = (9 * 3600) + (36 * 60); // 9h36

    public function __construct(
        private readonly ResidentWorkTimelineBuilder $timelineBuilder,
        private readonly Tools $tools,
    ) {
    }

    public function check(
        array $segments,
        array $absences,
        \DateTimeImmutable $periodStart,
        \DateTimeImmutable $periodEnd,
        bool $optingOut,
    ): array {
        $weeklyHours = $this->computeWeeklyHours($segments, $absences, $periodStart, $periodEnd);
        $totalWeeks  = count($weeklyHours);

        if ($totalWeeks === 0) {
            return [];
        }

        $averageHours = array_sum($weeklyHours) / $totalWeeks;

        [$warningLimit, $criticalLimit] = $optingOut ? [60.0, 72.0] : [48.0, 60.0];

        $issues = [];
        $weekStart = $periodStart->format('Y-m-d');

        if ($averageHours > $criticalLimit) {
            $issues[] = new ComplianceIssue(
                type: ComplianceIssueType::SmoothedAverageExceeded,
                severity: ComplianceSeverity::Critical,
                weekStart: $weekStart,
                description: sprintf(
                    'La moyenne lissée sur %d semaines est de %.1f h (limite légale : %.0f h).',
                    $totalWeeks,
                    $averageHours,
                    $criticalLimit,
                ),
                context: [
                    'averageHours' => round($averageHours, 2),
                    'totalWeeks'   => $totalWeeks,
                    'criticalLimit' => $criticalLimit,
                    'weeklyHours'  => $weeklyHours,
                ],
            );
        } elseif ($averageHours > $warningLimit) {
            $issues[] = new ComplianceIssue(
                type: ComplianceIssueType::SmoothedAverageWarning,
                severity: ComplianceSeverity::Warning,
                weekStart: $weekStart,
                description: sprintf(
                    'La moyenne lissée sur %d semaines est de %.1f h (seuil d\'attention : %.0f h).',
                    $totalWeeks,
                    $averageHours,
                    $warningLimit,
                ),
                context: [
                    'averageHours' => round($averageHours, 2),
                    'totalWeeks'   => $totalWeeks,
                    'warningLimit' => $warningLimit,
                    'weeklyHours'  => $weeklyHours,
                ],
            );
        }

        return $issues;
    }

    /** @return array<int, float>  weekNumber => hours */
    private function computeWeeklyHours(
        array $segments,
        array $absences,
        \DateTimeImmutable $periodStart,
        \DateTimeImmutable $periodEnd,
    ): array {
        $weeklyHours = $this->timelineBuilder->groupByWeek($segments, $periodStart, $periodEnd);

        foreach ($absences as $absence) {
            if ($absence->getType() === AbsenceType::Recovery) {
                continue;
            }

            $date = $absence->getDateOfStart();
            if ($date === null) {
                continue;
            }

            $absStart = \DateTimeImmutable::createFromInterface($date);
            if ($absStart < $periodStart || $absStart > $periodEnd) {
                continue;
            }

            if ($this->tools->isHoliday($absStart->getTimestamp()) !== 0) {
                continue;
            }

            $weekNum = (int) $absStart->format('W');
            if (isset($weeklyHours[$weekNum])) {
                $weeklyHours[$weekNum] += self::ABSENCE_DAILY_SECONDS / 3600;
            }
        }

        return $weeklyHours;
    }
}
