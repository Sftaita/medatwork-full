<?php

declare(strict_types=1);

namespace App\Services;

use App\Entity\Years;

/**
 * Porte d'entrée obligatoire pour toute décision d'envoi de notification.
 *
 * Règle : shouldSend = global[channel] AND annual[event][channel]
 *
 * Toute classe qui envoie une notification DOIT injecter ce service
 * et appeler shouldSend() avant tout persist() de notification.
 * L'ArchitectureTest vérifie cette contrainte automatiquement.
 */
class NotificationDecisionService
{
    public function __construct(
        private readonly UserSettingService   $settingService,
        private readonly YearNotifPrefService $yearPrefService,
    ) {
    }

    /**
     * Retourne true uniquement si le canal est activé aux deux niveaux :
     *   1. Préférences globales utilisateur (UserSetting)
     *   2. Préférences annuelles personnelles (YearUserNotifPref)
     *
     * Les événements ou canaux inconnus retournent false (fail-safe).
     */
    public function shouldSend(
        string $userType,
        int    $userId,
        Years  $year,
        string $eventType,
        string $channel,
    ): bool {
        // 1. Préférence globale canal
        $globalSettings = $this->settingService->getForUser($userType, $userId);
        $globalEnabled  = (bool) ($globalSettings['notifications'][$channel] ?? false);

        if (!$globalEnabled) {
            return false;
        }

        // 2. Préférence annuelle event × canal
        $annualPrefs  = $this->yearPrefService->getForUser($userType, $userId, $year);
        $eventPrefs   = $annualPrefs[$eventType] ?? null;

        if ($eventPrefs === null) {
            // Événement absent des prefs ET absent des EVENT_DEFAULTS → fail-safe false
            return false;
        }

        return (bool) ($eventPrefs[$channel] ?? false);
    }
}
