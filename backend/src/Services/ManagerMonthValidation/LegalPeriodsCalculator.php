<?php

declare(strict_types=1);

namespace App\Services\ManagerMonthValidation;

use App\Entity\Years;
use App\Repository\YearsResidentRepository;
use DateTime;

class LegalPeriodsCalculator
{
    public function __construct(
        private readonly YearsResidentRepository $yearsResidentRepository,
    ) {
    }

    /**
     * Get Legal periods of the year for the resident
     *
     * Legal periods are intervals of 13 weeks starting from the first day of the year until the last day.
     * If the resident has a specific date of start for the year, this date will be used instead of the year's date of start.
     *
     * @param Years $year The year for which to get the legal periods
     * @param int $residentId The ID of the resident
     * @return array<string, array{start: string, end: string}> The legal periods of the year for the resident
     */
    public function getLegalPeriods(Years $year, int $residentId): array
    {
        $periods = [];
        $yearDateOfEnd = $year->getDateOfEnd();
        $dateOfStart = $year->getDateOfStart();

        // Check if resident has a specific date of start for the year
        $residentYear = $this->yearsResidentRepository->findOneBy(['year' => $year, 'resident' => $residentId]);
        if ($residentYear !== null && $residentYear->getDateOfStart() !== null) {
            $dateOfStart = $residentYear->getDateOfStart();
        }

        if ($dateOfStart === null) {
            throw new \RuntimeException('No date of start found for year');
        }

        if ($yearDateOfEnd === null) {
            throw new \RuntimeException('No date of end found for year');
        }

        // Get the day of the week for the date of start
        $dayOfWeek = $dateOfStart->format('N');

        // Initialize the first period. A period starts on a Monday.
        $start = date('Y-m-d 00:00:00', $dateOfStart->getTimestamp());
        if ($dayOfWeek !== '1') {
            $start = date('Y-m-d 00:00:00', strtotime('last monday', $dateOfStart->getTimestamp()));
        }

        $transit = (new DateTime($start . ' + 13 weeks'))->format('Y-m-d 23:59:59');
        $end = (new DateTime($transit . ' - 1 day'))->format('Y-m-d 23:59:59');
        $periods['Period 1'] = ['start' => $start, 'end' => $end];

        // Initialize the next periods
        for ($count = 2; $end < date('Y-m-d 23:59:59', $yearDateOfEnd->getTimestamp()); $count++) {
            $start = (new DateTime($end . ' + 1 day'))->format('Y-m-d 00:00:00');
            $transit = (new DateTime($start . ' + 13 weeks'))->format('Y-m-d 23:59:59');
            $end = (new DateTime($transit . ' - 1 day'))->format('Y-m-d 23:59:59');
            $periods['Period ' . $count] = ['start' => $start, 'end' => $end];
        }

        return $periods;
    }

    /**
     * Get the legal intervals that overlap with the given date boundaries
     *
     * @param array<string, array{start: string, end: string}> $legalIntervals The legal intervals for the resident
     * @param array<string, string> $dateBoundaries The date boundaries for the current month
     *
     * @return list<string> An array of legal interval names that overlap with the date boundaries
     */
    public function getOverlappingLegalIntervals(array $legalIntervals, array $dateBoundaries): array
    {
        $overlappingIntervals = [];

        foreach ($legalIntervals as $intervalName => $interval) {
            if (
                ($dateBoundaries['startOfMonth'] >= $interval['start'] && $dateBoundaries['startOfMonth'] <= $interval['end']) ||
                ($dateBoundaries['endOfMonth'] >= $interval['start'] && $dateBoundaries['endOfMonth'] <= $interval['end']) ||
                ($interval['start'] >= $dateBoundaries['startOfMonth'] && $interval['start'] <= $dateBoundaries['endOfMonth']) ||
                ($interval['end'] >= $dateBoundaries['startOfMonth'] && $interval['end'] <= $dateBoundaries['endOfMonth'])
            ) {
                $overlappingIntervals[] = $intervalName;
            }
        }

        return $overlappingIntervals;
    }
}
