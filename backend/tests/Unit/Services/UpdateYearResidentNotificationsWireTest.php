<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Entity\Manager;
use App\Entity\PeriodValidation;
use App\Entity\Resident;
use App\Entity\Years;
use App\Repository\ManagerYearsRepository;
use App\Repository\ManagerRepository;
use App\Services\NotificationDecisionService;
use App\Services\Notifications\UpdateYearResidentNotifications;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

/**
 * P0 — Garantie architecturale : UpdateYearResidentNotifications
 * appelle shouldSend() avant tout persist() de notification.
 *
 * RED attendu :
 *   - Si NotificationDecisionService n'existe pas : "Class not found"
 *   - Si UpdateYearResidentNotifications n'injecte pas NotificationDecisionService :
 *     TypeError / too few arguments
 */
class UpdateYearResidentNotificationsWireTest extends TestCase
{
    /** @var EntityManagerInterface&MockObject */
    private EntityManagerInterface $em;

    /** @var NotificationDecisionService&MockObject */
    private NotificationDecisionService $decisionService;

    private UpdateYearResidentNotifications $service;

    protected function setUp(): void
    {
        $this->em              = $this->createMock(EntityManagerInterface::class);
        $this->decisionService = $this->createMock(NotificationDecisionService::class);

        $managerYearsRepo = $this->createMock(ManagerYearsRepository::class);
        $managerYearsRepo->method('fetchYearManagers')->willReturn([]);

        $managerRepo = $this->createMock(ManagerRepository::class);
        $managerRepo->method('findBy')->willReturn([]);

        // RED si le constructeur ne prend pas NotificationDecisionService
        $this->service = new UpdateYearResidentNotifications(
            $managerYearsRepo,
            $this->em,
            $managerRepo,
            $this->decisionService,
        );
    }

    private function makeValidData(string $status = 'validate'): array
    {
        return [
            'residentId'           => 1,
            'status'               => $status,
            'managerComment'       => '',
            'residentNotification' => '',
        ];
    }

    private function makePeriod(): PeriodValidation
    {
        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn(10);
        $year->method('getTitle')->willReturn('Test Year');
        $year->method('getResidents')->willReturn(new \Doctrine\Common\Collections\ArrayCollection());

        $period = $this->createMock(PeriodValidation::class);
        $period->method('getYear')->willReturn($year);
        $period->method('getMonth')->willReturn(4);
        $period->method('getYearNb')->willReturn(2026);

        return $period;
    }

    // ── WIRE01 : shouldSend=false → persist JAMAIS appelé ────────────────────

    public function testDoesNotPersistWhenShouldSendReturnsFalse(): void
    {
        $this->decisionService->method('shouldSend')->willReturn(false);

        $this->em->expects(self::never())->method('persist');

        $this->service->notifyValidationChange(
            $this->makeValidData(),
            $this->makePeriod(),
            $this->createMock(Manager::class),
            $this->createMock(Resident::class),
        );
    }

    // ── WIRE02 : shouldSend=true → persist APPELÉ ────────────────────────────

    public function testPersistsWhenShouldSendReturnsTrue(): void
    {
        $this->decisionService->method('shouldSend')->willReturn(true);

        $this->em->expects(self::atLeastOnce())->method('persist');
        $this->em->expects(self::atLeastOnce())->method('flush');

        $this->service->notifyValidationChange(
            $this->makeValidData(),
            $this->makePeriod(),
            $this->createMock(Manager::class),
            $this->createMock(Resident::class),
        );
    }

    // ── shouldSend appelé pour chaque canal ──────────────────────────────────

    public function testShouldSendIsCalledBeforePersist(): void
    {
        $this->decisionService
            ->expects(self::atLeastOnce())
            ->method('shouldSend');

        $this->em->method('persist')->willReturn(null);
        $this->em->method('flush')->willReturn(null);

        $this->service->notifyValidationChange(
            $this->makeValidData(),
            $this->makePeriod(),
            $this->createMock(Manager::class),
            $this->createMock(Resident::class),
        );
    }
}
