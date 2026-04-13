<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for PUT /api/managers/years/update.
 */
final class UpdateYearInputDTO
{
    private function __construct(
        public readonly int $yearId,
        public readonly string $target,
        public readonly mixed $newValue,
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

        if (! isset($data['yearId']) || ! is_int($data['yearId'])) {
            throw new \InvalidArgumentException('yearId must be an integer');
        }

        if (! isset($data['target']) || ! is_string($data['target']) || $data['target'] === '') {
            throw new \InvalidArgumentException('target must be a non-empty string');
        }

        if (! array_key_exists('newValue', $data)) {
            throw new \InvalidArgumentException('Missing required field: newValue');
        }

        return new self(
            yearId:   $data['yearId'],
            target:   $data['target'],
            newValue: $data['newValue'],
        );
    }
}
