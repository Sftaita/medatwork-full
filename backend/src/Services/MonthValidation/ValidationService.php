<?php

declare(strict_types=1);

namespace App\Services\MonthValidation;

use App\Entity\PeriodValidation;
use App\Entity\Resident;
use App\Entity\ResidentValidation;
use App\Repository\PeriodValidationRepository;
use App\Repository\ResidentValidationRepository;
use Doctrine\ORM\EntityManagerInterface;

class ValidationService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly PeriodValidationRepository $periodValidationRepository,
        private readonly ResidentValidationRepository $residentValidationRepository,
    ) {
    }

    /**
     * Fetches an existing ResidentValidation entity for the given Resident and PeriodValidation id, or creates a new one if none exists.
     *
     * This method performs the following steps:
     * 1. Fetches the PeriodValidation entity for the given periodId.
     * 2. If no PeriodValidation entity is found, it throws an exception.
     * 3. Checks if a ResidentValidation entity already exists for this Resident and Period.
     * 4. If no ResidentValidation entity exists, it checks if the resident is registered for the year of the given PeriodValidation.
     * 5. If the resident is not registered for the year, it throws an exception.
     * 6. If the resident is registered for the year, it creates a new ResidentValidation entity.
     *
     * @param int $periodId The id of the PeriodValidation entity.
     * @param Resident $resident The Resident entity.
     *
     * @throws \Exception If no PeriodValidation entity is found for the given id, or if the resident is not registered for the year.
     * @return ResidentValidation The existing or newly created ResidentValidation entity.
     */
    public function getOrCreateResidentValidation(int $periodId, Resident $resident): ResidentValidation
    {
        // Fetch PeriodValidation entity for given periodId
        $period = $this->periodValidationRepository->find($periodId);

        if (! $period) {
            throw new \Exception('No period found for id '.$periodId);
        }

        // Check if a ResidentValidation entity already exists for this Resident and Period
        $residentValidation = $this->residentValidationRepository->findOneBy([
            'resident' => $resident,
            'periodValidation' => $period,
        ]);

        // Create a new ResidentValidation entity if none exists
        if (! $residentValidation) {

            // Check if the resident is registered to this year
            $year = $period->getYear();
            $residentsOfYear = $year->getResidents()->getValues();

            $residentFound = false;
            foreach ($residentsOfYear as $residentOfYear) {
                if ($residentOfYear->getResident()->getId() == $resident->getId()) {
                    $residentFound = true;
                    break;
                }
            }

            if (! $residentFound) {
                throw new \Exception('The resident is not registered for this year');
            }

            $residentValidation = new ResidentValidation();
            $residentValidation->setResident($resident);
            $residentValidation->setPeriodValidation($period);
            $residentValidation->setValidated(false);

        }

        return $residentValidation;
    }

    /**
     * This method takes a list of residents and a list of period validations. For each resident and period validation,
     * it checks if a resident validation exists in the database. If not, it creates a new one.
     *
     * The method returns a list of all resident validations, whether they existed before or were created by this method.
     *
     * @param Resident[] $residents
     * @param PeriodValidation[] $periodValidations
     *
     * @return ResidentValidation[] An array of all resident validations, whether they existed before or were created by this method.
     */
    public function getAndEnsureResidentValidations(array $residents, array $periodValidations): array
    {
        $residentValidations = [];

        foreach ($residents as $resident) {
            foreach ($periodValidations as $periodValidation) {

                // Look for existing resident validation for the given resident and period validation
                $existingValidation = $this->residentValidationRepository->findOneBy([
                    'resident' => $resident,
                    'periodValidation' => $periodValidation,
                ]);

                // If resident validation does not exist, create a new one
                if (! $existingValidation) {
                    $newValidation = new ResidentValidation();
                    $newValidation->setResident($resident);
                    $newValidation->setPeriodValidation($periodValidation);

                    $this->entityManager->persist($newValidation);
                    $this->entityManager->flush();

                    $existingValidation = $newValidation;
                }

                // Add resident validation to the list
                $residentValidations[] = $existingValidation;
            }
        }

        return $residentValidations;
    }
}
