<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\HospitalAdminController;
use App\Controller\MailerController;
use App\Entity\Hospital;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Years;
use App\Repository\ManagerRepository;
use App\Repository\ManagerYearsRepository;
use App\Services\EmailReset\PasswordResetServiceInterface;
use App\Services\HospitalAdminAuditService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

/**
 * Unit tests for HospitalAdminController::setCanCreateYear.
 *
 * Covers:
 * - PATCH managers/{id}/can-create-year → 404 when manager not found
 * - PATCH managers/{id}/can-create-year → 403 when manager not linked to hospital
 * - PATCH managers/{id}/can-create-year → 400 when body missing canCreateYear
 * - PATCH managers/{id}/can-create-year → 400 when canCreateYear is not a boolean
 * - PATCH managers/{id}/can-create-year → 200 + grants right
 * - PATCH managers/{id}/can-create-year → 200 + revokes right
 */
final class HospitalAdminCanCreateYearTest extends TestCase
{
    private EntityManagerInterface $em;
    private ManagerRepository $managerRepo;
    private ManagerYearsRepository $managerYearsRepo;

    protected function setUp(): void
    {
        $this->em               = $this->createMock(EntityManagerInterface::class);
        $this->managerRepo      = $this->createMock(ManagerRepository::class);
        $this->managerYearsRepo = $this->createMock(ManagerYearsRepository::class);
    }

    /**
     * Build the controller with a Manager acting as hospital admin
     * (Manager::getAdminHospital() returns the given Hospital).
     */
    private function buildController(Hospital $hospital): HospitalAdminController
    {
        $user = $this->createMock(Manager::class);
        $user->method('getAdminHospital')->willReturn($hospital);

        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);

        $container = new Container();
        $container->set('security.token_storage', $tokenStorage);

        $mailer       = $this->createMock(MailerController::class);
        $resetService = $this->createMock(PasswordResetServiceInterface::class);
        $auditService = $this->createMock(HospitalAdminAuditService::class);

        $controller = new HospitalAdminController(
            $mailer,
            $resetService,
            'http://localhost:3000',
            'http://localhost:8000',
            'http://localhost:8000/uploads',
            $auditService,
        );
        $controller->setContainer($container);

