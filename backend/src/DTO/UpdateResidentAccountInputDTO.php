<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for PUT /api/residents/update.
 *
 * The endpoint receives a single-field patch: a `target` identifying which
 * property to update, and a `newValue` with the replacement value.
 */
final class UpdateResidentAccountInputDTO
{
    private const ALLOWED_TARGETS = [
        'firstname',
        'lastname',
        'sexe',
        'dateOfMaster',
        'speciality',
        'dateOfBirth',
        'university',
    ];

    private function __construct(
        public readonly string $target,
        public readonly string $newValue,
    ) {
    }

    /**
     * @throws \InvalidArgumentException when any field is missing or invalid.
     */
    public static function fromRequest(Request $request): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }

        foreach (['target', 'newValue'] as $field) {
            if (! array_key_exists($field, $data)) {
                throw new \InvalidArgumentException("Missing required field: $field");
            }
        }

        if (! is_string($data['target'])) {
            throw new \InvalidArgumentException('target must be a string');
        }

        if (! in_array($data['target'], self::ALLOWED_TARGETS, true)) {
            $valid = implode(', ', self::ALLOWED_TARGETS);
            throw new \InvalidArgumentException("target must be one of: $valid");
        }

        if (! is_string($data['newValue'])) {
            throw new \InvalidArgumentException('newValue must be a string');
        }

        return new self(
            target: $data['target'],
            newValue: $data['newValue'],
        );
    }
}
