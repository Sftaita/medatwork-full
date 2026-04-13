<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\LinkWeekTemplateInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for LinkWeekTemplateInputDTO::fromRequest().
 */
class LinkWeekTemplateInputDTOTest extends TestCase
{
    /** @param array<string, mixed> $body */
    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body) ?: null);
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidBodyCreatesDTO(): void
    {
        $dto = LinkWeekTemplateInputDTO::fromRequest($this->makeRequest([
            'yearId'          => 3,
            'weekTemplateIds' => [10, 20, 30],
        ]));

        $this->assertSame(3, $dto->yearId);
        $this->assertSame([10, 20, 30], $dto->weekTemplateIds);
    }

    public function testSingleWeekTemplateIdIsAccepted(): void
    {
        $dto = LinkWeekTemplateInputDTO::fromRequest($this->makeRequest([
            'yearId'          => 1,
            'weekTemplateIds' => [7],
        ]));

        $this->assertSame([7], $dto->weekTemplateIds);
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], '{bad}');
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        LinkWeekTemplateInputDTO::fromRequest($request);
    }

    // ── missing fields ────────────────────────────────────────────────────────

    public function testMissingYearIdThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing required field: yearId');
        LinkWeekTemplateInputDTO::fromRequest($this->makeRequest(['weekTemplateIds' => [1]]));
    }

    public function testMissingWeekTemplateIdsThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing required field: weekTemplateIds');
        LinkWeekTemplateInputDTO::fromRequest($this->makeRequest(['yearId' => 1]));
    }

    // ── yearId validation ─────────────────────────────────────────────────────

    public function testYearIdZeroThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('yearId must be a positive integer');
        LinkWeekTemplateInputDTO::fromRequest($this->makeRequest(['yearId' => 0, 'weekTemplateIds' => [1]]));
    }

    public function testYearIdAsStringThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        LinkWeekTemplateInputDTO::fromRequest($this->makeRequest(['yearId' => '3', 'weekTemplateIds' => [1]]));
    }

    // ── weekTemplateIds validation ────────────────────────────────────────────

    public function testEmptyWeekTemplateIdsThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('weekTemplateIds must be a non-empty array');
        LinkWeekTemplateInputDTO::fromRequest($this->makeRequest(['yearId' => 1, 'weekTemplateIds' => []]));
    }

    public function testWeekTemplateIdZeroThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('weekTemplateIds must contain only positive integers');
        LinkWeekTemplateInputDTO::fromRequest($this->makeRequest(['yearId' => 1, 'weekTemplateIds' => [0]]));
    }

    public function testWeekTemplateIdAsStringThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        LinkWeekTemplateInputDTO::fromRequest($this->makeRequest(['yearId' => 1, 'weekTemplateIds' => ['5']]));
    }
}
