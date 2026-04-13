<?php

declare(strict_types=1);

namespace App\Services\ManagerMonthValidation;

use App\Entity\PeriodValidation;
use App\Entity\Resident;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\PeriodValidationRepository;
use App\Repository\TimesheetRepository;
use App\Security\Voter\YearAccessVoter;
use App\Services\MonthValidation\ValidationService;
use App\Services\Utils\Tools;
use DateTime;
use InvalidArgumentException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class GetPeriodSummary
{
    public function __construct(
        private readonly PeriodValidationRepository $periodRepository,
        private readonly AuthorizationCheckerInterface $authorizationChecker,
        private readonly TimesheetRepository $timesheetsRepository,
        private readonly Tools $tools,
        private readonly GardeRepository $gardeRepository,
        private readonly AbsenceRepository $absenceRepository,
        private readonly ValidationService $validationService,
        private readonly LegalPeriodsCalculator $legalPeriodsCalculator,
        private readonly WeeklyHoursChecker $weeklyHoursChecker,
    ) {
    }

    /** @return list<array<string, mixed>> */
    public function getResidentSummary(int $periodId): array
    {
        $period = $this->validatePeriod($periodId);
        $currentYear = $this->getYearFromPeriod($period);
        $this->checkManagerRights($currentYear);

        $yearNb = $period->getYearNb();
        $month  = $period->getMonth();
        if ($yearNb === null || $month === null) {
            throw new \RuntimeException('Period has invalid year or month');
        }
        $dateBoundaries = $this->dateBoundaries($yearNb, $month);
        $residentsYear  = $currentYear->getResidents()->getValues();

        $summary          = [];
        $gardeOfThisMonth = [];

        foreach ($residentsYear as $resident) {
            $residentEntity = $resident->getResident();
            if ($residentEntity === null) {
                continue;
            }

            $residentSummary    = $this->getResidentInformation($resident);
            $legalIntervals     = $this->legalPeriodsCalculator->getLegalPeriods($currentYear, $residentSummary['residentId']);
            $overlappingPeriods = $this->legalPeriodsCalculator->getOverlappingLegalIntervals($legalIntervals, $dateBoundaries);

            $raw              = $this->collectResidentPeriodData($currentYear, $residentEntity, $residentSummary, $legalIntervals, $overlappingPeriods, $dateBoundaries);
            foreach ($raw['gardeEntries'] as $entry) {
                $gardeOfThisMonth[] = $entry;
            }

            $warningHours         = [];
            $illegalHours         = [];
            $errors               = [];
            $respectedSmoothedHours = true;

            foreach ($raw['periodData'] as $periodKey => $data) {
                $periodStart  = $data['start'];
                $periodEnd    = $data['end'];
                $hoursPerWeek = $data['hoursPerWeek'];

                $residentSummary['periodsinfo'][] = [
                    'periodStart' => $periodStart,
                    'periodEnd'   => $periodEnd,
                ];

                $weeklyHoursCheck   = $this->weeklyHoursChecker->checkWeeklyHours($hoursPerWeek, $residentSummary['limits']);
                $periodWarningHours = $weeklyHoursCheck['warningHours'];
                $periodIllegalHours = $weeklyHoursCheck['illegalHours'];
                $periodErrors       = $weeklyHoursCheck['errors'];

                $timeCheck = $this->weeklyHoursChecker->checkWeeklyHoursExceedLimit($periodWarningHours, $periodIllegalHours, $periodKey);
                if ($timeCheck) {
                    $periodErrors[] = $timeCheck;
                }

                if (count($hoursPerWeek)) {
                    $average = round(array_sum($hoursPerWeek) / count($hoursPerWeek), 1);
                    if ($average > $residentSummary['limits']['limit']) {
                        $respectedSmoothedHours = false;
                        $periodErrors[] = "Le lissage sur 13 semaines n'est pas respecté pour la période comprise entre le "
                            . (new DateTime($legalIntervals[$periodKey]['start']))->format('d-m-Y')
                            . ' et le '
                            . (new DateTime($legalIntervals[$periodKey]['end']))->format('d-m-Y') . '.';
                    } else {
                        $respectedSmoothedHours = true;
                    }
                }

                foreach ($periodWarningHours as $key => $value) {
                    $warningHours[$key] = $value;
                }
                foreach ($periodIllegalHours as $key => $value) {
                    $illegalHours[$key] = $value;
                }
                $errors = array_merge($errors, $periodErrors);
            }

            $absences    = $this->absenceRepository->ManagerfindByMonthAndResident($currentYear, $residentEntity, $dateBoundaries['startOfMonth'], $dateBoundaries['endOfMonth']);
            $absencePeriods = $this->tools->separateAbsenceByDay($absences);

            $residentSummary['daysOfLeaves']    = $this->countAbsenceDays($absencePeriods, $dateBoundaries);
            $residentSummary['hospital']         = $raw['hospitalGarde'];
            $residentSummary['callable']         = $raw['callableGarde'];
            $residentSummary['smoothedHours']    = $respectedSmoothedHours;
            $residentSummary['warningHours']     = $warningHours;
            $residentSummary['IllegalHours']     = $illegalHours;
            $residentSummary['errors']           = $errors;

            $summary[] = $residentSummary;
        }

        // Check for overlapping shifts (simple n² loop — string error messages)
        foreach ($gardeOfThisMonth as $key => $garde) {
            $start             = $garde['start'];
            $end               = $garde['end'];
            $residentId        = $garde['residentId'];
            $residentFirstname = $garde['residentFirstname'];
            $residentLastname  = $garde['residentLastname'];

            for ($i = $key + 1; $i < count($gardeOfThisMonth); $i++) {
                $checkStart             = $gardeOfThisMonth[$i]['start'];
                $checkEnd               = $gardeOfThisMonth[$i]['end'];
                $checkResidentId        = $gardeOfThisMonth[$i]['residentId'];
                $checkResidentFirstname = $gardeOfThisMonth[$i]['residentFirstname'];
                $checkResidentLastname  = $gardeOfThisMonth[$i]['residentLastname'];

                if ($start < $checkEnd && $end > $checkStart) {
                    foreach ($summary as &$residentSummary) {
                        if ($residentSummary['residentId'] === $residentId) {
                            $residentSummary['shiftErrors'][] = "Une garde chevauche celle du Dr $checkResidentFirstname $checkResidentLastname pour la date du " . date('d-m-Y', strtotime($start)) . '.';
                        }
                        if ($residentSummary['residentId'] === $checkResidentId) {
                            $residentSummary['shiftErrors'][] = "Une garde chevauche celle du Dr $residentFirstname $residentLastname pour la date du " . date('d-m-Y', strtotime($start)) . '.';
                        }
                    }
                }
            }
        }

        return $summary;
    }

    /** @return list<array<string, mixed>> */
    public function generateResidentPeriodData(int $periodId): array
    {
        $period = $this->validatePeriod($periodId);
        $currentYear = $this->getYearFromPeriod($period);
        $this->checkManagerRights($currentYear);

        $yearNb = $period->getYearNb();
        $month  = $period->getMonth();
        if ($yearNb === null || $month === null) {
            throw new \RuntimeException('Period has invalid year or month');
        }
        $dateBoundaries = $this->dateBoundaries($yearNb, $month);
        $residentsYear  = $currentYear->getResidents()->getValues();

        $summary          = [];
        $gardeOfThisMonth = [];

        foreach ($residentsYear as $resident) {
            $residentEntity = $resident->getResident();
            if ($residentEntity === null) {
                continue;
            }

            $residentSummary    = $this->getResidentInformation($resident);
            $legalIntervals     = $this->legalPeriodsCalculator->getLegalPeriods($currentYear, $residentSummary['residentId']);
            $overlappingPeriods = $this->legalPeriodsCalculator->getOverlappingLegalIntervals($legalIntervals, $dateBoundaries);

            $raw = $this->collectResidentPeriodData($currentYear, $residentEntity, $residentSummary, $legalIntervals, $overlappingPeriods, $dateBoundaries);
            foreach ($raw['gardeEntries'] as $entry) {
                $gardeOfThisMonth[] = $entry;
            }

            $warningHours           = [];
            $illegalHours           = [];
            $errors                 = [];
            $respectedSmoothedHours = true;

            foreach ($raw['periodData'] as $periodKey => $data) {
                $periodStart  = $data['start'];
                $periodEnd    = $data['end'];
                $hoursPerWeek = $data['hoursPerWeek'];

                preg_match('/Period (\d+)/', $periodKey, $matches);
                $residentSummary['periodsinfo'][] = [
                    'period'       => $periodKey,
                    'periodNumber' => $matches[1] ?? '0',
                    'periodStart'  => $periodStart,
                    'periodEnd'    => $periodEnd,
                ];

                $weeklyHoursCheck   = $this->weeklyHoursChecker->checkWeeklyHoursImproved($hoursPerWeek, $residentSummary['limits'], $periodStart, $periodEnd);
                $periodWarningHours = $weeklyHoursCheck['warningHours'];
                $periodIllegalHours = $weeklyHoursCheck['illegalHours'];
                $periodWarnings     = $weeklyHoursCheck['warnings'];

                $timeCheck = $this->weeklyHoursChecker->checkWeeklyHoursExceedLimitImproved($periodWarningHours, $periodIllegalHours, $periodKey, $periodStart, $periodEnd);
                if ($timeCheck) {
                    $periodWarnings = array_merge($periodWarnings, $timeCheck);
                }

                if (count($hoursPerWeek)) {
                    $average = round(array_sum($hoursPerWeek) / count($hoursPerWeek), 1);
                    if ($average > $residentSummary['limits']['limit']) {
                        $respectedSmoothedHours = false;
                        $periodWarnings[] = [
                            'warningType' => 'smoothing',
                            'descitpion'  => 'The average number of hours per week over 13 weeks exceeds the equal time limit.',
                            'period'      => $periodKey,
                            'periodNb'    => $matches[1] ?? '0',
                            'periodStart' => (new DateTime($legalIntervals[$periodKey]['start']))->format('d-m-Y'),
                            'periodEnd'   => (new DateTime($legalIntervals[$periodKey]['end']))->format('d-m-Y'),
                        ];
                    } else {
                        $respectedSmoothedHours = true;
                    }
                }

                foreach ($periodWarningHours as $key => $value) {
                    $warningHours[$key] = $value;
                }
                foreach ($periodIllegalHours as $key => $value) {
                    $illegalHours[$key] = $value;
                }
                $errors = array_merge($errors, $periodWarnings);
            }

            $absences       = $this->absenceRepository->ManagerfindByMonthAndResident($currentYear, $residentEntity, $dateBoundaries['startOfMonth'], $dateBoundaries['endOfMonth']);
            $absencePeriods = $this->tools->separateAbsenceByDay($absences);

            $filteredAbsences = array_values(array_filter(
                $absencePeriods,
                fn ($absence) => $this->tools->checkIfDateIsInCurrentMonth($absence['start'], $dateBoundaries['startOfMonth'], $dateBoundaries['endOfMonth'])
            ));

            $residentValidation = $this->validationService->getOrCreateResidentValidation($periodId, $residentEntity);

            $residentSummary['daysOfLeaves']       = $this->countAbsencesByType($filteredAbsences);
            $residentSummary['hospital']            = $raw['hospitalGarde'];
            $residentSummary['callable']            = $raw['callableGarde'];
            $residentSummary['smoothedHours']       = $respectedSmoothedHours;
            $residentSummary['warningHours']        = $warningHours;
            $residentSummary['IllegalHours']        = $illegalHours;
            $residentSummary['warnings']            = $errors;
            $residentSummary['shiftOverlap']        = [];
            $residentSummary['validationInformation'] = [
                'validated'         => (bool) $residentValidation->getValidated(),
                'validatedBy'       => $residentValidation->getValidatedBy(),
                'validationHistory' => $residentValidation->getValidationHistory(),
            ];

            $summary[] = $residentSummary;
        }

        // Check for overlapping shifts (per-resident comparison with overlap duration)
        foreach ($residentsYear as $resident) {
            $residentInformation = $this->getResidentInformation($resident);
            $residentId          = $residentInformation['residentId'];

            $gardeExcludeCurrent = array_filter($gardeOfThisMonth, fn ($g) => $g['residentId'] != $residentId);
            $gardeIncludeCurrent = array_filter($gardeOfThisMonth, fn ($g) => $g['residentId'] == $residentId);

            foreach ($gardeIncludeCurrent as $currentShift) {
                foreach ($gardeExcludeCurrent as $otherShift) {
                    $startCurrent = $currentShift['start'];
                    $endCurrent   = $currentShift['end'];
                    $startOther   = $otherShift['start'];
                    $endOther     = $otherShift['end'];

                    if (($startCurrent < $endOther && $endCurrent > $startOther) || ($startCurrent >= $startOther && $endCurrent <= $endOther)) {
                        $overlapStart = new DateTime(max($startCurrent, $startOther));
                        $overlapEnd   = new DateTime(min($endCurrent, $endOther));

                        if ($overlapEnd->format('H:i:s') === '23:59:59') {
                            $overlapEnd->modify('+1 second');
                            $interval          = $overlapEnd->diff($overlapStart);
                            $totalOverlapHours = $interval->days * 24 + $interval->h + ($interval->i / 60) + ($interval->s / 3600);
                        } else {
                            $interval          = $overlapEnd->diff($overlapStart);
                            $totalOverlapHours = $interval->days * 24 + $interval->h + ($interval->i / 60);
                        }

                        foreach ($summary as &$sum) {
                            if ($sum['residentId'] == $residentId) {
                                $sum['shiftOverlap'][] = [
                                    'type'                    => 'gardeOverlapping',
                                    'conflictResidentId'      => $otherShift['residentId'],
                                    'conflictResidentFirstname' => $otherShift['residentFirstname'],
                                    'conflictResidentLastname'  => $otherShift['residentLastname'],
                                    'overlapStart'            => $overlapStart->format('d-m-Y H:i:s'),
                                    'overlapEnd'              => $overlapEnd->format('d-m-Y H:i:s'),
                                    'totalOverlapHours'       => $totalOverlapHours,
                                ];
                                break;
                            }
                        }
                    }
                }
            }
        }

        return $summary;
    }

    /**
     * Fetches and computes the data common to both public methods for a single resident
     * across all overlapping legal periods.
     *
     * @param array<string, array{start: string, end: string}> $legalIntervals
     * @param list<string>                                      $overlappingPeriods
     * @param array<string, string>                             $dateBoundaries
     * @param array<string, mixed>                              $residentSummary  (needs residentId/firstname/lastname)
     * @return array{
     *     gardeEntries:  list<array<string, mixed>>,
     *     hospitalGarde: int,
     *     callableGarde: int,
     *     periodData:    array<string, array{start: string, end: string, hoursPerWeek: array<int, float|int>}>
     * }
     */
    private function collectResidentPeriodData(
        Years $currentYear,
        Resident $residentEntity,
        array $residentSummary,
        array $legalIntervals,
        array $overlappingPeriods,
        array $dateBoundaries,
    ): array {
        $gardeEntries  = [];
        $hospitalGarde = 0;
        $callableGarde = 0;
        $periodData    = [];

        foreach ($overlappingPeriods as $periodKey) {
            $periodStart = $legalIntervals[$periodKey]['start'];
            $periodEnd   = $legalIntervals[$periodKey]['end'];

            $timesheets = $this->timesheetsRepository->ManagerfindByMonthAndResident($currentYear, $residentEntity, $periodStart, $periodEnd);
            $gardes     = $this->gardeRepository->ManagerfindByMonthAndResident($currentYear, $residentEntity, $periodStart, $periodEnd);
            $absences   = $this->absenceRepository->ManagerfindByMonthAndResident($currentYear, $residentEntity, $periodStart, $periodEnd);

            $timesheetPeriods = $this->tools->separateTimesheetsByDay($timesheets);
            $gardesPeriods    = $this->tools->separateGardeByDay($gardes);
            $absencePeriods   = $this->tools->separateAbsenceByDay($absences);

            // Count garde types within the current calendar month
            $filteredGardes = array_filter($gardes, function ($garde) use ($dateBoundaries) {
                $start = $garde['dateOfStart']->format('Y-m-d H:i:s');
                return $start >= $dateBoundaries['startOfMonth'] && $start <= $dateBoundaries['endOfMonth'];
            });
            $gardeTypeCount = $this->countGardeTypes(array_values($filteredGardes));
            $hospitalGarde += $gardeTypeCount['hospital'];
            $callableGarde += $gardeTypeCount['callable'];

            // Collect garde periods for later overlap detection
            $filteredGardesPeriods = array_filter(
                $gardesPeriods,
                fn ($g) => $g['start'] >= $dateBoundaries['startOfMonth'] && $g['start'] <= $dateBoundaries['endOfMonth']
            );
            foreach ($filteredGardesPeriods as $garde) {
                $garde['residentId']        = $residentSummary['residentId'];
                $garde['residentFirstname'] = $residentSummary['residentFirstname'];
                $garde['residentLastname']  = $residentSummary['residentLastname'];
                $gardeEntries[]             = $garde;
            }

            $periodData[$periodKey] = [
                'start'        => $periodStart,
                'end'          => $periodEnd,
                'hoursPerWeek' => $this->weeklyHoursChecker->hoursCounter($timesheetPeriods, $gardesPeriods, $absencePeriods, $periodStart, $periodEnd),
            ];
        }

        return [
            'gardeEntries'  => $gardeEntries,
            'hospitalGarde' => $hospitalGarde,
            'callableGarde' => $callableGarde,
            'periodData'    => $periodData,
        ];
    }

    private function validatePeriod(int $periodId): PeriodValidation
    {
        $period = $this->periodRepository->findOneBy(['id' => $periodId]);
        if ($period === null) {
            throw new NotFoundHttpException('Période introuvable.');
        }
        return $period;
    }

    private function getYearFromPeriod(PeriodValidation $period): Years
    {
        $year = $period->getYear();
        if ($year === null) {
            throw new \RuntimeException('Period has no associated year');
        }
        return $year;
    }

    private function checkManagerRights(Years $years): void
    {
        if (! $this->authorizationChecker->isGranted(YearAccessVoter::DATA_ACCESS, $years)) {
            throw new AccessDeniedException("Vous n'avez pas les droits requis");
        }
    }

    /** @return array<string, mixed> */
    private function getResidentInformation(YearsResident $yearsResident): array
    {
        $resident = $yearsResident->getResident();
        if ($resident === null) {
            throw new \RuntimeException('YearsResident has no associated Resident');
        }
        return [
            'residentId'        => $resident->getId(),
            'residentFirstname' => $resident->getFirstname(),
            'residentLastname'  => $resident->getLastname(),
            'optingOut'         => $yearsResident->getOptingOut() ?? false,
            'limits'            => [
                false => ['limit' => 48, 'highLimit' => 60],
                true  => ['limit' => 60, 'highLimit' => 72],
            ][$yearsResident->getOptingOut() ?? false],
        ];
    }

    /**
     * Determine the date boundaries for a given month.
     *
     * @throws InvalidArgumentException If the year or month are invalid
     * @return array<string, string>
     */
    private function dateBoundaries(int $year, int $month): array
    {
        if ($year <= 0 || $month < 1 || $month > 12) {
            throw new InvalidArgumentException('Invalid year or month.');
        }

        $startOfMonth = (new \DateTime("$year-$month-01 00:00:00"))->format('Y-m-d 00:00:00');
        $endOfMonth   = (new \DateTime("$year-$month-01"))->format('Y-m-t 23:59:59');

        $startDate        = new \DateTime($startOfMonth);
        $endDate          = new \DateTime($endOfMonth);
        $startOfFirstWeek = clone $startDate->modify('Monday this week');
        $endOfLastWeek    = clone $endDate->modify('next Monday');
        $lastDayOfLastWeek = clone $endOfLastWeek->modify('-1 day');

        return [
            'startOfMonth'    => $startOfMonth,
            'endOfMonth'      => $endOfMonth,
            'startOfFirstWeek' => $startOfFirstWeek->format('Y-m-d 00:00:00'),
            'endOfLastWeek'   => $lastDayOfLastWeek->format('Y-m-d 23:59:59'),
        ];
    }

    /**
     * Count the number of absence days within the month boundaries.
     *
     * @param list<array<string, mixed>> $absencePeriods
     * @param array<string, mixed>       $dateBoundaries
     */
    private function countAbsenceDays(array $absencePeriods, array $dateBoundaries): int
    {
        $startOfMonth = strtotime(date('Y-m-d', strtotime($dateBoundaries['startOfMonth'])));
        $endOfMonth   = strtotime(date('Y-m-d', strtotime($dateBoundaries['endOfMonth'])));
        $daysAbsent   = 0;

        foreach ($absencePeriods as $absence) {
            $start = strtotime(date('Y-m-d', strtotime($absence['start'])));
            if ($start >= $startOfMonth && $start <= $endOfMonth) {
                $daysAbsent++;
            }
        }

        return $daysAbsent;
    }

    /**
     * @param list<array<string, mixed>> $filteredGardes
     * @return array<string, int>
     */
    private function countGardeTypes(array $filteredGardes): array
    {
        $count = ['callable' => 0, 'hospital' => 0];
        foreach ($filteredGardes as $garde) {
            if ($garde['type'] === 'callable') {
                $count['callable']++;
            } elseif ($garde['type'] === 'hospital') {
                $count['hospital']++;
            }
        }
        return $count;
    }

    /**
     * Count the number of absences per type. Holiday-flagged days are reported as 'paidLeave'.
     *
     * @param list<array<string, mixed>> $absencePeriods
     * @return array<string, int>
     */
    public function countAbsencesByType(array $absencePeriods): array
    {
        $counts = [];

        foreach ($absencePeriods as $absence) {
            $type = $this->tools->isHoliday(strtotime($absence['start']));

            if ($type == 3) {
                $type = 'paidLeave';
            } else {
                $type = $absence['type'];
                // Correct erroneous paidLeave declarations on non-holiday days
                if ($type === 'paidLeave') {
                    $type = 'annualLeave';
                }
            }

            $counts[$type] = ($counts[$type] ?? 0) + 1;
        }

        return $counts;
    }
}
