<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\Schedule;

use App\Entity\Resident;
use App\Entity\ResidentYearCalendar;
use App\Entity\YearsResident;
use App\Services\Schedule\ManagerSchedule\CalendarEventFormatter;
use PHPUnit\Framework\TestCase;

class CalendarEventFormatterTest extends TestCase
{
    private CalendarEventFormatter $formatter;

    protected function setUp(): void
    {
        $this->formatter = new CalendarEventFormatter();
    }

    public function testColorForIndexWrapsAround(): void
    {
        $color0  = $this->formatter->colorForIndex(0);
        $color10 = $this->formatter->colorForIndex(10); // should wrap to same as index 0

        $this->assertSame($color0, $color10);
    }

    public function testColorForIndexReturnsDifferentColorsForDifferentIndexes(): void
    {
        $this->assertNotSame(
            $this->formatter->colorForIndex(0),
            $this->formatter->colorForIndex(1)
        );
    }

    public function testFormatResidentReturnsExpectedKeys(): void
    {
        $resident = $this->createMockResident(42, 'Jean', 'Dupont');
        $yearResident = $this->createMockYearsResident($resident);

        $result = $this->formatter->formatResident($yearResident, '#FF0000');

        $this->assertSame(42, $result['residentId']);
        $this->assertSame('Jean', $result['residentFirstname']);
        $this->assertSame('Dupont', $result['residentLastname']);
        $this->assertSame('#FF0000', $result['residentColor']);
    }

    public function testFormatEventFirstLoadHasNoResidentNameKey(): void
    {
        $resident     = $this->createMockResident(1, 'Jean', 'Dupont');
        $yearResident = $this->createMockYearsResident($resident);
        $calendar     = $this->createMockCalendar(99, 'Titre', 'Desc', '2024-03-11 08:00', '2024-03-11 18:00');

        $result = $this->formatter->formatEventFirstLoad($calendar, $yearResident, '#00FF00');

        $this->assertArrayHasKey('residentYearCalendarId', $result);
        $this->assertArrayNotHasKey('residentName', $result);
        $this->assertSame(99, $result['residentYearCalendarId']);
        $this->assertSame('#00FF00', $result['residentColor']);
    }

    public function testFormatEventByYearHasResidentNameKey(): void
    {
        $resident     = $this->createMockResident(1, 'Jean', 'Dupont');
        $yearResident = $this->createMockYearsResident($resident);
        $calendar     = $this->createMockCalendar(99, 'Titre', 'Desc', '2024-03-11 08:00', '2024-03-11 18:00');

        $result = $this->formatter->formatEventByYear($calendar, $yearResident, '#0000FF');

        $this->assertArrayHasKey('residentName', $result);
        $this->assertSame('Dupont Jean', $result['residentName']);
    }

    // ─── mock helpers ────────────────────────────────────────────────────────

    private function createMockResident(int $id, string $firstname, string $lastname): Resident
    {
        $mock = $this->createMock(Resident::class);
        $mock->method('getId')->willReturn($id);
        $mock->method('getFirstname')->willReturn($firstname);
        $mock->method('getLastname')->willReturn($lastname);

        return $mock;
    }

    private function createMockYearsResident(Resident $resident): YearsResident
    {
        $mock = $this->createMock(YearsResident::class);
        $mock->method('getResident')->willReturn($resident);

        return $mock;
    }

    private function createMockCalendar(int $id, string $title, string $desc, string $start, string $end): ResidentYearCalendar
    {
        $mock = $this->createMock(ResidentYearCalendar::class);
        $mock->method('getId')->willReturn($id);
        $mock->method('getTitle')->willReturn($title);
        $mock->method('getDescription')->willReturn($desc);
        $mock->method('getDateOfStart')->willReturn(new \DateTime($start));
        $mock->method('getDateOfEnd')->willReturn(new \DateTime($end));
        return $mock;
    }
}
