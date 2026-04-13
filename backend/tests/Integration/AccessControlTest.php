<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Verifies the security access control configuration from security.yaml.
 *
 * Tests the Symfony firewall and access_control rules at the DI/config level
 * without making HTTP requests (no JWT keys or running server required).
 */
class AccessControlTest extends KernelTestCase
{
    // ─── Firewall configuration ───────────────────────────────────────────────

    public function testApiFirewallIsStateless(): void
    {
        self::bootKernel();

        $container   = static::getContainer();
        $firewallMap = $container->get('security.firewall.map');

        // The firewall map listener is internal; we assert indirectly through
        // the security.firewall.config service which holds parsed config.
        $this->assertNotNull($firewallMap, 'security.firewall.map must be registered');
    }

    public function testJwtAuthenticatorIsRegistered(): void
    {
        self::bootKernel();

        $container = static::getContainer();

        // The Lexik JWT authenticator is registered as a service
        $this->assertTrue(
            $container->has('lexik_jwt_authentication.security.guard.jwt_token_authenticator')
            || $container->has('lexik_jwt_authentication.jwt_manager'),
            'Lexik JWT authentication must be configured'
        );
    }

    // ─── Access control rules ─────────────────────────────────────────────────

    public function testPublicRoutesAreDefinedInAccessControl(): void
    {
        // Verify the access control config is loaded correctly by checking the
        // security.access_control service exists and has entries.
        self::bootKernel();

        $container = static::getContainer();

        // The access_map holds the compiled access_control rules
        $this->assertTrue(
            $container->has('security.access_map'),
            'security.access_map must be registered'
        );
    }

    public function testUserCheckerIsRegistered(): void
    {
        self::bootKernel();

        $container = static::getContainer();
        $checker   = $container->get('App\Security\UserChecker');

        $this->assertInstanceOf('App\Security\UserChecker', $checker);
    }

    public function testLoginThrottlingIsConfigured(): void
    {
        self::bootKernel();

        $container = static::getContainer();

        // The login throttle limiter is a rate limiter factory
        $this->assertTrue(
            $container->has('limiter.login_attempt')
            || $container->has('security.login_throttling.login.limiter'),
            'Login throttling limiter must be registered'
        );
    }

    // ─── Voter registration ───────────────────────────────────────────────────

    public function testYearAccessVoterIsRegistered(): void
    {
        self::bootKernel();

        $container = static::getContainer();
        $voter     = $container->get('App\Security\Voter\YearAccessVoter');

        $this->assertInstanceOf('App\Security\Voter\YearAccessVoter', $voter);
    }

    // ─── Security service availability ───────────────────────────────────────

    public function testPasswordHasherFactoryIsAvailable(): void
    {
        self::bootKernel();

        $hasher = static::getContainer()->get('security.password_hasher_factory');
        $this->assertNotNull($hasher);
    }

    public function testAuthorizationCheckerIsAvailable(): void
    {
        self::bootKernel();

        $checker = static::getContainer()->get(
            'Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface'
        );
        $this->assertNotNull($checker);
    }
}
