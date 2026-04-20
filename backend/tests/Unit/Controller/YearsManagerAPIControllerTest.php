<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\YearsAPI\ManagersAPI\YearsManagerAPIController;
use App\Entity\Hospital;
use App\Entity\Manager;
use App\Entity\Years;
use App\Enum\Sexe;
use App\Repository\HospitalRepository;
use App\Repository\ManagerYearsRepository;
use App\Repository\YearsRepository;
use App\Services\YearsManagement\CreateYear;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for YearsManagerAPIController.
 *
 * getHospitalManagersForYear covers:
 * - Year not found → 404
 * - Manager has no access to the year → 403
 * - Year has no associated hospital → 200 + []
 * - Year has a hospital with managers → 200 + manager list
 * - Year has a hospital with no managers → 200 + []
 *
 * createYear covers:
 * - Manager without canCreateYear → 403
 * - Manager with canCreateYear + valid body → 200 + delegates to CreateYear service
 * - Manager with canCreateYear + hospitalId → resolves hospital and passes it to service
 */
final class YearsManagerAPIControllerTest extends TestCase
{
    private function buildController(): YearsManagerAPIController
    {
        $controller = new YearsManagerAPIController($this->createMock(EntityManagerInterface::class));
        $controller->setContainer(new Container());

        return $controller;
    }

    private function makeSecurity(?Manager $user = null): Security
    {
        $security = $this->createMock(Security::class);
        $security->method('getUser')->willReturn($user ?? $this->createMock(Manager::class));

        return $security;
    }

    private function makeYear(int $id, ?Hospital $hospital): Years
    {
        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn($id);
        $year->method('getHospital')->willReturn($hospital);

        return $year;
    }

    private function makeHospital(array $managers): Hospital
    {
        $hospital = $this->createMock(Hospital::class);
        $hospital->method('getManagers')->willReturn(new ArrayCollection($managers));

        return $hospital;
    }

    private function makeManager(int $id, string $firstname, string $lastname): Manager
    {
        $m = $this->createMock(Manager::class);
        $m->method('getId')->willReturn($id);
        $m->method('getFirstname')->willReturn($firstname);
        $m->method('getLastname')->willReturn($lastname);
        $m->method('getSexe')->willReturn(Sexe::Male);
        $m->method('getJob')->willReturn('Médecin senior');
        $m->method('getHospital')->willReturn('CHU Liège');

        return $m;
    }

    // ── Year not found ─────────────────────────────────────────────────────────

