<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\Gardes;

use App\Services\Gardes\ShiftAssignmentEngine;
use PHPUnit\Framework\TestCase;

class ShiftAssignmentEngineTest extends TestCase
{
    private ShiftAssignmentEngine $engine;

    /** @var array<int, array<string, mixed>> */
    private array $residents = [
        ['id' => 1, 'lastname' => 'Alpha',   'firstname' => 'A', 'unavailableDays' => []],
        ['id' => 2, 'lastname' => 'Bravo',   'firstname' => 'B', 'unavailableDays' => []],
        ['id' => 3, 'lastname' => 'Charlie', 'firstname' => 'C', 'unavailableDays' => []],
    ];

    protected function setUp(): void
    {
        $this->engine = new ShiftAssignmentEngine();
    }

    // ─── checkAssignedLastWeekend ───────────────────────────────────────────

    public function testCheckAssignedLastWeekendReturnsFalseWhenEmpty(): void
    {
        $this->assertFalse($this->engine->checkAssignedLastWeekend(['id' => 1], []));
    }

    public function testCheckAssignedLastWeekendReturnsTrueWhenPresent(): void
    {
        $assignedLastWeekend = [
            ['date' => '2024-03-15', 'resident' => ['id' => 1, 'firstname' => 'A', 'lastname' => 'Alpha']],
        ];

        $this->assertTrue($this->engine->checkAssignedLastWeekend(['id' => 1], $assignedLastWeekend));
    }

    public function testCheckAssignedLastWeekendReturnsFalseForDifferentResident(): void
    {
        $assignedLastWeekend = [
            ['date' => '2024-03-15', 'resident' => ['id' => 2, 'firstname' => 'B', 'lastname' => 'Bravo']],
        ];

        $this->assertFalse($this->engine->checkAssignedLastWeekend(['id' => 1], $assignedLastWeekend));
    }

    // ─── assignWeekdayDays ──────────────────────────────────────────────────

    public function testAssignWeekdayDaysReturnsBothKeys(): void
    {
        $result = $this->engine->assignWeekdayDays($this->residents, '2024-03-11', '2024-03-17');

        $this->assertArrayHasKey('nbOfShift', $result);
        $this->assertArrayHasKey('assignedDays', $result);
    }

    public function testAssignWeekdayDaysInitializesPointsForAllResidents(): void
    {
        $result = $this->engine->assignWeekdayDays($this->residents, '2024-03-11', '2024-03-14');

        foreach ($this->residents as $r) {
            $this->assertArrayHasKey($r['id'], $result['nbOfShift']);
        }
    }

    public function testAssignWeekdayDaysAssignsCorrectDayCount(): void
    {
        // Mon 11 to Thu 14 → 4 weekdays
        $result = $this->engine->assignWeekdayDays($this->residents, '2024-03-11', '2024-03-14');

        $this->assertCount(4, $result['assignedDays']);
    }

    public function testAssignWeekdayDaysRespectUnavailability(): void
    {
        $blockedDates = ['2024-03-11', '2024-03-12', '2024-03-13', '2024-03-14'];

        $residents = [
            ['id' => 1, 'lastname' => 'A', 'firstname' => 'a', 'unavailableDays' => $blockedDates],
            ['id' => 2, 'lastname' => 'B', 'firstname' => 'b', 'unavailableDays' => []],
        ];

        $result = $this->engine->assignWeekdayDays($residents, '2024-03-11', '2024-03-14');

        // Resident 1 should have 0 shifts
        $this->assertSame(0, $result['nbOfShift'][1]);
        // Resident 2 should get all 4 days
        $this->assertSame(4, $result['nbOfShift'][2]);
    }

    public function testAssignWeekdayDaysSortedByDate(): void
    {
        $result = $this->engine->assignWeekdayDays($this->residents, '2024-03-11', '2024-03-14');
        $dates  = array_column($result['assignedDays'], 'date');

        $sorted = $dates;
        sort($sorted);
        $this->assertSame($sorted, $dates);
    }

    // ─── assignWeekendDays ──────────────────────────────────────────────────

    public function testAssignWeekendDaysReturnsBothKeys(): void
    {
        $result = $this->engine->assignWeekendDays($this->residents, '2024-03-11', '2024-03-17');

        $this->assertArrayHasKey('nbOfShift', $result);
        $this->assertArrayHasKey('assignedDays', $result);
    }

    public function testAssignWeekendDaysAssignsOneFriSatSunBlock(): void
    {
        // One full weekend: Fri 15, Sat 16, Sun 17
        $result = $this->engine->assignWeekendDays($this->residents, '2024-03-11', '2024-03-17');

        $this->assertCount(3, $result['assignedDays']);
    }

    public function testAssignWeekendDaysPreventBackToBackWeekends(): void
    {
        // Only 2 residents, 2 consecutive weekends → same resident cannot get both
        $residents = [
            ['id' => 1, 'lastname' => 'A', 'firstname' => 'a', 'unavailableDays' => []],
            ['id' => 2, 'lastname' => 'B', 'firstname' => 'b', 'unavailableDays' => []],
        ];

        // Two weekends: week11 (15-17 Mar) and week12 (22-24 Mar)
        $result = $this->engine->assignWeekendDays($residents, '2024-03-11', '2024-03-24');

        // Collect who worked each weekend by date
        $byDate = array_column($result['assignedDays'], 'resident', 'date');

        $weekend1Id = $byDate['2024-03-15']['id'] ?? null;
        $weekend2Id = $byDate['2024-03-22']['id'] ?? null;

        $this->assertNotNull($weekend1Id);
        $this->assertNotNull($weekend2Id);
        $this->assertNotSame($weekend1Id, $weekend2Id, 'Same resident should not work two consecutive weekends');
    }
}
