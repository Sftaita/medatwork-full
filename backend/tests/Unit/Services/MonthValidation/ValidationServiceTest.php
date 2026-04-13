<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\MonthValidation;

use App\Entity\PeriodValidation;
use App\Entity\Resident;
use App\Entity\ResidentValidation;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\PeriodValidationRepository;
use App\Repository\ResidentValidationRepository;
use App\Services\MonthValidation\ValidationService;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class ValidationServiceTest extends TestCase
{
    /** @var PeriodValidationRepository&MockObject */
    private PeriodValidationRepository $periodRepo;

    /** @var ResidentValidationRepository&MockObject */
    private ResidentValidationRepository $residentValidationRepo;

    /** @var EntityManagerInterface&MockObject */
    private EntityManagerInterface $em;

    private ValidationService $service;

    protected function setUp(): void
    {
        $this->periodRepo             = $this->createMock(PeriodValidationRepository::class);
        $this->residentValidationRepo = $this->createMock(ResidentValidationRepository::class);
        $this->em                     = $this->createMock(EntityManagerInterface::class);

        $this->service = new ValidationService(
            $this->em,
            $this->periodRepo,
            $this->residentValidationRepo,
        );
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function makeResident(int $id): Resident&MockObject
    {
        $r = $this->createMock(Resident::class);
        $r->method('getId')->willReturn($id);

        return $r;
    }

    private function makeYearsResident(int $residentId): YearsResident&MockObject
    {
        $yr = $this->createMock(YearsResident::class);
        $yr->method('getResident')->willReturn($this->makeResident($residentId));

        return $yr;
    }

    private function makeYear(int ...$residentIds): Years&MockObject
    {
        $collection = new ArrayCollection(
            array_map(fn (int $id) => $this->makeYearsResident($id), $residentIds)
        );
        $year = $this->createMock(Years::class);
        $year->method('getResidents')->willReturn($collection);

        return $year;
    }

    private function makePeriod(?Years $year = null): PeriodValidation&MockObject
    {
        $period = $this->createMock(PeriodValidation::class);
        $period->method('getYear')->willReturn($year ?? $this->makeYear());

        return $period;
    }

    // ─── getOrCreateResidentValidation ───────────────────────────────────────

    public function testGetOrCreateThrowsWhenPeriodNotFound(): void
    {
        $this->periodRepo->method('find')->willReturn(null);

        $this->expectException(\Exception::class);
        $this->service->getOrCreateResidentValidation(99, $this->makeResident(1));
    }

    public function testGetOrCreateReturnsExistingValidation(): void
    {
        $resident   = $this->makeResident(1);
        $period     = $this->makePeriod();
        $existing   = new ResidentValidation();

        $this->periodRepo->method('find')->willReturn($period);
        $this->residentValidationRepo->method('findOneBy')->willReturn($existing);

        $result = $this->service->getOrCreateResidentValidation(1, $resident);

        $this->assertSame($existing, $result);
    }

    public function testGetOrCreateThrowsWhenResidentNotInYear(): void
    {
        $resident = $this->makeResident(42);
        $year     = $this->makeYear(1, 2, 3); // resident 42 not in year
        $period   = $this->makePeriod($year);

        $this->periodRepo->method('find')->willReturn($period);
        $this->residentValidationRepo->method('findOneBy')->willReturn(null);

        $this->expectException(\Exception::class);
        $this->service->getOrCreateResidentValidation(1, $resident);
    }

    public function testGetOrCreateCreatesNewValidationWhenResidentInYear(): void
    {
        $resident = $this->makeResident(5);
        $year     = $this->makeYear(5, 6); // resident 5 is in year
        $period   = $this->makePeriod($year);

        $this->periodRepo->method('find')->willReturn($period);
        $this->residentValidationRepo->method('findOneBy')->willReturn(null);

        $result = $this->service->getOrCreateResidentValidation(1, $resident);

        $this->assertSame($resident, $result->getResident());
        $this->assertSame($period, $result->getPeriodValidation());
        $this->assertFalse($result->getValidated());
    }

    // ─── getAndEnsureResidentValidations ─────────────────────────────────────

    public function testGetAndEnsureReturnsExistingValidationWithoutPersist(): void
    {
        $resident  = $this->makeResident(1);
        $period    = $this->makePeriod();
        $existing  = new ResidentValidation();

        $this->residentValidationRepo->method('findOneBy')->willReturn($existing);
        $this->em->expects($this->never())->method('persist');
        $this->em->expects($this->never())->method('flush');

        $result = $this->service->getAndEnsureResidentValidations([$resident], [$period]);

        $this->assertCount(1, $result);
        $this->assertSame($existing, $result[0]);
    }

    public function testGetAndEnsureCreatesAndPersistsNewValidation(): void
    {
        $resident = $this->makeResident(1);
        $period   = $this->makePeriod();

        $this->residentValidationRepo->method('findOneBy')->willReturn(null);
        $this->em->expects($this->once())->method('persist');
        $this->em->expects($this->once())->method('flush');

        $result = $this->service->getAndEnsureResidentValidations([$resident], [$period]);

        $this->assertCount(1, $result);
        $this->assertSame($resident, $result[0]->getResident());
        $this->assertSame($period, $result[0]->getPeriodValidation());
    }

    public function testGetAndEnsureHandlesMultipleResidentsAndPeriods(): void
    {
        $r1 = $this->makeResident(1);
        $r2 = $this->makeResident(2);
        $p1 = $this->makePeriod();
        $p2 = $this->makePeriod();

        // All 4 combinations are new (no existing)
        $this->residentValidationRepo->method('findOneBy')->willReturn(null);
        $this->em->expects($this->exactly(4))->method('persist');
        $this->em->expects($this->exactly(4))->method('flush');

        $result = $this->service->getAndEnsureResidentValidations([$r1, $r2], [$p1, $p2]);

        $this->assertCount(4, $result);
    }

    public function testGetAndEnsureEmptyInputsReturnsEmptyArray(): void
    {
        $result = $this->service->getAndEnsureResidentValidations([], []);

        $this->assertSame([], $result);
    }
}
