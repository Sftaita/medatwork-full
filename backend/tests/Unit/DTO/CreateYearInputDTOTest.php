<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\CreateYearInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for CreateYearInputDTO::fromRequest().
 *
 * location a été supprimé du DTO — il est dérivé de hospital.name côté serveur.
 * period et comment restent optionnels.
 * hospitalId est optionnel (nullable int).
 */
class CreateYearInputDTOTest extends TestCase
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
            'title'       => 'Stage 2025-2026',
            'dateOfStart' => '2025-09-01',
            'dateOfEnd'   => '2026-08-31',
            'speciality'  => 'Chirurgie',
            'isMaster'    => false,
            'hospitalId'  => 1,
        ];
    }

    // ── happy path ────────────────────────────────────────────────────────────

    public function testValidBodyCreatesDTO(): void
    {
        $body = array_merge($this->validBody(), [
            'comment'    => 'Commentaire',
            'period'     => '6',
            'hospitalId' => 3,
        ]);
        $dto = CreateYearInputDTO::fromRequest($this->makeRequest($body));

        $this->assertSame('Stage 2025-2026', $dto->title);
        $this->assertSame('Commentaire', $dto->comment);
        $this->assertSame('2025-09-01', $dto->dateOfStart);
        $this->assertSame('2026-08-31', $dto->dateOfEnd);
        $this->assertSame('6', $dto->period);
        $this->assertSame('Chirurgie', $dto->speciality);
        $this->assertFalse($dto->isMaster);
        $this->assertSame(3, $dto->hospitalId);
    }

    public function testMinimalBodyWithHospitalId(): void
    {
        $body = array_merge($this->validBody(), ['hospitalId' => 1]);
        $dto  = CreateYearInputDTO::fromRequest($this->makeRequest($body));

        $this->assertSame('Stage 2025-2026', $dto->title);
        $this->assertSame('', $dto->comment);
        $this->assertSame('', $dto->period);
        $this->assertSame(1, $dto->hospitalId);
    }

    public function testLocationFieldInBodyIsIgnored(): void
    {
        // location n'est plus dans le DTO — envoyé par le frontend mais ignoré
        $body = array_merge($this->validBody(), ['location' => 'Liège']);
        $dto  = CreateYearInputDTO::fromRequest($this->makeRequest($body));
        $this->assertSame('Stage 2025-2026', $dto->title);
        $this->assertFalse(property_exists($dto, 'location'), 'location ne doit plus exister dans le DTO');
    }

    public function testEmptyCommentIsAccepted(): void
    {
        $body = array_merge($this->validBody(), ['comment' => '']);
        $dto  = CreateYearInputDTO::fromRequest($this->makeRequest($body));
        $this->assertSame('', $dto->comment);
    }

    public function testEmptyPeriodIsAccepted(): void
    {
        $body = array_merge($this->validBody(), ['period' => '']);
        $dto  = CreateYearInputDTO::fromRequest($this->makeRequest($body));
        $this->assertSame('', $dto->period);
    }

    public function testMissingHospitalIdThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $body = $this->validBody();
        unset($body['hospitalId']);
        CreateYearInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testHospitalIdZeroThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        CreateYearInputDTO::fromRequest($this->makeRequest(
            array_merge($this->validBody(), ['hospitalId' => 0])
        ));
    }

    public function testIsMasterTrueIsAccepted(): void
    {
        $body = array_merge($this->validBody(), ['isMaster' => true]);
        $dto  = CreateYearInputDTO::fromRequest($this->makeRequest($body));
        $this->assertTrue($dto->isMaster);
    }

    // ── validation errors ─────────────────────────────────────────────────────

    public function testMissingTitleThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $body = $this->validBody();
        unset($body['title']);
        CreateYearInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testMissingDateOfStartThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $body = $this->validBody();
        unset($body['dateOfStart']);
        CreateYearInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testMissingSpecialityThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $body = $this->validBody();
        unset($body['speciality']);
        CreateYearInputDTO::fromRequest($this->makeRequest($body));
    }

    public function testIsMasterMustBeBoolean(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        CreateYearInputDTO::fromRequest($this->makeRequest(
            array_merge($this->validBody(), ['isMaster' => 1])
        ));
    }

    public function testInvalidJsonThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $req = new Request([], [], [], [], [], [], 'not json');
        CreateYearInputDTO::fromRequest($req);
    }
}
