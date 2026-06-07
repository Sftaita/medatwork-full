<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\Realtime;

use App\Entity\PeriodValidation;
use App\Entity\Resident;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\PeriodValidationRepository;
use App\Repository\ResidentValidationRepository;
use App\Repository\ResidentYearCalendarRepository;
use App\Repository\TimesheetRepository;
use App\Repository\YearsResidentRepository;
use App\Services\Realtime\RealtimeManagerService;
use App\Services\Statistics\ResidentStatisticsBuilder;
use App\Services\Statistics\StatisticTools;
use App\Services\Utils\Tools;
use PHPUnit\Framework\TestCase;

/**
 * Tests unitaires — RealtimeManagerService::buildForYear()
 *
 * Couverture Step 3 :
 *   — hasActivity=true si totalHours > 0
 *   — hasActivity=true si hospitalGardeHoursNb > 0
 *   — hasActivity=true si callableGardeNb > 0
 *   — hasActivity=true si monthNbOfAbsences > 0
 *   — hasActivity=false si tous les indicateurs sont à 0
 *   — accountActivated=true si resident.validatedAt !== null
 *   — accountActivated=false si resident.validatedAt === null
 *   — clés d'activité absentes du monthStats → pas d'erreur, hasActivity=false
 *
 * Couverture Step 5 :
 *   — validated=false si aucune PeriodValidation pour ce mois
 *   — validated=false si PV existe mais aucun ResidentValidation pour ce résident
 *   — validated=false si ResidentValidation.validated=false
 *   — validated=true  si ResidentValidation.validated=true
 *   — plusieurs résidents : chacun récupère son propre statut
 *   — hasActivity / accountActivated non altérés par l'ajout de validated
 *   — champs historiques inchangés, validated désormais présent
 *   — pas de N+1 : findOneBy et findValidatedMapForPeriod appelés une seule fois
 */
final class RealtimeManagerServiceTest extends TestCase
{
    // ── Fixtures ──────────────────────────────────────────────────────────────

