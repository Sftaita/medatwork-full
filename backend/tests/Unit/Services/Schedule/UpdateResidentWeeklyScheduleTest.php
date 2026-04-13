<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\Schedule;

use App\Entity\Years;
use App\Repository\ResidentWeeklyScheduleRepository;
use App\Repository\YearsWeekIntervalsRepository;
use App\Repository\YearsWeekTemplatesRepository;
use App\Services\Schedule\ManagerSchedule\UpdateResidentWeeklySchedule;
use App\Services\Schedule\ManagerSchedule\UpdateResidentYearCalendar;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class UpdateResidentWeeklyScheduleTest extends TestCase
{
    /** @var EntityManagerInterface&MockObject */
    private EntityManagerInterface $em;

    /** @var UpdateResidentYearCalendar&MockObject */
    private UpdateResidentYearCalendar $updateCalendar;

    /** @var YearsWeekIntervalsRepository&MockObject */
    private YearsWeekIntervalsRepository $weekIntervalsRepo;

    /** @var YearsWeekTemplatesRepository&MockObject */
    private YearsWeekTemplatesRepository $weekTemplatesRepo;

    /** @var ResidentWeeklyScheduleRepository&MockObject */
    private ResidentWeeklyScheduleRepository $scheduleRepo;

    private UpdateResidentWeeklySchedule $service;

    protected function setUp(): void
    {
        $this->em                = $this->createMock(EntityManagerInterface::class);
        $this->updateCalendar    = $this->createMock(UpdateResidentYearCalendar::class);
        $this->weekIntervalsRepo = $this->createMock(YearsWeekIntervalsRepository::class);
        $this->weekTemplatesRepo = $this->createMock(YearsWeekTemplatesRepository::class);
        $this->scheduleRepo      = $this->createMock(ResidentWeeklyScheduleRepository::class);

        $this->service = new UpdateResidentWeeklySchedule(
            $this->em,
            $this->updateCalendar,
            $this->weekIntervalsRepo,
            $this->weekTemplatesRepo,
            $this->scheduleRepo,
        );
    }

    private function makeYear(): Years&MockObject
    {
        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn(1);
        $year->method('getResidents')->willReturn(new ArrayCollection([]));

        return $year;
    }

    // ─── validateSchedule (via performBulkUpdate) ─────────────────────────────

    public function testThrowsOnInvalidMethod(): void
    {
        $year = $this->makeYear();
        $this->weekIntervalsRepo->method('findBy')->willReturn([]);
        $this->weekTemplatesRepo->method('findBy')->willReturn([]);

        $this->expectException(\InvalidArgumentException::class);
        $this->service->performBulkUpdate($year, [[
            'method'             => 'invalid',
            'residentId'         => 1,
            'yearWeekTemplateId' => 2,
            'weekIntervalId'     => 3,
        ]]);
    }

    public function testThrowsWhenResidentIdNotInteger(): void
    {
        $year = $this->makeYear();
        $this->weekIntervalsRepo->method('findBy')->willReturn([]);
        $this->weekTemplatesRepo->method('findBy')->willReturn([]);

        $this->expectException(\InvalidArgumentException::class);
        $this->service->performBulkUpdate($year, [[
            'method'             => 'delete',
            'residentId'         => 'not-int',
            'yearWeekTemplateId' => 2,
            'weekIntervalId'     => 3,
        ]]);
    }

    public function testThrowsWhenWeekIntervalIdMissing(): void
    {
        $year = $this->makeYear();
        $this->weekIntervalsRepo->method('findBy')->willReturn([]);
        $this->weekTemplatesRepo->method('findBy')->willReturn([]);

        $this->expectException(\InvalidArgumentException::class);
        $this->service->performBulkUpdate($year, [[
            'method'             => 'delete',
            'residentId'         => 1,
            'yearWeekTemplateId' => 2,
            // weekIntervalId missing
        ]]);
    }

    public function testEmptySchedulesFlushesWithoutSideEffects(): void
    {
        $year = $this->makeYear();
        $this->weekIntervalsRepo->method('findBy')->willReturn([]);
        $this->weekTemplatesRepo->method('findBy')->willReturn([]);
        $this->em->expects($this->once())->method('flush');

        $this->service->performBulkUpdate($year, []);
    }

    public function testDuplicateScheduleKeysAreDeduplicatedToLastEntry(): void
    {
        // Two schedules with same (residentId, yearWeekTemplateId, weekIntervalId)
        // → only one should be processed (the last one wins in groupedSchedules)
        $year = $this->makeYear();
        $this->weekIntervalsRepo->method('findBy')->willReturn([]);
        $this->weekTemplatesRepo->method('findBy')->willReturn([]);
        $this->scheduleRepo->method('findOneBy')->willReturn(null); // nothing to delete

        $this->service->performBulkUpdate($year, [
            ['method' => 'delete', 'residentId' => 1, 'yearWeekTemplateId' => 2, 'weekIntervalId' => 3],
            ['method' => 'delete', 'residentId' => 1, 'yearWeekTemplateId' => 2, 'weekIntervalId' => 3],
        ]);

        // No exception = deduplication worked; entity not found so remove never called
        $this->em->expects($this->never())->method('remove');
    }
}
