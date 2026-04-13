<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\ResidentScheduler;

use App\Entity\Resident;
use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\TimesheetRepository;
use App\Services\ResidentScheduler\GetSchedulerData;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class GetSchedulerDataTest extends TestCase
{
    /** @var TimesheetRepository&MockObject */
    private TimesheetRepository $timesheetRepo;

    /** @var GardeRepository&MockObject */
    private GardeRepository $gardeRepo;

    /** @var AbsenceRepository&MockObject */
    private AbsenceRepository $absenceRepo;

    private GetSchedulerData $service;

    protected function setUp(): void
    {
        $this->timesheetRepo = $this->createMock(TimesheetRepository::class);
        $this->gardeRepo     = $this->createMock(GardeRepository::class);
        $this->absenceRepo   = $this->createMock(AbsenceRepository::class);

        $this->service = new GetSchedulerData(
            $this->timesheetRepo,
            $this->gardeRepo,
            $this->absenceRepo,
        );
    }

    private function makeResident(): Resident&MockObject
    {
        return $this->createMock(Resident::class);
    }

    private function makeDateTime(string $datetime): \DateTime
    {
        return new \DateTime($datetime);
    }

    // ─── getData — timesheets ─────────────────────────────────────────────────

    public function testTimesheetCalledFlagProducesRetourHopital(): void
    {
        $this->timesheetRepo->method('search')->willReturn([[
            'id'          => 1,
            'dateOfStart' => $this->makeDateTime('2024-01-10 08:00'),
            'dateOfEnd'   => $this->makeDateTime('2024-01-10 16:00'),
            'called'      => true,
        ]]);
        $this->gardeRepo->method('search')->willReturn([]);
        $this->absenceRepo->method('search')->willReturn([]);

        $result = $this->service->getData($this->makeResident());

        $this->assertCount(1, $result);
        $this->assertSame("Retour à l'hopital", $result[0]['title']);
        $this->assertSame('timesheet', $result[0]['type']);
    }

    public function testTimesheetNotCalledProducesHeuresStandard(): void
    {
        $this->timesheetRepo->method('search')->willReturn([[
            'id'          => 1,
            'dateOfStart' => $this->makeDateTime('2024-01-10 08:00'),
            'dateOfEnd'   => $this->makeDateTime('2024-01-10 16:00'),
            'called'      => false,
        ]]);
        $this->gardeRepo->method('search')->willReturn([]);
        $this->absenceRepo->method('search')->willReturn([]);

        $result = $this->service->getData($this->makeResident());

        $this->assertSame('Heures standard', $result[0]['title']);
    }

    // ─── getData — gardes ─────────────────────────────────────────────────────

    public function testOnlyHospitalGardesAreIncluded(): void
    {
        $this->timesheetRepo->method('search')->willReturn([]);
        $this->gardeRepo->method('search')->willReturn([
            ['id' => 1, 'dateOfStart' => $this->makeDateTime('2024-01-05 20:00'), 'dateOfEnd' => $this->makeDateTime('2024-01-06 08:00'), 'type' => 'hospital'],
            ['id' => 2, 'dateOfStart' => $this->makeDateTime('2024-01-07 18:00'), 'dateOfEnd' => $this->makeDateTime('2024-01-08 08:00'), 'type' => 'callable'],
        ]);
        $this->absenceRepo->method('search')->willReturn([]);

        $result = $this->service->getData($this->makeResident());

        $this->assertCount(1, $result);
        $this->assertSame('garde', $result[0]['type']);
        $this->assertSame('Garde sur place', $result[0]['title']);
    }

    // ─── getData — absences ───────────────────────────────────────────────────

    public function testAbsenceWithEndDateIncludesEndDateKey(): void
    {
        $this->timesheetRepo->method('search')->willReturn([]);
        $this->gardeRepo->method('search')->willReturn([]);
        $this->absenceRepo->method('search')->willReturn([[
            'id'          => 1,
            'dateOfStart' => $this->makeDateTime('2024-01-15 00:00'),
            'dateOfEnd'   => $this->makeDateTime('2024-01-16 00:00'),
            'type'        => 'annualLeave',
        ]]);

        $result = $this->service->getData($this->makeResident());

        $this->assertCount(1, $result);
        $this->assertArrayHasKey('endDate', $result[0]);
        $this->assertSame('absence', $result[0]['type']);
    }

    public function testAbsenceWithoutEndDateOmitsEndDateKey(): void
    {
        $this->timesheetRepo->method('search')->willReturn([]);
        $this->gardeRepo->method('search')->willReturn([]);
        $this->absenceRepo->method('search')->willReturn([[
            'id'          => 1,
            'dateOfStart' => $this->makeDateTime('2024-01-15 00:00'),
            'dateOfEnd'   => null,
            'type'        => 'sickLeave',
        ]]);

        $result = $this->service->getData($this->makeResident());

        $this->assertArrayNotHasKey('endDate', $result[0]);
    }

    // ─── getData — sequential IDs ─────────────────────────────────────────────

    public function testSequentialIdsAcrossAllTypes(): void
    {
        $this->timesheetRepo->method('search')->willReturn([[
            'id'          => 10,
            'dateOfStart' => $this->makeDateTime('2024-01-01 08:00'),
            'dateOfEnd'   => $this->makeDateTime('2024-01-01 16:00'),
            'called'      => false,
        ]]);
        $this->gardeRepo->method('search')->willReturn([[
            'id'          => 20,
            'dateOfStart' => $this->makeDateTime('2024-01-05 20:00'),
            'dateOfEnd'   => $this->makeDateTime('2024-01-06 08:00'),
            'type'        => 'hospital',
        ]]);
        $this->absenceRepo->method('search')->willReturn([[
            'id'          => 30,
            'dateOfStart' => $this->makeDateTime('2024-01-10 00:00'),
            'dateOfEnd'   => $this->makeDateTime('2024-01-10 23:59'),
            'type'        => 'annualLeave',
        ]]);

        $result = $this->service->getData($this->makeResident());

        $this->assertCount(3, $result);
        $this->assertSame(1, $result[0]['id']);
        $this->assertSame(2, $result[1]['id']);
        $this->assertSame(3, $result[2]['id']);
    }
}
