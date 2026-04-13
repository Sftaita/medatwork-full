<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\YearTokenInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for YearTokenInputDTO::fromRequest().
 */
class YearTokenInputDTOTest extends TestCase
{
    /** @param array<string, mixed> $body */
    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body) ?: null);
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidTokenCreatesDTO(): void
    {
        $dto = YearTokenInputDTO::fromRequest($this->makeRequest(['token' => 'abc123']));
        $this->assertSame('abc123', $dto->token);
    }

    public function testLongTokenIsAccepted(): void
    {
        $token = str_repeat('x', 64);
        $dto = YearTokenInputDTO::fromRequest($this->makeRequest(['token' => $token]));
        $this->assertSame($token, $dto->token);
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], '{bad}');
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        YearTokenInputDTO::fromRequest($request);
    }

    // ── missing / invalid token ───────────────────────────────────────────────

    public function testMissingTokenThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing required field: token');
        YearTokenInputDTO::fromRequest($this->makeRequest([]));
    }

    public function testEmptyTokenThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('token must be a non-empty string');
        YearTokenInputDTO::fromRequest($this->makeRequest(['token' => '']));
    }

    public function testIntegerTokenThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('token must be a non-empty string');
        YearTokenInputDTO::fromRequest($this->makeRequest(['token' => 12345]));
    }

    public function testNullTokenThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        YearTokenInputDTO::fromRequest($this->makeRequest(['token' => null]));
    }
}
