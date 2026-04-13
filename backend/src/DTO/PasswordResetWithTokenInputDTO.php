<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for POST /api/passwordResetWithToken.
 */
final class PasswordResetWithTokenInputDTO
{
    private function __construct(
        public readonly string $token,
        public readonly string $password,
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

        foreach (['token', 'password'] as $field) {
            if (! array_key_exists($field, $data)) {
                throw new \InvalidArgumentException("Missing required field: $field");
            }
        }

        if (! is_string($data['token']) || strlen($data['token']) !== 64) {
            throw new \InvalidArgumentException('token must be a 64-character hex string');
        }

        if (! is_string($data['password']) || $data['password'] === '') {
            throw new \InvalidArgumentException('password must be a non-empty string');
        }

        return new self(
            token: $data['token'],
            password: $data['password'],
        );
    }
}
