<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\StaffPlanner;

use App\Entity\PeriodValidation;
use App\Entity\Resident;
use App\Entity\ResidentValidation;
use App\Entity\StaffPlannerResources;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\ResidentValidationRepository;
use App\Repository\YearsResidentRepository;
use App\Security\Voter\YearAccessVoter;
use App\Services\StaffPlanner\GenerateStaffPlannerExport;
use App\Services\StaffPlanner\GetDataByMonth;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

class GenerateStaffPlannerExportTest extends TestCase
{
    private ResidentValidationRepository&MockObject $residentValidationRepo;
    private YearsResidentRepository&MockObject $yearsResidentRepo;
    private AuthorizationCheckerInterface&MockObject $authChecker;
    private GetDataByMonth&MockObject $getDataByMonth;
    private GenerateStaffPlannerExport $service;

    protected function setUp(): void
    {
        $this->residentValidationRepo = $this->createMock(ResidentValidationRepository::class);
        $this->yearsResidentRepo      = $this->createMock(YearsResidentRepository::class);
        $this->authChecker            = $this->createMock(AuthorizationCheckerInterface::class);
        $this->getDataByMonth         = $this->createMock(GetDataByMonth::class);

        $this->service = new GenerateStaffPlannerExport(
            $this->residentValidationRepo,
            $this->yearsResidentRepo,
            $this->authChecker,
            $this->getDataByMonth,
        );
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Build a minimal ResidentValidation mock with the given year ID and month/yearNb.
     */
    private function makePeriod(int $yearId, int $yearNb, int $month): ResidentValidation&MockObject
    {
        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn($yearId);

        $periodValidation = $this->createMock(PeriodValidation::class);
        $periodValidation->method('getYear')->willReturn($year);
        $periodValidation->method('getYearNb')->willReturn($yearNb);
        $periodValidation->method('getMonth')->willReturn($month);

        $resident = $this->createMock(Resident::class);
        $resident->method('getFirstname')->willReturn('Jean');
        $resident->method('getLastname')->willReturn('Dupont');

        $period = $this->createMock(ResidentValidation::class);
        $period->method('getPeriodValidation')->willReturn($periodValidation);
        $period->method('getResident')->willReturn($resident);

        return $period;
    }

    /**
     * Build a YearsResident mock with a StaffPlannerResources stub.
     */
    private function makeYearsResident(?string $workerHRID, ?string $sectionHRID): YearsResident&MockObject
    {
        $resource = $this->createMock(StaffPlannerResources::class);
        $resource->method('getWorkerHRID')->willReturn($workerHRID);
        $resource->method('getSectionHRID')->willReturn($sectionHRID);

        $yr = $this->createMock(YearsResident::class);
        $yr->method('getStaffPlannerResources')->willReturn($resource);

        return $yr;
    }

    // ─── generate() — empty input ─────────────────────────────────────────────

    public function testGenerateWithEmptyIdsReturnsEmptyAlertsAndHeaderOnly(): void
    {
        $result = $this->service->generate([]);

        $this->assertSame([], $result['alerts']);
        $this->assertFileExists($result['filePath']);
        $this->assertStringContainsString('SEPARATOR=|', file_get_contents($result['filePath']) ?: '');
        unlink($result['filePath']);
    }

    // ─── generate() — period not found ───────────────────────────────────────

    public function testGenerateSkipsPeriodNotFound(): void
    {
        $this->residentValidationRepo->method('findOneBy')->willReturn(null);

        $result = $this->service->generate([999]);

        $this->assertSame([], $result['alerts']);
        $content = file_get_contents($result['filePath']) ?: '';
        $this->assertStringNotContainsString('AS=', $content);
        unlink($result['filePath']);
    }

    // ─── generate() — access denied ──────────────────────────────────────────

    public function testGenerateSkipsPeriodWhenAccessDenied(): void
    {
        $period = $this->makePeriod(1, 2024, 3);
        $this->residentValidationRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')
            ->with(YearAccessVoter::DATA_DOWNLOAD)
            ->willReturn(false);

        $result = $this->service->generate([1]);

        $this->assertSame([], $result['alerts']);
        $content = file_get_contents($result['filePath']) ?: '';
        $this->assertStringNotContainsString('AS=', $content);
        unlink($result['filePath']);
    }

    // ─── generate() — missing HRID → alert ───────────────────────────────────

    public function testGenerateAddsAlertWhenHRIDsMissing(): void
    {
        $period = $this->makePeriod(1, 2024, 3);
        $yr     = $this->makeYearsResident(null, null);

        $this->residentValidationRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->yearsResidentRepo->method('findOneBy')->willReturn($yr);

        $result = $this->service->generate([1]);

        $this->assertCount(1, $result['alerts']);
        $this->assertSame('Jean', $result['alerts'][0]['firstname']);
        $this->assertSame('Dupont', $result['alerts'][0]['lastname']);
        unlink($result['filePath']);
    }

    public function testGenerateAddsAlertWhenWorkerHRIDMissing(): void
    {
        $period = $this->makePeriod(1, 2024, 3);
        $yr     = $this->makeYearsResident(null, 'SEC-01');

        $this->residentValidationRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->yearsResidentRepo->method('findOneBy')->willReturn($yr);

        $result = $this->service->generate([1]);

        $this->assertCount(1, $result['alerts']);
        unlink($result['filePath']);
    }

    // ─── generate() — timesheets ─────────────────────────────────────────────

    public function testGenerateWritesTimesheetLine(): void
    {
        $period = $this->makePeriod(1, 2024, 3);
        $yr     = $this->makeYearsResident('W001', 'S001');

        $this->residentValidationRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->yearsResidentRepo->method('findOneBy')->willReturn($yr);
        $this->getDataByMonth->method('fetchData')->willReturn([
            'timesheets' => [
                ['start' => '2024-03-05 08:00:00', 'end' => '2024-03-05 16:00:00', 'pause' => 0.5],
            ],
        ]);

        $result  = $this->service->generate([1]);
        $content = file_get_contents($result['filePath']) ?: '';

        $this->assertStringContainsString('AS=|W001|S001|2024-03-05|1|activeShifts|', $content);
        unlink($result['filePath']);
    }

    // ─── generate() — gardes ─────────────────────────────────────────────────

    public function testGenerateWritesHospitalGardeLine(): void
    {
        $period = $this->makePeriod(1, 2024, 3);
        $yr     = $this->makeYearsResident('W001', 'S001');

        $this->residentValidationRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->yearsResidentRepo->method('findOneBy')->willReturn($yr);
        $this->getDataByMonth->method('fetchData')->willReturn([
            'gardes' => [
                ['start' => '2024-03-06 18:00:00', 'end' => '2024-03-07 08:00:00', 'type' => 'hospital'],
            ],
        ]);

        $result  = $this->service->generate([1]);
        $content = file_get_contents($result['filePath']) ?: '';

        $this->assertStringContainsString('AS=|W001|S001|2024-03-06|1|activeShifts|', $content);
        unlink($result['filePath']);
    }

    public function testGenerateSkipsCallableGardeLines(): void
    {
        $period = $this->makePeriod(1, 2024, 3);
        $yr     = $this->makeYearsResident('W001', 'S001');

        $this->residentValidationRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->yearsResidentRepo->method('findOneBy')->willReturn($yr);
        $this->getDataByMonth->method('fetchData')->willReturn([
            'gardes' => [
                ['start' => '2024-03-06 18:00:00', 'end' => '2024-03-07 08:00:00', 'type' => 'callable'],
            ],
        ]);

        $result  = $this->service->generate([1]);
        $content = file_get_contents($result['filePath']) ?: '';

        $this->assertStringNotContainsString('AS=', $content);
        unlink($result['filePath']);
    }

    // ─── generate() — absences ───────────────────────────────────────────────

    /**
     * @dataProvider absenceCodeProvider
     */
    public function testGenerateWritesAbsenceLineWithCorrectCode(string $type, string $expectedCode): void
    {
        $period = $this->makePeriod(1, 2024, 3);
        $yr     = $this->makeYearsResident('W001', 'S001');

        $this->residentValidationRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->yearsResidentRepo->method('findOneBy')->willReturn($yr);
        $this->getDataByMonth->method('fetchData')->willReturn([
            'absences' => [
                ['start' => '2024-03-10 00:00:00', 'end' => '2024-03-10 23:59:00', 'type' => $type],
            ],
        ]);

        $result  = $this->service->generate([1]);
        $content = file_get_contents($result['filePath']) ?: '';

        $this->assertStringContainsString('|' . $expectedCode . '|', $content);
        unlink($result['filePath']);
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function absenceCodeProvider(): array
    {
        return [
            'sickLeave maps to ill'       => ['sickLeave', 'ill'],
            'annualLeave maps to holidays' => ['annualLeave', 'holidays'],
            'other maps to abs'           => ['trainingLeave', 'abs'],
        ];
    }

    // ─── generate() — access check caching ───────────────────────────────────

    public function testAccessCheckIsPerformedOncePerYear(): void
    {
        $period1 = $this->makePeriod(1, 2024, 3);
        $period2 = $this->makePeriod(1, 2024, 4); // same year ID → no second check

        $this->residentValidationRepo->method('findOneBy')
            ->willReturnOnConsecutiveCalls($period1, $period2);
        $this->authChecker->expects($this->once())
            ->method('isGranted')
            ->willReturn(false);

        $result = $this->service->generate([1, 2]);

        $this->assertSame([], $result['alerts']);
        unlink($result['filePath']);
    }
}
