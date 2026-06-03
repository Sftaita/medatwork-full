<?php

declare(strict_types=1);

namespace App\Tests\Unit\Entity;

use App\Entity\NotificationManager;
use PHPUnit\Framework\TestCase;

/**
 * P2-C — NotificationManager : champ metadata
 *
 * MC-07 : getMetadata() retourne null par défaut
 * MC-08 : setMetadata() / getMetadata() roundtrip
 *
 * RED attendu : Class "App\Entity\NotificationManager" n'a pas de getMetadata().
 */
class NotificationManagerMetadataTest extends TestCase
{
    // ── MC-07 ─────────────────────────────────────────────────────────────────

    /**
     * Sans appel à setMetadata(), getMetadata() doit retourner null.
     * Garantit la rétrocompatibilité des notifications historiques.
     *
     * RED : méthode getMetadata() inexistante.
     */
    public function testGetMetadataReturnsNullByDefault(): void
    {
        $n = new NotificationManager();

        self::assertNull(
            $n->getMetadata(),
            'MC-07 : getMetadata() doit retourner null sur une nouvelle entité'
        );
    }

    // ── MC-08 ─────────────────────────────────────────────────────────────────

    /**
     * setMetadata() → getMetadata() doit retourner le tableau stocké.
     *
     * RED : méthodes inexistantes.
     */
    public function testSetAndGetMetadataRoundtrip(): void
    {
        $n        = new NotificationManager();
        $metadata = [
            'version'   => 1,
            'yearId'    => 7,
            'yearTitle' => 'Cardiologie 2025-2026',
            'tab'       => 'compliance',
            'severity'  => 'critical',
        ];

        $n->setMetadata($metadata);

        self::assertSame($metadata, $n->getMetadata(),
            'MC-08 : getMetadata() doit retourner exactement le tableau passé à setMetadata()'
        );
    }

    // ── setMetadata(null) ─────────────────────────────────────────────────────

    /**
     * setMetadata(null) doit être accepté et retourner null via getMetadata().
     */
    public function testSetMetadataNullIsAccepted(): void
    {
        $n = new NotificationManager();
        $n->setMetadata(['yearId' => 7]);
        $n->setMetadata(null);

        self::assertNull($n->getMetadata(), 'setMetadata(null) doit effacer la metadata');
    }
}
