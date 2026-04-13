<?php

declare(strict_types=1);

namespace App\Controller\TimesheetsAPI\ResidentAPIs;

use App\DTO\TimesheetInputDTO;
use App\Entity\Resident;
use App\Entity\Timesheet;
use App\Repository\TimesheetRepository;
use App\Repository\YearsRepository;
use App\Security\Voter\TimesheetVoter;
use App\Services\Checker\TimesheetInputValidator;
use DateTime;
use DateTimeZone;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Timesheets customized APIs
 */
class TimesheetsResidentAPIController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    #[Route('/api/residents/timesheets/addRecord', name: 'addRecord', methods: ['POST'])]
    public function addRecord(
        Security $security,
        Request $request,
        YearsRepository $yearsRepository,
        TimesheetRepository $timesheetRepository,
        TimesheetInputValidator $validator,
    ): JsonResponse {
        /** @var Resident $user */
        $user = $security->getUser();

        try {
            $dto = TimesheetInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['error' => $e->getMessage()], JsonResponse::HTTP_BAD_REQUEST);
        }

        $year = $yearsRepository->find($dto->yearId);

        if (! $year) {
            return new JsonResponse(['message' => "L'id de l'année renseignée n'existe pas "], JsonResponse::HTTP_BAD_REQUEST);
        }

        $dateOfStart = $validator->parseDateTime($dto->dateOfStart);
        $dateOfEnd   = $validator->parseDateTime($dto->dateOfEnd);

        $error = $validator->validate($user, $year, $dateOfStart, $dateOfEnd, $dto->dateOfStart, $dto->dateOfEnd);
        if ($error !== null) {
            return new JsonResponse(['message' => $error], JsonResponse::HTTP_BAD_REQUEST);
        }

        $timesheet = new Timesheet();
        $timesheet->setResident($user)
            ->setYear($year)
            ->setDateOfStart($dateOfStart)
            ->setDateOfEnd($dateOfEnd)
            ->setPause($dto->pause)
            ->setScientific($dto->scientific)
            ->setCalled($dto->called)
            ->setCreatedAt(new DateTime('now', new DateTimeZone('Europe/Paris')));

        $this->entityManager->persist($timesheet);
        $this->entityManager->flush();

        return new JsonResponse(['message' => 'ok'], JsonResponse::HTTP_OK);
    }

    #[Route('/api/timesheets/getMyData', name: 'getOwnDatas', methods: ['GET'])]
    public function getData(Security $security, TimesheetRepository $timesheetRepository): JsonResponse
    {
        /** @var \App\Entity\Resident $user */
        $user       = $security->getUser();
        $timesheets = $timesheetRepository->search($user);

        $transit = [];
        foreach ($timesheets as $timesheet) {
            $transit[] = [
                'id'          => $timesheet['id'],
                'dateOfStart' => new DateTime(date('Y-m-d H:i', $timesheet['dateOfStart']->getTimestamp()), new DateTimeZone('Europe/Paris')),
                'dateOfEnd'   => new DateTime(date('Y-m-d H:i', $timesheet['dateOfEnd']->getTimestamp()), new DateTimeZone('Europe/Paris')),
                'pause'       => $timesheet['pause'],
                'scientific'  => $timesheet['scientific'],
                'title'       => $timesheet['title'],
                'called'      => $timesheet['called'],
                'isEditable'  => (bool) $timesheet['isEditable'],
            ];
        }

        return $this->json($transit, 200);
    }

    #[Route('/api/residents/timesheets/find/{id}', name: 'fetchTimesheet', methods: ['GET'])]
    public function findById(int $id, TimesheetRepository $timesheetRepository): JsonResponse
    {
        $timesheet = $timesheetRepository->findOneBy(['id' => $id]);

        if (! $timesheet) {
            return new JsonResponse(['error' => 'Timesheet non trouvé'], 404);
        }

        $this->denyAccessUnlessGranted(TimesheetVoter::VIEW, $timesheet);

        return $this->json([
            'yearId'      => $timesheet->getYear()->getId(),
            'dateOfStart' => $timesheet->getDateOfStart()->format('Y-m-d H:i'),
            'dateOfEnd'   => $timesheet->getDateOfEnd()->format('Y-m-d H:i'),
            'pause'       => $timesheet->getPause(),
            'scientific'  => $timesheet->getScientific(),
            'called'      => $timesheet->getCalled(),
        ], 200);
    }

    #[Route('/api/residents/timesheets/update/{id}', name: 'updateTimesheet', methods: ['PUT'])]
    public function update(
        int $id,
        Security $security,
        Request $request,
        YearsRepository $yearsRepository,
        TimesheetRepository $timesheetRepository,
        TimesheetInputValidator $validator,
    ): JsonResponse {
        $timesheet = $timesheetRepository->findOneBy(['id' => $id]);

        if (! $timesheet) {
            return new JsonResponse(['error' => 'Timesheet non trouvé'], 404);
        }

        $this->denyAccessUnlessGranted(TimesheetVoter::EDIT, $timesheet);

        /** @var Resident $user */
        $user = $security->getUser();

        try {
            $dto = TimesheetInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['error' => $e->getMessage()], JsonResponse::HTTP_BAD_REQUEST);
        }

        $year = $yearsRepository->find($dto->yearId);

        if (! $year) {
            return new JsonResponse(['message' => "L'id de l'année renseignée n'existe pas "], JsonResponse::HTTP_BAD_REQUEST);
        }

        $dateOfStart = $validator->parseDateTime($dto->dateOfStart);
        $dateOfEnd   = $validator->parseDateTime($dto->dateOfEnd);

        $error = $validator->validate($user, $year, $dateOfStart, $dateOfEnd, $dto->dateOfStart, $dto->dateOfEnd, $timesheet->getId());
        if ($error !== null) {
            return new JsonResponse(['message' => $error], JsonResponse::HTTP_BAD_REQUEST);
        }

        $timesheet->setYear($year)
            ->setDateOfStart($dateOfStart)
            ->setDateOfEnd($dateOfEnd)
            ->setPause($dto->pause)
            ->setScientific($dto->scientific)
            ->setCalled($dto->called);

        $this->entityManager->persist($timesheet);
        $this->entityManager->flush();

        return new JsonResponse(['message' => 'ok'], JsonResponse::HTTP_OK);
    }

    #[Route('/api/timesheets/delete/{id}', name: 'deleteTimesheets', methods: ['DELETE'])]
    public function delete(int $id, Security $security, TimesheetRepository $timesheetRepository): JsonResponse
    {
        $user = $security->getUser();

        if (! $user) {
            return new JsonResponse(['error' => 'Non authentifié'], 401);
        }

        $timesheet = $timesheetRepository->findOneBy(['resident' => $user, 'id' => $id]);

        if (! $timesheet) {
            return new JsonResponse(['error' => 'this user is not autorized to delete this data'], 400);
        }

        if ($timesheet->getIsEditable() === false) {
            return new JsonResponse(['message' => 'Cet événement a déjà été validé. Contactez votre maître de stage.'], 400);
        }

        $this->entityManager->remove($timesheet);
        $this->entityManager->flush();

        return new JsonResponse(['message' => 'ok'], 200);
    }
}
