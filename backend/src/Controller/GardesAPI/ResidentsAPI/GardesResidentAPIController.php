<?php

declare(strict_types=1);

namespace App\Controller\GardesAPI\ResidentsAPI;

use App\DTO\GardeInputDTO;
use App\Entity\Garde;
use App\Entity\Resident;
use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\ResidentValidationRepository;
use App\Repository\TimesheetRepository;
use App\Repository\YearsRepository;
use App\Services\Utils\Tools;
use DateTime;
use DateTimeImmutable;
use DateTimeZone;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class GardesResidentAPIController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly YearsRepository $yearsRepository,
        private readonly GardeRepository $gardeRepository,
        private readonly ResidentValidationRepository $residentValidationRepository,
        private readonly TimesheetRepository $timesheetRepository,
        private readonly AbsenceRepository $absenceRepository,
        private readonly Tools $tools,
    ) {
    }

    #[Route('/api/residents/gardes/addRecord', name: 'addGardeRecord', methods: ['POST'])]
    public function addRecord(Request $request, Security $security): JsonResponse
    {
        /** @var Resident $user */
        $user = $security->getUser();

        try {
            $dto = GardeInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['error' => $e->getMessage()], JsonResponse::HTTP_BAD_REQUEST);
        }

        $year = $this->yearsRepository->find($dto->yearId);

        if (! $year) {
            return new JsonResponse(['message' => "L'id de l'année renseignée n'existe pas"], JsonResponse::HTTP_BAD_REQUEST);
        }

        $dateOfStart = new DateTime((new DateTime($dto->dateOfStart))->format('Y-m-d H:i:0'), new DateTimeZone('Europe/Paris'));
        $dateOfEnd   = new DateTime((new DateTime($dto->dateOfEnd))->format('Y-m-d H:i:0'), new DateTimeZone('Europe/Paris'));
        $now         = new DateTime('now', new DateTimeZone('Europe/Paris'));

        $isStartPeriodValidated = $this->residentValidationRepository->checkIfMonthHasBeenValidated(
            (int) $dateOfStart->format('m'),
            (int) $dateOfStart->format('Y'),
            $user
        );
        $isEndPeriodValidated = $this->residentValidationRepository->checkIfMonthHasBeenValidated(
            (int) $dateOfEnd->format('m'),
            (int) $dateOfEnd->format('Y'),
            $user
        );

        if ($isStartPeriodValidated || $isEndPeriodValidated) {
            return new JsonResponse(
                ['message' => "L'intervalle chevauche un mois déjà validé. Veuillez consulter votre maître de stage."],
                JsonResponse::HTTP_BAD_REQUEST,
            );
        }

        if ($this->gardeRepository->checkIfAlreadyExist($user, $year, $dateOfStart, $dateOfEnd)) {
            return new JsonResponse(['message' => 'Une garde a déjà été enregistré sur cette période.'], 400);
        }

        if ($dto->type->value === 'hospital' && $this->timesheetRepository->checkIfAlreadyExist($user, $year, $dateOfStart, $dateOfEnd)) {
            return new JsonResponse(['message' => 'Un horaire enregistré chevauche cette période.'], 400);
        }

        if ($this->absenceRepository->checkForDuplicate($user, $year, $dateOfStart, $dateOfEnd)) {
            return new JsonResponse(['message' => 'Un congé enregistré chevauche cette période.'], 400);
        }

        if ($dto->type->value === 'hospital' && ceil($this->tools->hoursdiff($dto->dateOfStart, $dto->dateOfEnd)) > 24) {
            return new JsonResponse(['message' => "Une période de travail de >24h n'est pas autorisée"], 400);
        }

        $garde = (new Garde())
            ->setResident($user)
            ->setYear($year)
            ->setDateOfStart($dateOfStart)
            ->setDateOfEnd($dateOfEnd)
            ->setType($dto->type)
            ->setComment($dto->comment)
            ->setCreatedAt(DateTimeImmutable::createFromMutable($now));

        $this->entityManager->persist($garde);
        $this->entityManager->flush();

        return new JsonResponse(['message' => 'ok'], 200);
    }

    #[Route('/api/gardes/getMyData', name: 'getOwnGardeDatas', methods: ['GET'])]
    public function getData(Security $security): JsonResponse
    {
        /** @var Resident $user */
        $user   = $security->getUser();
        $gardes = $this->gardeRepository->search($user);

        $transit = array_map(fn (array $garde) => [
            'id'          => $garde['id'],
            'dateOfStart' => new DateTime(date('Y-m-d H:i', $garde['dateOfStart']->getTimestamp()), new DateTimeZone('Europe/Paris')),
            'dateOfEnd'   => new DateTime(date('Y-m-d H:i', $garde['dateOfEnd']->getTimestamp()), new DateTimeZone('Europe/Paris')),
            'type'        => $garde['type'],
            'title'       => $garde['title'],
            'comment'     => $garde['comment'],
            'isEditable'  => (bool) $garde['isEditable'],
        ], $gardes);

        return $this->json($transit, 200);
    }

    #[Route('/api/gardes/delete/{id}', name: 'deleteGarde', methods: ['DELETE'])]
    public function delete(int $id, Security $security): JsonResponse
    {
        /** @var Resident $user */
        $user  = $security->getUser();
        $garde = $this->gardeRepository->findOneBy(['resident' => $user, 'id' => $id]);

        if (! $garde) {
            return new JsonResponse(['error' => "Vous n'êtes pas autorisé à supprimer cette garde."], 400);
        }

        if ($garde->getIsEditable() === false) {
            return new JsonResponse(['message' => 'Cet événement a déjà été validé. Contactez votre maître de stage.'], 400);
        }

        $this->entityManager->remove($garde);
        $this->entityManager->flush();

        return new JsonResponse(['message' => 'ok'], 200);
    }
}
