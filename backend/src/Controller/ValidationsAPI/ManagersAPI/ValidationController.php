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
use Doctrine\ORM\EntityManagerInterface;
use App\Services\MonthValidation\UpdateMonthValidation;
use App\Exception\PeriodLockedException;
use App\Services\Notifications\UpdateYearResidentNotifications;
use App\Services\StaffPlanner\AuditService;
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
        private readonly EntityManagerInterface $entityManager,
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
    public function updateResidentValidationStatus(int $periodId, Request $request, UpdateMonthValidation $updateMonthValidation, UpdateYearResidentNotifications $notification, TimesheetRepository $timesheetRepository, GardeRepository $gardeRepository, AbsenceRepository $absenceRepository, LoggerInterface $logger, AuditService $auditService): JsonResponse
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


        // ── Transaction atomique : aucune validation partielle ────────────────
        $conn = $this->entityManager->getConnection();

        /** @var list<array{itemData: array<string,mixed>, period: mixed, manager: Manager, resident: mixed}> $pendingNotifications */
        $pendingNotifications = [];

        $conn->beginTransaction();
        try {
            foreach ($dto->items as $item) {
                $residentId = $item->residentId;
                $resident   = $this->residentRepository->find($residentId);

                if ($resident === null) {
                    continue;
                }

                $existingValidation = $this->residentValidationRepository->findOneBy([
                    'periodValidation' => $period,
                    'resident'         => $resident,
                ]);

                $actionIsValidated = $item->status === 'validate';

                if (! $existingValidation || $existingValidation->getValidated() !== $actionIsValidated) {
                    if (! $actionIsValidated && ! $existingValidation) {
                        continue;
                    }

                    /** @var array<string, mixed> $itemData */
                    $itemData = [
                        'residentId'           => $item->residentId,
                        'status'               => $item->status,
                        'managerComment'       => $item->managerComment,
                        'residentNotification' => $item->residentNotification,
                    ];

                    // Opérations DB dans la transaction
                    $updateMonthValidation->updateResidentValidationStatus($periodId, $itemData, $manager, $resident);
                    $timesheetRepository->updateIsEditableForResidentInPeriod($residentId, $yearId, $firstDayOfMonth, $lastDayOfMonth, $actionIsValidated);
                    $gardeRepository->updateIsEditableForResidentInPeriod($residentId, $yearId, $firstDayOfMonth, $lastDayOfMonth, $actionIsValidated);
                    $absenceRepository->updateIsEditableForResidentInPeriod($residentId, $yearId, $firstDayOfMonth, $lastDayOfMonth, $actionIsValidated);

                    // Notification différée — envoyée après commit
                    $pendingNotifications[] = compact('itemData', 'period', 'manager', 'resident');
                }
            }

            $conn->commit();

        } catch (PeriodLockedException $e) {
            if ($conn->isTransactionActive()) {
                $conn->rollBack();
            }
            if ($period->getYear() !== null && $period->getMonth() !== null && $period->getYearNb() !== null) {
                $auditService->recordValidationBlockedByLock(
                    $resident ?? new \stdClass(), $period->getYear(), $period->getMonth(), $period->getYearNb(),
                    $manager->getId() ?? 0,
                );
            }
            return new JsonResponse([
                'error' => $e->getMessage(),
                'code'  => 'period_locked',
            ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);

        } catch (\Throwable $e) {
            if ($conn->isTransactionActive()) {
                $conn->rollBack();
            }
            $logger->error('Validation batch failed — transaction rolled back', ['exception' => $e]);
            return new JsonResponse([
                'error' => 'Erreur lors de la mise à jour. Aucune modification enregistrée.',
                'code'  => 'server_error',
            ], 500);
        }

        // ── Post-commit : notifications (best-effort, n'échoue pas la requête) ─
        foreach ($pendingNotifications as $pending) {
            try {
                $notification->notifyValidationChange($pending['itemData'], $pending['period'], $pending['manager'], $pending['resident']);
            } catch (\Exception $e) {
                $logger->warning('Notification failed after commit', ['exception' => $e]);
            }
        }

        return new JsonResponse(['message' => 'Residents validation status updated successfully.'], 200);


    }
}
