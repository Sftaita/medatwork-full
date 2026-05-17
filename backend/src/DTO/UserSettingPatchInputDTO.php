<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * Validates a partial PATCH body for user settings.
 *
 * Security:
 * - JSON body limited to 4 096 bytes.
 * - Only known top-level keys are accepted; unknown keys are rejected (400).
 * - Nested objects are limited to depth 2 (top-level key → sub-key).
 * - All provided values are type-checked; wrong types are rejected (400).
 * - Unknown sub-keys are silently ignored (whitelist approach).
 *
 * Allowed structure:
 * {
 *   "theme":    "light"|"dark",
 *   "language": "fr"|"nl"|"en",
 *   "calendar": {
 *     "defaultView":   "month"|"week"|"day"|"list",
 *     "lastUsedView":  "month"|"week"|"day"|"list"|null,
 *     "showWeekends":  bool
 *   },
 *   "notifications": {
 *     "email":        bool,
 *     "push":         bool,
 *     "compliance":   bool,
 *     "dailySummary": bool,
 *     "validation":   bool,
 *     "planning":     bool,
 *     "staffPlanner": bool
 *   },
 *   "ui": {
 *     "sidebarCollapsed": bool
 *   },
 *   "tables": {
 *     "staffPlanner": {
 *       "pageSize": int (25|50|100|200),
 *       "dense":    bool
 *     }
 *   }
 * }
 */
final class UserSettingPatchInputDTO
{
    private const MAX_BODY_BYTES = 4096;

    private function __construct(
        public readonly array $patch,
    ) {
    }

    public static function fromRequest(Request $request): self
    {
        // ── Security: body size ───────────────────────────────────────────────
        $content = $request->getContent();
        if (strlen($content) > self::MAX_BODY_BYTES) {
            throw new \InvalidArgumentException(
                'Corps JSON trop volumineux (max ' . self::MAX_BODY_BYTES . ' octets)'
            );
        }

        $data = json_decode($content, true);

        if (! is_array($data) || empty($data)) {
            throw new \InvalidArgumentException('Corps JSON invalide ou vide');
        }

        // ── Security: known top-level keys only ───────────────────────────────
        $knownTopKeys = ['theme', 'language', 'calendar', 'notifications', 'ui', 'tables'];
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
            $validViews = ['month', 'week', 'day', 'list'];
            $cal = [];
            if (array_key_exists('defaultView', $data['calendar'])) {
                if (! in_array($data['calendar']['defaultView'], $validViews, true)) {
                    throw new \InvalidArgumentException('calendar.defaultView invalide');
                }
                $cal['defaultView'] = $data['calendar']['defaultView'];
            }
            if (array_key_exists('lastUsedView', $data['calendar'])) {
                $v = $data['calendar']['lastUsedView'];
                if ($v !== null && ! in_array($v, $validViews, true)) {
                    throw new \InvalidArgumentException('calendar.lastUsedView invalide');
                }
                $cal['lastUsedView'] = $v;
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
            $notifKeys = ['email', 'push', 'compliance', 'dailySummary', 'validation', 'planning', 'staffPlanner'];
            foreach ($notifKeys as $key) {
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

        // ── ui ────────────────────────────────────────────────────────────────
        if (array_key_exists('ui', $data)) {
            if (! is_array($data['ui'])) {
                throw new \InvalidArgumentException('ui doit être un objet');
            }
            $ui = [];
            if (array_key_exists('sidebarCollapsed', $data['ui'])) {
                if (! is_bool($data['ui']['sidebarCollapsed'])) {
                    throw new \InvalidArgumentException('ui.sidebarCollapsed doit être un booléen');
                }
                $ui['sidebarCollapsed'] = $data['ui']['sidebarCollapsed'];
            }
            if (! empty($ui)) {
                $patch['ui'] = $ui;
            }
        }

        // ── tables ────────────────────────────────────────────────────────────
        if (array_key_exists('tables', $data)) {
            if (! is_array($data['tables'])) {
                throw new \InvalidArgumentException('tables doit être un objet');
            }
            $tables = [];
            if (array_key_exists('staffPlanner', $data['tables'])) {
                if (! is_array($data['tables']['staffPlanner'])) {
                    throw new \InvalidArgumentException('tables.staffPlanner doit être un objet');
                }
                $sp = [];
                if (array_key_exists('pageSize', $data['tables']['staffPlanner'])) {
                    if (! in_array($data['tables']['staffPlanner']['pageSize'], [25, 50, 100, 200], true)) {
                        throw new \InvalidArgumentException('tables.staffPlanner.pageSize doit être 25, 50, 100 ou 200');
                    }
                    $sp['pageSize'] = $data['tables']['staffPlanner']['pageSize'];
                }
                if (array_key_exists('dense', $data['tables']['staffPlanner'])) {
                    if (! is_bool($data['tables']['staffPlanner']['dense'])) {
                        throw new \InvalidArgumentException('tables.staffPlanner.dense doit être un booléen');
                    }
                    $sp['dense'] = $data['tables']['staffPlanner']['dense'];
                }
                if (! empty($sp)) {
                    $tables['staffPlanner'] = $sp;
                }
            }
            if (! empty($tables)) {
                $patch['tables'] = $tables;
            }
        }

        if (empty($patch)) {
            throw new \InvalidArgumentException('Aucun champ valide à mettre à jour');
        }

        return new self($patch);
    }
}
