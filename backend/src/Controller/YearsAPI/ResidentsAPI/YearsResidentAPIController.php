<?php

declare(strict_types=1);

namespace App\Controller\YearsAPI\ResidentsAPI;

use App\DTO\YearTokenInputDTO;
use App\Entity\Resident;
use App\Entity\YearsResident;
use App\Repository\ManagerRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use DateTime;
use DateTimeZone;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Years Resident APIs
 */
class YearsResidentAPIController extends AbstractController
{
    #[Route('/api/years/getResidentYears', name: 'getResidentYears', methods: ['GET'])]
    public function getMyYears(YearsResidentRepository $yearsResidentRepository, Security $security, ManagerRepository $managerRepository): JsonResponse
    {

        /** @var Resident $user */
        $user = $security->getUser();

        $info = [];

        $yearsLists = $yearsResidentRepository->findYearList($user);

        foreach ($yearsLists as $year) {

            $master = $managerRepository->findOneBy(['id' => $year['master']]);

            $transit = [
                'id' => $year['id'],
                'title' => $year['title'],
                'residentAllowed' => $year['allowed'],
                'dateOfStart' => $year['dateOfStart'],
                'dateOfEnd' => $year['dateOfEnd'],
                'location' => $year['location'],
                'period' => $year['period'],
                'token' => $year['token'],
            ];

            if (! empty($master)) {
                $transit['firstname'] = $master->getFirstname();
                $transit['lastname']  = $master->getLastname();
            }

            $info[] = $transit;
        }

        return($this->json($info, 200));
    }

    /**
    * Link a user as a resident to the related year. This user must be a resident.
    */
    #[Route('/api/residents/years/joinYear', name: 'joinYear', methods: ['POST'])]
    public function joinYear(Request $request, Security $security, YearsRepository $yearsRepository, EntityManagerInterface $entityManager, YearsResidentRepository $yearResident): JsonResponse
    {
        /** @var Resident $user */
        $user = $security->getUser();

        try {
            $dto = YearTokenInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['error' => $e->getMessage()], 400);
        }

        $year = $yearsRepository->findOneBy(['token' => $dto->token]);

        if ($year === null) {
            return new JsonResponse(['message' => "Il n'existe pas d'année correspondante à ce code"], 400);
        }

        // Check if this link is not already existing
        $check = $yearResident->findOneBy(['resident' => $user, 'year' => $year]);

        if ($check !== null) {
            return new JsonResponse([
                'message' => 'Vous êtes déjà inscrit à cette année',
            ], 400);
        }


        $relation = new YearsResident();

        $relation->setResident($user)
                ->setYear($year)
                ->setCreatedAt(new DateTime('now', new DateTimeZone('Europe/Paris')))
                ->setAllowed(false);

        $entityManager->persist($relation);
        $entityManager->flush();

        return new JsonResponse([
            'message' => 'ok',
        ], 200);

    }

    /**
    * Find a year by token
    */
    #[Route('/api/residents/findByYearByToken', name: 'findYearByToken', methods: ['POST'])]
    public function findYear(YearsRepository $yearsRepository, Request $request, ManagerRepository $managerRepository): JsonResponse
    {

        try {
            $dto = YearTokenInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['error' => $e->getMessage()], 400);
        }

        $year = $yearsRepository->findOneBy(['token' => $dto->token]);

        if ($year === null) {
            return new JsonResponse([
                'message' => "Il n'existe pas d'année correspondante à ce code",
            ], 400);
        }

        $master = $managerRepository->findOneBy(['id' => $year->getMaster()]);

        if (! empty($master)) {
            $info = [
            'id' => $year->getId(),
            'title' => $year->getTitle(),
            'dateOfStart' => $year->getDateOfStart(),
            'dateOfEnd' => $year->getDateOfEnd(),
            'period' => $year->getPeriod(),
            'location' => $year->getLocation(),
            'token' => $year->getToken(),
            'email' => $master->getEmail(),
            'firstname' => $master->getFirstname(),
            'lastname' => $master->getLastname(),
            ];
        } else {
            $info = [
                'id' => $year->getId(),
                'title' => $year->getTitle(),
                'dateOfStart' => $year->getDateOfStart(),
                'dateOfEnd' => $year->getDateOfEnd(),
                'period' => $year->getPeriod(),
                'location' => $year->getLocation(),
                'token' => $year->getToken(),
                'email' => null,
                'firstname' => null,
                'lastname' => null,
                ];
        }

        return($this->json($info, 200));

    }
}
