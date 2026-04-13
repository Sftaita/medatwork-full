<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\Notifications;

use App\Entity\Manager;
use App\Entity\NotificationManager;
use App\Entity\NotificationResident;
use App\Entity\PeriodValidation;
use App\Entity\Resident;
use App\Entity\Years;
use App\Repository\ManagerRepository;
use App\Repository\ManagerYearsRepository;
use App\Repository\ResidentRepository;
use App\Repository\YearsResidentRepository;
use App\Services\Notifications\ValidationNotifications;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

class ValidationNotificationsTest extends TestCase
{
    private EntityManagerInterface $em;
    private YearsResidentRepository $yearsResidentRepo;
    private ManagerYearsRepository $managerYearsRepo;
    private ManagerRepository $managerRepo;
    private ResidentRepository $residentRepo;
    private ValidationNotifications $service;

    protected function setUp(): void
    {
        $this->em                = $this->createMock(EntityManagerInterface::class);
        $this->yearsResidentRepo = $this->createMock(YearsResidentRepository::class);
        $this->managerYearsRepo  = $this->createMock(ManagerYearsRepository::class);
        $this->managerRepo       = $this->createMock(ManagerRepository::class);
        $this->residentRepo      = $this->createMock(ResidentRepository::class);

        $this->service = new ValidationNotifications(
            $this->em,
            $this->yearsResidentRepo,
            $this->managerYearsRepo,
            $this->managerRepo,
            $this->residentRepo,
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function makePeriod(?Years $year = null, int $month = 3, int $yearNb = 2026): PeriodValidation
    {
        $period = $this->createMock(PeriodValidation::class);
        $period->method('getYear')->willReturn($year);
        $period->method('getMonth')->willReturn($month);
        $period->method('getYearNb')->willReturn($yearNb);
        return $period;
    }

    private function makeYear(string $title = 'DES Anesthésie 2025-2026'): Years
    {
        $year = $this->createMock(Years::class);
        $year->method('getTitle')->willReturn($title);
        return $year;
    }

    private function makeManager(int $id, string $first = 'Alice', string $last = 'Martin'): Manager
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getId')->willReturn($id);
        $manager->method('getFirstname')->willReturn($first);
        $manager->method('getLastname')->willReturn($last);
        return $manager;
    }

    private function makeResident(int $id, string $first = 'Bob', string $last = 'Dupont'): Resident
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getId')->willReturn($id);
        $resident->method('getFirstname')->willReturn($first);
        $resident->method('getLastname')->willReturn($last);
        return $resident;
    }

    // ── notifyAcceptedPeriodValidation ────────────────────────────────────────

    public function testDoesNothingWhenYearIsNull(): void
    {
        $period  = $this->makePeriod(null);
        $manager = $this->makeManager(1);

        $this->em->expects($this->never())->method('persist');
        $this->em->expects($this->never())->method('flush');

        $this->service->notifyAcceptedPeriodValidation($period, $manager);
    }

    public function testAcceptedPersistsNotificationsForOtherManagersAndResidents(): void
    {
        $year    = $this->makeYear();
        $period  = $this->makePeriod($year, 3, 2026);
        $actor   = $this->makeManager(1, 'Alice', 'Martin');
        $other   = $this->makeManager(2, 'Charles', 'Durand');
        $resident = $this->makeResident(10);

        $this->managerYearsRepo->method('fetchYearManagers')
            ->willReturn([['managerId' => 1], ['managerId' => 2]]);
        $this->managerRepo->method('findBy')
            ->with(['id' => [2]])
            ->willReturn([$other]);

        $this->yearsResidentRepo->method('findYearAllowedResidents')
            ->willReturn([['residentId' => 10]]);
        $this->residentRepo->method('findBy')
            ->with(['id' => [10]])
            ->willReturn([$resident]);

        $persisted = [];
        $this->em->method('persist')->willReturnCallback(function ($n) use (&$persisted): void {
            $persisted[] = $n;
        });
        $this->em->expects($this->once())->method('flush');

        $this->service->notifyAcceptedPeriodValidation($period, $actor);

        $this->assertCount(2, $persisted);
        $this->assertInstanceOf(NotificationManager::class, $persisted[0]);
        $this->assertInstanceOf(NotificationResident::class, $persisted[1]);
    }

