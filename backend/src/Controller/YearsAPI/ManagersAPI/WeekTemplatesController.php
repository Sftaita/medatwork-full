<?php

declare(strict_types=1);

namespace App\Controller\YearsAPI\ManagersAPI;

use App\DTO\LinkWeekTemplateInputDTO;
use App\Entity\YearsWeekTemplates;
use App\Repository\ManagerWeekTemplateRepository;
use App\Repository\WeekTemplatesRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsWeekTemplatesRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class WeekTemplatesController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly YearsRepository $yearsRepository,
        private readonly WeekTemplatesRepository $weekTemplatesRepository,
        private readonly ManagerWeekTemplateRepository $managerWeekTemplateRepository,
        private readonly YearsWeekTemplatesRepository $yearsWeekTemplatesRepository,
    ) {
    }

    #[Route('/api/managers/year/weektemplateLink', name: 'add_weektemplate_to_year', methods: ['POST'])]
    public function linkWeekTemplateWithYear(Request $request, Security $security): Response
    {
        $manager = $security->getUser();

        try {
            $dto = LinkWeekTemplateInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        // Variable to hold the created entities
        $createdYearWeekTemplates = [];

        // Find Year
        $year = $this->yearsRepository->find($dto->yearId);

        if (! $year) {
            return $this->json([
                'message' => 'Year not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        // For each weekTemplateId, check if manager has access and link with Year
        foreach ($dto->weekTemplateIds as $weekTemplateId) {
            // Find corresponding entities
            $weekTemplate = $this->weekTemplatesRepository->find($weekTemplateId);
            // Check if manager has access to the weekTemplate
            $managerWeekTemplate = $this->managerWeekTemplateRepository->findOneBy(['id' => $weekTemplateId, 'manager' => $manager]);

            if (! $managerWeekTemplate) {
                return $this->json([
                    'message' => 'Manager does not have access to one or more WeekTemplates.',
                ], Response::HTTP_FORBIDDEN);
            }

            // Check if link between Year and WeekTemplate already exists
            $existingLink = $this->yearsWeekTemplatesRepository->findOneBy(['year' => $year, 'weekTemplate' => $weekTemplate]);

            if (! $existingLink) {
                // Create YearsWeekTemplates and set data
                $yearWeekTemplate = new YearsWeekTemplates();
                $yearWeekTemplate->setYear($year);
                $yearWeekTemplate->setWeekTemplate($weekTemplate);

                // Save to DB
                $this->entityManager->persist($yearWeekTemplate);
                $this->entityManager->flush();

                // Add the created YearWeekTemplate to the array
                $createdYearWeekTemplates[] = [
                    'yearWeekTemplateId' => $yearWeekTemplate->getId(),
                    'yearId' => $year->getId(),
                    'weekTemplateId' => $weekTemplate->getId(),
                    'title' => $weekTemplate->getTitle(),
                    'description' => $weekTemplate->getDescription(),
                    'color' => $weekTemplate->getColor(),
                ];
            }
        }

        // Return the array of created YearWeekTemplates
        return $this->json($createdYearWeekTemplates, 200);
    }

}
