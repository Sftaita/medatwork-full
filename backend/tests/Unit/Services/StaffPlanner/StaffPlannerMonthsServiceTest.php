<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\StaffPlanner;

use App\Entity\Manager;
use App\Entity\PeriodValidation;
use App\Entity\Resident;
use App\Entity\ResidentValidation;
use App\Entity\StaffPlannerExportStatus;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\ResidentValidationRepository;
use App\Repository\StaffPlannerExportStatusRepository;
use App\Repository\YearsResidentRepository;
use App\Services\StaffPlanner\StaffPlannerMonthsService;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

class StaffPlannerMonthsServiceTest extends TestCase
{
    // ── listMonthsForYear ──────────────────────────────────────────────────────

    public function testListReturnsOneEntryPerMonth(): void
    {
        $year   = $this->makeYear('2024-11-01', '2025-01-31', []);
        $months = $this->makeService()->listMonthsForYear($year);
        $this->assertCount(3, $months);
    }

    public function testListLabelsAreInFrench(): void
    {
        $year   = $this->makeYear('2024-11-01', '2024-11-30', []);
        $months = $this->makeService()->listMonthsForYear($year);
        $this->assertSame('Novembre 2024', $months[0]['label']);
    }

    public function testEmptyMaccsWhenNoYearsResidents(): void
    {
        $year   = $this->makeYear('2024-11-01', '2024-11-30', []);
        $months = $this->makeService()->listMonthsForYear($year);
        $this->assertSame([], $months[0]['items']);
    }

    public function testAllMaccsAppearsEvenWithoutResidentValidation(): void
    {
        $resident = $this->makeResident(1, 'Alice', 'Martin');
        $yr       = $this->makeYr(10, $resident);
        $year     = $this->makeYear('2024-11-01', '2024-11-30', [$yr]);

        $months = $this->makeService()->listMonthsForYear($year);

        $this->assertCount(1, $months[0]['items']);
        $item = $months[0]['items'][0];
        $this->assertSame(10, $item['yearResidentId']);
        $this->assertNull($item['residentValidationId']);
        $this->assertFalse($item['validatedByMds']); // no RV → false
    }

    public function testValidatedByMdsTrueWhenRvValidatedExists(): void
    {
        $resident = $this->makeResident(1, 'Alice', 'Martin');
        $yr       = $this->makeYr(10, $resident);
        $pv       = $this->makePv(11, 2024);
        $rv       = $this->makeRv(99, $resident, $pv, validated: true);
        $year     = $this->makeYear('2024-11-01', '2024-11-30', [$yr], [$pv]);

        $months = $this->makeService(rvIndex: [$resident->getId() . '-' . $pv->getId() => $rv])
            ->listMonthsForYear($year);

        $this->assertTrue($months[0]['items'][0]['validatedByMds']);
        $this->assertSame(99, $months[0]['items'][0]['residentValidationId']);
    }

    public function testValidatedByMdsFalseWhenRvNotValidated(): void
    {
        $resident = $this->makeResident(1, 'Alice', 'Martin');
        $yr       = $this->makeYr(10, $resident);
        $pv       = $this->makePv(11, 2024);
        $rv       = $this->makeRv(99, $resident, $pv, validated: false);
        $year     = $this->makeYear('2024-11-01', '2024-11-30', [$yr], [$pv]);

        $months = $this->makeService(rvIndex: [$resident->getId() . '-' . $pv->getId() => $rv])
            ->listMonthsForYear($year);

        $this->assertFalse($months[0]['items'][0]['validatedByMds']);
    }

    public function testTreatedFalseWhenNoExportStatus(): void
    {
        $resident = $this->makeResident(1, 'Alice', 'Martin');
        $yr       = $this->makeYr(10, $resident);
        $year     = $this->makeYear('2024-11-01', '2024-11-30', [$yr]);

        $months = $this->makeService()->listMonthsForYear($year);

        $this->assertFalse($months[0]['items'][0]['treated']);
        $this->assertNull($months[0]['items'][0]['treatedAt']);
    }

    public function testTreatedTrueWhenExportStatusExists(): void
    {
        $resident = $this->makeResident(1, 'Alice', 'Martin');
        $yr       = $this->makeYr(10, $resident);
        $year     = $this->makeYear('2024-11-01', '2024-11-30', [$yr]);

        $status   = (new StaffPlannerExportStatus())
            ->setYearsResident($yr)->setMonth(11)->setCalendarYear(2024)
            ->markTreated('manager', 42);

        $months = $this->makeService(statusIndex: ['10-11-2024' => $status])
            ->listMonthsForYear($year);

        $this->assertTrue($months[0]['items'][0]['treated']);
        $this->assertSame('manager', $months[0]['items'][0]['treatedByType']);
    }

    public function testMultipleMaccsPerMonth(): void
    {
        $r1 = $this->makeResident(1, 'Alice', 'M');
        $r2 = $this->makeResident(2, 'Bob', 'D');
        $yr1 = $this->makeYr(10, $r1);
        $yr2 = $this->makeYr(11, $r2);
        $year = $this->makeYear('2024-11-01', '2024-11-30', [$yr1, $yr2]);

        $months = $this->makeService()->listMonthsForYear($year);

        $this->assertCount(2, $months[0]['items']);
    }

    // ── setItemTreated ─────────────────────────────────────────────────────────

