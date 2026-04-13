<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for batch validation endpoints (gardes, absences, timesheets).
 *
 * Each endpoint uses a different field name for the ID array (gardeIds, absenceIds,
 * timesheetIds), so the caller passes the expected field name to fromRequest().
 */
final class ValidationBatchInputDTO
{
    private function __construct(
        /** @var int[] */
        public readonly array $ids,
        /** true → validate (isEditable = false), false → invalidate (isEditable = true) */
        public readonly bool $isValidate,
    ) {
    }

    /**
     * @param string $idsField  The JSON key that holds the array of IDs (e.g. 'gardeIds').
     * @throws \InvalidArgumentException when any field is missing or has an invalid type/value.
     */
    public static function fromRequest(Request $request, string $idsField): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }

        if (! array_key_exists($idsField, $data)) {
            throw new \InvalidArgumentException("Missing required field: $idsField");
        }

        if (! array_key_exists('status', $data)) {
            throw new \InvalidArgumentException('Missing required field: status');
        }

        if (! is_array($data[$idsField])) {
            throw new \InvalidArgumentException("$idsField must be an array");
        }

        foreach ($data[$idsField] as $id) {
            if (! is_int($id)) {
                throw new \InvalidArgumentException("All $idsField must be integers");
            }
        }

        if ($data['status'] !== 'validate' && $data['status'] !== 'invalidate') {
            throw new \InvalidArgumentException('status must be "validate" or "invalidate"');
        }

        return new self(
            ids: $data[$idsField],
            isValidate: $data['status'] === 'validate',
        );
    }
}
