<?php

declare(strict_types=1);

namespace App\Services\StaffPlanner;

use App\Entity\Resident;
use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\TimesheetRepository;
use App\Services\Utils\Tools;

class GetDataByMonth
{
    public function __construct(
        private readonly TimesheetRepository $timesheetRepository,
        private readonly GardeRepository $gardeRepository,
        private readonly AbsenceRepository $absenceRepository,
        private readonly Tools $tools,
    ) {
    }

    /**
     * Fetch Timesheets, Garde and Absence beetween 2 given dates
     *
     * @return array<string, list<array<string, mixed>>> [timesheets (start, end, pause, called), gardes (start, end, pause, called), absence (start, end, type)]
     */
    public function fetchData(Resident $resident, string $startDate, string $endDate): array
    {
        $data = [];

        $timesheetRequest = $this->timesheetRepository->findByMonth($resident, $startDate, $endDate);
        $gardeRequest = $this->gardeRepository->findByMonth($resident, $startDate, $endDate);
        $absenceRequest = $this->absenceRepository->findByMonth($resident, $startDate, $endDate);

        $timesheets = $this->tools->separateTimesheetsByDay($timesheetRequest);
        $gardes = $this->tools->separateGardeByDay($gardeRequest);
        $absences = $this->tools->separateAbsenceByDay($absenceRequest);


        // 1. Loop on each Timesheets
        $timesheetsData = [];
        foreach ($timesheets as $timesheet) {
            if ($this->tools->checkIfDateIsInCurrentMonth($timesheet['start'], $startDate, $endDate)) {
                $timesheetsData[] = $timesheet;
            }
        }
        $data['timesheets'] = $timesheetsData;

        // 2. Loop on each Gardes
        $gardesData = [];
        foreach ($gardes as $garde) {
            if ($this->tools->checkIfDateIsInCurrentMonth($garde['start'], $startDate, $endDate)) {
                $gardesData[] = $garde;
            }
        }
        $data['gardes'] = $gardesData;

        // 3. Loop on each Absences
        $absencesData = [];
        foreach ($absences as $absence) {
            if ($this->tools->checkIfDateIsInCurrentMonth($absence['start'], $startDate, $endDate)) {
                $absencesData[] = $absence;
            }
        }
        $data['absences'] = $absencesData;

        return $data;
    }
}
