<?php

declare(strict_types=1);

namespace App\Tests\Unit\Repository;

use App\Entity\Absence;
use App\Entity\Resident;
use PHPUnit\Framework\TestCase;

/**
 * Tests the grouping logic of AbsenceRepository::findByYearGroupedByResident.
 *
 * The DQL query itself requires a database — we test only the PHP grouping step
 * by simulating what the query returns (an array of Absence entities).
 */
class AbsenceRepositoryGroupingTest extends TestCase
{
    // ─── Helper ───────────────────────────────────────────────────────────────

    private function makeAbsence(int $residentId): Absence
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getId')->willReturn($residentId);

        $absence = $this->createMock(Absence::class);
        $absence->method('getResident')->willReturn($resident);

        return $absence;
    }

    /**
     * Replicates the grouping logic of findByYearGroupedByResident without
     * touching the database.
     *
     * @param Absence[] $absences
     * @return array<int, list<Absence>>
     */
    private function group(array $absences): array
    {
        $grouped = [];
        foreach ($absences as $absence) {
            $grouped[$absence->getResident()->getId()][] = $absence;
        }
        return $grouped;
    }

    // ─── Tests ────────────────────────────────────────────────────────────────

    public function testEmptyInputReturnsEmptyArray(): void
    {
        $this->assertSame([], $this->group([]));
    }

    public function testSingleAbsenceIsGroupedUnderItsResident(): void
    {
        $absence = $this->makeAbsence(42);
        $result  = $this->group([$absence]);

        $this->assertArrayHasKey(42, $result);
        $this->assertCount(1, $result[42]);
        $this->assertSame($absence, $result[42][0]);
    }

    public function testMultipleAbsencesForSameResidentAreGroupedTogether(): void
    {
        $a1 = $this->makeAbsence(7);
        $a2 = $this->makeAbsence(7);
        $a3 = $this->makeAbsence(7);

        $result = $this->group([$a1, $a2, $a3]);

        $this->assertCount(1, $result);
        $this->assertCount(3, $result[7]);
    }

    public function testAbsencesForDifferentResidentsAreInSeparateBuckets(): void
    {
        $a1 = $this->makeAbsence(1);
        $a2 = $this->makeAbsence(2);
        $a3 = $this->makeAbsence(1);

        $result = $this->group([$a1, $a2, $a3]);

        $this->assertCount(2, $result);
        $this->assertCount(2, $result[1]);
        $this->assertCount(1, $result[2]);
    }

    public function testResidentWithNoAbsenceIsAbsentFromResult(): void
    {
        $a1 = $this->makeAbsence(10);
        $result = $this->group([$a1]);

        $this->assertArrayNotHasKey(99, $result);
    }
}
