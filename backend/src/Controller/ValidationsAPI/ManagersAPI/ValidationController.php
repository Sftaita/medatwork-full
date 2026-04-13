<?php

declare(strict_types=1);

namespace App\Controller\ValidationsAPI\ManagersAPI;

use App\DTO\ValidationListInputDTO;
use App\Entity\Manager;
use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\PeriodValidationRepository;
use App\Repository\ResidentRepository;
use App\Repository\ResidentValidationRepository;
use App\Repository\TimesheetRepository;
use App\Security\Voter\YearAccessVoter;
use App\Services\MonthValidation\UpdateMonthValidation;
use App\Services\Notifications\UpdateYearResidentNotifications;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class ValidationController extends AbstractController
{
    public function __construct(
        private readonly PeriodValidationRepository $periodValidationRepository,
        private readonly ResidentRepository $residentRepository,
        private readonly ResidentValidationRepository $residentValidationRepository,
    ) {
    }

    /**
     * Updates the validation status for a set of residents within a specific period.
     *
     * This method expects a PUT request with a body containing an array of resident objects.
     * Each resident object should have the following properties:
     * - residentId: The ID of the resident.
     * - status: The new validation status. Valid values are "validate" and "invalidate".
     * - managerComment (optional): A comment from the manager.
     * - residentNotification (optional): A notification for the resident.
     *
     * The method will return a JSON response with a message indicating the success or failure of the operation.
     *
     *
     * @param int $periodId The ID of the period.
     * @param Request $request The request object.
     * @param UpdateMonthValidation $updateMonthValidation Service to update month validation status.
     * @param UpdateYearResidentNotifications $notification Service to send notifications.
     *
     * @return JsonResponse A JSON response indicating the success or failure of the operation.
     */
    #[Route('/api/managers/validation/{periodId}', name: 'update_resident_validation_status', methods: ['PUT'])]
    public function updateResidentValidationStatus($periodId, Request $request, UpdateMonthValidation $updateMonthValidation, UpdateYearResidentNotifications $notification, TimesheetRepository $timesheetRepository, GardeRepository $gardeRepository, AbsenceRepository $absenceRepository, LoggerInterface $logger): JsonResponse
    {
        try {
            $dto = ValidationListInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['error' => 'Invalid input.'], 400);
        }

        /** @var Manager $manager */
        $manager = $this->getUser();

        $period = $this->periodValidationRepository->find($periodId);

        if (! $period) {
            return $this->json(['error' => 'No period found for id '.$periodId], 400);
        }

        // Check rights
        $year = $period->getYear();
        if (! $this->isGranted(YearAccessVoter::ADMIN, $year) && ! $this->isGranted(YearAccessVoter::DATA_VALIDATION, $year)) {
            return new JsonResponse([
                'message' => "Vous n'avez pas les droits pour valider",
            ], 400);
        }

        $yearId = $period->getYear()->getId();
        $periodMonth = $period->getMonth();
        $periodYear = $period->getYearNb();
        $firstDayOfMonth = new \DateTime("$periodYear-$periodMonth-01 00:00:00");
        $lastDayOfMonth = (clone $firstDayOfMonth)->modify('last day of this month 23:59:59');


        foreach ($dto->items as $item) {
            $residentId = $item->residentId;
            $resident = $this->residentRepository->find($residentId);

            if ($resident === null) {
                continue;
            }

            // Fetch the existing validation
            $existingValidation = $this->residentValidationRepository->findOneBy([
                'periodValidation' => $period,
                'resident' => $resident,
            ]);

            $actionIsValidated = $item->status === 'validate';

            // Check if the action is different or if it doesn't exist
            if (! $existingValidation || $existingValidation->getValidated() !== $actionIsValidated) {

                // If trying to invalidate a resident who has never been validated, skip this iteration
                if (! $actionIsValidated && ! $existingValidation) {
                    continue;
                }

                // Build the legacy data array expected by downstream services
                /** @var array<string, mixed> $itemData */
                $itemData = [
                    'residentId'           => $item->residentId,
                    'status'               => $item->status,
                    'managerComment'       => $item->managerComment,
                    'residentNotification' => $item->residentNotification,
                ];

                // The action is different, update it
                try {

                    $updateMonthValidation->updateResidentValidationStatus($periodId, $itemData, $manager, $resident);
                    $notification->notifyValidationChange($itemData, $period, $manager, $resident);
                    $timesheetRepository->updateIsEditableForResidentInPeriod($residentId, $yearId, $firstDayOfMonth, $lastDayOfMonth, $actionIsValidated);
                    $gardeRepository->updateIsEditableForResidentInPeriod($residentId, $yearId, $firstDayOfMonth, $lastDayOfMonth, $actionIsValidated);
                    $absenceRepository->updateIsEditableForResidentInPeriod($residentId, $yearId, $firstDayOfMonth, $lastDayOfMonth, $actionIsValidated);


                } catch (\Exception $e) {
                    $logger->error('Validation update failed', ['exception' => $e, 'residentId' => $item->residentId]);

                    return new JsonResponse(['error' => 'Une erreur est survenue lors de la mise à jour.'], 400);
                }
            }
        }



        return new JsonResponse(['message' => 'Residents validation status updated successfully.'], 200);


    }
}
