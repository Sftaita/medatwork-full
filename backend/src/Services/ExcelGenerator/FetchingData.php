<?php

declare(strict_types=1);

namespace App\Services\ExcelGenerator;

use App\Entity\Resident;
use App\Entity\Years;
use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\TimesheetRepository;
use App\Services\Utils\Tools;

class FetchingData
{
    public function __construct(
        private readonly TimesheetRepository $timesheetRepository,
        private readonly GardeRepository $gardeRepository,
        private readonly AbsenceRepository $absenceRepository,
        private readonly Tools $tools,
    ) {
    }

    /**
     * Fetch timesheets,gardes and absences of the resident to the specified year
     *
     * @return array{
     *   timesheets: list<array<string, mixed>>,
     *   gardes: list<array{id: int, dateOfStart: \DateTime, dateOfEnd: \DateTime, type: string}>,
     *   absences: list<array{id: int|null, dateOfStart: \DateTimeInterface|null, dateOfEnd: \DateTimeInterface|null, type: string}>
     * }
     */
    public function getExcelTransformedData(Years $year, Resident $resident): array
    {
        // 1. Timesheets
        $request = $this->timesheetRepository->findBy(['year' => $year, 'resident' => $resident]);
        $timesheets = [];

        foreach ($request as $c) {

            $id = $c->getId();
            $dateOfStart = $c->getDateOfStart();
            $dateOfEnd = $c -> getDateOfEnd();
            $pause = $c->getPause();
            $scientific = $c->getScientific();
            $called = $c->getCalled();

            $timesheets[] = ['id' => $id, 'dateOfStart' => $dateOfStart, 'dateOfEnd' => $dateOfEnd, 'pause' => $pause, 'scientific' => $scientific, 'called' => $called];
        }

        // 2. Gardes
        $gardes = array_values($this->gardeRepository->findByYear($year, $resident));

        // 3. Absences
        $request = $this->absenceRepository->findBy(['year' => $year, 'resident' => $resident]);
        $absences = [];

        foreach ($request as $c) {

            $id = $c->getId();
            $dateOfStart = $c->getDateOfStart();
            $dateOfEnd = $c -> getDateOfEnd();
            $type = $c->getType()->value;

            $absences[] = ['id' => $id, 'dateOfStart' => $dateOfStart, 'dateOfEnd' => $dateOfEnd, 'type' => $type];
        }

        return ['timesheets' => $timesheets,'gardes' => $gardes,'absences' => $absences];
    }

    /**
     * Separate timesheets and garde on place by day
     *
     * @param list<array<string, mixed>> $timesheets
     * @param list<array<string, mixed>> $gardes
     * @return list<array<string, mixed>>
     */
    public function onPlaceDayPeriod(array $timesheets, array $gardes): array
    {
        $result = [];

        // 1. Working on timesheets
        $timesheetsPeriod = $this->tools->separateTimesheetsByDay($timesheets);

        foreach ($timesheetsPeriod as $period) {
            $period['index'] = 'timesheet';
            $period['timestamp'] = strtotime($period['start']);
            $result[] = $period;
        }

        // 2. working on non callable gardes (gardes in hospital)
        $selectHospitalGarde = array_values(array_filter($gardes, fn ($value) => ($value['type'] === 'hospital')));
        $gardePeriod = $this->tools->separateGardeByDay($selectHospitalGarde);

        foreach ($gardePeriod as $period) {
            $period['index'] = 'garde';
            $period['timestamp'] = strtotime($period['start']);
            $result[] = $period;
        }

        // 3. Order by timestamp
        $columns = array_column($result, 'timestamp');
        array_multisort($columns, SORT_ASC, $result);

        return $result;
    }

    /**
     * Create a standardized array for each worked day of the year
     *
     * @param list<array<string, mixed>> $onPlaceDayPeriods
     * @return array<string, array{date: string, interval: string|null, calledInterval: string|null, pause: int|null, scientific: int|null}>
     */
    public function createStandardizedTable(array $onPlaceDayPeriods): array
    {
        $output = [];

        foreach ($onPlaceDayPeriods as $values) {

            // Define current date
            $d = date('d-m-Y', strtotime($values['start']));

            // 1. Working on timesheets
            if ($values['index'] === 'timesheet') {

                // Check if something is already write on this date. If yes, we should avoid deleting it by simply write on it!
                if (isset($output[$d])) {

                    if ($values['called'] === false) {
                        $output[$d] = [
                            'date' => $d,
                            'interval' => $output[$d]['interval'].'  '.(date('H:i', strtotime($values['start'])).'-'.date('H:i', strtotime($values['end']))),
                            'calledInterval' => $output[$d]['calledInterval'],
                            'pause' => $output[$d]['pause'] + $values['pause'],
                            'scientific' => $output[$d]['scientific'] + $values['scientific'],
                        ];
                    } else {
                        $output[$d] = [
                            'date' => $d,
                            'interval' => $output[$d]['interval'],
                            'calledInterval' =>  $output[$d]['calledInterval'].'  '.(date('H:i', strtotime($values['start'])).'-'.date('H:i', strtotime($values['end']))),
                            'pause' => $output[$d]['pause'] + $values['pause'],
                            'scientific' => $output[$d]['scientific'] + $values['scientific'],
                        ];
                    }
                } else {
                    if ($values['called'] === false) {
                        $output[$d] = [
                            'date' => $d,
                            'interval' => (date('H:i', strtotime($values['start'])).'-'.date('H:i', strtotime($values['end']))),
                            'calledInterval' => null,
                            'pause' => $values['pause'],
                            'scientific' => $values['scientific'],
                        ];
                    } else {
                        $output[$d] = [
                            'date' => $d,
                            'interval' => null,
                            'calledInterval' => (date('H:i', strtotime($values['start'])).'-'.date('H:i', strtotime($values['end']))),
                            'pause' => $values['pause'],
                            'scientific' => $values['scientific'],
                        ];
                    }
                }
            }

            // 2. Working on gardes
            // To work, each $output array should be the same. For this reason, we are oblidge to create key pause and calledinterval for gardes item.
            if ($values['index'] === 'garde') {
                // Is there already something writen for this day?

                if (isset($output[$d])) {
                    $output[$d] = [
                        'date' => $d,
                        'interval' => $output[$d]['interval'].'  '.(date('H:i', strtotime($values['start'])).'-'.date('H:i', strtotime($values['end']))),
                        'calledInterval' => $output[$d]['calledInterval'],
                        'pause' => $output[$d]['pause'],
                        'scientific' => $output[$d]['scientific'],
                    ];
                } else {
                    $output[$d] = [
                    'date' => $d,
                    'interval' => (date('H:i', strtotime($values['start'])).'-'.date('H:i', strtotime($values['end']))),
                    'calledInterval' => null,
                    'pause' => null,
                    'scientific' => null,
                    ];

                }
            }
        };

        return $output;
    }


}
