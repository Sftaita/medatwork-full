<?php

declare(strict_types=1);

namespace App\Controller\YearsAPI;

use App\DTO\YearNotifPrefPatchInputDTO;
use App\Repository\YearsRepository;
use App\Security\Voter\YearAccessVoter;
use App\Services\UserSettingService;
use App\Services\YearNotifPrefService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Préférences personnelles de notification pour une année académique.
 *
 * GET  /api/years/{yearId}/my-notif-prefs   → lire ses propres prefs
 * PATCH /api/years/{yearId}/my-notif-prefs  → mettre à jour ses propres prefs
 *
 * Accès :
 *   - Manager lié à l'année (ManagerYears) → autorisé
 *   - HospitalAdmin même hôpital → autorisé
 *   - Tout autre utilisateur → 403
 *
 * L'identité utilisateur est TOUJOURS résolue depuis le JWT,
 * jamais depuis le body de la requête.
 */
#[Route('/api/years/{yearId}/my-notif-prefs', name: 'year_notif_prefs_')]
class YearNotifPrefController extends AbstractController
{
    public function __construct(
        private readonly YearsRepository      $yearsRepo,
        private readonly YearNotifPrefService $prefService,
        private readonly UserSettingService   $settingService,
    ) {
    }

    #[Route('', name: 'get', methods: ['GET'])]
    public function get(int $yearId): JsonResponse
    {
        $year = $this->yearsRepo->find($yearId);
        if ($year === null) {
            return $this->json(['message' => 'Année introuvable.'], 404);
        }

        $this->denyAccessUnlessGranted(YearAccessVoter::VIEW, $year);

        $user = $this->getUser();
        [$userType, $userId] = $this->settingService->resolveIdentity($user);

        $prefs = $this->prefService->getForUser($userType, $userId, $year);

        return $this->json(['prefs' => $prefs]);
    }

    #[Route('', name: 'patch', methods: ['PATCH'])]
    public function patch(int $yearId, Request $request): JsonResponse
    {
        $year = $this->yearsRepo->find($yearId);
        if ($year === null) {
            return $this->json(['message' => 'Année introuvable.'], 404);
        }

        $this->denyAccessUnlessGranted(YearAccessVoter::VIEW, $year);

        try {
            $dto = YearNotifPrefPatchInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        }

        $user = $this->getUser();
        [$userType, $userId] = $this->settingService->resolveIdentity($user);

        $prefs = $this->prefService->patchForUser($userType, $userId, $year, $dto->patch);

        return $this->json(['prefs' => $prefs]);
    }
}
