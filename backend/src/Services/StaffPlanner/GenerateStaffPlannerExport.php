<?php

declare(strict_types=1);

namespace App\Services\StaffPlanner;

use App\Entity\YearsResident;
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
        private readonly FingerprintService $fingerprintService,
    ) {
    }

    /**
     * Generate a StaffPlanner-compatible TXT file for the given period IDs.
     * Legacy path — does NOT return capturedItems (no Phase 2 snapshot support).
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

        $yearIdMemory      = null;
        $hasDownloadAccess = false;
        $alerts            = [];

        foreach ($periodIds as $residentValidationId) {
            $period = $this->residentValidationRepository->findOneBy(['id' => $residentValidationId]);
            if ($period === null) {
                continue;
            }

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
            fwrite($handle, $this->buildLines($workerHRID, $sectionHRID, $data));
        }

        fclose($handle);

        return ['filePath' => $filePath, 'alerts' => $alerts];
    }

    /**
     * Generate a StaffPlanner-compatible TXT file from (yearResidentId, month, calendarYear) items.
     * Phase 2: returns capturedItems for immutable snapshot persistence.
     *
     * Does NOT require a ResidentValidation to exist — export independent of MDS validation.
     *
     * @param  list<array{yearResidentId: int, month: int, calendarYear: int}> $items
     * @return array{
     *   filePath: string,
     *   alerts: list<array{firstname: string, lastname: string}>,
     *   capturedItems: list<array{
     *     yearResidentId: int,
     *     month: int,
     *     calendarYear: int,
     *     yearsResident: YearsResident,
     *     payloadLines: string,
     *     timesheetCount: int,
     *     gardeHospitalCount: int,
     *     absenceCount: int,
     *     totalMinutes: int,
     *     dataFingerprint: string,
     *     workerHRIDAtExport: string|null,
     *     sectionHRIDAtExport: string|null,
     *   }>
     * }
     */
    public function generateFromItems(array $items): array
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

        $yearIdMemory   = null;
        $hasAccess      = false;
        $alerts         = [];
        $capturedItems  = [];

        foreach ($items as $item) {
            $yearsResident = $this->yearsResidentRepository->find($item['yearResidentId']);
            if ($yearsResident === null || !$yearsResident->getAllowed()) {
                continue;
            }

            $resident = $yearsResident->getResident();
            if ($resident === null) {
                continue;
            }

            $year = $yearsResident->getYear();
            if ($year === null) {
                continue;
            }

            if ($year->getId() !== $yearIdMemory) {
                $hasAccess    = $this->authorizationChecker->isGranted(YearAccessVoter::ADMIN, $year)
                             || $this->authorizationChecker->isGranted(YearAccessVoter::DATA_DOWNLOAD, $year);
                $yearIdMemory = $year->getId();
            }

            if (!$hasAccess) {
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

            $firstDay = (new \DateTime(sprintf('%04d-%02d-01', $item['calendarYear'], $item['month'])))->format('Y-m-01 00:00:00');
            $lastDay  = (new \DateTime($firstDay))->format('Y-m-t 23:59:59');

            $data  = $this->getDataByMonth->fetchData($resident, $firstDay, $lastDay);
            $lines = $this->buildLines($workerHRID, $sectionHRID, $data);

            // Write to the shared .txt file
            fwrite($handle, $lines);

            // Capture per-MACCS data for Phase 2 immutable snapshot
            $capturedItems[] = [
                'yearResidentId'     => $item['yearResidentId'],
                'month'              => $item['month'],
                'calendarYear'       => $item['calendarYear'],
                'yearsResident'      => $yearsResident,
                'payloadLines'       => $lines,
                'timesheetCount'     => count($data['timesheets'] ?? []),
                'gardeHospitalCount' => count(array_filter(
                    $data['gardes'] ?? [],
                    static fn(array $g): bool => ($g['type'] ?? '') === 'hospital'
                )),
                'absenceCount'       => count($data['absences'] ?? []),
                'totalMinutes'       => $this->computeTotalMinutes($data),
                'dataFingerprint'    => $this->fingerprintService->hashData($data),
                'workerHRIDAtExport' => $workerHRID,
                'sectionHRIDAtExport'=> $sectionHRID,
            ];
        }

        fclose($handle);

        return [
            'filePath'      => $filePath,
            'alerts'        => $alerts,
            'capturedItems' => $capturedItems,
        ];
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Builds the .txt lines for one MACCS.
     * Returns a string (not written to any handle) so it can be captured for snapshots.
     *
     * @param array<string, list<array<string, mixed>>> $data
     */
    public function buildLines(string $workerHRID, string $sectionHRID, array $data): string
    {
        $lines = '';

        foreach ($data['timesheets'] ?? [] as $shift) {
            $lines .= $this->buildShiftLine($workerHRID, $sectionHRID, $shift, 'activeShifts', (int) ($shift['pause'] * 60));
        }

        foreach ($data['gardes'] ?? [] as $shift) {
            if ($shift['type'] === 'hospital') {
                $lines .= $this->buildShiftLine($workerHRID, $sectionHRID, $shift, 'activeShifts', 0);
            }
            // callable garde: no line written (matches original behaviour)
        }

        foreach ($data['absences'] ?? [] as $shift) {
            $code = match ($shift['type']) {
                'sickLeave'   => 'ill',
                'annualLeave' => 'holidays',
                default       => 'abs',
            };
            $lines .= $this->buildShiftLine($workerHRID, $sectionHRID, $shift, $code, 0);
        }

        return $lines;
    }

    /** @param array<string, mixed> $shift */
    private function buildShiftLine(string $workerHRID, string $sectionHRID, array $shift, string $code, int $lunch): string
    {
        $date     = date('Y-m-d', strtotime((string) $shift['start']));
        $start    = strtotime((string) $shift['start']) - strtotime($date);
        $end      = strtotime((string) $shift['end']) - strtotime($date);
        $duration = $end - $start;

        return 'AS=|' . $workerHRID . '|' . $sectionHRID . '|' . $date . '|1|' . $code . '|' . $start . '|' . $end . '|' . $duration . '|' . $lunch . '||' . "\n";
    }

    /**
     * Computes total shift duration in minutes for snapshot metrics.
     * Includes timesheets and hospital gardes; excludes callable gardes and absences.
     *
     * @param array<string, list<array<string, mixed>>> $data
     */
    private function computeTotalMinutes(array $data): int
    {
        $total = 0;

        foreach ($data['timesheets'] ?? [] as $shift) {
            $total += (int) round((strtotime((string) $shift['end']) - strtotime((string) $shift['start'])) / 60);
        }

        foreach ($data['gardes'] ?? [] as $shift) {
            if (($shift['type'] ?? '') === 'hospital') {
                $total += (int) round((strtotime((string) $shift['end']) - strtotime((string) $shift['start'])) / 60);
            }
        }

        return $total;
    }
}
