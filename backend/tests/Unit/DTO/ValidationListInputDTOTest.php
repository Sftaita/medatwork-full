<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\ValidationListInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for ValidationListInputDTO::fromRequest().
 */
class ValidationListInputDTOTest extends TestCase
{
    /** @param array<mixed> $body */
    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body) ?: null);
    }

    /** @return array<mixed> */
    private function validBody(): array
    {
        return [
            [
                'residentId'           => 1,
                'status'               => 'validate',
                'managerComment'       => 'Looks good',
                'residentNotification' => 'You are validated',
            ],
            [
                'residentId' => 2,
                'status'     => 'invalidate',
            ],
        ];
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidBodyCreatesDTO(): void
    {
        $dto = ValidationListInputDTO::fromRequest($this->makeRequest($this->validBody()));

        $this->assertCount(2, $dto->items);

        $first = $dto->items[0];
        $this->assertSame(1, $first->residentId);
        $this->assertSame('validate', $first->status);
        $this->assertSame('Looks good', $first->managerComment);
        $this->assertSame('You are validated', $first->residentNotification);

        $second = $dto->items[1];
        $this->assertSame(2, $second->residentId);
        $this->assertSame('invalidate', $second->status);
        $this->assertNull($second->managerComment);
        $this->assertNull($second->residentNotification);
    }

    public function testEmptyArrayCreatesEmptyItemsList(): void
    {
        $dto = ValidationListInputDTO::fromRequest($this->makeRequest([]));

        $this->assertSame([], $dto->items);
    }

    public function testOptionalFieldsDefaultToNull(): void
    {
        $dto = ValidationListInputDTO::fromRequest($this->makeRequest([
            ['residentId' => 5, 'status' => 'validate'],
        ]));

        $this->assertNull($dto->items[0]->managerComment);
        $this->assertNull($dto->items[0]->residentNotification);
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], '{bad json}');
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        ValidationListInputDTO::fromRequest($request);
    }

    public function testNonArrayJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], '"just a string"');
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        ValidationListInputDTO::fromRequest($request);
    }

    // ── item validation ───────────────────────────────────────────────────────

    public function testItemNotAnObjectThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Item at index 0 must be an object');
        ValidationListInputDTO::fromRequest($this->makeRequest(['not-an-object']));
    }

    public function testInvalidStatusThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('status must be "validate" or "invalidate"');
        ValidationListInputDTO::fromRequest($this->makeRequest([
            ['residentId' => 1, 'status' => 'approve'],
        ]));
    }

    public function testMissingStatusThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('status must be "validate" or "invalidate"');
        ValidationListInputDTO::fromRequest($this->makeRequest([
            ['residentId' => 1],
        ]));
    }

    public function testResidentIdAsStringThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('residentId must be an integer');
        ValidationListInputDTO::fromRequest($this->makeRequest([
            ['residentId' => '1', 'status' => 'validate'],
        ]));
    }

    public function testMissingResidentIdThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('residentId must be an integer');
        ValidationListInputDTO::fromRequest($this->makeRequest([
            ['status' => 'validate'],
        ]));
    }

    public function testManagerCommentAsIntThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('managerComment must be a string');
        ValidationListInputDTO::fromRequest($this->makeRequest([
            ['residentId' => 1, 'status' => 'validate', 'managerComment' => 42],
        ]));
    }

    public function testResidentNotificationAsIntThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('residentNotification must be a string');
        ValidationListInputDTO::fromRequest($this->makeRequest([
            ['residentId' => 1, 'status' => 'validate', 'residentNotification' => false],
        ]));
    }

    // ── second item in batch validation ──────────────────────────────────────

    public function testSecondItemInvalidStatusThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Item at index 1');
        ValidationListInputDTO::fromRequest($this->makeRequest([
            ['residentId' => 1, 'status' => 'validate'],
            ['residentId' => 2, 'status' => 'bad'],
        ]));
    }
}
