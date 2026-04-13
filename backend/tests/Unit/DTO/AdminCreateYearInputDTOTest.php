<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\AdminCreateYearInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for AdminCreateYearInputDTO.
 *
 * Covers:
 * - Happy path: full body with all fields
 * - Period derived from dates when not provided
 * - Comment and speciality are optional (null when absent)
 * - Missing required fields return exception
 * - Invalid date formats return exception
 * - dateOfEnd <= dateOfStart returns exception
 * - Invalid JSON returns exception
 */
final class AdminCreateYearInputDTOTest extends TestCase
{
    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body));
    }

    private function baseBody(): array
    {
        return [
            'title'       => 'Stage cardiologie',
            'dateOfStart' => '2025-11-01',
            'dateOfEnd'   => '2026-04-30',
            'location'    => 'CHU Liège',
        ];
    }

    public function testHappyPathAllFields(): void
    {
        $dto = AdminCreateYearInputDTO::fromRequest($this->makeRequest(array_merge($this->baseBody(), [
            'period'    => '2025-2026',
            'comment'   => 'Semestre B',
            'speciality' => 'Cardiologie',
        ])));

        $this->assertSame('Stage cardiologie', $dto->title);
        $this->assertSame('2025-2026', $dto->period);
        $this->assertSame('Semestre B', $dto->comment);
        $this->assertSame('Cardiologie', $dto->speciality);
    }

    public function testPeriodDerivedFromDatesWhenAbsent(): void
    {
        $dto = AdminCreateYearInputDTO::fromRequest($this->makeRequest($this->baseBody()));

        $this->assertSame('2025-2026', $dto->period);
    }

    public function testCommentIsNullWhenAbsent(): void
    {
        $dto = AdminCreateYearInputDTO::fromRequest($this->makeRequest($this->baseBody()));

        $this->assertNull($dto->comment);
    }

    public function testSpecialityIsNullWhenAbsent(): void
    {
        $dto = AdminCreateYearInputDTO::fromRequest($this->makeRequest($this->baseBody()));

        $this->assertNull($dto->speciality);
    }

    public function testMissingTitleThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $body = $this->baseBody();
        unset($body['title']);
        AdminCreateYearInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testMissingDateOfStartThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $body = $this->baseBody();
        unset($body['dateOfStart']);
        AdminCreateYearInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testMissingLocationThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $body = $this->baseBody();
        unset($body['location']);
        AdminCreateYearInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testInvalidDateFormatThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        AdminCreateYearInputDTO::fromRequest($this->makeRequest(array_merge($this->baseBody(), [
            'dateOfStart' => '01/11/2025', // wrong format
        ])));
    }

    public function testEndBeforeStartThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        AdminCreateYearInputDTO::fromRequest($this->makeRequest(array_merge($this->baseBody(), [
            'dateOfStart' => '2026-04-30',
            'dateOfEnd'   => '2025-11-01',
        ])));
    }

    public function testSameDateStartEndThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        AdminCreateYearInputDTO::fromRequest($this->makeRequest(array_merge($this->baseBody(), [
            'dateOfStart' => '2025-11-01',
            'dateOfEnd'   => '2025-11-01',
        ])));
    }

    public function testInvalidJsonThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $req = new Request([], [], [], [], [], [], 'not json');
        AdminCreateYearInputDTO::fromRequest($req);
    }
}
