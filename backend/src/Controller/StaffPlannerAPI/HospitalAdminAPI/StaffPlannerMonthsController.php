<?php

declare(strict_types=1);

namespace App\Controller\StaffPlannerAPI\HospitalAdminAPI;

use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\Years;
use App\Enum\ManagerJob;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use App\Services\StaffPlanner\StaffPlannerMonthsService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/hospital-admin')]
class StaffPlannerMonthsController extends AbstractController
{
    public function __construct(
        private readonly StaffPlannerMonthsService $monthsService,
    ) {
    }

    /**
     * GET /api/hospital-admin/years/{yearId}/staff-planner-months
     *
     * Returns all active MACCS × all months for the year.
     * Each item is present even without a ResidentValidation.
     */
    #[Route('/years/{yearId}/staff-planner-months', name: 'sp_months_list', methods: ['GET'])]
    public function list(int $yearId, YearsRepository $yearsRepo): JsonResponse
    {
        $year = $yearsRepo->find($yearId);
        if ($year === null) {
            return new JsonResponse(['message' => 'Année introuvable'], Response::HTTP_NOT_FOUND);
        }
        if (!$this->canAccessYear($year)) {
            return new JsonResponse(['message' => 'Accès refusé'], Response::HTTP_FORBIDDEN);
        }

        return $this->json($this->monthsService->listMonthsForYear($year));
    }

    /**
     * PATCH /api/hospital-admin/staff-planner-items/{yearResidentId}/{month}/{calendarYear}/treated
     * Body: { "treated": bool }
     */
    #[Route(
        '/staff-planner-items/{yearResidentId}/{month}/{calendarYear}/treated',
        name: 'sp_item_patch_treated',
        requirements: ['yearResidentId' => '\d+', 'month' => '\d+', 'calendarYear' => '\d+'],
        methods: ['PATCH'],
    )]
    public function patchItemTreated(
        int $yearResidentId,
        int $month,
        int $calendarYear,
        Request $request,
        YearsResidentRepository $yrRepo,
    ): JsonResponse {
        $yr = $yrRepo->find($yearResidentId);
        if ($yr === null) {
            return new JsonResponse(['message' => 'MACCS introuvable'], Response::HTTP_NOT_FOUND);
        }

        $year = $yr->getYear();
        if ($year === null || !$this->canAccessYear($year)) {
            return new JsonResponse(['message' => 'Accès refusé'], Response::HTTP_FORBIDDEN);
        }

        if ($month < 1 || $month > 12) {
            return new JsonResponse(['message' => 'Mois invalide (1–12)'], Response::HTTP_BAD_REQUEST);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !array_key_exists('treated', $data)) {
            return new JsonResponse(
                ['message' => 'Corps JSON invalide — champ "treated" requis'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        $status = $this->monthsService->setItemTreated($yr, $month, $calendarYear, (bool) $data['treated'], $this->getUser());

        return $this->json([
            'yearResidentId' => $yearResidentId,
            'month'          => $month,
            'calendarYear'   => $calendarYear,
            'treated'        => $status->isTreated(),
            'treatedAt'      => $status->getTreatedAt()?->format(\DateTimeInterface::ATOM),
            'treatedByType'  => $status->getTreatedByType(),
        ]);
    }

    // ── Access control ────────────────────────────────────────────────────────

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
