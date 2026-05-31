<?php

declare(strict_types=1);

namespace App\Controller\ResidentsAPI\ManagersAPI;

use App\Repository\ManagerYearsRepository;
use App\Repository\YearsRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;

class GetYearResidentController extends AbstractController
{
    #[Route('/api/managers/GetYearResidents/{yearId}', name: 'getYearResidents', methods: ['GET'])]
    public function getList(int $yearId, Security $security, YearsRepository $yearsRepository, ManagerYearsRepository $managerYearsRepository): JsonResponse
    {
        $year = $yearsRepository->findOneBy(['id' => $yearId]);
        if ($year === null) {
            throw new NotFoundHttpException('Année introuvable.');
        }

        $manager  = $security->getUser();
        $relation = $managerYearsRepository->findOneBy(['manager' => $manager, 'years' => $year]);

        if ($relation === null) {
            return new JsonResponse(['message' => "Vous n'avez pas accès à cette année."], 403);
        }

        if (!$relation->getDataAccess() && !$relation->getAdmin()) {
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
                'yearResidentId'      => $yearResident->getId(),
                'allowed'             => $yearResident->getAllowed(),
                'residentId'          => $resident->getId(),
                'firstname'           => $resident->getFirstname(),
                'lastname'            => $resident->getLastname(),
                'email'               => $resident->getEmail(),
                'dateOfStart'         => $dateOfStart,
                'optingOut'           => $yearResident->getOptingOut(),
                'legalLeaves'         => $yearResident->getLegalLeaves(),
                'paternityLeaves'     => $yearResident->getPaternityLeave(),
                'maternityLeaves'     => $yearResident->getMaternityLeave(),
                'unpaidLeave'         => $yearResident->getUnpaidLeave(),
                'scientificLeaves'    => $yearResident->getScientificLeaves(),
                'modificationOfThisData' => false,
            ];
        }

        return $this->json(['residents' => $data]);
    }
}
