<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * Verifies that security services are correctly wired.
 */
class SecurityConfigTest extends KernelTestCase
{
    public function testAuthorizationCheckerIsAvailable(): void
    {
        self::bootKernel();
        $checker = static::getContainer()->get(AuthorizationCheckerInterface::class);
        $this->assertInstanceOf(AuthorizationCheckerInterface::class, $checker);
    }

    public function testPasswordHasherIsAvailable(): void
    {
        self::bootKernel();
        $hasher = static::getContainer()->get('security.password_hasher_factory');
        $this->assertNotNull($hasher);
    }

    public function testRateLimiterFactoriesAreRegistered(): void
    {
        self::bootKernel();
        $container = static::getContainer();

        $this->assertTrue(
            $container->has('limiter.register'),
            'register rate limiter must be defined'
        );
        $this->assertTrue(
            $container->has('limiter.password_reset'),
            'password_reset rate limiter must be defined'
        );
    }

    public function testExceptionListenerIsRegistered(): void
    {
        self::bootKernel();
        $dispatcher = static::getContainer()->get('event_dispatcher');
        $listeners = $dispatcher->getListeners('kernel.exception');

        $listenerClasses = array_map(fn ($l) => is_array($l) ? get_class($l[0]) : 'closure', $listeners);

        $this->assertContains(
            'App\EventListener\ExceptionListener',
            $listenerClasses,
            'ExceptionListener must be registered for kernel.exception'
        );
    }
}
