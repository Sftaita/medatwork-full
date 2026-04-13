<?php

declare(strict_types=1);

namespace App\Controller\GardesAPI\ManagersAPI;

use App\DTO\ValidationBatchInputDTO;
use App\Repository\GardeRepository;
use App\Repository\ManagerYearsRepository;
use App\Security\Voter\YearAccessVoter;
use DateTime;
use DateTimeZone;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class GardesManagerAPIController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    #[Route('/api/managers/gardes/getMoGaAsMan/{month}', name: 'getMonthGardeDataAsManager', methods: ['GET'])]
    public function getData(string $month, Security $security, GardeRepository $gardeRepository, ManagerYearsRepository $managerYearsRepository): JsonResponse
    {
        if (strlen($month) > 12) {
            return new JsonResponse(['message' => 'Invalid month parameter'], 400);
        }

        $year  = substr($month, -4);
        $month = substr($month, 0, -4);

        $start = (new \DateTime($year . '/' . $month . '/01'))->format('Y-m-01');
        $end   = (new \DateTime($year . '/' . $month . '/01'))->format('Y-m-t');

        $user    = $security->getUser();
        $query   = $managerYearsRepository->findBy(['manager' => $user, 'dataAccess' => true]);
        $transit = [];

        foreach ($query as $managerYear) {
            $yearEntity = $managerYear->getYears();
            $gardes     = $gardeRepository->searchByMonth($yearEntity, $start, $end);
            $canValidate = $this->isGranted(YearAccessVoter::DATA_VALIDATION, $yearEntity);

            foreach ($gardes as $garde) {
                $transit[] = [
                    'id'                        => $garde['id'],
                    'firstname'                 => $garde['firstname'],
                    'lastname'                  => $garde['lastname'],
                    'dateOfStart'               => new DateTime(date('Y-m-d H:i', $garde['dateOfStart']->getTimestamp()), new DateTimeZone('Europe/Paris')),
                    'dateOfEnd'                 => new DateTime(date('Y-m-d H:i', $garde['dateOfEnd']->getTimestamp()), new DateTimeZone('Europe/Paris')),
                    'type'                      => $garde['type'],
                    'comment'                   => $garde['comment'],
                    'title'                     => $garde['title'],
                    'speciality'                => $garde['speciality'],
                    'isEditable'                => (bool) $garde['isEditable'],
                    'currentManagerCanViladate' => $canValidate,
                ];
            }
        }

        usort($transit, function (array $a, array $b): int {
            $cmp = strcmp($a['lastname'], $b['lastname']);
            if ($cmp !== 0) {
                return $cmp;
            }

            return $b['dateOfStart']->getTimestamp() <=> $a['dateOfStart']->getTimestamp();
        });

        return $this->json($transit, 200);
    }

    #[Route('/api/managers/gardes/ValidateSpecificGardes', name: 'gardesValidation', methods: ['PUT'])]
    public function validateSpecificGarde(Request $request, GardeRepository $gardeRepository): JsonResponse
    {
        try {
            $dto = ValidationBatchInputDTO::fromRequest($request, 'gardeIds');
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], JsonResponse::HTTP_BAD_REQUEST);
        }

        foreach ($dto->ids as $gardeId) {
            $garde = $gardeRepository->find($gardeId);
            if (! $garde) {
                return new JsonResponse(['message' => 'Garde not found'], JsonResponse::HTTP_NOT_FOUND);
            }

            $this->denyAccessUnlessGranted(YearAccessVoter::DATA_VALIDATION, $garde->getYear());

            $garde->setIsEditable(! $dto->isValidate);
            $this->entityManager->persist($garde);
            $this->entityManager->flush();
        }

        return new JsonResponse(['message' => 'garde status successfully updated'], JsonResponse::HTTP_OK);
    }

    #[Route('/api/managers/gardes/reapartition', name: 'distribution', methods: ['GET'])]
    public function distribution(): JsonResponse
    {
        return new JsonResponse(['message' => 'Not yet implemented'], JsonResponse::HTTP_NOT_IMPLEMENTED);
    }
}
