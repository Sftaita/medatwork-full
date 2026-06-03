<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Entity\Manager;
use App\Entity\PeriodValidation;
use App\Entity\Resident;
use App\Entity\Years;
use App\Repository\ManagerRepository;
use App\Repository\ManagerYearsRepository;
use App\Services\NotificationDecisionService;
use App\Services\Notifications\UpdateYearResidentNotifications;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

/**
 * P1A — Vérification du filtrage par destinataire dans UpdateYearResidentNotifications.
 *
 * Anomalie identifiée : le gate shouldSend est appelé avec l'acteur (managerThatValidated)
 * plutôt qu'avec chaque destinataire. Si l'acteur a email=false → personne n'est notifié.
 *
 * Ces tests ÉCHOUENT avec le code P0 et PASSENT après la correction P1A.
 *
 * P1A-01 : Acteur email=false, Manager B email=true  → B doit recevoir
 * P1A-02 : Acteur email=true,  Manager B email=false → B ne doit pas recevoir
 * P1A-03 : 3 managers, A acteur, B email=true, C email=false → B reçoit, C non
 * P1A-04 : 2 destinataires identiques (email=true), acteur email=false → les 2 reçoivent
 */
class UpdateYearResidentNotificationsRecipientFilterTest extends TestCase
{
    private const ACTOR_ID    = 1;
    private const MANAGER_B   = 2;
    private const MANAGER_C   = 3;
    private const RESIDENT_ID = 10;

    // ── Factories ─────────────────────────────────────────────────────────────

    private function mockManager(int $id): Manager
    {
        $m = $this->createMock(Manager::class);
        $m->method('getId')->willReturn($id);
        $m->method('getFirstname')->willReturn('Test');
        $m->method('getLastname')->willReturn('Manager'.(string) $id);
        return $m;
    }

    private function mockResident(): Resident
    {
        $r = $this->createMock(Resident::class);
        $r->method('getId')->willReturn(self::RESIDENT_ID);
        $r->method('getFirstname')->willReturn('Résident');
        $r->method('getLastname')->willReturn('Test');
        return $r;
    }

    private function mockPeriod(): PeriodValidation
    {
        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn(42);
        $year->method('getTitle')->willReturn('Cardio 2025');
        $year->method('getResidents')->willReturn(new ArrayCollection());

        $period = $this->createMock(PeriodValidation::class);
        $period->method('getYear')->willReturn($year);
        $period->method('getMonth')->willReturn(3);
        $period->method('getYearNb')->willReturn(2026);
        return $period;
    }

    /** @return array{residentId:int,status:string,managerComment:string,residentNotification:string} */
    private function makeData(string $status = 'validate'): array
    {
        return [
            'residentId'           => self::RESIDENT_ID,
            'status'               => $status,
            'managerComment'       => '',
            'residentNotification' => '',
        ];
    }

    /**
     * Construit le service avec les co-managers fournis (l'acteur est dans fetchYearManagers
     * mais doit être filtré par le service lui-même comme dans la prod).
     *
     * @param int[] $coManagerIds IDs des managers AUTRES que l'acteur
     */
    private function buildService(
        EntityManagerInterface      $em,
        NotificationDecisionService $decisionService,
        array                       $coManagerIds,
    ): UpdateYearResidentNotifications {
        // fetchYearManagers retourne tous les managers de l'année, acteur inclus
        $rows = array_map(
            fn(int $id) => ['managerId' => $id],
            [...$coManagerIds, self::ACTOR_ID],
        );

        $managerYearsRepo = $this->createMock(ManagerYearsRepository::class);
        $managerYearsRepo->method('fetchYearManagers')->willReturn($rows);

        $coManagers = array_map(fn(int $id) => $this->mockManager($id), $coManagerIds);

        $managerRepo = $this->createMock(ManagerRepository::class);
        $managerRepo->method('findBy')->willReturn($coManagers);

        return new UpdateYearResidentNotifications(
            $managerYearsRepo,
            $em,
            $managerRepo,
            $decisionService,
        );
    }

    // ── P1A-01 ────────────────────────────────────────────────────────────────

    /**
     * Acteur (ID=1) a email=false.
     * Manager B (ID=2) a email=true → B DOIT recevoir la notification.
     *
     * Comportement P0 BUGGY :
     *   shouldSend('manager', 1, ...) → false → return → 0 persist → TEST ÉCHOUE ✓
     *
     * Comportement P1A correct :
     *   shouldSend('manager', 2, ...) → true → persist(B) + persist(résident) = 2
     */
    public function testCoManagerReceivesNotificationEvenIfActorHasEmailDisabled(): void
    {
        $em              = $this->createMock(EntityManagerInterface::class);
        $decisionService = $this->createMock(NotificationDecisionService::class);

        // Acteur (ID=1) → false ; tous les autres → true
        $decisionService->method('shouldSend')
            ->willReturnCallback(
                fn(string $type, int $id): bool => $id !== self::ACTOR_ID
            );

        // Manager B + résident = exactement 2 persist attendus
        $em->expects(self::exactly(2))->method('persist');
        $em->expects(self::once())->method('flush');

        $service = $this->buildService($em, $decisionService, [self::MANAGER_B]);

        $service->notifyValidationChange(
            $this->makeData(),
            $this->mockPeriod(),
            $this->mockManager(self::ACTOR_ID),
            $this->mockResident(),
        );
    }

