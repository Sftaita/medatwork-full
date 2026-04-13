<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\AddManagerInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for AddManagerInputDTO::fromRequest().
 */
class AddManagerInputDTOTest extends TestCase
{
    /** @param array<string, mixed> $body */
    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body) ?: null);
    }

    /** @return array<string, mixed> */
    private function validBody(): array
    {
        return [
            'year'           => 5,
            'guest'          => 12,
            'dataAccess'     => true,
            'dataValidation' => false,
            'dataDownload'   => true,
            'admin'          => false,
            'agenda'         => true,
            'schedule'       => false,
        ];
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidBodyCreatesDTO(): void
    {
        $dto = AddManagerInputDTO::fromRequest($this->makeRequest($this->validBody()));

        $this->assertSame(5, $dto->year);
        $this->assertSame(12, $dto->guest);
        $this->assertTrue($dto->dataAccess);
        $this->assertFalse($dto->dataValidation);
        $this->assertTrue($dto->dataDownload);
        $this->assertFalse($dto->admin);
        $this->assertTrue($dto->agenda);
        $this->assertFalse($dto->schedule);
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], '{bad}');
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        AddManagerInputDTO::fromRequest($request);
    }

    // ── missing fields ────────────────────────────────────────────────────────

    /** @dataProvider missingFieldProvider */
    public function testMissingFieldThrows(string $field): void
    {
        $body = $this->validBody();
        unset($body[$field]);
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("Missing required field: $field");
        AddManagerInputDTO::fromRequest($this->makeRequest($body));
    }

    /** @return array<string, array<mixed>> */
    public static function missingFieldProvider(): array
    {
        return [
            'year'           => ['year'],
            'guest'          => ['guest'],
            'dataAccess'     => ['dataAccess'],
            'dataValidation' => ['dataValidation'],
            'dataDownload'   => ['dataDownload'],
            'admin'          => ['admin'],
            'agenda'         => ['agenda'],
            'schedule'       => ['schedule'],
        ];
    }

    // ── integer fields validation ─────────────────────────────────────────────

    public function testYearZeroThrows(): void
    {
        $body = $this->validBody();
        $body['year'] = 0;
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('year must be a positive integer');
        AddManagerInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testGuestAsStringThrows(): void
    {
        $body = $this->validBody();
        $body['guest'] = '12';
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('guest must be a positive integer');
        AddManagerInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── boolean fields validation ─────────────────────────────────────────────

    /** @dataProvider boolFieldProvider */
    public function testBoolFieldAsIntThrows(string $field): void
    {
        $body = $this->validBody();
        $body[$field] = 1;
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("$field must be a boolean");
        AddManagerInputDTO::fromRequest($this->makeRequest($body));
    }

    /** @return array<string, array<mixed>> */
    public static function boolFieldProvider(): array
    {
        return [
            'dataAccess'     => ['dataAccess'],
            'dataValidation' => ['dataValidation'],
            'dataDownload'   => ['dataDownload'],
            'admin'          => ['admin'],
            'agenda'         => ['agenda'],
            'schedule'       => ['schedule'],
        ];
    }
}
