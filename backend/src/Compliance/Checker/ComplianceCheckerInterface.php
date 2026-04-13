<?php

declare(strict_types=1);

namespace App\Compliance\Checker;

use App\Compliance\DTO\ComplianceIssue;
use App\Compliance\DTO\WorkSegment;
use App\Entity\Absence;

interface ComplianceCheckerInterface
{
    /**
     * Run compliance checks for one resident over a given period.
     *
     * @param WorkSegment[]            $segments    Sorted ASC by start
     * @param Absence[]                $absences
     * @param \DateTimeImmutable       $periodStart Start of the 13-week legal period (Monday)
     * @param \DateTimeImmutable       $periodEnd   End of the period
     * @param bool                     $optingOut   Whether the resident signed the opting-out agreement
     *
     * @return ComplianceIssue[]
     */
    public function check(
        array $segments,
        array $absences,
        \DateTimeImmutable $periodStart,
        \DateTimeImmutable $periodEnd,
        bool $optingOut,
    ): array;
}
