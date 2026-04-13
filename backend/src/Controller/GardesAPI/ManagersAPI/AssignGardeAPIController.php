<?php

declare(strict_types=1);

namespace App\Controller\GardesAPI\ManagersAPI;

use App\Services\Gardes\ShiftAssignmentEngine;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Routing\Attribute\Route;

class AssignGardeAPIController extends AbstractController
{
    public function __construct(
        private readonly ShiftAssignmentEngine $shiftAssignmentEngine,
    ) {
    }

    /** @return array<mixed> */
    #[Route('/api/managers/gardes/assignShift', name: 'assignShift', methods: ['GET'])]
    public function assignShift(): array
    {
        $residents = [
            [
                'id' => 3,
                'lastname' => 'Resident 1',
                'firstname' => 'Frederic',
                'unavailableDays' => ['2023-03-01', '2023-03-08', '2023-03-03'],
            ],
            [
                'id' => 5,
                'lastname' => 'Resident 2',
                'firstname' => 'Martin',
                'unavailableDays' => ['2023-03-01', '2023-03-08', '2023-03-04'],
            ],
            [
                'id' => 4,
                'lastname' => 'Resident 3',
                'firstname' => 'Jacque',
                'unavailableDays' => ['2023-03-02', '2023-03-08', '2023-03-10'],
            ],
            [
                'id' => 2,
                'lastname' => 'Resident 4',
                'firstname' => 'Buno',
                'unavailableDays' => ['2023-04-02', '2023-04-08', '2023-04-10'],
            ],
            [
                'id' => 1,
                'lastname' => 'Resident 5',
                'firstname' => 'Marcel',
                'unavailableDays' => ['2023-04-07', '2023-04-045', '2023-04-21'],
            ],
        ];

        $startOfLegalInterval = '2023-03-01';
        $endOfLegalInterval   = '2023-06-31';

        $getWeekendDays = $this->shiftAssignmentEngine->assignWeekendDays($residents, $startOfLegalInterval, $endOfLegalInterval);
        $weekendDays    = $getWeekendDays['assignedDays'];
        $weekendPoints  = $getWeekendDays['nbOfShift'];

        $getWeekDays   = $this->shiftAssignmentEngine->assignWeekdayDays($residents, $startOfLegalInterval, $endOfLegalInterval);
        $weekDays      = $getWeekDays['assignedDays'];
        $weekdayPoints = $getWeekDays['nbOfShift'];

        $assignedShift = array_merge($weekendDays, $weekDays);

        $totalPoints = [];
        foreach ($weekendPoints as $id => $points) {
            $totalPoints[$id] = $points + $weekdayPoints[$id];
        }

        usort($assignedShift, fn ($a, $b) => strtotime($a['date']) - strtotime($b['date']));

        return $assignedShift;
    }
}
