<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Entity\Manager;
use App\Entity\NotificationManager;
use App\Entity\PeriodValidation;
use App\Entity\Years;
use App\Repository\ManagerRepository;
use App\Repository\ManagerYearsRepository;
use App\Repository\ResidentRepository;
use App\Repository\YearsResidentRepository;
use App\Services\NotificationDecisionService;
use App\Services\Notifications\ValidationNotifications;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

/**
 * P2-E1 — ValidationNotifications : metadata sur NotificationManager
 *
 * Validation mois complet (via MonthValidationController → UpdateMonthStatus).
 * Pas de residentId/residentName dans la metadata : cette validation concerne
 * tous les résidents de l'année, pas un résident spécifique.
 *
 * VE2-01 : metadata.yearId
 * VE2-02 : metadata.yearTitle
 * VE2-03 : metadata.tab = 'general'
 * VE2-04 : metadata.version = 1
 * VE2-05 : metadata.eventType = 'MONTH_VALIDATION' pour notifyAccepted
 * VE2-06 : metadata.eventType = 'VALIDATION_REJECTED' pour notifyUnvalidated
 * VE2-07 : metadata.month = period.getMonth()
 * VE2-08 : metadata.yearNb = period.getYearNb()
 * VE2-09 : metadata ne contient PAS residentId (validation mois, pas per-résident)
 */
class ValidationNotificationsMetadataTest extends TestCase
{
    private const ACTOR_ID  = 1;
    private const MANAGER_B = 2;

    // ── Factories ─────────────────────────────────────────────────────────────

    private function mockManager(int $id, string $first = 'Test', string $last = 'Manager'): Manager
    {
        $m = $this->createMock(Manager::class);
        $m->method('getId')->willReturn($id);
        $m->method('getFirstname')->willReturn($first);
        $m->method('getLastname')->willReturn($last);
        return $m;
    }

    private function mockYear(int $id = 7, string $title = 'Cardiologie 2025-2026'): Years
    {
        $y = $this->createMock(Years::class);
        $y->method('getId')->willReturn($id);
        $y->method('getTitle')->willReturn($title);
        return $y;
    }

    private function mockPeriod(Years $year, int $month = 4, int $yearNb = 2026): PeriodValidation
    {
        $p = $this->createMock(PeriodValidation::class);
        $p->method('getYear')->willReturn($year);
        $p->method('getMonth')->willReturn($month);
        $p->method('getYearNb')->willReturn($yearNb);
        return $p;
    }

    /**
     * @param list<NotificationManager> $captured
     */
    private function capturingEm(array &$captured): EntityManagerInterface
    {
        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('flush');
        $em->method('persist')->willReturnCallback(
            static function ($n) use (&$captured): void {
                if ($n instanceof NotificationManager) {
                    $captured[] = $n;
                }
            }
        );
        return $em;
    }

    private function buildService(
        EntityManagerInterface      $em,
        NotificationDecisionService $decisionService,
        array                       $coManagerIds,
    ): ValidationNotifications {
        $rows = array_map(fn(int $id) => ['managerId' => $id], [...$coManagerIds, self::ACTOR_ID]);

        $managerYearsRepo = $this->createMock(ManagerYearsRepository::class);
        $managerYearsRepo->method('fetchYearManagers')->willReturn($rows);

        $coManagers  = array_map(fn(int $id) => $this->mockManager($id), $coManagerIds);
        $managerRepo = $this->createMock(ManagerRepository::class);
        $managerRepo->method('findBy')->willReturn($coManagers);

        // Aucun résident dans ces tests (on teste uniquement la metadata manager)
        $yearsResidentRepo = $this->createMock(YearsResidentRepository::class);
        $yearsResidentRepo->method('findYearAllowedResidents')->willReturn([]);

        $residentRepo = $this->createMock(ResidentRepository::class);
        $residentRepo->method('findBy')->willReturn([]);

        return new ValidationNotifications(
            $em,
            $yearsResidentRepo,
            $managerYearsRepo,
            $managerRepo,
            $residentRepo,
            $decisionService,
        );
    }

    /** Exécute notifyAccepted et retourne les NotificationManager capturées. */
    private function runAccepted(int $month = 4, int $yearNb = 2026): array
    {
        $captured        = [];
        $em              = $this->capturingEm($captured);
        $decisionService = $this->createMock(NotificationDecisionService::class);
        $decisionService->method('shouldSend')->willReturn(true);

        $year   = $this->mockYear(7, 'Cardiologie 2025-2026');
        $period = $this->mockPeriod($year, $month, $yearNb);

        $service = $this->buildService($em, $decisionService, [self::MANAGER_B]);
        $service->notifyAcceptedPeriodValidation($period, $this->mockManager(self::ACTOR_ID, 'Chef', 'Service'));

        return $captured;
    }

