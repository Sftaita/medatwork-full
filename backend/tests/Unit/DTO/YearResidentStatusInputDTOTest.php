<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\YearResidentStatusInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for YearResidentStatusInputDTO::fromRequest().
 */
class YearResidentStatusInputDTOTest extends TestCase
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
            'yearId'     => 3,
            'residentId' => 7,
            'status'     => true,
        ];
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidInputCreatesDTO(): void
    {
        $dto = YearResidentStatusInputDTO::fromRequest($this->makeRequest($this->validBody()));

        $this->assertSame(3, $dto->yearId);
        $this->assertSame(7, $dto->residentId);
        $this->assertTrue($dto->status);
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], '{bad}');
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        YearResidentStatusInputDTO::fromRequest($request);
    }

    // ── missing fields ────────────────────────────────────────────────────────

    /** @dataProvider missingFieldProvider */
    public function testMissingFieldThrows(string $field): void
    {
        $body = $this->validBody();
        unset($body[$field]);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("Missing required field: $field");
        YearResidentStatusInputDTO::fromRequest($this->makeRequest($body));
    }

    /** @return array<string, array<mixed>> */
    public static function missingFieldProvider(): array
    {
        return [
            'yearId'     => ['yearId'],
            'residentId' => ['residentId'],
            'status'     => ['status'],
        ];
    }

    // ── yearId validation ─────────────────────────────────────────────────────

    public function testYearIdAsStringThrows(): void
    {
        $body = $this->validBody();
        $body['yearId'] = '3';
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('yearId must be a positive integer');
        YearResidentStatusInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testYearIdZeroThrows(): void
    {
        $body = $this->validBody();
        $body['yearId'] = 0;
        $this->expectException(\InvalidArgumentException::class);
        YearResidentStatusInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── residentId validation ─────────────────────────────────────────────────

    public function testResidentIdAsStringThrows(): void
    {
        $body = $this->validBody();
        $body['residentId'] = '7';
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('residentId must be a positive integer');
        YearResidentStatusInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testResidentIdZeroThrows(): void
    {
        $body = $this->validBody();
        $body['residentId'] = 0;
        $this->expectException(\InvalidArgumentException::class);
        YearResidentStatusInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── status validation ─────────────────────────────────────────────────────

    public function testEmptyStatusThrows(): void
    {
        $body = $this->validBody();
        $body['status'] = '';
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('status must be a boolean');
        YearResidentStatusInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testStatusAsIntThrows(): void
    {
        $body = $this->validBody();
        $body['status'] = 1;
        $this->expectException(\InvalidArgumentException::class);
        YearResidentStatusInputDTO::fromRequest($this->makeRequest($body));
    }
}
