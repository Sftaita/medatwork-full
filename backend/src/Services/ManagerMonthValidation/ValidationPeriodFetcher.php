<?php

declare(strict_types=1);

namespace App\Services\ManagerMonthValidation;

use App\Entity\Manager;
use App\Entity\Years;
use App\Repository\ManagerRepository;
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
        private ManagerRepository $managerRepository,
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
        $managerEntity = $this->managerRepository->findOneBy(['id' => $manager]);

        if ($managerEntity === null) {
            return [];
        }

        $managerYearRelation = $managerEntity->getManagerYears()->getValues();
        $today               = date('Y-m-d');
        $raw                 = [];

        foreach ($managerYearRelation as $m) {
            $year = $m->getYears();

            if ($year === null) {
                continue;
            }

            $masterId = $year->getMaster();

            if ($masterId !== null) {
                $master          = $this->managerRepository->findOneBy(['id' => $masterId]);
                $masterFirstname = $master?->getFirstname();
                $masterLastname  = $master?->getLastname();
            } else {
                $masterFirstname = null;
                $masterLastname  = null;
            }

            $periods = $this->fetchPeriods($year, $today, $activeYearOnly, $type);

            foreach ($periods as $period) {
                $period['masterFirstname'] = $masterFirstname;
                $period['masterLastname']  = $masterLastname;
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
