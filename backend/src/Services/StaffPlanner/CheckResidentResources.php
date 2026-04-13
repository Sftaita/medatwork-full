<?php

declare(strict_types=1);

namespace App\Services\StaffPlanner;

use App\Repository\PeriodValidationRepository;
use App\Repository\ResidentValidationRepository;
use App\Repository\YearsResidentRepository;

class CheckResidentResources
{
    public function __construct(
        private readonly PeriodValidationRepository $periodValidationRepository,
        private readonly ResidentValidationRepository $residentValidationRepository,
        private readonly YearsResidentRepository $yearsResidentRepository,
    ) {
    }

    /**
     * @deprecated
     * Check resident resources
     *
     * This is the original version of the function which checks if each resident of the requested validation periods
     * have completed their StaffPlanner resources.
     *
     * It has been superseded by a new version due to changes in the strategy.
     * In the new version, the function checks individual resident validation IDs to validate each resident independently for a given month.
     *
     * However, this original version is still maintained for backward compatibility with older versions of the frontend application.
     *
     * @param array $periodValidationIds - Array of validation period IDs
     * @return array - Array containing the residents with incomplete resources and the fields that are missing
     */
    /**
     * @param array<int, int> $periodValidationIds
     * @return list<array<string, mixed>>
     */
    public function checkResources($periodValidationIds): array
    {

        $data = [];

        foreach ($periodValidationIds as $periodId) {

            // 1. Find Period
            $period = $this->periodValidationRepository->findOneBy(['id' => $periodId]);

            if ($period === null) {
                continue;
            }

            // 2.Loop on each YearsResident
            $yearsResident = $period->getYear()->getResidents()->getValues();

            foreach ($yearsResident as $target) {

                $transit = [];

                $staffPlannerResources = $target->getStaffPlannerResources();
                if ($staffPlannerResources === null) {
                    continue;
                }

                if ($staffPlannerResources->getWorkerHRID() === null) {
                    $transit[] = 'workerHRID';
                }

                if ($staffPlannerResources->getSectionHRID() === null) {
                    $transit[] = 'sectionHRID';
                }

                if (count($transit) !== 0) {
                    $targetResident = $target->getResident();
                    if ($targetResident === null) {
                        continue;
                    }
                    $lastname = $targetResident->getLastname();
                    $firstname = $targetResident->getFirstname();
                    $gender = $targetResident->getSexe()->value;
                    $residentId = $targetResident->getId();
                    $data[] = [
                        'firstname' => $firstname,
                        'lastname' => $lastname,
                        'residentId' => $residentId,
                        'gender' => $gender,
                        'yearTitle' => $target->getYear()->getTitle(),
                        'yearId' => $target->getYear()->getId(),
                        'errors' => $transit,
                    ];
                }
            }
        }

        // 3. Remove duplicate
        $uniqueKey = [];
        $dataWithoutDuplicate = [];

        foreach ($data as $d) {
            $key = $d['residentId'] . '_' . $d['yearId'];
            if (! in_array($key, $uniqueKey, true)) {
                $dataWithoutDuplicate[] = $d;
                $uniqueKey[] = $key;
            }
        }

        return $dataWithoutDuplicate;
    }

    /**
    * Check if all necessary StaffPlanner resources are completed for each resident in a given validation period.
    * This function loops through an array of Resident Validation IDs, retrieves each Resident Validation Period,
    * and checks if the associated Year-Resident relation has necessary Staff Planner fields filled.
    *
    * If any Staff Planner fields are missing, the function adds the Resident's details and the missing fields
    * to an array. The function continues with the next Resident Validation ID.
    *
    * To avoid unnecessary processing and database queries, the function keeps track of which resident-year pairs
    * it has already checked. If a resident-year pair is encountered that has already been checked, it is skipped.
    *
    * At the end of the process, the function returns an array of residents with missing Staff Planner fields.
    *
    * @param array $periodValidationArray An array of Resident Validation IDs
    *
    * @throws \Doctrine\ORM\NonUniqueResultException If the query in residentValidationRepository or yearsResidentRepository
    *                                                does not return a unique result
    * @throws \Doctrine\ORM\NoResultException If the query in residentValidationRepository or yearsResidentRepository
    *                                         does not return any result
    * @return array An array of residents with missing Staff Planner fields. Each element is an associative array
    *               containing the resident's details ('firstname', 'lastname', 'residentId', 'gender', 'yearTitle', 'yearId')
    *               and the missing fields ('errors')
    */
    /**
     * @param array<int, int> $periodValidationArray
     * @return list<array<string, mixed>>
     */
    public function checkResidentStaffPlannerCompletion($periodValidationArray): array
    {

        $residentsWithMissingInfo = [];
        $uniqueResidents = []; // Move uniqueResidents declaration up here

        foreach ($periodValidationArray as $periodValidationId) {

            // Find the Resident validation period
            $residentValidationPeriod = $this->residentValidationRepository->findOneBy(['id' => $periodValidationId]);

            if ($residentValidationPeriod === null) {
                continue;
            }

            // Get Resident and Year details
            $resident = $residentValidationPeriod->getResident();
            if ($resident === null) {
                continue;
            }
            $year = $residentValidationPeriod->getPeriodValidation()->getYear();

            // Create unique key
            $uniqueKey = $resident->getId() . '_' . $year->getId();

            // Check if this resident-year pair has already been handled
            if (in_array($uniqueKey, $uniqueResidents, true)) {
                continue; // Skip this iteration as we've already handled this resident-year pair
            }

            // Find Year-Resident relation
            $yearResidentRelation = $this->yearsResidentRepository->findOneBy(['year' => $year, 'resident' => $resident]);

            // Check if Staff Planner fields are filled
            $missingFields = [];

            if ($yearResidentRelation === null) {
                continue;
            }
            $spr = $yearResidentRelation->getStaffPlannerResources();
            if ($spr === null) {
                continue;
            }
            if ($spr->getWorkerHRID() === null) {
                $missingFields[] = 'workerHRID';
            }

            if ($spr->getSectionHRID() === null) {
                $missingFields[] = 'sectionHRID';
            }

            // If there are any missing fields, store the resident's details
            if (count($missingFields) !== 0) {
                $residentsWithMissingInfo[] = [
                    'firstname' => $resident->getFirstname(),
                    'lastname' => $resident->getLastname(),
                    'residentId' => $resident->getId(),
                    'gender' => $resident->getSexe()->value,
                    'yearTitle' => $year->getTitle(),
                    'yearId' => $year->getId(),
                    'errors' => $missingFields,
                ];
                $uniqueResidents[] = $uniqueKey; // Add the uniqueKey to the uniqueResidents array
            }
        }

        return $residentsWithMissingInfo;
    }

}
