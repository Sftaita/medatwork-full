<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\ManagerInviteController;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Repository\ManagerRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Unit tests for ManagerInviteController.
 *
 * Covers:
 * - GET /setup/{token}  → 200 with firstname, lastname, email, hospitalName, yearTitle
 * - GET /setup/{token}  → 404 when token not found
 * - GET /setup/{token}  → 410 when already validated
 * - GET /setup/{token}  → 410 when token expired
 * - POST /setup/{token} → 200 with valid body, password hashed, token cleared
 * - POST /setup/{token} → 400 on invalid JSON
 * - POST /setup/{token} → 400 when password too short
 * - POST /setup/{token} → 400 when sexe invalid
 * - POST /setup/{token} → 400 when job empty
 * - POST /setup/{token} → 404 when token not found
 * - POST /setup/{token} → 410 when already validated
 * - POST /setup/{token} → 410 when token expired
 * - GET /accept-year/{token} → 200 HTML, invitations cleared, token cleared
 * - GET /accept-year/{token} → 410 HTML when token not found
 * - GET /accept-year/{token} → 410 HTML when token expired
 * - GET /refuse-year/{token} → 200 HTML, pending years removed
 * - GET /refuse-year/{token} → 200 HTML, manager removed when new + no active years
 * - GET /refuse-year/{token} → 410 HTML when token not found
 */
final class ManagerInviteControllerTest extends TestCase
{
    private ManagerRepository $repo;
    private EntityManagerInterface $em;
    private UserPasswordHasherInterface $hasher;

    protected function setUp(): void
    {
        $this->repo   = $this->createMock(ManagerRepository::class);
        $this->em     = $this->createMock(EntityManagerInterface::class);
        $this->hasher = $this->createMock(UserPasswordHasherInterface::class);
    }

