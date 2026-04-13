<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\ValidationBatchInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for ValidationBatchInputDTO::fromRequest().
 */
class ValidationBatchInputDTOTest extends TestCase
{
    /** @param array<string, mixed> $body */
    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body) ?: null);
    }

    /** @return array<string, mixed> */
    private function validBody(string $idsField = 'gardeIds'): array
    {
        return [
            $idsField => [1, 2, 3],
            'status'  => 'validate',
        ];
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidateStatusSetsIsValidateTrue(): void
    {
        $dto = ValidationBatchInputDTO::fromRequest($this->makeRequest($this->validBody()), 'gardeIds');

        $this->assertSame([1, 2, 3], $dto->ids);
        $this->assertTrue($dto->isValidate);
    }

    public function testInvalidateStatusSetsIsValidateFalse(): void
    {
        $body = ['gardeIds' => [5, 6], 'status' => 'invalidate'];
        $dto = ValidationBatchInputDTO::fromRequest($this->makeRequest($body), 'gardeIds');

        $this->assertSame([5, 6], $dto->ids);
        $this->assertFalse($dto->isValidate);
    }

    public function testEmptyIdsArrayIsAccepted(): void
    {
        $body = ['gardeIds' => [], 'status' => 'validate'];
        $dto = ValidationBatchInputDTO::fromRequest($this->makeRequest($body), 'gardeIds');

        $this->assertSame([], $dto->ids);
    }

    public function testSingleIdIsAccepted(): void
    {
        $body = ['gardeIds' => [42], 'status' => 'validate'];
        $dto = ValidationBatchInputDTO::fromRequest($this->makeRequest($body), 'gardeIds');

        $this->assertSame([42], $dto->ids);
    }

    /** @dataProvider idsFieldProvider */
    public function testDifferentIdsFieldNamesAreAccepted(string $idsField): void
    {
        $body = [$idsField => [1], 'status' => 'validate'];
        $dto = ValidationBatchInputDTO::fromRequest($this->makeRequest($body), $idsField);

        $this->assertSame([1], $dto->ids);
    }

    /** @return array<string, array<mixed>> */
    public static function idsFieldProvider(): array
    {
        return [
            'gardeIds'     => ['gardeIds'],
            'absenceIds'   => ['absenceIds'],
            'timesheetIds' => ['timesheetIds'],
        ];
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], '{bad json}');

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        ValidationBatchInputDTO::fromRequest($request, 'gardeIds');
    }

    // ── missing fields ────────────────────────────────────────────────────────

    public function testMissingIdsFieldThrows(): void
    {
        $body = ['status' => 'validate'];

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing required field: gardeIds');
        ValidationBatchInputDTO::fromRequest($this->makeRequest($body), 'gardeIds');
    }

    public function testMissingStatusThrows(): void
    {
        $body = ['gardeIds' => [1, 2]];

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing required field: status');
        ValidationBatchInputDTO::fromRequest($this->makeRequest($body), 'gardeIds');
    }

    // ── ids validation ────────────────────────────────────────────────────────

    public function testIdsNotAnArrayThrows(): void
    {
        $body = ['gardeIds' => 1, 'status' => 'validate'];

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('gardeIds must be an array');
        ValidationBatchInputDTO::fromRequest($this->makeRequest($body), 'gardeIds');
    }

    public function testIdsContainingStringThrows(): void
    {
        $body = ['gardeIds' => [1, 'two', 3], 'status' => 'validate'];

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('All gardeIds must be integers');
        ValidationBatchInputDTO::fromRequest($this->makeRequest($body), 'gardeIds');
    }

    public function testIdsContainingFloatThrows(): void
    {
        $body = ['gardeIds' => [1, 2.5], 'status' => 'validate'];

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('All gardeIds must be integers');
        ValidationBatchInputDTO::fromRequest($this->makeRequest($body), 'gardeIds');
    }

    public function testIdsContainingNullThrows(): void
    {
        $body = ['gardeIds' => [1, null], 'status' => 'validate'];

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('All gardeIds must be integers');
        ValidationBatchInputDTO::fromRequest($this->makeRequest($body), 'gardeIds');
    }

    // ── status validation ─────────────────────────────────────────────────────

    public function testInvalidStatusThrows(): void
    {
        $body = ['gardeIds' => [1], 'status' => 'approve'];

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('status must be "validate" or "invalidate"');
        ValidationBatchInputDTO::fromRequest($this->makeRequest($body), 'gardeIds');
    }

    public function testEmptyStatusThrows(): void
    {
        $body = ['gardeIds' => [1], 'status' => ''];

        $this->expectException(\InvalidArgumentException::class);
        ValidationBatchInputDTO::fromRequest($this->makeRequest($body), 'gardeIds');
    }

    public function testNullStatusThrows(): void
    {
        $body = ['gardeIds' => [1], 'status' => null];

        $this->expectException(\InvalidArgumentException::class);
        ValidationBatchInputDTO::fromRequest($this->makeRequest($body), 'gardeIds');
    }
}
