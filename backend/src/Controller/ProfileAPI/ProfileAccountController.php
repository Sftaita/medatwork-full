<?php

declare(strict_types=1);

namespace App\Controller\ProfileAPI;

use App\DTO\ProfileAccountPatchInputDTO;
use App\DTO\ProfilePasswordInputDTO;
use App\Entity\AppAdmin;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\Resident;
use App\Enum\ManagerJob;
use App\Enum\Sexe;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Profile account API — personal info and password.
 *
 * Distinct from /api/user/settings (UX preferences):
 *   GET  /api/profile/account   → profile data (role-specific, no sensitive fields)
 *   PATCH /api/profile/account  → update personal info
 *   PATCH /api/profile/password → change password (requires current password)
 *
 * Never returned: password, token, roles, validatedAt, status, adminHospital.
 * Email is read-only — changing it requires a dedicated identity verification flow.
 */
#[Route('/api/profile')]
class ProfileAccountController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface     $em,
        private readonly UserPasswordHasherInterface $hasher,
    ) {
    }

    // ── GET /api/profile/account ──────────────────────────────────────────────

    #[Route('/account', name: 'profile_account_get', methods: ['GET'])]
    public function getAccount(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if ($user === null) {
            return new JsonResponse(['message' => 'Non authentifié'], Response::HTTP_UNAUTHORIZED);
        }

        return $this->json($this->buildData($user, $request));
    }

    // ── PATCH /api/profile/account ────────────────────────────────────────────

    #[Route('/account', name: 'profile_account_patch', methods: ['PATCH'])]
    public function patchAccount(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if ($user === null) {
            return new JsonResponse(['message' => 'Non authentifié'], Response::HTTP_UNAUTHORIZED);
        }

        try {
            $dto = ProfileAccountPatchInputDTO::fromRequest($request, $this->resolveType($user));
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $this->applyPatch($user, $dto);
        $this->em->flush();

        return $this->json($this->buildData($user, $request));
    }

    // ── PATCH /api/profile/password ───────────────────────────────────────────

    #[Route('/password', name: 'profile_password_patch', methods: ['PATCH'])]
    public function patchPassword(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if ($user === null) {
            return new JsonResponse(['message' => 'Non authentifié'], Response::HTTP_UNAUTHORIZED);
        }

        try {
            $dto = ProfilePasswordInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        if (! $this->hasher->isPasswordValid($user, $dto->currentPassword)) {
            return new JsonResponse(
                ['message' => 'Mot de passe actuel incorrect'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $user->setPassword($this->hasher->hashPassword($user, $dto->newPassword));
        $this->em->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function resolveType(object $user): string
    {
        return match (true) {
            $user instanceof Resident      => 'resident',
            $user instanceof Manager       => 'manager',
            $user instanceof HospitalAdmin => 'hospital_admin',
            $user instanceof AppAdmin      => 'app_admin',
            default                        => throw new \RuntimeException('Type utilisateur non reconnu'),
        };
    }

    private function buildData(object $user, Request $request): array
    {
        $avatarUrl = null;
        if (method_exists($user, 'getAvatarPath') && $user->getAvatarPath() !== null) {
            $token = pathinfo($user->getAvatarPath(), PATHINFO_FILENAME);
            $avatarUrl = $request->getSchemeAndHttpHost() . '/api/profile/avatar/' . $token;
        }

        $base = [
            'role'      => $this->resolveType($user),
            'firstname' => $user->getFirstname() ?? '',
            'lastname'  => $user->getLastname()  ?? '',
            'email'     => $user->getEmail(),
            'avatarUrl' => $avatarUrl,
        ];

        return match (true) {
            $user instanceof Manager => array_merge($base, [
                'sexe' => $user->getSexe()->value,
                'job'  => $user->getJob()?->value,   // ManagerJob enum → backing string
            ]),
            $user instanceof Resident => array_merge($base, [
                'sexe'         => $user->getSexe()->value,
                'speciality'   => $user->getSpeciality(),
                'university'   => $user->getUniversity(),
                'dateOfMaster' => $user->getDateOfMaster()?->format('Y-m-d'),
            ]),
            $user instanceof HospitalAdmin => array_merge($base, [
                'hospitalName' => $user->getHospital()->getName(),
            ]),
            default => $base,
        };
    }

    private function applyPatch(object $user, ProfileAccountPatchInputDTO $dto): void
    {
        // Common fields
        if ($dto->has('firstname')) {
            $user->setFirstname($dto->firstname);
        }
        if ($dto->has('lastname')) {
            $user->setLastname($dto->lastname);
        }
        if ($dto->has('sexe') && $dto->sexe instanceof Sexe
            && ($user instanceof Manager || $user instanceof Resident)
        ) {
            $user->setSexe($dto->sexe);
        }

        // Manager-specific — setJob() accepts ?ManagerJob enum (not raw string)
        if ($user instanceof Manager && $dto->has('job')) {
            $user->setJob($dto->job !== null ? ManagerJob::from($dto->job) : null);
        }

        // Resident-specific
        if ($user instanceof Resident) {
            // setSpeciality(string) is non-nullable — only set when value is provided and non-null
            if ($dto->has('speciality') && $dto->speciality !== null) {
                $user->setSpeciality($dto->speciality);
            }
            // setUniversity(?string) and setDateOfMaster(?\DateTimeInterface) accept null ✓
            if ($dto->has('university')) {
                $user->setUniversity($dto->university);
            }
            if ($dto->has('dateOfMaster')) {
                $user->setDateOfMaster(
                    $dto->dateOfMaster !== null
                        ? new \DateTimeImmutable($dto->dateOfMaster)
                        : null
                );
            }
        }
    }
}
