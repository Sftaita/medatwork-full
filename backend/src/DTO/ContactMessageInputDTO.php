<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for POST /api/contactUs.
 */
final class ContactMessageInputDTO
{
    private function __construct(
        public readonly string $lastname,
        public readonly string $firstname,
        public readonly string $email,
        public readonly string $message,
    ) {
    }

    /**
     * @throws \InvalidArgumentException when any field is missing or invalid.
     */
    public static function fromRequest(Request $request): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }

        foreach (['lastname', 'firstname', 'email', 'message'] as $field) {
            if (! array_key_exists($field, $data)) {
                throw new \InvalidArgumentException("Missing required field: $field");
            }
        }

        foreach (['lastname', 'firstname', 'message'] as $field) {
            if (! is_string($data[$field]) || trim($data[$field]) === '') {
                throw new \InvalidArgumentException("$field must be a non-empty string");
            }
        }

        if (mb_strlen($data['lastname'])  > 100) throw new \InvalidArgumentException('lastname is too long');
        if (mb_strlen($data['firstname']) > 100) throw new \InvalidArgumentException('firstname is too long');
        if (mb_strlen($data['message'])   > 5000) throw new \InvalidArgumentException('message is too long (max 5000 characters)');

        if (! is_string($data['email']) || ! filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('email must be a valid email address');
        }

        return new self(
            lastname: trim($data['lastname']),
            firstname: trim($data['firstname']),
            email: trim($data['email']),
            message: trim($data['message']),
        );
    }
}
