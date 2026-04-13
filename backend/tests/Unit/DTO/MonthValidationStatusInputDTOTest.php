<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\MonthValidationStatusInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for MonthValidationStatusInputDTO::fromRequest().
 */
class MonthValidationStatusInputDTOTest extends TestCase
{
    /** @param array<string, mixed> $body */
    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body) ?: null);
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidTrueStatusCreatesDTO(): void
    {
        $dto = MonthValidationStatusInputDTO::fromRequest(
            $this->makeRequest(['periodId' => 42, 'status' => true])
        );

        $this->assertSame(42, $dto->periodId);
        $this->assertTrue($dto->status);
    }

    public function testValidFalseStatusCreatesDTO(): void
    {
        $dto = MonthValidationStatusInputDTO::fromRequest(
            $this->makeRequest(['periodId' => 1, 'status' => false])
        );

        $this->assertSame(1, $dto->periodId);
        $this->assertFalse($dto->status);
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], '{bad}');
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        MonthValidationStatusInputDTO::fromRequest($request);
    }

    // ── missing fields ────────────────────────────────────────────────────────

    public function testMissingPeriodIdThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing required field: periodId');
        MonthValidationStatusInputDTO::fromRequest($this->makeRequest(['status' => true]));
    }

    public function testMissingStatusThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing required field: status');
        MonthValidationStatusInputDTO::fromRequest($this->makeRequest(['periodId' => 1]));
    }

    // ── periodId validation ───────────────────────────────────────────────────

    public function testPeriodIdAsStringThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('periodId must be a positive integer');
        MonthValidationStatusInputDTO::fromRequest(
            $this->makeRequest(['periodId' => '42', 'status' => true])
        );
    }

    public function testPeriodIdZeroThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('periodId must be a positive integer');
        MonthValidationStatusInputDTO::fromRequest(
            $this->makeRequest(['periodId' => 0, 'status' => true])
        );
    }

    public function testPeriodIdNegativeThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('periodId must be a positive integer');
        MonthValidationStatusInputDTO::fromRequest(
            $this->makeRequest(['periodId' => -1, 'status' => true])
        );
    }

    // ── status validation ─────────────────────────────────────────────────────

    public function testStatusAsStringThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('status must be a boolean');
        MonthValidationStatusInputDTO::fromRequest(
            $this->makeRequest(['periodId' => 1, 'status' => 'true'])
        );
    }

    public function testStatusAsIntThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('status must be a boolean');
        MonthValidationStatusInputDTO::fromRequest(
            $this->makeRequest(['periodId' => 1, 'status' => 1])
        );
    }

    public function testStatusNullThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        MonthValidationStatusInputDTO::fromRequest(
            $this->makeRequest(['periodId' => 1, 'status' => null])
        );
    }
}
