<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\GardeInputDTO;
use App\Enum\GardeType;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for GardeInputDTO::fromRequest().
 */
class GardeInputDTOTest extends TestCase
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
            'year'        => 1,
            'dateOfStart' => '2026-03-10 20:00',
            'dateOfEnd'   => '2026-03-11 08:00',
            'type'        => 'callable',
            'comment'     => 'Guard shift',
        ];
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidCallableGardeCreatesDTO(): void
    {
        $dto = GardeInputDTO::fromRequest($this->makeRequest($this->validBody()));

        $this->assertSame(1, $dto->yearId);
        $this->assertSame('2026-03-10 20:00', $dto->dateOfStart);
        $this->assertSame('2026-03-11 08:00', $dto->dateOfEnd);
        $this->assertSame(GardeType::Callable, $dto->type);
        $this->assertSame('Guard shift', $dto->comment);
    }

    public function testHospitalTypeIsAccepted(): void
    {
        $body = $this->validBody();
        $body['type'] = 'hospital';

        $dto = GardeInputDTO::fromRequest($this->makeRequest($body));
        $this->assertSame(GardeType::Hospital, $dto->type);
    }

    public function testMissingCommentBecomesNull(): void
    {
        $body = $this->validBody();
        unset($body['comment']);

        $dto = GardeInputDTO::fromRequest($this->makeRequest($body));
        $this->assertNull($dto->comment);
    }

    public function testNullCommentBecomesNull(): void
    {
        $body = $this->validBody();
        $body['comment'] = null;

        $dto = GardeInputDTO::fromRequest($this->makeRequest($body));
        $this->assertNull($dto->comment);
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], 'not-json');

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        GardeInputDTO::fromRequest($request);
    }

    // ── missing fields ────────────────────────────────────────────────────────

    /** @dataProvider missingFieldProvider */
    public function testMissingFieldThrows(string $field): void
    {
        $body = $this->validBody();
        unset($body[$field]);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("Missing required field: $field");
        GardeInputDTO::fromRequest($this->makeRequest($body));
    }

    /** @return array<string, array<mixed>> */
    public static function missingFieldProvider(): array
    {
        return [
            'year'        => ['year'],
            'dateOfStart' => ['dateOfStart'],
            'dateOfEnd'   => ['dateOfEnd'],
            'type'        => ['type'],
        ];
    }

    // ── type validation ───────────────────────────────────────────────────────

    public function testInvalidTypeThrows(): void
    {
        $body = $this->validBody();
        $body['type'] = 'standby'; // not a valid GardeType

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('type must be one of:');
        GardeInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testEmptyTypeThrows(): void
    {
        $body = $this->validBody();
        $body['type'] = '';

        $this->expectException(\InvalidArgumentException::class);
        GardeInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── year validation ───────────────────────────────────────────────────────

    public function testYearAsStringThrows(): void
    {
        $body = $this->validBody();
        $body['year'] = '1';

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('year must be a positive integer');
        GardeInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testYearZeroThrows(): void
    {
        $body = $this->validBody();
        $body['year'] = 0;

        $this->expectException(\InvalidArgumentException::class);
        GardeInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── date validation ───────────────────────────────────────────────────────

    public function testInvalidDateOfStartThrows(): void
    {
        $body = $this->validBody();
        $body['dateOfStart'] = 'garbage';

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('dateOfStart must be a valid date string');
        GardeInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testInvalidDateOfEndThrows(): void
    {
        $body = $this->validBody();
        $body['dateOfEnd'] = 99999;

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('dateOfEnd must be a valid date string');
        GardeInputDTO::fromRequest($this->makeRequest($body));
    }
}
