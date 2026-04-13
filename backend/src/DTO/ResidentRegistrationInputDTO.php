<?php

declare(strict_types=1);

namespace App\DTO;

use App\Enum\Sexe;
use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for POST /api/create/newResident.
 */
final class ResidentRegistrationInputDTO
{
    private function __construct(
        public readonly string $email,
        public readonly string $password,
        public readonly string $firstname,
        public readonly string $lastname,
        public readonly string $role,
        public readonly Sexe $sexe,
        public readonly string $speciality,
        public readonly string $dateOfMaster,
        public readonly ?string $university,
    ) {
    }

    /**
     * @throws \InvalidArgumentException when any field is missing or has an invalid type/value.
     */
    public static function fromRequest(Request $request): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }

        foreach (['email', 'password', 'firstname', 'lastname', 'role', 'sexe', 'speciality', 'dateOfMaster'] as $field) {
            if (! array_key_exists($field, $data)) {
                throw new \InvalidArgumentException("Missing required field: $field");
            }
        }

        if (! is_string($data['email']) || ! filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('email must be a valid email address');
        }

        if (! is_string($data['password']) || strlen($data['password']) < 8) {
            throw new \InvalidArgumentException('password must be at least 8 characters');
        }

        foreach (['firstname', 'lastname', 'role', 'speciality'] as $field) {
            if (! is_string($data[$field]) || $data[$field] === '') {
                throw new \InvalidArgumentException("$field must be a non-empty string");
            }
        }

        $sexe = Sexe::tryFrom($data['sexe'] ?? '');
        if ($sexe === null) {
            $valid = implode(', ', array_column(Sexe::cases(), 'value'));
            throw new \InvalidArgumentException("sexe must be one of: $valid");
        }

        if (! is_string($data['dateOfMaster']) || strtotime($data['dateOfMaster']) === false) {
            throw new \InvalidArgumentException('dateOfMaster must be a valid date string');
        }

        $university = isset($data['university']) && is_string($data['university']) && $data['university'] !== ''
            ? $data['university']
            : null;

        return new self(
            email: strtolower($data['email']),
            password: $data['password'],
            firstname: $data['firstname'],
            lastname: $data['lastname'],
            role: $data['role'],
            sexe: $sexe,
            speciality: $data['speciality'],
            dateOfMaster: $data['dateOfMaster'],
            university: $university,
        );
    }
}