    private function buildController(): ManagerInviteController
    {
        $controller = new ManagerInviteController();
        $controller->setContainer(new Container());
        return $controller;
    }

    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body));
    }

    /**
     * @param bool $validated     true → validatedAt is set (account already active)
     * @param bool $expired       true → tokenExpiration is in the past
     * @param list<ManagerYears>  $managerYears  collection to return from getManagerYears()
     */
    private function makeManager(
        bool $validated = false,
        bool $expired = false,
        array $managerYears = [],
    ): Manager {
        $manager = $this->createMock(Manager::class);
        $manager->method('getFirstname')->willReturn('Jean');
        $manager->method('getLastname')->willReturn('Dupont');
        $manager->method('getEmail')->willReturn('jean.dupont@chu.be');
        $manager->method('getValidatedAt')->willReturn($validated ? new \DateTime('-1 day') : null);
        $manager->method('getTokenExpiration')->willReturn(
            $expired ? new \DateTime('-1 day') : new \DateTime('+48 hours')
        );
        $manager->method('getManagerYears')->willReturn(new ArrayCollection($managerYears));

        // fluent setters
        foreach (['setPassword', 'setSexe', 'setJob', 'setValidatedAt', 'setToken', 'setTokenExpiration'] as $m) {
            $manager->method($m)->willReturnSelf();
        }

        return $manager;
    }

    private function makePendingManagerYear(): ManagerYears
    {
        $hospital = $this->createMock(\App\Entity\Hospital::class);
        $hospital->method('getName')->willReturn('CHU Liège');

        $year = $this->createMock(\App\Entity\Years::class);
        $year->method('getTitle')->willReturn('Stage cardiologie 2025');
        $year->method('getHospital')->willReturn($hospital);

        $my = $this->createMock(ManagerYears::class);
        $my->method('getInvitedAt')->willReturn(new \DateTimeImmutable());
        $my->method('getYears')->willReturn($year);

        return $my;
    }

    // ── GET /setup/{token} — checkSetupToken ──────────────────────────────────

    public function testCheckSetupTokenReturns200WithContext(): void
    {
        $pendingMy = $this->makePendingManagerYear();
        $manager   = $this->makeManager(managerYears: [$pendingMy]);
        $this->repo->method('findOneBy')->willReturn($manager);

        $response = $this->buildController()->checkSetupToken('validtoken', $this->repo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('Jean', $data['firstname']);
        $this->assertSame('Dupont', $data['lastname']);
        $this->assertSame('jean.dupont@chu.be', $data['email']);
        $this->assertSame('CHU Liège', $data['hospitalName']);
        $this->assertSame('Stage cardiologie 2025', $data['yearTitle']);
    }

    public function testCheckSetupTokenNotFoundReturns404(): void
    {
        $this->repo->method('findOneBy')->willReturn(null);

        $response = $this->buildController()->checkSetupToken('badtoken', $this->repo);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testCheckSetupTokenAlreadyValidatedReturns410(): void
    {
        $this->repo->method('findOneBy')->willReturn($this->makeManager(validated: true));

        $response = $this->buildController()->checkSetupToken('usedtoken', $this->repo);

        $this->assertSame(410, $response->getStatusCode());
    }

    public function testCheckSetupTokenExpiredReturns410(): void
    {
        $this->repo->method('findOneBy')->willReturn($this->makeManager(expired: true));

        $response = $this->buildController()->checkSetupToken('expiredtoken', $this->repo);

        $this->assertSame(410, $response->getStatusCode());
    }

    // ── POST /setup/{token} — completeSetup ───────────────────────────────────

    public function testCompleteSetupReturns200(): void
    {
        $this->repo->method('findOneBy')->willReturn($this->makeManager());
        $this->hasher->method('hashPassword')->willReturn('$2y$hashed');

        $response = $this->buildController()->completeSetup(
            'validtoken',
            $this->makeRequest(['password' => 'Secure123', 'sexe' => 'male', 'job' => 'doctor']),
            $this->repo,
            $this->em,
            $this->hasher,
        );

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testCompleteSetupHashesPassword(): void
    {
        $manager = $this->makeManager();
        $this->repo->method('findOneBy')->willReturn($manager);
        $this->hasher->expects($this->once())
            ->method('hashPassword')
            ->with($manager, 'Secure123')
            ->willReturn('$2y$hashed');

        $this->buildController()->completeSetup(
            'validtoken',
            $this->makeRequest(['password' => 'Secure123', 'sexe' => 'female', 'job' => 'medical supervisor']),
            $this->repo,
            $this->em,
            $this->hasher,
        );
    }

    public function testCompleteSetupInvalidJsonReturns400(): void
    {
        $this->repo->method('findOneBy')->willReturn($this->makeManager());
        $request = new Request([], [], [], [], [], [], 'not-json');

        $response = $this->buildController()->completeSetup(
            'validtoken', $request, $this->repo, $this->em, $this->hasher,
        );

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCompleteSetupShortPasswordReturns400(): void
    {
        $this->repo->method('findOneBy')->willReturn($this->makeManager());

        $response = $this->buildController()->completeSetup(
            'validtoken',
            $this->makeRequest(['password' => 'short', 'sexe' => 'male', 'job' => 'doctor']),
            $this->repo,
            $this->em,
            $this->hasher,
        );

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCompleteSetupInvalidSexeReturns400(): void
    {
        $this->repo->method('findOneBy')->willReturn($this->makeManager());

        $response = $this->buildController()->completeSetup(
            'validtoken',
            $this->makeRequest(['password' => 'Secure123', 'sexe' => 'unknown', 'job' => 'doctor']),
            $this->repo,
            $this->em,
            $this->hasher,
        );

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCompleteSetupEmptyJobReturns400(): void
    {
        $this->repo->method('findOneBy')->willReturn($this->makeManager());

        $response = $this->buildController()->completeSetup(
            'validtoken',
            $this->makeRequest(['password' => 'Secure123', 'sexe' => 'male', 'job' => '']),
            $this->repo,
            $this->em,
            $this->hasher,
        );

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCompleteSetupNotFoundReturns404(): void
    {
        $this->repo->method('findOneBy')->willReturn(null);

        $response = $this->buildController()->completeSetup(
            'badtoken',
            $this->makeRequest(['password' => 'Secure123', 'sexe' => 'male', 'job' => 'doctor']),
            $this->repo,
            $this->em,
            $this->hasher,
        );

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testCompleteSetupAlreadyValidatedReturns410(): void
    {
        $this->repo->method('findOneBy')->willReturn($this->makeManager(validated: true));

        $response = $this->buildController()->completeSetup(
            'usedtoken',
            $this->makeRequest(['password' => 'Secure123', 'sexe' => 'male', 'job' => 'doctor']),
            $this->repo,
            $this->em,
            $this->hasher,
        );

        $this->assertSame(410, $response->getStatusCode());
    }

    public function testCompleteSetupExpiredReturns410(): void
    {
        $this->repo->method('findOneBy')->willReturn($this->makeManager(expired: true));

        $response = $this->buildController()->completeSetup(
            'expiredtoken',
            $this->makeRequest(['password' => 'Secure123', 'sexe' => 'male', 'job' => 'doctor']),
            $this->repo,
            $this->em,
            $this->hasher,
        );

        $this->assertSame(410, $response->getStatusCode());
    }

    public function testCompleteSetupClearsPendingInvitations(): void
    {
        $pendingMy = $this->makePendingManagerYear();
        $pendingMy->expects($this->once())->method('setInvitedAt')->with(null);

        $manager = $this->makeManager(managerYears: [$pendingMy]);
        $this->repo->method('findOneBy')->willReturn($manager);
        $this->hasher->method('hashPassword')->willReturn('$2y$hashed');

        $this->buildController()->completeSetup(
            'validtoken',
            $this->makeRequest(['password' => 'Secure123', 'sexe' => 'male', 'job' => 'doctor']),
            $this->repo,
            $this->em,
            $this->hasher,
        );
    }

    // ── GET /accept-year/{token} — acceptYearInvite ───────────────────────────

    public function testAcceptYearInviteReturns200HtmlOnSuccess(): void
    {
        $pendingMy = $this->makePendingManagerYear();
        $pendingMy->expects($this->once())->method('setInvitedAt')->with(null);

        $manager = $this->makeManager(managerYears: [$pendingMy]);
        $this->repo->method('findOneBy')->willReturn($manager);

        $response = $this->buildController()->acceptYearInvite('validtoken', $this->repo, $this->em);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertStringContainsString('text/html', $response->headers->get('Content-Type') ?? '');
        $this->assertStringContainsString('Invitation acceptée', (string) $response->getContent());
    }

    public function testAcceptYearInviteTokenNotFoundReturns410(): void
    {
        $this->repo->method('findOneBy')->willReturn(null);

        $response = $this->buildController()->acceptYearInvite('badtoken', $this->repo, $this->em);

        $this->assertSame(410, $response->getStatusCode());
    }

    public function testAcceptYearInviteExpiredTokenReturns410(): void
    {
        $this->repo->method('findOneBy')->willReturn($this->makeManager(expired: true));

        $response = $this->buildController()->acceptYearInvite('expiredtoken', $this->repo, $this->em);

        $this->assertSame(410, $response->getStatusCode());
    }

    // ── GET /refuse-year/{token} — refuseYearInvite ───────────────────────────

    public function testRefuseYearInviteRemovesPendingYears(): void
    {
        $pendingMy = $this->makePendingManagerYear();
        $manager   = $this->makeManager(validated: true, managerYears: [$pendingMy]);
        $this->repo->method('findOneBy')->willReturn($manager);
        $this->em->expects($this->once())->method('remove')->with($pendingMy);

        $response = $this->buildController()->refuseYearInvite('validtoken', $this->repo, $this->em);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertStringContainsString('Invitation refusée', (string) $response->getContent());
    }

    public function testRefuseYearInviteRemovesNewManagerWhenNoActiveYears(): void
    {
        $pendingMy = $this->makePendingManagerYear();
        // Not validated → new manager, no active years
        $manager = $this->makeManager(validated: false, managerYears: [$pendingMy]);
        $this->repo->method('findOneBy')->willReturn($manager);

        $removeArgs = [];
        $this->em->method('remove')->willReturnCallback(function ($entity) use (&$removeArgs) {
            $removeArgs[] = $entity;
        });

        $this->buildController()->refuseYearInvite('validtoken', $this->repo, $this->em);

        // Both the ManagerYears row and the Manager itself must be removed
        $this->assertContains($pendingMy, $removeArgs);
        $this->assertContains($manager, $removeArgs);
    }

    public function testRefuseYearInviteTokenNotFoundReturns410(): void
    {
        $this->repo->method('findOneBy')->willReturn(null);

        $response = $this->buildController()->refuseYearInvite('badtoken', $this->repo, $this->em);

        $this->assertSame(410, $response->getStatusCode());
    }
}
