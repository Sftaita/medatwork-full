<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Input DTO for POST /api/admin/hospitals/{id}/years.
 *
 * Required: title, dateOfStart, dateOfEnd, location.
 * Optional: period (derived from dates when absent), comment, speciality.
 */
final class AdminCreateYearInputDTO
{
    private function __construct(
        public readonly string  $title,
        public readonly string  $dateOfStart,
        public readonly string  $dateOfEnd,
        public readonly string  $location,
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

        foreach (['title', 'dateOfStart', 'dateOfEnd', 'location'] as $field) {
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

        // Derive period from years (e.g. "2025-2026") when not explicitly provided
        $period = isset($data['period']) && is_string($data['period']) && $data['period'] !== ''
            ? $data['period']
            : $dateStart->format('Y') . '-' . $dateEnd->format('Y');

        $comment   = isset($data['comment']) && is_string($data['comment']) ? $data['comment'] : null;
        $speciality = isset($data['speciality']) && is_string($data['speciality']) && $data['speciality'] !== ''
            ? $data['speciality']
            : null;

        return new self(
            title: trim($data['title']),
            dateOfStart: $data['dateOfStart'],
            dateOfEnd: $data['dateOfEnd'],
            location: trim($data['location']),
            period: $period,
            comment: $comment,
            speciality: $speciality,
        );
    }
}