    /**
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    private function baseMonthStats(array $overrides = []): array
    {
        return array_merge([
            'totalHours'           => 0.0,
            'scheduledMonth'       => 0.0,
            'veryHardHours'        => 0.0,
            'hardHours'            => 0.0,
            'callableGardeNb'      => 0,
            'hospitalGardeHoursNb' => 0.0,
            'monthNbOfAbsences'    => 0,
            'week'                 => [9 => 0.0, 10 => 0.0],
            'scheduledWeek'        => [9 => 0.0, 10 => 0.0],
        ], $overrides);
    }

    /** @return array<string, mixed> */
    private function baseScheduledAbsences(): array
    {
        return [
            'totalScheduledLeaves' => 30,
            'legalLeaves'          => 24,
            'scientificLeaves'     => 6,
            'paternityLeave'       => 0,
            'maternityLeave'       => 0,
            'unpaidLeave'          => 0,
        ];
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Instancie le service avec des mocks contrôlés et retourne la première entrée MaccsEntry.
     *
     * @param array<string, mixed>   $monthStats    Contrôle computeMonthStats()
     * @param \DateTimeInterface|null $validatedAt  Contrôle accountActivated
     * @param array<int,bool>|null   $validatedMap
     *     null    → aucune PeriodValidation (findOneBy retourne null)
     *     []      → PV existe, aucun ResidentValidation pour ce résident
     *     [42=>x] → PV existe, ResidentValidation.validated=x pour résident id=42
     * @return array<string, mixed>
     */
    private function buildFirstEntry(
        array $monthStats,
        ?\DateTimeInterface $validatedAt = null,
        ?array $validatedMap = null,
    ): array {
        $yearsResidentRepo  = $this->createMock(YearsResidentRepository::class);
        $timesheetRepo      = $this->createMock(TimesheetRepository::class);
        $gardeRepo          = $this->createMock(GardeRepository::class);
        $absenceRepo        = $this->createMock(AbsenceRepository::class);
        $calendarRepo       = $this->createMock(ResidentYearCalendarRepository::class);
        $statisticTools     = $this->createMock(StatisticTools::class);
        $statsBuilder       = $this->createMock(ResidentStatisticsBuilder::class);
        $tools              = $this->createMock(Tools::class);
        $periodValRepo      = $this->createMock(PeriodValidationRepository::class);
        $residentValRepo    = $this->createMock(ResidentValidationRepository::class);

        $statisticTools->method('boudariesDates')->willReturn([
            'startFromWeek'    => '2025-01-01 00:00:00',
            'endOfTheLastWeek' => '2025-01-31 23:59:59',
        ]);
        $tools->method('getWeeksArray')->willReturn([9 => [], 10 => []]);

        $resident = $this->createMock(Resident::class);
        $resident->method('getId')->willReturn(42);
        $resident->method('getFirstname')->willReturn('Alice');
        $resident->method('getLastname')->willReturn('Martin');
        $resident->method('getValidatedAt')->willReturn($validatedAt);

        $yr = $this->createMock(YearsResident::class);
        $yr->method('getResident')->willReturn($resident);

        $year = $this->createMock(Years::class);
        $year->method('getTitle')->willReturn('Test Year');

        $yearsResidentRepo->method('findBy')->willReturn([$yr]);
        $timesheetRepo->method('findByMonthAndByYear')->willReturn([]);
        $gardeRepo->method('findByMonthAndByYear')->willReturn([]);
        $absenceRepo->method('findByMonthAndByYear')->willReturn([]);
        $calendarRepo->method('findByMonthAndYear')->willReturn([]);

        $statsBuilder->method('computeMonthStats')->willReturn($monthStats);
        $statsBuilder->method('buildScheduledAbsences')->willReturn($this->baseScheduledAbsences());

        if ($validatedMap === null) {
            $periodValRepo->method('findOneBy')->willReturn(null);
        } else {
            $pv = $this->createMock(PeriodValidation::class);
            $periodValRepo->method('findOneBy')->willReturn($pv);
            $residentValRepo->method('findValidatedMapForPeriod')->willReturn($validatedMap);
        }

        $service = new RealtimeManagerService(
            $yearsResidentRepo,
            $timesheetRepo,
            $gardeRepo,
            $absenceRepo,
            $calendarRepo,
            $statisticTools,
            $statsBuilder,
            $tools,
            $periodValRepo,
            $residentValRepo,
        );

        $result = $service->buildForYear($year, 1);

        return $result['maccs'][0];
    }

    // ── hasActivity ───────────────────────────────────────────────────────────

    public function testHasActivityTrueWhenTotalHoursPositive(): void
    {
        $entry = $this->buildFirstEntry($this->baseMonthStats(['totalHours' => 10.5]));
        $this->assertTrue($entry['hasActivity'], 'totalHours > 0 doit donner hasActivity=true');
    }

    public function testHasActivityTrueWhenHospitalGardeHoursPositive(): void
    {
        $entry = $this->buildFirstEntry($this->baseMonthStats(['hospitalGardeHoursNb' => 6.0]));
        $this->assertTrue($entry['hasActivity'], 'hospitalGardeHoursNb > 0 doit donner hasActivity=true');
    }

    public function testHasActivityTrueWhenCallableGardeNbPositive(): void
    {
        $entry = $this->buildFirstEntry($this->baseMonthStats(['callableGardeNb' => 2]));
        $this->assertTrue($entry['hasActivity'], 'callableGardeNb > 0 doit donner hasActivity=true');
    }

    public function testHasActivityTrueWhenMonthNbOfAbsencesPositive(): void
    {
        $entry = $this->buildFirstEntry($this->baseMonthStats(['monthNbOfAbsences' => 3]));
        $this->assertTrue($entry['hasActivity'], 'monthNbOfAbsences > 0 doit donner hasActivity=true');
    }

    public function testHasActivityFalseWhenAllIndicatorsAreZero(): void
    {
        $entry = $this->buildFirstEntry($this->baseMonthStats());
        $this->assertFalse($entry['hasActivity'], 'Tous les indicateurs à 0 → hasActivity=false');
    }

    public function testMissingActivityKeysDoNotCrashAndReturnFalse(): void
    {
        $monthStats = [
            'totalHours'    => 0.0,
            'scheduledMonth' => 0.0,
            'veryHardHours'  => 0.0,
            'hardHours'      => 0.0,
            'week'           => [9 => 0.0, 10 => 0.0],
            'scheduledWeek'  => [9 => 0.0, 10 => 0.0],
            // hospitalGardeHoursNb, callableGardeNb, monthNbOfAbsences intentionnellement absents
        ];

        $entry = @$this->buildFirstEntry($monthStats);

        $this->assertFalse(
            $entry['hasActivity'],
            'Clés absentes → null coalescing ?? 0 → hasActivity=false'
        );
    }

    // ── accountActivated ──────────────────────────────────────────────────────

    public function testAccountActivatedTrueWhenValidatedAtIsSet(): void
    {
        $entry = $this->buildFirstEntry($this->baseMonthStats(), new \DateTime('2025-01-15'));
        $this->assertTrue($entry['accountActivated'], 'validatedAt !== null → accountActivated=true');
    }

    public function testAccountActivatedFalseWhenValidatedAtIsNull(): void
    {
        $entry = $this->buildFirstEntry($this->baseMonthStats(), null);
        $this->assertFalse($entry['accountActivated'], 'validatedAt === null → accountActivated=false');
    }

    // ── validated ─────────────────────────────────────────────────────────────

    public function testValidatedFalseWhenNoPeriodValidation(): void
    {
        // validatedMap=null → findOneBy retourne null → validated=false
        $entry = $this->buildFirstEntry($this->baseMonthStats(), null, null);
        $this->assertArrayHasKey('validated', $entry);
        $this->assertFalse($entry['validated'], 'Aucune PeriodValidation → validated=false');
    }

    public function testValidatedFalseWhenPeriodExistsButNoResidentValidation(): void
    {
        // PV existe mais la map est vide : ce résident n'a pas de ResidentValidation
        $entry = $this->buildFirstEntry($this->baseMonthStats(), null, []);
        $this->assertFalse($entry['validated'], 'PV existe, aucun ResidentValidation pour ce résident → validated=false');
    }

    public function testValidatedFalseWhenResidentValidationIsFalse(): void
    {
        $entry = $this->buildFirstEntry($this->baseMonthStats(), null, [42 => false]);
        $this->assertFalse($entry['validated'], 'ResidentValidation.validated=false → validated=false');
    }

    public function testValidatedTrueWhenResidentValidationIsTrue(): void
    {
        $entry = $this->buildFirstEntry($this->baseMonthStats(), null, [42 => true]);
        $this->assertTrue($entry['validated'], 'ResidentValidation.validated=true → validated=true');
    }

    public function testValidatedDoesNotRequirePeriodValidationToBeClosed(): void
    {
        // Un ResidentValidation.validated=true peut exister même si PeriodValidation.validated=false
        // (workflow intermédiaire : le manager valide les résidents un par un avant de clore la période).
        // Le service utilise ResidentValidation directement, sans filtrer sur PeriodValidation.validated.
        $entry = $this->buildFirstEntry($this->baseMonthStats(), null, [42 => true]);
        $this->assertTrue(
            $entry['validated'],
            'validated=true ne doit pas dépendre de PeriodValidation.validated — '
            . 'on lit ResidentValidation.validated directement'
        );
    }

    public function testMultipleResidentsGetOwnValidatedStatus(): void
    {
        // Setup mocks
        $yearsResidentRepo  = $this->createMock(YearsResidentRepository::class);
        $timesheetRepo      = $this->createMock(TimesheetRepository::class);
        $gardeRepo          = $this->createMock(GardeRepository::class);
        $absenceRepo        = $this->createMock(AbsenceRepository::class);
        $calendarRepo       = $this->createMock(ResidentYearCalendarRepository::class);
        $statisticTools     = $this->createMock(StatisticTools::class);
        $statsBuilder       = $this->createMock(ResidentStatisticsBuilder::class);
        $tools              = $this->createMock(Tools::class);
        $periodValRepo      = $this->createMock(PeriodValidationRepository::class);
        $residentValRepo    = $this->createMock(ResidentValidationRepository::class);

        $statisticTools->method('boudariesDates')->willReturn([
            'startFromWeek'    => '2025-01-01 00:00:00',
            'endOfTheLastWeek' => '2025-01-31 23:59:59',
        ]);
        $tools->method('getWeeksArray')->willReturn([9 => [], 10 => []]);

        // Résident A (id=10) : validé
        $residentA = $this->createMock(Resident::class);
        $residentA->method('getId')->willReturn(10);
        $residentA->method('getFirstname')->willReturn('Anna');
        $residentA->method('getLastname')->willReturn('Alpha');
        $residentA->method('getValidatedAt')->willReturn(null);

        $yrA = $this->createMock(YearsResident::class);
        $yrA->method('getResident')->willReturn($residentA);

        // Résident B (id=20) : non validé
        $residentB = $this->createMock(Resident::class);
        $residentB->method('getId')->willReturn(20);
        $residentB->method('getFirstname')->willReturn('Bob');
        $residentB->method('getLastname')->willReturn('Beta');
        $residentB->method('getValidatedAt')->willReturn(null);

        $yrB = $this->createMock(YearsResident::class);
        $yrB->method('getResident')->willReturn($residentB);

        $year = $this->createMock(Years::class);
        $year->method('getTitle')->willReturn('Test Year');

        $yearsResidentRepo->method('findBy')->willReturn([$yrA, $yrB]);
        $timesheetRepo->method('findByMonthAndByYear')->willReturn([]);
        $gardeRepo->method('findByMonthAndByYear')->willReturn([]);
        $absenceRepo->method('findByMonthAndByYear')->willReturn([]);
        $calendarRepo->method('findByMonthAndYear')->willReturn([]);
        $statsBuilder->method('computeMonthStats')->willReturn($this->baseMonthStats());
        $statsBuilder->method('buildScheduledAbsences')->willReturn($this->baseScheduledAbsences());

        $pv = $this->createMock(PeriodValidation::class);
        $periodValRepo->method('findOneBy')->willReturn($pv);
        // A=validé, B=non validé
        $residentValRepo->method('findValidatedMapForPeriod')->willReturn([10 => true, 20 => false]);

        $service = new RealtimeManagerService(
            $yearsResidentRepo, $timesheetRepo, $gardeRepo, $absenceRepo, $calendarRepo,
            $statisticTools, $statsBuilder, $tools, $periodValRepo, $residentValRepo,
        );

        $result = $service->buildForYear($year, 1);

        $this->assertCount(2, $result['maccs']);
        $this->assertTrue($result['maccs'][0]['validated'],  'Résident A (id=10) doit être validated=true');
        $this->assertFalse($result['maccs'][1]['validated'], 'Résident B (id=20) doit être validated=false');
    }

    public function testNoNPlusOneQueryWithMultipleResidents(): void
    {
        // findOneBy et findValidatedMapForPeriod doivent être appelés EXACTEMENT UNE FOIS
        // même avec plusieurs résidents — pas de boucle N+1.
        $yearsResidentRepo  = $this->createMock(YearsResidentRepository::class);
        $timesheetRepo      = $this->createMock(TimesheetRepository::class);
        $gardeRepo          = $this->createMock(GardeRepository::class);
        $absenceRepo        = $this->createMock(AbsenceRepository::class);
        $calendarRepo       = $this->createMock(ResidentYearCalendarRepository::class);
        $statisticTools     = $this->createMock(StatisticTools::class);
        $statsBuilder       = $this->createMock(ResidentStatisticsBuilder::class);
        $tools              = $this->createMock(Tools::class);
        $periodValRepo      = $this->createMock(PeriodValidationRepository::class);
        $residentValRepo    = $this->createMock(ResidentValidationRepository::class);

        $statisticTools->method('boudariesDates')->willReturn([
            'startFromWeek'    => '2025-01-01 00:00:00',
            'endOfTheLastWeek' => '2025-01-31 23:59:59',
        ]);
        $tools->method('getWeeksArray')->willReturn([9 => [], 10 => []]);

        $makeResident = function (int $id, string $name): Resident {
            $r = $this->createMock(Resident::class);
            $r->method('getId')->willReturn($id);
            $r->method('getFirstname')->willReturn($name);
            $r->method('getLastname')->willReturn('Test');
            $r->method('getValidatedAt')->willReturn(null);
            return $r;
        };

        $makeYr = function (Resident $resident): YearsResident {
            $yr = $this->createMock(YearsResident::class);
            $yr->method('getResident')->willReturn($resident);
            return $yr;
        };

        $r1 = $makeResident(1, 'Un');
        $r2 = $makeResident(2, 'Deux');
        $r3 = $makeResident(3, 'Trois');

        $year = $this->createMock(Years::class);
        $year->method('getTitle')->willReturn('Test Year');

        $yearsResidentRepo->method('findBy')->willReturn([$makeYr($r1), $makeYr($r2), $makeYr($r3)]);
        $timesheetRepo->method('findByMonthAndByYear')->willReturn([]);
        $gardeRepo->method('findByMonthAndByYear')->willReturn([]);
        $absenceRepo->method('findByMonthAndByYear')->willReturn([]);
        $calendarRepo->method('findByMonthAndYear')->willReturn([]);
        $statsBuilder->method('computeMonthStats')->willReturn($this->baseMonthStats());
        $statsBuilder->method('buildScheduledAbsences')->willReturn($this->baseScheduledAbsences());

        $pv = $this->createMock(PeriodValidation::class);

        // Assertions N+1 : exactement 1 appel chacun, même avec 3 résidents
        $periodValRepo->expects($this->exactly(1))
            ->method('findOneBy')
            ->willReturn($pv);

        $residentValRepo->expects($this->exactly(1))
            ->method('findValidatedMapForPeriod')
            ->willReturn([1 => true, 2 => false, 3 => true]);

        $service = new RealtimeManagerService(
            $yearsResidentRepo, $timesheetRepo, $gardeRepo, $absenceRepo, $calendarRepo,
            $statisticTools, $statsBuilder, $tools, $periodValRepo, $residentValRepo,
        );

        $result = $service->buildForYear($year, 1);

        $this->assertCount(3, $result['maccs']);
        $this->assertTrue($result['maccs'][0]['validated']);
        $this->assertFalse($result['maccs'][1]['validated']);
        $this->assertTrue($result['maccs'][2]['validated']);
    }

    // ── Régression : champs existants + validated désormais présent ───────────

    public function testExistingFieldsAreNotAlteredByNewFields(): void
    {
        $monthStats = $this->baseMonthStats([
            'totalHours'           => 150.5,
            'scheduledMonth'       => 200.0,
            'veryHardHours'        => 20.0,
            'hardHours'            => 8.0,
            'callableGardeNb'      => 2,
            'hospitalGardeHoursNb' => 12.0,
            'monthNbOfAbsences'    => 3,
            'week'                 => [9 => 40.0, 10 => 42.0],
            'scheduledWeek'        => [9 => 45.0, 10 => 45.0],
        ]);

        $entry = $this->buildFirstEntry($monthStats, new \DateTime('2025-01-15'), [42 => true]);

        $this->assertSame('Alice Martin', $entry['name']);
        $this->assertSame('Martin',       $entry['last']);
        $this->assertSame('150h30', $entry['totH']);
        $this->assertSame(150.5,    $entry['totVal']);
        $this->assertSame(200,      $entry['prevH']);
        $this->assertSame(75,       $entry['pct']);
        $this->assertSame('20h',    $entry['inconf']);
        $this->assertSame(20.0,     $entry['inconfV']);
        $this->assertSame('8h',     $entry['tres']);
        $this->assertSame(8.0,      $entry['tresV']);
        $this->assertSame(2,        $entry['app']);
        $this->assertSame('12h',    $entry['place']);
        $this->assertSame(3,        $entry['conge']['used']);
        $this->assertSame(30,       $entry['conge']['total']);
        $this->assertCount(5,       $entry['conge']['items']);
        $this->assertSame('Congé annuel', $entry['conge']['items'][0]['nm']);
        $this->assertSame([40, 42], $entry['week']['prest']);
        $this->assertSame([45, 45], $entry['week']['prev']);

        // Trois nouveaux champs présents
        $this->assertArrayHasKey('hasActivity',      $entry);
        $this->assertArrayHasKey('accountActivated', $entry);
        $this->assertArrayHasKey('validated',        $entry);
        $this->assertTrue($entry['validated']);
    }

    public function testHasActivityUnchangedByValidatedImplementation(): void
    {
        $entry = $this->buildFirstEntry(
            $this->baseMonthStats(['totalHours' => 10.0]),
            null,
            [42 => true],
        );
        $this->assertTrue($entry['hasActivity'], 'hasActivity doit rester true indépendamment de validated');
        $this->assertTrue($entry['validated']);
    }

    public function testAccountActivatedUnchangedByValidatedImplementation(): void
    {
        $entry = $this->buildFirstEntry(
            $this->baseMonthStats(),
            new \DateTime('2025-03-01'),
            [42 => true],
        );
        $this->assertTrue($entry['accountActivated'], 'accountActivated doit rester true indépendamment de validated');
        $this->assertTrue($entry['validated']);
    }
}
