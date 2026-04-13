<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\WeekTaskInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for WeekTaskInputDTO::fromRequest().
 */
class WeekTaskInputDTOTest extends TestCase
{
    /** @param array<string, mixed> $body */
    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body) ?: null);
    }

    /** @return array<string, mixed> */
    private function createBody(): array
    {
        return [
            'title'          => 'Morning rounds',
            'description'    => 'Ward rounds at 8am',
            'dayOfWeek'      => 1,
            'startTime'      => '08:00',
            'endTime'        => '10:00',
            'weekTemplateId' => 5,
        ];
    }

    /** @return array<string, mixed> */
    private function updateBody(): array
    {
        $body = $this->createBody();
        unset($body['weekTemplateId']);
        return $body;
    }

    // ── create mode ───────────────────────────────────────────────────────────

    public function testCreateModeCreatesDTO(): void
    {
        $dto = WeekTaskInputDTO::fromRequest($this->makeRequest($this->createBody()), true);

        $this->assertSame('Morning rounds', $dto->title);
        $this->assertSame('Ward rounds at 8am', $dto->description);
        $this->assertSame(1, $dto->dayOfWeek);
        $this->assertSame('08:00', $dto->startTime);
        $this->assertSame('10:00', $dto->endTime);
        $this->assertSame(5, $dto->weekTemplateId);
    }

    public function testUpdateModeCreatesDTO(): void
    {
        $dto = WeekTaskInputDTO::fromRequest($this->makeRequest($this->updateBody()), false);

        $this->assertNull($dto->weekTemplateId);
    }

    /** @dataProvider dayOfWeekProvider */
    public function testAllValidDaysOfWeekAreAccepted(int $day): void
    {
        $body = $this->createBody();
        $body['dayOfWeek'] = $day;
        $dto = WeekTaskInputDTO::fromRequest($this->makeRequest($body), true);
        $this->assertSame($day, $dto->dayOfWeek);
    }

    /** @return array<int, array<mixed>> */
    public static function dayOfWeekProvider(): array
    {
        return array_map(fn ($d) => [$d], range(1, 7));
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], '{bad}');
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        WeekTaskInputDTO::fromRequest($request, true);
    }

    // ── missing fields (create mode) ──────────────────────────────────────────

    /** @dataProvider createMissingFieldProvider */
    public function testCreateMissingFieldThrows(string $field): void
    {
        $body = $this->createBody();
        unset($body[$field]);
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("Missing required field: $field");
        WeekTaskInputDTO::fromRequest($this->makeRequest($body), true);
    }

    /** @return array<string, array<mixed>> */
    public static function createMissingFieldProvider(): array
    {
        return [
            'title'          => ['title'],
            'description'    => ['description'],
            'dayOfWeek'      => ['dayOfWeek'],
            'startTime'      => ['startTime'],
            'endTime'        => ['endTime'],
            'weekTemplateId' => ['weekTemplateId'],
        ];
    }

    // ── dayOfWeek validation ──────────────────────────────────────────────────

    public function testDayOfWeekZeroThrows(): void
    {
        $body = $this->createBody();
        $body['dayOfWeek'] = 0;
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('dayOfWeek must be an integer between 1 and 7');
        WeekTaskInputDTO::fromRequest($this->makeRequest($body), true);
    }

    public function testDayOfWeekEightThrows(): void
    {
        $body = $this->createBody();
        $body['dayOfWeek'] = 8;
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('dayOfWeek must be an integer between 1 and 7');
        WeekTaskInputDTO::fromRequest($this->makeRequest($body), true);
    }

    public function testDayOfWeekAsStringThrows(): void
    {
        $body = $this->createBody();
        $body['dayOfWeek'] = '1';
        $this->expectException(\InvalidArgumentException::class);
        WeekTaskInputDTO::fromRequest($this->makeRequest($body), true);
    }

    // ── weekTemplateId validation ─────────────────────────────────────────────

    public function testWeekTemplateIdZeroThrows(): void
    {
        $body = $this->createBody();
        $body['weekTemplateId'] = 0;
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('weekTemplateId must be a positive integer');
        WeekTaskInputDTO::fromRequest($this->makeRequest($body), true);
    }

    public function testWeekTemplateIdAsStringThrows(): void
    {
        $body = $this->createBody();
        $body['weekTemplateId'] = '5';
        $this->expectException(\InvalidArgumentException::class);
        WeekTaskInputDTO::fromRequest($this->makeRequest($body), true);
    }

    // ── time fields ───────────────────────────────────────────────────────────

    public function testEmptyStartTimeThrows(): void
    {
        $body = $this->createBody();
        $body['startTime'] = '';
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('startTime must be a non-empty string');
        WeekTaskInputDTO::fromRequest($this->makeRequest($body), true);
    }
}
