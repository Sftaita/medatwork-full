<?php

declare(strict_types=1);

namespace App\Services;

use App\Entity\Years;
use App\Repository\YearUserNotifPrefRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Gère les préférences personnelles de notification par année.
 *
 * Règles :
 *   - Une entrée par (userType × userId × year).
 *   - Lecture : merge(EVENT_DEFAULTS, stored) — clés manquantes = défaut.
 *   - Écriture : merge(existing, patch) — patch partiel.
 *   - Aucun userId dans le DTO — l'identité vient du JWT via resolveIdentity().
 */
class YearNotifPrefService
{
    // Canaux supportés (SMS et callRh stockés mais sans infra pour l'instant)
    public const KNOWN_CHANNELS = ['email', 'push', 'sms', 'callRh'];

    // Événements connus avec leurs valeurs par défaut par canal
    public const EVENT_DEFAULTS = [
        'COMPLIANCE_ALERT'         => ['email' => true,  'push' => true,  'sms' => false, 'callRh' => false],
        'MONTH_VALIDATION'         => ['email' => true,  'push' => false, 'sms' => false, 'callRh' => false],
        'STAFFPLANNER_EXPORT_DONE' => ['email' => true,  'push' => false, 'sms' => false, 'callRh' => false],
        'RESIDENT_INACTIVE'        => ['email' => true,  'push' => true,  'sms' => false, 'callRh' => false],
        'YEAR_ENDING'              => ['email' => true,  'push' => true,  'sms' => false, 'callRh' => false],
        'SCHEDULE_CHANGED'         => ['email' => false, 'push' => true,  'sms' => false, 'callRh' => false],
        'VALIDATION_REJECTED'      => ['email' => true,  'push' => true,  'sms' => false, 'callRh' => false],
        'REALTIME_REPORT'          => ['email' => true,  'push' => false, 'sms' => false, 'callRh' => false],
    ];

    public function __construct(
        private readonly YearUserNotifPrefRepository $repo,
        private readonly EntityManagerInterface      $em,
    ) {
    }

    /**
     * Retourne les prefs fusionnées avec EVENT_DEFAULTS.
     *
     * @return array<string, array<string, bool>>
     */
    public function getForUser(string $userType, int $userId, Years $year): array
    {
        $entity = $this->repo->findByUser($userType, $userId, $year);
        $stored = $entity?->getPrefs() ?? [];

        return $this->mergeWithDefaults($stored);
    }

    /**
     * Met à jour les prefs par merge partiel et retourne le résultat fusionné.
     *
     * @param  array<string, array<string, bool>> $patch
     * @return array<string, array<string, bool>>
     */
    public function patchForUser(string $userType, int $userId, Years $year, array $patch): array
    {
        $entity  = $this->repo->getOrCreate($userType, $userId, $year);
        $current = $entity->getPrefs();
        $merged  = array_replace_recursive($current, $patch);
        $entity->setPrefs($merged);
        $this->em->flush();

        return $this->mergeWithDefaults($merged);
    }

    /**
     * Fusionne les prefs stockées avec EVENT_DEFAULTS.
     * Les clés absentes en DB prennent la valeur du défaut.
     * Les événements inconnus en DB sont retournés tels quels (forward-compat).
     *
     * @param  array<string, array<string, bool>> $stored
     * @return array<string, array<string, bool>>
     */
    private function mergeWithDefaults(array $stored): array
    {
        $result = self::EVENT_DEFAULTS;

        foreach ($stored as $event => $channels) {
            if (!is_array($channels)) {
                continue;
            }
            if (!isset($result[$event])) {
                // Événement inconnu (futur ou obsolète) → retourné tel quel
                $result[$event] = $channels;
                continue;
            }
            foreach ($channels as $channel => $value) {
                $result[$event][$channel] = (bool) $value;
            }
        }

        return $result;
    }
}
