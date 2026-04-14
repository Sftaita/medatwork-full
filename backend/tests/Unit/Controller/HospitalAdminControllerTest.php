<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\HospitalAdminController;
use App\Controller\MailerController;
use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Enum\HospitalAdminStatus;
use App\Repository\HospitalAdminRepository;
use App\Services\EmailReset\PasswordResetServiceInterface;
use App\Services\HospitalAdminAuditService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Unit tests for HospitalAdminController.
 *
 * Covers:
 * - GET setup/{token} → 200 with email + hospitalName
 * - GET setup/{token} → 404 when token not found
 * - GET setup/{token} → 410 when already activated
 * - GET setup/{token} → 410 when token expired
 * - POST setup/{token} → 200, account activated
 * - POST setup/{token} → 404 when token not found
 * - POST setup/{token} → 410 when already activated
 * - POST setup/{token} → 410 when token expired
 * - POST setup/{token} → 400 when body invalid
 * - POST setup/{token} → password is hashed (setPassword called with hash)
 */
final class HospitalAdminControllerTest extends TestCase
{
    private HospitalAdminRepository $repo;
    private EntityManagerInterface $em;
    private UserPasswordHasherInterface $hasher;

    protected function setUp(): void
    {
        $this->repo   = $this->createMock(HospitalAdminRepository::class);
        $this->em     = $this->createMock(EntityManagerInterface::class);
        $this->hasher = $this->createMock(UserPasswordHasherInterface::class);
    }

    private function buildController(): HospitalAdminController
    {
        $mailer       = $this->createMock(MailerController::class);
        $resetService = $this->createMock(PasswordResetServiceInterface::class);
        $auditService = $this->createMock(HospitalAdminAuditService::class);
        $controller   = new HospitalAdminController($mailer, $resetService, 'http://localhost:3000', 'http://localhost:8000', $auditService);
        $controller->setContainer(new Container());
        return $controller;
    }

    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body));
    }

    private function makeAdmin(
        HospitalAdminStatus $status = HospitalAdminStatus::Invited,
        bool $expired = false,
    ): HospitalAdmin {
        $hospital = $this->createMock(Hospital::class);
        $hospital->method('getName')->willReturn('CHU Liège');
        $hospital->method('getId')->willReturn(1);

        $admin = $this->createMock(HospitalAdmin::class);
        $admin->method('getEmail')->willReturn('admin@chu.be');
        $admin->method('getHospital')->willReturn($hospital);
        $admin->method('getStatus')->willReturn($status);
        $admin->method('getTokenExpiration')->willReturn(
            $expired ? new \DateTime('-1 day') : new \DateTime('+7 days')
        );
        return $admin;
    }

    // ── GET — checkSetupToken ──────────────────────────────────────────────────

    public function testCheckTokenReturns200WithContext(): void
    {
        $this->repo->method('findOneBy')->willReturn($this->makeAdmin());

        $response = $this->buildController()->checkSetupToken('validtoken', $this->repo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('admin@chu.be', $data['email']);
        $this->assertSame('CHU Liège', $data['hospitalName']);
    }

    public function testCheckTokenNotFoundReturns404(): void
    {
        $this->repo->method('findOneBy')->willReturn(null);

        $response = $this->buildController()->checkSetupToken('badtoken', $this->repo);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testCheckTokenAlreadyActivatedReturns410(): void
    {
        $this->repo->method('findOneBy')->willReturn($this->makeAdmin(HospitalAdminStatus::Active));

        $response = $this->buildController()->checkSetupToken('usedtoken', $this->repo);

        $this->assertSame(410, $response->getStatusCode());
    }

    public function testCheckTokenExpiredReturns410(): void
    {
        $this->repo->method('findOneBy')->willReturn($this->makeAdmin(expired: true));

        $response = $this->buildController()->checkSetupToken('expiredtoken', $this->repo);

        $this->assertSame(410, $response->getStatusCode());
    }

    // ── POST — activateAccount ─────────────────────────────────────────────────

    public function testActivateAccountReturns200(): void
    {
        $admin = $this->makeAdmin();
        $admin->method('setPassword')->willReturnSelf();
        $admin->method('setFirstname')->willReturnSelf();
        $admin->method('setLastname')->willReturnSelf();
        $admin->method('setStatus')->willReturnSelf();
        $admin->method('setToken')->willReturnSelf();
        $admin->method('setTokenExpiration')->willReturnSelf();
        $admin->method('setValidatedAt')->willReturnSelf();

        $this->repo->method('findOneBy')->willReturn($admin);
        $this->hasher->method('hashPassword')->willReturn('hashed_password');

        $response = $this->buildController()->activateAccount(
            'validtoken',
            $this->makeRequest(['password' => 'Secure123', 'firstname' => 'Jean', 'lastname' => 'Dupont']),
            $this->repo,
            $this->em,
            $this->hasher,
        );

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testActivateAccountNotFoundReturns404(): void
    {
        $this->repo->method('findOneBy')->willReturn(null);

        $response = $this->buildController()->activateAccount(
            'badtoken',
            $this->makeRequest(['password' => 'Secure123', 'firstname' => 'Jean', 'lastname' => 'D']),
            $this->repo,
            $this->em,
            $this->hasher,
        );

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testActivateAlreadyActiveReturns410(): void
    {
        $this->repo->method('findOneBy')->willReturn($this->makeAdmin(HospitalAdminStatus::Active));

        $response = $this->buildController()->activateAccount(
            'usedtoken',
            $this->makeRequest(['password' => 'Secure123', 'firstname' => 'Jean', 'lastname' => 'D']),
            $this->repo,
            $this->em,
            $this->hasher,
        );

        $this->assertSame(410, $response->getStatusCode());
    }

    public function testActivateExpiredTokenReturns410(): void
    {
        $this->repo->method('findOneBy')->willReturn($this->makeAdmin(expired: true));

        $response = $this->buildController()->activateAccount(
            'expiredtoken',
            $this->makeRequest(['password' => 'Secure123', 'firstname' => 'Jean', 'lastname' => 'D']),
            $this->repo,
            $this->em,
            $this->hasher,
        );

        $this->assertSame(410, $response->getStatusCode());
    }

    public function testActivateInvalidBodyReturns400(): void
    {
        $this->repo->method('findOneBy')->willReturn($this->makeAdmin());

        $response = $this->buildController()->activateAccount(
            'validtoken',
            $this->makeRequest([]), // missing fields
            $this->repo,
            $this->em,
            $this->hasher,
        );

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testActivateHashesPassword(): void
    {
        $admin = $this->makeAdmin();
        $admin->method('setPassword')->willReturnSelf();
        $admin->method('setFirstname')->willReturnSelf();
        $admin->method('setLastname')->willReturnSelf();
        $admin->method('setStatus')->willReturnSelf();
        $admin->method('setToken')->willReturnSelf();
        $admin->method('setTokenExpiration')->willReturnSelf();
        $admin->method('setValidatedAt')->willReturnSelf();

        $this->repo->method('findOneBy')->willReturn($admin);
        $this->hasher->expects($this->once())
            ->method('hashPassword')
            ->with($admin, 'Secure123')
            ->willReturn('$2y$...');

        $this->buildController()->activateAccount(
            'validtoken',
            $this->makeRequest(['password' => 'Secure123', 'firstname' => 'Jean', 'lastname' => 'Dupont']),
            $this->repo,
            $this->em,
            $this->hasher,
        );
    }
}
