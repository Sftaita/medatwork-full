<?php

declare(strict_types=1);

namespace App\Controller\ShedulersAPI\ManagersAPI;

use App\Controller\MailerController;
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
        private readonly MailerController $mailerController,
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

    #[Route('/api/managers/managerCalendar/sendScheduleEmail', methods: ['POST'])]
    public function sendScheduleEmail(Request $request, Security $security): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $yearId        = (int) ($data['yearId']        ?? 0);
        $fromDate      = $data['fromDate']      ?? '';
        $toDate        = $data['toDate']        ?? '';
        $recipientType = $data['recipientType'] ?? '';
        $maccIds       = array_map('intval', $data['maccIds'] ?? []);
        $pdfBase64     = $data['pdfBase64']     ?? '';

        if (!$yearId || !$fromDate || !$toDate || !$recipientType || !$pdfBase64) {
            return new JsonResponse(['message' => 'Paramètres manquants.'], Response::HTTP_BAD_REQUEST);
        }

        $year = $this->yearsRepository->find($yearId);
        if (!$year) {
            return new JsonResponse(['message' => 'Année non trouvée.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(YearAccessVoter::MANAGE_AGENDA, $year);

        $subject     = sprintf('Planning des affectations — du %s au %s', $fromDate, $toDate);
        $attachName  = sprintf('planning-%s-%s.pdf', str_replace('-', '', $fromDate), str_replace('-', '', $toDate));
        $errors      = [];
        $sent        = 0;

        $htmlBody = sprintf(
            '<p>Bonjour,</p><p>Veuillez trouver ci-joint le planning des affectations du <strong>%s</strong> au <strong>%s</strong>.</p><p>Cordialement,<br>L\'équipe MED@WORK</p>',
            $fromDate, $toDate
        );

        if ($recipientType === 'maccs') {
            // Envoyer à chaque MACC sélectionné
            foreach ($year->getResidents()->getValues() as $yr) {
                $resident = $yr->getResident();
                if (!$resident || !in_array($resident->getId(), $maccIds, true)) {
                    continue;
                }
                try {
                    $this->mailerController->sendEmailWithPdfAttachment(
                        $resident->getEmail(), $subject, $htmlBody, $pdfBase64, $attachName
                    );
                    ++$sent;
                } catch (\Throwable $e) {
                    $errors[] = $resident->getEmail();
                }
            }
        } elseif ($recipientType === 'manager') {
            // Envoyer aux managers de l'année
            foreach ($this->managerYearRepository->findBy(['years' => $year]) as $my) {
                $manager = $my->getManager();
                if (!$manager) { continue; }
                try {
                    $this->mailerController->sendEmailWithPdfAttachment(
                        $manager->getEmail(), $subject, $htmlBody, $pdfBase64, $attachName
                    );
                    ++$sent;
                } catch (\Throwable $e) {
                    $errors[] = $manager->getEmail();
                }
            }
        } elseif ($recipientType === 'hr') {
            // Envoyer au(x) HospitalAdmin de l'hôpital lié à l'année
            $hospital = $year->getHospital();
            if ($hospital) {
                foreach ($hospital->getHospitalAdmins() as $ha) {
                    try {
                        $this->mailerController->sendEmailWithPdfAttachment(
                            $ha->getEmail(), $subject, $htmlBody, $pdfBase64, $attachName
                        );
                        ++$sent;
                    } catch (\Throwable $e) {
                        $errors[] = $ha->getEmail();
                    }
                }
            }
        } else {
            return new JsonResponse(['message' => 'Type de destinataire invalide.'], Response::HTTP_BAD_REQUEST);
        }

        if ($sent === 0 && count($errors) === 0) {
            return new JsonResponse(['message' => 'Aucun destinataire trouvé pour ce critère.'], Response::HTTP_NOT_FOUND);
        }

        if (!empty($errors)) {
            return new JsonResponse([
                'message' => sprintf('%d email(s) envoyé(s), %d échec(s).', $sent, count($errors)),
                'errors'  => $errors,
            ], Response::HTTP_MULTI_STATUS);
        }

        return new JsonResponse(['message' => sprintf('%d email(s) envoyé(s) avec succès.', $sent)]);
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
