<?php

declare(strict_types=1);

namespace App\Services\ExcelGenerator;

use App\Entity\Resident;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Services\Utils\Dictionary;
use DateTime;

/**
 * Builds the resident information array used to populate Excel sheet headers.
 *
 * Extracted from duplicated code in ExcelController and ManagerExcelController.
 */
final class ResidentInfoAssembler
{
    public function __construct(private readonly Dictionary $dictionary)
    {
    }

    /**
     * @return array{
     *     fullName: string,
     *     speciality: string,
     *     serviceSpeciality: string,
     *     optingOut: string,
     *     yearOfFormation: int,
     * }
     */
    public function build(Resident $resident, Years $year, YearsResident $yearResident): array
    {
        $yearsOfFormation = date_diff($resident->getDateOfMaster(), new DateTime('now'))->y;

        return [
            'fullName'          => ucwords($resident->getLastname() . ' ' . $resident->getFirstname()),
            'speciality'        => $this->dictionary->translateSpeciality($resident->getSpeciality()),
            'serviceSpeciality' => $this->dictionary->translateSpeciality($year->getSpeciality()),
            'optingOut'         => $this->formatOptingOut($yearResident->getOptingOut()),
            'yearOfFormation'   => $yearsOfFormation,
        ];
    }

    private function formatOptingOut(?bool $value): string
    {
        return match ($value) {
            true    => 'Oui',
            false   => 'Non',
            default => 'Non renseigné',
        };
    }
}
