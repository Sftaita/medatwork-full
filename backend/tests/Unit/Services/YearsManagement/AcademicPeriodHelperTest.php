<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\YearsManagement;

use App\Services\YearsManagement\AcademicPeriodHelper;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for AcademicPeriodHelper::compute().
 *
 * Rule:
 *  - Different civil years  → "{startYear}-{endYear}"
 *  - Same civil year        → bascule académique au 1er octobre
 *      start before Oct 1   → "{year-1}-{year}"
 *      start on/after Oct 1 → "{year}-{year+1}"
 */
class AcademicPeriodHelperTest extends TestCase
{
    /** @dataProvider periodProvider */
    public function testCompute(string $start, string $end, string $expected): void
    {
        $result = AcademicPeriodHelper::compute(
            new \DateTime($start),
            new \DateTime($end),
        );
        $this->assertSame($expected, $result, "Period({$start} → {$end})");
    }

    public static function periodProvider(): array
    {
        return [
            // ── Cross-year (startYear ≠ endYear) — uses raw years ──────────────
            'Oct→Sep cross-year standard'   => ['2026-10-01', '2027-09-30', '2026-2027'],
            'Jul→Jun cross-year'            => ['2026-07-01', '2027-06-30', '2026-2027'],
            'Sep→Aug cross-year'            => ['2025-09-01', '2026-08-31', '2025-2026'],
            'Jan→Dec cross-year'            => ['2025-01-01', '2026-12-31', '2025-2026'],

            // ── Same civil year, start BEFORE Oct 1 → {year-1}-{year} ──────────
            'Jun→Oct same year (Jun<Oct)'   => ['2026-06-05', '2026-10-25', '2025-2026'],
            'Sep30→Oct5 same year (Sep<Oct)'=> ['2026-09-30', '2026-10-05', '2025-2026'],
            'Jan→Dec same year (Jan<Oct)'   => ['2026-01-01', '2026-12-31', '2025-2026'],
            'Sep→Sep same year (Sep<Oct)'   => ['2026-09-01', '2026-09-30', '2025-2026'],

            // ── Same civil year, start ON or AFTER Oct 1 → {year}-{year+1} ────
            'Oct1→Oct25 same year (Oct1=boundary)' => ['2026-10-01', '2026-10-25', '2026-2027'],
            'Oct15→Dec31 same year (Oct>Oct1)'     => ['2026-10-15', '2026-12-31', '2026-2027'],
            'Nov→Dec same year (Nov>Oct1)'          => ['2026-11-01', '2026-12-31', '2026-2027'],
            'Dec→Dec same year (Dec>Oct1)'          => ['2026-12-01', '2026-12-31', '2026-2027'],
        ];
    }
}
