<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\StatisticsAPI\ManagersAPI\GetRealTimeStatisticsAsManager;
use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Years;
use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\ManagerYearsRepository;
use App\Repository\ResidentYearCalendarRepository;
use App\Repository\TimesheetRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use App\Services\Statistics\ResidentStatisticsBuilder;
use App\Services\Statistics\StatisticTools;
use PHPUnit\Framework\TestCase;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Container;

/**
 * Unit tests for GetRealTimeStatisticsAsManager::firstload()
 *
 * Covers:
 * - Manager user gets years filtered by ManagerYears.dataAccess=true
 * - HospitalAdmin user gets ALL years from their hospital (not filtered by ManagerYears)
 * - Newly-created year (no ManagerYears row) IS visible to HospitalAdmin
 * - Newly-created year (no ManagerYears row) is NOT visible to a plain Manager
 * - Invalid month returns 400
 */
final class GetRealTimeStatisticsAsManagerTest extends TestCase
{
    private Security $security;
    private YearsRepository $yearsRepo;
    private ManagerYearsRepository $managerYearsRepo;
    private YearsResidentRepository $yearsResidentRepo;
    private TimesheetRepository $timesheetRepo;
    private AbsenceRepository $absenceRepo;
    private GardeRepository $gardeRepo;
    private ResidentYearCalendarRepository $calendarRepo;
    private StatisticTools $statisticTools;
    private ResidentStatisticsBuilder $statsBuilder;

    protected function setUp(): void
    {
        $this->security          = $this->createMock(Security::class);
        $this->yearsRepo         = $this->createMock(YearsRepository::class);
        $this->managerYearsRepo  = $this->createMock(ManagerYearsRepository::class);
        $this->yearsResidentRepo = $this->createMock(YearsResidentRepository::class);
        $this->timesheetRepo     = $this->createMock(TimesheetRepository::class);
        $this->absenceRepo       = $this->createMock(AbsenceRepository::class);
        $this->gardeRepo         = $this->createMock(GardeRepository::class);
        $this->calendarRepo      = $this->createMock(ResidentYearCalendarRepository::class);
        $this->statisticTools    = $this->createMock(StatisticTools::class);
        $this->statsBuilder      = $this->createMock(ResidentStatisticsBuilder::class);

        $this->statisticTools->method('boudariesDates')->willReturn([
            'startFromWeek'     => new \DateTime('2025-01-01'),
            'endOfTheLastWeek'  => new \DateTime('2025-01-31'),
        ]);

        $this->yearsResidentRepo->method('findYearAllowedResidents')->willReturn([]);
        $this->timesheetRepo->method('ManagerfindByMonth')->willReturn([]);
        $this->gardeRepo->method('ManagerfindByMonth')->willReturn([]);
        $this->absenceRepo->method('ManagerfindByMonth')->willReturn([]);
        $this->absenceRepo->method('findByYearGroupedByResident')->willReturn([]);
        $this->calendarRepo->method('ManagerfindByMonth')->willReturn([]);
    }

    private function buildController(): GetRealTimeStatisticsAsManager
    {
        $controller = new GetRealTimeStatisticsAsManager();
        $controller->setContainer(new Container());

        return $controller;
    }

    private function callFirstload(int $month): \Symfony\Component\HttpFoundation\Response
    {
        return $this->buildController()->firstload(
            $month,
            $this->security,
            $this->yearsResidentRepo,
            $this->timesheetRepo,
            $this->absenceRepo,
            $this->managerYearsRepo,
            $this->gardeRepo,
            $this->yearsRepo,
            $this->calendarRepo,
            $this->statisticTools,
            $this->statsBuilder,
        );
    }

    // ── Invalid month ─────────────────────────────────────────────────────────

    public function testInvalidMonthReturns400(): void
    {
        $this->security->method('getUser')->willReturn($this->createMock(Manager::class));
        $this->managerYearsRepo->method('findBy')->willReturn([]);

        $response = $this->callFirstload(13);
        $this->assertSame(400, $response->getStatusCode());
    }

    // ── Manager path ──────────────────────────────────────────────────────────

