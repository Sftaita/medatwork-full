<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for endpoints that expect a year join token.
 * Used by POST /api/residents/years/joinYear and POST /api/residents/findByYearByToken.
 */
final class YearTokenInputDTO
{
    private function __construct(
        public readonly string $token,
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

        if (! array_key_exists('token', $data)) {
            throw new \InvalidArgumentException('Missing required field: token');
        }

        if (! is_string($data['token']) || $data['token'] === '') {
            throw new \InvalidArgumentException('token must be a non-empty string');
        }

        return new self(token: $data['token']);
    }
}
