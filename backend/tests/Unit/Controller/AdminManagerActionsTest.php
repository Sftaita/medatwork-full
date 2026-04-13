<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\AdminController;
use App\Controller\MailerController;
use App\Entity\Manager;
use App\Enum\ManagerStatus;
use App\Repository\ManagerRepository;
use App\Services\EmailReset\PasswordResetServiceInterface;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;

/**
 * Unit tests for AdminController — manager management actions.
 *
 * Covers:
 * - PATCH /api/admin/users/managers/{id}/status → toggle Active ↔ Inactive
 * - PATCH /api/admin/users/managers/{id}/status → PendingHospital → 400
 * - PATCH /api/admin/users/managers/{id}/status → not found → 404
 * - DELETE /api/admin/users/managers/{id} → 204
 * - DELETE /api/admin/users/managers/{id} → not found → 404
 * - POST /api/admin/users/managers/{id}/reset-password → calls requestReset
 * - POST /api/admin/users/managers/{id}/reset-password → not found → 404
 * - POST /api/admin/users/managers/{id}/reset-password → email failure → still 200
 * - GET /api/admin/stats/managers → returns correct shape
 */
final class AdminManagerActionsTest extends TestCase
{
    private MailerController $mailer;
    private EntityManagerInterface $em;
    private PasswordResetServiceInterface $passwordResetService;

    protected function setUp(): void
    {
        $this->mailer               = $this->createMock(MailerController::class);
        $this->em                   = $this->createMock(EntityManagerInterface::class);
        $this->passwordResetService = $this->createMock(PasswordResetServiceInterface::class);
    }

    private function buildController(): AdminController
    {
        $controller = new AdminController(
            $this->mailer,
            'https://api.medatwork.be/api/',
            'http://localhost:3000',
            $this->passwordResetService,
        );
        $controller->setContainer(new Container());

        return $controller;
    }

    private function makeManager(int $id, string $email, ManagerStatus $status): Manager
    {
        $m = $this->createMock(Manager::class);
        $m->method('getId')->willReturn($id);
        $m->method('getEmail')->willReturn($email);
        $m->method('getStatus')->willReturn($status);

        return $m;
    }

    // ── Toggle status ─────────────────────────────────────────────────────────

    public function testToggleActiveBecomesInactive(): void
    {
        $manager = $this->makeManager(1, 'm@example.com', ManagerStatus::Active);
        $manager->expects($this->once())->method('setStatus')->with(ManagerStatus::Inactive);

        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('find')->with(1)->willReturn($manager);

        $response = $this->buildController()->toggleManagerStatus(1, $repo, $this->em);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('inactive', $data['status']);
    }

    public function testToggleInactiveBecomesActive(): void
    {
        $manager = $this->makeManager(1, 'm@example.com', ManagerStatus::Inactive);
        $manager->expects($this->once())->method('setStatus')->with(ManagerStatus::Active);

        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('find')->with(1)->willReturn($manager);

        $response = $this->buildController()->toggleManagerStatus(1, $repo, $this->em);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('active', $data['status']);
    }

    public function testTogglePendingHospitalReturns400(): void
    {
        $manager = $this->makeManager(1, 'm@example.com', ManagerStatus::PendingHospital);
        $manager->expects($this->never())->method('setStatus');

        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('find')->with(1)->willReturn($manager);

        $response = $this->buildController()->toggleManagerStatus(1, $repo, $this->em);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(400, $response->getStatusCode());
        $this->assertStringContainsString('rattachement', $data['message']);
    }

    public function testToggleManagerNotFoundReturns404(): void
    {
        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('find')->willReturn(null);

        $response = $this->buildController()->toggleManagerStatus(99, $repo, $this->em);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ── Delete manager ────────────────────────────────────────────────────────

    public function testDeleteManagerReturns204(): void
    {
        $manager = $this->makeManager(1, 'm@example.com', ManagerStatus::Active);

        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('find')->with(1)->willReturn($manager);

        $this->em->expects($this->once())->method('remove')->with($manager);
        $this->em->expects($this->once())->method('flush');

        $response = $this->buildController()->deleteManager(1, $repo, $this->em);

        $this->assertSame(204, $response->getStatusCode());
    }

    public function testDeleteManagerNotFoundReturns404(): void
    {
        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('find')->willReturn(null);

        $response = $this->buildController()->deleteManager(99, $repo, $this->em);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ── Reset password ────────────────────────────────────────────────────────

    public function testResetPasswordCallsRequestReset(): void
    {
        $manager = $this->makeManager(1, 'm@example.com', ManagerStatus::Active);

        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('find')->with(1)->willReturn($manager);

        $this->passwordResetService
            ->expects($this->once())
            ->method('requestReset')
            ->with('m@example.com');

        $response = $this->buildController()->resetManagerPassword(1, $repo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('ok', $data['message']);
    }

    public function testResetPasswordManagerNotFoundReturns404(): void
    {
        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('find')->willReturn(null);

        $response = $this->buildController()->resetManagerPassword(99, $repo);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testResetPasswordEmailFailureStillReturns200(): void
    {
        $manager = $this->makeManager(1, 'm@example.com', ManagerStatus::Active);

        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('find')->with(1)->willReturn($manager);

        $this->passwordResetService
            ->method('requestReset')
            ->willThrowException(new \RuntimeException('SMTP down'));

        $response = $this->buildController()->resetManagerPassword(1, $repo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('ok', $data['message']);
    }

    // ── Manager stats ─────────────────────────────────────────────────────────

    public function testGetManagerStatsReturnsCorrectShape(): void
    {
        $managers = [
            $this->makeManager(1, 'a@example.com', ManagerStatus::Active),
            $this->makeManager(2, 'b@example.com', ManagerStatus::Active),
            $this->makeManager(3, 'c@example.com', ManagerStatus::Inactive),
            $this->makeManager(4, 'd@example.com', ManagerStatus::PendingHospital),
        ];

        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('findAll')->willReturn($managers);

        $response = $this->buildController()->getManagerStats($repo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(4, $data['total']);
        $this->assertSame(2, $data['active']);
        $this->assertSame(1, $data['inactive']);
        $this->assertSame(1, $data['pending']);
    }
}
