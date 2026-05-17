<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\ProfilePasswordInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

final class ProfilePasswordInputDTOTest extends TestCase
{
    private static function req(array $body): ProfilePasswordInputDTO
    {
        return ProfilePasswordInputDTO::fromRequest(
            new Request([], [], [], [], [], [], json_encode($body))
        );
    }

    public function testAcceptsValidPasswordChange(): void
    {
        $dto = self::req([
            'currentPassword' => 'ancien123',
            'newPassword'     => 'nouveau456',
            'confirmPassword' => 'nouveau456',
        ]);
        $this->assertSame('ancien123', $dto->currentPassword);
        $this->assertSame('nouveau456', $dto->newPassword);
    }

    public function testRejectsMissingCurrentPassword(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/currentPassword est requis/');
        self::req(['newPassword' => 'abc12345', 'confirmPassword' => 'abc12345']);
    }

    public function testRejectsMissingNewPassword(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        self::req(['currentPassword' => 'old', 'confirmPassword' => 'abc12345']);
    }

    public function testRejectsMissingConfirmPassword(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        self::req(['currentPassword' => 'old', 'newPassword' => 'abc12345']);
    }

    public function testRejectsNewPasswordTooShort(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/minimum 8 caractères/');
        self::req([
            'currentPassword' => 'ancien',
            'newPassword'     => 'short',
            'confirmPassword' => 'short',
        ]);
    }

    public function testRejectsNewPasswordTooLong(): void
    {
        $long = str_repeat('A', 151);
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/trop long/');
        self::req([
            'currentPassword' => 'ancien',
            'newPassword'     => $long,
            'confirmPassword' => $long,
        ]);
    }

    public function testRejectsMismatchedConfirmation(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/confirmation.*ne correspond pas/');
        self::req([
            'currentPassword' => 'ancien123',
            'newPassword'     => 'nouveau123',
            'confirmPassword' => 'autre456',
        ]);
    }

    public function testRejectsEmptyCurrentPassword(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        self::req([
            'currentPassword' => '',
            'newPassword'     => 'nouveau123',
            'confirmPassword' => 'nouveau123',
        ]);
    }

    public function testRejectsInvalidJson(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/Corps JSON invalide/');
        ProfilePasswordInputDTO::fromRequest(
            new Request([], [], [], [], [], [], 'not-json')
        );
    }

    public function testAcceptsExactly8CharPassword(): void
    {
        $dto = self::req([
            'currentPassword' => 'ancien123',
            'newPassword'     => '12345678',
            'confirmPassword' => '12345678',
        ]);
        $this->assertSame('12345678', $dto->newPassword);
    }
}
