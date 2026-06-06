<?php

declare(strict_types=1);

namespace App\Services\YearsManagement;

/**
 * Centralized computation of the academic-period string from two dates.
 *
 * Rule:
 *  - Different civil years  → "{startYear}-{endYear}"
 *  - Same civil year        → academic bascule at October 1
 *      start before Oct 1   → "{year-1}-{year}"
 *      start on/after Oct 1 → "{year}-{year+1}"
 *
 * Examples:
 *   2026-06-05 → 2026-10-25  →  "2025-2026"
 *   2026-09-30 → 2026-10-05  →  "2025-2026"
 *   2026-10-01 → 2026-10-25  →  "2026-2027"
 *   2026-10-01 → 2027-09-30  →  "2026-2027"
 */
final class AcademicPeriodHelper
{
    public static function compute(\DateTimeInterface $start, \DateTimeInterface $end): string
    {
        $startYear = (int) $start->format('Y');
        $endYear   = (int) $end->format('Y');

        if ($startYear !== $endYear) {
            return "{$startYear}-{$endYear}";
        }

        // Same civil year: bascule académique au 1er octobre
        $startMonth = (int) $start->format('n');

        if ($startMonth < 10) {
            return ($startYear - 1) . '-' . $startYear;
        }

        return $startYear . '-' . ($startYear + 1);
    }
}
