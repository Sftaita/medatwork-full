<?php

declare(strict_types=1);

namespace App\Controller\ValidationsAPI\ManagersAPI;

use App\Repository\YearsRepository;
use App\Security\Voter\YearAccessVoter;
use App\Services\MonthValidation\ValidationService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class GetYearPeriodReport extends AbstractController
{
    public function __construct(
        private readonly YearsRepository $yearsRepository,
    ) {
    }

    #[Route('/api/managers/resident-validations/{yearId}', methods: ['GET'])]
    public function getYearResidentValidations(int $yearId, Security $security, ValidationService $validationService): Response
    {

        $year = $this->yearsRepository->find($yearId);

        if (! $year) {
            return $this->json(['error' => 'Year not found.'], 404);
        }

        // Check manager rights
        if (! $this->isGranted(YearAccessVoter::DATA_ACCESS, $year)) {
            return new JsonResponse([
                'message' => "Vous n'avez pas les droits pour ces informations.",
                ], 400);
        }

        $residentValidations = [];

        //Get all residents of the year
        $residents = array_map(fn ($yr) => $yr->getResident(), $year->getResidents()->getValues());

        // Get all periodValidation of the year
        $periodValidations = $year->getPeriodValidations()->getValues();

        // Check that all residentValidation exist for each resident for each periodValidation. To it by using getOrCreateResidentValidation that we previously created
        $residentValidation = $validationService->getAndEnsureResidentValidations($residents, $periodValidations);

        return $this->json($residentValidations);

    }
}
