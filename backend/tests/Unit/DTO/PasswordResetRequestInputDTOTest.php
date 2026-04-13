<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\PasswordResetRequestInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for PasswordResetRequestInputDTO::fromRequest().
 */
class PasswordResetRequestInputDTOTest extends TestCase
{
    /** @param array<string, mixed> $body */
    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body) ?: null);
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidEmailCreatesDTO(): void
    {
        $dto = PasswordResetRequestInputDTO::fromRequest(
            $this->makeRequest(['email' => 'doctor@hospital.be'])
        );

        $this->assertSame('doctor@hospital.be', $dto->email);
    }

    public function testEmailIsLowercased(): void
    {
        $dto = PasswordResetRequestInputDTO::fromRequest(
            $this->makeRequest(['email' => 'Doctor@Hospital.BE'])
        );

        $this->assertSame('doctor@hospital.be', $dto->email);
    }

    /** @dataProvider validEmailProvider */
    public function testVariousValidEmailsAreAccepted(string $email): void
    {
        $dto = PasswordResetRequestInputDTO::fromRequest(
            $this->makeRequest(['email' => $email])
        );

        $this->assertSame(strtolower($email), $dto->email);
    }

    /** @return array<int, array<mixed>> */
    public static function validEmailProvider(): array
    {
        return [
            ['user@example.com'],
            ['user.name+tag@example.co.uk'],
            ['user123@subdomain.example.org'],
        ];
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], 'not-json');

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        PasswordResetRequestInputDTO::fromRequest($request);
    }

    // ── missing / invalid email ───────────────────────────────────────────────

    public function testMissingEmailThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing required field: email');
        PasswordResetRequestInputDTO::fromRequest($this->makeRequest([]));
    }

    /** @dataProvider invalidEmailProvider */
    public function testInvalidEmailThrows(mixed $email): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('email must be a valid email address');
        PasswordResetRequestInputDTO::fromRequest($this->makeRequest(['email' => $email]));
    }

    /** @return array<string, array<mixed>> */
    public static function invalidEmailProvider(): array
    {
        return [
            'plain string'    => ['notanemail'],
            'missing domain'  => ['user@'],
            'missing at'      => ['userdomain.com'],
            'integer'         => [12345],
            'null'            => [null],
            'empty string'    => [''],
        ];
    }
}
