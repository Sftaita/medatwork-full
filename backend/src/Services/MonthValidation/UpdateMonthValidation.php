<?php

declare(strict_types=1);

namespace App\Services\MonthValidation;

use App\Entity\Manager;
use App\Entity\Resident;
use App\Entity\ResidentValidation;
use Doctrine\ORM\EntityManagerInterface;

class UpdateMonthValidation
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ValidationService $validationService,
    ) {
    }

    /**
     * Updates the validation status of a resident for a given period.
     *
     * This function handles the process of validating or invalidating a resident's period based on the provided data.
     * It updates the ResidentValidation entity associated with the given resident and period, if it exists,
     * or creates a new one if it doesn't. The validation status and the manager who performed the action are updated
     * based on the provided data. This function also maintains a history of validation actions, preserving
     * details such as the action (validated or invalidated), the manager who performed the action, the time of action,
     * and any manager comment or resident notification that was included in the data.
     *
     * @param int $periodId The ID of the period.
     * @param array $data An array containing the validation action ('validate' or 'invalidate'),
     *                    optional manager comment, and optional resident notification.
     * @param Manager $manager The manager who is performing the validation action.
     * @param Resident $resident The resident whose validation status is being updated.
     *
     *
     * @throws \Exception If no period is found for the provided periodId.
     * @return bool Returns true if the operation is successful.
     */
    /** @param array<string, mixed> $data */
    public function updateResidentValidationStatus(int $periodId, array $data, Manager $manager, Resident $resident): bool
    {
        $residentValidation = $this->validationService->getOrCreateResidentValidation($periodId, $resident);

        // Update validation status, manager and history based on the action specified in the request
        $isValidated = $data['status'] === 'validate';
        $residentValidation->setValidated($isValidated);
        $residentValidation->setValidatedBy($manager);

        // Get existing validation history or initialize it to an empty array
        $existingValidationHistory = $residentValidation->getValidationHistory() ?? [];

        // Prepare validation history item
        $historyItem = [
            'uuid' => bin2hex(random_bytes(16)),
            'action' => $isValidated ? 'validated' : 'invalidated',
            'actionBy' => $manager->getId(),
            'actionAt' => (new \DateTime('now', new \DateTimeZone('Europe/Brussels')))->format('Y-m-d H:i:s'),
        ];

        // If a manager comment is provided, add it to the history item
        if (isset($data['managerComment']) && is_string($data['managerComment'])) {
            $historyItem['managerComment'] = $data['managerComment'];
        }

        // If a resident notification is provided, add it to the history item
        if (isset($data['residentNotification']) && is_string($data['residentNotification'])) {
            $historyItem['residentNotification'] = $data['residentNotification'];
        }

        // Add the new history item to the existing history
        $existingValidationHistory[] = $historyItem;
        $residentValidation->setValidationHistory($existingValidationHistory);

        $this->entityManager->persist($residentValidation);

        $this->entityManager->flush();

        return true;
    }
}
