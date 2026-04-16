<?php

declare(strict_types=1);

namespace App\Controller\ShedulersAPI\ManagersAPI;

use App\DTO\AddCalendarEventInputDTO;
use App\DTO\UpdateCalendarEventInputDTO;
use App\Entity\Manager;
use App\Repository\ManagerYearsRepository;
use App\Repository\ResidentYearCalendarRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use App\Security\Voter\YearAccessVoter;
use App\Services\Schedule\ManagerSchedule\CalendarEventFormatter;
use App\Services\Schedule\ManagerSchedule\ManagerCalendar;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class CalendarController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ManagerYearsRepository $managerYearRepository,
        private readonly ManagerCalendar $managerCalendar,
        private readonly YearsResidentRepository $yearsResidentRepository,
        private readonly CalendarEventFormatter $calendarEventFormatter,
        private readonly YearsRepository $yearsRepository,
        private readonly ResidentYearCalendarRepository $residentYearCalendarRepository,
    ) {
    }

    #[Route('/api/managers/managerCalendar/firstLoad', methods: ['GET'])]
    public function firstCalendarLoad(Security $security): JsonResponse
    {
        $manager = $security->getUser();

        // role_hierarchy gives HospitalAdmin ROLE_MANAGER — guard against it
        if (!$manager instanceof Manager) {
            return $this->json(['years' => []], Response::HTTP_OK);
        }

        $managerYears = $this->managerYearRepository->findBy(['manager' => $manager]);
        $data         = ['years' => []];
        $firstYear    = true;

        foreach ($managerYears as $managerYear) {
            if (! $managerYear->getHasAgendaAccess()) {
                continue;
            }

            $managerYearEntity = $managerYear->getYears();
            if ($managerYearEntity === null) {
                continue;
            }

            $yearInfo      = [
                'yearId'    => $managerYearEntity->getId(),
                'title'     => $managerYearEntity->getTitle(),
                'residents' => [],
                'schedules' => [],
            ];
            $yearsResident = $managerYearEntity->getResidents()->getValues();

            foreach ($yearsResident as $index => $yearResident) {
                if (! $yearResident->getAllowed()) {
                    continue;
                }

                $color                   = $this->calendarEventFormatter->colorForIndex($index);
                $yearInfo['residents'][] = $this->calendarEventFormatter->formatResident($yearResident, $color);

                if ($firstYear) {
                    foreach ($yearResident->getResidentCalendar()->getValues() as $calendar) {
                        $yearInfo['schedules'][] = $this->calendarEventFormatter->formatEventFirstLoad($calendar, $yearResident, $color);
                    }
                }
            }

            $data['years'][] = $yearInfo;
            $firstYear       = false;
        }

        return $this->json($data, 200);
    }

    #[Route('/api/managers/managerCalendar/schedules/{yearId}', methods: ['GET'])]
    public function calendarLoadByYearId(int $yearId, Security $security): JsonResponse
    {
        $year = $this->yearsRepository->find($yearId);

        if (! $year) {
            return new JsonResponse(['message' => 'Année non trouvée.'], Response::HTTP_NOT_FOUND);
        }

        $user = $security->getUser();
        if ($user instanceof Manager) {
            $managerYear = $this->managerYearRepository->findOneBy(['manager' => $user, 'years' => $year]);
            if (! $managerYear || ! $managerYear->getHasAgendaAccess()) {
                return new JsonResponse(['message' => 'Accès non autorisé à cette année.'], Response::HTTP_FORBIDDEN);
            }
        } else {
            // HospitalAdmin or other — no ManagerYears relation
            return new JsonResponse(['message' => 'Accès non autorisé.'], Response::HTTP_FORBIDDEN);
        }

        $yearInfo      = [
            'yearId'    => $year->getId(),
            'title'     => $year->getTitle(),
            'residents' => [],
            'schedules' => [],
        ];
        $yearsResident = $year->getResidents()->getValues();

        foreach ($yearsResident as $index => $yearResident) {
            if (! $yearResident->getAllowed()) {
                continue;
            }

            $color                   = $this->calendarEventFormatter->colorForIndex($index);
            $yearInfo['residents'][] = $this->calendarEventFormatter->formatResident($yearResident, $color);

            foreach ($yearResident->getResidentCalendar()->getValues() as $calendar) {
                $yearInfo['schedules'][] = $this->calendarEventFormatter->formatEventByYear($calendar, $yearResident, $color);
            }
        }

        return $this->json($yearInfo, 200);
    }

    #[Route('/api/managers/managerCalendar/addEvent', methods: ['POST'])]
    public function addEventToCalendar(Request $request): JsonResponse
    {
        try {
            $dto = AddCalendarEventInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $year = $this->yearsRepository->find($dto->yearId);

        if (! $year) {
            return new JsonResponse(['message' => 'Année non trouvée.'], Response::HTTP_BAD_REQUEST);
        }

        $this->denyAccessUnlessGranted(YearAccessVoter::MANAGE_AGENDA, $year);

        $yearResident = $this->yearsResidentRepository->findOneBy(['year' => $year, 'resident' => $dto->residentId]);

        if (! $yearResident) {
            return new JsonResponse(['message' => 'Aucune relation année-MACCS retrouvée.'], Response::HTTP_BAD_REQUEST);
        }

        $action   = $this->managerCalendar->addEventToCallendarAsManager($yearResident, [
            'dateOfStart' => $dto->dateOfStart,
            'dateOfEnd'   => $dto->dateOfEnd,
            'title'       => $dto->title,
            'description' => $dto->description,
        ]);
        $response = ['message' => $action['message']];

        if (isset($action['event'])) {
            $response['event'] = $action['event'];
        }

        return $this->json($response, $action['status']);
    }

    #[Route('/api/managers/managerCalendar/updateEvent', methods: ['PUT'])]
    public function updateEventInCalendar(Request $request): JsonResponse
    {
        try {
            $dto = UpdateCalendarEventInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $event = $this->residentYearCalendarRepository->find($dto->residentYearCalendarId);

        if (! $event) {
            return new JsonResponse(['message' => "L'événement n'a pas été trouvé."], Response::HTTP_BAD_REQUEST);
        }

        $eventYearsResident = $event->getYearsResident();
        if ($eventYearsResident === null) {
            return new JsonResponse(['message' => 'Relation année-MACCS introuvable.'], Response::HTTP_BAD_REQUEST);
        }
        $year = $eventYearsResident->getYear();
        $this->denyAccessUnlessGranted(YearAccessVoter::MANAGE_AGENDA, $year);

        $newYearResident = $this->yearsResidentRepository->findOneBy([
            'resident' => $dto->residentId,
            'year'     => $year,
        ]);

        if (! $newYearResident) {
            return new JsonResponse(
                ['message' => "La relation entre l'année et le nouveau résident n'existe pas."],
                Response::HTTP_BAD_REQUEST,
            );
        }

        $action = $this->managerCalendar->updateEventInCalendarAsManager($event, $newYearResident, [
            'dateOfStart' => $dto->dateOfStart,
            'dateOfEnd'   => $dto->dateOfEnd,
            'title'       => $dto->title,
            'description' => $dto->description,
        ]);

        return $this->json(['message' => $action['message']], $action['status']);
    }

    #[Route('/api/managers/managerCalendar/deleteEvent/{eventId}', methods: ['DELETE'])]
    public function deleteEventFromCalendar(int $eventId): JsonResponse
    {
        $event = $this->residentYearCalendarRepository->find($eventId);

        if (! $event) {
            return new JsonResponse(['message' => "L'événement n'a pas été trouvé."], Response::HTTP_BAD_REQUEST);
        }

        $deleteYearsResident = $event->getYearsResident();
        if ($deleteYearsResident === null) {
            return new JsonResponse(['message' => 'Relation année-MACCS introuvable.'], Response::HTTP_BAD_REQUEST);
        }
        $this->denyAccessUnlessGranted(YearAccessVoter::MANAGE_AGENDA, $deleteYearsResident->getYear());

        $this->entityManager->remove($event);
        $this->entityManager->flush();

        return $this->json(['message' => "L'événement a été supprimé avec succès."], 200);
    }
}
