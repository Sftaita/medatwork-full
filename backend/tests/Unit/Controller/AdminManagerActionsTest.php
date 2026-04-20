<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\AdminController;
use App\Controller\MailerController;
use App\Entity\Manager;
use App\Enum\ManagerStatus;
use App\Repository\ManagerRepository;
use App\Services\EmailReset\PasswordResetServiceInterface;
use Doctrine\DBAL\Connection;
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
 * - DELETE /api/admin/users/managers/{id} → 204 + calls DBAL executeStatement for all 7 cleanup queries
 * - DELETE /api/admin/users/managers/{id} → DBAL deletes manager_hospital join table (prevents ManyToMany FK)
 * - DELETE /api/admin/users/managers/{id} → not found → 404
 * - POST /api/admin/users/managers/{id}/reset-password → calls requestReset
 * - POST /api/admin/users/managers/{id}/reset-password → not found → 404
 * - POST /api/admin/users/managers/{id}/reset-password → email failure → still 200
 * - POST /api/admin/users/managers/{id}/resend-activation → 200 + token set
 * - POST /api/admin/users/managers/{id}/resend-activation → already activated → 400
 * - POST /api/admin/users/managers/{id}/resend-activation → not found → 404
 * - POST /api/admin/users/managers/{id}/resend-activation → email failure → still 200
 * - GET /api/admin/stats/managers → returns correct shape
 */
final class AdminManagerActionsTest extends TestCase
{
    private MailerController $mailer;
    private EntityManagerInterface $em;
    private Connection $conn;
    private PasswordResetServiceInterface $passwordResetService;

    protected function setUp(): void
    {
        $this->mailer               = $this->createMock(MailerController::class);
        $this->conn                 = $this->createMock(Connection::class);
        $this->em                   = $this->createMock(EntityManagerInterface::class);
        $this->em->method('getConnection')->willReturn($this->conn);
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

    private function makeManager(int $id, string $email, ManagerStatus $status, ?\DateTime $validatedAt = new \DateTime()): Manager
    {
        $m = $this->createMock(Manager::class);
        $m->method('getId')->willReturn($id);
        $m->method('getEmail')->willReturn($email);
        $m->method('getFirstname')->willReturn('Prénom');
        $m->method('getStatus')->willReturn($status);
        $m->method('getValidatedAt')->willReturn($validatedAt);
        $m->method('setToken')->willReturnSelf();
        $m->method('setTokenExpiration')->willReturnSelf();

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

    public function testDeleteManagerExecutesSevenCleanupStatements(): void
    {
        $manager = $this->makeManager(1, 'm@example.com', ManagerStatus::Active);

        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('find')->with(1)->willReturn($manager);

        // Expect exactly 7 DBAL statements before the Doctrine remove/flush
        $this->conn->expects($this->exactly(7))->method('executeStatement');

        $this->buildController()->deleteManager(1, $repo, $this->em);
    }

    public function testDeleteManagerCleansManagerHospitalJoinTable(): void
    {
        $manager = $this->makeManager(42, 'm@example.com', ManagerStatus::Active);

        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('find')->willReturn($manager);

        $statements = [];
        $this->conn
            ->method('executeStatement')
            ->willReturnCallback(function (string $sql, array $params) use (&$statements) {
                $statements[] = ['sql' => $sql, 'params' => $params];

                return 0;
            });

        $this->buildController()->deleteManager(42, $repo, $this->em);

        $joinTableDeleted = false;
        foreach ($statements as $s) {
            if (str_contains($s['sql'], 'manager_hospital') && str_contains($s['sql'], 'DELETE') && $s['params'] === [42]) {
                $joinTableDeleted = true;
                break;
            }
        }

        $this->assertTrue($joinTableDeleted, 'manager_hospital join table must be cleaned before manager deletion');
    }

    public function testDeleteManagerNotFoundReturns404(): void
    {
        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('find')->willReturn(null);

        $response = $this->buildController()->deleteManager(99, $repo, $this->em);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ── Resend activation ─────────────────────────────────────────────────────

    public function testResendActivationReturns200AndSetsToken(): void
    {
        $manager = $this->makeManager(1, 'm@example.com', ManagerStatus::PendingHospital, null);
        $manager->expects($this->once())->method('setToken')->willReturnSelf();
        $manager->expects($this->once())->method('setTokenExpiration')->willReturnSelf();

        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('find')->with(1)->willReturn($manager);

        $this->em->expects($this->once())->method('flush');

        $response = $this->buildController()->resendManagerActivation(1, $repo, $this->em);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('ok', $data['message']);
    }

    public function testResendActivationAlreadyActivatedReturns400(): void
    {
        $manager = $this->makeManager(1, 'm@example.com', ManagerStatus::Active, new \DateTime());

        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('find')->with(1)->willReturn($manager);

        $this->em->expects($this->never())->method('flush');

        $response = $this->buildController()->resendManagerActivation(1, $repo, $this->em);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testResendActivationNotFoundReturns404(): void
    {
        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('find')->willReturn(null);

        $response = $this->buildController()->resendManagerActivation(99, $repo, $this->em);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testResendActivationEmailFailureStillReturns200(): void
    {
        $manager = $this->makeManager(1, 'm@example.com', ManagerStatus::PendingHospital, null);
        $manager->method('setToken')->willReturnSelf();
        $manager->method('setTokenExpiration')->willReturnSelf();

        $repo = $this->createMock(ManagerRepository::class);
        $repo->method('find')->willReturn($manager);

        $this->mailer
            ->method('sendEmail')
            ->willThrowException(new \RuntimeException('SMTP down'));

        $response = $this->buildController()->resendManagerActivation(1, $repo, $this->em);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('ok', $data['message']);
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
