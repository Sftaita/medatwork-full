<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for POST /api/managers/years/addManager.
 */
final class AddManagerInputDTO
{
    private function __construct(
        public readonly int  $year,
        public readonly int  $guest,
        public readonly bool $dataAccess,
        public readonly bool $dataValidation,
        public readonly bool $dataDownload,
        public readonly bool $admin,
        public readonly bool $agenda,
        public readonly bool $schedule,
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

        foreach (['year', 'guest', 'dataAccess', 'dataValidation', 'dataDownload', 'admin', 'agenda', 'schedule'] as $field) {
            if (! array_key_exists($field, $data)) {
                throw new \InvalidArgumentException("Missing required field: $field");
            }
        }

        foreach (['year', 'guest'] as $field) {
            if (! is_int($data[$field]) || $data[$field] <= 0) {
                throw new \InvalidArgumentException("$field must be a positive integer");
            }
        }

        foreach (['dataAccess', 'dataValidation', 'dataDownload', 'admin', 'agenda', 'schedule'] as $field) {
            if (! is_bool($data[$field])) {
                throw new \InvalidArgumentException("$field must be a boolean");
            }
        }

        return new self(
            year: $data['year'],
            guest: $data['guest'],
            dataAccess: $data['dataAccess'],
            dataValidation: $data['dataValidation'],
            dataDownload: $data['dataDownload'],
            admin: $data['admin'],
            agenda: $data['agenda'],
            schedule: $data['schedule'],
        );
    }
}
