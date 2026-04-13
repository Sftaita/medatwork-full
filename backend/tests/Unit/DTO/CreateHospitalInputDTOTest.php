<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\CreateHospitalInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for CreateHospitalInputDTO::fromRequest().
 */
final class CreateHospitalInputDTOTest extends TestCase
{
    private function makeRequest(mixed $body): Request
    {
        return new Request([], [], [], [], [], [], is_string($body) ? $body : json_encode($body));
    }

    private function validBody(): array
    {
        return ['name' => 'CHU Liège', 'city' => 'Liège', 'country' => 'BE'];
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidBodyCreatesDTO(): void
    {
        $dto = CreateHospitalInputDTO::fromRequest($this->makeRequest($this->validBody()));

        $this->assertSame('CHU Liège', $dto->name);
        $this->assertSame('Liège', $dto->city);
        $this->assertSame('BE', $dto->country);
    }

    public function testDefaultCountryIsBE(): void
    {
        $dto = CreateHospitalInputDTO::fromRequest($this->makeRequest(['name' => 'CHU Liège']));

        $this->assertSame('BE', $dto->country);
    }

    public function testCityIsNullWhenOmitted(): void
    {
        $dto = CreateHospitalInputDTO::fromRequest($this->makeRequest(['name' => 'CHU Liège']));

        $this->assertNull($dto->city);
    }

    public function testCityIsNullWhenEmptyString(): void
    {
        $dto = CreateHospitalInputDTO::fromRequest($this->makeRequest(['name' => 'CHU Liège', 'city' => '']));

        $this->assertNull($dto->city);
    }

    public function testNameIsTrimmed(): void
    {
        $dto = CreateHospitalInputDTO::fromRequest($this->makeRequest(['name' => '  CHU Liège  ']));

        $this->assertSame('CHU Liège', $dto->name);
    }

    public function testCountryIsUppercased(): void
    {
        $dto = CreateHospitalInputDTO::fromRequest($this->makeRequest(['name' => 'X', 'country' => 'fr']));

        $this->assertSame('FR', $dto->country);
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        CreateHospitalInputDTO::fromRequest($this->makeRequest('{bad}'));
    }

    // ── missing/empty name ────────────────────────────────────────────────────

    public function testMissingNameThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing required field: name');
        CreateHospitalInputDTO::fromRequest($this->makeRequest([]));
    }

    public function testEmptyNameThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('name must be a non-empty string');
        CreateHospitalInputDTO::fromRequest($this->makeRequest(['name' => '']));
    }

    public function testNameTooLongThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('name must not exceed 150 characters');
        CreateHospitalInputDTO::fromRequest($this->makeRequest(['name' => str_repeat('A', 151)]));
    }

    // ── country validation ────────────────────────────────────────────────────

    public function testCountryNotTwoCharsThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('country must be a 2-letter ISO code');
        CreateHospitalInputDTO::fromRequest($this->makeRequest(['name' => 'X', 'country' => 'BEL']));
    }

    public function testNonStringCityThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('city must be a string');
        CreateHospitalInputDTO::fromRequest($this->makeRequest(['name' => 'X', 'city' => 42]));
    }
}
