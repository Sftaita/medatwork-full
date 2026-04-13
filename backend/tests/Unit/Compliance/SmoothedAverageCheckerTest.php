<?php

declare(strict_types=1);

namespace App\Tests\Unit\Compliance;

use App\Compliance\Checker\SmoothedAverageChecker;
use App\Compliance\DTO\WorkSegment;
use App\Compliance\Enum\ComplianceIssueType;
use App\Compliance\Enum\ComplianceSeverity;
use App\Compliance\Timeline\ResidentWorkTimelineBuilder;
use App\Services\Utils\Tools;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

/**
 * Art. 5 §1 — 13-week smoothed average.
 *
 * Thresholds:
 *   Without opting-out: warning > 48 h, critical > 60 h
 *   With opting-out:    warning > 60 h, critical > 72 h
 */
class SmoothedAverageCheckerTest extends TestCase
{
    private SmoothedAverageChecker $checker;
    private \DateTimeImmutable $periodStart;
    private \DateTimeImmutable $periodEnd;

    protected function setUp(): void
    {
        /** @var Tools&MockObject $tools */
        $tools = $this->createMock(Tools::class);
        $tools->method('isHoliday')->willReturn(0);

        $this->checker = new SmoothedAverageChecker(new ResidentWorkTimelineBuilder(), $tools);

        // Single week period (simplifies testing — average = that week's hours)
        $this->periodStart = new \DateTimeImmutable('2026-03-23 00:00:00');
        $this->periodEnd   = new \DateTimeImmutable('2026-03-29 23:59:59');
    }

    /** Build a segment of exactly $hours hours within the period (Monday 08:00) */
    private function makeSegment(float $hours, string $date = '2026-03-23'): WorkSegment
    {
        $start = new \DateTimeImmutable("{$date} 08:00:00");
        $end   = $start->modify("+{$hours} hours");

        return new WorkSegment(start: $start, end: $end, type: 'timesheet');
    }

    // ─── Without opting-out ──────────────────────────────────────────────────────

    public function testNoIssueWhenAverageUnder48h(): void
    {
        $issues = $this->checker->check(
            [$this->makeSegment(40)],
            [],
            $this->periodStart,
            $this->periodEnd,
            false,
        );

        $this->assertCount(0, $issues);
    }

    public function testWarningWhenAverageExactly48h(): void
    {
        // 48 h is not > 48 h, so no warning
        $issues = $this->checker->check(
            [$this->makeSegment(48)],
            [],
            $this->periodStart,
            $this->periodEnd,
            false,
        );

        $this->assertCount(0, $issues);
    }

    public function testWarningWhenAverageOver48h(): void
    {
        $issues = $this->checker->check(
            [$this->makeSegment(50)],
            [],
            $this->periodStart,
            $this->periodEnd,
            false,
        );

        $this->assertCount(1, $issues);
        $this->assertSame(ComplianceIssueType::SmoothedAverageWarning, $issues[0]->type);
        $this->assertSame(ComplianceSeverity::Warning, $issues[0]->severity);
    }

    public function testCriticalWhenAverageOver60h(): void
    {
        $issues = $this->checker->check(
            [$this->makeSegment(62)],
            [],
            $this->periodStart,
            $this->periodEnd,
            false,
        );

        $this->assertCount(1, $issues);
        $this->assertSame(ComplianceIssueType::SmoothedAverageExceeded, $issues[0]->type);
        $this->assertSame(ComplianceSeverity::Critical, $issues[0]->severity);
    }

    // ─── With opting-out ─────────────────────────────────────────────────────────

    public function testNoIssueWithOptingOutAt55h(): void
    {
        $issues = $this->checker->check(
            [$this->makeSegment(55)],
            [],
            $this->periodStart,
            $this->periodEnd,
            true,
        );

        $this->assertCount(0, $issues);
    }

    public function testWarningWithOptingOutAt65h(): void
    {
        $issues = $this->checker->check(
            [$this->makeSegment(65)],
            [],
            $this->periodStart,
            $this->periodEnd,
            true,
        );

        $this->assertCount(1, $issues);
        $this->assertSame(ComplianceIssueType::SmoothedAverageWarning, $issues[0]->type);
        $this->assertEqualsWithDelta(60.0, $issues[0]->context['warningLimit'], 0.01);
    }

    public function testCriticalWithOptingOutAt73h(): void
    {
        $issues = $this->checker->check(
            [$this->makeSegment(73)],
            [],
            $this->periodStart,
            $this->periodEnd,
            true,
        );

        $this->assertCount(1, $issues);
        $this->assertSame(ComplianceIssueType::SmoothedAverageExceeded, $issues[0]->type);
        $this->assertEqualsWithDelta(72.0, $issues[0]->context['criticalLimit'], 0.01);
    }

    public function testEmptySegmentsReturnNoIssues(): void
    {
        $issues = $this->checker->check([], [], $this->periodStart, $this->periodEnd, false);

        $this->assertCount(0, $issues);
    }
}
