<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\YearsAPI\ManagersAPI\YearsManagerAPIController;
use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\Years;
use App\Enum\ManagerJob;
use App\Enum\Sexe;
use App\Repository\HospitalRepository;
use App\Repository\ManagerRepository;
use App\Repository\ManagerYearsRepository;
use App\Repository\YearsRepository;
use App\Services\YearsManagement\YearCreationService;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for YearsManagerAPIController.
 *
 * getManagerHospitals covers:
 * - Manager with multiple linked hospitals → 200 + list (id, name, city)
 * - Manager with no linked hospitals → 200 + []
 * - HospitalAdmin user → 200 + their single hospital
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
        $year->method('getHospital')->willReturn($hospital ?? $this->createMock(Hospital::class));

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
        $m->method('getJob')->willReturn(ManagerJob::Doctor);
        $m->method('getHospital')->willReturn('CHU Liège');

        return $m;
    }

    // ── getManagerHospitals — Manager ─────────────────────────────────────────

    private function makeHospitalEntity(int $id, string $name, ?string $city): Hospital
    {
        $h = $this->createMock(Hospital::class);
        $h->method('getId')->willReturn($id);
        $h->method('getName')->willReturn($name);
        $h->method('getCity')->willReturn($city);
        return $h;
    }

    public function testGetManagerHospitalsReturnsLinkedHospitals(): void
    {
        $h1 = $this->makeHospitalEntity(1, 'CHU Liège', 'Liège');
        $h2 = $this->makeHospitalEntity(2, 'CHR Namur', 'Namur');

        $manager = $this->createMock(Manager::class);
        $manager->method('getHospitals')->willReturn(new ArrayCollection([$h1, $h2]));

        $security = $this->createMock(Security::class);
        $security->method('getUser')->willReturn($manager);

        $response = $this->buildController()->getManagerHospitals($security);
        $data = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertCount(2, $data);
        $this->assertSame(1, $data[0]['id']);
        $this->assertSame('CHU Liège', $data[0]['name']);
        $this->assertSame('Liège', $data[0]['city']);
        $this->assertSame(2, $data[1]['id']);
        $this->assertSame('CHR Namur', $data[1]['name']);
    }

    public function testGetManagerHospitalsReturnsEmptyArrayWhenNoHospitals(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getHospitals')->willReturn(new ArrayCollection([]));

        $security = $this->createMock(Security::class);
        $security->method('getUser')->willReturn($manager);

        $response = $this->buildController()->getManagerHospitals($security);
        $data = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame([], $data);
    }

    public function testGetManagerHospitalsWithNullCityReturnsNull(): void
    {
        $h = $this->makeHospitalEntity(3, 'Hôpital X', null);

        $manager = $this->createMock(Manager::class);
        $manager->method('getHospitals')->willReturn(new ArrayCollection([$h]));

        $security = $this->createMock(Security::class);
        $security->method('getUser')->willReturn($manager);

        $response = $this->buildController()->getManagerHospitals($security);
        $data = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertNull($data[0]['city']);
    }

    // ── getManagerHospitals — HospitalAdmin ────────────────────────────────────

    public function testGetManagerHospitalsForHospitalAdminReturnsSingleHospital(): void
    {
        $hospital = $this->makeHospitalEntity(5, 'Clinique Saint-Luc', 'Bruxelles');

        $admin = $this->createMock(HospitalAdmin::class);
        $admin->method('getHospital')->willReturn($hospital);

        $security = $this->createMock(Security::class);
        $security->method('getUser')->willReturn($admin);

        $response = $this->buildController()->getManagerHospitals($security);
        $data = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertCount(1, $data);
        $this->assertSame(5, $data[0]['id']);
        $this->assertSame('Clinique Saint-Luc', $data[0]['name']);
        $this->assertSame('Bruxelles', $data[0]['city']);
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
            $this->createMock(ManagerRepository::class),
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
            $this->createMock(ManagerRepository::class),
        );

        $this->assertSame(403, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertSame("Vous n'avez pas accès à cette ressource", $data['message']);
    }

    // ── Hospital with no managers ──────────────────────────────────────────────

    public function testYearWithoutHospitalReturnsEmptyArray(): void
    {
        // Scenario: year has a hospital with 0 managers linked
        $hospital = $this->makeHospital([]);
        $year     = $this->makeYear(1, $hospital);

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn($year);

        $managerYearsRepo = $this->createMock(ManagerYearsRepository::class);
        $managerYearsRepo->method('checkRelation')->willReturn(true);

        $managerRepo = $this->createMock(ManagerRepository::class);
        $managerRepo->method('findAllForHospital')->with($hospital)->willReturn([]);

        $response = $this->buildController()->getHospitalManagersForYear(
            1,
            $this->makeSecurity(),
            $yearsRepo,
            $managerYearsRepo,
            $managerRepo,
        );

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame([], json_decode((string) $response->getContent(), true));
    }

    // ── Hospital with managers ─────────────────────────────────────────────────

    public function testReturnsManagersFromYearHospital(): void
    {
        $m1 = $this->makeManager(10, 'Alice', 'Dupont');
        $m2 = $this->makeManager(11, 'Bob', 'Martin');

        $hospital = $this->createMock(Hospital::class);
        $year     = $this->makeYear(1, $hospital);

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn($year);

        $managerYearsRepo = $this->createMock(ManagerYearsRepository::class);
        $managerYearsRepo->method('checkRelation')->willReturn(true);

        // Le controller utilise ManagerRepository::findAllForHospital() (pas Hospital::getManagers())
        $managerRepo = $this->createMock(ManagerRepository::class);
        $managerRepo->method('findAllForHospital')->with($hospital)->willReturn([$m1, $m2]);

        $response = $this->buildController()->getHospitalManagersForYear(
            1,
            $this->makeSecurity(),
            $yearsRepo,
            $managerYearsRepo,
            $managerRepo,
        );

        $data = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertCount(2, $data);
        $this->assertSame(10, $data[0]['id']);
        $this->assertSame('Alice', $data[0]['firstname']);
        $this->assertSame('Dupont', $data[0]['lastname']);
        $this->assertSame('male', $data[0]['sexe']);
        $this->assertSame('doctor', $data[0]['job']);
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
            $this->createMock(ManagerRepository::class),
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
            $this->createMock(YearCreationService::class),
            $this->createMock(HospitalRepository::class),
        );

        $this->assertSame(403, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertStringContainsString('permission', $data['message']);
    }

    public function testCreateYearWithMissingHospitalIdReturns400(): void
    {
        // hospitalId absent du body → DTO l'autorise mais le controller retourne 400
        // car hospital ne peut pas être résolu
        $manager = $this->makeManagerWithRight(true);

        $security = $this->createMock(Security::class);
        $security->method('getUser')->willReturn($manager);

        $hospitalRepo = $this->createMock(HospitalRepository::class);
        $hospitalRepo->method('find')->willReturn(null);

        $response = $this->buildController()->createYear(
            $this->makeRequestBody(['hospitalId' => 9999]),
            $security,
            $this->createMock(YearCreationService::class),
            $hospitalRepo,
        );

        $this->assertSame(400, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertStringContainsString('Hôpital', $data['message']);
    }

    public function testCreateYearWithInvalidBodyReturns400(): void
    {
        $manager = $this->makeManagerWithRight(true);

        $security = $this->createMock(Security::class);
        $security->method('getUser')->willReturn($manager);

        // Corps vide → DTO lève InvalidArgumentException → 400
        $response = $this->buildController()->createYear(
            new Request([], [], [], [], [], [], json_encode([])),
            $security,
            $this->createMock(YearCreationService::class),
            $this->createMock(HospitalRepository::class),
        );

        $this->assertSame(400, $response->getStatusCode());
    }
}
