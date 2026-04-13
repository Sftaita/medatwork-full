<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\IntegerIdsInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for IntegerIdsInputDTO::fromRequest().
 */
class IntegerIdsInputDTOTest extends TestCase
{
    /** @param array<string, mixed> $body */
    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body) ?: null);
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidArrayIsAccepted(): void
    {
        $dto = IntegerIdsInputDTO::fromRequest($this->makeRequest(['periodsId' => [1, 2, 3]]), 'periodsId');

        $this->assertSame([1, 2, 3], $dto->ids);
    }

    public function testSingleElementArrayIsAccepted(): void
    {
        $dto = IntegerIdsInputDTO::fromRequest($this->makeRequest(['periodsId' => [42]]), 'periodsId');

        $this->assertSame([42], $dto->ids);
    }

    public function testDifferentFieldNameIsSupported(): void
    {
        $dto = IntegerIdsInputDTO::fromRequest($this->makeRequest(['periodValidationArray' => [5, 10]]), 'periodValidationArray');

        $this->assertSame([5, 10], $dto->ids);
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], '{bad}');
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        IntegerIdsInputDTO::fromRequest($request, 'periodsId');
    }

    // ── missing field ─────────────────────────────────────────────────────────

    public function testMissingFieldThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing required field: periodsId');
        IntegerIdsInputDTO::fromRequest($this->makeRequest([]), 'periodsId');
    }

    // ── empty array ───────────────────────────────────────────────────────────

    public function testEmptyArrayThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('periodsId must be a non-empty array');
        IntegerIdsInputDTO::fromRequest($this->makeRequest(['periodsId' => []]), 'periodsId');
    }

    public function testNonArrayFieldThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('periodsId must be a non-empty array');
        IntegerIdsInputDTO::fromRequest($this->makeRequest(['periodsId' => 5]), 'periodsId');
    }

    // ── invalid elements ──────────────────────────────────────────────────────

    public function testStringElementThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('periodsId must contain only positive integers');
        IntegerIdsInputDTO::fromRequest($this->makeRequest(['periodsId' => ['1', '2']]), 'periodsId');
    }

    public function testZeroElementThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('periodsId must contain only positive integers');
        IntegerIdsInputDTO::fromRequest($this->makeRequest(['periodsId' => [0]]), 'periodsId');
    }

    public function testNegativeElementThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('periodsId must contain only positive integers');
        IntegerIdsInputDTO::fromRequest($this->makeRequest(['periodsId' => [-1]]), 'periodsId');
    }

    public function testMixedValidInvalidThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        IntegerIdsInputDTO::fromRequest($this->makeRequest(['periodsId' => [1, '2', 3]]), 'periodsId');
    }
}
