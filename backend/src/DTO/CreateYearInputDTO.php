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
        public readonly string  $title,
        public readonly string  $comment,
        public readonly string  $location,
        public readonly string  $dateOfStart,
        public readonly string  $dateOfEnd,
        public readonly string  $period,
        public readonly string  $speciality,
        public readonly bool    $isMaster,
        public readonly ?int    $hospitalId,
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

        foreach (['title', 'dateOfStart', 'dateOfEnd', 'speciality', 'isMaster'] as $field) {
            if (! array_key_exists($field, $data)) {
                throw new \InvalidArgumentException("Missing required field: $field");
            }
        }

        foreach (['title', 'dateOfStart', 'dateOfEnd', 'speciality'] as $field) {
            if (! is_string($data[$field]) || $data[$field] === '') {
                throw new \InvalidArgumentException("$field must be a non-empty string");
            }
        }

        if (! is_bool($data['isMaster'])) {
            throw new \InvalidArgumentException('isMaster must be a boolean');
        }

        // hospitalId is optional (null = no hospital link)
        $hospitalId = isset($data['hospitalId']) && is_numeric($data['hospitalId'])
            ? (int) $data['hospitalId']
            : null;

        // location: use hospitalId lookup on the frontend, or fallback to explicit location string
        $location = isset($data['location']) && is_string($data['location']) && $data['location'] !== ''
            ? $data['location']
            : '';

        return new self(
            title: $data['title'],
            comment: isset($data['comment']) && is_string($data['comment']) ? $data['comment'] : '',
            location: $location,
            dateOfStart: $data['dateOfStart'],
            dateOfEnd: $data['dateOfEnd'],
            period: isset($data['period']) && is_string($data['period']) ? $data['period'] : '',
            speciality: $data['speciality'],
            isMaster: $data['isMaster'],
            hospitalId: $hospitalId,
        );
    }
}
