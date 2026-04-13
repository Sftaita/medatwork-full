<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\UpdateYearResidentInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for UpdateYearResidentInputDTO::fromRequest().
 */
class UpdateYearResidentInputDTOTest extends TestCase
{
    /** @param array<string, mixed> $body */
    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body) ?: null);
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testAllFieldsPresent(): void
    {
        $dto = UpdateYearResidentInputDTO::fromRequest($this->makeRequest([
            'dateOfStart'      => '2024-01-01',
            'optingOut'        => true,
            'legalLeaves'      => 25,
            'scientificLeaves' => 5,
            'maternityLeaves'  => 0,
            'paternityLeaves'  => 2,
            'unpaidLeaves'     => 3,
        ]));

        $this->assertSame('2024-01-01', $dto->dateOfStart);
        $this->assertTrue($dto->optingOut);
        $this->assertSame(25, $dto->legalLeaves);
        $this->assertSame(5, $dto->scientificLeaves);
        $this->assertSame(0, $dto->maternityLeaves);
        $this->assertSame(2, $dto->paternityLeaves);
        $this->assertSame(3, $dto->unpaidLeaves);
    }

    public function testOnlyOneFieldReturnsNullForOthers(): void
    {
        $dto = UpdateYearResidentInputDTO::fromRequest($this->makeRequest([
            'legalLeaves' => 10,
        ]));

        $this->assertSame(10, $dto->legalLeaves);
        $this->assertNull($dto->dateOfStart);
        $this->assertNull($dto->optingOut);
        $this->assertNull($dto->scientificLeaves);
        $this->assertNull($dto->maternityLeaves);
        $this->assertNull($dto->paternityLeaves);
        $this->assertNull($dto->unpaidLeaves);
    }

    public function testNullableFieldsAcceptNull(): void
    {
        $dto = UpdateYearResidentInputDTO::fromRequest($this->makeRequest([
            'dateOfStart' => null,
            'optingOut'   => null,
            'legalLeaves' => null,
        ]));

        $this->assertNull($dto->dateOfStart);
        $this->assertNull($dto->optingOut);
        $this->assertNull($dto->legalLeaves);
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], '{bad json}');
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        UpdateYearResidentInputDTO::fromRequest($request);
    }

    // ── at-least-one-field rule ───────────────────────────────────────────────

    public function testEmptyBodyThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('At least one field must be provided');
        UpdateYearResidentInputDTO::fromRequest($this->makeRequest([]));
    }

    public function testBodyWithOnlyUnknownKeysThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('At least one field must be provided');
        UpdateYearResidentInputDTO::fromRequest($this->makeRequest(['unknownKey' => 'value']));
    }

    // ── type validation ───────────────────────────────────────────────────────

    public function testDateOfStartAsIntThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('dateOfStart must be a string or null');
        UpdateYearResidentInputDTO::fromRequest($this->makeRequest(['dateOfStart' => 123]));
    }

    public function testOptingOutAsStringThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('optingOut must be a boolean or null');
        UpdateYearResidentInputDTO::fromRequest($this->makeRequest(['optingOut' => 'yes']));
    }

    public function testLegalLeavesAsStringThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('legalLeaves must be a non-negative integer or null');
        UpdateYearResidentInputDTO::fromRequest($this->makeRequest(['legalLeaves' => '10']));
    }

    public function testNegativeLeavesThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('scientificLeaves must be a non-negative integer or null');
        UpdateYearResidentInputDTO::fromRequest($this->makeRequest(['scientificLeaves' => -1]));
    }

    public function testMaternityLeavesAsStringThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('maternityLeaves must be a non-negative integer or null');
        UpdateYearResidentInputDTO::fromRequest($this->makeRequest(['maternityLeaves' => '5']));
    }

    public function testPaternityLeavesNegativeThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('paternityLeaves must be a non-negative integer or null');
        UpdateYearResidentInputDTO::fromRequest($this->makeRequest(['paternityLeaves' => -3]));
    }

    public function testUnpaidLeavesAsFloatThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('unpaidLeaves must be a non-negative integer or null');
        UpdateYearResidentInputDTO::fromRequest($this->makeRequest(['unpaidLeaves' => 2.5]));
    }
}
