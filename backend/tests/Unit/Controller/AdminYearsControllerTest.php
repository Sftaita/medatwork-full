<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\AdminController;
use App\Controller\MailerController;
use App\Entity\Hospital;
use App\Entity\Years;
use App\Repository\HospitalRepository;
use App\Repository\YearsRepository;
use App\Services\EmailReset\PasswordResetServiceInterface;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for AdminController year-management endpoints.
 *
 * Covers:
 * - GET /api/admin/hospitals/{id}/years → 200 with year list
 * - GET /api/admin/hospitals/{id}/years → 404 when hospital not found
 * - GET /api/admin/hospitals/{id}/years → empty array when no years
 * - POST /api/admin/hospitals/{id}/years → 201 + year created
 * - POST /api/admin/hospitals/{id}/years → 404 when hospital not found
 * - POST /api/admin/hospitals/{id}/years → 400 when body invalid
 * - POST /api/admin/hospitals/{id}/years → period derived when absent
 * - PATCH /api/admin/years/{yearId}/hospital → 200, hospital assigned
 * - PATCH /api/admin/years/{yearId}/hospital → 404 when year not found
 * - PATCH /api/admin/years/{yearId}/hospital → 404 when hospital not found
 * - PATCH /api/admin/years/{yearId}/hospital → 400 when hospitalId missing
 */
