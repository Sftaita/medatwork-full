<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\PasswordResetWithTokenInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for PasswordResetWithTokenInputDTO::fromRequest().
 */
class PasswordResetWithTokenInputDTOTest extends TestCase
{
    /** @param array<string, mixed> $body */
    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body) ?: null);
    }

    private function validToken(): string
    {
        return str_repeat('a', 64); // 64-char hex string
    }

    /** @return array<string, mixed> */
    private function validBody(): array
    {
        return [
            'token'    => $this->validToken(),
            'password' => 'SuperSecret123!',
        ];
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidInputCreatesDTO(): void
    {
        $dto = PasswordResetWithTokenInputDTO::fromRequest($this->makeRequest($this->validBody()));

        $this->assertSame($this->validToken(), $dto->token);
        $this->assertSame('SuperSecret123!', $dto->password);
    }

    public function testRealHexTokenIsAccepted(): void
    {
        $token = bin2hex(random_bytes(32)); // 64-char hex
        $dto = PasswordResetWithTokenInputDTO::fromRequest(
            $this->makeRequest(['token' => $token, 'password' => 'pass'])
        );

        $this->assertSame($token, $dto->token);
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], '{bad}');

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        PasswordResetWithTokenInputDTO::fromRequest($request);
    }

    // ── missing fields ────────────────────────────────────────────────────────

    /** @dataProvider missingFieldProvider */
    public function testMissingFieldThrows(string $field): void
    {
        $body = $this->validBody();
        unset($body[$field]);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("Missing required field: $field");
        PasswordResetWithTokenInputDTO::fromRequest($this->makeRequest($body));
    }

    /** @return array<string, array<mixed>> */
    public static function missingFieldProvider(): array
    {
        return [
            'token'    => ['token'],
            'password' => ['password'],
        ];
    }

    // ── token validation ──────────────────────────────────────────────────────

    public function testTokenTooShortThrows(): void
    {
        $body = $this->validBody();
        $body['token'] = str_repeat('a', 63);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('token must be a 64-character hex string');
        PasswordResetWithTokenInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testTokenTooLongThrows(): void
    {
        $body = $this->validBody();
        $body['token'] = str_repeat('a', 65);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('token must be a 64-character hex string');
        PasswordResetWithTokenInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testTokenAsIntegerThrows(): void
    {
        $body = $this->validBody();
        $body['token'] = 12345;

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('token must be a 64-character hex string');
        PasswordResetWithTokenInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testTokenAsNullThrows(): void
    {
        $body = $this->validBody();
        $body['token'] = null;

        $this->expectException(\InvalidArgumentException::class);
        PasswordResetWithTokenInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── password validation ───────────────────────────────────────────────────

    public function testEmptyPasswordThrows(): void
    {
        $body = $this->validBody();
        $body['password'] = '';

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('password must be a non-empty string');
        PasswordResetWithTokenInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testPasswordAsIntegerThrows(): void
    {
        $body = $this->validBody();
        $body['password'] = 123456;

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('password must be a non-empty string');
        PasswordResetWithTokenInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testPasswordAsNullThrows(): void
    {
        $body = $this->validBody();
        $body['password'] = null;

        $this->expectException(\InvalidArgumentException::class);
        PasswordResetWithTokenInputDTO::fromRequest($this->makeRequest($body));
    }
}
