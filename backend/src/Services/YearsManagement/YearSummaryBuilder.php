<?php

declare(strict_types=1);

namespace App\Services\YearsManagement;

use App\Entity\Manager;
use App\Repository\ManagerRepository;
use App\Repository\ManagerYearsRepository;
use App\Repository\YearsResidentRepository;
use App\Repository\YearsWeekIntervalsRepository;
use App\Repository\YearsWeekTemplatesRepository;

class YearSummaryBuilder
{
    public function __construct(
        private ManagerYearsRepository $managerYearRepo,
        private ManagerRepository $managerRepo,
        private YearsResidentRepository $yearResidentRepo,
        private YearsWeekIntervalsRepository $weekIntervalsRepo,
        private YearsWeekTemplatesRepository $weekTemplateRepo,
    ) {
    }

    /**
     * Builds the full years/intervals/week-templates summary for the given manager.
     *
     * @return array<string, mixed>
     */
    public function buildForManager(Manager $manager): array
    {
        $years   = $this->managerYearRepo->findActiveManagerYearsList($manager);
        $results = ['yearsSummary' => [], 'assignements' => []];

        foreach ($years as $year) {
            $residentsForYear    = $this->yearResidentRepo->findYearAllowedResidents($year['id']);
            $weekIntervalsForYear = $this->buildWeekIntervals($year['id']);
            $yearWeekTemplates   = $this->buildWeekTemplates($year['id'], $results['assignements']);

            $yearManager     = $this->managerRepo->findOneBy(['id' => $year['masterId']]);
            $managerFirstname = $yearManager?->getFirstname();
            $managerLastname  = $yearManager?->getLastname();

            $yearInfo = [
                'title'           => $year['title'],
                'masterFirstname' => $managerFirstname,
                'masterLastname'  => $managerLastname,
                'dateOfStart'     => $year['dateOfStart']->format('Y-m-d'),
                'dateOfEnd'       => $year['dateOfEnd']->format('Y-m-d'),
                'createdAt'       => $year['createdAt']->format('Y-m-d'),
                'location'        => $year['location'],
                'owner'           => $year['owner'],
            ];

            $authorizationForYear = [
                'dataAccess'      => $year['dataAccess'],
                'dataValidation'  => $year['dataValidation'],
                'dataDownload'    => $year['dataDownload'],
                'admin'           => $year['admin'],
            ];

            $results['yearsSummary'][] = [
                'yearId'           => $year['id'],
                'yearInfo'         => $yearInfo,
                'yearWeekTemplates' => $yearWeekTemplates,
                'authorization'    => $authorizationForYear,
                'residents'        => $residentsForYear,
                'weekIntervals'    => $weekIntervalsForYear,
            ];
        }

        return $results;
    }

    // ─── private helpers ─────────────────────────────────────────────────────

    /** @return list<array<string, mixed>> */
    private function buildWeekIntervals(int $yearId): array
    {
        $intervals = [];
        foreach ($this->weekIntervalsRepo->findBy(['year' => $yearId]) as $wi) {
            if ($wi->getDeleted()) {
                continue;
            }
            $wiStart = $wi->getDateOfStart();
            $wiEnd   = $wi->getDateOfEnd();
            $intervals[] = [
                'weekIntervalId' => $wi->getId(),
                'dateOfStart'    => $wiStart !== null ? $wiStart->format('Y-m-d') : null,
                'dateOfEnd'      => $wiEnd !== null ? $wiEnd->format('Y-m-d') : null,
                'weekNumber'     => $wi->getWeekNumber(),
                'monthNumber'    => $wi->getMonthNumber(),
                'yearNumber'     => $wi->getYearNumber(),
            ];
        }

        return $intervals;
    }

    /**
     * Builds week template list and appends resident schedule assignements to $assignements by reference.
     */
    /**
     * @param array<int, array<string, mixed>> $assignements
     * @return list<array<string, mixed>>
     */
    private function buildWeekTemplates(int $yearId, array &$assignements): array
    {
        $templates = [];
        foreach ($this->weekTemplateRepo->findBy(['year' => $yearId]) as $ywt) {
            $wt = $ywt->getWeekTemplate();
            if ($wt === null) {
                continue;
            }
            $ywtYear = $ywt->getYear();
            if ($ywtYear === null) {
                continue;
            }
            $templates[] = [
                'yearWeekTemplateId' => $ywt->getId(),
                'yearId'             => $ywtYear->getId(),
                'weekTemplateId'     => $wt->getId(),
                'title'              => $wt->getTitle(),
                'description'        => $wt->getDescription(),
                'color'              => $wt->getColor(),
            ];

            foreach ($ywt->getResidentWeeklySchedules()->getValues() as $schedule) {
                $scheduleResident = $schedule->getResident();
                if ($scheduleResident === null) {
                    continue;
                }
                $assignements[] = [
                    'yearWeekTemplateId' => $ywt->getId(),
                    'yearId'             => $ywtYear->getId(),
                    'weekTemplateId'     => $wt->getId(),
                    'yearsWeekIntervals' => $schedule->getYearsWeekIntervals()->getId(),
                    'title'              => $wt->getTitle(),
                    'residentId'         => $scheduleResident->getId(),
                    'residentFirstname'  => $scheduleResident->getFirstname(),
                    'residentLastname'   => $scheduleResident->getLastname(),
                ];
            }
        }

        return $templates;
    }
}
