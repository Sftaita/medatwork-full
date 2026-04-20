<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\YearsManagement;

use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\Years;
use App\Entity\YearsWeekIntervals;
use App\Repository\ManagerRepository;
use App\Repository\ManagerYearsRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use App\Repository\YearsWeekIntervalsRepository;
use App\Repository\YearsWeekTemplatesRepository;
use App\Services\YearsManagement\YearSummaryBuilder;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for YearSummaryBuilder::buildForHospitalAdmin()
 *
 * Covers:
 * - HospitalAdmin gets all active years for their hospital (no ManagerYears filter)
 * - Newly-created year with no ManagerYears row IS visible
 * - Authorization flags are all-true for HospitalAdmin
 * - Response structure matches the format expected by the frontend
 * - HospitalAdmin with no active years gets empty yearsSummary
 */
final class YearSummaryBuilderHospitalAdminTest extends TestCase
{
    private ManagerYearsRepository $managerYearsRepo;
    private ManagerRepository $managerRepo;
    private YearsResidentRepository $yearsResidentRepo;
    private YearsWeekIntervalsRepository $weekIntervalsRepo;
    private YearsWeekTemplatesRepository $weekTemplatesRepo;
    private YearsRepository $yearsRepo;

    private Hospital $hospital;
    private HospitalAdmin $admin;

    protected function setUp(): void
    {
        $this->managerYearsRepo  = $this->createMock(ManagerYearsRepository::class);
        $this->managerRepo       = $this->createMock(ManagerRepository::class);
        $this->yearsResidentRepo = $this->createMock(YearsResidentRepository::class);
        $this->weekIntervalsRepo = $this->createMock(YearsWeekIntervalsRepository::class);
        $this->weekTemplatesRepo = $this->createMock(YearsWeekTemplatesRepository::class);
        $this->yearsRepo         = $this->createMock(YearsRepository::class);

        $this->hospital = $this->createMock(Hospital::class);
        $this->admin    = $this->createMock(HospitalAdmin::class);
        $this->admin->method('getHospital')->willReturn($this->hospital);

        // Default stubs — individual tests may override by building a fresh service
        $this->yearsResidentRepo->method('findYearAllowedResidents')->willReturn([]);
        $this->weekIntervalsRepo->method('findBy')->willReturn([]);
        $this->weekTemplatesRepo->method('findBy')->willReturn([]);
        // Note: managerRepo->findOneBy is intentionally not stubbed here so that
        // per-test configurations (expects + willReturn) are not shadowed.
    }

    private function buildService(): YearSummaryBuilder
    {
        return new YearSummaryBuilder(
            $this->managerYearsRepo,
            $this->managerRepo,
            $this->yearsResidentRepo,
            $this->weekIntervalsRepo,
            $this->weekTemplatesRepo,
            $this->yearsRepo,
        );
    }

    private function makeYear(int $id, string $title): Years
    {
        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn($id);
        $year->method('getTitle')->willReturn($title);
        $year->method('getLocation')->willReturn('CHU');
        $year->method('getMaster')->willReturn(null);
        $year->method('getDateOfStart')->willReturn(new \DateTime('2025-01-01'));
        $year->method('getDateOfEnd')->willReturn(new \DateTime('2025-12-31'));
        $year->method('getCreatedAt')->willReturn(new \DateTime('2025-01-01'));

        return $year;
    }

    // ── HospitalAdmin gets all hospital years ─────────────────────────────────

    public function testHospitalAdminGetsSummaryForAllActiveYears(): void
    {
        $year1 = $this->makeYear(10, 'Pédiatrie 2025');
        $year2 = $this->makeYear(11, 'Anesthésie 2025');

        $this->yearsRepo
            ->expects($this->once())
            ->method('findActiveYearsByHospital')
            ->with($this->hospital)
            ->willReturn([$year1, $year2]);

        // ManagerYears must NOT be queried for HospitalAdmin
        $this->managerYearsRepo->expects($this->never())->method('findActiveManagerYearsList');

        $result = $this->buildService()->buildForHospitalAdmin($this->admin);

        $this->assertCount(2, $result['yearsSummary']);
        $this->assertSame(10, $result['yearsSummary'][0]['yearId']);
        $this->assertSame('Pédiatrie 2025', $result['yearsSummary'][0]['yearInfo']['title']);
        $this->assertSame(11, $result['yearsSummary'][1]['yearId']);
    }

    // ── Regression: newly-created year (no ManagerYears row) is visible ──────

    public function testNewlyCreatedYearWithNoManagerYearsRowIsVisible(): void
    {
        $newYear = $this->makeYear(99, 'Chirurgie S1 — créée ce matin');

        $this->yearsRepo
            ->method('findActiveYearsByHospital')
            ->willReturn([$newYear]);

        $result = $this->buildService()->buildForHospitalAdmin($this->admin);

        $this->assertCount(1, $result['yearsSummary']);
        $this->assertSame(99, $result['yearsSummary'][0]['yearId']);
        $this->assertSame('Chirurgie S1 — créée ce matin', $result['yearsSummary'][0]['yearInfo']['title']);
    }

