<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for PUT /api/managers/updateYearResidents/{yearResidentId}.
 *
 * All fields are optional; at least one must be present.
 */
final class UpdateYearResidentInputDTO
{
    private function __construct(
        public readonly ?string $dateOfStart,
        public readonly ?bool   $optingOut,
        public readonly ?int    $legalLeaves,
        public readonly ?int    $scientificLeaves,
        public readonly ?int    $maternityLeaves,
        public readonly ?int    $paternityLeaves,
        public readonly ?int    $unpaidLeaves,
    ) {
    }

    /**
     * @throws \InvalidArgumentException when the body is not valid JSON, when no field is
     *                                   provided, or when a field has an unexpected type.
     */
    public static function fromRequest(Request $request): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }

        $knownFields = ['dateOfStart', 'optingOut', 'legalLeaves', 'scientificLeaves', 'maternityLeaves', 'paternityLeaves', 'unpaidLeaves'];
        $provided = array_intersect($knownFields, array_keys($data));

        if (count($provided) === 0) {
            throw new \InvalidArgumentException('At least one field must be provided');
        }

        // dateOfStart
        $dateOfStart = null;
        if (array_key_exists('dateOfStart', $data)) {
            if ($data['dateOfStart'] !== null && ! is_string($data['dateOfStart'])) {
                throw new \InvalidArgumentException('dateOfStart must be a string or null');
            }
            $dateOfStart = $data['dateOfStart'];
        }

        // optingOut
        $optingOut = null;
        if (array_key_exists('optingOut', $data)) {
            if ($data['optingOut'] !== null && ! is_bool($data['optingOut'])) {
                throw new \InvalidArgumentException('optingOut must be a boolean or null');
            }
            $optingOut = $data['optingOut'];
        }

        // integer leave fields
        $leaveFields = ['legalLeaves', 'scientificLeaves', 'maternityLeaves', 'paternityLeaves', 'unpaidLeaves'];
        $leaveValues = [];
        foreach ($leaveFields as $field) {
            $leaveValues[$field] = null;
            if (array_key_exists($field, $data)) {
                if ($data[$field] !== null && (! is_int($data[$field]) || $data[$field] < 0)) {
                    throw new \InvalidArgumentException("$field must be a non-negative integer or null");
                }
                $leaveValues[$field] = $data[$field];
            }
        }

        return new self(
            dateOfStart: $dateOfStart,
            optingOut: $optingOut,
            legalLeaves: $leaveValues['legalLeaves'],
            scientificLeaves: $leaveValues['scientificLeaves'],
            maternityLeaves: $leaveValues['maternityLeaves'],
            paternityLeaves: $leaveValues['paternityLeaves'],
            unpaidLeaves: $leaveValues['unpaidLeaves'],
        );
    }
}
