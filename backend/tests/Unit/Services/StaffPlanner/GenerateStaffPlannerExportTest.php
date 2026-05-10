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
use App\Services\StaffPlanner\FingerprintService;
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
    private FingerprintService&MockObject $fingerprintService;
    private GenerateStaffPlannerExport $service;

    protected function setUp(): void
    {
        $this->residentValidationRepo = $this->createMock(ResidentValidationRepository::class);
        $this->yearsResidentRepo      = $this->createMock(YearsResidentRepository::class);
        $this->authChecker            = $this->createMock(AuthorizationCheckerInterface::class);
        $this->getDataByMonth         = $this->createMock(GetDataByMonth::class);
        $this->fingerprintService     = $this->createMock(FingerprintService::class);
        $this->fingerprintService->method('hashData')->willReturn(str_repeat('a', 64));

        $this->service = new GenerateStaffPlannerExport(
            $this->residentValidationRepo,
            $this->yearsResidentRepo,
            $this->authChecker,
            $this->getDataByMonth,
            $this->fingerprintService,
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

    // ─── Phase 2 : generateFromItems() — capturedItems ───────────────────────

    public function testGenerateFromItemsReturnsCapturedItems(): void
    {
        $yr = $this->makeYearsResidentFull('W001', 'S001');
        $this->yearsResidentRepo->method('find')->willReturn($yr);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->getDataByMonth->method('fetchData')->willReturn([
            'timesheets' => [['start' => '2024-11-04 08:00:00', 'end' => '2024-11-04 16:00:00', 'pause' => 0]],
            'gardes'     => [],
            'absences'   => [],
        ]);

        $result = $this->service->generateFromItems([
            ['yearResidentId' => 10, 'month' => 11, 'calendarYear' => 2024],
        ]);

        $this->assertArrayHasKey('capturedItems', $result);
        $this->assertCount(1, $result['capturedItems']);
        unlink($result['filePath']);
    }

    public function testCapturedItemHasCorrectFields(): void
    {
        $yr = $this->makeYearsResidentFull('W001', 'S001');
        $this->yearsResidentRepo->method('find')->willReturn($yr);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->getDataByMonth->method('fetchData')->willReturn([
            'timesheets' => [['start' => '2024-11-04 08:00:00', 'end' => '2024-11-04 16:00:00', 'pause' => 0.5]],
            'gardes'     => [['start' => '2024-11-10 20:00:00', 'end' => '2024-11-11 08:00:00', 'type' => 'hospital']],
            'absences'   => [],
        ]);

        $result = $this->service->generateFromItems([
            ['yearResidentId' => 10, 'month' => 11, 'calendarYear' => 2024],
        ]);

        $item = $result['capturedItems'][0];
        $this->assertSame(10, $item['yearResidentId']);
        $this->assertSame(11, $item['month']);
        $this->assertSame(2024, $item['calendarYear']);
        $this->assertSame(1, $item['timesheetCount']);
        $this->assertSame(1, $item['gardeHospitalCount']);
        $this->assertSame(0, $item['absenceCount']);
        $this->assertSame('W001', $item['workerHRIDAtExport']);
        $this->assertSame('S001', $item['sectionHRIDAtExport']);
        $this->assertSame(64, strlen($item['dataFingerprint'])); // SHA-256
        $this->assertStringContainsString('AS=', $item['payloadLines']);
        unlink($result['filePath']);
    }

    public function testCapturedItemCallableGardeNotCountedInGardeHospital(): void
    {
        $yr = $this->makeYearsResidentFull('W001', 'S001');
        $this->yearsResidentRepo->method('find')->willReturn($yr);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->getDataByMonth->method('fetchData')->willReturn([
            'timesheets' => [],
            'gardes'     => [
                ['start' => '2024-11-10 20:00:00', 'end' => '2024-11-11 08:00:00', 'type' => 'callable'],
                ['start' => '2024-11-12 20:00:00', 'end' => '2024-11-13 08:00:00', 'type' => 'hospital'],
            ],
            'absences'   => [],
        ]);

        $result = $this->service->generateFromItems([
            ['yearResidentId' => 10, 'month' => 11, 'calendarYear' => 2024],
        ]);

        $item = $result['capturedItems'][0];
        $this->assertSame(1, $item['gardeHospitalCount']); // only hospital counted
        unlink($result['filePath']);
    }

    public function testCapturedItemPayloadLinesContainOnlyHospitalGardes(): void
    {
        $yr = $this->makeYearsResidentFull('W001', 'S001');
        $this->yearsResidentRepo->method('find')->willReturn($yr);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->getDataByMonth->method('fetchData')->willReturn([
            'timesheets' => [],
            'gardes'     => [
                ['start' => '2024-11-10 20:00:00', 'end' => '2024-11-11 08:00:00', 'type' => 'callable'],
                ['start' => '2024-11-12 20:00:00', 'end' => '2024-11-13 08:00:00', 'type' => 'hospital'],
            ],
            'absences'   => [],
        ]);

        $result = $this->service->generateFromItems([
            ['yearResidentId' => 10, 'month' => 11, 'calendarYear' => 2024],
        ]);

        // Callable garde produces no line — only 1 AS= line (the hospital garde)
        $lines = $result['capturedItems'][0]['payloadLines'];
        $this->assertSame(1, substr_count($lines, 'AS='));
        unlink($result['filePath']);
    }

    public function testGenerateFromItemsWithAlertsReturnsEmptyCapturedItems(): void
    {
        // When HRID is missing → alert added, no capturedItem
        $yr = $this->makeYearsResidentFull(null, null);
        $this->yearsResidentRepo->method('find')->willReturn($yr);
        $this->authChecker->method('isGranted')->willReturn(true);

        $result = $this->service->generateFromItems([
            ['yearResidentId' => 10, 'month' => 11, 'calendarYear' => 2024],
        ]);

        $this->assertCount(1, $result['alerts']);
        $this->assertSame([], $result['capturedItems']);
        unlink($result['filePath']);
    }

    // ─── buildLines() is consistent with file content ─────────────────────────

    public function testBuildLinesMatchesWhatIsWrittenToFile(): void
    {
        $yr = $this->makeYearsResidentFull('W001', 'S001');
        $this->yearsResidentRepo->method('find')->willReturn($yr);
        $this->authChecker->method('isGranted')->willReturn(true);
        $data = [
            'timesheets' => [['start' => '2024-11-04 08:00:00', 'end' => '2024-11-04 16:00:00', 'pause' => 0]],
            'gardes'     => [],
            'absences'   => [],
        ];
        $this->getDataByMonth->method('fetchData')->willReturn($data);

        $result     = $this->service->generateFromItems([
            ['yearResidentId' => 10, 'month' => 11, 'calendarYear' => 2024],
        ]);
        $fileContent = file_get_contents($result['filePath']) ?: '';

        // payloadLines must appear verbatim in the generated file
        $this->assertStringContainsString(
            $result['capturedItems'][0]['payloadLines'],
            $fileContent,
        );
        unlink($result['filePath']);
    }

    // ─── Helper for generateFromItems tests ──────────────────────────────────

    private function makeYearsResidentFull(?string $workerHRID, ?string $sectionHRID): YearsResident&MockObject
    {
        $year = $this->createMock(\App\Entity\Years::class);
        $year->method('getId')->willReturn(1);

        $resource = $this->createMock(\App\Entity\StaffPlannerResources::class);
        $resource->method('getWorkerHRID')->willReturn($workerHRID);
        $resource->method('getSectionHRID')->willReturn($sectionHRID);

        $resident = $this->createMock(\App\Entity\Resident::class);
        $resident->method('getFirstname')->willReturn('Alice');
        $resident->method('getLastname')->willReturn('Martin');

        $yr = $this->createMock(YearsResident::class);
        $yr->method('getId')->willReturn(10);
        $yr->method('getAllowed')->willReturn(true);
        $yr->method('getResident')->willReturn($resident);
        $yr->method('getYear')->willReturn($year);
        $yr->method('getStaffPlannerResources')->willReturn($resource);

        return $yr;
    }
}
