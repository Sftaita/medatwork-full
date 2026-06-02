<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\HttpFoundation\Request;

/**
 * DTO pour PATCH /api/years/{yearId}/my-notif-prefs
 *
 * Body attendu : { eventType: { channel: bool }, ... }
 *
 * Sécurité :
 *   - body limité à 2048 bytes
 *   - seuls les canaux connus sont acceptés (whitelist)
 *   - userId et yearId dans le body → ignorés (identité = JWT)
 *   - valeurs non-bool → InvalidArgumentException
 *   - événements inconnus → ignorés silencieusement (forward-compat)
 */
final class YearNotifPrefPatchInputDTO
{
    private const MAX_BYTES      = 2048;
    private const KNOWN_CHANNELS = ['email', 'push', 'sms', 'callRh'];
    private const IGNORED_KEYS   = ['userId', 'yearId', 'user_id', 'year_id'];

    private function __construct(
        /** @var array<string, array<string, bool>> */
        public readonly array $patch,
    ) {
    }

    public static function fromRequest(Request $request): self
    {
        $content = $request->getContent();

        if (strlen($content) > self::MAX_BYTES) {
            throw new \InvalidArgumentException(
                sprintf('Body too large: max %d bytes allowed', self::MAX_BYTES)
            );
        }

        $data = json_decode($content, true);

        if (!is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body — object expected at root');
        }

        // Vérifier que la racine n'est pas un tableau JSON
        if (array_is_list($data) && !empty($data)) {
            throw new \InvalidArgumentException('Invalid JSON body — object expected, not array');
        }

        $patch = [];

        foreach ($data as $key => $value) {
            // Ignorer userId, yearId et autres clés réservées (sécurité)
            if (in_array($key, self::IGNORED_KEYS, true)) {
                continue;
            }

            // Valider que la valeur est un objet (event → channels)
            if (!is_array($value) || array_is_list($value)) {
                continue; // clé inconnue ignorée silencieusement
            }

            $eventPatch = [];
            foreach ($value as $channel => $bool) {
                // Canal inconnu → erreur explicite
                if (!in_array($channel, self::KNOWN_CHANNELS, true)) {
                    throw new \InvalidArgumentException(
                        sprintf(
                            'Unknown channel "%s". Allowed: %s',
                            $channel,
                            implode(', ', self::KNOWN_CHANNELS)
                        )
                    );
                }

                // Valeur doit être bool strictement
                if (!is_bool($bool)) {
                    throw new \InvalidArgumentException(
                        sprintf('Channel "%s" value must be a boolean, got %s', $channel, gettype($bool))
                    );
                }

                $eventPatch[$channel] = $bool;
            }

            if (!empty($eventPatch)) {
                $patch[$key] = $eventPatch;
            }
        }

        return new self($patch);
    }
}
