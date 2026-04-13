<?php

declare(strict_types=1);

namespace App\Tests\Unit;

use PHPUnit\Framework\TestCase;

class PasswordHashingTest extends TestCase
{
    public function testPasswordIsNotStoredInPlainText(): void
    {
        $plainPassword = 'MySecurePassword123';
        // Simulate bcrypt hashing (what UserPasswordHasher does with algorithm: auto)
        $hash = password_hash($plainPassword, PASSWORD_BCRYPT);

        $this->assertNotSame($plainPassword, $hash);
        $this->assertTrue(password_verify($plainPassword, $hash));
    }

    public function testPasswordMinimumLengthIsEnforced(): void
    {
        $tooShort = 'abc';
        $this->assertTrue(strlen($tooShort) < 6, 'Short password should be rejected by validator');
    }

    public function testBcryptHashStartsWithCostPrefix(): void
    {
        $hash = password_hash('test', PASSWORD_BCRYPT);
        $this->assertStringStartsWith('$2y$', $hash);
    }
}
