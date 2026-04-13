<?php

declare(strict_types=1);

namespace App\Controller\ResidentsAPI\ManagersAPI;

use App\Repository\ManagerYearsRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;

class GetYearResidentController extends AbstractController
{
    #[Route('/api/managers/GetYearResidents/{yearId}', name: 'getYearResidents', methods: ['GET'])]
    public function GetList(int $yearId, Security $security, YearsRepository $yearsRepository, ManagerYearsRepository $managerYearsRepository, YearsResidentRepository $yearsResidentRepository): JsonResponse
    {
        $year = $yearsRepository->findOneBy(['id' => $yearId]);
        if ($year === null) {
            throw new NotFoundHttpException('Année introuvable.');
        }

        $manager = $security->getUser();

        $relation = $managerYearsRepository->findOneBy(['manager' => $manager, 'years' => $year]);

        if (empty($relation)) {
            return new JsonResponse([
                'message' => "Vous n'avez pas les accès pour cette année",
            ], 400);
        }

        if ($relation->getDataAccess() === true || $relation->getAdmin() === true) {


            $yearResidents = $year->getResidents()->getValues();
            $data = [];

            foreach ($yearResidents as $yearResident) {
                $yearResidentId = $yearResident->getId();
                $allowed = $yearResident->getAllowed();
                $yr = $yearResident->getResident();
                if ($yr === null) {
                    continue;
                }
                $residentId = $yr->getId();
                $firstname = $yr->getFirstname();
                $lastanme = $yr->getLastname();
                $email = $yr->getEmail();
                $optingOut = $yearResident->getOptingOut();
                $legalLeaves = $yearResident->getLegalLeaves();
                $scientificLeaves = $yearResident->getScientificLeaves();
                $paternityLeaves = $yearResident->getPaternityLeave();
                $maternityLeaves = $yearResident->getMaternityLeave();
                $unpaidLeaves = $yearResident->getUnpaidLeave();

                $dateOfStart = $yearResident->getDateOfStart();

                if (! $dateOfStart) {
                    $dateOfStart = $year->getDateOfStart();
                }

                $data[] = [
                    'yearResidentId' => $yearResidentId,
                    'allowed' => $allowed,
                    'residentId' => $residentId,
                    'firstname' => $firstname,
                    'lastname' => $lastanme,
                    'email' => $email,
                    'dateOfStart' => $dateOfStart,
                    'optingOut' => $optingOut,
                    'legalLeaves' => $legalLeaves,
                    'paternityLeaves' => $paternityLeaves,
                    'maternityLeaves' => $maternityLeaves,
                    'unpaidLeave' => $unpaidLeaves,
                    'scientificLeaves' => $scientificLeaves,
                    'modificationOfThisData' => false,
                ];
            }

            return($this->json(['residents' => $data], 200));

        } else {
            return new JsonResponse([
                'message' => "Vous n'avez pas les accès pour cette année",
            ], 400);
        }

    }
};
