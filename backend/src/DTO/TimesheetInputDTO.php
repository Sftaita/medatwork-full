<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for POST /api/residents/timesheets/addRecord
 * and PUT /api/residents/timesheets/update/{id}.
 *
 * Centralises JSON decoding and input validation so controllers
 * never access raw $data['key'] directly.
 */
final class TimesheetInputDTO
{
    private function __construct(
        public readonly int $yearId,
        public readonly string $dateOfStart,
        public readonly string $dateOfEnd,
        public readonly int $pause,
        public readonly int $scientific,
        public readonly bool $called,
    ) {
    }

    /**
     * @throws \InvalidArgumentException when any field is missing or has an invalid type/value
     */
    public static function fromRequest(Request $request): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }

        foreach (['year', 'dateOfStart', 'dateOfEnd', 'pause', 'scientific', 'called'] as $field) {
            if (! array_key_exists($field, $data)) {
                throw new \InvalidArgumentException("Missing required field: $field");
            }
        }

        if (! is_int($data['year']) || $data['year'] <= 0) {
            throw new \InvalidArgumentException('year must be a positive integer');
        }

        if (! is_string($data['dateOfStart']) || strtotime($data['dateOfStart']) === false) {
            throw new \InvalidArgumentException('dateOfStart must be a valid date string');
        }

        if (! is_string($data['dateOfEnd']) || strtotime($data['dateOfEnd']) === false) {
            throw new \InvalidArgumentException('dateOfEnd must be a valid date string');
        }

        if (! is_int($data['pause']) || $data['pause'] < 0) {
            throw new \InvalidArgumentException('pause must be a non-negative integer (minutes)');
        }

        if (! is_int($data['scientific']) || $data['scientific'] < 0) {
            throw new \InvalidArgumentException('scientific must be a non-negative integer (minutes)');
        }

        if (! is_bool($data['called'])) {
            throw new \InvalidArgumentException('called must be a boolean');
        }

        return new self(
            yearId: $data['year'],
            dateOfStart: $data['dateOfStart'],
            dateOfEnd: $data['dateOfEnd'],
            pause: $data['pause'],
            scientific: $data['scientific'],
            called: $data['called'],
        );
    }
}
