<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Single source of truth for the current CGU version.
 * Bump CGU_VERSION whenever the Terms of Service change.
 * All authenticated users whose accepted version differs will be prompted to re-accept.
 */
final class CguService
{
    public const CGU_VERSION = '2026.1';

    public static function isAccepted(?array $settings): bool
    {
        return ($settings['cgv']['acceptedVersion'] ?? null) === self::CGU_VERSION;
    }

    public static function acceptPatch(): array
    {
        return ['cgv' => ['acceptedVersion' => self::CGU_VERSION]];
    }
}
