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

class GetResidentParametersController extends AbstractController
{
    #[Route('/api/managers/getParametersFromResidentByYear/{yearId}', name: 'getParameterFromResidentByYear', methods: ['GET'])]
    public function GetParameterFromResidentByYear(int $yearId, Security $security, YearsRepository $yearsRepository, ManagerYearsRepository $managerYearsRepository): JsonResponse
    {
        $manager = $security->getUser();

        $relation = $managerYearsRepository->findOneBy(['manager' => $manager, 'years' => $yearId]);

        if (empty($relation)) {
            return new JsonResponse([
                'message' => "Vous n'avez pas les accès pour cette année",
            ], 400);
        }

        $year = $yearsRepository->findOneBy(['id' => $yearId]);
        if ($year === null) {
            throw new NotFoundHttpException('Année introuvable.');
        }

        $yearResidents = $year->getResidents()->getValues();
        $data = [];

        foreach ($yearResidents as $yearResident) {

            $dateOfStart = $yearResident->getDateOfStart();
            $optingOut = $yearResident->getOptingOut();
            $holidays = $yearResident->getHolidays();
            $scientificLeaves = $yearResident->getScientificLeaves();

            $data[] = [
                'dateOfStart' => $dateOfStart,
                'optingOut' => $optingOut,
                'holidays' => $holidays,
                'scientificLeaves' => $scientificLeaves,
                'modificationOfThisData' => false,
            ];

        }
        return($this->json($data, 200));
    }
};
