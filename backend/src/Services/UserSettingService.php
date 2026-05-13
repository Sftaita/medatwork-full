<?php

declare(strict_types=1);

namespace App\Services;

use App\Entity\AppAdmin;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\Resident;
use App\Repository\UserSettingRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Manages persistent user preferences.
 *
 * - Settings are stored as a JSON blob per (userType × userId).
 * - GET always merges stored values with defaults (new keys appear automatically).
 * - PATCH does a recursive merge: user values override defaults, patch overrides user.
 */
class UserSettingService
{
    public function __construct(
        private readonly UserSettingRepository $repo,
        private readonly EntityManagerInterface $em,
    ) {
    }

    // ── Defaults ──────────────────────────────────────────────────────────────

    public function getDefaults(): array
    {
        return [
            'theme'    => 'light',
            'language' => 'fr',
            'calendar' => [
                'defaultView'  => 'month',
                'showWeekends' => true,
            ],
            'notifications' => [
                'email'        => true,
                'push'         => true,
                'compliance'   => true,
                'dailySummary' => false,
            ],
        ];
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    /**
     * Returns user settings merged with defaults.
     * Missing keys always fall back to defaults — no stale data possible.
     */
    public function getForUser(string $userType, int $userId): array
    {
        $setting = $this->repo->findByUser($userType, $userId);
        return array_replace_recursive($this->getDefaults(), $setting?->getSettings() ?? []);
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /**
     * Merges a validated patch into the existing settings and persists.
     * Returns the full merged settings (defaults + stored + patch).
     */
    public function patchForUser(string $userType, int $userId, array $patch): array
    {
        $setting = $this->repo->getOrCreate($userType, $userId, $this->getDefaults());
        $merged  = array_replace_recursive($setting->getSettings(), $patch);
        $setting->setSettings($merged);
        $this->em->flush();

        return array_replace_recursive($this->getDefaults(), $merged);
    }

    // ── User identity resolution ──────────────────────────────────────────────

    /**
     * Resolves (userType, userId) from any authenticated entity.
     *
     * @return array{string, int}
     * @throws \RuntimeException if the user type is unrecognised
     */
    public function resolveIdentity(object $user): array
    {
        return match (true) {
            $user instanceof Resident      => ['resident',       (int) $user->getId()],
            $user instanceof Manager       => ['manager',        (int) $user->getId()],
            $user instanceof HospitalAdmin => ['hospital_admin', (int) $user->getId()],
            $user instanceof AppAdmin      => ['app_admin',      (int) $user->getId()],
            default                        => throw new \RuntimeException('Type utilisateur non reconnu'),
        };
    }
}
