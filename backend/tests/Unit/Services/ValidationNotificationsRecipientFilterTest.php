<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Entity\Manager;
use App\Entity\PeriodValidation;
use App\Entity\Resident;
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
 * P1 — ValidationNotifications : migration vers NotificationDecisionService
 *
 * Anomalie actuelle : le service envoie les notifications à TOUS les destinataires
 * sans consulter NotificationDecisionService. Aucun filtrage par préférence.
 *
 * Ces tests ÉCHOUENT sur le code actuel (pas de shouldSend) et PASSENT
 * après injection de NotificationDecisionService + vérification par destinataire.
 *
 * VN-P1-01 : acteur email=false, Manager B email=true  → B reçoit
 * VN-P1-02 : acteur email=true,  Manager B email=false → B ne reçoit pas
 * VN-P1-03 : 3 managers, A acteur, B email=true, C email=false → B reçoit, C non
 * VN-P1-04 : résident MONTH_VALIDATION email=true  → résident reçoit
 * VN-P1-05 : résident MONTH_VALIDATION email=false → résident ne reçoit pas
 * VN-P1-06 : annulation → shouldSend appelé avec VALIDATION_REJECTED
 * VN-P1-07 : shouldSend appelé par destinataire, jamais pour l'acteur
 */
class ValidationNotificationsRecipientFilterTest extends TestCase
{
    private const ACTOR_ID    = 1;
    private const MANAGER_B   = 2;
    private const MANAGER_C   = 3;
    private const RESIDENT_A  = 10;
    private const RESIDENT_B  = 11;

    // ── Factories ─────────────────────────────────────────────────────────────

    private function mockManager(int $id): Manager
    {
        $m = $this->createMock(Manager::class);
        $m->method('getId')->willReturn($id);
        $m->method('getFirstname')->willReturn('Test');
        $m->method('getLastname')->willReturn('Manager'.(string) $id);
        return $m;
    }

    private function mockResident(int $id): Resident
    {
        $r = $this->createMock(Resident::class);
        $r->method('getId')->willReturn($id);
        $r->method('getFirstname')->willReturn('Résident');
        $r->method('getLastname')->willReturn('Test'.(string) $id);
        return $r;
    }

    private function mockPeriod(): PeriodValidation
    {
        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn(42);
        $year->method('getTitle')->willReturn('Cardio 2025');

        $period = $this->createMock(PeriodValidation::class);
        $period->method('getYear')->willReturn($year);
        $period->method('getMonth')->willReturn(4);
        $period->method('getYearNb')->willReturn(2026);
        return $period;
    }

    /**
     * Construit le service avec des co-managers et des résidents configurables.
     *
     * L'acteur (ACTOR_ID) est dans fetchYearManagers mais doit être filtré
     * par le service lui-même (comportement existant conservé).
     *
     * @param int[]   $coManagerIds  IDs des managers AUTRES que l'acteur
     * @param int[]   $residentIds   IDs des résidents autorisés de l'année
     */
    private function buildService(
        EntityManagerInterface      $em,
        NotificationDecisionService $decisionService,
        array                       $coManagerIds,
        array                       $residentIds = [],
    ): ValidationNotifications {
        // fetchYearManagers retourne tous les managers incluant l'acteur
        $rows = array_map(
            fn(int $id) => ['managerId' => $id],
            [...$coManagerIds, self::ACTOR_ID],
        );
        $managerYearsRepo = $this->createMock(ManagerYearsRepository::class);
        $managerYearsRepo->method('fetchYearManagers')->willReturn($rows);

        $coManagers  = array_map(fn(int $id) => $this->mockManager($id), $coManagerIds);
        $managerRepo = $this->createMock(ManagerRepository::class);
        $managerRepo->method('findBy')->willReturn($coManagers);

        // findYearAllowedResidents retourne un tableau de rows avec 'residentId'
        $residentRows     = array_map(fn(int $id) => ['residentId' => $id], $residentIds);
        $yearsResidentRepo = $this->createMock(YearsResidentRepository::class);
        $yearsResidentRepo->method('findYearAllowedResidents')->willReturn($residentRows);

        $residents    = array_map(fn(int $id) => $this->mockResident($id), $residentIds);
        $residentRepo = $this->createMock(ResidentRepository::class);
        $residentRepo->method('findBy')->willReturn($residents);

        return new ValidationNotifications(
            $em,
            $yearsResidentRepo,
            $managerYearsRepo,
            $managerRepo,
            $residentRepo,
            $decisionService,   // ← paramètre ajouté par la migration P1
        );
    }

    // ── VN-P1-01 ──────────────────────────────────────────────────────────────

