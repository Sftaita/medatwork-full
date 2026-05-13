<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Validates a partial PATCH body for user settings.
 *
 * Only known top-level keys are accepted; unknown keys are rejected.
 * Within nested objects, only known sub-keys are kept (unknown ignored).
 * All provided values are type-checked.
 *
 * Allowed structure:
 * {
 *   "theme":    "light"|"dark",
 *   "language": "fr"|"nl"|"en",
 *   "calendar": {
 *     "defaultView":   "month"|"week"|"day"|"list",
 *     "showWeekends":  bool
 *   },
 *   "notifications": {
 *     "email":        bool,
 *     "push":         bool,
 *     "compliance":   bool,
 *     "dailySummary": bool
 *   }
 * }
 */
final class UserSettingPatchInputDTO
{
    private function __construct(
        public readonly array $patch,
    ) {
    }

    public static function fromRequest(Request $request): self
    {
        $data = json_decode($request->getContent(), true);

        if (! is_array($data) || empty($data)) {
            throw new \InvalidArgumentException('Corps JSON invalide ou vide');
        }

        $knownTopKeys = ['theme', 'language', 'calendar', 'notifications'];
        $unknownKeys  = array_diff(array_keys($data), $knownTopKeys);
        if (! empty($unknownKeys)) {
            throw new \InvalidArgumentException(
                'Clés inconnues : ' . implode(', ', $unknownKeys)
            );
        }

        $patch = [];

        // ── theme ─────────────────────────────────────────────────────────────
        if (array_key_exists('theme', $data)) {
            if (! in_array($data['theme'], ['light', 'dark'], true)) {
                throw new \InvalidArgumentException('theme doit être "light" ou "dark"');
            }
            $patch['theme'] = $data['theme'];
        }

        // ── language ──────────────────────────────────────────────────────────
        if (array_key_exists('language', $data)) {
            if (! in_array($data['language'], ['fr', 'nl', 'en'], true)) {
                throw new \InvalidArgumentException('language doit être "fr", "nl" ou "en"');
            }
            $patch['language'] = $data['language'];
        }

        // ── calendar ──────────────────────────────────────────────────────────
        if (array_key_exists('calendar', $data)) {
            if (! is_array($data['calendar'])) {
                throw new \InvalidArgumentException('calendar doit être un objet');
            }
            $cal = [];
            if (array_key_exists('defaultView', $data['calendar'])) {
                if (! in_array($data['calendar']['defaultView'], ['month', 'week', 'day', 'list'], true)) {
                    throw new \InvalidArgumentException('calendar.defaultView invalide');
                }
                $cal['defaultView'] = $data['calendar']['defaultView'];
            }
            if (array_key_exists('showWeekends', $data['calendar'])) {
                if (! is_bool($data['calendar']['showWeekends'])) {
                    throw new \InvalidArgumentException('calendar.showWeekends doit être un booléen');
                }
                $cal['showWeekends'] = $data['calendar']['showWeekends'];
            }
            if (! empty($cal)) {
                $patch['calendar'] = $cal;
            }
        }

        // ── notifications ─────────────────────────────────────────────────────
        if (array_key_exists('notifications', $data)) {
            if (! is_array($data['notifications'])) {
                throw new \InvalidArgumentException('notifications doit être un objet');
            }
            $notif = [];
            foreach (['email', 'push', 'compliance', 'dailySummary'] as $key) {
                if (array_key_exists($key, $data['notifications'])) {
                    if (! is_bool($data['notifications'][$key])) {
                        throw new \InvalidArgumentException("notifications.$key doit être un booléen");
                    }
                    $notif[$key] = $data['notifications'][$key];
                }
            }
            if (! empty($notif)) {
                $patch['notifications'] = $notif;
            }
        }

        if (empty($patch)) {
            throw new \InvalidArgumentException('Aucun champ valide à mettre à jour');
        }

        return new self($patch);
    }
}
