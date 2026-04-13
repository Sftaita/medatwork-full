<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\TimesheetInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for TimesheetInputDTO::fromRequest().
 * No database, no Symfony kernel — pure PHP logic.
 */
class TimesheetInputDTOTest extends TestCase
{
    // ── helpers ──────────────────────────────────────────────────────────────

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
            'dateOfStart' => '2026-03-01 08:00',
            'dateOfEnd'   => '2026-03-01 18:00',
            'pause'       => 30,
            'scientific'  => 0,
            'called'      => false,
        ];
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidInputCreatesDTO(): void
    {
        $dto = TimesheetInputDTO::fromRequest($this->makeRequest($this->validBody()));

        $this->assertSame(1, $dto->yearId);
        $this->assertSame('2026-03-01 08:00', $dto->dateOfStart);
        $this->assertSame('2026-03-01 18:00', $dto->dateOfEnd);
        $this->assertSame(30, $dto->pause);
        $this->assertSame(0, $dto->scientific);
        $this->assertFalse($dto->called);
    }

    public function testCalledTrueIsAccepted(): void
    {
        $body = $this->validBody();
        $body['called'] = true;

        $dto = TimesheetInputDTO::fromRequest($this->makeRequest($body));
        $this->assertTrue($dto->called);
    }

    public function testZeroPauseIsAccepted(): void
    {
        $body = $this->validBody();
        $body['pause'] = 0;

        $dto = TimesheetInputDTO::fromRequest($this->makeRequest($body));
        $this->assertSame(0, $dto->pause);
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], 'not-json');

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        TimesheetInputDTO::fromRequest($request);
    }

    // ── missing fields ────────────────────────────────────────────────────────

    /** @dataProvider missingFieldProvider */
    public function testMissingFieldThrows(string $field): void
    {
        $body = $this->validBody();
        unset($body[$field]);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("Missing required field: $field");
        TimesheetInputDTO::fromRequest($this->makeRequest($body));
    }

    /** @return array<string, array<mixed>> */
    public static function missingFieldProvider(): array
    {
        return [
            'year'        => ['year'],
            'dateOfStart' => ['dateOfStart'],
            'dateOfEnd'   => ['dateOfEnd'],
            'pause'       => ['pause'],
            'scientific'  => ['scientific'],
            'called'      => ['called'],
        ];
    }

    // ── year validation ───────────────────────────────────────────────────────

    public function testYearAsStringThrows(): void
    {
        $body = $this->validBody();
        $body['year'] = '1';

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('year must be a positive integer');
        TimesheetInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testYearZeroThrows(): void
    {
        $body = $this->validBody();
        $body['year'] = 0;

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('year must be a positive integer');
        TimesheetInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testYearNegativeThrows(): void
    {
        $body = $this->validBody();
        $body['year'] = -5;

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('year must be a positive integer');
        TimesheetInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── date validation ───────────────────────────────────────────────────────

    public function testInvalidDateOfStartThrows(): void
    {
        $body = $this->validBody();
        $body['dateOfStart'] = 'not-a-date';

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('dateOfStart must be a valid date string');
        TimesheetInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testInvalidDateOfEndThrows(): void
    {
        $body = $this->validBody();
        $body['dateOfEnd'] = 12345;

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('dateOfEnd must be a valid date string');
        TimesheetInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── pause / scientific validation ─────────────────────────────────────────

    public function testNegativePauseThrows(): void
    {
        $body = $this->validBody();
        $body['pause'] = -1;

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('pause must be a non-negative integer');
        TimesheetInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testPauseAsStringThrows(): void
    {
        $body = $this->validBody();
        $body['pause'] = '30';

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('pause must be a non-negative integer');
        TimesheetInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testNegativeScientificThrows(): void
    {
        $body = $this->validBody();
        $body['scientific'] = -10;

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('scientific must be a non-negative integer');
        TimesheetInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── called validation ─────────────────────────────────────────────────────

    public function testCalledAsStringThrows(): void
    {
        $body = $this->validBody();
        $body['called'] = 'true';

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('called must be a boolean');
        TimesheetInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testCalledAsIntThrows(): void
    {
        $body = $this->validBody();
        $body['called'] = 1;

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('called must be a boolean');
        TimesheetInputDTO::fromRequest($this->makeRequest($body));
    }
}