    /**
     * Acteur (ID=1) a MONTH_VALIDATION email=false.
     * Manager B (ID=2) a MONTH_VALIDATION email=true → B DOIT recevoir.
     *
     * Comportement actuel BUGGY : persist toujours appelé sans shouldSend.
     * → expects(atLeastOnce, shouldSend) ÉCHOUE car shouldSend n'existe pas.
     */
    public function testCoManagerReceivesNotificationEvenIfActorPreferencesAreOff(): void
    {
        $em              = $this->createMock(EntityManagerInterface::class);
        $decisionService = $this->createMock(NotificationDecisionService::class);

        // shouldSend doit être consulté au moins une fois (pour le manager B)
        $decisionService->expects(self::atLeastOnce())->method('shouldSend')
            ->willReturnCallback(fn(string $type, int $id): bool => $id !== self::ACTOR_ID);

        // Manager B + 0 résidents = 1 persist attendu
        $em->expects(self::exactly(1))->method('persist');
        $em->expects(self::once())->method('flush');

        $service = $this->buildService($em, $decisionService, [self::MANAGER_B]);

        $service->notifyAcceptedPeriodValidation(
            $this->mockPeriod(),
            $this->mockManager(self::ACTOR_ID),
        );
    }

    // ── VN-P1-02 ──────────────────────────────────────────────────────────────

    /**
     * Acteur email=true. Manager B email=false → B NE DOIT PAS recevoir.
     *
     * Comportement actuel BUGGY : persist appelé pour B (pas de shouldSend).
     * → expects(never, persist) ÉCHOUE.
     */
    public function testCoManagerDoesNotReceiveWhenTheirPreferenceIsOff(): void
    {
        $em              = $this->createMock(EntityManagerInterface::class);
        $decisionService = $this->createMock(NotificationDecisionService::class);

        $decisionService->method('shouldSend')
            ->willReturnCallback(
                fn(string $type, int $id): bool => !($type === 'manager' && $id === self::MANAGER_B)
            );

        // B filtré + 0 résidents = 0 persist attendu
        $em->expects(self::never())->method('persist');

        $service = $this->buildService($em, $decisionService, [self::MANAGER_B]);

        $service->notifyAcceptedPeriodValidation(
            $this->mockPeriod(),
            $this->mockManager(self::ACTOR_ID),
        );
    }

    // ── VN-P1-03 ──────────────────────────────────────────────────────────────

    /**
     * 3 managers : A acteur, B email=true, C email=false.
     * B reçoit, C non. Aucun résident.
     *
     * Comportement actuel BUGGY : persist 2× (B et C).
     * → expects(exactly(1)) ÉCHOUE.
     */
    public function testEachManagerReceivesDecisionIndependently(): void
    {
        $em              = $this->createMock(EntityManagerInterface::class);
        $decisionService = $this->createMock(NotificationDecisionService::class);

        $decisionService->method('shouldSend')
            ->willReturnCallback(
                fn(string $type, int $id): bool => !($type === 'manager' && $id === self::MANAGER_C)
            );

        // B reçoit, C non = 1 persist
        $em->expects(self::exactly(1))->method('persist');

        $service = $this->buildService($em, $decisionService, [self::MANAGER_B, self::MANAGER_C]);

        $service->notifyAcceptedPeriodValidation(
            $this->mockPeriod(),
            $this->mockManager(self::ACTOR_ID),
        );
    }

    // ── VN-P1-04 ──────────────────────────────────────────────────────────────

    /**
     * Résident A a MONTH_VALIDATION email=true → DOIT recevoir.
     * Aucun manager co-destinataire.
     *
     * Comportement actuel BUGGY : persist toujours (pas de shouldSend).
     * → expects(atLeastOnce, shouldSend) ÉCHOUE car shouldSend non appelé.
     */
    public function testResidentReceivesNotificationWhenPreferenceIsOn(): void
    {
        $em              = $this->createMock(EntityManagerInterface::class);
        $decisionService = $this->createMock(NotificationDecisionService::class);

        $decisionService->expects(self::atLeastOnce())->method('shouldSend')
            ->willReturn(true);

        // 0 managers (acteur seul, exclu) + 1 résident = 1 persist
        $em->expects(self::exactly(1))->method('persist');

        $service = $this->buildService($em, $decisionService, [], [self::RESIDENT_A]);

        $service->notifyAcceptedPeriodValidation(
            $this->mockPeriod(),
            $this->mockManager(self::ACTOR_ID),
        );
    }

    // ── VN-P1-05 ──────────────────────────────────────────────────────────────