    // ── P1A-02 ────────────────────────────────────────────────────────────────

    /**
     * Acteur (ID=1) a email=true.
     * Manager B (ID=2) a email=false → B NE DOIT PAS recevoir la notification.
     *
     * Comportement P0 BUGGY :
     *   shouldSend('manager', 1, ...) → true → persist(B) + persist(résident) = 2 → TEST ÉCHOUE ✓
     *   (B est notifié alors qu'il ne le souhaite pas)
     *
     * Comportement P1A correct :
     *   shouldSend('manager', 2, ...) → false → skip(B)
     *   shouldSend('resident', 10, ...) → true → persist(résident)
     *   Total = exactement 1 persist
     */
    public function testCoManagerDoesNotReceiveNotificationWhenTheirEmailIsDisabled(): void
    {
        $em              = $this->createMock(EntityManagerInterface::class);
        $decisionService = $this->createMock(NotificationDecisionService::class);

        // Manager B (ID=2) → false ; tous les autres → true
        $decisionService->method('shouldSend')
            ->willReturnCallback(
                fn(string $type, int $id): bool => !($type === 'manager' && $id === self::MANAGER_B)
            );

        // Seulement le résident = exactement 1 persist
        $em->expects(self::exactly(1))->method('persist');

        $service = $this->buildService($em, $decisionService, [self::MANAGER_B]);

        $service->notifyValidationChange(
            $this->makeData(),
            $this->mockPeriod(),
            $this->mockManager(self::ACTOR_ID),
            $this->mockResident(),
        );
    }

    // ── P1A-03 ────────────────────────────────────────────────────────────────

    /**
     * 3 managers : A est l'acteur (email=true), B a email=true, C a email=false.
     * La décision doit être prise individuellement : B reçoit, C non.
     *
     * Comportement P0 BUGGY :
     *   shouldSend('manager', 1, ...) → true → persist(B)+persist(C)+persist(résident) = 3 → TEST ÉCHOUE ✓
     *   (C est notifié alors qu'il ne le souhaite pas)
     *
     * Comportement P1A correct :
     *   shouldSend('manager', 2, ...) → true  → persist(B)
     *   shouldSend('manager', 3, ...) → false → skip(C)
     *   shouldSend('resident', 10, ..) → true → persist(résident)
     *   Total = exactement 2 persist
     */
    public function testEachCoManagerReceivesDecisionIndependently(): void
    {
        $em              = $this->createMock(EntityManagerInterface::class);
        $decisionService = $this->createMock(NotificationDecisionService::class);

        // Manager C (ID=3) → false ; tous les autres → true
        $decisionService->method('shouldSend')
            ->willReturnCallback(
                fn(string $type, int $id): bool => !($type === 'manager' && $id === self::MANAGER_C)
            );

        // B + résident = exactement 2 persist
        $em->expects(self::exactly(2))->method('persist');

        $service = $this->buildService($em, $decisionService, [self::MANAGER_B, self::MANAGER_C]);

        $service->notifyValidationChange(
            $this->makeData(),
            $this->mockPeriod(),
            $this->mockManager(self::ACTOR_ID),
            $this->mockResident(),
        );
    }

    // ── P1A-04 ────────────────────────────────────────────────────────────────

    /**
     * Acteur (ID=1) a email=false.
     * Manager B et C ont TOUS LES DEUX email=true (prefs identiques).
     *
     * Aucune logique ne doit dépendre de l'acteur : B et C doivent tous deux recevoir.
     *
     * Comportement P0 BUGGY :
     *   shouldSend('manager', 1, ...) → false → return → 0 persist → TEST ÉCHOUE ✓
     *
     * Comportement P1A correct :
     *   shouldSend('manager', 2, ...) → true → persist(B)
     *   shouldSend('manager', 3, ...) → true → persist(C)
     *   shouldSend('resident', 10, ..) → true → persist(résident)
     *   Total = exactement 3 persist
     */
    public function testCoManagersWithIdenticalPrefsReceiveSameDecisionRegardlessOfActor(): void
    {
        $em              = $this->createMock(EntityManagerInterface::class);
        $decisionService = $this->createMock(NotificationDecisionService::class);

        // Acteur (ID=1) → false ; B, C et résident → true
        $decisionService->method('shouldSend')
            ->willReturnCallback(
                fn(string $type, int $id): bool => $id !== self::ACTOR_ID
            );

        // B + C + résident = exactement 3 persist
        $em->expects(self::exactly(3))->method('persist');
        $em->expects(self::once())->method('flush');

        $service = $this->buildService($em, $decisionService, [self::MANAGER_B, self::MANAGER_C]);

        $service->notifyValidationChange(
            $this->makeData(),
            $this->mockPeriod(),
            $this->mockManager(self::ACTOR_ID),
            $this->mockResident(),
        );
    }
}
