<?php

declare(strict_types=1);

namespace App\Controller;

use App\Enum\Sexe;
use App\Repository\ResidentRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Public endpoints for MACCS profile completion after invitation.
 * These routes are PUBLIC (no JWT required) — see security.yaml.
 */
#[Route('/api/maccs')]
class MaccsSetupController extends AbstractController
{
    /**
     * Validate the invitation token and return resident context.
     * GET /api/maccs/setup/{token}
     */
    #[Route('/setup/{token}', name: 'maccs_setup_check', methods: ['GET'])]
    public function checkToken(string $token, ResidentRepository $repo): JsonResponse
    {
        $resident = $repo->findOneBy(['token' => $token]);

        if ($resident === null) {
            return new JsonResponse(['message' => 'Lien invalide ou déjà utilisé'], Response::HTTP_NOT_FOUND);
        }

        if ($resident->getTokenExpiration() < new \DateTime()) {
            return new JsonResponse(['message' => 'Lien expiré'], Response::HTTP_GONE);
        }

        // Get hospital from the most recent YearsResident link
        $hospitalName = null;
        $yrs = $resident->getYearsResidents();
        if (!$yrs->isEmpty()) {
            $hospitalName = $yrs->last()->getYear()?->getHospital()?->getName();
        }

        return $this->json([
            'firstname'    => $resident->getFirstname(),
            'lastname'     => $resident->getLastname(),
            'email'        => $resident->getEmail(),
            'hospitalName' => $hospitalName,
        ]);
    }

    /**
     * Complete the MACCS profile.
     * POST /api/maccs/setup/{token}
     *
     * Body (JSON):
     *   password      string  required  (min 8 chars)
     *   sexe          string  required  ('male' or 'female')
     *   dateOfMaster  string  required  (Y-m-d)
     *   dateOfBirth   string  required  (Y-m-d)
     *   speciality    string  required
     *   university    string  required
     */
    #[Route('/setup/{token}', name: 'maccs_setup_activate', methods: ['POST'])]
    public function completeProfile(
        string $token,
        Request $request,
        ResidentRepository $repo,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $passwordHasher,
    ): JsonResponse {
        $resident = $repo->findOneBy(['token' => $token]);

        if ($resident === null) {
            return new JsonResponse(['message' => 'Lien invalide ou déjà utilisé'], Response::HTTP_NOT_FOUND);
        }

        if ($resident->getTokenExpiration() < new \DateTime()) {
            return new JsonResponse(['message' => 'Lien expiré'], Response::HTTP_GONE);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        // ── Validate required fields ──────────────────────────────────────────

        $password = trim((string) ($data['password'] ?? ''));
        if (strlen($password) < 8) {
            return new JsonResponse(
                ['message' => 'Le mot de passe doit contenir au moins 8 caractères'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $sexe = Sexe::tryFrom((string) ($data['sexe'] ?? ''));
        if ($sexe === null) {
            return new JsonResponse(
                ['message' => 'Le sexe est invalide (valeurs acceptées : male, female)'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $dateOfMaster = \DateTime::createFromFormat('Y-m-d', (string) ($data['dateOfMaster'] ?? ''));
        if ($dateOfMaster === false) {
            return new JsonResponse(
                ['message' => 'La date d\'obtention du master est invalide (format attendu : YYYY-MM-DD)'],
                Response::HTTP_BAD_REQUEST
            );
        }

        // ── Required fields (continued) ───────────────────────────────────────

        $dateOfBirth = \DateTime::createFromFormat('Y-m-d', (string) ($data['dateOfBirth'] ?? ''));
        if ($dateOfBirth === false) {
            return new JsonResponse(
                ['message' => 'La date de naissance est invalide (format attendu : YYYY-MM-DD)'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $speciality = trim((string) ($data['speciality'] ?? ''));
        if ($speciality === '') {
            return new JsonResponse(
                ['message' => 'La spécialité est obligatoire'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $university = trim((string) ($data['university'] ?? ''));
        if ($university === '') {
            return new JsonResponse(
                ['message' => 'L\'université est obligatoire'],
                Response::HTTP_BAD_REQUEST
            );
        }

        // ── Persist ───────────────────────────────────────────────────────────

        $resident
            ->setPassword($passwordHasher->hashPassword($resident, $password))
            ->setSexe($sexe)
            ->setDateOfMaster($dateOfMaster)
            ->setDateOfBirth($dateOfBirth)
            ->setUniversity($university)
            ->setValidatedAt(new \DateTime())
            ->setToken(null)
            ->setTokenExpiration(null);

        $resident->setSpeciality($speciality);

        $em->flush();

        return new JsonResponse(['message' => 'Profil complété avec succès'], Response::HTTP_OK);
    }
}
