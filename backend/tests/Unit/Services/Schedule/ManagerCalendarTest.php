<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\Schedule;

use App\Entity\Resident;
use App\Entity\YearsResident;
use App\Repository\ResidentYearCalendarRepository;
use App\Services\Schedule\ManagerSchedule\ManagerCalendar;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class ManagerCalendarTest extends TestCase
{
    /** @var EntityManagerInterface&MockObject */
    private EntityManagerInterface $em;

    /** @var ResidentYearCalendarRepository&MockObject */
    private ResidentYearCalendarRepository $calendarRepo;

    private ManagerCalendar $service;

    protected function setUp(): void
    {
        $this->em           = $this->createMock(EntityManagerInterface::class);
        $this->calendarRepo = $this->createMock(ResidentYearCalendarRepository::class);

        $this->service = new ManagerCalendar($this->em, $this->calendarRepo);
    }

    private function makeYearsResident(?int $id = 1): YearsResident&MockObject
    {
        $yr = $this->createMock(YearsResident::class);
        $yr->method('getId')->willReturn($id);

        $resident = $this->createMock(Resident::class);
        $resident->method('getId')->willReturn(42);
        $resident->method('getFirstname')->willReturn('Jean');
        $resident->method('getLastname')->willReturn('Dupont');
        $yr->method('getResident')->willReturn($resident);

        return $yr;
    }

    /** @return array<string, string> */
    private function baseData(): array
    {
        return [
            'dateOfStart' => '2024-01-10 08:00:00',
            'dateOfEnd'   => '2024-01-10 16:00:00',
            'title'       => 'Consultation',
            'description' => 'Rendez-vous',
        ];
    }

    // ─── addEventToCallendarAsManager ────────────────────────────────────────

    public function testReturns400WhenEndBeforeStart(): void
    {
        $yr   = $this->makeYearsResident();
        $data = $this->baseData();
        $data['dateOfEnd'] = '2024-01-10 07:00:00'; // before start

        $result = $this->service->addEventToCallendarAsManager($yr, $data);

        $this->assertSame(400, $result['status']);
    }

    public function testReturns500WhenYearsResidentIdIsNull(): void
    {
        $yr   = $this->makeYearsResident(null);

        $result = $this->service->addEventToCallendarAsManager($yr, $this->baseData());

        $this->assertSame(500, $result['status']);
    }

    public function testReturns400WhenOverlapDetected(): void
    {
        $yr = $this->makeYearsResident(1);
        $this->calendarRepo->method('findOverlappingEvents')->willReturn(true);

        $result = $this->service->addEventToCallendarAsManager($yr, $this->baseData());

        $this->assertSame(400, $result['status']);
    }

    public function testReturns200AndEventDataOnSuccess(): void
    {
        $yr = $this->makeYearsResident(1);
        $this->calendarRepo->method('findOverlappingEvents')->willReturn(false);
        $this->em->method('persist');
        $this->em->method('flush');

        $result = $this->service->addEventToCallendarAsManager($yr, $this->baseData());

        $this->assertSame(200, $result['status']);
        $this->assertArrayHasKey('event', $result);
        $this->assertSame('Consultation', $result['event']['title']);
        $this->assertSame('Jean', $result['event']['residentFirstname']);
    }

    // ─── updateEventInCalendarAsManager ──────────────────────────────────────

    public function testUpdateReturns400OnOverlap(): void
    {
        $yr    = $this->makeYearsResident(1);
        $event = $this->createMock(\App\Entity\ResidentYearCalendar::class);

        $this->calendarRepo->method('findOverlappingEvents')->willReturn(true);

        $result = $this->service->updateEventInCalendarAsManager($event, $yr, $this->baseData());

        $this->assertSame(400, $result['status']);
    }

    public function testUpdateReturns200OnSuccess(): void
    {
        $yr    = $this->makeYearsResident(1);
        $event = $this->createMock(\App\Entity\ResidentYearCalendar::class);
        $event->method('setTitle')->willReturnSelf();
        $event->method('setDateOfStart')->willReturnSelf();
        $event->method('setDateOfEnd')->willReturnSelf();
        $event->method('setDescription')->willReturnSelf();
        $event->method('setYearsResident')->willReturnSelf();

        $this->calendarRepo->method('findOverlappingEvents')->willReturn(false);
        $this->em->method('flush');

        $result = $this->service->updateEventInCalendarAsManager($event, $yr, $this->baseData());

        $this->assertSame(200, $result['status']);
    }
}
