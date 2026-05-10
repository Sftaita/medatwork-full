<?php

declare(strict_types=1);

namespace App\Controller\StaffPlannerAPI\HospitalAdminAPI;

use App\Entity\AppAdmin;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\StaffPlannerExportBatch;
use App\Entity\StaffPlannerExportItemSnapshot;
use App\Entity\Years;
use App\Enum\ManagerJob;
use App\Repository\StaffPlannerExportBatchRepository;
use App\Repository\StaffPlannerExportItemSnapshotRepository;
use App\Repository\YearsRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Read-only audit API for Staff Planner export history (Phase 3).
 *
 * Endpoints:
 *   GET /years/{yearId}/export-batches              — paginated batch list with filters
 *   GET /export-batches/{batchId}                   — batch detail
 *   GET /export-batches/{batchId}/snapshots          — snapshot list (no payloadLines)
 *   GET /export-snapshots/{snapshotId}               — snapshot detail (with payloadLines)
 *
 * Access: HospitalAdmin, AppAdmin, Manager with admin hospital OR RH job.
 * All data is scoped to the current user's hospital.
 */
#[Route('/api/hospital-admin')]
class ExportBatchController extends AbstractController
{
    private const DEFAULT_LIMIT = 20;
    private const MAX_LIMIT     = 100;

    public function __construct(
        private readonly StaffPlannerExportBatchRepository $batchRepo,
        private readonly StaffPlannerExportItemSnapshotRepository $snapshotRepo,
    ) {
    }

    // ── Batch list ────────────────────────────────────────────────────────────

    /**
     * GET /api/hospital-admin/years/{yearId}/export-batches
     *
     * Paginated list of batches for a year, newest first.
     *
     * Query params:
     *   page            (int, default 1)
     *   limit           (int, default 20, max 100)
     *   batchNumber     (int, optional filter)
     *   generatedByType (string, optional filter: 'manager'|'hospital_admin'|'app_admin')
     *   from            (date Y-m-d, optional filter on generatedAt)
     *   to              (date Y-m-d, optional filter on generatedAt)
     *
     * @return JsonResponse {
     *   data: ExportBatch[], total: int, page: int, limit: int
     * }
     */
    #[Route('/years/{yearId}/export-batches', name: 'sp_batch_list', methods: ['GET'])]
    public function list(int $yearId, Request $request, YearsRepository $yearsRepo): JsonResponse
    {
        $year = $yearsRepo->find($yearId);
        if ($year === null) {
            return new JsonResponse(['message' => 'Année introuvable'], Response::HTTP_NOT_FOUND);
        }
        if (!$this->canAccessYear($year)) {
            return new JsonResponse(['message' => 'Accès refusé'], Response::HTTP_FORBIDDEN);
        }

        $page    = max(1, (int) $request->query->get('page', 1));
        $limit   = min(self::MAX_LIMIT, max(1, (int) $request->query->get('limit', self::DEFAULT_LIMIT)));
        $filters = $this->extractFilters($request);

        $batches = $this->batchRepo->findByYearPaginated($year, $page, $limit, $filters);
        $total   = $this->batchRepo->countByYear($year, $filters);

        return $this->json([
            'data'  => array_map([$this, 'serializeBatch'], $batches),
            'total' => $total,
            'page'  => $page,
            'limit' => $limit,
        ]);
    }

    // ── Batch detail ──────────────────────────────────────────────────────────

