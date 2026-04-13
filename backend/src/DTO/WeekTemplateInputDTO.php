<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for POST /api/managers/weekTemplate/create
 * and PUT /api/managers/weekTemplate/{id}.
 */
final class WeekTemplateInputDTO
{
    private function __construct(
        public readonly string $title,
        public readonly string $description,
        public readonly string $color,
    ) {
    }

    /**
     * @param string $defaultColor  Fallback when 'color' is absent (use '' to require color).
     * @throws \InvalidArgumentException when any required field is missing or invalid.
     */
    public static function fromRequest(Request $request, string $defaultColor = '#16b1ff'): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }

        foreach (['title', 'description'] as $field) {
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

        if ($defaultColor === '') {
            // color is required (update mode)
            if (! array_key_exists('color', $data)) {
                throw new \InvalidArgumentException('Missing required field: color');
            }
            if (! is_string($data['color']) || $data['color'] === '') {
                throw new \InvalidArgumentException('color must be a non-empty string');
            }
            $color = $data['color'];
        } else {
            // color is optional (create mode)
            $color = (isset($data['color']) && is_string($data['color']) && $data['color'] !== '')
                ? $data['color']
                : $defaultColor;
        }

        return new self(
            title: $data['title'],
            description: $data['description'],
            color: $color,
        );
    }
}
