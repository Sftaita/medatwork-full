<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for POST /api/managers/managerCalendar/addEvent.
 */
final class AddCalendarEventInputDTO
{
    private function __construct(
        public readonly int $yearId,
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

        if (! isset($data['yearId']) || ! is_int($data['yearId'])) {
            throw new \InvalidArgumentException('yearId must be an integer');
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
            yearId:      $data['yearId'],
            residentId:  $data['residentId'],
            dateOfStart: $data['dateOfStart'],
            dateOfEnd:   $data['dateOfEnd'],
            title:       $data['title'],
            description: isset($data['description']) && is_string($data['description']) ? $data['description'] : null,
        );
    }
}
