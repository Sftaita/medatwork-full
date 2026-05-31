<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\ManagerMonthValidation;

use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Years;
use App\Repository\PeriodValidationRepository;
use App\Services\ManagerMonthValidation\ValidationPeriodFetcher;
use Doctrine\Common\Collections\ArrayCollection;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

/**
 * Unit — ValidationPeriodFetcher
 *
 * Le service utilise désormais getTrainingSupervisor() (relation Doctrine)
 * et non getMaster() (entier legacy). ManagerRepository n'est plus injecté.
 */
class ValidationPeriodFetcherTest extends TestCase
{
    /** @var PeriodValidationRepository&MockObject */
    private PeriodValidationRepository $periodRepo;

    private ValidationPeriodFetcher $fetcher;

    protected function setUp(): void
    {
        $this->periodRepo = $this->createMock(PeriodValidationRepository::class);
        $this->fetcher    = new ValidationPeriodFetcher($this->periodRepo);
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

    /**
     * Crée une année mock avec un trainingSupervisor optionnel.
     * Utilise getTrainingSupervisor() — PAS getMaster().
     */
    private function makeYear(?Manager $supervisor = null): Years&MockObject
    {
        $y = $this->createMock(Years::class);
        $y->method('getTrainingSupervisor')->willReturn($supervisor);
        return $y;
    }

    private function makeSupervisor(string $firstname, string $lastname): Manager&MockObject
    {
        $m = $this->createMock(Manager::class);
        $m->method('getFirstname')->willReturn($firstname);
        $m->method('getLastname')->willReturn($lastname);
        return $m;
    }

    /** @return array<string, mixed> */
    private function pastPeriod(int $year, int $month): array
    {
        return ['year' => $year, 'month' => $month, 'validated' => false];
    }

    // ─── Tests ────────────────────────────────────────────────────────────────

    public function testSkipsRelationsWithNullYear(): void
    {
        $manager = $this->makeManager([$this->makeRelation(null)]);
        $this->periodRepo->expects($this->never())->method($this->anything());

        $result = $this->fetcher->fetchForManager($manager, true, 'waiting');

        $this->assertSame([], $result);
    }

    public function testCallsFetchInWaitingActiveYearWhenActiveAndWaiting(): void
    {
        $year     = $this->makeYear();
        $manager  = $this->makeManager([$this->makeRelation($year)]);

        $this->periodRepo->expects($this->once())
            ->method('fetchInWaitingPeriodForActiveYear')
            ->willReturn([]);

        $this->fetcher->fetchForManager($manager, true, 'waiting');
    }

    public function testCallsFetchInWaitingAllYearsWhenNotActive(): void
    {
        $year    = $this->makeYear();
        $manager = $this->makeManager([$this->makeRelation($year)]);

        $this->periodRepo->expects($this->once())
            ->method('fetchInWaitingPeriod')
            ->willReturn([]);

        $this->fetcher->fetchForManager($manager, false, 'waiting');
    }

    public function testCallsFetchValidatedActiveYear(): void
    {
        $year    = $this->makeYear();
        $manager = $this->makeManager([$this->makeRelation($year)]);

        $this->periodRepo->expects($this->once())
            ->method('fetchValidatedPeriodForActiveYear')
            ->willReturn([]);

        $this->fetcher->fetchForManager($manager, true, 'validated');
    }

    public function testFiltersPastMonthsOnly(): void
    {
        $year    = $this->makeYear();
        $manager = $this->makeManager([$this->makeRelation($year)]);

        $currentYear  = (int) date('Y');
        $pastPeriod   = $this->pastPeriod($currentYear - 1, 1);
        $futurePeriod = $this->pastPeriod($currentYear + 1, 12);

        $this->periodRepo->method('fetchInWaitingPeriod')->willReturn([$pastPeriod, $futurePeriod]);

        $result = $this->fetcher->fetchForManager($manager, false, 'waiting');

        $this->assertCount(1, $result);
        $this->assertSame($currentYear - 1, $result[0]['year']);
    }

    public function testEnrichesPeriodsWithSupervisorNames(): void
    {
        $supervisor = $this->makeSupervisor('Alice', 'Martin');
        $year       = $this->makeYear($supervisor);
        $manager    = $this->makeManager([$this->makeRelation($year)]);

        $pastPeriod = $this->pastPeriod((int) date('Y') - 1, 1);
        $this->periodRepo->method('fetchInWaitingPeriod')->willReturn([$pastPeriod]);

        $result = $this->fetcher->fetchForManager($manager, false, 'waiting');

        $this->assertCount(1, $result);
        $this->assertSame('Alice',  $result[0]['trainingSupervisorFirstname'],
            'masterFirstname doit venir de trainingSupervisor->getFirstname()');
        $this->assertSame('Martin', $result[0]['trainingSupervisorLastname'],
            'masterLastname doit venir de trainingSupervisor->getLastname()');
    }

    public function testMasterNamesAreNullWhenNoTrainingSupervisor(): void
    {
        $year    = $this->makeYear(null);
        $manager = $this->makeManager([$this->makeRelation($year)]);

        $pastPeriod = $this->pastPeriod((int) date('Y') - 1, 3);
        $this->periodRepo->method('fetchInWaitingPeriod')->willReturn([$pastPeriod]);

        $result = $this->fetcher->fetchForManager($manager, false, 'waiting');

        $this->assertCount(1, $result);
        $this->assertNull($result[0]['trainingSupervisorFirstname'],
            'masterFirstname doit être null si trainingSupervisor est absent');
        $this->assertNull($result[0]['trainingSupervisorLastname'],
            'masterLastname doit être null si trainingSupervisor est absent');
    }

    public function testMultipleYearsAggregatedCorrectly(): void
    {
        $sup1  = $this->makeSupervisor('Jean', 'Dupont');
        $year1 = $this->makeYear($sup1);
        $year2 = $this->makeYear(null);

        $manager = $this->makeManager([
            $this->makeRelation($year1),
            $this->makeRelation($year2),
        ]);

        $past = $this->pastPeriod((int) date('Y') - 1, 6);
        $this->periodRepo->method('fetchInWaitingPeriod')->willReturn([$past]);

        $result = $this->fetcher->fetchForManager($manager, false, 'waiting');

        $this->assertCount(2, $result);

        $withSup    = array_filter($result, fn($r) => $r['trainingSupervisorFirstname'] !== null);
        $withoutSup = array_filter($result, fn($r) => $r['trainingSupervisorFirstname'] === null);

        $this->assertCount(1, $withSup);
        $this->assertCount(1, $withoutSup);
        $this->assertSame('Jean', array_values($withSup)[0]['trainingSupervisorFirstname']);
    }
}
