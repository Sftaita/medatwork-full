<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Validates a PATCH /api/profile/password body.
 *
 * Rules:
 * - currentPassword : required string
 * - newPassword     : min 8, max 150 characters
 * - confirmPassword : must equal newPassword (checked here to return 400 early)
 */
final class ProfilePasswordInputDTO
{
    private function __construct(
        public readonly string $currentPassword,
        public readonly string $newPassword,
    ) {
    }

    public static function fromRequest(Request $request): self
    {
        $data = json_decode($request->getContent(), true);
        if (! is_array($data)) {
            throw new \InvalidArgumentException('Corps JSON invalide');
        }

        foreach (['currentPassword', 'newPassword', 'confirmPassword'] as $key) {
            if (! array_key_exists($key, $data) || ! is_string($data[$key]) || $data[$key] === '') {
                throw new \InvalidArgumentException("Le champ $key est requis");
            }
        }

        if (strlen($data['newPassword']) < 8) {
            throw new \InvalidArgumentException('Le nouveau mot de passe doit contenir au minimum 8 caractères');
        }

        if (strlen($data['newPassword']) > 150) {
            throw new \InvalidArgumentException('Le nouveau mot de passe est trop long (max 150 caractères)');
        }

        if ($data['newPassword'] !== $data['confirmPassword']) {
            throw new \InvalidArgumentException('La confirmation du mot de passe ne correspond pas');
        }

        return new self($data['currentPassword'], $data['newPassword']);
    }
}
