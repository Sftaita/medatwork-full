<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\MailerController;
use App\Controller\TokenActivationController;
use App\Entity\Manager;
use App\Entity\Resident;
use App\Repository\ManagerRepository;
use App\Repository\ResidentRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;

/**
 * Unit tests for TokenActivationController POST endpoints.
 *
 * The POST routes are the new prefetch-safe activation paths.
 * GET routes (legacy) are not unit-tested here — they use $this->redirect()
 * which requires a router service (functional test territory).
 *
 * activateResident (POST /api/ResidentActivation/{token}):
 * - token too short   → 404
 * - token not found   → 404
 * - token expired     → 410
 * - valid token       → 200 + {success:true} + flushes
 * - valid token       → clears token on user
 * - valid token       → sets validatedAt on user
 *
 * activateManager (POST /api/ManagerActivation/{token}):
 * - token too short   → 404
 * - token not found   → 404
 * - token expired     → 410
 * - valid token       → 200 + {success:true} + flushes
 * - valid token       → clears token on user
 * - valid token       → sets validatedAt on user
 */
final class TokenActivationControllerTest extends TestCase
{
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        $this->em = $this->createMock(EntityManagerInterface::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function buildController(): TokenActivationController
    {
        $mailer     = $this->createMock(MailerController::class);
        $controller = new TokenActivationController($mailer, 'http://localhost:8000/api/', 'http://localhost:3000');
        $controller->setContainer(new Container());

        return $controller;
    }

    /** Valid 64-char hex token (bin2hex(random_bytes(32)) format) */
    private function validToken(): string
    {
        return str_repeat('a', 64);
    }

    private function makeResidentRepo(?Resident $resident): ResidentRepository
    {
        $repo = $this->createMock(ResidentRepository::class);
        $repo->method('findOneBy')->willReturn($resident);

        return $repo;
    }

    private function makeManagerRepo(?Manager $manager): ManagerRepository
    {
        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('findOneBy')->willReturn($manager);

        return $repo;
    }

    private function makeResident(bool $expired = false): Resident
    {
        $r = $this->createMock(Resident::class);
        $r->method('getTokenExpiration')->willReturn(
            $expired ? new \DateTime('-1 day') : new \DateTime('+1 day')
        );
        $r->method('setToken')->willReturnSelf();
        $r->method('setTokenExpiration')->willReturnSelf();
        $r->method('setValidatedAt')->willReturnSelf();

        return $r;
    }

    private function makeManager(bool $expired = false): Manager
    {
        $m = $this->createMock(Manager::class);
        $m->method('getTokenExpiration')->willReturn(
            $expired ? new \DateTime('-1 day') : new \DateTime('+1 day')
        );
        $m->method('setToken')->willReturnSelf();
        $m->method('setTokenExpiration')->willReturnSelf();
        $m->method('setValidatedAt')->willReturnSelf();

        return $m;
    }

    // ── activateResident — 404 ────────────────────────────────────────────────

    public function testResidentActivationShortTokenReturns404(): void
    {
        $response = $this->buildController()->activateResident(
            'short',
            $this->makeResidentRepo(null),
            $this->em,
        );

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testResidentActivationNotFoundReturns404(): void
    {
        $response = $this->buildController()->activateResident(
            $this->validToken(),
            $this->makeResidentRepo(null),
            $this->em,
        );

        $this->assertSame(404, $response->getStatusCode());
    }

    // ── activateResident — 410 ────────────────────────────────────────────────

    public function testResidentActivationExpiredTokenReturns410(): void
    {
        $response = $this->buildController()->activateResident(
            $this->validToken(),
            $this->makeResidentRepo($this->makeResident(expired: true)),
            $this->em,
        );

        $this->assertSame(410, $response->getStatusCode());
    }

    public function testResidentActivationExpiredTokenFlushes(): void
    {
        $this->em->expects($this->once())->method('flush');

        $this->buildController()->activateResident(
            $this->validToken(),
            $this->makeResidentRepo($this->makeResident(expired: true)),
            $this->em,
        );
    }

    // ── activateResident — 200 ────────────────────────────────────────────────

    public function testResidentActivationValidTokenReturns200(): void
    {
        $response = $this->buildController()->activateResident(
            $this->validToken(),
            $this->makeResidentRepo($this->makeResident()),
            $this->em,
        );

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertTrue($data['success']);
    }

    public function testResidentActivationValidTokenFlushes(): void
    {
        $this->em->expects($this->once())->method('flush');

        $this->buildController()->activateResident(
            $this->validToken(),
            $this->makeResidentRepo($this->makeResident()),
            $this->em,
        );
    }

    public function testResidentActivationClearsToken(): void
    {
        $resident = $this->makeResident();
        $resident->expects($this->once())->method('setToken')->with(null)->willReturnSelf();

        $this->buildController()->activateResident(
            $this->validToken(),
            $this->makeResidentRepo($resident),
            $this->em,
        );
    }

    public function testResidentActivationSetsValidatedAt(): void
    {
        $resident = $this->makeResident();
        $resident->expects($this->once())->method('setValidatedAt')->willReturnSelf();

        $this->buildController()->activateResident(
            $this->validToken(),
            $this->makeResidentRepo($resident),
            $this->em,
        );
    }

    // ── activateManager — 404 ─────────────────────────────────────────────────

    public function testManagerActivationShortTokenReturns404(): void
    {
        $response = $this->buildController()->activateManager(
            'short',
            $this->makeManagerRepo(null),
            $this->em,
        );

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testManagerActivationNotFoundReturns404(): void
    {
        $response = $this->buildController()->activateManager(
            $this->validToken(),
            $this->makeManagerRepo(null),
            $this->em,
        );

        $this->assertSame(404, $response->getStatusCode());
    }

    // ── activateManager — 410 ─────────────────────────────────────────────────

    public function testManagerActivationExpiredTokenReturns410(): void
    {
        $response = $this->buildController()->activateManager(
            $this->validToken(),
            $this->makeManagerRepo($this->makeManager(expired: true)),
            $this->em,
        );

        $this->assertSame(410, $response->getStatusCode());
    }

    public function testManagerActivationExpiredTokenFlushes(): void
    {
        $this->em->expects($this->once())->method('flush');

        $this->buildController()->activateManager(
            $this->validToken(),
            $this->makeManagerRepo($this->makeManager(expired: true)),
            $this->em,
        );
    }

    // ── activateManager — 200 ─────────────────────────────────────────────────

    public function testManagerActivationValidTokenReturns200(): void
    {
        $response = $this->buildController()->activateManager(
            $this->validToken(),
            $this->makeManagerRepo($this->makeManager()),
            $this->em,
        );

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertTrue($data['success']);
    }

    public function testManagerActivationValidTokenFlushes(): void
    {
        $this->em->expects($this->once())->method('flush');

        $this->buildController()->activateManager(
            $this->validToken(),
            $this->makeManagerRepo($this->makeManager()),
            $this->em,
        );
    }

    public function testManagerActivationClearsToken(): void
    {
        $manager = $this->makeManager();
        $manager->expects($this->once())->method('setToken')->with(null)->willReturnSelf();

        $this->buildController()->activateManager(
            $this->validToken(),
            $this->makeManagerRepo($manager),
            $this->em,
        );
    }

    public function testManagerActivationSetsValidatedAt(): void
    {
        $manager = $this->makeManager();
        $manager->expects($this->once())->method('setValidatedAt')->willReturnSelf();

        $this->buildController()->activateManager(
            $this->validToken(),
            $this->makeManagerRepo($manager),
            $this->em,
        );
    }
}
