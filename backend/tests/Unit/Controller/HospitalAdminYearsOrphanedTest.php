<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\HospitalAdminController;
use App\Controller\MailerController;
use App\Entity\Hospital;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Resident;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Enum\YearStatus;
use App\Repository\YearsRepository;
use App\Services\EmailReset\PasswordResetServiceInterface;
use App\Services\HospitalAdminAuditService;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\ORM\EntityNotFoundException;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

/**
 * Regression tests — orphaned FK rows must not crash listYears() or dashboardStats().
 *
 * Root cause: when a manager (or resident) row is hard-deleted from the DB but
 * the corresponding manager_years (or years_resident) row remains, Doctrine lazy-
 * loading throws EntityNotFoundException on first property access.  The fix wraps
 * those accesses in try/catch so the endpoint returns 200 and silently skips the
 * orphaned entry.
 *
 * Each test makes the relevant getter throw EntityNotFoundException (simulating the
 * Doctrine proxy behaviour) and asserts:
 *   - the response status is 200 (no 500)
 *   - the orphaned entry is absent from the serialised output
 */
final class HospitalAdminYearsOrphanedTest extends TestCase
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    private function buildController(Manager $adminManager): HospitalAdminController
    {
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($adminManager);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);

        $container = new Container();
        $container->set('security.token_storage', $tokenStorage);

        $controller = new HospitalAdminController(
            $this->createMock(MailerController::class),
            $this->createMock(PasswordResetServiceInterface::class),
            'http://localhost:3000',
            'http://localhost:8000',
            'http://localhost:8000/uploads',
            $this->createMock(HospitalAdminAuditService::class),
        );
        $controller->setContainer($container);

        return $controller;
    }

    private function makeHospital(): Hospital
    {
        $h = $this->createMock(Hospital::class);
        $h->method('getId')->willReturn(1);
        $h->method('getName')->willReturn('Hôpital Test');
        return $h;
    }

    private function makeAdminManager(): Manager
    {
        $hospital = $this->makeHospital();
        $m        = $this->createMock(Manager::class);
        $m->method('getAdminHospital')->willReturn($hospital);
        return $m;
    }

    /**
     * Returns a ManagerYears whose getManager() proxy throws EntityNotFoundException
     * on any property access — exactly what Doctrine does for a deleted manager row.
     */
    private function makeOrphanedManagerYears(): ManagerYears
    {
        $exc = EntityNotFoundException::fromClassNameAndIdentifier(Manager::class, ['id' => '55']);

        $ghost = $this->createMock(Manager::class);
        $ghost->method('getFirstname')->willThrowException($exc);
        $ghost->method('getLastname')->willThrowException($exc);
        $ghost->method('getToken')->willThrowException($exc);
        $ghost->method('getId')->willThrowException($exc);

        $my = $this->createMock(ManagerYears::class);
        $my->method('getManager')->willReturn($ghost);
        return $my;
    }

    /**
     * Returns a YearsResident whose getResident() proxy throws EntityNotFoundException
     * on any property access.
     */
    private function makeOrphanedYearsResident(): YearsResident
    {
        $exc = EntityNotFoundException::fromClassNameAndIdentifier(Resident::class, ['id' => '99']);

        $ghost = $this->createMock(Resident::class);
        $ghost->method('getFirstname')->willThrowException($exc);
        $ghost->method('getLastname')->willThrowException($exc);
        $ghost->method('getToken')->willThrowException($exc);
        $ghost->method('getId')->willThrowException($exc);

        $yr = $this->createMock(YearsResident::class);
        $yr->method('getResident')->willReturn($ghost);
        $yr->method('getAllowed')->willReturn(true);
        return $yr;
    }

    private function makeYear(
        Hospital $hospital,
        ArrayCollection $managers,
        ArrayCollection $residents,
    ): Years {
        $y = $this->createMock(Years::class);
        $y->method('getId')->willReturn(10);
        $y->method('getTitle')->willReturn('2024-2025');
        $y->method('getPeriod')->willReturn('');
        $y->method('getLocation')->willReturn('CHU Test');
        $y->method('getSpeciality')->willReturn(null);
        $y->method('getComment')->willReturn(null);
        $y->method('getStatus')->willReturn(YearStatus::Active);
        $y->method('getDateOfStart')->willReturn(new \DateTime('2024-10-01'));
        $y->method('getDateOfEnd')->willReturn(new \DateTime('2025-10-01'));
        $y->method('getHospital')->willReturn($hospital);
        $y->method('getToken')->willReturn('abc12345');
        $y->method('getManagers')->willReturn($managers);
        $y->method('getResidents')->willReturn($residents);
        return $y;
    }

    private function makeYearsRepo(Years ...$years): YearsRepository
    {
        $repo = $this->createMock(YearsRepository::class);
        $repo->method('findBy')->willReturn($years);
        return $repo;
    }

    // ── listYears() — orphaned manager ────────────────────────────────────────

    public function testListYearsReturns200WhenManagerYearsHasOrphanedManager(): void
    {
        $adminManager = $this->makeAdminManager();
        $hospital     = $adminManager->getAdminHospital();
        $year         = $this->makeYear(
            $hospital,
            new ArrayCollection([$this->makeOrphanedManagerYears()]),
            new ArrayCollection(),
        );

        $response = $this->buildController($adminManager)->listYears($this->makeYearsRepo($year));

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testListYearsOmitsOrphanedManagerFromManagersArray(): void
    {
        $adminManager = $this->makeAdminManager();
        $hospital     = $adminManager->getAdminHospital();
        $year         = $this->makeYear(
            $hospital,
            new ArrayCollection([$this->makeOrphanedManagerYears()]),
            new ArrayCollection(),
        );

        $response = $this->buildController($adminManager)->listYears($this->makeYearsRepo($year));
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame([], $data[0]['managers'], 'Orphaned manager must not appear in managers array');
    }

    // ── listYears() — orphaned resident ───────────────────────────────────────

    public function testListYearsReturns200WhenYearsResidentHasOrphanedResident(): void
    {
        $adminManager = $this->makeAdminManager();
        $hospital     = $adminManager->getAdminHospital();
        $year         = $this->makeYear(
            $hospital,
            new ArrayCollection(),
            new ArrayCollection([$this->makeOrphanedYearsResident()]),
        );

        $response = $this->buildController($adminManager)->listYears($this->makeYearsRepo($year));

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testListYearsOmitsOrphanedResidentFromResidentsArray(): void
    {
        $adminManager = $this->makeAdminManager();
        $hospital     = $adminManager->getAdminHospital();
        $year         = $this->makeYear(
            $hospital,
            new ArrayCollection(),
            new ArrayCollection([$this->makeOrphanedYearsResident()]),
        );

        $response = $this->buildController($adminManager)->listYears($this->makeYearsRepo($year));
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame([], $data[0]['residents'], 'Orphaned resident must not appear in residents array');
    }

    // ── dashboardStats() — orphaned manager ───────────────────────────────────

    public function testDashboardStatsReturns200WhenManagerYearsHasOrphanedManager(): void
    {
        $adminManager = $this->makeAdminManager();
        $hospital     = $adminManager->getAdminHospital();
        $year         = $this->makeYear(
            $hospital,
            new ArrayCollection([$this->makeOrphanedManagerYears()]),
            new ArrayCollection(),
        );

        $response = $this->buildController($adminManager)->dashboardStats($this->makeYearsRepo($year));

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testDashboardStatsCountsOrphanedManagerAsZero(): void
    {
        $adminManager = $this->makeAdminManager();
        $hospital     = $adminManager->getAdminHospital();
        $year         = $this->makeYear(
            $hospital,
            new ArrayCollection([$this->makeOrphanedManagerYears()]),
            new ArrayCollection(),
        );

        $response = $this->buildController($adminManager)->dashboardStats($this->makeYearsRepo($year));
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(0, $data['managers']['total'], 'Orphaned manager must not be counted');
        $this->assertSame(0, $data['managers']['active']);
        $this->assertSame(0, $data['managers']['pending']);
    }

    // ── dashboardStats() — orphaned resident ──────────────────────────────────

    public function testDashboardStatsReturns200WhenYearsResidentHasOrphanedResident(): void
    {
        $adminManager = $this->makeAdminManager();
        $hospital     = $adminManager->getAdminHospital();
        $year         = $this->makeYear(
            $hospital,
            new ArrayCollection(),
            new ArrayCollection([$this->makeOrphanedYearsResident()]),
        );

        $response = $this->buildController($adminManager)->dashboardStats($this->makeYearsRepo($year));

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testDashboardStatsCountsOrphanedResidentAsZero(): void
    {
        $adminManager = $this->makeAdminManager();
        $hospital     = $adminManager->getAdminHospital();
        $year         = $this->makeYear(
            $hospital,
            new ArrayCollection(),
            new ArrayCollection([$this->makeOrphanedYearsResident()]),
        );

        $response = $this->buildController($adminManager)->dashboardStats($this->makeYearsRepo($year));
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(0, $data['maccs']['total'], 'Orphaned resident must not be counted');
    }

    // ── Both orphans at once ───────────────────────────────────────────────────

    public function testListYearsReturns200WithBothOrphanedManagerAndResident(): void
    {
        $adminManager = $this->makeAdminManager();
        $hospital     = $adminManager->getAdminHospital();
        $year         = $this->makeYear(
            $hospital,
            new ArrayCollection([$this->makeOrphanedManagerYears()]),
            new ArrayCollection([$this->makeOrphanedYearsResident()]),
        );

        $response = $this->buildController($adminManager)->listYears($this->makeYearsRepo($year));

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertSame([], $data[0]['managers']);
        $this->assertSame([], $data[0]['residents']);
    }
}
