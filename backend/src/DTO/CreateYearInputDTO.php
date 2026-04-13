<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for POST /api/managers/years/create.
 */
final class CreateYearInputDTO
{
    private function __construct(
        public readonly string $title,
        public readonly string $comment,
        public readonly string $location,
        public readonly string $dateOfStart,
        public readonly string $dateOfEnd,
        public readonly string $period,
        public readonly string $speciality,
        public readonly bool   $isMaster,
    ) {
    }

    /**
     * @throws \InvalidArgumentException when any required field is missing or invalid.
     */
    public static function fromRequest(Request $request): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }

        foreach (['title', 'comment', 'location', 'dateOfStart', 'dateOfEnd', 'period', 'speciality', 'isMaster'] as $field) {
            if (! array_key_exists($field, $data)) {
                throw new \InvalidArgumentException("Missing required field: $field");
            }
        }

        foreach (['title', 'location', 'dateOfStart', 'dateOfEnd', 'speciality'] as $field) {
            if (! is_string($data[$field]) || $data[$field] === '') {
                throw new \InvalidArgumentException("$field must be a non-empty string");
            }
        }

        foreach (['comment', 'period'] as $field) {
            if (! is_string($data[$field])) {
                throw new \InvalidArgumentException("$field must be a string");
            }
        }

        if (! is_bool($data['isMaster'])) {
            throw new \InvalidArgumentException('isMaster must be a boolean');
        }

        return new self(
            title: $data['title'],
            comment: $data['comment'],
            location: $data['location'],
            dateOfStart: $data['dateOfStart'],
            dateOfEnd: $data['dateOfEnd'],
            period: $data['period'],
            speciality: $data['speciality'],
            isMaster: $data['isMaster'],
        );
    }
}