    /**
     * Résident A a MONTH_VALIDATION email=false → NE DOIT PAS recevoir.
     *
     * Comportement actuel BUGGY : persist appelé pour le résident.
     * → expects(never, persist) ÉCHOUE.
     */
    public function testResidentDoesNotReceiveWhenPreferenceIsOff(): void
    {
        $em              = $this->createMock(EntityManagerInterface::class);
        $decisionService = $this->createMock(NotificationDecisionService::class);

        $decisionService->method('shouldSend')
            ->willReturnCallback(
                fn(string $type, int $id): bool => !($type === 'resident' && $id === self::RESIDENT_A)
            );

        $em->expects(self::never())->method('persist');

        $service = $this->buildService($em, $decisionService, [], [self::RESIDENT_A]);

        $service->notifyAcceptedPeriodValidation(
            $this->mockPeriod(),
            $this->mockManager(self::ACTOR_ID),
        );
    }

    // ── VN-P1-06 ──────────────────────────────────────────────────────────────

    /**
     * Annulation de validation → shouldSend appelé avec VALIDATION_REJECTED.
     *
     * Comportement actuel BUGGY : shouldSend non appelé du tout.
     */
    public function testUnvalidationUsesValidationRejectedEventType(): void
    {
        $em              = $this->createMock(EntityManagerInterface::class);
        $decisionService = $this->createMock(NotificationDecisionService::class);
        $em->method('flush');

        $capturedEventTypes = [];
        $decisionService->method('shouldSend')
            ->willReturnCallback(
                function(string $type, int $id, Years $year, string $eventType) use (&$capturedEventTypes): bool {
                    $capturedEventTypes[] = $eventType;
                    return true;
                }
            );

        $service = $this->buildService($em, $decisionService, [self::MANAGER_B], [self::RESIDENT_A]);

        $service->notifyUnvalidatedPeriodValidation(
            $this->mockPeriod(),
            $this->mockManager(self::ACTOR_ID),
        );

        self::assertNotEmpty($capturedEventTypes,
            'VN-P1-06 : shouldSend doit être appelé lors d\'une annulation'
        );
        foreach ($capturedEventTypes as $eventType) {
            self::assertSame('VALIDATION_REJECTED', $eventType,
                'VN-P1-06 : l\'annulation de validation doit utiliser VALIDATION_REJECTED'
            );
        }
    }

    // ── VN-P1-07 ──────────────────────────────────────────────────────────────

    /**
     * shouldSend doit être appelé pour chaque destinataire (B, C, résidents)
     * et JAMAIS pour l'acteur (ID=1).
     *
     * Setup : acteur(1), co-managers B(2) et C(3), résidents A(10) et B(11).
     * shouldSend doit être appelé exactement 4 fois (2 managers + 2 résidents).
     *
     * Comportement actuel BUGGY : shouldSend jamais appelé.
     */
    public function testShouldSendIsCalledPerRecipientNeverForActor(): void
    {
        $em              = $this->createMock(EntityManagerInterface::class);
        $decisionService = $this->createMock(NotificationDecisionService::class);
        $em->method('flush');
        $em->method('persist');

        $calledWith = [];
        $decisionService->expects(self::exactly(4))
            ->method('shouldSend')
            ->willReturnCallback(
                function(string $type, int $id, Years $year, string $eventType, string $channel)
                use (&$calledWith): bool {
                    $calledWith[] = [$type, $id];
                    return true;
                }
            );

        $service = $this->buildService(
            $em,
            $decisionService,
            [self::MANAGER_B, self::MANAGER_C],
            [self::RESIDENT_A, self::RESIDENT_B],
        );

        $service->notifyAcceptedPeriodValidation(
            $this->mockPeriod(),
            $this->mockManager(self::ACTOR_ID),
        );

        // Vérifier que l'acteur n'est jamais un destinataire évalué
        foreach ($calledWith as [$type, $id]) {
            self::assertFalse(
                $type === 'manager' && $id === self::ACTOR_ID,
                'VN-P1-07 : shouldSend ne doit jamais être appelé pour l\'acteur'
            );
        }

        // Vérifier que B et C sont évalués
        $managerIds = array_column(
            array_filter($calledWith, fn($c) => $c[0] === 'manager'),
            1
        );
        self::assertContains(self::MANAGER_B, $managerIds);
        self::assertContains(self::MANAGER_C, $managerIds);

        // Vérifier que les résidents sont évalués
        $residentIds = array_column(
            array_filter($calledWith, fn($c) => $c[0] === 'resident'),
            1
        );
        self::assertContains(self::RESIDENT_A, $residentIds);
        self::assertContains(self::RESIDENT_B, $residentIds);
    }
}
