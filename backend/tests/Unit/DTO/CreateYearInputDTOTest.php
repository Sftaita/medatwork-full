<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\CreateYearInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for CreateYearInputDTO::fromRequest().
 *
 * As of 2026-04-20: location, period, comment are optional (can be absent or empty).
 * hospitalId is optional (nullable int).
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
            'dateOfStart' => '2025-09-01',
            'dateOfEnd'   => '2026-08-31',
            'speciality'  => 'Chirurgie',
            'isMaster'    => false,
        ];
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidBodyCreatesDTO(): void
    {
        $body = array_merge($this->validBody(), [
            'comment'    => 'Commentaire',
            'location'   => 'Liège',
            'period'     => '6',
            'hospitalId' => 3,
        ]);
        $dto = CreateYearInputDTO::fromRequest($this->makeRequest($body));

        $this->assertSame('Stage 2025-2026', $dto->title);
        $this->assertSame('Commentaire', $dto->comment);
        $this->assertSame('Liège', $dto->location);
        $this->assertSame('2025-09-01', $dto->dateOfStart);
        $this->assertSame('2026-08-31', $dto->dateOfEnd);
        $this->assertSame('6', $dto->period);
        $this->assertSame('Chirurgie', $dto->speciality);
        $this->assertFalse($dto->isMaster);
        $this->assertSame(3, $dto->hospitalId);
    }

    public function testMinimalBodyWithoutOptionalFields(): void
    {
        $dto = CreateYearInputDTO::fromRequest($this->makeRequest($this->validBody()));

        $this->assertSame('Stage 2025-2026', $dto->title);
        $this->assertSame('', $dto->location);
        $this->assertSame('', $dto->comment);
        $this->assertSame('', $dto->period);
        $this->assertNull($dto->hospitalId);
    }

    public function testEmptyCommentIsAccepted(): void
    {
        $body = array_merge($this->validBody(), ['comment' => '']);
        $dto  = CreateYearInputDTO::fromRequest($this->makeRequest($body));
        $this->assertSame('', $dto->comment);
    }

    public function testEmptyPeriodIsAccepted(): void
    {
        $body = array_merge($this->validBody(), ['period' => '']);
        $dto  = CreateYearInputDTO::fromRequest($this->makeRequest($body));
        $this->assertSame('', $dto->period);
    }

    public function testEmptyLocationIsAccepted(): void
    {
        $body = array_merge($this->validBody(), ['location' => '']);
        $dto  = CreateYearInputDTO::fromRequest($this->makeRequest($body));
        $this->assertSame('', $dto->location);
    }

    public function testHospitalIdNullWhenAbsent(): void
    {
        $dto = CreateYearInputDTO::fromRequest($this->makeRequest($this->validBody()));
        $this->assertNull($dto->hospitalId);
    }

    public function testIsMasterTrueIsAccepted(): void
    {
        $body = array_merge($this->validBody(), ['isMaster' => true]);
        $dto  = CreateYearInputDTO::fromRequest($this->makeRequest($body));
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

    // ── missing required fields ───────────────────────────────────────────────

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
        // location, period, comment are optional — not listed here
        return [
            'title'       => ['title'],
            'dateOfStart' => ['dateOfStart'],
            'dateOfEnd'   => ['dateOfEnd'],
            'speciality'  => ['speciality'],
            'isMaster'    => ['isMaster'],
        ];
    }

    // ── required non-empty fields ─────────────────────────────────────────────

    /** @dataProvider requiredNonEmptyFieldProvider */
    public function testEmptyRequiredFieldThrows(string $field): void
    {
        $body = array_merge($this->validBody(), [$field => '']);
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("$field must be a non-empty string");
        CreateYearInputDTO::fromRequest($this->makeRequest($body));
    }

    /** @return array<string, array<mixed>> */
    public static function requiredNonEmptyFieldProvider(): array
    {
        // location is now optional — omitted from this list
        return [
            'title'       => ['title'],
            'dateOfStart' => ['dateOfStart'],
            'dateOfEnd'   => ['dateOfEnd'],
            'speciality'  => ['speciality'],
        ];
    }

    // ── isMaster validation ───────────────────────────────────────────────────

    public function testIsMasterAsIntThrows(): void
    {
        $body = array_merge($this->validBody(), ['isMaster' => 1]);
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('isMaster must be a boolean');
        CreateYearInputDTO::fromRequest($this->makeRequest($body));
    }
}
