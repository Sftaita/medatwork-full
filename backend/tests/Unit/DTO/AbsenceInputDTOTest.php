<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\AbsenceInputDTO;
use App\Enum\AbsenceType;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for AbsenceInputDTO::fromRequest().
 */
class AbsenceInputDTOTest extends TestCase
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
            'year'        => 2,
            'dateOfStart' => '2026-04-01',
            'dateOfEnd'   => '2026-04-03',
            'type'        => 'annualLeave',
        ];
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidInputCreatesDTO(): void
    {
        $dto = AbsenceInputDTO::fromRequest($this->makeRequest($this->validBody()));

        $this->assertSame(2, $dto->yearId);
        $this->assertSame('2026-04-01', $dto->dateOfStart);
        $this->assertSame('2026-04-03', $dto->dateOfEnd);
        $this->assertSame(AbsenceType::AnnualLeave, $dto->type);
    }

    public function testNullDateOfEndIsAccepted(): void
    {
        $body = $this->validBody();
        $body['dateOfEnd'] = null;

        $dto = AbsenceInputDTO::fromRequest($this->makeRequest($body));
        $this->assertNull($dto->dateOfEnd);
    }

    public function testAbsenceWithoutDateOfEndFieldIsAccepted(): void
    {
        $body = $this->validBody();
        unset($body['dateOfEnd']);

        $dto = AbsenceInputDTO::fromRequest($this->makeRequest($body));
        $this->assertNull($dto->dateOfEnd);
    }

    /** @dataProvider allAbsenceTypesProvider */
    public function testAllAbsenceTypesAreAccepted(string $typeValue, AbsenceType $expected): void
    {
        $body = $this->validBody();
        $body['type'] = $typeValue;

        $dto = AbsenceInputDTO::fromRequest($this->makeRequest($body));
        $this->assertSame($expected, $dto->type);
    }

    /** @return array<string, array<mixed>> */
    public static function allAbsenceTypesProvider(): array
    {
        return [
            'annualLeave'    => ['annualLeave',    AbsenceType::AnnualLeave],
            'paidLeave'      => ['paidLeave',      AbsenceType::PaidLeave],
            'sickLeave'      => ['sickLeave',      AbsenceType::SickLeave],
            'paternityLeave' => ['paternityLeave', AbsenceType::PaternityLeave],
            'maternityLeave' => ['maternityLeave', AbsenceType::MaternityLeave],
            'scientificLeave' => ['scientificLeave',AbsenceType::ScientificLeave],
            'casualLeave'    => ['casualLeave',    AbsenceType::CasualLeave],
            'recovery'       => ['recovery',       AbsenceType::Recovery],
        ];
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], '{bad json}');

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        AbsenceInputDTO::fromRequest($request);
    }

    // ── missing fields ────────────────────────────────────────────────────────

    /** @dataProvider missingFieldProvider */
    public function testMissingFieldThrows(string $field): void
    {
        $body = $this->validBody();
        unset($body[$field]);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("Missing required field: $field");
        AbsenceInputDTO::fromRequest($this->makeRequest($body));
    }

    /** @return array<string, array<mixed>> */
    public static function missingFieldProvider(): array
    {
        return [
            'year'        => ['year'],
            'dateOfStart' => ['dateOfStart'],
            'type'        => ['type'],
        ];
    }

    // ── year validation ───────────────────────────────────────────────────────

    public function testYearAsStringThrows(): void
    {
        $body = $this->validBody();
        $body['year'] = '2';

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('year must be a positive integer');
        AbsenceInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testYearZeroThrows(): void
    {
        $body = $this->validBody();
        $body['year'] = 0;

        $this->expectException(\InvalidArgumentException::class);
        AbsenceInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── date validation ───────────────────────────────────────────────────────

    public function testInvalidDateOfStartThrows(): void
    {
        $body = $this->validBody();
        $body['dateOfStart'] = 'not-a-date';

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('dateOfStart must be a valid date string');
        AbsenceInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testInvalidDateOfEndThrows(): void
    {
        $body = $this->validBody();
        $body['dateOfEnd'] = 'not-a-date';

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('dateOfEnd must be a valid date string or null');
        AbsenceInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── type validation ───────────────────────────────────────────────────────

    public function testInvalidTypeThrows(): void
    {
        $body = $this->validBody();
        $body['type'] = 'vacation'; // not a valid AbsenceType

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('type must be one of:');
        AbsenceInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testEmptyTypeThrows(): void
    {
        $body = $this->validBody();
        $body['type'] = '';

        $this->expectException(\InvalidArgumentException::class);
        AbsenceInputDTO::fromRequest($this->makeRequest($body));
    }
}
