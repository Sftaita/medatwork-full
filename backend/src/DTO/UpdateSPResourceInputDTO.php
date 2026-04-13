<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for PUT /api/managers/updateSPRes.
 */
final class UpdateSPResourceInputDTO
{
    private function __construct(
        public readonly string $resourceId,
        public readonly string $workerHRID,
        public readonly string $sectionHRID,
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

        foreach (['resourceId', 'workerHRID', 'sectionHRID'] as $field) {
            if (! array_key_exists($field, $data)) {
                throw new \InvalidArgumentException("Missing required field: $field");
            }
        }

        if (! is_string($data['resourceId']) || strlen($data['resourceId']) > 9) {
            throw new \InvalidArgumentException('resourceId must be a string of at most 9 characters');
        }

        if (! is_string($data['workerHRID']) || strlen($data['workerHRID']) > 30) {
            throw new \InvalidArgumentException('workerHRID must be a string of at most 30 characters');
        }

        if (! is_string($data['sectionHRID']) || strlen($data['sectionHRID']) > 30) {
            throw new \InvalidArgumentException('sectionHRID must be a string of at most 30 characters');
        }

        return new self(
            resourceId: $data['resourceId'],
            workerHRID: $data['workerHRID'],
            sectionHRID: $data['sectionHRID'],
        );
    }
}
