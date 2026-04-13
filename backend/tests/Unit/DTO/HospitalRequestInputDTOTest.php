<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\HospitalRequestInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for HospitalRequestInputDTO::fromRequest().
 */
final class HospitalRequestInputDTOTest extends TestCase
{
    private function makeRequest(mixed $body): Request
    {
        return new Request([], [], [], [], [], [], is_string($body) ? $body : json_encode($body));
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidBodyCreatesDTO(): void
    {
        $dto = HospitalRequestInputDTO::fromRequest($this->makeRequest(['hospitalName' => 'CHU Liège']));

        $this->assertSame('CHU Liège', $dto->hospitalName);
    }

    public function testHospitalNameIsTrimmed(): void
    {
        $dto = HospitalRequestInputDTO::fromRequest($this->makeRequest(['hospitalName' => '  CHU Liège  ']));

        $this->assertSame('CHU Liège', $dto->hospitalName);
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        HospitalRequestInputDTO::fromRequest($this->makeRequest('{bad}'));
    }

    // ── missing field ─────────────────────────────────────────────────────────

    public function testMissingHospitalNameThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing required field: hospitalName');
        HospitalRequestInputDTO::fromRequest($this->makeRequest([]));
    }

    // ── empty / whitespace ────────────────────────────────────────────────────

    public function testEmptyHospitalNameThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('hospitalName must be a non-empty string');
        HospitalRequestInputDTO::fromRequest($this->makeRequest(['hospitalName' => '']));
    }

    public function testWhitespaceOnlyHospitalNameThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('hospitalName must be a non-empty string');
        HospitalRequestInputDTO::fromRequest($this->makeRequest(['hospitalName' => '   ']));
    }

    public function testNonStringHospitalNameThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        HospitalRequestInputDTO::fromRequest($this->makeRequest(['hospitalName' => 123]));
    }

    // ── max length ────────────────────────────────────────────────────────────

    public function testHospitalNameAtExactly150CharsIsAccepted(): void
    {
        $name = str_repeat('A', 150);
        $dto  = HospitalRequestInputDTO::fromRequest($this->makeRequest(['hospitalName' => $name]));
        $this->assertSame($name, $dto->hospitalName);
    }

    public function testHospitalName151CharsThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('hospitalName must not exceed 150 characters');
        HospitalRequestInputDTO::fromRequest($this->makeRequest(['hospitalName' => str_repeat('A', 151)]));
    }
}
