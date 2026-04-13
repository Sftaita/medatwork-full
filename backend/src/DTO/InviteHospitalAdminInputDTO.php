<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for POST /api/admin/hospitals/{id}/admins.
 */
final class InviteHospitalAdminInputDTO
{
    private function __construct(
        public readonly string $email,
    ) {
    }

    public static function fromRequest(Request $request): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }

        if (! array_key_exists('email', $data)) {
            throw new \InvalidArgumentException('Missing required field: email');
        }

        $email = strtolower(trim($data['email']));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('email must be a valid email address');
        }

        return new self(email: $email);
    }
}
