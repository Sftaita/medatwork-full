<?php

declare(strict_types=1);

namespace App\Controller\ProfileAPI;

use App\DTO\UserSettingPatchInputDTO;
use App\Services\UserSettingService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * User settings API.
 *
 * GET  /api/user/settings        → full settings (merged with defaults)
 * PATCH /api/user/settings       → partial update, returns merged result
 *
 * Access: any authenticated user (Resident, Manager, HospitalAdmin, AppAdmin).
 * The Symfony firewall (api_firewall in security.yaml) ensures a valid JWT.
 */
#[Route('/api/user')]
class UserSettingController extends AbstractController
{
    public function __construct(
        private readonly UserSettingService $service,
    ) {
    }

    #[Route('/settings', name: 'user_settings_get', methods: ['GET'])]
    public function get(): JsonResponse
    {
        $user = $this->getUser();
        if ($user === null) {
            return new JsonResponse(['message' => 'Non authentifié'], Response::HTTP_UNAUTHORIZED);
        }

        try {
            [$userType, $userId] = $this->service->resolveIdentity($user);
        } catch (\RuntimeException $e) {
            return new JsonResponse(['message' => $e->getMessage()], Response::HTTP_FORBIDDEN);
        }

        $settings = $this->service->getForUser($userType, $userId);

        return $this->json([
            'userType'  => $userType,
            'settings'  => $settings,
        ]);
    }

    #[Route('/settings', name: 'user_settings_patch', methods: ['PATCH'])]
    public function patch(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if ($user === null) {
            return new JsonResponse(['message' => 'Non authentifié'], Response::HTTP_UNAUTHORIZED);
        }

        try {
            [$userType, $userId] = $this->service->resolveIdentity($user);
        } catch (\RuntimeException $e) {
            return new JsonResponse(['message' => $e->getMessage()], Response::HTTP_FORBIDDEN);
        }

        try {
            $dto = UserSettingPatchInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $settings = $this->service->patchForUser($userType, $userId, $dto->patch);

        return $this->json([
            'userType' => $userType,
            'settings' => $settings,
        ]);
    }
}
