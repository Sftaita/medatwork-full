<?php

declare(strict_types=1);

namespace App\Tests\Unit;

use PHPUnit\Framework\TestCase;

class EmailValidationTest extends TestCase
{
    /** @dataProvider validEmails */
    public function testValidEmailsPassValidation(string $email): void
    {
        $this->assertTrue((bool) filter_var($email, FILTER_VALIDATE_EMAIL));
    }

    /** @dataProvider invalidEmails */
    public function testInvalidEmailsFailValidation(string $email): void
    {
        $this->assertFalse((bool) filter_var($email, FILTER_VALIDATE_EMAIL));
    }

    /** @return array<int, array<mixed>> */
    public static function validEmails(): array
    {
        return [
            ['user@example.com'],
            ['doctor.name+tag@hospital.be'],
            ['resident123@medatwork.be'],
        ];
    }

    /** @return array<int, array<mixed>> */
    public static function invalidEmails(): array
    {
        return [
            ['not-an-email'],
            ['@nodomain.com'],
            ['missing@'],
            ['spaces in@email.com'],
            [''],
        ];
    }
}
