<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Input DTO for POST /api/hospital-admin/setup/{token}.
 * Validates the payload used to activate a HospitalAdmin account.
 */
final class HospitalAdminSetupInputDTO
{
    private function __construct(
        public readonly string $password,
        public readonly string $firstname,
        public readonly string $lastname,
    ) {
    }

    /** @throws \InvalidArgumentException */
    public static function fromRequest(Request $request): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }

        foreach (['password', 'firstname', 'lastname'] as $field) {
            if (empty($data[$field]) || ! is_string($data[$field])) {
                throw new \InvalidArgumentException("Missing or invalid required field: $field");
            }
        }

        if (strlen($data['password']) < 8) {
            throw new \InvalidArgumentException('Password must be at least 8 characters');
        }

        return new self(
            password: $data['password'],
            firstname: trim($data['firstname']),
            lastname: trim($data['lastname']),
        );
    }
}
