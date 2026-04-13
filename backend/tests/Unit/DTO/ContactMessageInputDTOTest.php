<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\ContactMessageInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for ContactMessageInputDTO::fromRequest().
 */
class ContactMessageInputDTOTest extends TestCase
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
            'lastname'  => 'Dupont',
            'firstname' => 'Alice',
            'email'     => 'alice@example.be',
            'message'   => 'Hello, I need help.',
        ];
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidInputCreatesDTO(): void
    {
        $dto = ContactMessageInputDTO::fromRequest($this->makeRequest($this->validBody()));

        $this->assertSame('Dupont', $dto->lastname);
        $this->assertSame('Alice', $dto->firstname);
        $this->assertSame('alice@example.be', $dto->email);
        $this->assertSame('Hello, I need help.', $dto->message);
    }

    // ── invalid JSON ──────────────────────────────────────────────────────────

    public function testInvalidJsonThrows(): void
    {
        $request = new Request([], [], [], [], [], [], '{bad}');
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid JSON body');
        ContactMessageInputDTO::fromRequest($request);
    }

    // ── missing fields ────────────────────────────────────────────────────────

    /** @dataProvider missingFieldProvider */
    public function testMissingFieldThrows(string $field): void
    {
        $body = $this->validBody();
        unset($body[$field]);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("Missing required field: $field");
        ContactMessageInputDTO::fromRequest($this->makeRequest($body));
    }

    /** @return array<string, array<mixed>> */
    public static function missingFieldProvider(): array
    {
        return [
            'lastname'  => ['lastname'],
            'firstname' => ['firstname'],
            'email'     => ['email'],
            'message'   => ['message'],
        ];
    }

    // ── string field validation ───────────────────────────────────────────────

    /** @dataProvider emptyStringFieldProvider */
    public function testEmptyStringFieldThrows(string $field): void
    {
        $body = $this->validBody();
        $body[$field] = '';

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("$field must be a non-empty string");
        ContactMessageInputDTO::fromRequest($this->makeRequest($body));
    }

    /** @return array<string, array<mixed>> */
    public static function emptyStringFieldProvider(): array
    {
        return [
            'lastname'  => ['lastname'],
            'firstname' => ['firstname'],
            'message'   => ['message'],
        ];
    }

    // ── email validation ──────────────────────────────────────────────────────

    public function testInvalidEmailThrows(): void
    {
        $body = $this->validBody();
        $body['email'] = 'not-an-email';

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('email must be a valid email address');
        ContactMessageInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testEmptyEmailThrows(): void
    {
        $body = $this->validBody();
        $body['email'] = '';

        $this->expectException(\InvalidArgumentException::class);
        ContactMessageInputDTO::fromRequest($this->makeRequest($body));
    }
}
