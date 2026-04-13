<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\ResidentRegistrationInputDTO;
use App\Enum\Sexe;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for ResidentRegistrationInputDTO::fromRequest().
 */
class ResidentRegistrationInputDTOTest extends TestCase
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
            'email'        => 'resident@hospital.be',
            'password'     => 'SuperSecret123!',
            'firstname'    => 'Alice',
            'lastname'     => 'Dupont',
            'role'         => 'intern',
            'sexe'         => 'female',
            'speciality'   => 'cardiology',
            'dateOfMaster' => '2020-09-01',
        ];
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidInputCreatesDTO(): void
    {
        $dto = ResidentRegistrationInputDTO::fromRequest($this->makeRequest($this->validBody()));

        $this->assertSame('resident@hospital.be', $dto->email);
        $this->assertSame('SuperSecret123!', $dto->password);
        $this->assertSame('Alice', $dto->firstname);
        $this->assertSame('Dupont', $dto->lastname);
        $this->assertSame('intern', $dto->role);
        $this->assertSame(Sexe::Female, $dto->sexe);
        $this->assertSame('cardiology', $dto->speciality);
        $this->assertSame('2020-09-01', $dto->dateOfMaster);
    }

    public function testEmailIsLowercased(): void
    {
        $body = $this->validBody();
        $body['email'] = 'Resident@Hospital.BE';

        $dto = ResidentRegistrationInputDTO::fromRequest($this->makeRequest($body));
        $this->assertSame('resident@hospital.be', $dto->email);
    }

    /** @dataProvider sexeProvider */
    public function testBothSexeValuesAreAccepted(string $value, Sexe $expected): void
    {
        $body = $this->validBody();
        $body['sexe'] = $value;

        $dto = ResidentRegistrationInputDTO::fromRequest($this->makeRequest($body));
        $this->assertSame($expected, $dto->sexe);
    }

    /** @return array<string, array<mixed>> */
    public static function sexeProvider(): array
    {
        return [
            'male'   => ['male',   Sexe::Male],
            'female' => ['female', Sexe::Female],
        ];
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], '{bad}');

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        ResidentRegistrationInputDTO::fromRequest($request);
    }

    // ── missing fields ────────────────────────────────────────────────────────

    /** @dataProvider missingFieldProvider */
    public function testMissingFieldThrows(string $field): void
    {
        $body = $this->validBody();
        unset($body[$field]);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("Missing required field: $field");
        ResidentRegistrationInputDTO::fromRequest($this->makeRequest($body));
    }

    /** @return array<string, array<mixed>> */
    public static function missingFieldProvider(): array
    {
        return [
            'email'        => ['email'],
            'password'     => ['password'],
            'firstname'    => ['firstname'],
            'lastname'     => ['lastname'],
            'role'         => ['role'],
            'sexe'         => ['sexe'],
            'speciality'   => ['speciality'],
            'dateOfMaster' => ['dateOfMaster'],
        ];
    }

    // ── email validation ──────────────────────────────────────────────────────

    public function testInvalidEmailThrows(): void
    {
        $body = $this->validBody();
        $body['email'] = 'not-an-email';

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('email must be a valid email address');
        ResidentRegistrationInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testEmailAsIntegerThrows(): void
    {
        $body = $this->validBody();
        $body['email'] = 12345;

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('email must be a valid email address');
        ResidentRegistrationInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── password validation ───────────────────────────────────────────────────

    public function testPasswordExactly8CharsIsAccepted(): void
    {
        $body = $this->validBody();
        $body['password'] = '12345678';
        $dto = ResidentRegistrationInputDTO::fromRequest($this->makeRequest($body));
        $this->assertSame('12345678', $dto->password);
    }

    public function testEmptyPasswordThrows(): void
    {
        $body = $this->validBody();
        $body['password'] = '';

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('password must be at least 8 characters');
        ResidentRegistrationInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testPasswordTooShortThrows(): void
    {
        $body = $this->validBody();
        $body['password'] = 'abc1234'; // 7 chars

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('password must be at least 8 characters');
        ResidentRegistrationInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testPasswordAsIntegerThrows(): void
    {
        $body = $this->validBody();
        $body['password'] = 12345678;

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('password must be at least 8 characters');
        ResidentRegistrationInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── string field validation ───────────────────────────────────────────────

    /** @dataProvider emptyStringFieldProvider */
    public function testEmptyStringFieldThrows(string $field): void
    {
        $body = $this->validBody();
        $body[$field] = '';

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("$field must be a non-empty string");
        ResidentRegistrationInputDTO::fromRequest($this->makeRequest($body));
    }

    /** @return array<string, array<mixed>> */
    public static function emptyStringFieldProvider(): array
    {
        return [
            'firstname'  => ['firstname'],
            'lastname'   => ['lastname'],
            'role'       => ['role'],
            'speciality' => ['speciality'],
        ];
    }

    // ── sexe validation ───────────────────────────────────────────────────────

    public function testInvalidSexeThrows(): void
    {
        $body = $this->validBody();
        $body['sexe'] = 'other';

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('sexe must be one of:');
        ResidentRegistrationInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testEmptySexeThrows(): void
    {
        $body = $this->validBody();
        $body['sexe'] = '';

        $this->expectException(\InvalidArgumentException::class);
        ResidentRegistrationInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── dateOfMaster validation ───────────────────────────────────────────────

    public function testInvalidDateOfMasterThrows(): void
    {
        $body = $this->validBody();
        $body['dateOfMaster'] = 'not-a-date';

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('dateOfMaster must be a valid date string');
        ResidentRegistrationInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testDateOfMasterAsIntegerThrows(): void
    {
        $body = $this->validBody();
        $body['dateOfMaster'] = 20200901;

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('dateOfMaster must be a valid date string');
        ResidentRegistrationInputDTO::fromRequest($this->makeRequest($body));
    }
}
