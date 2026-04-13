<?php

declare(strict_types=1);

namespace App\DTO;

use App\Enum\AbsenceType;
use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for POST /api/residents/absences/addRecord.
 */
final class AbsenceInputDTO
{
    private function __construct(
        public readonly int $yearId,
        public readonly string $dateOfStart,
        public readonly ?string $dateOfEnd,
        public readonly AbsenceType $type,
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

        foreach (['year', 'dateOfStart', 'type'] as $field) {
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

        if (isset($data['dateOfEnd'])) {
            if (! is_string($data['dateOfEnd']) || strtotime($data['dateOfEnd']) === false) {
                throw new \InvalidArgumentException('dateOfEnd must be a valid date string or null');
            }
            $dateOfEnd = $data['dateOfEnd'];
        } else {
            $dateOfEnd = null;
        }

        $type = AbsenceType::tryFrom($data['type'] ?? '');
        if ($type === null) {
            $valid = implode(', ', array_column(AbsenceType::cases(), 'value'));
            throw new \InvalidArgumentException("type must be one of: $valid");
        }

        return new self(
            yearId: $data['year'],
            dateOfStart: $data['dateOfStart'],
            dateOfEnd: $dateOfEnd,
            type: $type,
        );
    }
}
