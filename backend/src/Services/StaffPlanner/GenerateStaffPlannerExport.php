<?php

declare(strict_types=1);

namespace App\Services\StaffPlanner;

use App\Repository\ResidentValidationRepository;
use App\Repository\YearsResidentRepository;
use App\Security\Voter\YearAccessVoter;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

class GenerateStaffPlannerExport
{
    public function __construct(
        private readonly ResidentValidationRepository $residentValidationRepository,
        private readonly YearsResidentRepository $yearsResidentRepository,
        private readonly AuthorizationCheckerInterface $authorizationChecker,
        private readonly GetDataByMonth $getDataByMonth,
    ) {
    }

    /**
     * Generate a StaffPlanner-compatible TXT file for the given period IDs.
     *
     * @param  list<int>                                                   $periodIds
     * @return array{filePath: string, alerts: list<array{firstname: string, lastname: string}>}
     */
    public function generate(array $periodIds): array
    {
        $filePath = tempnam(sys_get_temp_dir(), 'horaire_');
        if ($filePath === false) {
            throw new \RuntimeException('Unable to create temp file.');
        }

        $handle = fopen($filePath, 'w');
        if ($handle === false) {
            throw new \RuntimeException('Unable to open temp file for writing.');
        }

        fwrite($handle, 'SEPARATOR=|' . "\n");

        $yearIdMemory     = null;
        $hasDownloadAccess = false;
        $alerts            = [];

        foreach ($periodIds as $residentValidationId) {
            $period = $this->residentValidationRepository->findOneBy(['id' => $residentValidationId]);
            if ($period === null) {
                continue;
            }

            // Cache the access check: if the year hasn't changed, reuse the last result.
            $year = $period->getPeriodValidation()->getYear();
            if ($year->getId() !== $yearIdMemory) {
                $hasDownloadAccess = $this->authorizationChecker->isGranted(YearAccessVoter::DATA_DOWNLOAD, $year);
                $yearIdMemory      = $year->getId();
            }

            if (! $hasDownloadAccess) {
                continue;
            }

            $yearNb   = $period->getPeriodValidation()->getYearNb();
            $monthNb  = $period->getPeriodValidation()->getMonth();
            $firstDay = (new \DateTime($yearNb . '-' . $monthNb . '-01'))->format('Y-m-01 00:00:00');
            $lastDay  = (new \DateTime($firstDay))->format('Y-m-t 23:59:59');

            $resident      = $period->getResident();
            $yearsResident = $this->yearsResidentRepository->findOneBy([
                'resident' => $resident,
                'year'     => $year,
            ]);

            if ($yearsResident === null) {
                continue;
            }

            $staffPlannerResource = $yearsResident->getStaffPlannerResources();
            if ($staffPlannerResource === null) {
                continue;
            }

            $workerHRID  = $staffPlannerResource->getWorkerHRID();
            $sectionHRID = $staffPlannerResource->getSectionHRID();

            if ($workerHRID === null || $sectionHRID === null) {
                $alerts[] = ['firstname' => $resident->getFirstname(), 'lastname' => $resident->getLastname()];
                continue;
            }

            $data = $this->getDataByMonth->fetchData($resident, $firstDay, $lastDay);
            $this->writeEntries($handle, $workerHRID, $sectionHRID, $data);
        }

        fclose($handle);

        return ['filePath' => $filePath, 'alerts' => $alerts];
    }

    /**
     * @param  resource                                  $handle
     * @param  array<string, list<array<string, mixed>>> $data
     */
    private function writeEntries($handle, string $workerHRID, string $sectionHRID, array $data): void
    {
        foreach ($data['timesheets'] ?? [] as $shift) {
            $this->writeShiftLine($handle, $workerHRID, $sectionHRID, $shift, 'activeShifts', (int) ($shift['pause'] * 60));
        }

        foreach ($data['gardes'] ?? [] as $shift) {
            if ($shift['type'] === 'hospital') {
                $this->writeShiftLine($handle, $workerHRID, $sectionHRID, $shift, 'activeShifts', 0);
            }
            // callable garde: no line written (matches original behaviour)
        }

        foreach ($data['absences'] ?? [] as $shift) {
            $code = match ($shift['type']) {
                'sickLeave'   => 'ill',
                'annualLeave' => 'holidays',
                default       => 'abs',
            };
            $this->writeShiftLine($handle, $workerHRID, $sectionHRID, $shift, $code, 0);
        }
    }

    /**
     * @param resource             $handle
     * @param array<string, mixed> $shift
     */
    private function writeShiftLine($handle, string $workerHRID, string $sectionHRID, array $shift, string $code, int $lunch): void
    {
        $date     = date('Y-m-d', strtotime((string) $shift['start']));
        $start    = strtotime((string) $shift['start']) - strtotime($date);
        $end      = strtotime((string) $shift['end']) - strtotime($date);
        $duration = $end - $start;

        fwrite(
            $handle,
            'AS=|' . $workerHRID . '|' . $sectionHRID . '|' . $date . '|1|' . $code . '|' . $start . '|' . $end . '|' . $duration . '|' . $lunch . '||' . "\n"
        );
    }
}
