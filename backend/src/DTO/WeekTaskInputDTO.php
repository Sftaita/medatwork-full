<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for POST /api/managers/weekTask/create
 * and PUT /api/managers/weekTask/{id}.
 *
 * weekTemplateId is only present on create (null on update).
 */
final class WeekTaskInputDTO
{
    private function __construct(
        public readonly string $title,
        public readonly string $description,
        public readonly int $dayOfWeek,
        public readonly string $startTime,
        public readonly string $endTime,
        public readonly ?int $weekTemplateId,
    ) {
    }

    /**
     * @param bool $requireTemplateId  true for create, false for update.
     * @throws \InvalidArgumentException when any required field is missing or invalid.
     */
    public static function fromRequest(Request $request, bool $requireTemplateId = false): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }

        $required = ['title', 'description', 'dayOfWeek', 'startTime', 'endTime'];
        if ($requireTemplateId) {
            $required[] = 'weekTemplateId';
        }

        foreach ($required as $field) {
            if (! array_key_exists($field, $data)) {
                throw new \InvalidArgumentException("Missing required field: $field");
            }
        }

        if (! is_string($data['title']) || $data['title'] === '') {
            throw new \InvalidArgumentException('title must be a non-empty string');
        }

        if (! is_string($data['description'])) {
            throw new \InvalidArgumentException('description must be a string');
        }

        if (! is_int($data['dayOfWeek']) || $data['dayOfWeek'] < 1 || $data['dayOfWeek'] > 7) {
            throw new \InvalidArgumentException('dayOfWeek must be an integer between 1 and 7');
        }

        foreach (['startTime', 'endTime'] as $field) {
            if (! is_string($data[$field]) || $data[$field] === '') {
                throw new \InvalidArgumentException("$field must be a non-empty string");
            }
        }

        $weekTemplateId = null;
        if ($requireTemplateId) {
            if (! is_int($data['weekTemplateId']) || $data['weekTemplateId'] <= 0) {
                throw new \InvalidArgumentException('weekTemplateId must be a positive integer');
            }
            $weekTemplateId = $data['weekTemplateId'];
        }

        return new self(
            title: $data['title'],
            description: $data['description'],
            dayOfWeek: $data['dayOfWeek'],
            startTime: $data['startTime'],
            endTime: $data['endTime'],
            weekTemplateId: $weekTemplateId,
        );
    }
}
