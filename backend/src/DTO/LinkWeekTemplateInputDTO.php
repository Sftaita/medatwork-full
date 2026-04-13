<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for POST /api/managers/year/weektemplateLink.
 */
final class LinkWeekTemplateInputDTO
{
    private function __construct(
        public readonly int   $yearId,
        /** @var int[] */
        public readonly array $weekTemplateIds,
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

        if (! array_key_exists('yearId', $data)) {
            throw new \InvalidArgumentException('Missing required field: yearId');
        }

        if (! array_key_exists('weekTemplateIds', $data)) {
            throw new \InvalidArgumentException('Missing required field: weekTemplateIds');
        }

        if (! is_int($data['yearId']) || $data['yearId'] <= 0) {
            throw new \InvalidArgumentException('yearId must be a positive integer');
        }

        $weekTemplateIds = $data['weekTemplateIds'];

        if (! is_array($weekTemplateIds) || count($weekTemplateIds) === 0) {
            throw new \InvalidArgumentException('weekTemplateIds must be a non-empty array');
        }

        foreach ($weekTemplateIds as $id) {
            if (! is_int($id) || $id <= 0) {
                throw new \InvalidArgumentException('weekTemplateIds must contain only positive integers');
            }
        }

        return new self(
            yearId: $data['yearId'],
            weekTemplateIds: $weekTemplateIds,
        );
    }
}
