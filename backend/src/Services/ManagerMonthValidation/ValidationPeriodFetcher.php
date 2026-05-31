<?php

declare(strict_types=1);

namespace App\Services\ManagerMonthValidation;

use App\Entity\Manager;
use App\Entity\Years;
use App\Repository\PeriodValidationRepository;

/**
 * Fetches validation periods (in-waiting or validated) for all years
 * managed by a given manager, filtering to past months only.
 *
 * Extracted from the duplicated inWaintingList() / ValidatedList() methods
 * in MonthValidationController.
 */
class ValidationPeriodFetcher
{
    public function __construct(
        private PeriodValidationRepository $periodValidationRepository,
    ) {
    }

    /**
     * Fetch periods across all years for a manager.
     *
     * @param bool   $activeYearOnly   true = only active years, false = all years
     * @param string $type             'waiting' | 'validated'
     *
     * @return list<array<string, mixed>> Periods whose last day of month is ≤ today
     */
    public function fetchForManager(Manager $manager, bool $activeYearOnly, string $type): array
    {
        $managerYearRelation = $manager->getManagerYears()->getValues();
        $today               = date('Y-m-d');
        $raw                 = [];

        foreach ($managerYearRelation as $m) {
            $year = $m->getYears();

            if ($year === null) {
                continue;
            }

            $supervisor                  = $year->getTrainingSupervisor();
            $trainingSupervisorFirstname = $supervisor?->getFirstname();
            $trainingSupervisorLastname  = $supervisor?->getLastname();

            $periods = $this->fetchPeriods($year, $today, $activeYearOnly, $type);

            foreach ($periods as $period) {
                $period['trainingSupervisorFirstname'] = $trainingSupervisorFirstname;
                $period['trainingSupervisorLastname']  = $trainingSupervisorLastname;
                $raw[]                     = $period;
            }
        }

        return $this->filterPastMonths($raw, $today);
    }

    /** @return list<array<string, mixed>> */
    private function fetchPeriods(Years $year, string $today, bool $activeYearOnly, string $type): array
    {
        if ($type === 'waiting') {
            return $activeYearOnly
                ? $this->periodValidationRepository->fetchInWaitingPeriodForActiveYear($year, $today)
                : $this->periodValidationRepository->fetchInWaitingPeriod($year);
        }

        return $activeYearOnly
            ? $this->periodValidationRepository->fetchValidatedPeriodForActiveYear($year, $today)
            : $this->periodValidationRepository->fetchValidatedPeriod($year);
    }

    /**
     * @param list<array<string, mixed>> $periods
     * @return list<array<string, mixed>>
     */
    private function filterPastMonths(array $periods, string $today): array
    {
        return array_values(array_filter($periods, function (array $period) use ($today): bool {
            $lastDay = (new \DateTime($period['year'] . '-' . $period['month'] . '-01'))->modify('last day of this month')->format('Y-m-d');

            return $lastDay <= $today;
        }));
    }
}
