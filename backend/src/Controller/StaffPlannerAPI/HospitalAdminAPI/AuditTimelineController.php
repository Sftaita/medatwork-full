<?php

declare(strict_types=1);

namespace App\Controller\StaffPlannerAPI\HospitalAdminAPI;

use App\Entity\AppAdmin;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\StaffPlannerAuditEvent;
use App\Entity\Years;
use App\Enum\ManagerJob;
use App\Repository\StaffPlannerAuditEventRepository;
use App\Repository\StaffPlannerExportBatchRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Read-only audit timeline endpoints for Staff Planner RH (Phase 6).
 *
 * GET /api/hospital-admin/years/{yearId}/audit-events          — global paginated timeline
 * GET /api/hospital-admin/staff-planner-items/{yrId}/audit     — full MACCS timeline
 * GET /api/hospital-admin/export-batches/{batchId}/audit       — batch audit events
 *
 * Access: same as ExportBatchController (HospitalAdmin, AppAdmin, Manager RH/admin).
 */
#[Route('/api/hospital-admin')]
class AuditTimelineController extends AbstractController
{
    private const DEFAULT_LIMIT = 50;
    private const MAX_LIMIT     = 200;

    public function __construct(
        private readonly StaffPlannerAuditEventRepository $auditRepo,
        private readonly YearsRepository $yearsRepo,
        private readonly YearsResidentRepository $yrRepo,
        private readonly StaffPlannerExportBatchRepository $batchRepo,
    ) {
    }

    // ── 1. Global timeline for a year ─────────────────────────────────────────

    /**
     * GET /api/hospital-admin/years/{yearId}/audit-events
     *
     * Paginated global timeline. Filters:
     *   eventType, actorType, actorId, month, calendarYear,
     *   yearResidentId, batchId, from (Y-m-d), to (Y-m-d)
     */
    #[Route('/years/{yearId}/audit-events', name: 'sp_audit_global', methods: ['GET'])]
    public function globalTimeline(int $yearId, Request $request): JsonResponse
    {
        $year = $this->yearsRepo->find($yearId);
        if ($year === null) {
            return new JsonResponse(['message' => 'Année introuvable'], Response::HTTP_NOT_FOUND);
        }
        if (!$this->canAccessYear($year)) {
            return new JsonResponse(['message' => 'Accès refusé'], Response::HTTP_FORBIDDEN);
        }

        $page    = max(1, (int) $request->query->get('page', 1));
        $limit   = min(self::MAX_LIMIT, max(1, (int) $request->query->get('limit', self::DEFAULT_LIMIT)));
        $filters = $this->extractFilters($request);

        $events = $this->auditRepo->findByYearPaginated($year, $filters, $page, $limit);
        $total  = $this->auditRepo->countByYear($year, $filters);

        return $this->json([
            'data'  => array_map($this->serialize(...), $events),
            'total' => $total,
            'page'  => $page,
            'limit' => $limit,
        ]);
    }

    // ── 2. Full MACCS timeline ────────────────────────────────────────────────

    /**
     * GET /api/hospital-admin/staff-planner-items/{yrId}/audit
     *
     * Complete audit history for a single MACCS (all months), newest first.
     */
    #[Route('/staff-planner-items/{yrId}/audit', name: 'sp_audit_maccs', methods: ['GET'])]
    public function maccsTimeline(int $yrId): JsonResponse
    {
        $yr = $this->yrRepo->find($yrId);
        if ($yr === null) {
            return new JsonResponse(['message' => 'MACCS introuvable'], Response::HTTP_NOT_FOUND);
        }

        $year = $yr->getYear();
        if ($year === null || !$this->canAccessYear($year)) {
            return new JsonResponse(['message' => 'Accès refusé'], Response::HTTP_FORBIDDEN);
        }

        $events = $this->auditRepo->findAllByYearsResident($yr);

        return $this->json([
            'yearResidentId' => $yrId,
            'data'           => array_map($this->serialize(...), $events),
        ]);
    }

    // ── 3. Batch audit timeline ───────────────────────────────────────────────

    /**
     * GET /api/hospital-admin/export-batches/{batchId}/audit
     *
     * Audit events linked to an export batch.
     */
    #[Route('/export-batches/{batchId}/audit', name: 'sp_audit_batch', methods: ['GET'])]
    public function batchTimeline(int $batchId): JsonResponse
    {
        $batch = $this->batchRepo->find($batchId);
        if ($batch === null) {
            return new JsonResponse(['message' => 'Export batch introuvable'], Response::HTTP_NOT_FOUND);
        }

        $year = $batch->getYear();
        if (!$this->canAccessYear($year)) {
            return new JsonResponse(['message' => 'Accès refusé'], Response::HTTP_FORBIDDEN);
        }

        $events = $this->auditRepo->findAllByBatch($batchId);

        return $this->json([
            'batchId' => $batchId,
            'data'    => array_map($this->serialize(...), $events),
        ]);
    }

    // ── Serialization ─────────────────────────────────────────────────────────

    private function serialize(StaffPlannerAuditEvent $e): array
    {
        $yr = $e->getYearsResident();

        return [
            'id'             => $e->getId(),
            'eventType'      => $e->getEventType(),
            'actorType'      => $e->getActorType(),
            'actorId'        => $e->getActorId(),
            'month'          => $e->getMonth(),
            'calendarYear'   => $e->getCalendarYear(),
            'yearResidentId' => $yr?->getId(),
            'residentName'   => $yr?->getResident() !== null
                ? trim(($yr->getResident()->getFirstname() ?? '') . ' ' . ($yr->getResident()->getLastname() ?? ''))
                : null,
            'batchId'        => $e->getBatch()?->getId(),
            'batchNumber'    => $e->getBatch()?->getBatchNumber(),
            'occurredAt'     => $e->getOccurredAt()->format(\DateTimeInterface::ATOM),
            'context'        => $e->getContext(),
        ];
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
            return true;
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

    /** @return array<string, string|null> */
    private function extractFilters(Request $request): array
    {
        return array_filter([
            'eventType'      => $request->query->get('eventType'),
            'actorType'      => $request->query->get('actorType'),
            'actorId'        => $request->query->get('actorId'),
            'month'          => $request->query->get('month'),
            'calendarYear'   => $request->query->get('calendarYear'),
            'yearResidentId' => $request->query->get('yearResidentId'),
            'batchId'        => $request->query->get('batchId'),
            'from'           => $request->query->get('from'),
            'to'             => $request->query->get('to'),
        ], static fn ($v) => $v !== null && $v !== '');
    }
}
