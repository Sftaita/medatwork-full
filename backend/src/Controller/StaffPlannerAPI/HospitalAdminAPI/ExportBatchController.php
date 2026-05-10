<?php

declare(strict_types=1);

namespace App\Controller\StaffPlannerAPI\HospitalAdminAPI;

use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\StaffPlannerExportBatch;
use App\Entity\Years;
use App\Enum\ManagerJob;
use App\Repository\StaffPlannerExportBatchRepository;
use App\Repository\StaffPlannerExportItemSnapshotRepository;
use App\Repository\YearsRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Read-only API for export batch audit trail.
 *
 * Access: HospitalAdmin, AppAdmin, Manager with admin hospital OR RH job.
 * All endpoints are scoped to the current user's hospital.
 *
 * No diff viewer yet (Phase 3).
 */
#[Route('/api/hospital-admin')]
class ExportBatchController extends AbstractController
{
    public function __construct(
        private readonly StaffPlannerExportBatchRepository $batchRepo,
        private readonly StaffPlannerExportItemSnapshotRepository $snapshotRepo,
    ) {
    }

    /**
     * GET /api/hospital-admin/years/{yearId}/export-batches
     *
     * Lists all export batches for a year, newest first.
     *
     * @return JsonResponse array of {
     *   id, batchNumber, generatedAt, generatedByType, generatedById,
     *   itemCount, fileHash, fileSizeBytes, notes, createdAt
     * }
     */
    #[Route('/years/{yearId}/export-batches', name: 'sp_batch_list', methods: ['GET'])]
    public function list(int $yearId, YearsRepository $yearsRepo): JsonResponse
    {
        $year = $yearsRepo->find($yearId);
        if ($year === null) {
            return new JsonResponse(['message' => 'Année introuvable'], Response::HTTP_NOT_FOUND);
        }
        if (!$this->canAccessYear($year)) {
            return new JsonResponse(['message' => 'Accès refusé'], Response::HTTP_FORBIDDEN);
        }

        $batches = $this->batchRepo->findByYearNewestFirst($year);

        return $this->json(array_map([$this, 'serializeBatch'], $batches));
    }

    /**
     * GET /api/hospital-admin/export-batches/{batchId}
     *
     * Returns the detail of a single batch.
     */
    #[Route('/export-batches/{batchId}', name: 'sp_batch_detail', methods: ['GET'])]
    public function detail(int $batchId): JsonResponse
    {
        $batch = $this->batchRepo->find($batchId);
        if ($batch === null) {
            return new JsonResponse(['message' => 'Batch introuvable'], Response::HTTP_NOT_FOUND);
        }
        if (!$this->canAccessYear($batch->getYear())) {
            return new JsonResponse(['message' => 'Accès refusé'], Response::HTTP_FORBIDDEN);
        }

        return $this->json($this->serializeBatch($batch));
    }

    /**
     * GET /api/hospital-admin/export-batches/{batchId}/snapshots
     *
     * Lists all item snapshots for a batch.
     *
     * @return JsonResponse array of {
     *   id, yearResidentId, month, calendarYear,
     *   dataFingerprint, validatedByMdsAtExport,
     *   timesheetCount, gardeHospitalCount, absenceCount, totalMinutes,
     *   workerHRIDAtExport, sectionHRIDAtExport, payloadLines, createdAt
     * }
     */
    #[Route('/export-batches/{batchId}/snapshots', name: 'sp_batch_snapshots', methods: ['GET'])]
    public function snapshots(int $batchId): JsonResponse
    {
        $batch = $this->batchRepo->find($batchId);
        if ($batch === null) {
            return new JsonResponse(['message' => 'Batch introuvable'], Response::HTTP_NOT_FOUND);
        }
        if (!$this->canAccessYear($batch->getYear())) {
            return new JsonResponse(['message' => 'Accès refusé'], Response::HTTP_FORBIDDEN);
        }

        $snapshots = $this->snapshotRepo->findByBatch($batch);

        return $this->json(array_map(static function ($s): array {
            $yr       = $s->getYearsResident();
            $resident = $yr->getResident();
            return [
                'id'                      => $s->getId(),
                'yearResidentId'          => $yr->getId(),
                'residentFirstname'       => $resident?->getFirstname(),
                'residentLastname'        => $resident?->getLastname(),
                'month'                   => $s->getMonth(),
                'calendarYear'            => $s->getCalendarYear(),
                'dataFingerprint'         => $s->getDataFingerprint(),
                'validatedByMdsAtExport'  => $s->isValidatedByMdsAtExport(),
                'timesheetCount'          => $s->getTimesheetCount(),
                'gardeHospitalCount'      => $s->getGardeHospitalCount(),
                'absenceCount'            => $s->getAbsenceCount(),
                'totalMinutes'            => $s->getTotalMinutes(),
                'workerHRIDAtExport'      => $s->getWorkerHRIDAtExport(),
                'sectionHRIDAtExport'     => $s->getSectionHRIDAtExport(),
                'payloadLines'            => $s->getPayloadLines(),
                'createdAt'               => $s->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ];
        }, $snapshots));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function serializeBatch(StaffPlannerExportBatch $batch): array
    {
        return [
            'id'              => $batch->getId(),
            'yearId'          => $batch->getYear()->getId(),
            'batchNumber'     => $batch->getBatchNumber(),
            'generatedAt'     => $batch->getGeneratedAt()->format(\DateTimeInterface::ATOM),
            'generatedByType' => $batch->getGeneratedByType(),
            'generatedById'   => $batch->getGeneratedById(),
            'itemCount'       => $batch->getItemCount(),
            'fileHash'        => $batch->getFileHash(),
            'fileSizeBytes'   => $batch->getFileSizeBytes(),
            'notes'           => $batch->getNotes(),
            'createdAt'       => $batch->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    private function canAccessYear(Years $year): bool
    {
        $user     = $this->getUser();
        $hospital = $year->getHospital();
        if ($hospital === null) {
            return false;
        }

        if ($user instanceof HospitalAdmin) {
            return $user->getHospital()->getId() === $hospital->getId();
        }

        if ($user instanceof Manager) {
            if ($user->getAdminHospital() !== null) {
                return $user->getAdminHospital()->getId() === $hospital->getId();
            }
            if ($user->getJob() === ManagerJob::HumanResources) {
                foreach ($user->getHospitals() as $h) {
                    if ($h->getId() === $hospital->getId()) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
}
