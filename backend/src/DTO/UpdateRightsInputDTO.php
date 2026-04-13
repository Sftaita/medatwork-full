<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for PUT /api/managers/updateRights.
 */
final class UpdateRightsInputDTO
{
    private function __construct(
        public readonly int  $managerYearId,
        public readonly bool $admin,
        public readonly bool $dataAccess,
        public readonly bool $dataValidation,
        public readonly bool $dataDownload,
        public readonly bool $canManageAgenda,
        public readonly bool $hasAgendaAccess,
    ) {
    }

    /**
     * @throws \InvalidArgumentException when any required field is missing or invalid.
     */
    public static function fromRequest(Request $request): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }

        if (! array_key_exists('managerYearId', $data)) {
            throw new \InvalidArgumentException('Missing required field: managerYearId');
        }

        if (! array_key_exists('newRights', $data)) {
            throw new \InvalidArgumentException('Missing required field: newRights');
        }

        if (! is_int($data['managerYearId']) || $data['managerYearId'] <= 0) {
            throw new \InvalidArgumentException('managerYearId must be a positive integer');
        }

        $newRights = $data['newRights'];

        if (! is_array($newRights)) {
            throw new \InvalidArgumentException('newRights must be an object');
        }

        return new self(
            managerYearId: $data['managerYearId'],
            admin: (bool) ($newRights['admin'] ?? false),
            dataAccess: (bool) ($newRights['dataAccess'] ?? false),
            dataValidation: (bool) ($newRights['dataValidation'] ?? false),
            dataDownload: (bool) ($newRights['dataDownload'] ?? false),
            canManageAgenda: (bool) ($newRights['canManageAgenda'] ?? false),
            hasAgendaAccess: (bool) ($newRights['hasAgendaAccess'] ?? false),
        );
    }
}
