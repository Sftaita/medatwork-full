<?php

declare(strict_types=1);

namespace App\Tests\Unit\Compliance;

use App\Compliance\Checker\MinimumRestChecker;
use App\Compliance\DTO\WorkSegment;
use App\Compliance\Enum\ComplianceIssueType;
use App\Compliance\Enum\ComplianceSeverity;
use PHPUnit\Framework\TestCase;

/**
 * Art. 5 §3 — Minimum rest (12 h) after a shift ≥ 12 h.
 */
class MinimumRestCheckerTest extends TestCase
{
    private MinimumRestChecker $checker;

    private \DateTimeImmutable $periodStart;
    private \DateTimeImmutable $periodEnd;

    protected function setUp(): void
    {
        $this->checker     = new MinimumRestChecker();
        $this->periodStart = new \DateTimeImmutable('2026-03-23 00:00:00'); // Monday
        $this->periodEnd   = new \DateTimeImmutable('2026-03-29 23:59:59'); // Sunday
    }

    private function makeSegment(string $start, string $end, string $type = 'garde_hospital'): WorkSegment
    {
        return new WorkSegment(
            start: new \DateTimeImmutable($start),
            end: new \DateTimeImmutable($end),
            type: $type,
        );
    }

    // ─── No violation ────────────────────────────────────────────────────────────

    public function testNoViolationWhenRestIsExactly12h(): void
    {
        $segments = [
            $this->makeSegment('2026-03-23 20:00:00', '2026-03-24 08:00:00'), // 12h shift
            $this->makeSegment('2026-03-24 20:00:00', '2026-03-25 04:00:00'), // next shift, 12h rest
        ];

        $issues = $this->checker->check($segments, [], $this->periodStart, $this->periodEnd, false);

        $this->assertCount(0, $issues);
    }

    public function testNoViolationWhenRestIsMoreThan12h(): void
    {
        $segments = [
            $this->makeSegment('2026-03-23 20:00:00', '2026-03-24 08:00:00'), // 12h shift
            $this->makeSegment('2026-03-24 22:00:00', '2026-03-25 06:00:00'), // 14h rest
        ];

        $issues = $this->checker->check($segments, [], $this->periodStart, $this->periodEnd, false);

        $this->assertCount(0, $issues);
    }

    public function testNoViolationWhenShiftIsUnder12h(): void
    {
        $segments = [
            $this->makeSegment('2026-03-23 08:00:00', '2026-03-23 17:00:00'), // 9h shift
            $this->makeSegment('2026-03-23 18:00:00', '2026-03-24 02:00:00'), // only 1h rest — OK because shift < 12h
        ];

        $issues = $this->checker->check($segments, [], $this->periodStart, $this->periodEnd, false);

        $this->assertCount(0, $issues);
    }

    public function testNoViolationWithOnlyOneSegment(): void
    {
        $segments = [
            $this->makeSegment('2026-03-23 20:00:00', '2026-03-24 08:00:00'),
        ];

        $issues = $this->checker->check($segments, [], $this->periodStart, $this->periodEnd, false);

        $this->assertCount(0, $issues);
    }

    // ─── Violation ───────────────────────────────────────────────────────────────

    public function testViolationWhenRestIsUnder12hAfterLongShift(): void
    {
        $segments = [
            $this->makeSegment('2026-03-23 20:00:00', '2026-03-24 08:00:00'), // 12h shift
            $this->makeSegment('2026-03-24 14:00:00', '2026-03-24 22:00:00'), // only 6h rest → violation
        ];

        $issues = $this->checker->check($segments, [], $this->periodStart, $this->periodEnd, false);

        $this->assertCount(1, $issues);
        $this->assertSame(ComplianceIssueType::MinimumRestViolated, $issues[0]->type);
        $this->assertSame(ComplianceSeverity::Critical, $issues[0]->severity);
        $this->assertEqualsWithDelta(6.0, $issues[0]->context['restHours'], 0.01);
    }

    public function testViolationAppliesEvenWithOptingOut(): void
    {
        // Art. 5 §3 is preserved even with opting-out (Art. 7 §1)
        $segments = [
            $this->makeSegment('2026-03-23 20:00:00', '2026-03-24 08:00:00'), // 12h
            $this->makeSegment('2026-03-24 14:00:00', '2026-03-24 22:00:00'), // 6h rest → violation
        ];

        $issuesWithout = $this->checker->check($segments, [], $this->periodStart, $this->periodEnd, false);
        $issuesWith    = $this->checker->check($segments, [], $this->periodStart, $this->periodEnd, true);

        $this->assertCount(1, $issuesWithout);
        $this->assertCount(1, $issuesWith, 'Opting-out does not exempt from the 12h rest rule');
    }

    public function testMultipleViolationsDetected(): void
    {
        $segments = [
            $this->makeSegment('2026-03-23 08:00:00', '2026-03-23 22:00:00'), // 14h
            $this->makeSegment('2026-03-24 04:00:00', '2026-03-24 18:00:00'), // 6h rest → violation 1
            $this->makeSegment('2026-03-25 02:00:00', '2026-03-25 16:00:00'), // 8h rest → violation 2
        ];

        $issues = $this->checker->check($segments, [], $this->periodStart, $this->periodEnd, false);

        $this->assertCount(2, $issues);
    }
}
