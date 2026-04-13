<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Security\AuthenticationSuccessListener;
use App\Security\RefreshedTokenListener;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Verifies that JWT cookie listeners are correctly wired.
 *
 * After the Step 3 security fixes, both listeners must:
 *   - be registered in the container
 *   - listen to the correct auth event
 *   - have the dead `$secure = false` property removed (tested via reflection)
 */
class CookieListenerWiringTest extends KernelTestCase
{
    public function testAuthenticationSuccessListenerIsRegistered(): void
    {
        self::bootKernel();

        $dispatcher = static::getContainer()->get('event_dispatcher');
        $listeners  = $dispatcher->getListeners('lexik_jwt_authentication.on_authentication_success');

        $classes = array_map(fn ($l) => is_array($l) ? get_class($l[0]) : 'closure', $listeners);

        $this->assertContains(
            AuthenticationSuccessListener::class,
            $classes,
            'AuthenticationSuccessListener must listen to on_authentication_success'
        );
    }

    public function testRefreshedTokenListenerIsRegistered(): void
    {
        self::bootKernel();

        $dispatcher = static::getContainer()->get('event_dispatcher');
        $listeners  = $dispatcher->getListeners('lexik_jwt_authentication.on_authentication_success');

        $classes = array_map(fn ($l) => is_array($l) ? get_class($l[0]) : 'closure', $listeners);

        $this->assertContains(
            RefreshedTokenListener::class,
            $classes,
            'RefreshedTokenListener must listen to on_authentication_success'
        );
    }

    public function testAuthenticationSuccessListenerHasNoInsecureProperty(): void
    {
        // The dead `private $secure = false` property was removed in Step 3.
        // Verify it no longer exists on the class.
        $reflection = new \ReflectionClass(AuthenticationSuccessListener::class);
        $properties = array_map(fn ($p) => $p->getName(), $reflection->getProperties());

        $this->assertNotContains(
            'secure',
            $properties,
            'AuthenticationSuccessListener must not have a $secure property (was dead code with value false)'
        );
    }

    public function testRefreshedTokenListenerHasNoInsecureProperty(): void
    {
        // Same check for RefreshedTokenListener.
        $reflection = new \ReflectionClass(RefreshedTokenListener::class);
        $properties = array_map(fn ($p) => $p->getName(), $reflection->getProperties());

        $this->assertNotContains(
            'secure',
            $properties,
            'RefreshedTokenListener must not have a $secure property (was set to false)'
        );
    }

    public function testRefreshedTokenListenerSubscribesToCorrectEvent(): void
    {
        // Check via getSubscribedEvents() — no kernel boot needed.
        $events = RefreshedTokenListener::getSubscribedEvents();

        $this->assertArrayHasKey(
            'lexik_jwt_authentication.on_authentication_success',
            $events
        );
    }
}
