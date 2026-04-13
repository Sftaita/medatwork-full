<?php

declare(strict_types=1);

namespace App\Controller\AccountsAPI;

use App\DTO\PasswordResetRequestInputDTO;
use App\DTO\PasswordResetWithTokenInputDTO;
use App\Services\EmailReset\PasswordResetService;
use App\Services\EmailReset\UpdatePassword;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

class ResetPasswordController extends AbstractController
{
    #[Route('/api/passwordReset', name: 'passwordReset', methods: ['POST'])]
    public function passwordReset(
        Request $request,
        PasswordResetService $passwordResetService,
        RateLimiterFactoryInterface $passwordResetLimiter,
    ): JsonResponse {
        $limiter = $passwordResetLimiter->create($request->getClientIp());
        if (! $limiter->consume(1)->isAccepted()) {
            return new JsonResponse(
                ['message' => 'Trop de tentatives. Réessayez dans une heure.'],
                Response::HTTP_TOO_MANY_REQUESTS,
            );
        }

        try {
            $dto = PasswordResetRequestInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        // Always returns 200 — never reveals whether the email is registered (user enumeration)
        $passwordResetService->requestReset($dto->email);

        return new JsonResponse(['message' => 'ok']);
    }

    #[Route('/api/passwordResetWithToken', name: 'passwordResetWithToken', methods: ['POST'])]
    public function updatePasswordWithToken(
        Request $request,
        UpdatePassword $updatePassword,
    ): JsonResponse {
        try {
            $dto = PasswordResetWithTokenInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => 'invalid token'], Response::HTTP_BAD_REQUEST);
        }

        $result = $updatePassword->fromToken($dto->token, $dto->password);

        return match ($result) {
            UpdatePassword::RESULT_OK      => new JsonResponse(['message' => 'ok']),
            UpdatePassword::RESULT_EXPIRED => new JsonResponse(['message' => 'expired token'], Response::HTTP_BAD_REQUEST),
            default                        => new JsonResponse(['message' => 'invalid token'], Response::HTTP_BAD_REQUEST),
        };
    }
}
