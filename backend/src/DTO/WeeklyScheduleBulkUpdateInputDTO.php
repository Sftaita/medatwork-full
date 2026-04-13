<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for PUT /api/managers/residentWeeklySchedule/update/{yearId}.
 */
final class WeeklyScheduleBulkUpdateInputDTO
{
    /** @param array<int, array<string, mixed>> $schedules */
    private function __construct(
        public readonly array $schedules,
    ) {
    }

    /**
     * @throws \InvalidArgumentException when the body is not a JSON array.
     */
    public static function fromRequest(Request $request): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Request body must be a JSON array of schedules');
        }

        return new self(schedules: $data);
    }
}
