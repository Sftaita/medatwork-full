<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\NewManagerInputDTO;
use App\Enum\Sexe;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for NewManagerInputDTO::fromRequest().
 */
class NewManagerInputDTOTest extends TestCase
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
            'email'     => 'Doctor@Hospital.BE',
            'password'  => 'secret123',
            'firstname' => 'Jean',
            'lastname'  => 'Dupont',
            'sexe'      => 'male',
            'job'       => 'Chirurgien',
        ];
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidBodyCreatesDTO(): void
    {
        $dto = NewManagerInputDTO::fromRequest($this->makeRequest($this->validBody()));

        $this->assertSame('doctor@hospital.be', $dto->email); // lowercased
        $this->assertSame('secret123', $dto->password);
        $this->assertSame('Jean', $dto->firstname);
        $this->assertSame('Dupont', $dto->lastname);
        $this->assertSame(Sexe::Male, $dto->sexe);
        $this->assertSame('Chirurgien', $dto->job);
        $this->assertNull($dto->hospitalId);
    }

    public function testFemaleSexeIsAccepted(): void
    {
        $body = $this->validBody();
        $body['sexe'] = 'female';
        $dto = NewManagerInputDTO::fromRequest($this->makeRequest($body));

        $this->assertSame(Sexe::Female, $dto->sexe);
    }

    public function testEmailIsLowercased(): void
    {
        $body = $this->validBody();
        $body['email'] = 'UPPER@CASE.COM';
        $dto = NewManagerInputDTO::fromRequest($this->makeRequest($body));

        $this->assertSame('upper@case.com', $dto->email);
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], '{bad}');
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        NewManagerInputDTO::fromRequest($request);
    }

    // ── missing fields ────────────────────────────────────────────────────────

    /** @dataProvider missingFieldProvider */
    public function testMissingFieldThrows(string $field): void
    {
        $body = $this->validBody();
        unset($body[$field]);
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("Missing required field: $field");
        NewManagerInputDTO::fromRequest($this->makeRequest($body));
    }

    /** @return array<string, array<mixed>> */
    public static function missingFieldProvider(): array
    {
        return [
            'email'     => ['email'],
            'password'  => ['password'],
            'firstname' => ['firstname'],
            'lastname'  => ['lastname'],
            'sexe'      => ['sexe'],
            'job'       => ['job'],
        ];
    }

    public function testOptionalHospitalIdNullWhenAbsent(): void
    {
        $dto = NewManagerInputDTO::fromRequest($this->makeRequest($this->validBody()));
        $this->assertNull($dto->hospitalId);
    }

    public function testValidHospitalIdIsAccepted(): void
    {
        $body = $this->validBody();
        $body['hospitalId'] = 42;
        $dto = NewManagerInputDTO::fromRequest($this->makeRequest($body));
        $this->assertSame(42, $dto->hospitalId);
    }

    public function testHospitalIdAsStringFromMultipartIsAccepted(): void
    {
        // Multipart form-data always sends values as strings; filter_var handles this.
        $body = $this->validBody();
        $body['hospitalId'] = '42'; // string as sent by multipart
        $dto = NewManagerInputDTO::fromRequest($this->makeRequest($body));
        $this->assertSame(42, $dto->hospitalId);
    }

    public function testInvalidHospitalIdThrows(): void
    {
        $body = $this->validBody();
        $body['hospitalId'] = 'not-an-int';
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('hospitalId must be a positive integer');
        NewManagerInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testZeroHospitalIdThrows(): void
    {
        $body = $this->validBody();
        $body['hospitalId'] = 0;
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('hospitalId must be a positive integer');
        NewManagerInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── invalid email ─────────────────────────────────────────────────────────

    public function testInvalidEmailThrows(): void
    {
        $body = $this->validBody();
        $body['email'] = 'not-an-email';
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('email must be a valid email address');
        NewManagerInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testEmptyEmailThrows(): void
    {
        $body = $this->validBody();
        $body['email'] = '';
        $this->expectException(\InvalidArgumentException::class);
        NewManagerInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── invalid sexe ──────────────────────────────────────────────────────────

    public function testInvalidSexeThrows(): void
    {
        $body = $this->validBody();
        $body['sexe'] = 'unknown';
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('sexe must be one of: male, female');
        NewManagerInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── password validation ───────────────────────────────────────────────────

    public function testPasswordExactly8CharsIsAccepted(): void
    {
        $body = $this->validBody();
        $body['password'] = '12345678';
        $dto = NewManagerInputDTO::fromRequest($this->makeRequest($body));
        $this->assertSame('12345678', $dto->password);
    }

    public function testEmptyPasswordThrows(): void
    {
        $body = $this->validBody();
        $body['password'] = '';
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('password must be at least 8 characters');
        NewManagerInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testPasswordTooShortThrows(): void
    {
        $body = $this->validBody();
        $body['password'] = 'abc1234'; // 7 chars
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('password must be at least 8 characters');
        NewManagerInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testPasswordAsIntegerThrows(): void
    {
        $body = $this->validBody();
        $body['password'] = 12345678;
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('password must be at least 8 characters');
        NewManagerInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── empty string fields ───────────────────────────────────────────────────

    /** @dataProvider emptyStringFieldProvider */
    public function testEmptyStringFieldThrows(string $field): void
    {
        $body = $this->validBody();
        $body[$field] = '';
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("$field must be a non-empty string");
        NewManagerInputDTO::fromRequest($this->makeRequest($body));
    }

    /** @return array<string, array<mixed>> */
    public static function emptyStringFieldProvider(): array
    {
        return [
            'firstname' => ['firstname'],
            'lastname'  => ['lastname'],
            'job'       => ['job'],
        ];
    }
}
