<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\Schedule;

use App\Entity\ResidentWeeklySchedule;
use App\Entity\ResidentYearCalendar;
use App\Repository\ResidentYearCalendarRepository;
use App\Repository\YearsResidentRepository;
use App\Services\Schedule\ManagerSchedule\UpdateResidentYearCalendar;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class UpdateResidentYearCalendarTest extends TestCase
{
    /** @var EntityManagerInterface&MockObject */
    private EntityManagerInterface $em;

    /** @var YearsResidentRepository&MockObject */
    private YearsResidentRepository $yearsResidentRepo;

    /** @var ResidentYearCalendarRepository&MockObject */
    private ResidentYearCalendarRepository $calendarRepo;

    private UpdateResidentYearCalendar $service;

    protected function setUp(): void
    {
        $this->em                = $this->createMock(EntityManagerInterface::class);
        $this->yearsResidentRepo = $this->createMock(YearsResidentRepository::class);
        $this->calendarRepo      = $this->createMock(ResidentYearCalendarRepository::class);

        $this->service = new UpdateResidentYearCalendar(
            $this->em,
            $this->yearsResidentRepo,
            $this->calendarRepo,
        );
    }

    // ─── removeTasksFromCalendar ──────────────────────────────────────────────

    public function testRemovesEachTaskAndFlushes(): void
    {
        $schedule = $this->createMock(ResidentWeeklySchedule::class);
        $task1    = $this->createMock(ResidentYearCalendar::class);
        $task2    = $this->createMock(ResidentYearCalendar::class);

        $this->calendarRepo->method('findBy')->willReturn([$task1, $task2]);

        $this->em->expects($this->exactly(2))->method('remove')
            ->willReturnCallback(function ($arg) use ($task1, $task2): void {
                $this->assertContains($arg, [$task1, $task2]);
            });
        $this->em->expects($this->once())->method('flush');

        $this->service->removeTasksFromCalendar($schedule);
    }

    public function testRemoveFlushesEvenWhenNoTasksFound(): void
    {
        $schedule = $this->createMock(ResidentWeeklySchedule::class);
        $this->calendarRepo->method('findBy')->willReturn([]);

        $this->em->expects($this->never())->method('remove');
        $this->em->expects($this->once())->method('flush');

        $this->service->removeTasksFromCalendar($schedule);
    }

    public function testFindsByCorrectWeeklySchedule(): void
    {
        $schedule = $this->createMock(ResidentWeeklySchedule::class);

        $this->calendarRepo->expects($this->once())
            ->method('findBy')
            ->with(['residentWeeklySchedule' => $schedule])
            ->willReturn([]);

        $this->service->removeTasksFromCalendar($schedule);
    }
}
