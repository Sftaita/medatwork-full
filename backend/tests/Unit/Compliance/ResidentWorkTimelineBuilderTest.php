<?php

declare(strict_types=1);

namespace App\Tests\Unit\Compliance;

use App\Compliance\DTO\WorkSegment;
use App\Compliance\Timeline\ResidentWorkTimelineBuilder;
use App\Entity\Garde;
use App\Entity\Timesheet;
use App\Enum\GardeType;
use PHPUnit\Framework\TestCase;

class ResidentWorkTimelineBuilderTest extends TestCase
{
    private ResidentWorkTimelineBuilder $builder;

    protected function setUp(): void
    {
        $this->builder = new ResidentWorkTimelineBuilder();
    }

    private function makeTimesheet(string $start, string $end, int $pauseMinutes = 0): Timesheet
    {
        $ts = new Timesheet();
        $ts->setDateOfStart(new \DateTime($start));
        $ts->setDateOfEnd(new \DateTime($end));
        if ($pauseMinutes > 0) {
            $ts->setPause($pauseMinutes);
        }

        return $ts;
    }

    private function makeGarde(string $start, string $end, GardeType $type): Garde
    {
        $g = new Garde();
        $g->setDateOfStart(new \DateTime($start));
        $g->setDateOfEnd(new \DateTime($end));
        $g->setType($type);

        return $g;
    }

    public function testBuildIncludesTimesheets(): void
    {
        $ts = $this->makeTimesheet('2026-03-23 08:00:00', '2026-03-23 18:00:00', 60);
        $segments = $this->builder->build([$ts], []);

        $this->assertCount(1, $segments);
        $this->assertSame('timesheet', $segments[0]->type);
        $this->assertSame(60 * 60, $segments[0]->pauseSeconds);
        $this->assertEqualsWithDelta(9.0, $segments[0]->durationHours(), 0.01); // 10h - 1h pause
    }

    public function testBuildIncludesHospitalGardes(): void
    {
        $g = $this->makeGarde('2026-03-23 20:00:00', '2026-03-24 08:00:00', GardeType::Hospital);
        $segments = $this->builder->build([], [$g]);

        $this->assertCount(1, $segments);
        $this->assertSame('garde_hospital', $segments[0]->type);
        $this->assertEqualsWithDelta(12.0, $segments[0]->durationHours(), 0.01);
    }

    public function testBuildExcludesCallableGardes(): void
    {
        $g = $this->makeGarde('2026-03-23 20:00:00', '2026-03-24 08:00:00', GardeType::Callable);
        $segments = $this->builder->build([], [$g]);

        $this->assertCount(0, $segments, 'Callable gardes must not appear in the timeline');
    }

    public function testBuildSortsSegmentsByStartAsc(): void
    {
        $ts1 = $this->makeTimesheet('2026-03-24 08:00:00', '2026-03-24 18:00:00');
        $ts2 = $this->makeTimesheet('2026-03-23 08:00:00', '2026-03-23 18:00:00');

        $segments = $this->builder->build([$ts1, $ts2], []);

        $this->assertSame('2026-03-23', $segments[0]->start->format('Y-m-d'));
        $this->assertSame('2026-03-24', $segments[1]->start->format('Y-m-d'));
    }

    public function testGroupByWeekSumsHoursCorrectly(): void
    {
        $periodStart = new \DateTimeImmutable('2026-03-23 00:00:00'); // week 13
        $periodEnd   = new \DateTimeImmutable('2026-03-29 23:59:59');

        $segments = [
            new WorkSegment(
                start: new \DateTimeImmutable('2026-03-23 08:00:00'),
                end: new \DateTimeImmutable('2026-03-23 20:00:00'),
                type: 'timesheet',
            ),
            new WorkSegment(
                start: new \DateTimeImmutable('2026-03-24 08:00:00'),
                end: new \DateTimeImmutable('2026-03-24 16:00:00'),
                type: 'timesheet',
            ),
        ];

        $weekly = $this->builder->groupByWeek($segments, $periodStart, $periodEnd);

        $weekNum = (int) (new \DateTimeImmutable('2026-03-23'))->format('W');
        $this->assertEqualsWithDelta(20.0, $weekly[$weekNum], 0.01); // 12h + 8h
    }
}
