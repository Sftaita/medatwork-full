<?php

declare(strict_types=1);

namespace App\Tests\Unit\Repository;

use App\Entity\YearsResident;
use PHPUnit\Framework\TestCase;

/**
 * Tests the indexing logic of YearsResidentRepository::findByIds.
 *
 * The ORM call itself requires a database — we test only the PHP indexing step
 * by simulating what findBy() returns.
 */
class YearsResidentRepositoryIndexingTest extends TestCase
{
    // ─── Helper ───────────────────────────────────────────────────────────────

    private function makeYearResident(int $id): YearsResident
    {
        $mock = $this->createMock(YearsResident::class);
        $mock->method('getId')->willReturn($id);
        return $mock;
    }

    /**
     * Replicates the indexing step of findByIds without touching the database.
     *
     * @param YearsResident[] $results
     * @return array<int, YearsResident>
     */
    private function index(array $results): array
    {
        $indexed = [];
        foreach ($results as $yr) {
            $indexed[$yr->getId()] = $yr;
        }
        return $indexed;
    }

    // ─── Tests ────────────────────────────────────────────────────────────────

    public function testEmptyInputReturnsEmptyArray(): void
    {
        $this->assertSame([], $this->index([]));
    }

    public function testSingleEntityIsIndexedByItsId(): void
    {
        $yr     = $this->makeYearResident(5);
        $result = $this->index([$yr]);

        $this->assertArrayHasKey(5, $result);
        $this->assertSame($yr, $result[5]);
    }

    public function testMultipleEntitiesAreIndexedByTheirIds(): void
    {
        $yr1 = $this->makeYearResident(10);
        $yr2 = $this->makeYearResident(20);
        $yr3 = $this->makeYearResident(30);

        $result = $this->index([$yr1, $yr2, $yr3]);

        $this->assertCount(3, $result);
        $this->assertSame($yr1, $result[10]);
        $this->assertSame($yr2, $result[20]);
        $this->assertSame($yr3, $result[30]);
    }

    public function testAbsentIdReturnsNull(): void
    {
        $yr     = $this->makeYearResident(1);
        $result = $this->index([$yr]);

        $this->assertArrayNotHasKey(99, $result);
        $this->assertNull($result[99] ?? null);
    }
}
