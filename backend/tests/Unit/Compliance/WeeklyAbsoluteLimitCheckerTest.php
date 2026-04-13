<?php

declare(strict_types=1);

namespace App\Tests\Unit\Compliance;

use App\Compliance\Checker\WeeklyAbsoluteLimitChecker;
use App\Compliance\DTO\WorkSegment;
use App\Compliance\Enum\ComplianceIssueType;
use App\Compliance\Enum\ComplianceSeverity;
use App\Compliance\Timeline\ResidentWorkTimelineBuilder;
use App\Services\Utils\Tools;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

/**
 * Art. 5 §1 al. 2 — Absolute weekly limit: 60 h (72 h with opting-out).
 */
class WeeklyAbsoluteLimitCheckerTest extends TestCase
{
    private WeeklyAbsoluteLimitChecker $checker;
    private \DateTimeImmutable $periodStart;
    private \DateTimeImmutable $periodEnd;

    protected function setUp(): void
    {
        /** @var Tools&MockObject $tools */
        $tools = $this->createMock(Tools::class);
        $tools->method('isHoliday')->willReturn(0); // not a holiday

        $this->checker     = new WeeklyAbsoluteLimitChecker(new ResidentWorkTimelineBuilder(), $tools);
        $this->periodStart = new \DateTimeImmutable('2026-03-23 00:00:00'); // Monday week 13
        $this->periodEnd   = new \DateTimeImmutable('2026-03-29 23:59:59');
    }

    /** Build a timesheet segment of $hours hours starting Monday 08:00 */
    private function makeSegmentHours(float $hours, string $date = '2026-03-23'): WorkSegment
    {
        $start = new \DateTimeImmutable("{$date} 08:00:00");
        $end   = $start->modify("+{$hours} hours");

        return new WorkSegment(start: $start, end: $end, type: 'timesheet');
    }

    public function testNoIssueWhenUnder60h(): void
    {
        $issues = $this->checker->check(
            [$this->makeSegmentHours(55)],
            [],
            $this->periodStart,
            $this->periodEnd,
            false,
        );

        $this->assertCount(0, $issues);
    }

    public function testNoIssueWhenExactly60h(): void
    {
        $issues = $this->checker->check(
            [$this->makeSegmentHours(60)],
            [],
            $this->periodStart,
            $this->periodEnd,
            false,
        );

        $this->assertCount(0, $issues);
    }

    public function testCriticalIssueWhenOver60h(): void
    {
        $issues = $this->checker->check(
            [$this->makeSegmentHours(62)],
            [],
            $this->periodStart,
            $this->periodEnd,
            false,
        );

        $this->assertCount(1, $issues);
        $this->assertSame(ComplianceIssueType::WeeklyAbsoluteLimitExceeded, $issues[0]->type);
        $this->assertSame(ComplianceSeverity::Critical, $issues[0]->severity);
        $this->assertEqualsWithDelta(62.0, $issues[0]->context['hours'], 0.01);
        $this->assertSame(60.0, $issues[0]->context['limit']);
    }

    public function testNoIssueWithOptingOutAt68h(): void
    {
        $issues = $this->checker->check(
            [$this->makeSegmentHours(68)],
            [],
            $this->periodStart,
            $this->periodEnd,
            true, // opting-out: limit is 72h
        );

        $this->assertCount(0, $issues);
    }

    public function testCriticalIssueWithOptingOutOver72h(): void
    {
        $issues = $this->checker->check(
            [$this->makeSegmentHours(73)],
            [],
            $this->periodStart,
            $this->periodEnd,
            true,
        );

        $this->assertCount(1, $issues);
        $this->assertSame(72.0, $issues[0]->context['limit']);
    }
}
