<?php

declare(strict_types=1);

namespace App\Tests\Architecture;

use App\Services\NotificationDecisionService;
use App\Services\Notifications\UpdateYearResidentNotifications;
use PHPUnit\Framework\TestCase;

/**
 * P0 — Garantie architecturale
 *
 * Aucune notification ne peut contourner NotificationDecisionService.
 * Ce test échoue si le service n'existe pas ou n'est pas injecté
 * dans les classes d'envoi de notifications.
 *
 * RED attendu :
 *   ARCH01 : NotificationDecisionService n'existe pas → ReflectionException
 *   ARCH02 : UpdateYearResidentNotifications n'a pas le paramètre → assertion failure
 */
class NotificationArchitectureTest extends TestCase
{
    // ── ARCH01 : NotificationDecisionService existe et est instanciable ───────

    public function testNotificationDecisionServiceClassExists(): void
    {
        self::assertTrue(
            class_exists(NotificationDecisionService::class),
            'NotificationDecisionService must exist — it is the central decision gate'
        );

        $ref = new \ReflectionClass(NotificationDecisionService::class);
        self::assertTrue(
            $ref->hasMethod('shouldSend'),
            'NotificationDecisionService must expose shouldSend()'
        );
    }

    // ── ARCH02 : UpdateYearResidentNotifications injecte NotificationDecisionService ─

    public function testUpdateYearResidentNotificationsInjectsDecisionService(): void
    {
        $ref         = new \ReflectionClass(UpdateYearResidentNotifications::class);
        $constructor = $ref->getConstructor();

        self::assertNotNull($constructor, 'Constructor must exist');

        $paramTypes = array_map(
            fn(\ReflectionParameter $p): string => (string) ($p->getType() ?? ''),
            $constructor->getParameters()
        );

        self::assertContains(
            NotificationDecisionService::class,
            $paramTypes,
            sprintf(
                '%s must declare NotificationDecisionService in its constructor. '.
                'Current parameters: [%s]',
                UpdateYearResidentNotifications::class,
                implode(', ', $paramTypes)
            )
        );
    }

    // ── shouldSend a la bonne signature ──────────────────────────────────────

    public function testShouldSendHasCorrectSignature(): void
    {
        $ref    = new \ReflectionClass(NotificationDecisionService::class);
        $method = $ref->getMethod('shouldSend');

        self::assertSame(5, $method->getNumberOfRequiredParameters(),
            'shouldSend(userType, userId, year, eventType, channel) requires 5 params'
        );

        $returnType = (string) $method->getReturnType();
        self::assertSame('bool', $returnType,
            'shouldSend must return bool'
        );
    }
}
