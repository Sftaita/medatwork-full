<?php

declare(strict_types=1);

namespace App\Controller\StaffPlannerAPI\HospitalAdminAPI;

use App\Entity\AppAdmin;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\Years;
use App\Enum\ManagerJob;
use App\Repository\StaffPlannerExportBatchRepository;
use App\Repository\YearsRepository;
use App\Services\StaffPlanner\ExportDiffService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Read-only diff API for comparing two Staff Planner export batches (Phase 4).
 *
 * Endpoints:
 *   GET /years/{yearId}/compare-candidates         — list batches available for comparison
 *   GET /export-batches/{batchA}/diff/{batchB}     — full diff
 *
 * Access: same as ExportBatchController (HospitalAdmin, AppAdmin, Manager RH).
 */
#[Route('/api/hospital-admin')]
class ExportDiffController extends AbstractController
{
    public function __construct(
        private readonly StaffPlannerExportBatchRepository $batchRepo,
        private readonly ExportDiffService $diffService,
    ) {
    }

    /**
     * GET /api/hospital-admin/years/{yearId}/compare-candidates
     *
     * Returns all batches for a year suitable for comparison.
     * Used to populate the two selects in the frontend diff UI.
     */
    #[Route('/years/{yearId}/compare-candidates', name: 'sp_diff_candidates', methods: ['GET'])]
    public function candidates(int $yearId, YearsRepository $yearsRepo): JsonResponse
    {
        $year = $yearsRepo->find($yearId);
        if ($year === null) {
            return new JsonResponse(['message' => 'Année introuvable'], Response::HTTP_NOT_FOUND);
        }
        if (!$this->canAccessYear($year)) {
            return new JsonResponse(['message' => 'Accès refusé'], Response::HTTP_FORBIDDEN);
        }

        $batches = $this->batchRepo->findByYearNewestFirst($year);

        return $this->json(array_map(static function ($b): array {
            return [
                'id'              => $b->getId(),
                'batchNumber'     => $b->getBatchNumber(),
                'generatedAt'     => $b->getGeneratedAt()->format(\DateTimeInterface::ATOM),
                'generatedByType' => $b->getGeneratedByType(),
                'itemCount'       => $b->getItemCount(),
            ];
        }, $batches));
    }

    /**
     * GET /api/hospital-admin/export-batches/{batchA}/diff/{batchB}
     *
     * Compares batchA against batchB.
     *
     * Query params:
     *   changedOnly    bool   (default false) — return only non-unchanged items
     *   yearResidentId int    (optional)      — filter to one MACCS
     *   month          int    (optional)      — filter to one month
     *   calendarYear   int    (optional)      — filter to one calendar year
     *
     * Response shape:
     * {
     *   batchA: { id, batchNumber, generatedAt, generatedByType, ... },
     *   batchB: { ... },
     *   identical: bool,
     *   summary: { added, removed, modified, unchanged, validationChanged },
     *   items: [
     *     {
     *       yearResidentId, residentFirstname, residentLastname, month, calendarYear,
     *       status (added|removed|modified|unchanged),
     *       fingerprintChanged, validationChanged, hridChanged,
     *       snapshotA, snapshotB,
     *       diff: { added: [], removed: [], modified: [] }
     *     }
     *   ]
     * }
     */
    #[Route(
        '/export-batches/{batchAId}/diff/{batchBId}',
        name: 'sp_diff',
        requirements: ['batchAId' => '\d+', 'batchBId' => '\d+'],
        methods: ['GET'],
    )]
    public function diff(int $batchAId, int $batchBId, Request $request): JsonResponse
    {
        $batchA = $this->batchRepo->find($batchAId);
        if ($batchA === null) {
            return new JsonResponse(['message' => "Batch A ($batchAId) introuvable"], Response::HTTP_NOT_FOUND);
        }

        $batchB = $this->batchRepo->find($batchBId);
        if ($batchB === null) {
            return new JsonResponse(['message' => "Batch B ($batchBId) introuvable"], Response::HTTP_NOT_FOUND);
        }

        if (!$this->canAccessYear($batchA->getYear())) {
            return new JsonResponse(['message' => 'Accès refusé pour le batch A'], Response::HTTP_FORBIDDEN);
        }

        if (!$this->canAccessYear($batchB->getYear())) {
            return new JsonResponse(['message' => 'Accès refusé pour le batch B'], Response::HTTP_FORBIDDEN);
        }

        // Both batches must belong to the same year (comparing across years is nonsensical)
        if ($batchA->getYear()->getId() !== $batchB->getYear()->getId()) {
            return new JsonResponse(
                ['message' => 'Les deux batches doivent appartenir à la même année académique.'],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        $options = array_filter([
            'changedOnly'    => $request->query->getBoolean('changedOnly'),
            'yearResidentId' => $request->query->getInt('yearResidentId') ?: null,
            'month'          => $request->query->getInt('month') ?: null,
            'calendarYear'   => $request->query->getInt('calendarYear') ?: null,
        ], static fn($v): bool => $v !== null && $v !== false && $v !== 0);

        $result = $this->diffService->diff($batchA, $batchB, $options);

        return $this->json($result);
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
}
