<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\HospitalAdminSetupInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for HospitalAdminSetupInputDTO.
 *
 * Covers:
 * - Happy path: valid payload
 * - Firstname/lastname trimmed
 * - Password too short → exception
 * - Missing required fields → exception
 * - Invalid JSON → exception
 */
final class HospitalAdminSetupInputDTOTest extends TestCase
{
    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body));
    }

    public function testHappyPath(): void
    {
        $dto = HospitalAdminSetupInputDTO::fromRequest($this->makeRequest([
            'password'  => 'Secure123',
            'firstname' => 'Jean',
            'lastname'  => 'Dupont',
        ]));

        $this->assertSame('Secure123', $dto->password);
        $this->assertSame('Jean', $dto->firstname);
        $this->assertSame('Dupont', $dto->lastname);
    }

    public function testFirstnameLastnameTrimmed(): void
    {
        $dto = HospitalAdminSetupInputDTO::fromRequest($this->makeRequest([
            'password'  => 'Secure123',
            'firstname' => '  Jean  ',
            'lastname'  => '  Dupont  ',
        ]));

        $this->assertSame('Jean', $dto->firstname);
        $this->assertSame('Dupont', $dto->lastname);
    }

    public function testPasswordTooShortThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/8 characters/');

        HospitalAdminSetupInputDTO::fromRequest($this->makeRequest([
            'password'  => 'short',
            'firstname' => 'Jean',
            'lastname'  => 'Dupont',
        ]));
    }

    public function testPasswordExactly8CharsAccepted(): void
    {
        $dto = HospitalAdminSetupInputDTO::fromRequest($this->makeRequest([
            'password'  => '12345678',
            'firstname' => 'Jean',
            'lastname'  => 'Dupont',
        ]));

        $this->assertSame('12345678', $dto->password);
    }

    public function testMissingPasswordThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        HospitalAdminSetupInputDTO::fromRequest($this->makeRequest([
            'firstname' => 'Jean',
            'lastname'  => 'Dupont',
        ]));
    }

    public function testMissingFirstnameThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        HospitalAdminSetupInputDTO::fromRequest($this->makeRequest([
            'password' => 'Secure123',
            'lastname' => 'Dupont',
        ]));
    }

    public function testEmptyLastnameThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        HospitalAdminSetupInputDTO::fromRequest($this->makeRequest([
            'password'  => 'Secure123',
            'firstname' => 'Jean',
            'lastname'  => '',
        ]));
    }

    public function testInvalidJsonThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $req = new Request([], [], [], [], [], [], 'not json');
        HospitalAdminSetupInputDTO::fromRequest($req);
    }
}
