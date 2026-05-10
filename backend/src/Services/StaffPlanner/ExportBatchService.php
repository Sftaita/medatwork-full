<?php

declare(strict_types=1);

namespace App\Services\StaffPlanner;

use App\Entity\AppAdmin;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\StaffPlannerExportBatch;
use App\Entity\StaffPlannerExportItemSnapshot;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\ResidentValidationRepository;
use App\Repository\StaffPlannerExportBatchRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Creates immutable export batch records after a successful Staff Planner generation.
 *
 * Flow (called from StaffPlannerAPIController):
 *  1. recordBatch() — creates StaffPlannerExportBatch + one StaffPlannerExportItemSnapshot per MACCS
 *  2. All persisted in a single flush — atomic, all-or-nothing
 *  3. If flush fails, the controller must NOT deliver the file (legal audit trail is mandatory)
 *
 * batchNumber is sequential per year (1, 2, 3 …).
 * The unique constraint (year_id, batch_number) is the final race-condition guard.
 * Concurrent exports are extremely rare in practice; a UniqueConstraintViolation triggers
 * a 500 which the user can retry immediately.
 */
class ExportBatchService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly StaffPlannerExportBatchRepository $batchRepo,
        private readonly ResidentValidationRepository $rvRepo,
    ) {
    }

    /**
     * Creates and persists an immutable export batch with one snapshot per captured MACCS.
     *
     * @param string $fileContent The full .txt file content (used to compute SHA-256 + size).
     * @param list<array{
     *   yearResidentId: int,
     *   month: int,
     *   calendarYear: int,
     *   yearsResident: YearsResident,
     *   payloadLines: string,
     *   timesheetCount: int,
     *   gardeHospitalCount: int,
     *   absenceCount: int,
     *   totalMinutes: int,
     *   dataFingerprint: string,
     *   workerHRIDAtExport: string|null,
     *   sectionHRIDAtExport: string|null,
     * }> $capturedItems
     *
     * @throws \RuntimeException if capturedItems is empty (nothing to audit)
     * @throws \Doctrine\DBAL\Exception\UniqueConstraintViolationException on rare concurrent export collision
     */
    public function recordBatch(
        Years $year,
        string $fileContent,
        array $capturedItems,
        ?UserInterface $by = null,
    ): StaffPlannerExportBatch {
        if ($capturedItems === []) {
            throw new \RuntimeException('Cannot create an export batch with zero captured items.');
        }

        [$actorType, $actorId] = $this->resolveActor($by);

        // ── 1. Compute batch number (race-condition guard: unique constraint) ──
        $batchNumber = $this->batchRepo->nextBatchNumber($year);

        // ── 2. Create batch entity ─────────────────────────────────────────────
        $batch = (new StaffPlannerExportBatch())
            ->setYear($year)
            ->setBatchNumber($batchNumber)
            ->setGeneratedByType($actorType)
            ->setGeneratedById($actorId)
            ->setItemCount(count($capturedItems))
            ->setFileHash(hash('sha256', $fileContent))
            ->setFileSizeBytes(strlen($fileContent));

        $this->em->persist($batch);

        // ── 3. Create one snapshot per MACCS ──────────────────────────────────
        foreach ($capturedItems as $item) {
            $yr = $item['yearsResident'];

            // Capture MDS validation state at this exact moment
            $validatedByMds = $this->rvRepo->checkIfMonthHasBeenValidated(
                $item['month'],
                $item['calendarYear'],
                $yr->getResident(),
            );

            $snapshot = (new StaffPlannerExportItemSnapshot())
                ->setBatch($batch)
                ->setYearsResident($yr)
                ->setMonth($item['month'])
                ->setCalendarYear($item['calendarYear'])
                ->setDataFingerprint($item['dataFingerprint'])
                ->setValidatedByMdsAtExport($validatedByMds)
                ->setTimesheetCount($item['timesheetCount'])
                ->setGardeHospitalCount($item['gardeHospitalCount'])
                ->setAbsenceCount($item['absenceCount'])
                ->setTotalMinutes($item['totalMinutes'])
                ->setWorkerHRIDAtExport($item['workerHRIDAtExport'])
                ->setSectionHRIDAtExport($item['sectionHRIDAtExport'])
                ->setPayloadLines($item['payloadLines']);

            $this->em->persist($snapshot);
        }

        // ── 4. Atomic flush — all or nothing ──────────────────────────────────
        $this->em->flush();

        return $batch;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** @return array{string, int|null} */
    private function resolveActor(?UserInterface $user): array
    {
        return match (true) {
            $user instanceof Manager       => ['manager',        $user->getId()],
            $user instanceof HospitalAdmin => ['hospital_admin', $user->getId()],
            $user instanceof AppAdmin      => ['app_admin',      $user->getId()],
            default                        => ['system',         null],
        };
    }
}
