<?php

declare(strict_types=1);

namespace App\Services\Checker;

use App\Entity\Resident;
use App\Entity\Years;
use App\Repository\YearsResidentRepository;

class TimesheetChecker
{
    public function __construct(
        private readonly YearsResidentRepository $yearsResidentRepository,
    ) {
    }

    /**
     * Checks whether a record exists in the YearsResidentRepository for a given Year and Resident.
     *
     * @param Years $year The Year entity to check.
     * @param Resident $resident The Resident entity to check.
     * @return bool Returns true if a record exists, false otherwise.
     */
    public function writingRightsChecker(Years $year, Resident $resident): bool
    {
        $request = $this->yearsResidentRepository->findOneBy(['resident' => $resident, 'year' => $year]);

        if ($request === null) {
            return false;
        } else {
            return true;
        }
    }

}
