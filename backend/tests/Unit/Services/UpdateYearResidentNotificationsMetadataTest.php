<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Entity\Manager;
use App\Entity\NotificationManager;
use App\Entity\PeriodValidation;
use App\Entity\Resident;
use App\Entity\Years;
use App\Repository\ManagerRepository;
use App\Repository\ManagerYearsRepository;
use App\Services\NotificationDecisionService;
use App\Services\Notifications\UpdateYearResidentNotifications;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

/**
 * P2-E1 — UpdateYearResidentNotifications : metadata sur NotificationManager
 *
 * Objectif : permettre le bouton "Voir" → /manager/year-detail onglet "general"
 * pour les notifications validated/invalidated côté manager.
 *
 * Aucun changement de logique métier ou NDS.
 * Uniquement ajout de setMetadata() dans la boucle manager.
 *
 * VE1-01 : metadata.yearId = year.getId()
 * VE1-02 : metadata.yearTitle = year.getTitle()
 * VE1-03 : metadata.tab = 'general'
 * VE1-04 : metadata.version = 1
 * VE1-05 : metadata.eventType = 'MONTH_VALIDATION' pour validate
 * VE1-06 : metadata.eventType = 'VALIDATION_REJECTED' pour invalidate
 * VE1-07 : metadata.residentId = resident.getId()
 * VE1-08 : metadata.residentName = "{firstname} {lastname}"
 * VE1-09 : metadata.month = period.getMonth()
 * VE1-10 : metadata.yearNb = period.getYearNb()
 */
class UpdateYearResidentNotificationsMetadataTest extends TestCase
{
    private const ACTOR_ID    = 1;
    private const MANAGER_B   = 2;
    private const RESIDENT_ID = 10;

    // ── Factories ─────────────────────────────────────────────────────────────

    private function mockManager(int $id, string $first = 'Test', string $last = 'Manager'): Manager
    {
        $m = $this->createMock(Manager::class);
        $m->method('getId')->willReturn($id);
        $m->method('getFirstname')->willReturn($first);
        $m->method('getLastname')->willReturn($last);
        return $m;
    }

    private function mockResident(int $id = self::RESIDENT_ID, string $first = 'Alice', string $last = 'Dupont'): Resident
    {
        $r = $this->createMock(Resident::class);
        $r->method('getId')->willReturn($id);
        $r->method('getFirstname')->willReturn($first);
        $r->method('getLastname')->willReturn($last);
        return $r;
    }

    private function mockPeriod(
        ?Years $year = null,
        int    $month = 4,
        int    $yearNb = 2026,
    ): PeriodValidation {
        $y = $year ?? $this->mockYear();
        $p = $this->createMock(PeriodValidation::class);
        $p->method('getYear')->willReturn($y);
        $p->method('getMonth')->willReturn($month);
        $p->method('getYearNb')->willReturn($yearNb);
        return $p;
    }

    private function mockYear(int $id = 7, string $title = 'Cardiologie 2025-2026'): Years
    {
        $y = $this->createMock(Years::class);
        $y->method('getId')->willReturn($id);
        $y->method('getTitle')->willReturn($title);
        return $y;
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
    ): UpdateYearResidentNotifications {
        $rows = array_map(fn(int $id) => ['managerId' => $id], [...$coManagerIds, self::ACTOR_ID]);

        $managerYearsRepo = $this->createMock(ManagerYearsRepository::class);
        $managerYearsRepo->method('fetchYearManagers')->willReturn($rows);

        $coManagers  = array_map(fn(int $id) => $this->mockManager($id), $coManagerIds);
        $managerRepo = $this->createMock(ManagerRepository::class);
        $managerRepo->method('findBy')->willReturn($coManagers);

        return new UpdateYearResidentNotifications(
            $managerYearsRepo,
            $em,
            $managerRepo,
            $decisionService,
        );
    }