    public function testManagerSeesOnlyYearsWithDataAccess(): void
    {
        $manager = $this->createMock(Manager::class);
        $this->security->method('getUser')->willReturn($manager);

        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn(42);
        $year->method('getTitle')->willReturn('Pédiatrie 2025');
        $year->method('getLocation')->willReturn('CHU');

        $managerYear = $this->createMock(ManagerYears::class);
        $managerYear->method('getYears')->willReturn($year);

        $this->managerYearsRepo
            ->expects($this->once())
            ->method('findBy')
            ->with(['manager' => $manager, 'dataAccess' => true], ['years' => 'DESC'])
            ->willReturn([$managerYear]);

        $this->yearsRepo->method('findOneBy')->willReturn($year);

        // Hospital-scoped query must NOT be called for a plain Manager
        $this->yearsRepo->expects($this->never())->method('findByHospitalOrderedByDate');

        $response = $this->callFirstload(5);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertCount(1, $data['years']);
        $this->assertSame(42, $data['years'][0]['yearId']);
    }

    public function testManagerWithNoDataAccessYearsGetsEmptyList(): void
    {
        $manager = $this->createMock(Manager::class);
        $this->security->method('getUser')->willReturn($manager);
        $this->managerYearsRepo->method('findBy')->willReturn([]);

        $response = $this->callFirstload(5);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame([], $data['years']);
    }

    // ── HospitalAdmin path ────────────────────────────────────────────────────

    public function testHospitalAdminSeesAllHospitalYears(): void
    {
        $hospital = $this->createMock(Hospital::class);
        $admin    = $this->createMock(HospitalAdmin::class);
        $admin->method('getHospital')->willReturn($hospital);
        $this->security->method('getUser')->willReturn($admin);

        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn(7);
        $year->method('getTitle')->willReturn('Anesthésie S2');
        $year->method('getLocation')->willReturn('CLSJ');

        $this->yearsRepo
            ->expects($this->once())
            ->method('findByHospitalOrderedByDate')
            ->with($hospital)
            ->willReturn([$year]);

        // ManagerYears query must NOT be called for HospitalAdmin
        $this->managerYearsRepo->expects($this->never())->method('findBy');

        $response = $this->callFirstload(5);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertCount(1, $data['years']);
        $this->assertSame(7, $data['years'][0]['yearId']);
        $this->assertSame('Anesthésie S2', $data['years'][0]['title']);
    }

    public function testHospitalAdminSeesNewlyCreatedYearWithNoManagerYearsRow(): void
    {
        // This is the regression test for the reported bug:
        // A year created via HospitalAdminController has no ManagerYears row,
        // so it was invisible on the realtime page. HospitalAdmin path must
        // query years directly from the hospital, not from ManagerYears.
        $hospital = $this->createMock(Hospital::class);
        $admin    = $this->createMock(HospitalAdmin::class);
        $admin->method('getHospital')->willReturn($hospital);
        $this->security->method('getUser')->willReturn($admin);

        $newYear = $this->createMock(Years::class);
        $newYear->method('getId')->willReturn(99);
        $newYear->method('getTitle')->willReturn('Anesthésie S2 — créée ce matin');
        $newYear->method('getLocation')->willReturn('CLSJ');

        $this->yearsRepo
            ->method('findByHospitalOrderedByDate')
            ->willReturn([$newYear]);

        $this->managerYearsRepo->expects($this->never())->method('findBy');

        $response = $this->callFirstload(4);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertCount(1, $data['years']);
        $this->assertSame(99, $data['years'][0]['yearId']);
    }

    public function testHospitalAdminWithNoYearsGetsEmptyList(): void
    {
        $hospital = $this->createMock(Hospital::class);
        $admin    = $this->createMock(HospitalAdmin::class);
        $admin->method('getHospital')->willReturn($hospital);
        $this->security->method('getUser')->willReturn($admin);

        $this->yearsRepo->method('findByHospitalOrderedByDate')->willReturn([]);

        $response = $this->callFirstload(5);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame([], $data['years']);
    }
}
