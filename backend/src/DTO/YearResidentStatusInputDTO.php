<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for POST /api/managers/residentValidation.
 */
final class YearResidentStatusInputDTO
{
    private function __construct(
        public readonly int $yearId,
        public readonly int $residentId,
        public readonly bool $status,
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

        foreach (['yearId', 'residentId', 'status'] as $field) {
            if (! array_key_exists($field, $data)) {
                throw new \InvalidArgumentException("Missing required field: $field");
            }
        }

        if (! is_int($data['yearId']) || $data['yearId'] <= 0) {
            throw new \InvalidArgumentException('yearId must be a positive integer');
        }

        if (! is_int($data['residentId']) || $data['residentId'] <= 0) {
            throw new \InvalidArgumentException('residentId must be a positive integer');
        }

        if (! is_bool($data['status'])) {
            throw new \InvalidArgumentException('status must be a boolean');
        }

        return new self(
            yearId: $data['yearId'],
            residentId: $data['residentId'],
            status: $data['status'],
        );
    }
}
