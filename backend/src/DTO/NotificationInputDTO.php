<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for notification creation endpoints.
 */
final class NotificationInputDTO
{
    private function __construct(
        public readonly ?string $object,
        public readonly ?string $body,
        public readonly ?string $type,
    ) {
    }

    /**
     * @throws \InvalidArgumentException when JSON is invalid.
     */
    public static function fromRequest(Request $request): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }

        return new self(
            object: isset($data['object']) && is_string($data['object']) ? $data['object'] : null,
            body:   isset($data['body'])   && is_string($data['body']) ? $data['body'] : null,
            type:   isset($data['type'])   && is_string($data['type']) ? $data['type'] : null,
        );
    }
}
