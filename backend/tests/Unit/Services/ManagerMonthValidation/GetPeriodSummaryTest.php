<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\ManagerMonthValidation;

use App\Entity\Hospital;
use App\Entity\Manager;
use App\Entity\PeriodValidation;
use App\Entity\Resident;
use App\Entity\ResidentValidation;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\PeriodValidationRepository;
use App\Repository\TimesheetRepository;
use App\Services\ManagerMonthValidation\GetPeriodSummary;
use App\Services\ManagerMonthValidation\LegalPeriodsCalculator;
use App\Services\ManagerMonthValidation\WeeklyHoursChecker;
use App\Services\MonthValidation\ValidationService;
use App\Services\Utils\Tools;
use Doctrine\Common\Collections\ArrayCollection;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class GetPeriodSummaryTest extends TestCase
{
    /** @var PeriodValidationRepository&MockObject */
    private PeriodValidationRepository $periodRepo;

    /** @var AuthorizationCheckerInterface&MockObject */
    private AuthorizationCheckerInterface $authChecker;

    /** @var TimesheetRepository&MockObject */
    private TimesheetRepository $timesheetRepo;

    /** @var Tools&MockObject */
    private Tools $tools;

    /** @var GardeRepository&MockObject */
    private GardeRepository $gardeRepo;

    /** @var AbsenceRepository&MockObject */
    private AbsenceRepository $absenceRepo;

    /** @var ValidationService&MockObject */
    private ValidationService $validationService;

    /** @var LegalPeriodsCalculator&MockObject */
    private LegalPeriodsCalculator $legalPeriodsCalculator;

    /** @var WeeklyHoursChecker&MockObject */
    private WeeklyHoursChecker $weeklyHoursChecker;

    private GetPeriodSummary $service;

    protected function setUp(): void
    {
        $this->periodRepo             = $this->createMock(PeriodValidationRepository::class);
        $this->authChecker            = $this->createMock(AuthorizationCheckerInterface::class);
        $this->timesheetRepo          = $this->createMock(TimesheetRepository::class);
        $this->tools                  = $this->createMock(Tools::class);
        $this->gardeRepo              = $this->createMock(GardeRepository::class);
        $this->absenceRepo            = $this->createMock(AbsenceRepository::class);
        $this->validationService      = $this->createMock(ValidationService::class);
        $this->legalPeriodsCalculator = $this->createMock(LegalPeriodsCalculator::class);
        $this->weeklyHoursChecker     = $this->createMock(WeeklyHoursChecker::class);

        $this->service = new GetPeriodSummary(
            $this->periodRepo,
            $this->authChecker,
            $this->timesheetRepo,
            $this->tools,
            $this->gardeRepo,
            $this->absenceRepo,
            $this->validationService,
            $this->legalPeriodsCalculator,
            $this->weeklyHoursChecker,
        );
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private function makePeriod(int $yearNb = 2026, int $month = 3): PeriodValidation&MockObject
    {
        $period = $this->createMock(PeriodValidation::class);
        $period->method('getYearNb')->willReturn($yearNb);
        $period->method('getMonth')->willReturn($month);
        return $period;
    }

    /** @param list<YearsResident&MockObject> $residents */
    private function makeYear(array $residents = []): Years&MockObject
    {
        $year = $this->createMock(Years::class);
        $year->method('getResidents')->willReturn(new ArrayCollection($residents));
        return $year;
    }

    private function makeResident(int $id = 1, string $firstname = 'Jean', string $lastname = 'Dupont'): Resident&MockObject
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getId')->willReturn($id);
        $resident->method('getFirstname')->willReturn($firstname);
        $resident->method('getLastname')->willReturn($lastname);
        $resident->method('getAvatarPath')->willReturn(null);
        // validatedAt=null par défaut → accountActivated=false dans la réponse
        $resident->method('getValidatedAt')->willReturn(null);
        return $resident;
    }

    private function makeYearsResident(Resident $resident, bool $optingOut = false, bool $allowed = true): YearsResident&MockObject
    {
        $yr = $this->createMock(YearsResident::class);
        $yr->method('getResident')->willReturn($resident);
        $yr->method('getOptingOut')->willReturn($optingOut);
        $yr->method('getAllowed')->willReturn($allowed);
        return $yr;
    }

    private function makeResidentValidation(bool $validated = false): ResidentValidation&MockObject
    {
        $rv = $this->createMock(ResidentValidation::class);
        $rv->method('getValidated')->willReturn($validated);
        $rv->method('getValidatedBy')->willReturn(null);
        $rv->method('getValidationHistory')->willReturn(null);
        return $rv;
    }

    /** Configure defaults for a test with no overlapping periods (no DB fetch needed). */
    private function stubNoPeriods(): void
    {
        $this->legalPeriodsCalculator->method('getLegalPeriods')->willReturn([]);
        $this->legalPeriodsCalculator->method('getOverlappingLegalIntervals')->willReturn([]);
        $this->absenceRepo->method('ManagerfindByMonthAndResident')->willReturn([]);
        $this->tools->method('separateAbsenceByDay')->willReturn([]);
    }

    // ── countAbsencesByType ───────────────────────────────────────────────────

    public function testCountAbsencesByTypeReturnsEmptyForEmptyInput(): void
    {
        $result = $this->service->countAbsencesByType([]);
        self::assertSame([], $result);
    }

    public function testCountAbsencesByTypeCounts(): void
    {
        $this->tools->method('isHoliday')->willReturn(0); // not a holiday

        $absences = [
            ['start' => '2026-03-10 08:00:00', 'type' => 'annualLeave'],
            ['start' => '2026-03-11 08:00:00', 'type' => 'annualLeave'],
            ['start' => '2026-03-12 08:00:00', 'type' => 'sickLeave'],
        ];

        $result = $this->service->countAbsencesByType($absences);

        self::assertSame(2, $result['annualLeave']);
        self::assertSame(1, $result['sickLeave']);
    }

    public function testCountAbsencesByTypeRemapsPaidLeaveOnNonHolidayToAnnualLeave(): void
    {
        $this->tools->method('isHoliday')->willReturn(0); // not a holiday

        $absences = [
            ['start' => '2026-03-10 08:00:00', 'type' => 'paidLeave'],
        ];

        $result = $this->service->countAbsencesByType($absences);

        self::assertArrayNotHasKey('paidLeave', $result);
        self::assertSame(1, $result['annualLeave']);
    }

    public function testCountAbsencesByTypeCountsHolidayAsPaidLeave(): void
    {
        $this->tools->method('isHoliday')->willReturn(3); // public holiday

        $absences = [
            ['start' => '2026-04-21 08:00:00', 'type' => 'annualLeave'],
        ];

        $result = $this->service->countAbsencesByType($absences);

        self::assertArrayNotHasKey('annualLeave', $result);
        self::assertSame(1, $result['paidLeave']);
    }

    public function testCountAbsencesByTypeMixedHolidayAndRegular(): void
    {
        // isHoliday returns 3 for the first call (holiday), 0 for the rest
        $this->tools->method('isHoliday')->willReturnOnConsecutiveCalls(3, 0, 0);

        $absences = [
            ['start' => '2026-04-21 08:00:00', 'type' => 'annualLeave'], // holiday → paidLeave
            ['start' => '2026-03-10 08:00:00', 'type' => 'annualLeave'], // normal → annualLeave
            ['start' => '2026-03-11 08:00:00', 'type' => 'sickLeave'],   // normal → sickLeave
        ];

        $result = $this->service->countAbsencesByType($absences);

        self::assertSame(1, $result['paidLeave']);
        self::assertSame(1, $result['annualLeave']);
        self::assertSame(1, $result['sickLeave']);
    }

    // ── period not found ──────────────────────────────────────────────────────

    public function testGetResidentSummaryThrowsNotFoundWhenPeriodMissing(): void
    {
        $this->periodRepo->method('findOneBy')->willReturn(null);

        $this->expectException(NotFoundHttpException::class);
        $this->service->getResidentSummary(999);
    }

    public function testGenerateResidentPeriodDataThrowsNotFoundWhenPeriodMissing(): void
    {
        $this->periodRepo->method('findOneBy')->willReturn(null);

        $this->expectException(NotFoundHttpException::class);
        $this->service->generateResidentPeriodData(999);
    }

    // ── year not associated ───────────────────────────────────────────────────

    public function testGetResidentSummaryThrowsRuntimeExceptionWhenYearIsNull(): void
    {
        $period = $this->makePeriod();
        $period->method('getYear')->willReturn(null);
        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(true);

        $this->expectException(\RuntimeException::class);
        $this->service->getResidentSummary(1);
    }

    // ── access denied ─────────────────────────────────────────────────────────

    public function testGetResidentSummaryThrowsAccessDeniedWhenNotGranted(): void
    {
        $period = $this->makePeriod();
        $year   = $this->makeYear();
        $period->method('getYear')->willReturn($year);
        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(false);

        $this->expectException(AccessDeniedException::class);
        $this->service->getResidentSummary(1);
    }

    public function testGenerateResidentPeriodDataThrowsAccessDeniedWhenNotGranted(): void
    {
        $period = $this->makePeriod();
        $year   = $this->makeYear();
        $period->method('getYear')->willReturn($year);
        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(false);

        $this->expectException(AccessDeniedException::class);
        $this->service->generateResidentPeriodData(1);
    }

    // ── no residents ──────────────────────────────────────────────────────────

    public function testGetResidentSummaryReturnsEmptyArrayWhenNoResidents(): void
    {
        $period = $this->makePeriod();
        $year   = $this->makeYear([]); // no residents
        $period->method('getYear')->willReturn($year);
        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(true);

        $result = $this->service->getResidentSummary(1);

        self::assertSame([], $result);
    }

    public function testGenerateResidentPeriodDataReturnsEmptyArrayWhenNoResidents(): void
    {
        $period = $this->makePeriod();
        $year   = $this->makeYear([]);
        $period->method('getYear')->willReturn($year);
        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(true);

        $result = $this->service->generateResidentPeriodData(1);

        self::assertSame([], $result);
    }

    // ── happy path: one resident, no overlapping periods ─────────────────────

    public function testGetResidentSummaryReturnsResidentStructureWhenNoPeriods(): void
    {
        $resident  = $this->makeResident(42, 'Alice', 'Martin');
        $yr        = $this->makeYearsResident($resident, false);
        $period    = $this->makePeriod(2026, 3);
        $year      = $this->makeYear([$yr]);

        $period->method('getYear')->willReturn($year);
        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->stubNoPeriods();

        $result = $this->service->getResidentSummary(1);

        self::assertCount(1, $result);
        $entry = $result[0];

        self::assertSame(42, $entry['residentId']);
        self::assertSame('Alice', $entry['residentFirstname']);
        self::assertSame('Martin', $entry['residentLastname']);
        self::assertFalse($entry['optingOut']);
        self::assertSame(0, $entry['hospital']);
        self::assertSame(0, $entry['callable']);
        self::assertSame(0, $entry['daysOfLeaves']);
        self::assertSame([], $entry['warningHours']);
        self::assertSame([], $entry['IllegalHours']);
        self::assertSame([], $entry['errors']);
        self::assertTrue($entry['smoothedHours']);
    }

    public function testGetResidentSummaryOptingOutResidentHasHigherLimits(): void
    {
        $resident  = $this->makeResident(1, 'Bob', 'Opting');
        $yr        = $this->makeYearsResident($resident, true); // optingOut = true
        $period    = $this->makePeriod(2026, 3);
        $year      = $this->makeYear([$yr]);

        $period->method('getYear')->willReturn($year);
        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->stubNoPeriods();

        $result = $this->service->getResidentSummary(1);

        self::assertCount(1, $result);
        self::assertTrue($result[0]['optingOut']);
        // Limits for opting-out resident
        self::assertSame(60, $result[0]['limits']['limit']);
        self::assertSame(72, $result[0]['limits']['highLimit']);
    }

    public function testGenerateResidentPeriodDataReturnsResidentStructureWhenNoPeriods(): void
    {
        $resident  = $this->makeResident(7, 'Marie', 'Curie');
        $yr        = $this->makeYearsResident($resident, false);
        $period    = $this->makePeriod(2026, 3);
        $year      = $this->makeYear([$yr]);

        $period->method('getYear')->willReturn($year);
        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->stubNoPeriods();

        $rv = $this->makeResidentValidation(false);
        $this->validationService->method('getOrCreateResidentValidation')->willReturn($rv);

        $result = $this->service->generateResidentPeriodData(1);

        self::assertCount(1, $result);
        $entry = $result[0];

        self::assertSame(7, $entry['residentId']);
        self::assertSame(0, $entry['hospital']);
        self::assertSame(0, $entry['callable']);
        self::assertSame([], $entry['warnings']);
        self::assertSame([], $entry['shiftOverlap']);

        self::assertArrayHasKey('validationInformation', $entry);
        self::assertFalse($entry['validationInformation']['validated']);
        self::assertNull($entry['validationInformation']['validatedBy']);
    }

    public function testGenerateResidentPeriodDataMarksValidatedPeriod(): void
    {
        $resident = $this->makeResident(8, 'Paul', 'Broca');
        $yr       = $this->makeYearsResident($resident, false);
        $period   = $this->makePeriod(2026, 3);
        $year     = $this->makeYear([$yr]);

        $period->method('getYear')->willReturn($year);
        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->stubNoPeriods();

        $rv = $this->makeResidentValidation(true);
        $this->validationService->method('getOrCreateResidentValidation')->willReturn($rv);

        $result = $this->service->generateResidentPeriodData(1);

        self::assertTrue($result[0]['validationInformation']['validated']);
    }

    // ── happy path: one resident, one overlapping period ─────────────────────

    public function testGetResidentSummaryProcessesOneOverlappingPeriod(): void
    {
        $resident = $this->makeResident(1, 'Jean', 'Dupont');
        $yr       = $this->makeYearsResident($resident, false);
        $period   = $this->makePeriod(2026, 3);
        $year     = $this->makeYear([$yr]);

        $period->method('getYear')->willReturn($year);
        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(true);

        $legalIntervals = ['Period 1' => ['start' => '2026-02-17 00:00:00', 'end' => '2026-05-02 23:59:59']];
        $this->legalPeriodsCalculator->method('getLegalPeriods')->willReturn($legalIntervals);
        $this->legalPeriodsCalculator->method('getOverlappingLegalIntervals')->willReturn(['Period 1']);

        $this->timesheetRepo->method('ManagerfindByMonthAndResident')->willReturn([]);
        $this->gardeRepo->method('ManagerfindByMonthAndResident')->willReturn([]);
        $this->absenceRepo->method('ManagerfindByMonthAndResident')->willReturn([]);
        $this->tools->method('separateTimesheetsByDay')->willReturn([]);
        $this->tools->method('separateGardeByDay')->willReturn([]);
        $this->tools->method('separateAbsenceByDay')->willReturn([]);

        $this->weeklyHoursChecker->method('hoursCounter')->willReturn([]);
        $this->weeklyHoursChecker->method('checkWeeklyHours')->willReturn([
            'warningHours' => [],
            'illegalHours' => [],
            'errors'       => [],
        ]);
        $this->weeklyHoursChecker->method('checkWeeklyHoursExceedLimit')->willReturn(null);

        $result = $this->service->getResidentSummary(1);

        self::assertCount(1, $result);
        $entry = $result[0];

        self::assertArrayHasKey('periodsinfo', $entry);
        self::assertCount(1, $entry['periodsinfo']);
        self::assertSame('2026-02-17 00:00:00', $entry['periodsinfo'][0]['periodStart']);
        self::assertSame('2026-05-02 23:59:59', $entry['periodsinfo'][0]['periodEnd']);
        self::assertSame([], $entry['errors']);
    }

    public function testGenerateResidentPeriodDataProcessesOneOverlappingPeriod(): void
    {
        $resident = $this->makeResident(1, 'Jean', 'Dupont');
        $yr       = $this->makeYearsResident($resident, false);
        $period   = $this->makePeriod(2026, 3);
        $year     = $this->makeYear([$yr]);

        $period->method('getYear')->willReturn($year);
        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(true);

        $legalIntervals = ['Period 1' => ['start' => '2026-02-17 00:00:00', 'end' => '2026-05-02 23:59:59']];
        $this->legalPeriodsCalculator->method('getLegalPeriods')->willReturn($legalIntervals);
        $this->legalPeriodsCalculator->method('getOverlappingLegalIntervals')->willReturn(['Period 1']);

        $this->timesheetRepo->method('ManagerfindByMonthAndResident')->willReturn([]);
        $this->gardeRepo->method('ManagerfindByMonthAndResident')->willReturn([]);
        $this->absenceRepo->method('ManagerfindByMonthAndResident')->willReturn([]);
        $this->tools->method('separateTimesheetsByDay')->willReturn([]);
        $this->tools->method('separateGardeByDay')->willReturn([]);
        $this->tools->method('separateAbsenceByDay')->willReturn([]);
        $this->tools->method('checkIfDateIsInCurrentMonth')->willReturn(false);

        $this->weeklyHoursChecker->method('hoursCounter')->willReturn([]);
        $this->weeklyHoursChecker->method('checkWeeklyHoursImproved')->willReturn([
            'warningHours' => [],
            'illegalHours' => [],
            'warnings'     => [],
        ]);
        $this->weeklyHoursChecker->method('checkWeeklyHoursExceedLimitImproved')->willReturn([]);

        $rv = $this->makeResidentValidation(false);
        $this->validationService->method('getOrCreateResidentValidation')->willReturn($rv);

        $result = $this->service->generateResidentPeriodData(1);

        self::assertCount(1, $result);
        $entry = $result[0];

        self::assertArrayHasKey('periodsinfo', $entry);
        self::assertCount(1, $entry['periodsinfo']);
        self::assertSame('Period 1', $entry['periodsinfo'][0]['period']);
        self::assertSame('1', $entry['periodsinfo'][0]['periodNumber']);
        self::assertSame([], $entry['shiftOverlap']);
        self::assertFalse($entry['validationInformation']['validated']);
    }

    // ── smoothing ─────────────────────────────────────────────────────────────

    public function testGetResidentSummaryFlagsSmoothedHoursViolation(): void
    {
        $resident = $this->makeResident(1, 'Jean', 'Dupont');
        $yr       = $this->makeYearsResident($resident, false); // limit = 48h
        $period   = $this->makePeriod(2026, 3);
        $year     = $this->makeYear([$yr]);

        $period->method('getYear')->willReturn($year);
        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(true);

        $legalIntervals = ['Period 1' => ['start' => '2026-02-17 00:00:00', 'end' => '2026-05-02 23:59:59']];
        $this->legalPeriodsCalculator->method('getLegalPeriods')->willReturn($legalIntervals);
        $this->legalPeriodsCalculator->method('getOverlappingLegalIntervals')->willReturn(['Period 1']);

        $this->timesheetRepo->method('ManagerfindByMonthAndResident')->willReturn([]);
        $this->gardeRepo->method('ManagerfindByMonthAndResident')->willReturn([]);
        $this->absenceRepo->method('ManagerfindByMonthAndResident')->willReturn([]);
        $this->tools->method('separateTimesheetsByDay')->willReturn([]);
        $this->tools->method('separateGardeByDay')->willReturn([]);
        $this->tools->method('separateAbsenceByDay')->willReturn([]);

        // 52h average → exceeds 48h limit
        $this->weeklyHoursChecker->method('hoursCounter')->willReturn([52.0, 52.0]);
        $this->weeklyHoursChecker->method('checkWeeklyHours')->willReturn([
            'warningHours' => [],
            'illegalHours' => [],
            'errors'       => [],
        ]);
        $this->weeklyHoursChecker->method('checkWeeklyHoursExceedLimit')->willReturn(null);

        $result = $this->service->getResidentSummary(1);

        self::assertFalse($result[0]['smoothedHours']);
        self::assertNotEmpty($result[0]['errors']);
        self::assertStringContainsString('lissage', $result[0]['errors'][0]);
    }

    public function testGenerateResidentPeriodDataFlagsSmoothedHoursViolation(): void
    {
        $resident = $this->makeResident(1, 'Jean', 'Dupont');
        $yr       = $this->makeYearsResident($resident, false); // limit = 48h
        $period   = $this->makePeriod(2026, 3);
        $year     = $this->makeYear([$yr]);

        $period->method('getYear')->willReturn($year);
        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(true);

        $legalIntervals = ['Period 1' => ['start' => '2026-02-17 00:00:00', 'end' => '2026-05-02 23:59:59']];
        $this->legalPeriodsCalculator->method('getLegalPeriods')->willReturn($legalIntervals);
        $this->legalPeriodsCalculator->method('getOverlappingLegalIntervals')->willReturn(['Period 1']);

        $this->timesheetRepo->method('ManagerfindByMonthAndResident')->willReturn([]);
        $this->gardeRepo->method('ManagerfindByMonthAndResident')->willReturn([]);
        $this->absenceRepo->method('ManagerfindByMonthAndResident')->willReturn([]);
        $this->tools->method('separateTimesheetsByDay')->willReturn([]);
        $this->tools->method('separateGardeByDay')->willReturn([]);
        $this->tools->method('separateAbsenceByDay')->willReturn([]);
        $this->tools->method('checkIfDateIsInCurrentMonth')->willReturn(false);

        // 55h average → exceeds 48h limit
        $this->weeklyHoursChecker->method('hoursCounter')->willReturn([55.0, 55.0]);
        $this->weeklyHoursChecker->method('checkWeeklyHoursImproved')->willReturn([
            'warningHours' => [],
            'illegalHours' => [],
            'warnings'     => [],
        ]);
        $this->weeklyHoursChecker->method('checkWeeklyHoursExceedLimitImproved')->willReturn([]);

        $rv = $this->makeResidentValidation(false);
        $this->validationService->method('getOrCreateResidentValidation')->willReturn($rv);

        $result = $this->service->generateResidentPeriodData(1);

        self::assertFalse($result[0]['smoothedHours']);
        self::assertNotEmpty($result[0]['warnings']);
        self::assertSame('smoothing', $result[0]['warnings'][0]['warningType']);
    }

    // ── validatedBy — sérialisation scalaire (régression circular reference) ──

    /**
     * Régression : $this->json() lançait une CircularReferenceException quand
     * validatedBy était sérialisé comme entité Manager complète avec proxy Hospital.
     *
     * Le fix consiste à retourner ['id' => ..., 'name' => ...] plutôt que l'entité.
     * Ce test détecte tout retour en arrière vers une entité non scalaire.
     */
    public function testValidatedByIsScalarArrayNotEntityToPreventCircularReference(): void
    {
        // Créer un Hospital mock (la relation qui causait la circular reference via le proxy Doctrine)
        $hospital = $this->createMock(Hospital::class);
        $hospital->method('getId')->willReturn(5);

        // Créer un Manager mock avec une relation Hospital (exactement le scénario du bug)
        $manager = $this->createMock(Manager::class);
        $manager->method('getId')->willReturn(11);
        $manager->method('getFirstname')->willReturn('Brigitte');
        $manager->method('getLastname')->willReturn('Delvaux');
        $manager->method('getAdminHospital')->willReturn($hospital); // relation qui causait la boucle

        $rv = $this->createMock(ResidentValidation::class);
        $rv->method('getValidated')->willReturn(true);
        $rv->method('getValidatedBy')->willReturn($manager); // ← retourne l'entité Manager
        $rv->method('getValidationHistory')->willReturn([]);

        $resident = $this->makeResident(42, 'Alice', 'Dupont');
        $yr       = $this->makeYearsResident($resident, false);
        $period   = $this->makePeriod(2026, 4);
        $year     = $this->makeYear([$yr]);

        $period->method('getYear')->willReturn($year);
        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->stubNoPeriods();
        $this->validationService->method('getOrCreateResidentValidation')->willReturn($rv);

        $result = $this->service->generateResidentPeriodData(1);

        self::assertCount(1, $result);
        $validatedBy = $result[0]['validationInformation']['validatedBy'];

        // ── Assertions clés ──────────────────────────────────────────────────

        // 1. validatedBy est un tableau scalaire, PAS une entité Manager
        self::assertIsArray($validatedBy, 'validatedBy doit être un tableau scalaire, pas une entité (risque de circular reference)');

        // 2. La structure scalaire contient id et name
        self::assertArrayHasKey('id',   $validatedBy);
        self::assertArrayHasKey('name', $validatedBy);
        self::assertSame(11, $validatedBy['id']);
        self::assertSame('Brigitte Delvaux', $validatedBy['name']);

        // 3. json_encode réussit sans exception — reproduction exacte du bug 500
        //    Avant le fix : lançait \Symfony\Component\Serializer\Exception\CircularReferenceException
        $json = json_encode($result, JSON_THROW_ON_ERROR);
        self::assertNotEmpty($json);
        self::assertStringContainsString('"validatedBy"', $json);
        self::assertStringContainsString('"Brigitte Delvaux"', $json);
    }

    /**
     * Quand aucun manager n'a encore validé (première fois), validatedBy doit être null
     * et non un tableau vide — null est sérialisable sans risque.
     */
    public function testValidatedByIsNullWhenNeverValidated(): void
    {
        $rv = $this->createMock(ResidentValidation::class);
        $rv->method('getValidated')->willReturn(false);
        $rv->method('getValidatedBy')->willReturn(null); // pas encore validé
        $rv->method('getValidationHistory')->willReturn([]);

        $resident = $this->makeResident(1, 'Jean', 'Dupont');
        $yr       = $this->makeYearsResident($resident, false);
        $period   = $this->makePeriod(2026, 4);
        $year     = $this->makeYear([$yr]);

        $period->method('getYear')->willReturn($year);
        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->stubNoPeriods();
        $this->validationService->method('getOrCreateResidentValidation')->willReturn($rv);

        $result = $this->service->generateResidentPeriodData(1);

        self::assertNull($result[0]['validationInformation']['validatedBy']);

        // json_encode doit aussi fonctionner pour le cas null
        $json = json_encode($result, JSON_THROW_ON_ERROR);
        self::assertStringContainsString('"validatedBy":null', $json);
    }

    // ── YearsResident with null resident is skipped ───────────────────────────

    public function testGetResidentSummarySkipsYearsResidentWithNullResident(): void
    {
        $yr = $this->createMock(YearsResident::class);
        $yr->method('getResident')->willReturn(null);

        $period = $this->makePeriod(2026, 3);
        $year   = $this->makeYear([$yr]);

        $period->method('getYear')->willReturn($year);
        $this->periodRepo->method('findOneBy')->willReturn($period);
        $this->authChecker->method('isGranted')->willReturn(true);

        $result = $this->service->getResidentSummary(1);

        self::assertSame([], $result);
    }
}
