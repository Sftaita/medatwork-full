<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for POST /api/passwordReset.
 */
final class PasswordResetRequestInputDTO
{
    private function __construct(
        public readonly string $email,
    ) {
    }

    /**
     * @throws \InvalidArgumentException when the body is invalid.
     */
    public static function fromRequest(Request $request): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }

        if (! array_key_exists('email', $data)) {
            throw new \InvalidArgumentException('Missing required field: email');
        }

        if (! is_string($data['email']) || ! filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('email must be a valid email address');
        }

        return new self(email: strtolower($data['email']));
    }
}
