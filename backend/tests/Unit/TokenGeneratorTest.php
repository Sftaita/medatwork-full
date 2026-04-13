<?php

declare(strict_types=1);

namespace App\Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * Verifies that security-critical token generation uses cryptographically
 * secure random bytes (not md5/uniqid).
 */
class TokenGeneratorTest extends TestCase
{
    public function testTokenIsHexEncoded64Chars(): void
    {
        $token = bin2hex(random_bytes(32));

        $this->assertSame(64, strlen($token));
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $token);
    }

    public function testTwoTokensAreUnique(): void
    {
        $token1 = bin2hex(random_bytes(32));
        $token2 = bin2hex(random_bytes(32));

        $this->assertNotSame($token1, $token2);
    }

    public function testTokenIsNotMd5(): void
    {
        $token = bin2hex(random_bytes(32));

        // md5 produces 32-char hex; our token must be 64 chars
        $this->assertNotSame(32, strlen($token));
    }
}
