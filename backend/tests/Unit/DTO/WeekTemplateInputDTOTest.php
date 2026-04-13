<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\WeekTemplateInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for WeekTemplateInputDTO::fromRequest().
 */
class WeekTemplateInputDTOTest extends TestCase
{
    /** @param array<string, mixed> $body */
    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body) ?: null);
    }

    // ── create mode (color optional) ──────────────────────────────────────────

    public function testCreateWithColorCreatesDTO(): void
    {
        $dto = WeekTemplateInputDTO::fromRequest($this->makeRequest([
            'title'       => 'Morning rounds',
            'description' => 'Daily morning rounds',
            'color'       => '#ff0000',
        ]));

        $this->assertSame('Morning rounds', $dto->title);
        $this->assertSame('Daily morning rounds', $dto->description);
        $this->assertSame('#ff0000', $dto->color);
    }

    public function testCreateWithoutColorUsesDefault(): void
    {
        $dto = WeekTemplateInputDTO::fromRequest($this->makeRequest([
            'title'       => 'Morning rounds',
            'description' => 'Daily morning rounds',
        ]));

        $this->assertSame('#16b1ff', $dto->color);
    }

    public function testEmptyDescriptionIsAccepted(): void
    {
        $dto = WeekTemplateInputDTO::fromRequest($this->makeRequest([
            'title'       => 'T',
            'description' => '',
        ]));

        $this->assertSame('', $dto->description);
    }

    // ── update mode (color required — pass defaultColor='') ───────────────────

    public function testUpdateWithColorCreatesDTO(): void
    {
        $dto = WeekTemplateInputDTO::fromRequest(
            $this->makeRequest(['title' => 'T', 'description' => 'D', 'color' => '#abc']),
            ''
        );

        $this->assertSame('#abc', $dto->color);
    }

    public function testUpdateMissingColorThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing required field: color');
        WeekTemplateInputDTO::fromRequest(
            $this->makeRequest(['title' => 'T', 'description' => 'D']),
            ''
        );
    }

    public function testUpdateEmptyColorThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('color must be a non-empty string');
        WeekTemplateInputDTO::fromRequest(
            $this->makeRequest(['title' => 'T', 'description' => 'D', 'color' => '']),
            ''
        );
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], '{bad}');
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        WeekTemplateInputDTO::fromRequest($request);
    }

    // ── missing / invalid fields ──────────────────────────────────────────────

    public function testMissingTitleThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing required field: title');
        WeekTemplateInputDTO::fromRequest($this->makeRequest(['description' => 'D']));
    }

    public function testMissingDescriptionThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing required field: description');
        WeekTemplateInputDTO::fromRequest($this->makeRequest(['title' => 'T']));
    }

    public function testEmptyTitleThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('title must be a non-empty string');
        WeekTemplateInputDTO::fromRequest($this->makeRequest(['title' => '', 'description' => 'D']));
    }

    public function testTitleAsIntThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('title must be a non-empty string');
        WeekTemplateInputDTO::fromRequest($this->makeRequest(['title' => 123, 'description' => 'D']));
    }
}
