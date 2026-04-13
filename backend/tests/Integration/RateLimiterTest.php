<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\RateLimiter\RateLimiterFactory;

/**
 * Verifies rate limiter behavior.
 */
class RateLimiterTest extends KernelTestCase
{
    public function testRegisterLimiterBlocksAfterThreeAttempts(): void
    {
        self::bootKernel();

        /** @var RateLimiterFactory $factory */
        $factory = static::getContainer()->get('limiter.register');
        $limiter = $factory->create('test-ip-' . uniqid());

        // First 3 attempts should be accepted
        $this->assertTrue($limiter->consume(1)->isAccepted());
        $this->assertTrue($limiter->consume(1)->isAccepted());
        $this->assertTrue($limiter->consume(1)->isAccepted());

        // 4th attempt must be rejected
        $this->assertFalse($limiter->consume(1)->isAccepted());
    }

    public function testPasswordResetLimiterBlocksAfterThreeAttempts(): void
    {
        self::bootKernel();

        /** @var RateLimiterFactory $factory */
        $factory = static::getContainer()->get('limiter.password_reset');
        $limiter = $factory->create('test-reset-ip-' . uniqid());

        $this->assertTrue($limiter->consume(1)->isAccepted());
        $this->assertTrue($limiter->consume(1)->isAccepted());
        $this->assertTrue($limiter->consume(1)->isAccepted());
        $this->assertFalse($limiter->consume(1)->isAccepted());
    }
}
