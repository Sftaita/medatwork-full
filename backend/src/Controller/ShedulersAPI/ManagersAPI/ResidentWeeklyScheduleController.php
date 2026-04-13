<?php

declare(strict_types=1);

namespace App\Controller\ShedulersAPI\ManagersAPI;

use App\DTO\WeeklyScheduleBulkUpdateInputDTO;
use App\Repository\YearsRepository;
use App\Security\Voter\YearAccessVoter;
use App\Services\Schedule\ManagerSchedule\UpdateResidentWeeklySchedule;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

class ResidentWeeklyScheduleController extends AbstractController
{
    public function __construct(
        private readonly YearsRepository $yearsRepository,
        private readonly AuthorizationCheckerInterface $authorizationChecker,
        private readonly UpdateResidentWeeklySchedule $updateResidentWeeklySchedule,
    ) {
    }


    #[Route('/api/managers/residentWeeklySchedule/update/{yearId}', name: 'resident_weekly_schedule_bulk_update', methods: ['PUT'])]
    public function updateResidentWeeklyShedule(int $yearId, Request $request): JsonResponse|Response
    {
        try {
            $dto = WeeklyScheduleBulkUpdateInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        }

        // Search for the year
        $year = $this->yearsRepository->find($yearId);

        // Check the manager's rights
        if (! $this->authorizationChecker->isGranted(YearAccessVoter::MANAGE_AGENDA, $year)) {
            return new JsonResponse([
                'message' => "Vous n'avez pas les droit recquis pour modifé l'agenda de cette année.",
            ], 400);
        }

        $this->updateResidentWeeklySchedule->performBulkUpdate($year, $dto->schedules);

        return new Response('Mise à jour réussi', Response::HTTP_OK);
    }

}
