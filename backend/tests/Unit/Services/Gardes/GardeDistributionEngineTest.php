<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\Gardes;

use App\Services\Gardes\GardeDistributionEngine;
use PHPUnit\Framework\TestCase;

class GardeDistributionEngineTest extends TestCase
{
    private GardeDistributionEngine $engine;

    protected function setUp(): void
    {
        $this->engine = new GardeDistributionEngine();
    }

    // ─── getLevel1Blocks ────────────────────────────────────────────────────

    public function testLevel1BlocksReturnsOnlyMonToThu(): void
    {
        // 2024-03-11 is a Monday; 2024-03-17 is a Sunday
        $dates = $this->engine->getLevel1Blocks('2024-03-11', '2024-03-17');

        $this->assertCount(4, $dates); // Mon Tue Wed Thu
        foreach ($dates as $date) {
            $dayOfWeek = (int) (new \DateTime($date))->format('N');
            $this->assertGreaterThanOrEqual(1, $dayOfWeek);
            $this->assertLessThanOrEqual(4, $dayOfWeek);
        }
    }

    public function testLevel1BlocksEmptyWhenOnlyWeekend(): void
    {
        // 2024-03-16 = Sat, 2024-03-17 = Sun
        $dates = $this->engine->getLevel1Blocks('2024-03-16', '2024-03-17');
        $this->assertSame([], $dates);
    }

    public function testLevel1BlocksIncludesEndDate(): void
    {
        // 2024-03-14 is a Thursday
        $dates = $this->engine->getLevel1Blocks('2024-03-14', '2024-03-14');
        $this->assertSame(['2024-03-14'], $dates);
    }

    // ─── getLevel2Blocks ────────────────────────────────────────────────────

    public function testLevel2BlocksReturnsOnlyFriSatSun(): void
    {
        // 2024-03-11 Mon → 2024-03-17 Sun: should capture Fri 15, Sat 16, Sun 17
        $grouped = $this->engine->getLevel2Blocks('2024-03-11', '2024-03-17');

        $allDates = array_merge(...array_values($grouped));
        $this->assertCount(3, $allDates);

        foreach ($allDates as $date) {
            $dayOfWeek = (int) (new \DateTime($date))->format('N');
            $this->assertGreaterThanOrEqual(5, $dayOfWeek);
        }
    }

    public function testLevel2BlocksGroupsByWeek(): void
    {
        // Two full weekends (week 11 and week 12 of 2024)
        $grouped = $this->engine->getLevel2Blocks('2024-03-11', '2024-03-24');

        $this->assertCount(2, $grouped, 'Expected exactly 2 week groups');
        foreach ($grouped as $week => $days) {
            $this->assertCount(3, $days, "Week $week should have Fri+Sat+Sun");
        }
    }

    public function testLevel2BlocksEmptyForWeekdayOnlyRange(): void
    {
        // 2024-03-11 Mon → 2024-03-14 Thu: no weekends
        $grouped = $this->engine->getLevel2Blocks('2024-03-11', '2024-03-14');
        $this->assertSame([], $grouped);
    }

    // ─── distributeDates ────────────────────────────────────────────────────

    public function testDistributeDatesAssignsAllDatesWhenNoUnavailability(): void
    {
        $participants = [
            ['name' => 'Alice', 'unavailability' => []],
            ['name' => 'Bob',   'unavailability' => []],
        ];

        $result = $this->engine->distributeDates('2024-03-11', '2024-03-17', $participants);

        $this->assertArrayHasKey('assigned_dates', $result);
        $this->assertArrayHasKey('unassigned_dates', $result);
        $this->assertArrayHasKey('justice_table', $result);
        $this->assertEmpty($result['unassigned_dates']);
    }

    public function testDistributeDatesMovesUnassignableToUnassigned(): void
    {
        // Single participant unavailable for every Mon-Thu day
        $level1 = $this->engine->getLevel1Blocks('2024-03-11', '2024-03-14');

        $participants = [
            ['name' => 'Alice', 'unavailability' => $level1],
        ];

        $result = $this->engine->distributeDates('2024-03-11', '2024-03-14', $participants);

        $this->assertCount(count($level1), $result['unassigned_dates']);
        $this->assertArrayNotHasKey('Alice', $result['assigned_dates']);
    }

    public function testDistributeDatesJusticeTableIsInitializedForAllParticipants(): void
    {
        $participants = [
            ['name' => 'Alice', 'unavailability' => []],
            ['name' => 'Bob',   'unavailability' => []],
        ];

        $result = $this->engine->distributeDates('2024-03-11', '2024-03-17', $participants);

        $this->assertArrayHasKey('Alice', $result['justice_table']);
        $this->assertArrayHasKey('Bob', $result['justice_table']);
    }

    public function testDistributeDatesReturnsEmptyArraysForEmptyRange(): void
    {
        $participants = [['name' => 'Alice', 'unavailability' => []]];

        // end < start → no dates
        $result = $this->engine->distributeDates('2024-03-17', '2024-03-11', $participants);

        $this->assertSame([], $result['unassigned_dates']);
        $this->assertSame([], $result['assigned_dates']);
    }
}
