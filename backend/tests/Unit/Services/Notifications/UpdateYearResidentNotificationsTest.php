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
use App\Services\Notifications\UpdateYearResidentNotifications;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

class UpdateYearResidentNotificationsTest extends TestCase
{
    private EntityManagerInterface $em;
    private ManagerYearsRepository $managerYearsRepo;
    private ManagerRepository $managerRepo;
    private UpdateYearResidentNotifications $service;

    protected function setUp(): void
    {
        $this->em               = $this->createMock(EntityManagerInterface::class);
        $this->managerYearsRepo = $this->createMock(ManagerYearsRepository::class);
        $this->managerRepo      = $this->createMock(ManagerRepository::class);

        $this->service = new UpdateYearResidentNotifications(
            $this->managerYearsRepo,
            $this->em,
            $this->managerRepo,
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function makePeriod(?Years $year, int $month = 5, int $yearNb = 2026): PeriodValidation
    {
        $p = $this->createMock(PeriodValidation::class);
        $p->method('getYear')->willReturn($year);
        $p->method('getMonth')->willReturn($month);
        $p->method('getYearNb')->willReturn($yearNb);
        return $p;
    }

    private function makeYear(string $title = 'DES Anesthésie'): Years
    {
        $y = $this->createMock(Years::class);
        $y->method('getTitle')->willReturn($title);
        return $y;
    }

    private function makeManager(int $id, string $first = 'Alice', string $last = 'Martin'): Manager
    {
        $m = $this->createMock(Manager::class);
        $m->method('getId')->willReturn($id);
        $m->method('getFirstname')->willReturn($first);
        $m->method('getLastname')->willReturn($last);
        return $m;
    }

    private function makeResident(string $first = 'Bob', string $last = 'Dupont'): Resident
    {
        $r = $this->createMock(Resident::class);
        $r->method('getFirstname')->willReturn($first);
        $r->method('getLastname')->willReturn($last);
        return $r;
    }

    // ── notifyValidationChange ────────────────────────────────────────────────

    public function testDoesNothingWhenYearIsNull(): void
    {
        $period   = $this->makePeriod(null);
        $actor    = $this->makeManager(1);
        $resident = $this->makeResident();

        $this->em->expects($this->never())->method('persist');
        $this->em->expects($this->never())->method('flush');

        $this->service->notifyValidationChange(['status' => 'validate'], $period, $actor, $resident);
    }

    public function testValidatePersistsManagerAndResidentNotifications(): void
    {
        $year     = $this->makeYear();
        $period   = $this->makePeriod($year, 3, 2026);
        $actor    = $this->makeManager(1, 'Alice', 'Martin');
        $other    = $this->makeManager(2, 'Charles', 'Durand');
        $resident = $this->makeResident('Marie', 'Curie');

        $this->managerYearsRepo->method('fetchYearManagers')
            ->willReturn([['managerId' => 1], ['managerId' => 2]]);
        $this->managerRepo->method('findBy')
            ->with(['id' => [2]])
            ->willReturn([$other]);

        $persisted = [];
        $this->em->method('persist')->willReturnCallback(function ($n) use (&$persisted): void {
            $persisted[] = $n;
        });
        $this->em->expects($this->once())->method('flush');

        $this->service->notifyValidationChange(['status' => 'validate'], $period, $actor, $resident);

        $this->assertCount(2, $persisted);
        $this->assertInstanceOf(NotificationManager::class, $persisted[0]);
        $this->assertInstanceOf(NotificationResident::class, $persisted[1]);
    }

    public function testValidateManagerBodyContainsResidentNameAndVerb(): void
    {
        $year     = $this->makeYear('Titre');
        $period   = $this->makePeriod($year, 7, 2025);
        $actor    = $this->makeManager(1, 'Alice', 'Martin');
        $other    = $this->makeManager(2, 'Charles', 'Durand');
        $resident = $this->makeResident('Marie', 'Curie');

        $this->managerYearsRepo->method('fetchYearManagers')
            ->willReturn([['managerId' => 1], ['managerId' => 2]]);
        $this->managerRepo->method('findBy')->willReturn([$other]);

        $persisted = [];
        $this->em->method('persist')->willReturnCallback(function ($n) use (&$persisted): void {
            $persisted[] = $n;
        });
        $this->em->method('flush');

        $this->service->notifyValidationChange(['status' => 'validate'], $period, $actor, $resident);

        $body = $persisted[0]->getBody();
        $this->assertStringContainsString('Marie Curie', $body);
        $this->assertStringContainsString('Validation', $body);
        $this->assertStringContainsString('Juillet', $body);
        $this->assertStringContainsString('2025', $body);
        $this->assertStringContainsString('Alice Martin', $body);
        $this->assertStringContainsString('maître de stage', $body);
    }

    public function testInvalidateBodyContainsInvalidationVerb(): void
    {
        $year     = $this->makeYear();
        $period   = $this->makePeriod($year, 1, 2026);
        $actor    = $this->makeManager(1, 'Alice', 'Martin');
        $resident = $this->makeResident();

        $this->managerYearsRepo->method('fetchYearManagers')
            ->willReturn([['managerId' => 1]]);
        $this->managerRepo->method('findBy')->willReturn([]);

        $persisted = [];
        $this->em->method('persist')->willReturnCallback(function ($n) use (&$persisted): void {
            $persisted[] = $n;
        });
        $this->em->method('flush');

        $this->service->notifyValidationChange(['status' => 'invalidate'], $period, $actor, $resident);

        // Only the resident notification since no other managers
        $this->assertCount(1, $persisted);
        $body = $persisted[0]->getBody();
        $this->assertStringContainsString('Invalidation', $body);
        $this->assertStringNotContainsString('Validation', $body);
    }

    public function testManagerCommentAppendsOnlyToManagerBody(): void
    {
        $year     = $this->makeYear();
        $period   = $this->makePeriod($year);
        $actor    = $this->makeManager(1, 'Alice', 'Martin');
        $other    = $this->makeManager(2);
        $resident = $this->makeResident();

        $this->managerYearsRepo->method('fetchYearManagers')
            ->willReturn([['managerId' => 1], ['managerId' => 2]]);
        $this->managerRepo->method('findBy')->willReturn([$other]);

        $persisted = [];
        $this->em->method('persist')->willReturnCallback(function ($n) use (&$persisted): void {
            $persisted[] = $n;
        });
        $this->em->method('flush');

        $this->service->notifyValidationChange(
            ['status' => 'validate', 'managerComment' => 'Bien validé'],
            $period,
            $actor,
            $resident,
        );

        $managerBody  = $persisted[0]->getBody();
        $residentBody = $persisted[1]->getBody();

        $this->assertStringContainsString('Bien validé', $managerBody);
        $this->assertStringNotContainsString('Bien validé', $residentBody);
    }

    public function testResidentNotificationAppendsToManagerAndResidentBodies(): void
    {
        $year     = $this->makeYear();
        $period   = $this->makePeriod($year);
        $actor    = $this->makeManager(1, 'Alice', 'Martin');
        $other    = $this->makeManager(2);
        $resident = $this->makeResident();

        $this->managerYearsRepo->method('fetchYearManagers')
            ->willReturn([['managerId' => 1], ['managerId' => 2]]);
        $this->managerRepo->method('findBy')->willReturn([$other]);

        $persisted = [];
        $this->em->method('persist')->willReturnCallback(function ($n) use (&$persisted): void {
            $persisted[] = $n;
        });
        $this->em->method('flush');

        $this->service->notifyValidationChange(
            ['status' => 'validate', 'residentNotification' => 'Pensez à compléter le formulaire'],
            $period,
            $actor,
            $resident,
        );

        $this->assertStringContainsString('Pensez à compléter le formulaire', $persisted[0]->getBody());
        $this->assertStringContainsString('Pensez à compléter le formulaire', $persisted[1]->getBody());
    }

    public function testActorIsExcludedFromManagerNotifications(): void
    {
        $year     = $this->makeYear();
        $period   = $this->makePeriod($year);
        $actor    = $this->makeManager(1);
        $resident = $this->makeResident();

        $this->managerYearsRepo->method('fetchYearManagers')
            ->willReturn([['managerId' => 1]]);

        $capturedIds = null;
        $this->managerRepo->method('findBy')
            ->willReturnCallback(function (array $criteria) use (&$capturedIds) {
                $capturedIds = $criteria['id'];
                return [];
            });

        $this->em->method('persist');
        $this->em->method('flush');

        $this->service->notifyValidationChange(['status' => 'validate'], $period, $actor, $resident);

        $this->assertSame([], $capturedIds);
    }

    public function testSingleQueryForManagers(): void
    {
        $year     = $this->makeYear();
        $period   = $this->makePeriod($year);
        $actor    = $this->makeManager(1);
        $resident = $this->makeResident();

        $this->managerYearsRepo->method('fetchYearManagers')
            ->willReturn([['managerId' => 1], ['managerId' => 2], ['managerId' => 3]]);

        // findBy must be called exactly once — not once per manager (no N+1)
        $this->managerRepo->expects($this->once())
            ->method('findBy')
            ->with(['id' => [2, 3]])
            ->willReturn([$this->makeManager(2), $this->makeManager(3)]);

        $this->em->method('persist');
        $this->em->expects($this->once())->method('flush');

        $this->service->notifyValidationChange(['status' => 'validate'], $period, $actor, $resident);
    }

    public function testValidateTypeIsSetCorrectly(): void
    {
        $year     = $this->makeYear();
        $period   = $this->makePeriod($year);
        $actor    = $this->makeManager(1, 'Alice', 'Martin');
        $other    = $this->makeManager(2);
        $resident = $this->makeResident();

        $this->managerYearsRepo->method('fetchYearManagers')
            ->willReturn([['managerId' => 1], ['managerId' => 2]]);
        $this->managerRepo->method('findBy')->willReturn([$other]);

        $persisted = [];
        $this->em->method('persist')->willReturnCallback(function ($n) use (&$persisted): void {
            $persisted[] = $n;
        });
        $this->em->method('flush');

        $this->service->notifyValidationChange(['status' => 'validate'], $period, $actor, $resident);

        $this->assertSame('validated', $persisted[0]->getType());
        $this->assertSame('validated', $persisted[1]->getType());
    }

    public function testInvalidateTypeIsSetCorrectly(): void
    {
        $year     = $this->makeYear();
        $period   = $this->makePeriod($year);
        $actor    = $this->makeManager(1, 'Alice', 'Martin');
        $resident = $this->makeResident();

        $this->managerYearsRepo->method('fetchYearManagers')
            ->willReturn([['managerId' => 1]]);
        $this->managerRepo->method('findBy')->willReturn([]);

        $persisted = [];
        $this->em->method('persist')->willReturnCallback(function ($n) use (&$persisted): void {
            $persisted[] = $n;
        });
        $this->em->method('flush');

        $this->service->notifyValidationChange(['status' => 'invalidate'], $period, $actor, $resident);

        $this->assertSame('invalidated', $persisted[0]->getType());
    }
}
