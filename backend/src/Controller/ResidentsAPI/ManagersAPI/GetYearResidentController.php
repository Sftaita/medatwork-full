<?php

declare(strict_types=1);

namespace App\Controller\ResidentsAPI\ManagersAPI;

use App\Repository\YearsRepository;
use App\Security\Voter\YearAccessVoter;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;

class GetYearResidentController extends AbstractController
{
    #[Route('/api/managers/GetYearResidents/{yearId}', name: 'getYearResidents', methods: ['GET'])]
    public function getList(int $yearId, YearsRepository $yearsRepository): JsonResponse
    {
        $year = $yearsRepository->findOneBy(['id' => $yearId]);
        if ($year === null) {
            throw new NotFoundHttpException('Année introuvable.');
        }

        // Délégation au YearAccessVoter : gère Manager (ManagerYears), Manager promu
        // hospital_admin (adminHospital), et HospitalAdmin (hospital.id === year.hospital.id).
        if (!$this->isGranted(YearAccessVoter::DATA_ACCESS, $year)
            && !$this->isGranted(YearAccessVoter::ADMIN, $year)
        ) {
            return new JsonResponse(['message' => "Vous n'avez pas les droits de consultation pour cette année."], 403);
        }

        $data = [];
        foreach ($year->getResidents()->getValues() as $yearResident) {
            $resident = $yearResident->getResident();
            if ($resident === null) {
                continue;
            }

            $dateOfStart = $yearResident->getDateOfStart() ?? $year->getDateOfStart();

            $data[] = [
                'yearResidentId'         => $yearResident->getId(),
                'allowed'                => $yearResident->getAllowed(),
                // true = compte activé (validatedAt set); false = invitation envoyée, jamais activée.
                'accountActivated'       => $resident->getValidatedAt() !== null,
                'residentId'             => $resident->getId(),
                'firstname'              => $resident->getFirstname(),
                'lastname'               => $resident->getLastname(),
                'email'                  => $resident->getEmail(),
                'dateOfStart'            => $dateOfStart,
                'optingOut'              => $yearResident->getOptingOut(),
                'legalLeaves'            => $yearResident->getLegalLeaves(),
                'paternityLeaves'        => $yearResident->getPaternityLeave(),
                'maternityLeaves'        => $yearResident->getMaternityLeave(),
                'unpaidLeave'            => $yearResident->getUnpaidLeave(),
                'scientificLeaves'       => $yearResident->getScientificLeaves(),
                'modificationOfThisData' => false,
                'avatarPath'             => $resident->getAvatarPath(),
            ];
        }

        return $this->json(['residents' => $data]);
    }
}