    public function testAcceptedBodyContainsValidationVerbAndMonth(): void
    {
        $year    = $this->makeYear('Titre');
        $period  = $this->makePeriod($year, 6, 2025);
        $actor   = $this->makeManager(1, 'Alice', 'Martin');
        $other   = $this->makeManager(2, 'Charles', 'Durand');
        $resident = $this->makeResident(10);

        $this->managerYearsRepo->method('fetchYearManagers')
            ->willReturn([['managerId' => 1], ['managerId' => 2]]);
        $this->managerRepo->method('findBy')->willReturn([$other]);
        $this->yearsResidentRepo->method('findYearAllowedResidents')
            ->willReturn([['residentId' => 10]]);
        $this->residentRepo->method('findBy')->willReturn([$resident]);

        $persisted = [];
        $this->em->method('persist')->willReturnCallback(function ($n) use (&$persisted): void {
            $persisted[] = $n;
        });
        $this->em->method('flush');

        $this->service->notifyAcceptedPeriodValidation($period, $actor);

        /** @var NotificationManager $managerNotif */
        $managerNotif = $persisted[0];
        $body = $managerNotif->getBody();
        $this->assertStringContainsString('Validation', $body);
        $this->assertStringContainsString('Juin', $body);
        $this->assertStringContainsString('2025', $body);
        $this->assertStringContainsString('Alice Martin', $body);
        $this->assertStringContainsString('maître de stage', $body);
    }

    public function testUnvalidatedBodyContainsAnnulationVerb(): void
    {
        $year    = $this->makeYear('Titre');
        $period  = $this->makePeriod($year, 1, 2026);
        $actor   = $this->makeManager(1, 'Alice', 'Martin');

        $this->managerYearsRepo->method('fetchYearManagers')
            ->willReturn([['managerId' => 1]]);
        $this->managerRepo->method('findBy')->willReturn([]);
        $this->yearsResidentRepo->method('findYearAllowedResidents')
            ->willReturn([['residentId' => 10]]);
        $this->residentRepo->method('findBy')->willReturn([$this->makeResident(10)]);

        $persisted = [];
        $this->em->method('persist')->willReturnCallback(function ($n) use (&$persisted): void {
            $persisted[] = $n;
        });
        $this->em->method('flush');

        $this->service->notifyUnvalidatedPeriodValidation($period, $actor);

        $body = $persisted[0]->getBody();
        $this->assertStringContainsString('Annulation de la validation', $body);
        $this->assertStringContainsString('Janvier', $body);
    }

    public function testActorIsExcludedFromManagerNotifications(): void
    {
        $year   = $this->makeYear();
        $period = $this->makePeriod($year);
        $actor  = $this->makeManager(1);

        // Only the actor in the year — no other manager should receive a notification
        $this->managerYearsRepo->method('fetchYearManagers')
            ->willReturn([['managerId' => 1]]);

        $capturedIds = null;
        $this->managerRepo->method('findBy')
            ->willReturnCallback(function (array $criteria) use (&$capturedIds) {
                $capturedIds = $criteria['id'];
                return [];
            });

        $this->yearsResidentRepo->method('findYearAllowedResidents')->willReturn([]);
        $this->residentRepo->method('findBy')->willReturn([]);
        $this->em->method('persist');
        $this->em->method('flush');

        $this->service->notifyAcceptedPeriodValidation($period, $actor);

        $this->assertSame([], $capturedIds);
    }

    public function testSingleQueryForManagersAndResidents(): void
    {
        $year    = $this->makeYear();
        $period  = $this->makePeriod($year);
        $actor   = $this->makeManager(1);
        $others  = [$this->makeManager(2), $this->makeManager(3)];
        $residents = [$this->makeResident(10), $this->makeResident(11)];

        $this->managerYearsRepo->method('fetchYearManagers')
            ->willReturn([['managerId' => 1], ['managerId' => 2], ['managerId' => 3]]);

        // findBy must be called exactly once for managers and once for residents
        $this->managerRepo->expects($this->once())
            ->method('findBy')
            ->with(['id' => [2, 3]])
            ->willReturn($others);

        $this->yearsResidentRepo->method('findYearAllowedResidents')
            ->willReturn([['residentId' => 10], ['residentId' => 11]]);

        $this->residentRepo->expects($this->once())
            ->method('findBy')
            ->with(['id' => [10, 11]])
            ->willReturn($residents);

        $this->em->method('persist');
        $this->em->expects($this->once())->method('flush');

        $this->service->notifyAcceptedPeriodValidation($period, $actor);
    }

    public function testNotificationObjectMatchesYearTitle(): void
    {
        $year    = $this->makeYear('Chirurgie 2024-2025');
        $period  = $this->makePeriod($year, 4, 2024);
        $actor   = $this->makeManager(1);
        $other   = $this->makeManager(2);
        $resident = $this->makeResident(10);

        $this->managerYearsRepo->method('fetchYearManagers')
            ->willReturn([['managerId' => 1], ['managerId' => 2]]);
        $this->managerRepo->method('findBy')->willReturn([$other]);
        $this->yearsResidentRepo->method('findYearAllowedResidents')
            ->willReturn([['residentId' => 10]]);
        $this->residentRepo->method('findBy')->willReturn([$resident]);

        $persisted = [];
        $this->em->method('persist')->willReturnCallback(function ($n) use (&$persisted): void {
            $persisted[] = $n;
        });
        $this->em->method('flush');

        $this->service->notifyAcceptedPeriodValidation($period, $actor);

        foreach ($persisted as $notification) {
            $this->assertSame('Chirurgie 2024-2025', $notification->getObject());
        }
    }
}
