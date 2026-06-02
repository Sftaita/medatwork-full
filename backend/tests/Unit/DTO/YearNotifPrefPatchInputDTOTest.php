<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\YearNotifPrefPatchInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * P0 — YearNotifPrefPatchInputDTO
 *
 * RED attendu : Class "App\DTO\YearNotifPrefPatchInputDTO" not found
 */
class YearNotifPrefPatchInputDTOTest extends TestCase
{
    private function makeRequest(mixed $body): Request
    {
        return new Request([], [], [], [], [], [], is_string($body) ? $body : json_encode($body));
    }

    // ── DTO01 : body valide complet ───────────────────────────────────────────

    public function testValidCompleteBodyIsParsed(): void
    {
        $body = ['COMPLIANCE_ALERT' => ['email' => false, 'push' => true]];
        $dto  = YearNotifPrefPatchInputDTO::fromRequest($this->makeRequest($body));

        self::assertArrayHasKey('COMPLIANCE_ALERT', $dto->patch);
        self::assertFalse($dto->patch['COMPLIANCE_ALERT']['email']);
        self::assertTrue($dto->patch['COMPLIANCE_ALERT']['push']);
    }

    // ── DTO02 : body valide partiel ───────────────────────────────────────────

    public function testPartialBodyIsParsed(): void
    {
        $body = ['MONTH_VALIDATION' => ['email' => true]];
        $dto  = YearNotifPrefPatchInputDTO::fromRequest($this->makeRequest($body));

        self::assertArrayHasKey('MONTH_VALIDATION', $dto->patch);
    }

    // ── DTO03 : event inconnu → toléré (forward-compat) ──────────────────────

    public function testUnknownEventTypeIsStoredWithoutError(): void
    {
        $body = ['AI_ALERT' => ['email' => true]];
        $dto  = YearNotifPrefPatchInputDTO::fromRequest($this->makeRequest($body));

        // Pas d'exception — clé inconnue ignorée ou stockée
        self::assertIsArray($dto->patch);
    }

    // ── DTO04 : canal inconnu → 400 ──────────────────────────────────────────

    public function testUnknownChannelThrowsException(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $body = ['COMPLIANCE_ALERT' => ['webhook' => true]];
        YearNotifPrefPatchInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── DTO05 : valeur non-bool → 400 ────────────────────────────────────────

    public function testNonBoolValueThrowsException(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $body = ['COMPLIANCE_ALERT' => ['email' => 'yes']];
        YearNotifPrefPatchInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── DTO06 : valeur null → 400 ────────────────────────────────────────────

    public function testNullValueThrowsException(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $body = ['COMPLIANCE_ALERT' => ['email' => null]];
        YearNotifPrefPatchInputDTO::fromRequest($this->makeRequest($body));
    }

    // ── DTO07 : body vide {} → patch vide ────────────────────────────────────

    public function testEmptyBodyReturnsEmptyPatch(): void
    {
        $dto = YearNotifPrefPatchInputDTO::fromRequest($this->makeRequest([]));
        self::assertSame([], $dto->patch);
    }

    // ── DTO08 : userId dans le body → refusé ou ignoré ───────────────────────

    public function testUserIdInBodyIsRefusedOrIgnored(): void
    {
        // userId ne doit PAS être dans le patch final — sécurité critique
        $body = ['userId' => 999, 'COMPLIANCE_ALERT' => ['email' => false]];
        $dto  = YearNotifPrefPatchInputDTO::fromRequest($this->makeRequest($body));

        self::assertArrayNotHasKey('userId', $dto->patch);
    }

    // ── DTO09 : body trop volumineux → 400 ───────────────────────────────────

    public function testOversizedBodyThrowsException(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        // Génère un body de plus de 2048 bytes
        $bigBody = json_encode(['COMPLIANCE_ALERT' => ['email' => str_repeat('x', 3000)]]);
        YearNotifPrefPatchInputDTO::fromRequest(new Request([], [], [], [], [], [], $bigBody));
    }

    // ── DTO10 : JSON malformé → 400 ──────────────────────────────────────────

    public function testMalformedJsonThrowsException(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        YearNotifPrefPatchInputDTO::fromRequest(
            new Request([], [], [], [], [], [], '{not valid json')
        );
    }

    // ── DTO11 : JSON non-objet → 400 ─────────────────────────────────────────

    public function testJsonArrayAtRootThrowsException(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        YearNotifPrefPatchInputDTO::fromRequest(
            new Request([], [], [], [], [], [], '["COMPLIANCE_ALERT"]')
        );
    }

    // ── yearId dans le body → ignoré ─────────────────────────────────────────

    public function testYearIdInBodyIsIgnored(): void
    {
        $body = ['yearId' => 999, 'COMPLIANCE_ALERT' => ['email' => false]];
        $dto  = YearNotifPrefPatchInputDTO::fromRequest($this->makeRequest($body));

        self::assertArrayNotHasKey('yearId', $dto->patch);
    }
}
