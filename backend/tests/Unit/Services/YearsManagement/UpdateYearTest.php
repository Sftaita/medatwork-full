<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\YearsManagement;

use App\Entity\Manager;
use App\Entity\Years;
use App\Repository\ManagerYearsRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsWeekIntervalsRepository;
use App\Security\Voter\YearAccessVoter;
use App\Services\YearsManagement\UpdateYear;
use App\Services\YearsManagement\WeekIntervals;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class UpdateYearTest extends TestCase
{
    /** @var YearsRepository&MockObject */
    private YearsRepository $yearsRepo;

    /** @var EntityManagerInterface&MockObject */
    private EntityManagerInterface $em;

    /** @var ManagerYearsRepository&MockObject */
    private ManagerYearsRepository $managerYearsRepo;

    /** @var WeekIntervals&MockObject */
    private WeekIntervals $weekIntervals;

    /** @var YearsWeekIntervalsRepository&MockObject */
    private YearsWeekIntervalsRepository $weekIntervalsRepo;

    /** @var AuthorizationCheckerInterface&MockObject */
    private AuthorizationCheckerInterface $authChecker;

    private UpdateYear $service;

    protected function setUp(): void
    {
        $this->yearsRepo        = $this->createMock(YearsRepository::class);
        $this->em               = $this->createMock(EntityManagerInterface::class);
        $this->managerYearsRepo = $this->createMock(ManagerYearsRepository::class);
        $this->weekIntervals    = $this->createMock(WeekIntervals::class);
        $this->weekIntervalsRepo = $this->createMock(YearsWeekIntervalsRepository::class);
        $this->authChecker      = $this->createMock(AuthorizationCheckerInterface::class);

        $this->service = new UpdateYear(
            $this->yearsRepo,
            $this->em,
            $this->managerYearsRepo,
            $this->weekIntervals,
            $this->weekIntervalsRepo,
            $this->authChecker,
        );
    }

    private function makeManager(): Manager&MockObject
    {
        return $this->createMock(Manager::class);
    }

    // ─── updateYear ───────────────────────────────────────────────────────────

    public function testReturnsNullWhenYearNotFound(): void
    {
        $this->yearsRepo->method('findOneBy')->willReturn(null);

        $result = $this->service->updateYear(99, $this->makeManager(), ['target' => 'title', 'newValue' => 'X']);

        $this->assertNull($result);
    }

    public function testThrowsAccessDeniedWhenNotAdmin(): void
    {
        $year = new Years();
        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')->willReturn(false);

        $this->expectException(AccessDeniedException::class);
        $this->service->updateYear(1, $this->makeManager(), ['target' => 'title', 'newValue' => 'X']);
    }

    public function testUpdatesTitleField(): void
    {
        $year = new Years();
        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')->willReturn(true);

        $result = $this->service->updateYear(1, $this->makeManager(), ['target' => 'title', 'newValue' => 'Nouveau titre']);

        $this->assertSame($year, $result);
        $this->assertSame('Nouveau titre', $year->getTitle());
    }

    public function testUpdatesSpecialityField(): void
    {
        $year = new Years();
        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')->willReturn(true);

        $this->service->updateYear(1, $this->makeManager(), ['target' => 'speciality', 'newValue' => 'Cardiologie']);

        $this->assertSame('Cardiologie', $year->getSpeciality());
    }

    public function testUpdatesLocationField(): void
    {
        $year = new Years();
        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')->willReturn(true);

        $this->service->updateYear(1, $this->makeManager(), ['target' => 'location', 'newValue' => 'Bruxelles']);

        $this->assertSame('Bruxelles', $year->getLocation());
    }

    public function testUpdatesPeriodField(): void
    {
        $year = new Years();
        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')->willReturn(true);

        $this->service->updateYear(1, $this->makeManager(), ['target' => 'period', 'newValue' => 'semester']);

        $this->assertSame('semester', $year->getPeriod());
    }

    public function testDateOfStartUpdateTriggersWeekIntervalRebuild(): void
    {
        $year = new Years();
        $year->setDateOfStart(new \DateTime('2024-01-01'));
        $year->setDateOfEnd(new \DateTime('2025-01-01'));

        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->weekIntervalsRepo->method('findBy')->willReturn([]);
        $this->weekIntervals->expects($this->once())->method('updateWeekIntervals')->willReturn([]);

        $this->service->updateYear(1, $this->makeManager(), ['target' => 'dateOfStart', 'newValue' => '2024-02-01']);

        $this->assertSame('2024-02-01', $year->getDateOfStart()->format('Y-m-d'));
    }

    public function testDateOfEndUpdateTriggersWeekIntervalRebuild(): void
    {
        $year = new Years();
        $year->setDateOfStart(new \DateTime('2024-01-01'));
        $year->setDateOfEnd(new \DateTime('2025-01-01'));

        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->weekIntervalsRepo->method('findBy')->willReturn([]);
        $this->weekIntervals->expects($this->once())->method('updateWeekIntervals')->willReturn([]);

        $this->service->updateYear(1, $this->makeManager(), ['target' => 'dateOfEnd', 'newValue' => '2025-06-01']);

        $this->assertSame('2025-06-01', $year->getDateOfEnd()->format('Y-m-d'));
    }

    public function testNonDateTargetDoesNotRebuildWeekIntervals(): void
    {
        $year = new Years();
        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->weekIntervals->expects($this->never())->method('updateWeekIntervals');

        $this->service->updateYear(1, $this->makeManager(), ['target' => 'title', 'newValue' => 'X']);
    }

    public function testPersistAndFlushCalledOnSuccess(): void
    {
        $year = new Years();
        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->em->expects($this->atLeastOnce())->method('persist');
        $this->em->expects($this->atLeastOnce())->method('flush');

        $this->service->updateYear(1, $this->makeManager(), ['target' => 'title', 'newValue' => 'Test']);
    }
}
