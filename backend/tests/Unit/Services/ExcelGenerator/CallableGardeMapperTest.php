<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\ExcelGenerator;

use App\Services\ExcelGenerator\CallableGardeMapper;
use DateTime;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for CallableGardeMapper::map().
 *
 * Belgian callable-garde rules:
 *  - Active night window: 20:00 → 08:00 next morning
 *  - Shifts starting before 20:00 are split at 20:00
 *  - Multi-day shifts (ending after 08:00 next day) are spread
 *    across intermediate days in 24 h blocks (08:00 → 08:00)
 */
class CallableGardeMapperTest extends TestCase
{
    private CallableGardeMapper $mapper;

    protected function setUp(): void
    {
        $this->mapper = new CallableGardeMapper();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /** @return array{dateOfStart: \DateTime, dateOfEnd: \DateTime, type: string} */
    private function garde(string $start, string $end, string $type = 'callable'): array
    {
        return [
            'dateOfStart' => new DateTime($start),
            'dateOfEnd'   => new DateTime($end),
            'type'        => $type,
        ];
    }

    // ── empty / non-callable ──────────────────────────────────────────────────

    public function testEmptyInputReturnsEmptyArray(): void
    {
        $this->assertSame([], $this->mapper->map([]));
    }

    public function testNonCallableGardesAreIgnored(): void
    {
        $gardes = [
            $this->garde('2026-03-10 20:00', '2026-03-11 08:00', 'hospital'),
            $this->garde('2026-03-12 20:00', '2026-03-13 08:00', 'regular'),
        ];

        $this->assertSame([], $this->mapper->map($gardes));
    }

    public function testMixedTypesOnlyCallablesAppearInResult(): void
    {
        $gardes = [
            $this->garde('2026-03-10 20:00', '2026-03-11 08:00', 'hospital'),
            $this->garde('2026-03-12 20:00', '2026-03-13 08:00', 'callable'),
        ];

        $result = $this->mapper->map($gardes);

        $this->assertCount(1, $result);
        $this->assertArrayHasKey('12-03-2026', $result);
    }

    // ── Case 1a: starts at 20:00, ends at or before 08:00 next day ───────────

    public function testSimpleNightGardeStartingAt20(): void
    {
        $gardes = [$this->garde('2026-03-10 20:00', '2026-03-11 08:00')];

        $result = $this->mapper->map($gardes);

        $this->assertCount(1, $result);
        $this->assertArrayHasKey('10-03-2026', $result);
        $this->assertSame('20:00-08:00', $result['10-03-2026']['interval']);
        $this->assertSame('2026-03', $result['10-03-2026']['month']);
        $this->assertSame('2026-03-10', $result['10-03-2026']['date']);
        $this->assertSame('callable', $result['10-03-2026']['type']);
    }

    public function testNightGardeStartingAfter20(): void
    {
        $gardes = [$this->garde('2026-03-10 21:30', '2026-03-11 07:00')];

        $result = $this->mapper->map($gardes);

        $this->assertCount(1, $result);
        $this->assertSame('21:30-07:00', $result['10-03-2026']['interval']);
    }

    public function testNightGardeEndingExactlyAt08(): void
    {
        $gardes = [$this->garde('2026-03-10 20:00', '2026-03-11 08:00')];

        $result = $this->mapper->map($gardes);

        $this->assertSame('20:00-08:00', $result['10-03-2026']['interval']);
    }

    public function testNightGardeEndingBefore08(): void
    {
        $gardes = [$this->garde('2026-03-10 22:00', '2026-03-11 06:00')];

        $result = $this->mapper->map($gardes);

        $this->assertSame('22:00-06:00', $result['10-03-2026']['interval']);
    }

    // ── Case 1b: starts before 20:00, ends at or before 08:00 next day ───────

    public function testGardeStartingBefore20IsSplitAt20(): void
    {
        $gardes = [$this->garde('2026-03-10 18:00', '2026-03-11 08:00')];

        $result = $this->mapper->map($gardes);

        $this->assertCount(1, $result);
        $this->assertSame('18:00-20:00  20:00-08:00', $result['10-03-2026']['interval']);
    }

    public function testGardeStartingAt08IsSplitAt20(): void
    {
        $gardes = [$this->garde('2026-03-10 08:00', '2026-03-11 08:00')];

        $result = $this->mapper->map($gardes);

        $this->assertSame('08:00-20:00  20:00-08:00', $result['10-03-2026']['interval']);
    }

    public function testGardeStartingAt1959IsSplitAt20(): void
    {
        // 19:59 is just before 20:00 — must be split
        $gardes = [$this->garde('2026-03-10 19:59', '2026-03-11 07:00')];

        $result = $this->mapper->map($gardes);

        $this->assertSame('19:59-20:00  20:00-07:00', $result['10-03-2026']['interval']);
    }

    // ── Case 2: ends after 08:00 next day — multi-day ─────────────────────────

    public function testTwoDayGardeStartingAt20(): void
    {
        // 10th 20:00 → 11th 12:00 (past 08:00 next day → multi-day)
        $gardes = [$this->garde('2026-03-10 20:00', '2026-03-11 12:00')];

        $result = $this->mapper->map($gardes);

        $this->assertCount(1, $result);
        $this->assertArrayHasKey('10-03-2026', $result);
        // First day: starts at 20:00, does not end at/before 08:00 next morning
        $this->assertSame('20:00-08:00', $result['10-03-2026']['interval']);
        // 11th is the endDate — DatePeriod excludes endDate → only 1 entry
    }

    public function testTwoDayGardeStartingBefore20(): void
    {
        // 10th 17:00 → 11th 10:00
        $gardes = [$this->garde('2026-03-10 17:00', '2026-03-11 10:00')];

        $result = $this->mapper->map($gardes);

        $this->assertCount(1, $result);
        // First day: starts before 20:00 → split
        $this->assertSame('17:00-20:00  20:00-08:00', $result['10-03-2026']['interval']);
    }

    public function testThreeDayGardeSpreadAcrossAllDays(): void
    {
        // 10th 20:00 → 12th 09:00  (ends after 08:00 on 12th)
        $gardes = [$this->garde('2026-03-10 20:00', '2026-03-12 09:00')];

        $result = $this->mapper->map($gardes);

        $this->assertCount(2, $result);
        $this->assertArrayHasKey('10-03-2026', $result);
        $this->assertArrayHasKey('11-03-2026', $result);
        // Not present: 12-03-2026 (DatePeriod end date excluded)

        // First day
        $this->assertSame('20:00-08:00', $result['10-03-2026']['interval']);
        // Intermediate 11th: still going past 08:00 of 12th
        $this->assertSame('08:00-08:00', $result['11-03-2026']['interval']);
        $this->assertSame('2026-03-11', $result['11-03-2026']['date']);
        $this->assertSame('2026-03', $result['11-03-2026']['month']);
        $this->assertSame('callable', $result['11-03-2026']['type']);
    }

    public function testThreeDayGardeLastDayEndsAt08(): void
    {
        // 10th 20:00 → 12th 08:00  (ends exactly at 08:00 on 12th)
        $gardes = [$this->garde('2026-03-10 20:00', '2026-03-12 08:00')];

        $result = $this->mapper->map($gardes);

        $this->assertCount(2, $result);
        $this->assertSame('20:00-08:00', $result['10-03-2026']['interval']);
        // 11th: end is exactly 08:00 of 12th — tomorrowAt8 equals end → NOT >= → 08:00-end
        $this->assertSame('08:00-08:00', $result['11-03-2026']['interval']);
    }

    public function testFourDayGardeSpreadsCorrectly(): void
    {
        // 10th 20:00 → 13th 06:00
        $gardes = [$this->garde('2026-03-10 20:00', '2026-03-13 06:00')];

        $result = $this->mapper->map($gardes);

        $this->assertCount(3, $result);
        $this->assertArrayHasKey('10-03-2026', $result);
        $this->assertArrayHasKey('11-03-2026', $result);
        $this->assertArrayHasKey('12-03-2026', $result);

        $this->assertSame('20:00-08:00', $result['10-03-2026']['interval']);
        // 11th: still going past 08:00 of 12th → full block
        $this->assertSame('08:00-08:00', $result['11-03-2026']['interval']);
        // 12th: ends at 06:00 on 13th — before tomorrowAt8 (08:00 of 13th)
        $this->assertSame('08:00-06:00', $result['12-03-2026']['interval']);
    }

    // ── Same-day concatenation ────────────────────────────────────────────────

    public function testTwoGardesOnSameDayAreConcatenated(): void
    {
        $gardes = [
            $this->garde('2026-03-10 20:00', '2026-03-11 00:00'),
            $this->garde('2026-03-10 22:00', '2026-03-11 04:00'),
        ];

        $result = $this->mapper->map($gardes);

        $this->assertCount(1, $result);
        $this->assertSame('20:00-00:00  22:00-04:00', $result['10-03-2026']['interval']);
    }

    public function testThreeGardesOnSameDayAreConcatenated(): void
    {
        $gardes = [
            $this->garde('2026-03-10 20:00', '2026-03-11 00:00'),
            $this->garde('2026-03-10 21:00', '2026-03-11 02:00'),
            $this->garde('2026-03-10 23:00', '2026-03-11 06:00'),
        ];

        $result = $this->mapper->map($gardes);

        $this->assertCount(1, $result);
        $this->assertSame('20:00-00:00  21:00-02:00  23:00-06:00', $result['10-03-2026']['interval']);
    }

    // ── month / date output fields ────────────────────────────────────────────

    public function testOutputFieldsAreCorrectlyFormatted(): void
    {
        $gardes = [$this->garde('2026-01-05 20:00', '2026-01-06 08:00')];

        $result = $this->mapper->map($gardes);

        $this->assertSame('2026-01', $result['05-01-2026']['month']);
        $this->assertSame('2026-01-05', $result['05-01-2026']['date']);
        $this->assertSame('callable', $result['05-01-2026']['type']);
    }

    // ── multiple independent gardes ───────────────────────────────────────────

    public function testMultipleGardesOnDifferentDays(): void
    {
        $gardes = [
            $this->garde('2026-03-10 20:00', '2026-03-11 08:00'),
            $this->garde('2026-03-15 20:00', '2026-03-16 08:00'),
            $this->garde('2026-03-20 20:00', '2026-03-21 08:00'),
        ];

        $result = $this->mapper->map($gardes);

        $this->assertCount(3, $result);
        $this->assertArrayHasKey('10-03-2026', $result);
        $this->assertArrayHasKey('15-03-2026', $result);
        $this->assertArrayHasKey('20-03-2026', $result);
    }

    // ── month boundary ────────────────────────────────────────────────────────

    public function testGardeSpanningMonthBoundary(): void
    {
        // 31st Jan 20:00 → 1st Feb 08:00
        $gardes = [$this->garde('2026-01-31 20:00', '2026-02-01 08:00')];

        $result = $this->mapper->map($gardes);

        // ends exactly at nextDayAt8 → Case 1
        $this->assertCount(1, $result);
        $this->assertArrayHasKey('31-01-2026', $result);
        $this->assertSame('2026-01', $result['31-01-2026']['month']);
        $this->assertSame('20:00-08:00', $result['31-01-2026']['interval']);
    }
}
