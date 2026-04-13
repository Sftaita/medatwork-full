<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\UpdateResidentAccountInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for UpdateResidentAccountInputDTO::fromRequest().
 */
class UpdateResidentAccountInputDTOTest extends TestCase
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
            'target'   => 'firstname',
            'newValue' => 'Alice',
        ];
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidBodyCreatesDTO(): void
    {
        $dto = UpdateResidentAccountInputDTO::fromRequest($this->makeRequest($this->validBody()));

        $this->assertSame('firstname', $dto->target);
        $this->assertSame('Alice', $dto->newValue);
    }

    /** @dataProvider allowedTargetProvider */
    public function testAllAllowedTargetsAreAccepted(string $target): void
    {
        $dto = UpdateResidentAccountInputDTO::fromRequest($this->makeRequest([
            'target'   => $target,
            'newValue' => 'someValue',
        ]));

        $this->assertSame($target, $dto->target);
    }

    /** @return array<string, array<mixed>> */
    public static function allowedTargetProvider(): array
    {
        return [
            'firstname'    => ['firstname'],
            'lastname'     => ['lastname'],
            'sexe'         => ['sexe'],
            'dateOfMaster' => ['dateOfMaster'],
            'speciality'   => ['speciality'],
            'dateOfBirth'  => ['dateOfBirth'],
            'university'   => ['university'],
        ];
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], '{bad json}');
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        UpdateResidentAccountInputDTO::fromRequest($request);
    }

    // ── missing fields ────────────────────────────────────────────────────────

    public function testMissingTargetThrows(): void
    {
        $body = $this->validBody();
        unset($body['target']);
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing required field: target');
        UpdateResidentAccountInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testMissingNewValueThrows(): void
    {
        $body = $this->validBody();
        unset($body['newValue']);
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing required field: newValue');
        UpdateResidentAccountInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── type and value validation ─────────────────────────────────────────────

    public function testTargetAsIntThrows(): void
    {
        $body = $this->validBody();
        $body['target'] = 42;
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('target must be a string');
        UpdateResidentAccountInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testUnknownTargetThrows(): void
    {
        $body = $this->validBody();
        $body['target'] = 'password';
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('target must be one of:');
        UpdateResidentAccountInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testNewValueAsIntThrows(): void
    {
        $body = $this->validBody();
        $body['newValue'] = 99;
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('newValue must be a string');
        UpdateResidentAccountInputDTO::fromRequest($this->makeRequest($body));
    }
}
