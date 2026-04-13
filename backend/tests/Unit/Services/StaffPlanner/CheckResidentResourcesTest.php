<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\StaffPlanner;

use App\Entity\PeriodValidation;
use App\Entity\Resident;
use App\Entity\ResidentValidation;
use App\Entity\StaffPlannerResources;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Enum\Sexe;
use App\Repository\PeriodValidationRepository;
use App\Repository\ResidentValidationRepository;
use App\Repository\YearsResidentRepository;
use App\Services\StaffPlanner\CheckResidentResources;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class CheckResidentResourcesTest extends TestCase
{
    /** @var PeriodValidationRepository&MockObject */
    private PeriodValidationRepository $periodRepo;

    /** @var ResidentValidationRepository&MockObject */
    private ResidentValidationRepository $residentValidationRepo;

    /** @var YearsResidentRepository&MockObject */
    private YearsResidentRepository $yearsResidentRepo;

    private CheckResidentResources $service;

    protected function setUp(): void
    {
        $this->periodRepo             = $this->createMock(PeriodValidationRepository::class);
        $this->residentValidationRepo = $this->createMock(ResidentValidationRepository::class);
        $this->yearsResidentRepo      = $this->createMock(YearsResidentRepository::class);

        $this->service = new CheckResidentResources(
            $this->periodRepo,
            $this->residentValidationRepo,
            $this->yearsResidentRepo,
        );
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function makeYear(int $id, string $title): Years&MockObject
    {
        $y = $this->createMock(Years::class);
        $y->method('getId')->willReturn($id);
        $y->method('getTitle')->willReturn($title);

        return $y;
    }

    private function makeResident(int $id): Resident&MockObject
    {
        $r = $this->createMock(Resident::class);
        $r->method('getId')->willReturn($id);
        $r->method('getFirstname')->willReturn('Jean');
        $r->method('getLastname')->willReturn('Dupont');
        $r->method('getSexe')->willReturn(Sexe::Male);

        return $r;
    }

    /** @param list<string>|null $missing  null = SPR null, [] = complete, ['workerHRID'] = missing one */
    private function makeYearsResident(?array $missing): YearsResident&MockObject
    {
        $yr = $this->createMock(YearsResident::class);

        if ($missing === null) {
            $yr->method('getStaffPlannerResources')->willReturn(null);
        } else {
            $spr = $this->createMock(StaffPlannerResources::class);
            $spr->method('getWorkerHRID')->willReturn(in_array('workerHRID', $missing, true) ? null : 'W-1');
            $spr->method('getSectionHRID')->willReturn(in_array('sectionHRID', $missing, true) ? null : 'S-1');
            $yr->method('getStaffPlannerResources')->willReturn($spr);
        }

        return $yr;
    }

    private function makeResidentValidation(Resident $resident, Years $year): ResidentValidation&MockObject
    {
        $period = $this->createMock(PeriodValidation::class);
        $period->method('getYear')->willReturn($year);

        $rv = $this->createMock(ResidentValidation::class);
        $rv->method('getResident')->willReturn($resident);
        $rv->method('getPeriodValidation')->willReturn($period);

        return $rv;
    }

    // ─── checkResidentStaffPlannerCompletion ──────────────────────────────────

    public function testReturnsEmptyWhenNoResidentValidationsFound(): void
    {
        $this->residentValidationRepo->method('findOneBy')->willReturn(null);

        $result = $this->service->checkResidentStaffPlannerCompletion([1, 2]);

        $this->assertSame([], $result);
    }

    public function testSkipsWhenYearsResidentRelationNotFound(): void
    {
        $resident = $this->makeResident(1);
        $year     = $this->makeYear(10, 'Promo 2024');
        $rv       = $this->makeResidentValidation($resident, $year);

        $this->residentValidationRepo->method('findOneBy')->willReturn($rv);
        $this->yearsResidentRepo->method('findOneBy')->willReturn(null);

        $result = $this->service->checkResidentStaffPlannerCompletion([1]);

        $this->assertSame([], $result);
    }

    public function testSkipsWhenStaffPlannerResourcesIsNull(): void
    {
        $resident    = $this->makeResident(1);
        $year        = $this->makeYear(10, 'Promo 2024');
        $rv          = $this->makeResidentValidation($resident, $year);
        $yearsResident = $this->makeYearsResident(null);

        $this->residentValidationRepo->method('findOneBy')->willReturn($rv);
        $this->yearsResidentRepo->method('findOneBy')->willReturn($yearsResident);

        $result = $this->service->checkResidentStaffPlannerCompletion([1]);

        $this->assertSame([], $result);
    }

    public function testReturnsNothingWhenAllFieldsComplete(): void
    {
        $resident    = $this->makeResident(1);
        $year        = $this->makeYear(10, 'Promo 2024');
        $rv          = $this->makeResidentValidation($resident, $year);
        $yearsResident = $this->makeYearsResident([]); // no missing fields

        $this->residentValidationRepo->method('findOneBy')->willReturn($rv);
        $this->yearsResidentRepo->method('findOneBy')->willReturn($yearsResident);

        $result = $this->service->checkResidentStaffPlannerCompletion([1]);

        $this->assertSame([], $result);
    }

    public function testReportsMissingWorkerHRID(): void
    {
        $resident    = $this->makeResident(5);
        $year        = $this->makeYear(10, 'Promo 2024');
        $rv          = $this->makeResidentValidation($resident, $year);
        $yearsResident = $this->makeYearsResident(['workerHRID']);

        $this->residentValidationRepo->method('findOneBy')->willReturn($rv);
        $this->yearsResidentRepo->method('findOneBy')->willReturn($yearsResident);

        $result = $this->service->checkResidentStaffPlannerCompletion([1]);

        $this->assertCount(1, $result);
        $this->assertSame(5, $result[0]['residentId']);
        $this->assertSame(['workerHRID'], $result[0]['errors']);
        $this->assertSame('Promo 2024', $result[0]['yearTitle']);
    }

    public function testReportsBothMissingFields(): void
    {
        $resident    = $this->makeResident(5);
        $year        = $this->makeYear(10, 'Promo 2024');
        $rv          = $this->makeResidentValidation($resident, $year);
        $yearsResident = $this->makeYearsResident(['workerHRID', 'sectionHRID']);

        $this->residentValidationRepo->method('findOneBy')->willReturn($rv);
        $this->yearsResidentRepo->method('findOneBy')->willReturn($yearsResident);

        $result = $this->service->checkResidentStaffPlannerCompletion([1]);

        $this->assertCount(1, $result);
        $this->assertContains('workerHRID', $result[0]['errors']);
        $this->assertContains('sectionHRID', $result[0]['errors']);
    }

    public function testDeduplicatesSameResidentYearPair(): void
    {
        $resident    = $this->makeResident(5);
        $year        = $this->makeYear(10, 'Promo 2024');
        $rv          = $this->makeResidentValidation($resident, $year);
        $yearsResident = $this->makeYearsResident(['workerHRID']);

        // Same rv returned for both IDs — same resident+year pair
        $this->residentValidationRepo->method('findOneBy')->willReturn($rv);
        $this->yearsResidentRepo->method('findOneBy')->willReturn($yearsResident);

        $result = $this->service->checkResidentStaffPlannerCompletion([1, 2]);

        $this->assertCount(1, $result); // deduplicated
    }
}
