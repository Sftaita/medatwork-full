<?php

declare(strict_types=1);

namespace App\Tests\Unit;

use PHPUnit\Framework\TestCase;
use Symfony\Component\Yaml\Yaml;

/**
 * Verifies that rate limiter policies are configured correctly.
 */
class RateLimiterConfigTest extends TestCase
{
    /** @var array<string, array<string, mixed>> */
    private array $config;

    protected function setUp(): void
    {
        $path = dirname(__DIR__, 2) . '/config/packages/rate_limiter.yaml';
        $this->config = Yaml::parseFile($path)['framework']['rate_limiter'];
    }

    public function testLoginLimiterExists(): void
    {
        $this->assertArrayHasKey('login', $this->config);
    }

    public function testLoginLimiterMaxFiveAttempts(): void
    {
        $this->assertSame(5, $this->config['login']['limit']);
    }

    public function testRegisterLimiterExists(): void
    {
        $this->assertArrayHasKey('register', $this->config);
    }

    public function testRegisterLimiterMaxThreePerHour(): void
    {
        $this->assertSame(3, $this->config['register']['limit']);
        $this->assertSame('1 hour', $this->config['register']['interval']);
    }

    public function testPasswordResetLimiterExists(): void
    {
        $this->assertArrayHasKey('password_reset', $this->config);
    }
}
