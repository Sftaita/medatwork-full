<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed DTO for endpoints that accept a JSON array of positive integer IDs
 * under a configurable field name (e.g. periodsId, periodValidationArray).
 */
final class IntegerIdsInputDTO
{
    private function __construct(
        /** @var int[] */
        public readonly array $ids,
    ) {
    }

    /**
     * @param string $field  The JSON key that holds the array (e.g. 'periodsId').
     * @throws \InvalidArgumentException on invalid JSON or invalid array contents.
     */
    public static function fromRequest(Request $request, string $field): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }

        if (! array_key_exists($field, $data)) {
            throw new \InvalidArgumentException("Missing required field: $field");
        }

        $ids = $data[$field];

        if (! is_array($ids) || count($ids) === 0) {
            throw new \InvalidArgumentException("$field must be a non-empty array");
        }

        foreach ($ids as $id) {
            if (! is_int($id) || $id <= 0) {
                throw new \InvalidArgumentException("$field must contain only positive integers");
            }
        }

        return new self(ids: $ids);
    }
}
