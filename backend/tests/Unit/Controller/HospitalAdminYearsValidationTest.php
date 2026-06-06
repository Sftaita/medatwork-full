<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\HospitalAdminController;
use App\Controller\MailerController;
use App\Entity\Hospital;
use App\Entity\Manager;
use App\Entity\Years;
use App\Enum\YearStatus;
use App\Repository\YearsRepository;
use App\Services\EmailReset\PasswordResetServiceInterface;
use App\Services\HospitalAdminAuditService;
use App\Services\YearsManagement\YearCreationService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

/**
 * Unit tests for year CRUD date-span validation.
 *
 * Règle : endYear - startYear > 1 → refus.
 *
 * Cas acceptés (endYear - startYear ≤ 1) :
 *   01/10/2026 → 30/09/2027  (diff = 1) ✅
 *   01/01/2026 → 31/12/2026  (diff = 0) ✅
 *   01/07/2026 → 30/06/2027  (diff = 1) ✅
 *
 * Cas refusés (endYear - startYear > 1) :
 *   01/10/2025 → 30/09/2027  (diff = 2) ❌
 *   01/01/2025 → 31/12/2027  (diff = 2) ❌
 */
final class HospitalAdminYearsValidationTest extends TestCase
{
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

    private function makeHospital(int $id = 1): Hospital
    {
        $h = $this->createMock(Hospital::class);
        $h->method('getId')->willReturn($id);
        return $h;
    }

    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body));
    }

    // ── createYear ────────────────────────────────────────────────────────────

    public function testCreateYearWithSpanOverTwoYearsReturns422(): void
    {
        $hospital    = $this->makeHospital();
        $em          = $this->createMock(EntityManagerInterface::class);
        $yearService = $this->createMock(YearCreationService::class);
        $yearService->expects($this->never())->method('create');

        $response = $this->buildController($hospital)->createYear(
            $this->makeRequest([
                'title'       => 'Test',
                'dateOfStart' => '2026-10-01',
                'dateOfEnd'   => '2028-09-30',
                'period'      => '2026-2028',
            ]),
            $em,
            $yearService,
        );

        $this->assertSame(422, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertStringContainsString('deux années civiles', implode(' ', $data['errors']));
    }

    public function testCreateYearWithEndBeforeStartReturns422(): void
    {
        $hospital    = $this->makeHospital();
        $em          = $this->createMock(EntityManagerInterface::class);
        $yearService = $this->createMock(YearCreationService::class);

        $response = $this->buildController($hospital)->createYear(
            $this->makeRequest([
                'title'       => 'Test',
                'dateOfStart' => '2026-10-01',
                'dateOfEnd'   => '2025-09-30',
                'period'      => '2025-2026',
            ]),
            $em,
            $yearService,
        );

        $this->assertSame(422, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertStringContainsString('date de fin doit être après', implode(' ', $data['errors']));
    }

    public function testCreateYearWithValidSpanDoesNotReturnSpanError(): void
    {
        $hospital = $this->makeHospital();
        $em       = $this->createMock(EntityManagerInterface::class);

        $year = $this->createMock(Years::class);
        $year->method('getTitle')->willReturn('Test');
        $year->method('getDateOfStart')->willReturn(new \DateTime('2026-10-01'));
        $year->method('getDateOfEnd')->willReturn(new \DateTime('2027-09-30'));
        $year->method('getPeriod')->willReturn('2026-2027');
        $year->method('getSpeciality')->willReturn(null);
        $year->method('getComment')->willReturn(null);
        $year->method('getStatus')->willReturn(YearStatus::Active);
        $year->method('getToken')->willReturn('ABCD1234');
        $year->method('getId')->willReturn(1);
        $year->method('getHospital')->willReturn($hospital);
        $year->method('getManagers')->willReturn(new \Doctrine\Common\Collections\ArrayCollection());
        $year->method('getResidents')->willReturn(new \Doctrine\Common\Collections\ArrayCollection());
        $year->method('getCreatedAt')->willReturn(new \DateTime());

        $yearService = $this->createMock(YearCreationService::class);
        $yearService->method('create')->willReturn($year);

        $response = $this->buildController($hospital)->createYear(
            $this->makeRequest([
                'title'       => 'Test',
                'dateOfStart' => '2026-10-01',
                'dateOfEnd'   => '2027-09-30',
                'period'      => '2026-2027',
            ]),
            $em,
            $yearService,
        );

        $this->assertNotSame(422, $response->getStatusCode());
        if ($response->getStatusCode() === 422) {
            $data = json_decode((string) $response->getContent(), true);
            $this->assertStringNotContainsString('deux années civiles', implode(' ', $data['errors'] ?? []));
        }
    }

    // ── updateYear ────────────────────────────────────────────────────────────

    public function testUpdateYearWithSpanOverTwoYearsReturns422(): void
    {
        $hospital = $this->makeHospital();
        $em       = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->never())->method('flush');

        $year = $this->createMock(Years::class);
        $year->method('getHospital')->willReturn($hospital);
        $year->method('isEditable')->willReturn(true);
        $year->method('getDateOfStart')->willReturn(new \DateTime('2026-10-01'));
        $year->method('getDateOfEnd')->willReturn(new \DateTime('2028-09-30'));

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('find')->willReturn($year);

        $response = $this->buildController($hospital)->updateYear(
            1,
            $this->makeRequest([
                'dateOfStart' => '2026-10-01',
                'dateOfEnd'   => '2028-09-30',
            ]),
            $yearsRepo,
            $em,
        );

        $this->assertSame(422, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertStringContainsString('deux années civiles', implode(' ', $data['errors']));
    }

    public function testUpdateYearWithValidSpanFlushesAndReturns200(): void
    {
        $hospital = $this->makeHospital();
        $em       = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $year = $this->createMock(Years::class);
        $year->method('getHospital')->willReturn($hospital);
        $year->method('isEditable')->willReturn(true);
        $year->method('getDateOfStart')->willReturn(new \DateTime('2026-10-01'));
        $year->method('getDateOfEnd')->willReturn(new \DateTime('2027-09-30'));
        $year->method('getTitle')->willReturn('Test');
        $year->method('getPeriod')->willReturn('2026-2027');
        $year->method('getSpeciality')->willReturn(null);
        $year->method('getComment')->willReturn(null);
        $year->method('getStatus')->willReturn(YearStatus::Active);
        $year->method('getToken')->willReturn('ABCD1234');
        $year->method('getId')->willReturn(1);
        $year->method('getManagers')->willReturn(new \Doctrine\Common\Collections\ArrayCollection());
        $year->method('getResidents')->willReturn(new \Doctrine\Common\Collections\ArrayCollection());
        $year->method('getCreatedAt')->willReturn(new \DateTime());

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('find')->willReturn($year);

        $response = $this->buildController($hospital)->updateYear(
            1,
            $this->makeRequest([
                'dateOfStart' => '2026-10-01',
                'dateOfEnd'   => '2027-09-30',
            ]),
            $yearsRepo,
            $em,
        );

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testUpdateYearWithSameCalendarYearIsValid(): void
    {
        $hospital = $this->makeHospital();
        $em       = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $year = $this->createMock(Years::class);
        $year->method('getHospital')->willReturn($hospital);
        $year->method('isEditable')->willReturn(true);
        $year->method('getDateOfStart')->willReturn(new \DateTime('2026-01-01'));
        $year->method('getDateOfEnd')->willReturn(new \DateTime('2026-12-31'));
        $year->method('getTitle')->willReturn('Test');
        $year->method('getPeriod')->willReturn('2025-2026');
        $year->method('getSpeciality')->willReturn(null);
        $year->method('getComment')->willReturn(null);
        $year->method('getStatus')->willReturn(YearStatus::Active);
        $year->method('getToken')->willReturn('ABCD1234');
        $year->method('getId')->willReturn(1);
        $year->method('getManagers')->willReturn(new \Doctrine\Common\Collections\ArrayCollection());
        $year->method('getResidents')->willReturn(new \Doctrine\Common\Collections\ArrayCollection());
        $year->method('getCreatedAt')->willReturn(new \DateTime());

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('find')->willReturn($year);

        $response = $this->buildController($hospital)->updateYear(
            1,
            $this->makeRequest([
                'dateOfStart' => '2026-01-01',
                'dateOfEnd'   => '2026-12-31',
            ]),
            $yearsRepo,
            $em,
        );

        $this->assertSame(200, $response->getStatusCode());
    }

    // ── Calcul automatique de la période ─────────────────────────────────────

    public function testCreateYear_ComputesPeriod_SameCalendarYear(): void
    {
        $hospital = $this->makeHospital();
        $em       = $this->createMock(EntityManagerInterface::class);

        $year        = $this->makeFullYearMock($hospital, '2026-01-01', '2026-12-31');
        $yearService = $this->createMock(YearCreationService::class);
        $yearService->expects($this->once())
            ->method('create')
            ->with($this->callback(fn($input) => $input->period === '2025-2026'))
            ->willReturn($year);

        $response = $this->buildController($hospital)->createYear(
            $this->makeRequest(['title' => 'Test', 'dateOfStart' => '2026-01-01', 'dateOfEnd' => '2026-12-31']),
            $em,
            $yearService,
        );

        $this->assertSame(201, $response->getStatusCode());
    }

    public function testCreateYear_ComputesPeriod_TwoCalendarYears(): void
    {
        $hospital = $this->makeHospital();
        $em       = $this->createMock(EntityManagerInterface::class);

        $year        = $this->makeFullYearMock($hospital, '2026-10-01', '2027-09-30');
        $yearService = $this->createMock(YearCreationService::class);
        $yearService->expects($this->once())
            ->method('create')
            ->with($this->callback(fn($input) => $input->period === '2026-2027'))
            ->willReturn($year);

        $response = $this->buildController($hospital)->createYear(
            $this->makeRequest(['title' => 'Test', 'dateOfStart' => '2026-10-01', 'dateOfEnd' => '2027-09-30']),
            $em,
            $yearService,
        );

        $this->assertSame(201, $response->getStatusCode());
    }

    public function testUpdateYear_RecomputesPeriodWhenDatesChange(): void
    {
        $hospital = $this->makeHospital();
        $em       = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $year = $this->createMock(Years::class);
        $year->method('getHospital')->willReturn($hospital);
        $year->method('isEditable')->willReturn(true);
        $year->method('getDateOfStart')->willReturn(new \DateTime('2026-07-01'));
        $year->method('getDateOfEnd')->willReturn(new \DateTime('2027-06-30'));
        $year->method('getTitle')->willReturn('Test');
        $year->method('getPeriod')->willReturn('2026-2027');
        $year->method('getSpeciality')->willReturn(null);
        $year->method('getComment')->willReturn(null);
        $year->method('getStatus')->willReturn(YearStatus::Active);
        $year->method('getToken')->willReturn('ABCD1234');
        $year->method('getId')->willReturn(1);
        $year->method('getManagers')->willReturn(new \Doctrine\Common\Collections\ArrayCollection());
        $year->method('getResidents')->willReturn(new \Doctrine\Common\Collections\ArrayCollection());
        $year->method('getCreatedAt')->willReturn(new \DateTime());
        $year->expects($this->once())->method('setPeriod')->with('2026-2027');

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('find')->willReturn($year);

        $response = $this->buildController($hospital)->updateYear(
            1,
            $this->makeRequest(['dateOfStart' => '2026-07-01', 'dateOfEnd' => '2027-06-30']),
            $yearsRepo,
            $em,
        );

        $this->assertSame(200, $response->getStatusCode());
    }

    // ── Bascule académique au 1er octobre ────────────────────────────────────
    // Quand startYear === endYear, la période est déterminée par la date de début.

    /** @dataProvider academicPeriodProvider */
    public function testCreateYear_AcademicPeriodComputedCorrectly(
        string $start, string $end, string $expectedPeriod
    ): void {
        $hospital    = $this->makeHospital();
        $em          = $this->createMock(EntityManagerInterface::class);
        $year        = $this->makeFullYearMock($hospital, $start, $end);
        $yearService = $this->createMock(YearCreationService::class);
        $yearService->expects($this->once())
            ->method('create')
            ->with($this->callback(fn($input) => $input->period === $expectedPeriod))
            ->willReturn($year);

        $response = $this->buildController($hospital)->createYear(
            $this->makeRequest(['title' => 'Test', 'dateOfStart' => $start, 'dateOfEnd' => $end]),
            $em,
            $yearService,
        );

        $this->assertSame(201, $response->getStatusCode());
    }

    public static function academicPeriodProvider(): array
    {
        return [
            // Same civil year, start < Oct 1 → {year-1}-{year}
            'Jun→Oct same year'             => ['2026-06-05', '2026-10-25', '2025-2026'],
            'Sep30→Oct5 boundary (Sep<Oct)' => ['2026-09-30', '2026-10-05', '2025-2026'],
            // Same civil year, start >= Oct 1 → {year}-{year+1}
            'Oct1→Oct25 boundary (Oct1=on)' => ['2026-10-01', '2026-10-25', '2026-2027'],
            // Different civil years → raw years
            'Oct1→Sep30 cross-year'         => ['2026-10-01', '2027-09-30', '2026-2027'],
        ];
    }

    // ── Cas exacts demandés ───────────────────────────────────────────────────
    // Acceptés : endYear - startYear ≤ 1

    public function testCreateYear_Jul2026_Jun2027_IsValid(): void
    {
        $hospital = $this->makeHospital();
        $em       = $this->createMock(EntityManagerInterface::class);

        $year = $this->makeFullYearMock($hospital, '2026-07-01', '2027-06-30');
        $yearService = $this->createMock(YearCreationService::class);
        $yearService->method('create')->willReturn($year);

        $response = $this->buildController($hospital)->createYear(
            $this->makeRequest(['title' => 'Test', 'dateOfStart' => '2026-07-01', 'dateOfEnd' => '2027-06-30']),
            $em,
            $yearService,
        );

        $this->assertSame(201, $response->getStatusCode());
    }

    public function testUpdateYear_Jul2026_Jun2027_IsValid(): void
    {
        $hospital = $this->makeHospital();
        $em       = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('find')->willReturn($this->makeFullYearMock($hospital, '2026-07-01', '2027-06-30'));

        $response = $this->buildController($hospital)->updateYear(
            1,
            $this->makeRequest(['dateOfStart' => '2026-07-01', 'dateOfEnd' => '2027-06-30']),
            $yearsRepo,
            $em,
        );

        $this->assertSame(200, $response->getStatusCode());
    }

    // Refusés : endYear - startYear > 1

    public function testCreateYear_Oct2025_Sept2027_IsRejected(): void
    {
        $hospital    = $this->makeHospital();
        $em          = $this->createMock(EntityManagerInterface::class);
        $yearService = $this->createMock(YearCreationService::class);
        $yearService->expects($this->never())->method('create');

        $response = $this->buildController($hospital)->createYear(
            $this->makeRequest(['title' => 'Test', 'dateOfStart' => '2025-10-01', 'dateOfEnd' => '2027-09-30']),
            $em,
            $yearService,
        );

        $this->assertSame(422, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertStringContainsString('deux années civiles', implode(' ', $data['errors']));
    }

    public function testCreateYear_Jan2025_Dec2027_IsRejected(): void
    {
        $hospital    = $this->makeHospital();
        $em          = $this->createMock(EntityManagerInterface::class);
        $yearService = $this->createMock(YearCreationService::class);
        $yearService->expects($this->never())->method('create');

        $response = $this->buildController($hospital)->createYear(
            $this->makeRequest(['title' => 'Test', 'dateOfStart' => '2025-01-01', 'dateOfEnd' => '2027-12-31']),
            $em,
            $yearService,
        );

        $this->assertSame(422, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertStringContainsString('deux années civiles', implode(' ', $data['errors']));
    }

    public function testUpdateYear_Oct2025_Sept2027_IsRejected(): void
    {
        $hospital = $this->makeHospital();
        $em       = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->never())->method('flush');

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('find')->willReturn($this->makeFullYearMock($hospital, '2025-10-01', '2027-09-30'));

        $response = $this->buildController($hospital)->updateYear(
            1,
            $this->makeRequest(['dateOfStart' => '2025-10-01', 'dateOfEnd' => '2027-09-30']),
            $yearsRepo,
            $em,
        );

        $this->assertSame(422, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertStringContainsString('deux années civiles', implode(' ', $data['errors']));
    }

    public function testUpdateYear_Jan2025_Dec2027_IsRejected(): void
    {
        $hospital = $this->makeHospital();
        $em       = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->never())->method('flush');

        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('find')->willReturn($this->makeFullYearMock($hospital, '2025-01-01', '2027-12-31'));

        $response = $this->buildController($hospital)->updateYear(
            1,
            $this->makeRequest(['dateOfStart' => '2025-01-01', 'dateOfEnd' => '2027-12-31']),
            $yearsRepo,
            $em,
        );

        $this->assertSame(422, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertStringContainsString('deux années civiles', implode(' ', $data['errors']));
    }

    // ── Transitions de statut ────────────────────────────────────────────────

    /** @dataProvider allowedTransitionProvider */
    public function testAllowedStatusTransitionReturns200(string $from, string $to): void
    {
        $hospital  = $this->makeHospital();
        $em        = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');
        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('find')->willReturn(
            $this->makeYearWithStatus($hospital, YearStatus::from($from))
        );

        $response = $this->buildController($hospital)->updateYear(
            1,
            $this->makeRequest(['status' => $to]),
            $yearsRepo,
            $em,
        );

        $this->assertSame(200, $response->getStatusCode(), "Transition $from → $to should be allowed");
    }

    public static function allowedTransitionProvider(): array
    {
        return [
            'Draft → Active'    => ['draft',   'active'],
            'Active → Closed'   => ['active',  'closed'],
            'Closed → Active'   => ['closed',  'active'],
            'Closed → Archived' => ['closed',  'archived'],
            'Active same'       => ['active',  'active'],
            'Draft same'        => ['draft',   'draft'],
        ];
    }

    /** @dataProvider forbiddenTransitionProvider */
    public function testForbiddenStatusTransitionReturns422(string $from, string $to): void
    {
        $hospital  = $this->makeHospital();
        $em        = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->never())->method('flush');
        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('find')->willReturn(
            $this->makeYearWithStatus($hospital, YearStatus::from($from))
        );

        $response = $this->buildController($hospital)->updateYear(
            1,
            $this->makeRequest(['status' => $to]),
            $yearsRepo,
            $em,
        );

        $this->assertSame(422, $response->getStatusCode(), "Transition $from → $to should be forbidden");
        $data = json_decode((string) $response->getContent(), true);
        $this->assertStringContainsString('non autorisée', $data['message']);
    }

    public static function forbiddenTransitionProvider(): array
    {
        return [
            'Active → Draft'    => ['active',  'draft'],
            'Active → Archived' => ['active',  'archived'],
            'Draft → Closed'    => ['draft',   'closed'],
            'Draft → Archived'  => ['draft',   'archived'],
            'Closed → Draft'    => ['closed',  'draft'],
        ];
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function makeYearWithStatus(Hospital $hospital, YearStatus $status): Years
    {
        $year = $this->createMock(Years::class);
        $year->method('getHospital')->willReturn($hospital);
        $year->method('isEditable')->willReturn(true);
        $year->method('getStatus')->willReturn($status);
        $year->method('getDateOfStart')->willReturn(new \DateTime('2026-10-01'));
        $year->method('getDateOfEnd')->willReturn(new \DateTime('2027-09-30'));
        $year->method('getTitle')->willReturn('Test');
        $year->method('getPeriod')->willReturn('2026-2027');
        $year->method('getSpeciality')->willReturn(null);
        $year->method('getComment')->willReturn(null);
        $year->method('getToken')->willReturn('ABCD1234');
        $year->method('getId')->willReturn(1);
        $year->method('getManagers')->willReturn(new \Doctrine\Common\Collections\ArrayCollection());
        $year->method('getResidents')->willReturn(new \Doctrine\Common\Collections\ArrayCollection());
        $year->method('getCreatedAt')->willReturn(new \DateTime());
        return $year;
    }

    private function makeFullYearMock(Hospital $hospital, string $start, string $end): Years
    {
        $year = $this->createMock(Years::class);
        $year->method('getHospital')->willReturn($hospital);
        $year->method('isEditable')->willReturn(true);
        $year->method('getDateOfStart')->willReturn(new \DateTime($start));
        $year->method('getDateOfEnd')->willReturn(new \DateTime($end));
        $year->method('getTitle')->willReturn('Test');
        $year->method('getPeriod')->willReturn('period');
        $year->method('getSpeciality')->willReturn(null);
        $year->method('getComment')->willReturn(null);
        $year->method('getStatus')->willReturn(YearStatus::Active);
        $year->method('getToken')->willReturn('ABCD1234');
        $year->method('getId')->willReturn(1);
        $year->method('getManagers')->willReturn(new \Doctrine\Common\Collections\ArrayCollection());
        $year->method('getResidents')->willReturn(new \Doctrine\Common\Collections\ArrayCollection());
        $year->method('getCreatedAt')->willReturn(new \DateTime());
        return $year;
    }
}
