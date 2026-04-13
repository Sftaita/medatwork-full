<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for POST /api/managers/validationStatus.
 */
final class MonthValidationStatusInputDTO
{
    private function __construct(
        public readonly int $periodId,
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

        foreach (['periodId', 'status'] as $field) {
            if (! array_key_exists($field, $data)) {
                throw new \InvalidArgumentException("Missing required field: $field");
            }
        }

        if (! is_int($data['periodId']) || $data['periodId'] <= 0) {
            throw new \InvalidArgumentException('periodId must be a positive integer');
        }

        if (! is_bool($data['status'])) {
            throw new \InvalidArgumentException('status must be a boolean');
        }

        return new self(
            periodId: $data['periodId'],
            status: $data['status'],
        );
    }
}
