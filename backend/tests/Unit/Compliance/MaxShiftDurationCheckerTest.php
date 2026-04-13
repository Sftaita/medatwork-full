<?php

declare(strict_types=1);

namespace App\Tests\Unit\Compliance;

use App\Compliance\Checker\MaxShiftDurationChecker;
use App\Compliance\DTO\WorkSegment;
use App\Compliance\Enum\ComplianceIssueType;
use App\Compliance\Enum\ComplianceSeverity;
use PHPUnit\Framework\TestCase;

/**
 * Art. 5 §2 — Maximum shift duration: 24 h.
 */
class MaxShiftDurationCheckerTest extends TestCase
{
    private MaxShiftDurationChecker $checker;
    private \DateTimeImmutable $periodStart;
    private \DateTimeImmutable $periodEnd;

    protected function setUp(): void
    {
        $this->checker     = new MaxShiftDurationChecker();
        $this->periodStart = new \DateTimeImmutable('2026-03-23 00:00:00');
        $this->periodEnd   = new \DateTimeImmutable('2026-03-29 23:59:59');
    }

    private function makeSegment(string $start, string $end, string $type = 'garde_hospital'): WorkSegment
    {
        return new WorkSegment(
            start: new \DateTimeImmutable($start),
            end: new \DateTimeImmutable($end),
            type: $type,
        );
    }

    public function testNoIssueWhenShiftIs24hExactly(): void
    {
        $segments = [
            $this->makeSegment('2026-03-23 08:00:00', '2026-03-24 08:00:00'), // exactly 24h
        ];

        $issues = $this->checker->check($segments, [], $this->periodStart, $this->periodEnd, false);

        $this->assertCount(0, $issues);
    }

    public function testNoIssueWhenShiftIsUnder24h(): void
    {
        $segments = [
            $this->makeSegment('2026-03-23 08:00:00', '2026-03-23 20:00:00'), // 12h
        ];

        $issues = $this->checker->check($segments, [], $this->periodStart, $this->periodEnd, false);

        $this->assertCount(0, $issues);
    }

    public function testIssueWhenShiftExceeds24h(): void
    {
        $segments = [
            $this->makeSegment('2026-03-23 08:00:00', '2026-03-24 09:00:00'), // 25h
        ];

        $issues = $this->checker->check($segments, [], $this->periodStart, $this->periodEnd, false);

        $this->assertCount(1, $issues);
        $this->assertSame(ComplianceIssueType::MaxShiftDurationExceeded, $issues[0]->type);
        $this->assertSame(ComplianceSeverity::Critical, $issues[0]->severity);
        $this->assertEqualsWithDelta(25.0, $issues[0]->context['durationHours'], 0.01);
    }

    public function testIssueAlsoRaisedWithOptingOut(): void
    {
        // Opting-out does NOT extend the 24h shift limit (Art. 7 preserves Art. 5 §2)
        $segments = [
            $this->makeSegment('2026-03-23 08:00:00', '2026-03-24 09:00:00'), // 25h
        ];

        $issuesWith    = $this->checker->check($segments, [], $this->periodStart, $this->periodEnd, true);
        $issuesWithout = $this->checker->check($segments, [], $this->periodStart, $this->periodEnd, false);

        $this->assertCount(1, $issuesWith);
        $this->assertCount(1, $issuesWithout);
    }

    public function testSegmentOutsidePeriodIsIgnored(): void
    {
        $segments = [
            $this->makeSegment('2026-03-20 08:00:00', '2026-03-21 10:00:00'), // 26h but before period
        ];

        $issues = $this->checker->check($segments, [], $this->periodStart, $this->periodEnd, false);

        $this->assertCount(0, $issues);
    }

    public function testMultipleViolations(): void
    {
        $segments = [
            $this->makeSegment('2026-03-23 08:00:00', '2026-03-24 10:00:00'), // 26h
            $this->makeSegment('2026-03-25 08:00:00', '2026-03-26 09:30:00'), // 25.5h
        ];

        $issues = $this->checker->check($segments, [], $this->periodStart, $this->periodEnd, false);

        $this->assertCount(2, $issues);
    }
}
