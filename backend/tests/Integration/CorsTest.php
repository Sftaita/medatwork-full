<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use PHPUnit\Framework\TestCase;
use Symfony\Component\Yaml\Yaml;

/**
 * CORS regression tests — validates nelmio_cors.yaml configuration directly.
 *
 * Intentionally avoids booting the Symfony kernel to stay fast and avoid
 * network-related initialisation (Sentry, etc.).
 *
 * Catches configuration drift before it reaches production:
 * - allow_credentials missing → browser blocks credentialed requests
 * - allow_credentials: false  → same browser block
 * - missing /api/ path block  → CORS headers not emitted at all
 * - redirect on logout        → response has no CORS headers → browser blocks
 */
class CorsTest extends TestCase
{
    private array $corsConfig;
    private array $securityConfig;

    protected function setUp(): void
    {
        $this->corsConfig     = Yaml::parseFile(__DIR__ . '/../../config/packages/nelmio_cors.yaml');
        $this->securityConfig = Yaml::parseFile(__DIR__ . '/../../config/packages/security.yaml');
    }

    // ── /api/ path block must exist and have allow_credentials: true ──────────

    public function testApiPathBlockExists(): void
    {
        $paths = $this->corsConfig['nelmio_cors']['paths'] ?? [];

        $this->assertArrayHasKey(
            '^/api/',
            $paths,
            'nelmio_cors.yaml must have a "^/api/" path block — without it, CORS headers are not emitted for API requests'
        );
    }

    public function testApiPathHasAllowCredentials(): void
    {
        $apiBlock = $this->corsConfig['nelmio_cors']['paths']['^/api/'] ?? [];

        $this->assertArrayHasKey(
            'allow_credentials',
            $apiBlock,
            '"allow_credentials" key must be explicitly set under "^/api/" in nelmio_cors.yaml'
        );
        $this->assertTrue(
            $apiBlock['allow_credentials'],
            '"allow_credentials" must be true for /api/ — false causes the browser to block all credentialed requests (cookies, Authorization header)'
        );
    }

    public function testApiPathAllowsPostAndOptionsAndDelete(): void
    {
        $apiBlock = $this->corsConfig['nelmio_cors']['paths']['^/api/'] ?? [];
        $methods  = array_map('strtoupper', $apiBlock['allow_methods'] ?? []);

        foreach (['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'] as $method) {
            $this->assertContains(
                $method,
                $methods,
                "{$method} must be in allow_methods for /api/ in nelmio_cors.yaml"
            );
        }
    }

    public function testApiPathHasAllowOrigin(): void
    {
        $apiBlock = $this->corsConfig['nelmio_cors']['paths']['^/api/'] ?? [];

        $this->assertNotEmpty(
            $apiBlock['allow_origin'] ?? [],
            '"allow_origin" must not be empty for /api/ — without it, the CORS header is not emitted'
        );
    }

    // ── Test environment must not downgrade credentials ───────────────────────

    public function testTestEnvApiPathAlsoAllowsCredentials(): void
    {
        $testOverride = $this->corsConfig['when@test']['nelmio_cors']['paths']['^/api/'] ?? null;

        if ($testOverride === null) {
            $this->markTestSkipped('No when@test /api/ override — default applies');
        }

        $this->assertTrue(
            $testOverride['allow_credentials'] ?? false,
            '"allow_credentials" must remain true in the when@test /api/ block — setting it to false makes CORS tests useless'
        );
    }

    // ── Logout must not redirect (redirect has no CORS headers) ──────────────

    public function testLogoutHasNoRedirectTarget(): void
    {
        $apiFirewall = $this->securityConfig['security']['firewalls']['api'] ?? [];
        $logoutBlock = $apiFirewall['logout'] ?? [];

        $this->assertArrayNotHasKey(
            'target',
            $logoutBlock,
            '"target" must not be set on the logout firewall block — Symfony issues a 302 redirect to "target", and redirect responses do not carry CORS headers, causing the browser to block the response'
        );
    }

    // ── CustomLogoutListener exists and has no redirect ───────────────────────

    public function testCustomLogoutListenerReturnsJsonNotRedirect(): void
    {
        $listenerFile = __DIR__ . '/../../src/Security/CustomLogoutListener.php';

        $this->assertFileExists($listenerFile, 'CustomLogoutListener.php must exist');

        $source = file_get_contents($listenerFile);

        $this->assertStringNotContainsString(
            'RedirectResponse',
            $source,
            'CustomLogoutListener must not use RedirectResponse — a redirect bypasses CORS middleware and causes browser CORS errors on logout'
        );
        $this->assertStringContainsString(
            'JsonResponse',
            $source,
            'CustomLogoutListener must return a JsonResponse so CORS headers are correctly applied'
        );
    }
}
