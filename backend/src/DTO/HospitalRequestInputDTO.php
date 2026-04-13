<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Typed input DTO for POST /api/hospital-requests.
 */
final class HospitalRequestInputDTO
{
    private function __construct(
        public readonly string $hospitalName,
    ) {
    }

    public static function fromRequest(Request $request): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }

        if (! array_key_exists('hospitalName', $data)) {
            throw new \InvalidArgumentException('Missing required field: hospitalName');
        }

        if (! is_string($data['hospitalName']) || trim($data['hospitalName']) === '') {
            throw new \InvalidArgumentException('hospitalName must be a non-empty string');
        }

        if (strlen($data['hospitalName']) > 150) {
            throw new \InvalidArgumentException('hospitalName must not exceed 150 characters');
        }

        return new self(hospitalName: trim($data['hospitalName']));
    }
}