final class AdminYearsControllerTest extends TestCase
{
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        $this->em = $this->createMock(EntityManagerInterface::class);
    }

    private function buildController(): AdminController
    {
        $controller = new AdminController(
            $this->createMock(MailerController::class),
            'https://api.medatwork.be/api/',
            'http://localhost:3000',
            $this->createMock(PasswordResetServiceInterface::class),
        );
        $controller->setContainer(new Container());
        return $controller;
    }

    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body));
    }

    private function makeHospital(int $id, string $name): Hospital
    {
        $h = $this->createMock(Hospital::class);
        $h->method('getId')->willReturn($id);
        $h->method('getName')->willReturn($name);
        return $h;
    }

    private function makeYear(int $id, string $title, Hospital $hospital): Years
    {
        $y = $this->createMock(Years::class);
        $y->method('getId')->willReturn($id);
        $y->method('getTitle')->willReturn($title);
        $y->method('getPeriod')->willReturn('2025-2026');
        $y->method('getLocation')->willReturn('CHU Liège');
        $y->method('getSpeciality')->willReturn('Cardiologie');
        $y->method('getDateOfStart')->willReturn(new \DateTime('2025-11-01'));
        $y->method('getDateOfEnd')->willReturn(new \DateTime('2026-04-30'));
        $y->method('getHospital')->willReturn($hospital);
        return $y;
    }

    // ── List years ─────────────────────────────────────────────────────────────

    public function testListHospitalYearsReturns200(): void
    {
        $hospital = $this->makeHospital(1, 'CHU Liège');
        $year     = $this->makeYear(10, 'Stage cardio', $hospital);

        $hospitalRepo = $this->createMock(HospitalRepository::class);
        $hospitalRepo->method('find')->with(1)->willReturn($hospital);

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findBy')->willReturn([$year]);

        $response = $this->buildController()->listHospitalYears(1, $hospitalRepo, $yearsRepo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertCount(1, $data);
        $this->assertSame(10, $data[0]['id']);
        $this->assertSame('Stage cardio', $data[0]['title']);
        $this->assertSame(1, $data[0]['hospital']['id']);
    }

    public function testListHospitalYearsReturnsEmptyArray(): void
    {
        $hospital = $this->makeHospital(1, 'CHU Liège');

        $hospitalRepo = $this->createMock(HospitalRepository::class);
        $hospitalRepo->method('find')->willReturn($hospital);

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findBy')->willReturn([]);

        $response = $this->buildController()->listHospitalYears(1, $hospitalRepo, $yearsRepo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame([], $data);
    }

    public function testListHospitalYearsHospitalNotFoundReturns404(): void
    {
        $hospitalRepo = $this->createMock(HospitalRepository::class);
        $hospitalRepo->method('find')->willReturn(null);

        $yearsRepo = $this->createMock(YearsRepository::class);

        $response = $this->buildController()->listHospitalYears(99, $hospitalRepo, $yearsRepo);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ── Create year ────────────────────────────────────────────────────────────

    public function testCreateHospitalYearReturns201(): void
    {
        $hospital = $this->makeHospital(1, 'CHU Liège');

        $hospitalRepo = $this->createMock(HospitalRepository::class);
        $hospitalRepo->method('find')->willReturn($hospital);

        $persisted = null;
        $this->em->method('persist')->willReturnCallback(function (object $obj) use (&$persisted): void {
            if ($obj instanceof Years) {
                $persisted = $obj;
                // Simulate Doctrine assigning an ID
                $ref = new \ReflectionProperty(Years::class, 'id');
                $ref->setAccessible(true);
                $ref->setValue($obj, 42);
            }
        });

        $response = $this->buildController()->createHospitalYear(
            1,
            $this->makeRequest([
                'title'       => 'Stage cardio',
                'dateOfStart' => '2025-11-01',
                'dateOfEnd'   => '2026-04-30',
                'location'    => 'CHU Liège',
            ]),
            $hospitalRepo,
            $this->em,
        );

        $this->assertSame(201, $response->getStatusCode());
        $this->assertNotNull($persisted);
    }

    public function testCreateHospitalYearHospitalNotFoundReturns404(): void
    {
        $hospitalRepo = $this->createMock(HospitalRepository::class);
        $hospitalRepo->method('find')->willReturn(null);

        $response = $this->buildController()->createHospitalYear(
            99,
            $this->makeRequest(['title' => 'X', 'dateOfStart' => '2025-11-01', 'dateOfEnd' => '2026-04-30', 'location' => 'Y']),
            $hospitalRepo,
            $this->em,
        );

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testCreateHospitalYearInvalidBodyReturns400(): void
    {
        $hospital = $this->makeHospital(1, 'CHU Liège');

        $hospitalRepo = $this->createMock(HospitalRepository::class);
        $hospitalRepo->method('find')->willReturn($hospital);

        $response = $this->buildController()->createHospitalYear(
            1,
            $this->makeRequest([]), // missing required fields
            $hospitalRepo,
            $this->em,
        );

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCreateHospitalYearPeriodDerived(): void
    {
        $hospital = $this->makeHospital(1, 'CHU Liège');

        $hospitalRepo = $this->createMock(HospitalRepository::class);
        $hospitalRepo->method('find')->willReturn($hospital);

        $persisted = null;
        $this->em->method('persist')->willReturnCallback(function (object $obj) use (&$persisted): void {
            if ($obj instanceof Years) {
                $persisted = $obj;
            }
        });

        $this->buildController()->createHospitalYear(
            1,
            $this->makeRequest([
                'title'       => 'Stage cardio',
                'dateOfStart' => '2025-11-01',
                'dateOfEnd'   => '2026-04-30',
                'location'    => 'Liège',
                // no period field
            ]),
            $hospitalRepo,
            $this->em,
        );

        $this->assertNotNull($persisted);
        $this->assertSame('2025-2026', $persisted->getPeriod());
    }

    // ── Assign year to hospital ────────────────────────────────────────────────

    public function testAssignYearToHospitalReturns200(): void
    {
        $hospital = $this->makeHospital(2, 'UZ Leuven');

        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn(10);
        $year->method('getTitle')->willReturn('Stage X');
        $year->method('getPeriod')->willReturn('2025-2026');
        $year->method('getLocation')->willReturn('Leuven');
        $year->method('getSpeciality')->willReturn(null);
        $year->method('getDateOfStart')->willReturn(new \DateTime('2025-11-01'));
        $year->method('getDateOfEnd')->willReturn(new \DateTime('2026-04-30'));
        $year->method('getHospital')->willReturn($hospital);
        $year->expects($this->once())->method('setHospital')->with($hospital);

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('find')->with(10)->willReturn($year);

        $hospitalRepo = $this->createMock(HospitalRepository::class);
        $hospitalRepo->method('find')->with(2)->willReturn($hospital);

        $response = $this->buildController()->assignYearToHospital(
            10,
            $this->makeRequest(['hospitalId' => 2]),
            $yearsRepo,
            $hospitalRepo,
            $this->em,
        );

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testAssignYearToHospitalYearNotFoundReturns404(): void
    {
        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('find')->willReturn(null);

        $hospitalRepo = $this->createMock(HospitalRepository::class);

        $response = $this->buildController()->assignYearToHospital(
            99,
            $this->makeRequest(['hospitalId' => 1]),
            $yearsRepo,
            $hospitalRepo,
            $this->em,
        );

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testAssignYearToHospitalHospitalNotFoundReturns404(): void
    {
        $year = $this->createMock(Years::class);

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('find')->willReturn($year);

        $hospitalRepo = $this->createMock(HospitalRepository::class);
        $hospitalRepo->method('find')->willReturn(null);

        $response = $this->buildController()->assignYearToHospital(
            10,
            $this->makeRequest(['hospitalId' => 99]),
            $yearsRepo,
            $hospitalRepo,
            $this->em,
        );

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testAssignYearToHospitalMissingHospitalIdReturns400(): void
    {
        $year = $this->createMock(Years::class);

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('find')->willReturn($year);

        $hospitalRepo = $this->createMock(HospitalRepository::class);

        $response = $this->buildController()->assignYearToHospital(
            10,
            $this->makeRequest([]), // missing hospitalId
            $yearsRepo,
            $hospitalRepo,
            $this->em,
        );

        $this->assertSame(400, $response->getStatusCode());
    }
}
