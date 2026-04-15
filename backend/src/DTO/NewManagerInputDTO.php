<?php

declare(strict_types=1);

namespace App\DTO;

use App\Enum\Sexe;
use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for POST /api/create/newManager.
 *
 * hospitalId is optional: the manager may submit a hospital request separately.
 */
final class NewManagerInputDTO
{
    private function __construct(
        public readonly string  $email,
        public readonly string  $password,
        public readonly string  $firstname,
        public readonly string  $lastname,
        public readonly Sexe    $sexe,
        public readonly string  $job,
        public readonly ?int    $hospitalId,
        public readonly ?string $hospitalName,
    ) {
    }

    /**
     * @throws \InvalidArgumentException when any required field is missing or invalid.
     */
    public static function fromRequest(Request $request): self
    {
        // Support both JSON and multipart/form-data (multipart is used when an avatar file is included)
        $isMultipart = str_contains($request->headers->get('Content-Type', ''), 'multipart');
        $data = $isMultipart
            ? $request->request->all()
            : json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }

        foreach (['email', 'password', 'firstname', 'lastname', 'sexe', 'job'] as $field) {
            if (! array_key_exists($field, $data)) {
                throw new \InvalidArgumentException("Missing required field: $field");
            }
        }

        foreach (['firstname', 'lastname', 'sexe', 'job'] as $field) {
            if (! is_string($data[$field]) || $data[$field] === '') {
                throw new \InvalidArgumentException("$field must be a non-empty string");
            }
        }

        if (! is_string($data['password']) || strlen($data['password']) < 8) {
            throw new \InvalidArgumentException('password must be at least 8 characters');
        }

        if (! filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('email must be a valid email address');
        }

        $sexe = Sexe::tryFrom($data['sexe']);
        if ($sexe === null) {
            throw new \InvalidArgumentException('sexe must be one of: male, female');
        }

        $hospitalId   = null;
        $hospitalName = null;

        if (array_key_exists('hospitalId', $data) && $data['hospitalId'] !== null && $data['hospitalId'] !== '') {
            $hid = filter_var($data['hospitalId'], FILTER_VALIDATE_INT);
            if ($hid === false || $hid <= 0) {
                throw new \InvalidArgumentException('hospitalId must be a positive integer');
            }
            $hospitalId = $hid;
        }

        if (array_key_exists('hospitalName', $data) && $data['hospitalName'] !== null) {
            if (! is_string($data['hospitalName']) || trim($data['hospitalName']) === '') {
                throw new \InvalidArgumentException('hospitalName must be a non-empty string');
            }
            if (strlen($data['hospitalName']) > 150) {
                throw new \InvalidArgumentException('hospitalName must not exceed 150 characters');
            }
            $hospitalName = trim($data['hospitalName']);
        }

        if ($hospitalId !== null && $hospitalName !== null) {
            throw new \InvalidArgumentException('Provide either hospitalId or hospitalName, not both');
        }

        return new self(
            email: strtolower($data['email']),
            password: $data['password'],
            firstname: $data['firstname'],
            lastname: $data['lastname'],
            sexe: $sexe,
            job: $data['job'],
            hospitalId: $hospitalId,
            hospitalName: $hospitalName,
        );
    }
}