    /**
     * GET /api/hospital-admin/export-batches/{batchId}
     */
    #[Route('/export-batches/{batchId}', name: 'sp_batch_detail', methods: ['GET'],
        requirements: ['batchId' => '\d+'])]
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

    // ── Snapshot list (no payloadLines) ───────────────────────────────────────

    /**
     * GET /api/hospital-admin/export-batches/{batchId}/snapshots
     *
     * Returns snapshot summaries for a batch — payloadLines EXCLUDED.
     * Uses JOIN FETCH to avoid N+1 on yearsResident → resident.
     *
     * Pagination is optional (snapshots per batch are bounded by MACCS count,
     * typically < 100). If needed, add ?page and ?limit params.
     */
    #[Route('/export-batches/{batchId}/snapshots', name: 'sp_batch_snapshots', methods: ['GET'],
        requirements: ['batchId' => '\d+'])]
    public function snapshots(int $batchId, Request $request): JsonResponse
    {
        $batch = $this->batchRepo->find($batchId);
        if ($batch === null) {
            return new JsonResponse(['message' => 'Batch introuvable'], Response::HTTP_NOT_FOUND);
        }
        if (!$this->canAccessYear($batch->getYear())) {
            return new JsonResponse(['message' => 'Accès refusé'], Response::HTTP_FORBIDDEN);
        }

        // JOIN FETCH to prevent N+1 on resident data
        $snapshots = $this->snapshotRepo->findByBatchWithResident($batch);
        $total     = count($snapshots);

        return $this->json([
            'data'  => array_map([$this, 'serializeSnapshotSummary'], $snapshots),
            'total' => $total,
        ]);
    }

    // ── Snapshot detail (with payloadLines) ───────────────────────────────────

    /**
     * GET /api/hospital-admin/export-snapshots/{snapshotId}
     *
     * Returns the full snapshot detail including payloadLines.
     * Access validated against the snapshot's batch year.
     */
    #[Route('/export-snapshots/{snapshotId}', name: 'sp_snapshot_detail', methods: ['GET'],
        requirements: ['snapshotId' => '\d+'])]
    public function snapshotDetail(int $snapshotId): JsonResponse
    {
        $snapshot = $this->snapshotRepo->findByIdWithDetails($snapshotId);
        if ($snapshot === null) {
            return new JsonResponse(['message' => 'Snapshot introuvable'], Response::HTTP_NOT_FOUND);
        }
        if (!$this->canAccessYear($snapshot->getBatch()->getYear())) {
            return new JsonResponse(['message' => 'Accès refusé'], Response::HTTP_FORBIDDEN);
        }

        return $this->json($this->serializeSnapshotDetail($snapshot));
    }

    // ── Serializers ───────────────────────────────────────────────────────────

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

    /** Summary: no payloadLines. */
    private function serializeSnapshotSummary(StaffPlannerExportItemSnapshot $s): array
    {
        $yr       = $s->getYearsResident();
        $resident = $yr->getResident();
        return [
            'id'                     => $s->getId(),
            'yearResidentId'         => $yr->getId(),
            'residentFirstname'      => $resident?->getFirstname(),
            'residentLastname'       => $resident?->getLastname(),
            'month'                  => $s->getMonth(),
            'calendarYear'           => $s->getCalendarYear(),
            'dataFingerprint'        => $s->getDataFingerprint(),
            'validatedByMdsAtExport' => $s->isValidatedByMdsAtExport(),
            'timesheetCount'         => $s->getTimesheetCount(),
            'gardeHospitalCount'     => $s->getGardeHospitalCount(),
            'absenceCount'           => $s->getAbsenceCount(),
            'totalMinutes'           => $s->getTotalMinutes(),
            'workerHRIDAtExport'     => $s->getWorkerHRIDAtExport(),
            'sectionHRIDAtExport'    => $s->getSectionHRIDAtExport(),
            'createdAt'              => $s->getCreatedAt()->format(\DateTimeInterface::ATOM),
            // payloadLines intentionally excluded
        ];
    }

    /** Full detail: includes payloadLines. */
    private function serializeSnapshotDetail(StaffPlannerExportItemSnapshot $s): array
    {
        return array_merge($this->serializeSnapshotSummary($s), [
            'payloadLines' => $s->getPayloadLines(),
            'batchId'      => $s->getBatch()->getId(),
            'batchNumber'  => $s->getBatch()->getBatchNumber(),
        ]);
    }

    // ── Security ──────────────────────────────────────────────────────────────

    private function canAccessYear(Years $year): bool
    {
        $user     = $this->getUser();
        $hospital = $year->getHospital();
        if ($hospital === null) {
            return false;
        }

        if ($user instanceof AppAdmin) {
            return true; // global access
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

    // ── Private helpers ───────────────────────────────────────────────────────

    /** @return array<string, string|null> */
    private function extractFilters(Request $request): array
    {
        return array_filter([
            'batchNumber'     => $request->query->get('batchNumber'),
            'generatedByType' => $request->query->get('generatedByType'),
            'from'            => $request->query->get('from'),
            'to'              => $request->query->get('to'),
        ], static fn($v) => $v !== null && $v !== '');
    }
}
