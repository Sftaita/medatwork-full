<?php

declare(strict_types=1);

namespace App\Services\YearsManagement;

use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Repository\ManagerRepository;
use App\Repository\ManagerYearsRepository;
use App\Repository\YearsRepository;
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
        private YearsRepository $yearsRepo,
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
            $masterId = $year['masterId'] ?? null;
            $yearManager = $masterId !== null ? $this->managerRepo->findOneBy(['id' => $masterId]) : null;

            $yearInfo = [
                'title'           => $year['title'],
                'masterFirstname' => $yearManager?->getFirstname(),
                'masterLastname'  => $yearManager?->getLastname(),
                'dateOfStart'     => $year['dateOfStart']->format('Y-m-d'),
                'dateOfEnd'       => $year['dateOfEnd']->format('Y-m-d'),
                'createdAt'       => $year['createdAt']->format('Y-m-d'),
                'location'        => $year['location'],
                'owner'           => $year['owner'],
            ];

            $authorization = [
                'dataAccess'     => $year['dataAccess'],
                'dataValidation' => $year['dataValidation'],
                'dataDownload'   => $year['dataDownload'],
                'admin'          => $year['admin'],
            ];

            $results['yearsSummary'][] = $this->buildYearEntry(
                $year['id'],
                $yearInfo,
                $authorization,
                $results['assignements'],
            );
        }

        return $results;
    }

    /**
     * Builds the full years/intervals/week-templates summary for a HospitalAdmin.
     * Returns ALL active years for their hospital with full authorization.
     *
     * @return array<string, mixed>
     */
    public function buildForHospitalAdmin(HospitalAdmin $admin): array
    {
        $years   = $this->yearsRepo->findActiveYearsByHospital($admin->getHospital());
        $results = ['yearsSummary' => [], 'assignements' => []];

        foreach ($years as $year) {
            $masterId    = $year->getMaster();
            $yearManager = $masterId !== null ? $this->managerRepo->findOneBy(['id' => $masterId]) : null;

            $dateOfStart = $year->getDateOfStart();
            $dateOfEnd   = $year->getDateOfEnd();
            $createdAt   = $year->getCreatedAt();

            $yearInfo = [
                'title'           => $year->getTitle(),
                'masterFirstname' => $yearManager?->getFirstname(),
                'masterLastname'  => $yearManager?->getLastname(),
                'dateOfStart'     => $dateOfStart?->format('Y-m-d'),
                'dateOfEnd'       => $dateOfEnd?->format('Y-m-d'),
                'createdAt'       => $createdAt?->format('Y-m-d'),
                'location'        => $year->getLocation(),
                'owner'           => true,
            ];

            $authorization = [
                'dataAccess'     => true,
                'dataValidation' => true,
                'dataDownload'   => true,
                'admin'          => true,
            ];

            $results['yearsSummary'][] = $this->buildYearEntry(
                $year->getId(),
                $yearInfo,
                $authorization,
                $results['assignements'],
            );
        }

        return $results;
    }

    // ─── private helpers ─────────────────────────────────────────────────────

    /**
     * Builds a single year summary entry and appends its assignment data to $assignements.
     *
     * @param array<string, mixed>             $yearInfo
     * @param array<string, mixed>             $authorization
     * @param array<int, array<string, mixed>> $assignements
     * @return array<string, mixed>
     */
    private function buildYearEntry(
        int $yearId,
        array $yearInfo,
        array $authorization,
        array &$assignements,
    ): array {
        $residentsForYear    = $this->yearResidentRepo->findYearAllowedResidents($yearId);
        $weekIntervalsForYear = $this->buildWeekIntervals($yearId);
        $yearWeekTemplates   = $this->buildWeekTemplates($yearId, $assignements);

        return [
            'yearId'            => $yearId,
            'yearInfo'          => $yearInfo,
            'yearWeekTemplates' => $yearWeekTemplates,
            'authorization'     => $authorization,
            'residents'         => $residentsForYear,
            'weekIntervals'     => $weekIntervalsForYear,
        ];
    }

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
     *
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
