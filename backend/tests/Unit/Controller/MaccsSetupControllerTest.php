<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\MaccsSetupController;
use App\Entity\Hospital;
use App\Entity\Resident;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Enum\Sexe;
use App\Repository\ResidentRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Unit tests for MaccsSetupController.
 *
 * Covers:
 * - GET /api/maccs/setup/{token}
 *     - token not found → 404
 *     - token expired   → 410
 *     - valid token     → 200 with firstname/lastname/email/hospitalName
 * - POST /api/maccs/setup/{token}
 *     - token not found         → 404
 *     - token expired           → 410
 *     - password too short      → 400
 *     - invalid sexe            → 400
 *     - invalid dateOfMaster    → 400
 *     - invalid dateOfBirth     → 400
 *     - missing speciality      → 400
 *     - missing university      → 400
 *     - valid payload           → 200, sets validatedAt + clears token
 */
final class MaccsSetupControllerTest extends TestCase
{
    private EntityManagerInterface $em;
    private UserPasswordHasherInterface $hasher;

    protected function setUp(): void
    {
        $this->em     = $this->createMock(EntityManagerInterface::class);
        $this->hasher = $this->createMock(UserPasswordHasherInterface::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function buildController(): MaccsSetupController
    {
        $controller = new MaccsSetupController();
        $controller->setContainer(new Container());
        return $controller;
    }

    private function makeResident(
        bool $expired = false,
        bool $nullToken = false,
    ): Resident {
        $r = $this->createMock(Resident::class);
        $r->method('getFirstname')->willReturn('Alice');
        $r->method('getLastname')->willReturn('Dupont');
        $r->method('getEmail')->willReturn('alice@test.be');
        $r->method('getTokenExpiration')->willReturn(
            $expired
                ? new \DateTime('-1 day')
                : new \DateTime('+1 day')
        );
        $r->method('getYearsResidents')->willReturn(new ArrayCollection());
        return $r;
    }

    private function makeResidentWithHospital(): Resident
    {
        $hospital = $this->createMock(Hospital::class);
        $hospital->method('getName')->willReturn('CHU Test');

        $year = $this->createMock(Years::class);
        $year->method('getHospital')->willReturn($hospital);

        $yr = $this->createMock(YearsResident::class);
        $yr->method('getYear')->willReturn($year);

        $r = $this->createMock(Resident::class);
        $r->method('getFirstname')->willReturn('Alice');
        $r->method('getLastname')->willReturn('Dupont');
        $r->method('getEmail')->willReturn('alice@test.be');
        $r->method('getTokenExpiration')->willReturn(new \DateTime('+1 day'));
        $r->method('getYearsResidents')->willReturn(new ArrayCollection([$yr]));
        return $r;
    }

    private function makeRepo(?Resident $resident): ResidentRepository
    {
        $repo = $this->createMock(ResidentRepository::class);
        $repo->method('findOneBy')->willReturn($resident);
        return $repo;
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'password'     => 'securepass1',
            'sexe'         => 'female',
            'dateOfMaster' => '2020-06-15',
            'dateOfBirth'  => '1995-03-10',
            'speciality'   => 'Cardiologie',
            'university'   => 'UCLouvain',
        ], $overrides);
    }

    private function postRequest(array $payload): Request
    {
        return new Request([], [], [], [], [], [], json_encode($payload));
    }

    // ── GET checkToken ────────────────────────────────────────────────────────

    public function testCheckTokenNotFoundReturns404(): void
    {
        $repo     = $this->makeRepo(null);
        $response = $this->buildController()->checkToken('badtoken', $repo);
        $this->assertSame(404, $response->getStatusCode());
    }

    public function testCheckTokenExpiredReturns410(): void
    {
        $repo     = $this->makeRepo($this->makeResident(expired: true));
        $response = $this->buildController()->checkToken('expiredtoken', $repo);
        $this->assertSame(410, $response->getStatusCode());
    }

    public function testCheckTokenValidReturns200WithContext(): void
    {
        $repo     = $this->makeRepo($this->makeResidentWithHospital());
        $response = $this->buildController()->checkToken('validtoken', $repo);

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertSame('Alice', $data['firstname']);
        $this->assertSame('Dupont', $data['lastname']);
        $this->assertSame('alice@test.be', $data['email']);
        $this->assertSame('CHU Test', $data['hospitalName']);
    }

    public function testCheckTokenNoHospitalReturnsNullHospitalName(): void
    {
        $repo     = $this->makeRepo($this->makeResident());
        $response = $this->buildController()->checkToken('validtoken', $repo);

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertNull($data['hospitalName']);
    }

    // ── POST completeProfile — token guards ───────────────────────────────────

    public function testCompleteProfileTokenNotFoundReturns404(): void
    {
        $repo     = $this->makeRepo(null);
        $response = $this->buildController()->completeProfile(
            'badtoken',
            $this->postRequest($this->validPayload()),
            $repo,
            $this->em,
            $this->hasher,
        );
        $this->assertSame(404, $response->getStatusCode());
    }

