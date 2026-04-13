<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\StaffPlanner;

use App\Entity\Resident;
use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\TimesheetRepository;
use App\Services\StaffPlanner\GetDataByMonth;
use App\Services\Utils\Tools;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class GetDataByMonthTest extends TestCase
{
    /** @var TimesheetRepository&MockObject */
    private TimesheetRepository $timesheetRepo;

    /** @var GardeRepository&MockObject */
    private GardeRepository $gardeRepo;

    /** @var AbsenceRepository&MockObject */
    private AbsenceRepository $absenceRepo;

    /** @var Tools&MockObject */
    private Tools $tools;

    private GetDataByMonth $service;

    protected function setUp(): void
    {
        $this->timesheetRepo = $this->createMock(TimesheetRepository::class);
        $this->gardeRepo     = $this->createMock(GardeRepository::class);
        $this->absenceRepo   = $this->createMock(AbsenceRepository::class);
        $this->tools         = $this->createMock(Tools::class);

        $this->service = new GetDataByMonth(
            $this->timesheetRepo,
            $this->gardeRepo,
            $this->absenceRepo,
            $this->tools,
        );
    }

    private function makeResident(): Resident&MockObject
    {
        return $this->createMock(Resident::class);
    }

    // ─── fetchData ────────────────────────────────────────────────────────────

    public function testReturnsEmptyArraysWhenNoData(): void
    {
        $this->timesheetRepo->method('findByMonth')->willReturn([]);
        $this->gardeRepo->method('findByMonth')->willReturn([]);
        $this->absenceRepo->method('findByMonth')->willReturn([]);
        $this->tools->method('separateTimesheetsByDay')->willReturn([]);
        $this->tools->method('separateGardeByDay')->willReturn([]);
        $this->tools->method('separateAbsenceByDay')->willReturn([]);

        $result = $this->service->fetchData($this->makeResident(), '2024-01-01', '2024-01-31');

        $this->assertSame(['timesheets' => [], 'gardes' => [], 'absences' => []], $result);
    }

    public function testIncludesTimesheetsThatPassFilter(): void
    {
        $ts = [['start' => '2024-01-10 08:00:00', 'end' => '2024-01-10 16:00:00']];

        $this->timesheetRepo->method('findByMonth')->willReturn([]);
        $this->gardeRepo->method('findByMonth')->willReturn([]);
        $this->absenceRepo->method('findByMonth')->willReturn([]);
        $this->tools->method('separateTimesheetsByDay')->willReturn($ts);
        $this->tools->method('separateGardeByDay')->willReturn([]);
        $this->tools->method('separateAbsenceByDay')->willReturn([]);
        $this->tools->method('checkIfDateIsInCurrentMonth')->willReturn(true);

        $result = $this->service->fetchData($this->makeResident(), '2024-01-01', '2024-01-31');

        $this->assertCount(1, $result['timesheets']);
    }

    public function testExcludesTimesheetsThatFailFilter(): void
    {
        $ts = [['start' => '2023-12-31 08:00:00', 'end' => '2023-12-31 16:00:00']];

        $this->timesheetRepo->method('findByMonth')->willReturn([]);
        $this->gardeRepo->method('findByMonth')->willReturn([]);
        $this->absenceRepo->method('findByMonth')->willReturn([]);
        $this->tools->method('separateTimesheetsByDay')->willReturn($ts);
        $this->tools->method('separateGardeByDay')->willReturn([]);
        $this->tools->method('separateAbsenceByDay')->willReturn([]);
        $this->tools->method('checkIfDateIsInCurrentMonth')->willReturn(false);

        $result = $this->service->fetchData($this->makeResident(), '2024-01-01', '2024-01-31');

        $this->assertSame([], $result['timesheets']);
    }

    public function testFiltersGardesAndAbsencesIndependently(): void
    {
        $garde   = [['start' => '2024-01-05 20:00:00']];
        $absence = [['start' => '2024-01-08 00:00:00']];

        $this->timesheetRepo->method('findByMonth')->willReturn([]);
        $this->gardeRepo->method('findByMonth')->willReturn([]);
        $this->absenceRepo->method('findByMonth')->willReturn([]);
        $this->tools->method('separateTimesheetsByDay')->willReturn([]);
        $this->tools->method('separateGardeByDay')->willReturn($garde);
        $this->tools->method('separateAbsenceByDay')->willReturn($absence);
        $this->tools->method('checkIfDateIsInCurrentMonth')->willReturn(true);

        $result = $this->service->fetchData($this->makeResident(), '2024-01-01', '2024-01-31');

        $this->assertCount(1, $result['gardes']);
        $this->assertCount(1, $result['absences']);
    }

    public function testPassesCorrectDateRangeToCriteria(): void
    {
        $resident  = $this->makeResident();
        $startDate = '2024-03-01';
        $endDate   = '2024-03-31';

        $this->timesheetRepo->expects($this->once())->method('findByMonth')->with($resident, $startDate, $endDate)->willReturn([]);
        $this->gardeRepo->expects($this->once())->method('findByMonth')->with($resident, $startDate, $endDate)->willReturn([]);
        $this->absenceRepo->expects($this->once())->method('findByMonth')->with($resident, $startDate, $endDate)->willReturn([]);
        $this->tools->method('separateTimesheetsByDay')->willReturn([]);
        $this->tools->method('separateGardeByDay')->willReturn([]);
        $this->tools->method('separateAbsenceByDay')->willReturn([]);

        $this->service->fetchData($resident, $startDate, $endDate);
    }
}
