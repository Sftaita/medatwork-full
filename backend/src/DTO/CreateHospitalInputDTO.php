<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for POST /api/admin/hospitals.
 */
final class CreateHospitalInputDTO
{
    private function __construct(
        public readonly string  $name,
        public readonly ?string $city,
        public readonly string  $country,
    ) {
    }

    public static function fromRequest(Request $request): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }

        if (! array_key_exists('name', $data)) {
            throw new \InvalidArgumentException('Missing required field: name');
        }

        if (! is_string($data['name']) || trim($data['name']) === '') {
            throw new \InvalidArgumentException('name must be a non-empty string');
        }

        if (strlen($data['name']) > 150) {
            throw new \InvalidArgumentException('name must not exceed 150 characters');
        }

        $city = null;
        if (array_key_exists('city', $data)) {
            if (! is_string($data['city'])) {
                throw new \InvalidArgumentException('city must be a string');
            }
            $city = trim($data['city']) !== '' ? trim($data['city']) : null;
        }

        $country = 'BE';
        if (array_key_exists('country', $data)) {
            if (! is_string($data['country']) || strlen(trim($data['country'])) !== 2) {
                throw new \InvalidArgumentException('country must be a 2-letter ISO code');
            }
            $country = strtoupper(trim($data['country']));
        }

        return new self(
            name: trim($data['name']),
            city: $city,
            country: $country,
        );
    }
}
