<?php

declare(strict_types=1);

namespace App\Controller\AbsencesAPI\ResidentsAPI;

use App\DTO\AbsenceInputDTO;
use App\Entity\Absence;
use App\Entity\Resident;
use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\ResidentValidationRepository;
use App\Repository\TimesheetRepository;
use App\Repository\YearsRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class AbsencesResidentAPIController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly YearsRepository $yearsRepository,
        private readonly AbsenceRepository $absenceRepository,
        private readonly ResidentValidationRepository $residentValidationRepository,
        private readonly TimesheetRepository $timesheetRepository,
        private readonly GardeRepository $gardeRepository,
    ) {
    }

    #[Route('/api/residents/absences/addRecord', name: 'addAbsencesRecord', methods: ['POST'])]
    public function addRecord(Request $request, Security $security): JsonResponse
    {
        /** @var Resident $user */
        $user = $security->getUser();

        try {
            $dto = AbsenceInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['error' => $e->getMessage()], JsonResponse::HTTP_BAD_REQUEST);
        }

        $year = $this->yearsRepository->find($dto->yearId);
        if (! $year) {
            return new JsonResponse(['message' => 'Aucune année ne correspond.'], 400);
        }

        $start = new \DateTime((new \DateTime($dto->dateOfStart))->format('Y-m-d'));
        $end   = $dto->dateOfEnd !== null
            ? new \DateTime((new \DateTime($dto->dateOfEnd))->format('Y-m-d'))
            : null;

        $startValidated = $this->residentValidationRepository->checkIfMonthHasBeenValidated(
            (int) $start->format('m'),
            (int) $start->format('Y'),
            $user
        );
        $endValidated = $end !== null
            ? $this->residentValidationRepository->checkIfMonthHasBeenValidated(
                (int) $end->format('m'),
                (int) $end->format('Y'),
                $user
            )
            : false;

        if ($startValidated || $endValidated) {
            return new JsonResponse([
                'message' => 'Les dates sélectionnées empiètent sur une période déjà approuvée. Merci de contacter votre maître de stage.',
            ], 400);
        }

        if ($this->absenceRepository->checkForDuplicate($user, $year, $start, $end)) {
            return new JsonResponse(['message' => 'Des congés ont déjà été enregistrés pour cette période/date.'], 400);
        }

        if ($this->timesheetRepository->doesAbsenceOverlapWithTimesheet($user, $year, $start, $end)) {
            return new JsonResponse(['message' => 'Un horaire enregistré chevauche cette période.'], 400);
        }

        if ($this->gardeRepository->checkIfAlreadyExist($user, $year, $start, $end ?? $start)) {
            return new JsonResponse(['message' => 'Une garde enregistrée chevauche cette période.'], 400);
        }

        $absence = (new Absence())
            ->setResident($user)
            ->setYear($year)
            ->setDateOfStart($start)
            ->setDateOfEnd($end)
            ->setType($dto->type)
            ->setCreatedAt(new \DateTime('now'));

        $this->entityManager->persist($absence);
        $this->entityManager->flush();

        return new JsonResponse(['message' => 'ok'], 200);
    }

    #[Route('/api/absences/getMyData', name: 'getOwnAbsenceDatas', methods: ['GET'])]
    public function getData(Security $security): JsonResponse
    {
        /** @var Resident $user */
        $user = $security->getUser();

        return $this->json($this->absenceRepository->search($user), 200);
    }

    #[Route('/api/absences/delete/{id}', name: 'deleteAbsence', methods: ['DELETE'])]
    public function delete(int $id, Security $security): JsonResponse
    {
        /** @var Resident $user */
        $user    = $security->getUser();
        $absence = $this->absenceRepository->findOneBy(['resident' => $user, 'id' => $id]);

        if (! $absence) {
            return new JsonResponse(['error' => "Vous n'êtes pas autorisé à supprimer cette absence."], 400);
        }

        if ($absence->getIsEditable() === false) {
            return new JsonResponse(['message' => 'Cet événement a déjà été validé. Contactez votre maître de stage.'], 400);
        }

        $this->entityManager->remove($absence);
        $this->entityManager->flush();

        return new JsonResponse(['message' => 'ok'], 200);
    }
}