    public function testSetItemTreatedCreatesStatusWhenNotExists(): void
    {
        $yr   = $this->makeYr(10, $this->makeResident(1, 'A', 'B'));
        $repo = $this->createMock(StaffPlannerExportStatusRepository::class);
        $repo->method('findForItem')->willReturn(null);
        $repo->method('findAllForYear')->willReturn([]);
        $em   = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('persist');
        $em->expects($this->once())->method('flush');

        $svc    = $this->makeServiceWithMocks($repo, $em);
        $result = $svc->setItemTreated($yr, 11, 2024, true);

        $this->assertTrue($result->isTreated());
        $this->assertNotNull($result->getTreatedAt());
    }

    public function testSetItemTreatedFalseClearsFields(): void
    {
        $yr     = $this->makeYr(10, $this->makeResident(1, 'A', 'B'));
        $status = (new StaffPlannerExportStatus())
            ->setYearsResident($yr)->setMonth(11)->setCalendarYear(2024)
            ->markTreated('manager', 1);

        $repo = $this->createMock(StaffPlannerExportStatusRepository::class);
        $repo->method('findForItem')->willReturn($status);
        $repo->method('findAllForYear')->willReturn([]);
        $em   = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $svc    = $this->makeServiceWithMocks($repo, $em);
        $result = $svc->setItemTreated($yr, 11, 2024, false);

        $this->assertFalse($result->isTreated());
        $this->assertNull($result->getTreatedAt());
    }

    public function testSetItemTreatedRecordsTreatedByFromManager(): void
    {
        $yr      = $this->makeYr(10, $this->makeResident(1, 'A', 'B'));
        $manager = $this->createMock(Manager::class);
        $manager->method('getId')->willReturn(42);

        $repo = $this->createMock(StaffPlannerExportStatusRepository::class);
        $repo->method('findForItem')->willReturn(null);
        $repo->method('findAllForYear')->willReturn([]);
        $em   = $this->createMock(EntityManagerInterface::class);
        $em->method('persist');
        $em->method('flush');

        $svc    = $this->makeServiceWithMocks($repo, $em);
        $result = $svc->setItemTreated($yr, 11, 2024, true, $manager);

        $this->assertSame('manager', $result->getTreatedByType());
        $this->assertSame(42, $result->getTreatedById());
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * @param array<string, ResidentValidation> $rvIndex
     * @param array<string, StaffPlannerExportStatus> $statusIndex
     */
    private function makeService(array $rvIndex = [], array $statusIndex = []): StaffPlannerMonthsService
    {
        $statusRepo = $this->createMock(StaffPlannerExportStatusRepository::class);
        $statusRepo->method('findAllForYear')->willReturn($statusIndex);
        $statusRepo->method('findForItem')->willReturn(null);

        $rvRepo = $this->createMock(ResidentValidationRepository::class);
        $rvRepo->method('findAllForYearIndexed')->willReturn($rvIndex);

        $yrRepo = $this->createMock(YearsResidentRepository::class);
        $em     = $this->createMock(EntityManagerInterface::class);
        $em->method('persist');
        $em->method('flush');

        return new StaffPlannerMonthsService($statusRepo, $rvRepo, $yrRepo, $em);
    }

    private function makeServiceWithMocks(
        StaffPlannerExportStatusRepository $statusRepo,
        EntityManagerInterface $em,
    ): StaffPlannerMonthsService {
        $rvRepo = $this->createMock(ResidentValidationRepository::class);
        $rvRepo->method('findAllForYearIndexed')->willReturn([]);
        $yrRepo = $this->createMock(YearsResidentRepository::class);
        return new StaffPlannerMonthsService($statusRepo, $rvRepo, $yrRepo, $em);
    }

    /** @param YearsResident[] $yrs */
    /** @param PeriodValidation[] $pvs */
    private function makeYear(string $start, string $end, array $yrs, array $pvs = []): Years
    {
        $year = $this->createMock(Years::class);
        $year->method('getDateOfStart')->willReturn(new \DateTime($start));
        $year->method('getDateOfEnd')->willReturn(new \DateTime($end));
        $year->method('getResidents')->willReturn(new ArrayCollection($yrs));
        $year->method('getPeriodValidations')->willReturn(new ArrayCollection($pvs));
        return $year;
    }

    private function makeResident(int $id, string $first, string $last): Resident
    {
        $r = $this->createMock(Resident::class);
        $r->method('getId')->willReturn($id);
        $r->method('getFirstname')->willReturn($first);
        $r->method('getLastname')->willReturn($last);
        $r->method('getEmail')->willReturn(strtolower($first) . '@test.be');
        $r->method('getAvatarPath')->willReturn(null);
        return $r;
    }

    private function makeYr(int $id, Resident $resident): YearsResident
    {
        $yr = $this->createMock(YearsResident::class);
        $yr->method('getId')->willReturn($id);
        $yr->method('getResident')->willReturn($resident);
        $yr->method('getAllowed')->willReturn(true);
        return $yr;
    }

    private function makePv(int $month, int $yearNb): PeriodValidation
    {
        $pv = $this->createMock(PeriodValidation::class);
        $pv->method('getId')->willReturn($month * 1000 + $yearNb);
        $pv->method('getMonth')->willReturn($month);
        $pv->method('getYearNb')->willReturn($yearNb);
        $pv->method('getResidentValidations')->willReturn(new ArrayCollection());
        return $pv;
    }

    private function makeRv(int $id, Resident $r, PeriodValidation $pv, bool $validated): ResidentValidation
    {
        $rv = $this->createMock(ResidentValidation::class);
        $rv->method('getId')->willReturn($id);
        $rv->method('getValidated')->willReturn($validated);
        $rv->method('getResident')->willReturn($r);
        $rv->method('getPeriodValidation')->willReturn($pv);
        return $rv;
    }
}
