<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\ManagerMonthValidation;

use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Years;
use App\Repository\ManagerRepository;
use App\Repository\PeriodValidationRepository;
use App\Services\ManagerMonthValidation\ValidationPeriodFetcher;
use Doctrine\Common\Collections\ArrayCollection;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class ValidationPeriodFetcherTest extends TestCase
{
    /** @var ManagerRepository&MockObject */
    private ManagerRepository $managerRepo;

    /** @var PeriodValidationRepository&MockObject */
    private PeriodValidationRepository $periodRepo;

    private ValidationPeriodFetcher $fetcher;

    protected function setUp(): void
    {
        $this->managerRepo = $this->createMock(ManagerRepository::class);
        $this->periodRepo  = $this->createMock(PeriodValidationRepository::class);

        $this->fetcher = new ValidationPeriodFetcher($this->managerRepo, $this->periodRepo);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** @param list<ManagerYears&MockObject> $relations */
    private function makeManager(array $relations): Manager&MockObject
    {
        $m = $this->createMock(Manager::class);
        $m->method('getManagerYears')->willReturn(new ArrayCollection($relations));

        return $m;
    }

    private function makeRelation(?Years $year): ManagerYears&MockObject
    {
        $rel = $this->createMock(ManagerYears::class);
        $rel->method('getYears')->willReturn($year);

        return $rel;
    }

    private function makeYear(?int $masterId = null): Years&MockObject
    {
        $y = $this->createMock(Years::class);
        $y->method('getMaster')->willReturn($masterId);

        return $y;
    }

    /** @return array<string, mixed> */
    private function pastPeriod(int $year, int $month): array
    {
        return ['year' => $year, 'month' => $month, 'validated' => false];
    }

    // ─── fetchForManager ──────────────────────────────────────────────────────

    public function testReturnsEmptyArrayWhenManagerNotFound(): void
    {
        $manager = $this->createMock(Manager::class);
        $this->managerRepo->method('findOneBy')->willReturn(null);

        $result = $this->fetcher->fetchForManager($manager, true, 'waiting');

        $this->assertSame([], $result);
    }

    public function testSkipsRelationsWithNullYear(): void
    {
        $manager  = $this->makeManager([$this->makeRelation(null)]);
        $this->managerRepo->method('findOneBy')->willReturn($manager);
        $this->periodRepo->expects($this->never())->method($this->anything());

        $result = $this->fetcher->fetchForManager($manager, true, 'waiting');

        $this->assertSame([], $result);
    }

    public function testCallsFetchInWaitingActiveYearWhenActiveAndWaiting(): void
    {
        $year     = $this->makeYear();
        $relation = $this->makeRelation($year);
        $manager  = $this->makeManager([$relation]);

        $this->managerRepo->method('findOneBy')->willReturn($manager);
        $this->periodRepo->expects($this->once())
            ->method('fetchInWaitingPeriodForActiveYear')
            ->willReturn([]);

        $this->fetcher->fetchForManager($manager, true, 'waiting');
    }

    public function testCallsFetchInWaitingAllYearsWhenNotActive(): void
    {
        $year     = $this->makeYear();
        $relation = $this->makeRelation($year);
        $manager  = $this->makeManager([$relation]);

        $this->managerRepo->method('findOneBy')->willReturn($manager);
        $this->periodRepo->expects($this->once())
            ->method('fetchInWaitingPeriod')
            ->willReturn([]);

        $this->fetcher->fetchForManager($manager, false, 'waiting');
    }

    public function testCallsFetchValidatedActiveYear(): void
    {
        $year     = $this->makeYear();
        $relation = $this->makeRelation($year);
        $manager  = $this->makeManager([$relation]);

        $this->managerRepo->method('findOneBy')->willReturn($manager);
        $this->periodRepo->expects($this->once())
            ->method('fetchValidatedPeriodForActiveYear')
            ->willReturn([]);

        $this->fetcher->fetchForManager($manager, true, 'validated');
    }

    public function testFiltersPastMonthsOnly(): void
    {
        $year     = $this->makeYear();
        $relation = $this->makeRelation($year);
        $manager  = $this->makeManager([$relation]);

        $this->managerRepo->method('findOneBy')->willReturn($manager);

        // Mix of past and future months
        $currentYear  = (int) date('Y');
        $pastPeriod   = $this->pastPeriod($currentYear - 1, 1);       // clearly past
        $futurePeriod = $this->pastPeriod($currentYear + 1, 12);      // clearly future

        $this->periodRepo->method('fetchInWaitingPeriod')->willReturn([$pastPeriod, $futurePeriod]);

        $result = $this->fetcher->fetchForManager($manager, false, 'waiting');

        $this->assertCount(1, $result);
        $this->assertSame($currentYear - 1, $result[0]['year']);
    }

    public function testEnrichesPeriodsWithMasterNames(): void
    {
        $year     = $this->makeYear(7); // masterId = 7
        $relation = $this->makeRelation($year);
        $manager  = $this->makeManager([$relation]);

        $masterEntity = $this->createMock(Manager::class);
        $masterEntity->method('getFirstname')->willReturn('Alice');
        $masterEntity->method('getLastname')->willReturn('Martin');

        // First call: manager lookup; second call: master lookup
        $this->managerRepo->method('findOneBy')
            ->willReturnOnConsecutiveCalls($manager, $masterEntity);

        $pastPeriod = $this->pastPeriod((int) date('Y') - 1, 1);
        $this->periodRepo->method('fetchInWaitingPeriod')->willReturn([$pastPeriod]);

        $result = $this->fetcher->fetchForManager($manager, false, 'waiting');

        $this->assertCount(1, $result);
        $this->assertSame('Alice', $result[0]['masterFirstname']);
        $this->assertSame('Martin', $result[0]['masterLastname']);
    }

    public function testMasterNamesAreNullWhenNoMasterId(): void
    {
        $year     = $this->makeYear(null); // no master
        $relation = $this->makeRelation($year);
        $manager  = $this->makeManager([$relation]);

        $this->managerRepo->method('findOneBy')->willReturn($manager);

        $pastPeriod = $this->pastPeriod((int) date('Y') - 1, 3);
        $this->periodRepo->method('fetchInWaitingPeriod')->willReturn([$pastPeriod]);

        $result = $this->fetcher->fetchForManager($manager, false, 'waiting');

        $this->assertCount(1, $result);
        $this->assertNull($result[0]['masterFirstname']);
        $this->assertNull($result[0]['masterLastname']);
    }
}
