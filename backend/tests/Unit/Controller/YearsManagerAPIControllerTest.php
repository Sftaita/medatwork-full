<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\YearsAPI\ManagersAPI\YearsManagerAPIController;
use App\Entity\Hospital;
use App\Entity\Manager;
use App\Entity\Years;
use App\Enum\Sexe;
use App\Repository\ManagerYearsRepository;
use App\Repository\YearsRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Container;

/**
 * Unit tests for YearsManagerAPIController::getHospitalManagersForYear
 *
 * Covers:
 * - Year not found → 404
 * - Manager has no access to the year → 403
 * - Year has no associated hospital → 200 + []
 * - Year has a hospital with managers → 200 + manager list
 * - Year has a hospital with no managers → 200 + []
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
}
