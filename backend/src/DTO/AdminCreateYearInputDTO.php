<?php

declare(strict_types=1);

namespace App\DTO;

use App\Services\YearsManagement\AcademicPeriodHelper;
use Symfony\Component\HttpFoundation\Request;

/**
 * Input DTO for POST /api/admin/hospitals/{id}/years.
 *
 * Required: title, dateOfStart, dateOfEnd.
 * Optional: period (derived from dates when absent), comment, speciality.
 * Location is no longer accepted — it is derived from hospital.name server-side.
 */
final class AdminCreateYearInputDTO
{
    private function __construct(
        public readonly string  $title,
        public readonly string  $dateOfStart,
        public readonly string  $dateOfEnd,
        public readonly string  $period,
        public readonly ?string $comment,
        public readonly ?string $speciality,
    ) {
    }

    /** @throws \InvalidArgumentException */
    public static function fromRequest(Request $request): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }

        foreach (['title', 'dateOfStart', 'dateOfEnd'] as $field) {
            if (empty($data[$field]) || ! is_string($data[$field])) {
                throw new \InvalidArgumentException("Missing or invalid required field: $field");
            }
        }

        $dateStart = \DateTime::createFromFormat('Y-m-d', $data['dateOfStart']);
        $dateEnd   = \DateTime::createFromFormat('Y-m-d', $data['dateOfEnd']);

        if ($dateStart === false) {
            throw new \InvalidArgumentException('dateOfStart must be in YYYY-MM-DD format');
        }

        if ($dateEnd === false) {
            throw new \InvalidArgumentException('dateOfEnd must be in YYYY-MM-DD format');
        }

        if ($dateEnd <= $dateStart) {
            throw new \InvalidArgumentException('dateOfEnd must be after dateOfStart');
        }

        if ((int) $dateEnd->format('Y') - (int) $dateStart->format('Y') > 1) {
            throw new \InvalidArgumentException("Une année académique ne peut pas s'étendre sur plus de deux années civiles.");
        }

        $period = AcademicPeriodHelper::compute($dateStart, $dateEnd);

        $comment    = isset($data['comment']) && is_string($data['comment']) ? $data['comment'] : null;
        $speciality = isset($data['speciality']) && is_string($data['speciality']) && $data['speciality'] !== ''
            ? $data['speciality']
            : null;

        return new self(
            title:       trim($data['title']),
            dateOfStart: $data['dateOfStart'],
            dateOfEnd:   $data['dateOfEnd'],
            period:      $period,
            comment:     $comment,
            speciality:  $speciality,
        );
    }
}