    /** Exécute le service et retourne la liste des NotificationManager capturées. */
    private function runValidate(
        string $status = 'validate',
        int    $month = 4,
        int    $yearNb = 2026,
    ): array {
        $captured        = [];
        $em              = $this->capturingEm($captured);
        $decisionService = $this->createMock(NotificationDecisionService::class);
        $decisionService->method('shouldSend')->willReturn(true);

        $year   = $this->mockYear(7, 'Cardiologie 2025-2026');
        $period = $this->mockPeriod($year, $month, $yearNb);

        $service = $this->buildService($em, $decisionService, [self::MANAGER_B]);
        $service->notifyValidationChange(
            ['status' => $status, 'managerComment' => '', 'residentNotification' => ''],
            $period,
            $this->mockManager(self::ACTOR_ID, 'Chef', 'Service'),
            $this->mockResident(self::RESIDENT_ID, 'Alice', 'Dupont'),
        );

        return $captured;
    }

    // ── VE1-01 ────────────────────────────────────────────────────────────────

    /** RED : setMetadata() non appelé → metadata = null. */
    public function testManagerMetadataContainsYearId(): void
    {
        $captured = $this->runValidate();

        self::assertNotEmpty($captured);
        self::assertSame(7, $captured[0]->getMetadata()['yearId'],
            'VE1-01 : metadata.yearId doit être year.getId()'
        );
    }

    // ── VE1-02 ────────────────────────────────────────────────────────────────

    public function testManagerMetadataContainsYearTitle(): void
    {
        $captured = $this->runValidate();

        self::assertSame('Cardiologie 2025-2026', $captured[0]->getMetadata()['yearTitle'],
            'VE1-02 : metadata.yearTitle doit être year.getTitle()'
        );
    }

    // ── VE1-03 ────────────────────────────────────────────────────────────────

    public function testManagerMetadataTabIsGeneral(): void
    {
        $captured = $this->runValidate();

        self::assertSame('general', $captured[0]->getMetadata()['tab'],
            'VE1-03 : metadata.tab = "general" → YearDetailPage onglet validation'
        );
    }

    // ── VE1-04 ────────────────────────────────────────────────────────────────

    public function testManagerMetadataVersionIsOne(): void
    {
        $captured = $this->runValidate();

        self::assertSame(1, $captured[0]->getMetadata()['version'],
            'VE1-04 : metadata.version = 1'
        );
    }

    // ── VE1-05 ────────────────────────────────────────────────────────────────

    public function testManagerMetadataEventTypeIsMonthValidationForValidate(): void
    {
        $captured = $this->runValidate('validate');

        self::assertSame('MONTH_VALIDATION', $captured[0]->getMetadata()['eventType'],
            'VE1-05 : status=validate → eventType=MONTH_VALIDATION'
        );
    }

    // ── VE1-06 ────────────────────────────────────────────────────────────────

    public function testManagerMetadataEventTypeIsValidationRejectedForInvalidate(): void
    {
        $captured = $this->runValidate('invalidate');

        self::assertSame('VALIDATION_REJECTED', $captured[0]->getMetadata()['eventType'],
            'VE1-06 : status=invalidate → eventType=VALIDATION_REJECTED'
        );
    }

    // ── VE1-07 ────────────────────────────────────────────────────────────────

    public function testManagerMetadataContainsResidentId(): void
    {
        $captured = $this->runValidate();

        self::assertSame(self::RESIDENT_ID, $captured[0]->getMetadata()['residentId'],
            'VE1-07 : metadata.residentId = resident.getId()'
        );
    }

    // ── VE1-08 ────────────────────────────────────────────────────────────────

    public function testManagerMetadataContainsResidentName(): void
    {
        $captured = $this->runValidate();

        self::assertSame('Alice Dupont', $captured[0]->getMetadata()['residentName'],
            'VE1-08 : metadata.residentName = "{firstname} {lastname}"'
        );
    }

    // ── VE1-09 ────────────────────────────────────────────────────────────────

    public function testManagerMetadataContainsMonth(): void
    {
        $captured = $this->runValidate(month: 5);

        self::assertSame(5, $captured[0]->getMetadata()['month'],
            'VE1-09 : metadata.month = period.getMonth()'
        );
    }

    // ── VE1-10 ────────────────────────────────────────────────────────────────

    public function testManagerMetadataContainsYearNb(): void
    {
        $captured = $this->runValidate(yearNb: 2026);

        self::assertSame(2026, $captured[0]->getMetadata()['yearNb'],
            'VE1-10 : metadata.yearNb = period.getYearNb()'
        );
    }
}