        return $controller;
    }

    private function makeHospital(int $id = 1): Hospital
    {
        $hospital = $this->createMock(Hospital::class);
        $hospital->method('getId')->willReturn($id);
        return $hospital;
    }

    private function makeManager(bool $canCreateYear = false): Manager
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getId')->willReturn(42);
        $manager->method('getFirstname')->willReturn('Jean');
        $manager->method('getLastname')->willReturn('Dupont');
        $manager->method('isCanCreateYear')->willReturn($canCreateYear);
        $manager->method('setCanCreateYear')->willReturnSelf();
        return $manager;
    }

    private function makeRequest(mixed $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body));
    }

    /** Make a ManagerYears record linking the manager to the given hospital */
    private function makeLinkedManagerYears(Hospital $hospital): ManagerYears
    {
        $year = $this->createMock(Years::class);
        $year->method('getHospital')->willReturn($hospital);

        $my = $this->createMock(ManagerYears::class);
        $my->method('getYears')->willReturn($year);

        return $my;
    }

    // ── 404 ───────────────────────────────────────────────────────────────────

    public function testManagerNotFoundReturns404(): void
    {
        $hospital = $this->makeHospital();
        $this->managerRepo->method('find')->willReturn(null);

        $response = $this->buildController($hospital)->setCanCreateYear(
            99,
            $this->makeRequest(['canCreateYear' => true]),
            $this->managerRepo,
            $this->managerYearsRepo,
            $this->em,
        );

        $this->assertSame(404, $response->getStatusCode());
    }

    // ── 403 ───────────────────────────────────────────────────────────────────

    public function testManagerNotLinkedToHospitalReturns403(): void
    {
        $hospital        = $this->makeHospital(1);
        $otherHospital   = $this->makeHospital(2);
        $manager         = $this->makeManager();

        $this->managerRepo->method('find')->willReturn($manager);

        $year = $this->createMock(Years::class);
        $year->method('getHospital')->willReturn($otherHospital);
        $my = $this->createMock(ManagerYears::class);
        $my->method('getYears')->willReturn($year);

        $this->managerYearsRepo->method('findBy')->willReturn([$my]);

        $response = $this->buildController($hospital)->setCanCreateYear(
            42,
            $this->makeRequest(['canCreateYear' => true]),
            $this->managerRepo,
            $this->managerYearsRepo,
            $this->em,
        );

        $this->assertSame(403, $response->getStatusCode());
    }

    // ── 400 ───────────────────────────────────────────────────────────────────

    public function testMissingCanCreateYearFieldReturns400(): void
    {
        $hospital = $this->makeHospital();
        $manager  = $this->makeManager();

        $this->managerRepo->method('find')->willReturn($manager);
        $this->managerYearsRepo->method('findBy')->willReturn([$this->makeLinkedManagerYears($hospital)]);

        $response = $this->buildController($hospital)->setCanCreateYear(
            42,
            $this->makeRequest([]),   // body missing canCreateYear
            $this->managerRepo,
            $this->managerYearsRepo,
            $this->em,
        );

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testNonBooleanCanCreateYearReturns400(): void
    {
        $hospital = $this->makeHospital();
        $manager  = $this->makeManager();

        $this->managerRepo->method('find')->willReturn($manager);
        $this->managerYearsRepo->method('findBy')->willReturn([$this->makeLinkedManagerYears($hospital)]);

        $response = $this->buildController($hospital)->setCanCreateYear(
            42,
            $this->makeRequest(['canCreateYear' => 1]),   // int, not bool
            $this->managerRepo,
            $this->managerYearsRepo,
            $this->em,
        );

        $this->assertSame(400, $response->getStatusCode());
    }

    // ── 200 ───────────────────────────────────────────────────────────────────

    public function testGrantRightReturns200AndFlushes(): void
    {
        $hospital = $this->makeHospital();
        $manager  = $this->makeManager(true); // mock already reflects "granted" state

        $this->managerRepo->method('find')->willReturn($manager);
        $this->managerYearsRepo->method('findBy')->willReturn([$this->makeLinkedManagerYears($hospital)]);
        $this->em->expects($this->once())->method('flush');

        $response = $this->buildController($hospital)->setCanCreateYear(
            42,
            $this->makeRequest(['canCreateYear' => true]),
            $this->managerRepo,
            $this->managerYearsRepo,
            $this->em,
        );

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertTrue($data['canCreateYear']);
    }

    public function testRevokeRightReturns200WithFalseFlag(): void
    {
        $hospital = $this->makeHospital();
        $manager  = $this->makeManager(false); // mock reflects "revoked" state

        $this->managerRepo->method('find')->willReturn($manager);
        $this->managerYearsRepo->method('findBy')->willReturn([$this->makeLinkedManagerYears($hospital)]);
        $this->em->expects($this->once())->method('flush');

        $response = $this->buildController($hospital)->setCanCreateYear(
            42,
            $this->makeRequest(['canCreateYear' => false]),
            $this->managerRepo,
            $this->managerYearsRepo,
            $this->em,
        );

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertFalse($data['canCreateYear']);
    }

    public function testGrantRightCallsSetCanCreateYearWithTrue(): void
    {
        $hospital = $this->makeHospital();
        $manager  = $this->makeManager();

        $manager->expects($this->once())
            ->method('setCanCreateYear')
            ->with(true);

        $this->managerRepo->method('find')->willReturn($manager);
        $this->managerYearsRepo->method('findBy')->willReturn([$this->makeLinkedManagerYears($hospital)]);

        $this->buildController($hospital)->setCanCreateYear(
            42,
            $this->makeRequest(['canCreateYear' => true]),
            $this->managerRepo,
            $this->managerYearsRepo,
            $this->em,
        );
    }

    public function testRevokeRightCallsSetCanCreateYearWithFalse(): void
    {
        $hospital = $this->makeHospital();
        $manager  = $this->makeManager();

        $manager->expects($this->once())
            ->method('setCanCreateYear')
            ->with(false);

        $this->managerRepo->method('find')->willReturn($manager);
        $this->managerYearsRepo->method('findBy')->willReturn([$this->makeLinkedManagerYears($hospital)]);

        $this->buildController($hospital)->setCanCreateYear(
            42,
            $this->makeRequest(['canCreateYear' => false]),
            $this->managerRepo,
            $this->managerYearsRepo,
            $this->em,
        );
    }
}
