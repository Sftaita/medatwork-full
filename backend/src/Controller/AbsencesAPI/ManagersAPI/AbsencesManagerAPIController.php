<?php

declare(strict_types=1);

namespace App\Controller\AbsencesAPI\ManagersAPI;

use App\DTO\ValidationBatchInputDTO;
use App\Entity\Manager;
use App\Repository\AbsenceRepository;
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

/**
 * Managers Absence cutstomized APIs
 */
class AbsencesManagerAPIController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    #[Route('/api/managers/absences/getMoAbAsMan/{month}', name: 'getMonthAbsenceDataAsManager', methods: ['GET'])]
    public function getData(string $month, Security $security, AbsenceRepository $absenceRepository, ManagerYearsRepository $managerYearsRepository): JsonResponse
    {
        // 1. Security
        if (strlen($month) > 12) {
            return new JsonResponse(['message' => 'Invalid month parameter'], 400);
        }

        // 2. Get month and year from param
        $year  = substr($month, -4);
        $month = substr($month, 0, -4);

        // 3. Find the current user
        /** @var Manager $user */
        $user = $security->getUser();

        // 4. Defining date range of the month
        $start = '';
        $end   = '';
        if ($month) {
            $start = (new \DateTime($year.'/'.$month.'/01'))->format('Y-m-01');
            $end   = (new \DateTime($year.'/'.$month.'/01'))->format('Y-m-t');
        }

        // 5. Get years from the manager
        $query = $managerYearsRepository->findBy(['manager' => $user, 'dataAccess' => true]);

        $transit = [];

        foreach ($query as $yearRelation) {
            $yearId  = $yearRelation->getYears();
            $absences = $absenceRepository->searchByMonth($yearId, $start, $end);

            $canValidate = $this->isGranted(YearAccessVoter::DATA_VALIDATION, $yearId);

            foreach ($absences as $absence) {

                if ($absence['dateOfEnd']) {
                    $endDate = new DateTime(date('Y-m-d H:i', $absence['dateOfEnd']->getTimestamp()), new DateTimeZone('Europe/Paris'));
                } else {
                    $endDate = null;
                }

                $array = [
                    'id'                        => $absence['id'],
                    'firstname'                 => $absence['firstname'],
                    'lastname'                  => $absence['lastname'],
                    'dateOfStart'               => new DateTime(date('Y-m-d H:i', $absence['dateOfStart']->getTimestamp()), new DateTimeZone('Europe/Paris')),
                    'dateOfEnd'                 => $endDate,
                    'type'                      => $absence['type'],
                    'title'                     => $absence['title'],
                    'speciality'                => $absence['speciality'],
                    'isEditable'                => ! $absence['isEditable'] ? false : true,
                    'currentManagerCanViladate' => $canValidate,
                ];
                $transit[] = $array;
            }
        }

        usort($transit, function ($item1, $item2) {
            $lastnameComparison = strcmp($item1['lastname'], $item2['lastname']);
            if ($lastnameComparison !== 0) {
                return $lastnameComparison;
            }

            $date1 = $item1['dateOfStart']->getTimestamp();
            $date2 = $item2['dateOfStart']->getTimestamp();

            if ($date1 === $date2) {
                return 0;
            }

            return ($date1 < $date2) ? 1 : -1;
        });

        return($this->json($transit, 200));
    }

    #[Route('/api/managers/absences/ValidateSpecificAbsences', name: 'absencesValidate', methods: ['PUT'])]
    public function validateSpecificAbsences(Request $request, AbsenceRepository $absenceRepository): JsonResponse
    {
        try {
            $dto = ValidationBatchInputDTO::fromRequest($request, 'absenceIds');
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], JsonResponse::HTTP_BAD_REQUEST);
        }

        foreach ($dto->ids as $absenceId) {
            $absence = $absenceRepository->find($absenceId);
            if (! $absence) {
                return new JsonResponse(['message' => 'Absence not found'], JsonResponse::HTTP_NOT_FOUND);
            }

            $this->denyAccessUnlessGranted(YearAccessVoter::DATA_VALIDATION, $absence->getYear());

            $absence->setIsEditable(! $dto->isValidate);
            $this->entityManager->persist($absence);
            $this->entityManager->flush();
        }

        return new JsonResponse(['message' => 'Absence status successfully updated'], JsonResponse::HTTP_OK);
    }
}
