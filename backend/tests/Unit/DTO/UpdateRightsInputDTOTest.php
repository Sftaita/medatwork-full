<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\UpdateRightsInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for UpdateRightsInputDTO::fromRequest().
 */
class UpdateRightsInputDTOTest extends TestCase
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
            'managerYearId' => 7,
            'newRights'     => [
                'admin'           => true,
                'dataAccess'      => false,
                'dataValidation'  => true,
                'dataDownload'    => false,
                'canManageAgenda' => true,
                'hasAgendaAccess' => false,
            ],
        ];
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidBodyCreatesDTO(): void
    {
        $dto = UpdateRightsInputDTO::fromRequest($this->makeRequest($this->validBody()));

        $this->assertSame(7, $dto->managerYearId);
        $this->assertTrue($dto->admin);
        $this->assertFalse($dto->dataAccess);
        $this->assertTrue($dto->dataValidation);
        $this->assertFalse($dto->dataDownload);
        $this->assertTrue($dto->canManageAgenda);
        $this->assertFalse($dto->hasAgendaAccess);
    }

    public function testMissingRightsDefaultToFalse(): void
    {
        $dto = UpdateRightsInputDTO::fromRequest($this->makeRequest([
            'managerYearId' => 3,
            'newRights'     => [],
        ]));

        $this->assertFalse($dto->admin);
        $this->assertFalse($dto->dataAccess);
        $this->assertFalse($dto->dataValidation);
        $this->assertFalse($dto->dataDownload);
        $this->assertFalse($dto->canManageAgenda);
        $this->assertFalse($dto->hasAgendaAccess);
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], '{bad}');
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        UpdateRightsInputDTO::fromRequest($request);
    }

    // ── missing fields ────────────────────────────────────────────────────────

    public function testMissingManagerYearIdThrows(): void
    {
        $body = $this->validBody();
        unset($body['managerYearId']);
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing required field: managerYearId');
        UpdateRightsInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testMissingNewRightsThrows(): void
    {
        $body = $this->validBody();
        unset($body['newRights']);
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing required field: newRights');
        UpdateRightsInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── managerYearId validation ──────────────────────────────────────────────

    public function testManagerYearIdZeroThrows(): void
    {
        $body = $this->validBody();
        $body['managerYearId'] = 0;
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('managerYearId must be a positive integer');
        UpdateRightsInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testManagerYearIdAsStringThrows(): void
    {
        $body = $this->validBody();
        $body['managerYearId'] = '7';
        $this->expectException(\InvalidArgumentException::class);
        UpdateRightsInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── newRights validation ──────────────────────────────────────────────────

    public function testNewRightsAsStringThrows(): void
    {
        $body = $this->validBody();
        $body['newRights'] = 'invalid';
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('newRights must be an object');
        UpdateRightsInputDTO::fromRequest($this->makeRequest($body));
    }
}
