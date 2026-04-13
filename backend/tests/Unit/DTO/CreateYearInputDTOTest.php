<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\CreateYearInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for CreateYearInputDTO::fromRequest().
 */
class CreateYearInputDTOTest extends TestCase
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
            'title'       => 'Stage 2025-2026',
            'comment'     => 'Commentaire',
            'location'    => 'Liège',
            'dateOfStart' => '2025-09-01',
            'dateOfEnd'   => '2026-08-31',
            'period'      => '6',
            'speciality'  => 'Chirurgie',
            'isMaster'    => false,
        ];
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidBodyCreatesDTO(): void
    {
        $dto = CreateYearInputDTO::fromRequest($this->makeRequest($this->validBody()));

        $this->assertSame('Stage 2025-2026', $dto->title);
        $this->assertSame('Commentaire', $dto->comment);
        $this->assertSame('Liège', $dto->location);
        $this->assertSame('2025-09-01', $dto->dateOfStart);
        $this->assertSame('2026-08-31', $dto->dateOfEnd);
        $this->assertSame('6', $dto->period);
        $this->assertSame('Chirurgie', $dto->speciality);
        $this->assertFalse($dto->isMaster);
    }

    public function testEmptyCommentIsAccepted(): void
    {
        $body = $this->validBody();
        $body['comment'] = '';
        $dto = CreateYearInputDTO::fromRequest($this->makeRequest($body));

        $this->assertSame('', $dto->comment);
    }

    public function testEmptyPeriodIsAccepted(): void
    {
        $body = $this->validBody();
        $body['period'] = '';
        $dto = CreateYearInputDTO::fromRequest($this->makeRequest($body));

        $this->assertSame('', $dto->period);
    }

    public function testIsMasterTrueIsAccepted(): void
    {
        $body = $this->validBody();
        $body['isMaster'] = true;
        $dto = CreateYearInputDTO::fromRequest($this->makeRequest($body));

        $this->assertTrue($dto->isMaster);
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], '{bad}');
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        CreateYearInputDTO::fromRequest($request);
    }

    // ── missing fields ────────────────────────────────────────────────────────

    /** @dataProvider missingFieldProvider */
    public function testMissingFieldThrows(string $field): void
    {
        $body = $this->validBody();
        unset($body[$field]);
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("Missing required field: $field");
        CreateYearInputDTO::fromRequest($this->makeRequest($body));
    }

    /** @return array<string, array<mixed>> */
    public static function missingFieldProvider(): array
    {
        return [
            'title'       => ['title'],
            'comment'     => ['comment'],
            'location'    => ['location'],
            'dateOfStart' => ['dateOfStart'],
            'dateOfEnd'   => ['dateOfEnd'],
            'period'      => ['period'],
            'speciality'  => ['speciality'],
            'isMaster'    => ['isMaster'],
        ];
    }

    // ── required non-empty fields ─────────────────────────────────────────────

    /** @dataProvider requiredNonEmptyFieldProvider */
    public function testEmptyRequiredFieldThrows(string $field): void
    {
        $body = $this->validBody();
        $body[$field] = '';
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("$field must be a non-empty string");
        CreateYearInputDTO::fromRequest($this->makeRequest($body));
    }

    /** @return array<string, array<mixed>> */
    public static function requiredNonEmptyFieldProvider(): array
    {
        return [
            'title'       => ['title'],
            'location'    => ['location'],
            'dateOfStart' => ['dateOfStart'],
            'dateOfEnd'   => ['dateOfEnd'],
            'speciality'  => ['speciality'],
        ];
    }

    // ── isMaster validation ───────────────────────────────────────────────────

    public function testIsMasterAsIntThrows(): void
    {
        $body = $this->validBody();
        $body['isMaster'] = 1;
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('isMaster must be a boolean');
        CreateYearInputDTO::fromRequest($this->makeRequest($body));
    }
}
