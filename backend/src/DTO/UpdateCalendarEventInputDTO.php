<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for PUT /api/managers/managerCalendar/updateEvent.
 */
final class UpdateCalendarEventInputDTO
{
    private function __construct(
        public readonly int $residentYearCalendarId,
        public readonly int $residentId,
        public readonly string $dateOfStart,
        public readonly string $dateOfEnd,
        public readonly string $title,
        public readonly ?string $description,
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

        if (! isset($data['residentYearCalendarId']) || ! is_int($data['residentYearCalendarId'])) {
            throw new \InvalidArgumentException('residentYearCalendarId must be an integer');
        }

        if (! isset($data['residentId']) || ! is_int($data['residentId'])) {
            throw new \InvalidArgumentException('residentId must be an integer');
        }

        foreach (['dateOfStart', 'dateOfEnd', 'title'] as $field) {
            if (! isset($data[$field]) || ! is_string($data[$field]) || $data[$field] === '') {
                throw new \InvalidArgumentException("$field must be a non-empty string");
            }
        }

        return new self(
            residentYearCalendarId: $data['residentYearCalendarId'],
            residentId:             $data['residentId'],
            dateOfStart:            $data['dateOfStart'],
            dateOfEnd:              $data['dateOfEnd'],
            title:                  $data['title'],
            description:            isset($data['description']) && is_string($data['description']) ? $data['description'] : null,
        );
    }
}
