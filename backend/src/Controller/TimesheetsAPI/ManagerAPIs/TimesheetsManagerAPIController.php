<?php

declare(strict_types=1);

namespace App\Controller\TimesheetsAPI\ManagerAPIs;

use App\DTO\ValidationBatchInputDTO;
use App\Entity\Manager;
use App\Repository\ManagerYearsRepository;
use App\Repository\TimesheetRepository;
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
 * Timesheets cutstomized APIs
 */
class TimesheetsManagerAPIController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    /**
     * Fetch timesheets from years where manager have access
     */
    #[Route('/api/managers/timesheets/getMonthTimesheets/{month}', name: 'timesheetsRequest', methods: ['GET'])]
    public function getRecord(string $month, Security $security, TimesheetRepository $timesheetRepository, ManagerYearsRepository $managerYearsRepository): JsonResponse
    {

        // 1. Security
        if (strlen($month) > 12) {
            return new JsonResponse(['error' => 'Paramètre invalide'], 400);
        }

        // 2. Get month and year from param
        $year = substr($month, -4);
        $month = substr($month, 0, -4);

        // 3. Find the current user
        /** @var Manager $user */
        $user = $security->getUser();

        // 4. Defining date range of the month
        $start = '';
        $end   = '';
        if ($month) {
            $start = (new \DateTime($year.'/'.$month.'/01'))->format('Y-m-01 00:00:00');
            $end   = (new \DateTime($year.'/'.$month.'/01'))->format('Y-m-t 23:59:59');
        }

        // 5. Get years from the manager
        $query = $managerYearsRepository->findBy(['manager' => $user, 'dataAccess' => true]);

        $transit = [];

        foreach ($query as $year) {
            $yearId = $year->getYears();
            $timesheets = $timesheetRepository->searchByMonth($yearId, $start, $end);

            $canValidate = $this->isGranted(YearAccessVoter::DATA_VALIDATION, $yearId);

            foreach ($timesheets as $timesheet) {

                $array = [
                    'id' => $timesheet['id'],
                    'dateOfStart' => new DateTime(date('Y-m-d H:i', $timesheet['dateOfStart']->getTimestamp()), new DateTimeZone('Europe/Paris')),
                    'dateOfEnd' => new DateTime(date('Y-m-d H:i', $timesheet['dateOfEnd']->getTimestamp()), new DateTimeZone('Europe/Paris')),
                    'pause' => $timesheet['pause'],
                    'scientific' => $timesheet['scientific'],
                    'title' => $timesheet['title'],
                    'speciality' => $timesheet['speciality'],
                    'firstname' => $timesheet['firstname'],
                    'lastname' => $timesheet['lastname'],
                    'called' => $timesheet['called'],
                    'isEditable' => ! $timesheet['isEditable'] ? false : true,
                    'currentManagerCanViladate' => $canValidate,
                ];

                $transit[] = $array;
            }

        }

        usort($transit, function ($item1, $item2) {
            // Compare by lastname first
            $lastnameComparison = strcmp($item1['lastname'], $item2['lastname']);
            if ($lastnameComparison !== 0) {
                return $lastnameComparison;
            }

            // If lastnames are equal, compare by dateOfStart in descending order
            $date1 = $item1['dateOfStart']->getTimestamp();
            $date2 = $item2['dateOfStart']->getTimestamp();

            if ($date1 === $date2) {
                return 0;
            }

            return ($date1 < $date2) ? 1 : -1; // -1 for ascending, 1 for descending
        });

        return($this->json($transit, 200));
    }

    #[Route('/api/managers/timesheets/ValidateSpecificTimesheets', name: 'timesheetsValidate', methods: ['PUT'])]
    public function validateSpecificTimesheet(Request $request, TimesheetRepository $timesheetRepository): JsonResponse
    {
        try {
            $dto = ValidationBatchInputDTO::fromRequest($request, 'timesheetIds');
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], JsonResponse::HTTP_BAD_REQUEST);
        }

        foreach ($dto->ids as $timesheetId) {
            $timesheet = $timesheetRepository->find($timesheetId);
            if (! $timesheet) {
                return new JsonResponse(['message' => 'Timesheet not found'], JsonResponse::HTTP_NOT_FOUND);
            }

            $this->denyAccessUnlessGranted(YearAccessVoter::DATA_VALIDATION, $timesheet->getYear());

            $timesheet->setIsEditable(! $dto->isValidate);

            $this->entityManager->persist($timesheet);
            $this->entityManager->flush();
        }

        return new JsonResponse(['message' => 'Timesheet status successfully updated'], JsonResponse::HTTP_OK);
    }
}
