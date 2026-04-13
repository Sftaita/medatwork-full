<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\InviteHospitalAdminInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for InviteHospitalAdminInputDTO::fromRequest().
 */
final class InviteHospitalAdminInputDTOTest extends TestCase
{
    private function makeRequest(mixed $body): Request
    {
        return new Request([], [], [], [], [], [], is_string($body) ? $body : json_encode($body));
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidEmailCreatesDTO(): void
    {
        $dto = InviteHospitalAdminInputDTO::fromRequest($this->makeRequest(['email' => 'Admin@Hospital.BE']));

        $this->assertSame('admin@hospital.be', $dto->email);
    }

    public function testEmailIsLowercasedAndTrimmed(): void
    {
        $dto = InviteHospitalAdminInputDTO::fromRequest($this->makeRequest(['email' => '  ADMIN@CHU.BE  ']));

        $this->assertSame('admin@chu.be', $dto->email);
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        InviteHospitalAdminInputDTO::fromRequest($this->makeRequest('{bad}'));
    }

    // ── missing field ─────────────────────────────────────────────────────────

    public function testMissingEmailThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing required field: email');
        InviteHospitalAdminInputDTO::fromRequest($this->makeRequest([]));
    }

    // ── invalid email ─────────────────────────────────────────────────────────

    public function testInvalidEmailThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('email must be a valid email address');
        InviteHospitalAdminInputDTO::fromRequest($this->makeRequest(['email' => 'not-an-email']));
    }

    public function testEmptyEmailThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        InviteHospitalAdminInputDTO::fromRequest($this->makeRequest(['email' => '']));
    }
}