    private function runUnvalidated(): array
    {
        $captured        = [];
        $em              = $this->capturingEm($captured);
        $decisionService = $this->createMock(NotificationDecisionService::class);
        $decisionService->method('shouldSend')->willReturn(true);

        $year   = $this->mockYear(7, 'Cardiologie 2025-2026');
        $period = $this->mockPeriod($year, 4, 2026);

        $service = $this->buildService($em, $decisionService, [self::MANAGER_B]);
        $service->notifyUnvalidatedPeriodValidation($period, $this->mockManager(self::ACTOR_ID, 'Chef', 'Service'));

        return $captured;
    }

    // ── VE2-01 ────────────────────────────────────────────────────────────────

    /** RED : setMetadata() non appelé → metadata = null. */
    public function testManagerMetadataContainsYearId(): void
    {
        $captured = $this->runAccepted();

        self::assertNotEmpty($captured);
        self::assertSame(7, $captured[0]->getMetadata()['yearId'],
            'VE2-01 : metadata.yearId doit être year.getId()'
        );
    }

    // ── VE2-02 ────────────────────────────────────────────────────────────────

    public function testManagerMetadataContainsYearTitle(): void
    {
        $captured = $this->runAccepted();

        self::assertSame('Cardiologie 2025-2026', $captured[0]->getMetadata()['yearTitle'],
            'VE2-02 : metadata.yearTitle doit être year.getTitle()'
        );
    }

    // ── VE2-03 ────────────────────────────────────────────────────────────────

    public function testManagerMetadataTabIsGeneral(): void
    {
        $captured = $this->runAccepted();

        self::assertSame('general', $captured[0]->getMetadata()['tab'],
            'VE2-03 : metadata.tab = "general"'
        );
    }

    // ── VE2-04 ────────────────────────────────────────────────────────────────

    public function testManagerMetadataVersionIsOne(): void
    {
        $captured = $this->runAccepted();

        self::assertSame(1, $captured[0]->getMetadata()['version'],
            'VE2-04 : metadata.version = 1'
        );
    }

    // ── VE2-05 ────────────────────────────────────────────────────────────────

    public function testManagerMetadataEventTypeIsMonthValidationForAccepted(): void
    {
        $captured = $this->runAccepted();

        self::assertSame('MONTH_VALIDATION', $captured[0]->getMetadata()['eventType'],
            'VE2-05 : notifyAccepted → eventType=MONTH_VALIDATION'
        );
    }

    // ── VE2-06 ────────────────────────────────────────────────────────────────

    public function testManagerMetadataEventTypeIsValidationRejectedForUnvalidated(): void
    {
        $captured = $this->runUnvalidated();

        self::assertNotEmpty($captured);
        self::assertSame('VALIDATION_REJECTED', $captured[0]->getMetadata()['eventType'],
            'VE2-06 : notifyUnvalidated → eventType=VALIDATION_REJECTED'
        );
    }

    // ── VE2-07 ────────────────────────────────────────────────────────────────

    public function testManagerMetadataContainsMonth(): void
    {
        $captured = $this->runAccepted(month: 6);

        self::assertSame(6, $captured[0]->getMetadata()['month'],
            'VE2-07 : metadata.month = period.getMonth()'
        );
    }

    // ── VE2-08 ────────────────────────────────────────────────────────────────

    public function testManagerMetadataContainsYearNb(): void
    {
        $captured = $this->runAccepted(yearNb: 2026);

        self::assertSame(2026, $captured[0]->getMetadata()['yearNb'],
            'VE2-08 : metadata.yearNb = period.getYearNb()'
        );
    }

    // ── VE2-09 ────────────────────────────────────────────────────────────────

    /**
     * La validation mois concerne TOUS les résidents de l'année — pas un résident
     * spécifique. Aucun residentId ne doit figurer dans la metadata manager.
     */
    public function testManagerMetadataDoesNotContainResidentId(): void
    {
        $captured = $this->runAccepted();

        $metadata = $captured[0]->getMetadata();
        self::assertArrayNotHasKey('residentId', $metadata,
            'VE2-09 : validation mois = pas de residentId dans metadata (validation mois entier, pas per-résident)'
        );
    }
}