    public function testYearNotFoundReturns404(): void
    {
        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn(null);

        $response = $this->buildController()->getHospitalManagersForYear(
            99,
            $this->makeSecurity(),
            $yearsRepo,
            $this->createMock(ManagerYearsRepository::class),
        );

        $this->assertSame(404, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertSame('Année introuvable.', $data['message']);
    }

    // ── No access ──────────────────────────────────────────────────────────────

    public function testNoAccessReturns403(): void
    {
        $year = $this->makeYear(1, null);

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn($year);

        $managerYearsRepo = $this->createMock(ManagerYearsRepository::class);
        $managerYearsRepo->method('checkRelation')->willReturn(false);

        $response = $this->buildController()->getHospitalManagersForYear(
            1,
            $this->makeSecurity(),
            $yearsRepo,
            $managerYearsRepo,
        );

        $this->assertSame(403, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertSame("Vous n'avez pas accès à cette ressource", $data['message']);
    }

    // ── No hospital on year ────────────────────────────────────────────────────

    public function testYearWithoutHospitalReturnsEmptyArray(): void
    {
        $year = $this->makeYear(1, null);

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn($year);

        $managerYearsRepo = $this->createMock(ManagerYearsRepository::class);
        $managerYearsRepo->method('checkRelation')->willReturn(true);

        $response = $this->buildController()->getHospitalManagersForYear(
            1,
            $this->makeSecurity(),
            $yearsRepo,
            $managerYearsRepo,
        );

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame([], json_decode((string) $response->getContent(), true));
    }

    // ── Hospital with managers ─────────────────────────────────────────────────

    public function testReturnsManagersFromYearHospital(): void
    {
        $m1       = $this->makeManager(10, 'Alice', 'Dupont');
        $m2       = $this->makeManager(11, 'Bob', 'Martin');
        $hospital = $this->makeHospital([$m1, $m2]);
        $year     = $this->makeYear(1, $hospital);

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn($year);

        $managerYearsRepo = $this->createMock(ManagerYearsRepository::class);
        $managerYearsRepo->method('checkRelation')->willReturn(true);

        $response = $this->buildController()->getHospitalManagersForYear(
            1,
            $this->makeSecurity(),
            $yearsRepo,
            $managerYearsRepo,
        );

        $data = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertCount(2, $data);
        $this->assertSame(10, $data[0]['id']);
        $this->assertSame('Alice', $data[0]['firstname']);
        $this->assertSame('Dupont', $data[0]['lastname']);
        $this->assertSame('male', $data[0]['sexe']);
        $this->assertSame('Médecin senior', $data[0]['job']);
        $this->assertSame(11, $data[1]['id']);
        $this->assertSame('Bob', $data[1]['firstname']);
    }

    // ── Hospital with no managers ──────────────────────────────────────────────

    public function testHospitalWithNoManagersReturnsEmptyArray(): void
    {
        $hospital = $this->makeHospital([]);
        $year     = $this->makeYear(1, $hospital);

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn($year);

        $managerYearsRepo = $this->createMock(ManagerYearsRepository::class);
        $managerYearsRepo->method('checkRelation')->willReturn(true);

        $response = $this->buildController()->getHospitalManagersForYear(
            1,
            $this->makeSecurity(),
            $yearsRepo,
            $managerYearsRepo,
        );

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame([], json_decode((string) $response->getContent(), true));
    }

    // ── createYear — canCreateYear guard ──────────────────────────────────────

    private function makeRequestBody(array $overrides = []): Request
    {
        $body = array_merge([
            'title'       => 'Stage cardiologie',
            'dateOfStart' => '2025-09-01',
            'dateOfEnd'   => '2026-08-31',
            'speciality'  => 'Cardiologie',
            'isMaster'    => false,
        ], $overrides);

        return new Request([], [], [], [], [], [], json_encode($body));
    }

    private function makeManagerWithRight(bool $canCreate): Manager
    {
        $m = $this->createMock(Manager::class);
        $m->method('isCanCreateYear')->willReturn($canCreate);
        return $m;
    }

    public function testCreateYearWithoutPermissionReturns403(): void
    {
        $manager = $this->makeManagerWithRight(false);

        $security = $this->createMock(Security::class);
        $security->method('getUser')->willReturn($manager);

        $response = $this->buildController()->createYear(
            $this->makeRequestBody(),
            $security,
            $this->createMock(CreateYear::class),
            $this->createMock(HospitalRepository::class),
        );

        $this->assertSame(403, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertStringContainsString('permission', $data['message']);
    }

    public function testCreateYearWithPermissionReturns200(): void
    {
        $manager = $this->makeManagerWithRight(true);

        $security = $this->createMock(Security::class);
        $security->method('getUser')->willReturn($manager);

        $createYearService = $this->createMock(CreateYear::class);
        $createYearService->expects($this->once())->method('createYear');

        $response = $this->buildController()->createYear(
            $this->makeRequestBody(),
            $security,
            $createYearService,
            $this->createMock(HospitalRepository::class),
        );

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testCreateYearWithHospitalIdResolvesHospital(): void
    {
        $manager = $this->makeManagerWithRight(true);

        $security = $this->createMock(Security::class);
        $security->method('getUser')->willReturn($manager);

        $hospital       = $this->createMock(Hospital::class);
        $hospitalRepo   = $this->createMock(HospitalRepository::class);
        $hospitalRepo->method('find')->with(7)->willReturn($hospital);

        $createYearService = $this->createMock(CreateYear::class);
        $createYearService->expects($this->once())
            ->method('createYear')
            ->with(
                $manager,
                $this->anything(),
                $this->anything(),
                $this->anything(),
                $this->anything(),
                $this->anything(),
                $this->anything(),
                $this->anything(),
                $this->anything(),
                $hospital,
            );

        $this->buildController()->createYear(
            $this->makeRequestBody(['hospitalId' => 7]),
            $security,
            $createYearService,
            $hospitalRepo,
        );
    }
}
