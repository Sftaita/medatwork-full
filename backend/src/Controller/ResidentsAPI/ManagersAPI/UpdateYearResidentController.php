<?php

declare(strict_types=1);

namespace App\Controller\ResidentsAPI\ManagersAPI;

use App\DTO\UpdateYearResidentInputDTO;
use App\Repository\YearsResidentRepository;
use App\Security\Voter\YearAccessVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class UpdateYearResidentController extends AbstractController
{
    #[Route('/api/managers/updateYearResidents/{yearResidentId}', name: 'updateYearResident', methods: ['PUT'])]
    public function updateYearResident(int $yearResidentId, Request $request, YearsResidentRepository $yearsResidentRepository, EntityManagerInterface $entityManager): JsonResponse
    {

        $yearResident = $yearsResidentRepository->find($yearResidentId);

        if (! $yearResident) {
            return new JsonResponse(['message' => 'Year Resident with id '.$yearResidentId.' not found'], 404);
        }

        $year = $yearResident->getYear();

        if (! $this->isGranted(YearAccessVoter::ADMIN, $year) && ! $this->isGranted(YearAccessVoter::DATA_VALIDATION, $year)) {
            return new JsonResponse([
                'message' => "Vous n'avez pas les droits pour cette action",
            ], 400);
        }

        try {
            $dto = UpdateYearResidentInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        }

        if ($dto->dateOfStart !== null) {
            if ($dto->dateOfStart !== $year->getDateOfStart()) {
                $yearResident->setDateOfStart(new \DateTime($dto->dateOfStart));
            }
        }

        if ($dto->optingOut !== null) {
            $yearResident->setOptingOut($dto->optingOut);
        }

        if ($dto->legalLeaves !== null) {
            $yearResident->setLegalLeaves($dto->legalLeaves);
        }

        if ($dto->scientificLeaves !== null) {
            $yearResident->setScientificLeaves($dto->scientificLeaves);
        }

        if ($dto->maternityLeaves !== null) {
            $yearResident->setMaternityLeave($dto->maternityLeaves);
        }

        if ($dto->paternityLeaves !== null) {
            $yearResident->setPaternityLeave($dto->paternityLeaves);
        }

        if ($dto->unpaidLeaves !== null) {
            $yearResident->setUnpaidLeave($dto->unpaidLeaves);
        }

        $entityManager->flush();

        return new JsonResponse(['message' => 'YearResident with id '.$yearResidentId.' updated successfully']);
    }
};