    // ── Authorization flags are all-true ─────────────────────────────────────

    public function testAuthorizationFlagsAreAllTrueForHospitalAdmin(): void
    {
        $year = $this->makeYear(5, 'Test');
        $this->yearsRepo->method('findActiveYearsByHospital')->willReturn([$year]);

        $result    = $this->buildService()->buildForHospitalAdmin($this->admin);
        $auth      = $result['yearsSummary'][0]['authorization'];

        $this->assertTrue($auth['dataAccess']);
        $this->assertTrue($auth['dataValidation']);
        $this->assertTrue($auth['dataDownload']);
        $this->assertTrue($auth['admin']);
    }

    // ── Response keys match frontend contract ─────────────────────────────────

    public function testResponseStructureMatchesFrontendContract(): void
    {
        $year = $this->makeYear(7, 'Radiologie');
        $this->yearsRepo->method('findActiveYearsByHospital')->willReturn([$year]);

        $result  = $this->buildService()->buildForHospitalAdmin($this->admin);
        $summary = $result['yearsSummary'][0];

        $this->assertArrayHasKey('yearId', $summary);
        $this->assertArrayHasKey('yearInfo', $summary);
        $this->assertArrayHasKey('yearWeekTemplates', $summary);
        $this->assertArrayHasKey('authorization', $summary);
        $this->assertArrayHasKey('residents', $summary);
        $this->assertArrayHasKey('weekIntervals', $summary);
        $this->assertArrayHasKey('assignements', $result);
    }

    // ── Empty result when no active years ────────────────────────────────────

    public function testHospitalAdminWithNoActiveYearsGetsEmptySummary(): void
    {
        $this->yearsRepo->method('findActiveYearsByHospital')->willReturn([]);

        $result = $this->buildService()->buildForHospitalAdmin($this->admin);

        $this->assertSame([], $result['yearsSummary']);
        $this->assertSame([], $result['assignements']);
    }

    // ── Master info resolved when master ID exists ────────────────────────────

    public function testMasterNameIsResolvedWhenMasterIdIsSet(): void
    {
        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn(1);
        $year->method('getTitle')->willReturn('Stage');
        $year->method('getLocation')->willReturn('CHU');
        $year->method('getMaster')->willReturn(42);
        $year->method('getDateOfStart')->willReturn(new \DateTime('2025-01-01'));
        $year->method('getDateOfEnd')->willReturn(new \DateTime('2025-12-31'));
        $year->method('getCreatedAt')->willReturn(new \DateTime('2025-01-01'));

        $manager = $this->createMock(Manager::class);
        $manager->method('getFirstname')->willReturn('Jean');
        $manager->method('getLastname')->willReturn('Dupont');

        // Build a fresh managerRepo mock so the setUp stub does not shadow this return
        $managerRepo = $this->createMock(ManagerRepository::class);
        $managerRepo
            ->expects($this->once())
            ->method('findOneBy')
            ->with(['id' => 42])
            ->willReturn($manager);

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findActiveYearsByHospital')->willReturn([$year]);

        $service = new YearSummaryBuilder(
            $this->managerYearsRepo,
            $managerRepo,
            $this->yearsResidentRepo,
            $this->weekIntervalsRepo,
            $this->weekTemplatesRepo,
            $yearsRepo,
        );

        $result   = $service->buildForHospitalAdmin($this->admin);
        $yearInfo = $result['yearsSummary'][0]['yearInfo'];

        $this->assertSame('Jean', $yearInfo['masterFirstname']);
        $this->assertSame('Dupont', $yearInfo['masterLastname']);
    }

    // ── Week intervals are included ───────────────────────────────────────────

    public function testWeekIntervalsAreIncludedInSummary(): void
    {
        $year = $this->makeYear(3, 'ORL');

        $wi = $this->createMock(YearsWeekIntervals::class);
        $wi->method('getId')->willReturn(55);
        $wi->method('getDeleted')->willReturn(false);
        $wi->method('getDateOfStart')->willReturn(new \DateTime('2025-01-06'));
        $wi->method('getDateOfEnd')->willReturn(new \DateTime('2025-01-12'));
        $wi->method('getWeekNumber')->willReturn(2);
        $wi->method('getMonthNumber')->willReturn(1);
        $wi->method('getYearNumber')->willReturn(2025);

        // Build a fresh weekIntervalsRepo mock so the setUp default does not shadow this return
        $weekIntervalsRepo = $this->createMock(YearsWeekIntervalsRepository::class);
        $weekIntervalsRepo->method('findBy')->willReturn([$wi]);

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findActiveYearsByHospital')->willReturn([$year]);

        $service = new YearSummaryBuilder(
            $this->managerYearsRepo,
            $this->managerRepo,
            $this->yearsResidentRepo,
            $weekIntervalsRepo,
            $this->weekTemplatesRepo,
            $yearsRepo,
        );

        $result    = $service->buildForHospitalAdmin($this->admin);
        $intervals = $result['yearsSummary'][0]['weekIntervals'];

        $this->assertCount(1, $intervals);
        $this->assertSame(55, $intervals[0]['weekIntervalId']);
    }
}