    public function testCompleteProfileExpiredTokenReturns410(): void
    {
        $repo     = $this->makeRepo($this->makeResident(expired: true));
        $response = $this->buildController()->completeProfile(
            'expiredtoken',
            $this->postRequest($this->validPayload()),
            $repo,
            $this->em,
            $this->hasher,
        );
        $this->assertSame(410, $response->getStatusCode());
    }

    // ── POST completeProfile — field validation ───────────────────────────────

    /**
     * @dataProvider invalidPayloadProvider
     */
    public function testCompleteProfileInvalidPayloadReturns400(array $payload): void
    {
        $repo     = $this->makeRepo($this->makeResident());
        $response = $this->buildController()->completeProfile(
            'tok',
            $this->postRequest($payload),
            $repo,
            $this->em,
            $this->hasher,
        );
        $this->assertSame(400, $response->getStatusCode());
    }

    /** @return array<string, array{array}> */
    public static function invalidPayloadProvider(): array
    {
        $base = [
            'password'     => 'securepass1',
            'sexe'         => 'female',
            'dateOfMaster' => '2020-06-15',
            'dateOfBirth'  => '1995-03-10',
            'speciality'   => 'Cardiologie',
            'university'   => 'UCLouvain',
        ];

        return [
            'password too short'       => [array_merge($base, ['password' => 'abc'])],
            'invalid sexe'             => [array_merge($base, ['sexe' => 'other'])],
            'missing sexe'             => [array_merge($base, ['sexe' => ''])],
            'invalid dateOfMaster'     => [array_merge($base, ['dateOfMaster' => 'not-a-date'])],
            'missing dateOfMaster'     => [array_merge($base, ['dateOfMaster' => ''])],
            'invalid dateOfBirth'      => [array_merge($base, ['dateOfBirth' => 'not-a-date'])],
            'missing dateOfBirth'      => [array_merge($base, ['dateOfBirth' => ''])],
            'missing speciality'       => [array_merge($base, ['speciality' => ''])],
            'missing university'       => [array_merge($base, ['university' => ''])],
        ];
    }

    // ── POST completeProfile — happy path ─────────────────────────────────────

    public function testCompleteProfileValidPayloadReturns200(): void
    {
        $resident = $this->makeResident();
        $resident->method('setPassword')->willReturnSelf();
        $resident->method('setSexe')->willReturnSelf();
        $resident->method('setDateOfMaster')->willReturnSelf();
        $resident->method('setDateOfBirth')->willReturnSelf();
        $resident->method('setUniversity')->willReturnSelf();
        $resident->method('setValidatedAt')->willReturnSelf();
        $resident->method('setToken')->willReturnSelf();
        $resident->method('setTokenExpiration')->willReturnSelf();

        $this->hasher->method('hashPassword')->willReturn('hashed');
        $this->em->expects($this->once())->method('flush');

        $repo     = $this->makeRepo($resident);
        $response = $this->buildController()->completeProfile(
            'validtoken',
            $this->postRequest($this->validPayload()),
            $repo,
            $this->em,
            $this->hasher,
        );

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertSame('Profil complété avec succès', $data['message']);
    }

    public function testCompleteProfileSetsValidatedAtAndClearsToken(): void
    {
        $resident = $this->makeResident();

        // Capture the calls
        $resident->expects($this->once())->method('setValidatedAt')
            ->with($this->isInstanceOf(\DateTimeInterface::class))
            ->willReturnSelf();
        $resident->expects($this->once())->method('setToken')
            ->with(null)
            ->willReturnSelf();
        $resident->expects($this->once())->method('setTokenExpiration')
            ->with(null)
            ->willReturnSelf();
        $resident->method('setPassword')->willReturnSelf();
        $resident->method('setSexe')->willReturnSelf();
        $resident->method('setDateOfMaster')->willReturnSelf();
        $resident->method('setDateOfBirth')->willReturnSelf();
        $resident->method('setUniversity')->willReturnSelf();

        $this->hasher->method('hashPassword')->willReturn('hashed');

        $this->buildController()->completeProfile(
            'validtoken',
            $this->postRequest($this->validPayload()),
            $this->makeRepo($resident),
            $this->em,
            $this->hasher,
        );
    }

    public function testCompleteProfileSetsSexeCorrectly(): void
    {
        $resident = $this->makeResident();
        $resident->expects($this->once())->method('setSexe')
            ->with(Sexe::Female)
            ->willReturnSelf();
        $resident->method('setPassword')->willReturnSelf();
        $resident->method('setDateOfMaster')->willReturnSelf();
        $resident->method('setDateOfBirth')->willReturnSelf();
        $resident->method('setUniversity')->willReturnSelf();
        $resident->method('setValidatedAt')->willReturnSelf();
        $resident->method('setToken')->willReturnSelf();
        $resident->method('setTokenExpiration')->willReturnSelf();

        $this->hasher->method('hashPassword')->willReturn('hashed');

        $this->buildController()->completeProfile(
            'validtoken',
            $this->postRequest($this->validPayload(['sexe' => 'female'])),
            $this->makeRepo($resident),
            $this->em,
            $this->hasher,
        );
    }
}
