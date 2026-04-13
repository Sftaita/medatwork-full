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
 * Art. 5 §1 alinéa 2 — Absolute weekly limit per calendar week.
 *
 * Thresholds:
 *   Without opting-out: critical > 60 h/week
 *   With opting-out:    critical > 72 h/week
 *
 * This is an absolute limit — there is no "warning" zone here.
 */
final class WeeklyAbsoluteLimitChecker implements ComplianceCheckerInterface
{
    private const ABSENCE_DAILY_SECONDS = (9 * 3600) + (36 * 60);

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
        $limit = $optingOut ? 72.0 : 60.0;
        $issues = [];

        foreach ($weeklyHours as $weekNum => $hours) {
            if ($hours > $limit) {
                $weekStart = $this->weekNumToMonday($weekNum, (int) $periodStart->format('Y'));
                $issues[] = new ComplianceIssue(
                    type: ComplianceIssueType::WeeklyAbsoluteLimitExceeded,
                    severity: ComplianceSeverity::Critical,
                    weekStart: $weekStart,
                    description: sprintf(
                        'La semaine %d dépasse la limite absolue hebdomadaire (%.1f h > %.0f h autorisées).',
                        $weekNum,
                        $hours,
                        $limit,
                    ),
                    context: [
                        'weekNumber' => $weekNum,
                        'hours'      => round($hours, 2),
                        'limit'      => $limit,
                    ],
                );
            }
        }

        return $issues;
    }

    /** @return array<int, float> */
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

    private function weekNumToMonday(int $weekNum, int $year): string
    {
        $dt = new \DateTimeImmutable();
        $dt = $dt->setISODate($year, $weekNum, 1); // 1 = Monday

        return $dt->format('Y-m-d');
    }
}
