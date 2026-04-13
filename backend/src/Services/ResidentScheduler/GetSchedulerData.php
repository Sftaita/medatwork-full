<?php

declare(strict_types=1);

namespace App\Services\ResidentScheduler;

use App\Entity\Resident;
use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\TimesheetRepository;

class GetSchedulerData
{
    public function __construct(
        private readonly TimesheetRepository $timesheetRepository,
        private readonly GardeRepository $gardeRepository,
        private readonly AbsenceRepository $absenceRepository,
    ) {
    }

    /**
     * @param array<int, array<string, mixed>> $timesheets
     * @return list<array<string, mixed>>
     */
    private function timesheetConvertor(array $timesheets): array
    {
        $dataConverted =  [];
        $counter = 1;
        foreach ($timesheets as $timesheet) {

            // 1.
            if ($timesheet['called']) {
                $subject = "Retour à l'hopital";
            } else {
                $subject = 'Heures standard';
            }

            // 2.
            $data = [
                'timesheetId' => $timesheet['id'],
                'startDate' => date('Y-m-d H:i', $timesheet['dateOfStart']->getTimestamp()),
                'endDate' => date('Y-m-d H:i', $timesheet['dateOfEnd']->getTimestamp()),
                'title' => $subject,
                'type' => 'timesheet',
            ];

            // 3.
            $dataConverted[] = $data;
            $counter++;
        }

        return $dataConverted;
    }

    /**
     * @param array<int, array<string, mixed>> $gardes
     * @return list<array<string, mixed>>
     */
    private function gardesConvertor(array $gardes): array
    {

        $dataConverted = [];

        foreach ($gardes as $garde) {

            // 1.
            if ($garde['type'] === 'hospital') {
                // 2.
                $data = [
                'gardeId' => $garde['id'],
                'startDate' => date('Y-m-d H:i', $garde['dateOfStart']->getTimestamp()),
                'endDate' => date('Y-m-d H:i', $garde['dateOfEnd']->getTimestamp()),
                'title' => 'Garde sur place',
                'type' => 'garde',
                ];

                $dataConverted[] = $data;
            }

        }

        return $dataConverted;
    }

    /**
     * @param array<int, array<string, mixed>> $absences
     * @return list<array<string, mixed>>
     */
    private function abcencesConvertor(array $absences): array
    {

        $dataConverted = [];

        foreach ($absences as $absence) {

            if (! empty($absence['dateOfEnd'])) {
                $data = [
                    'absenceId' => $absence['id'],
                    'startDate' => date('Y-m-d H:i', $absence['dateOfStart']->getTimestamp()),
                    'endDate' => date('Y-m-d H:i', $absence['dateOfEnd']->getTimestamp()),
                    'title' => $absence['type'],
                    'type' => 'absence',
                    ];
            } else {
                $data = [
                    'absenceId' => $absence['id'],
                    'startDate' => date('Y-m-d H:i', $absence['dateOfStart']->getTimestamp()),
                    'title' => $absence['type'],
                    'type' => 'absence',
                    ];
            }

            $dataConverted[] = $data;
        }

        return $dataConverted;
    }


    /**
     * Fetch and transforme data for the scheduler. Format is defined by scheduler component in the frontend
     *
     * @return list<array<string, mixed>> Mix of timesheets, gardes and absences of this user
     */
    public function getData(Resident $user): array
    {
        $data = [];

        $timesheets = $this->timesheetRepository->search($user);
        $timesheetsConverted = $this->timesheetConvertor($timesheets);

        $gardes = $this->gardeRepository->search($user);
        $gardesConverted = $this->gardesConvertor($gardes);

        $absences = $this->absenceRepository->search($user);
        $absencesConverted = $this->abcencesConvertor($absences);

        $counter = 1;
        foreach ($timesheetsConverted as $t) {

            $t['id'] = $counter;
            $counter++;

            $data[] = $t;
        }

        foreach ($gardesConverted as $g) {
            $g['id'] = $counter;
            $counter++;

            $data[] = $g;
        }

        foreach ($absencesConverted as $a) {
            $a['id'] = $counter;
            $counter++;

            $data[] = $a;
        }

        return $data;
    }


}
