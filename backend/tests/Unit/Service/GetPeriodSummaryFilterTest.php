<?php

declare(strict_types=1);

namespace App\Tests\Unit\Service;

use App\Entity\PeriodValidation;
use App\Entity\Resident;
use App\Entity\ResidentValidation;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\PeriodValidationRepository;
use App\Repository\TimesheetRepository;
use App\Security\Voter\YearAccessVoter;
use App\Services\ManagerMonthValidation\GetPeriodSummary;
use App\Services\ManagerMonthValidation\LegalPeriodsCalculator;
use App\Services\ManagerMonthValidation\WeeklyHoursChecker;
use App\Services\MonthValidation\ValidationService;
use App\Services\Utils\Tools;
use Doctrine\Common\Collections\ArrayCollection;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * Unit tests — GetPeriodSummary::generateResidentPeriodData()
 *
 * Vérifie :
 *   1. Résidents retirés (allowed=false)     → exclus du résultat
 *   2. Compte non activé (validatedAt=null)  → accountActivated=false
 *   3. Compte activé    (validatedAt set)    → accountActivated=true
 *   4. Aucune donnée sur la période          → hasActivity=false
 */
final class GetPeriodSummaryFilterTest extends TestCase
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Construit un service avec toutes les dépendances mockées, prêt pour les tests sans données. */
    private function buildService(
        Years $year,
        ?ResidentValidation $residentValidation = null,
    ): GetPeriodSummary {
        $period = $this->createMock(PeriodValidation::class);
        $period->method('getYearNb')->willReturn(2026);
        $period->method('getMonth')->willReturn(1);
        $period->method('getYear')->willReturn($year);
        $period->method('getValidated')->willReturn(false);

        $periodRepo = $this->createMock(PeriodValidationRepository::class);
        $periodRepo->method('findOneBy')->willReturn($period);

        $authChecker = $this->createMock(AuthorizationCheckerInterface::class);
        $authChecker->method('isGranted')
            ->with(YearAccessVoter::DATA_ACCESS, $year)
            ->willReturn(true);

        $tools = $this->createMock(Tools::class);
        $tools->method('separateTimesheetsByDay')->willReturn([]);
        $tools->method('separateGardeByDay')->willReturn([]);
        $tools->method('separateAbsenceByDay')->willReturn([]);
        $tools->method('checkIfDateIsInCurrentMonth')->willReturn(false);
        $tools->method('isHoliday')->willReturn(0);

        $timesheetRepo = $this->createMock(TimesheetRepository::class);
        $gardeRepo     = $this->createMock(GardeRepository::class);
        $absenceRepo   = $this->createMock(AbsenceRepository::class);
        $absenceRepo->method('ManagerfindByMonthAndResident')->willReturn([]);

        $rv = $residentValidation ?? $this->buildEmptyResidentValidation();
        $validationService = $this->createMock(ValidationService::class);
        $validationService->method('getOrCreateResidentValidation')->willReturn($rv);

        $legalCalc = $this->createMock(LegalPeriodsCalculator::class);
        $legalCalc->method('getLegalPeriods')->willReturn([]);
        $legalCalc->method('getOverlappingLegalIntervals')->willReturn([]);

        $weeklyChecker = $this->createMock(WeeklyHoursChecker::class);

        return new GetPeriodSummary(
            $periodRepo,
            $authChecker,
            $timesheetRepo,
            $tools,
            $gardeRepo,
            $absenceRepo,
            $validationService,
            $legalCalc,
            $weeklyChecker,
        );
    }

    private function buildEmptyResidentValidation(): ResidentValidation
    {
        $rv = $this->createMock(ResidentValidation::class);
        $rv->method('getValidated')->willReturn(false);
        $rv->method('getValidatedBy')->willReturn(null);
        $rv->method('getValidationHistory')->willReturn([]);
        return $rv;
    }

    /**
     * @param array{validatedAt: ?\DateTimeInterface, allowed: bool} $opts
     */
    private function buildYear(array $opts): Years
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getId')->willReturn(1);
        $resident->method('getFirstname')->willReturn('Alice');
        $resident->method('getLastname')->willReturn('Martin');
        $resident->method('getAvatarPath')->willReturn(null);
        $resident->method('getValidatedAt')->willReturn($opts['validatedAt']);

        $yr = $this->createMock(YearsResident::class);
        $yr->method('getResident')->willReturn($resident);
        $yr->method('getAllowed')->willReturn($opts['allowed']);
        $yr->method('getOptingOut')->willReturn(false);

        $year = $this->createMock(Years::class);
        $year->method('getResidents')->willReturn(new ArrayCollection([$yr]));

        return $year;
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function testRetiredResidentIsExcludedFromReport(): void
    {
        $year    = $this->buildYear(['validatedAt' => null, 'allowed' => false]);
        $service = $this->buildService($year);

        $result = $service->generateResidentPeriodData(1);

        $this->assertEmpty(
            $result,
            'Un résident avec allowed=false (retiré) ne doit pas figurer dans le rapport de validation'
        );
    }

    public function testInvitedResidentHasAccountActivatedFalse(): void
    {
        $year    = $this->buildYear(['validatedAt' => null, 'allowed' => true]);
        $service = $this->buildService($year);

        $result = $service->generateResidentPeriodData(1);

        $this->assertCount(1, $result);
        $this->assertFalse(
            $result[0]['accountActivated'],
            'Un résident invité (validatedAt=null) doit avoir accountActivated=false'
        );
    }

    public function testActivatedResidentHasAccountActivatedTrue(): void
    {
        $year    = $this->buildYear(['validatedAt' => new \DateTime('2026-01-15'), 'allowed' => true]);
        $service = $this->buildService($year);

        $result = $service->generateResidentPeriodData(1);

        $this->assertCount(1, $result);
        $this->assertTrue(
            $result[0]['accountActivated'],
            'Un résident avec validatedAt défini doit avoir accountActivated=true'
        );
    }

    public function testResidentWithNoDataHasActivityFalse(): void
    {
        // Repos vides → aucun encodage
        $year    = $this->buildYear(['validatedAt' => new \DateTime('2026-01-10'), 'allowed' => true]);
        $service = $this->buildService($year);

        $result = $service->generateResidentPeriodData(1);

        $this->assertCount(1, $result);
        $this->assertFalse(
            $result[0]['hasActivity'],
            'Un résident sans aucun encodage sur la période doit avoir hasActivity=false'
        );
    }

    public function testAccountActivatedAndHasActivityFieldsAlwaysPresent(): void
    {
        $year    = $this->buildYear(['validatedAt' => null, 'allowed' => true]);
        $service = $this->buildService($year);

        $result = $service->generateResidentPeriodData(1);

        $this->assertArrayHasKey('accountActivated', $result[0]);
        $this->assertArrayHasKey('hasActivity', $result[0]);
    }
}
