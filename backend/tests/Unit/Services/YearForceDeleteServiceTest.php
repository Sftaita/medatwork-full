<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Controller\MailerController;
use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Resident;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\YearsResidentRepository;
use App\Services\HospitalAdminAuditService;
use App\Services\YearForceDeleteService;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for YearForceDeleteService.
 *
 * Covers:
 * - 12 DBAL executeStatement calls are executed in FK-safe order:
 *     1 (year_resident_parameters via years_resident)
 *   + 1 (resident_year_calendar — OR on years_resident + years_week_templates)
 *   + 1 (resident_weekly_schedule — OR on years_week_intervals + years_week_templates)
 *   + 1 (resident_validation JOIN period_validation)
 *   + 8 direct children (years_resident, timesheet, garde, absence,
 *                         period_validation, years_week_intervals, years_week_templates, manager_years)
 * - The year itself is removed via ORM
 * - Audit log is written when actor is provided
 * - Emails are sent to residents, managers and hospital admins
 * - Email failures do not propagate (no exception thrown)
 * - No audit log written when actor is null
 * - Works with empty collections (no residents, no managers, no admins)
 */
final class YearForceDeleteServiceTest extends TestCase
{
    private MailerController $mailer;
    private HospitalAdminAuditService $auditService;
    private YearForceDeleteService $service;

    protected function setUp(): void
    {
        $this->mailer       = $this->createMock(MailerController::class);
        $this->auditService = $this->createMock(HospitalAdminAuditService::class);
        $this->service      = new YearForceDeleteService($this->mailer, $this->auditService);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function makeYear(string $title = 'Chirurgie 2025-2026', int $id = 42): Years
    {
        $year = $this->createMock(Years::class);
        $year->method('getTitle')->willReturn($title);
        $year->method('getId')->willReturn($id);
        $year->method('getResidents')->willReturn(new \Doctrine\Common\Collections\ArrayCollection());
        $year->method('getManagers')->willReturn(new \Doctrine\Common\Collections\ArrayCollection());
        return $year;
    }

    private function makeHospital(int $id = 1, string $name = 'CHU Liège'): Hospital
    {
        $hospital = $this->createMock(Hospital::class);
        $hospital->method('getId')->willReturn($id);
        $hospital->method('getName')->willReturn($name);
        $hospital->method('getHospitalAdmins')->willReturn(new \Doctrine\Common\Collections\ArrayCollection());
        return $hospital;
    }

    private function makeConn(?int $expectedCalls = null): Connection
    {
        $conn = $this->createMock(Connection::class);
        if ($expectedCalls !== null) {
            $conn->expects($this->exactly($expectedCalls))->method('executeStatement')->willReturn(0);
        } else {
            $conn->method('executeStatement')->willReturn(0);
        }
        return $conn;
    }

    private function makeEm(?Connection $conn = null): EntityManagerInterface
    {
        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('getConnection')->willReturn($conn ?? $this->makeConn());
        $em->method('flush');
        return $em;
    }

    private function makeYrRepo(): YearsResidentRepository
    {
        return $this->createMock(YearsResidentRepository::class);
    }

    private function makeYearsResident(string $email, string $firstname): YearsResident
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getEmail')->willReturn($email);
        $resident->method('getFirstname')->willReturn($firstname);

        $yr = $this->createMock(YearsResident::class);
        $yr->method('getResident')->willReturn($resident);
        return $yr;
    }

    private function makeManagerYears(string $email, string $firstname): ManagerYears
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getEmail')->willReturn($email);
        $manager->method('getFirstname')->willReturn($firstname);

        $my = $this->createMock(ManagerYears::class);
        $my->method('getManager')->willReturn($manager);
        return $my;
    }

    private function makeAdmin(string $email, string $firstname): HospitalAdmin
    {
        $admin = $this->createMock(HospitalAdmin::class);
        $admin->method('getEmail')->willReturn($email);
        $admin->method('getFirstname')->willReturn($firstname);
        return $admin;
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function testExecutes12DbalStatements(): void
    {
        // 1 (yr_params) + 1 (resident_year_calendar OR) + 1 (resident_weekly_schedule OR)
        // + 1 (resident_validation JOIN) + 8 direct children = 12
        $conn = $this->makeConn(12);

        $this->service->execute(
            $this->makeYear(),
            $this->makeHospital(),
            $this->makeYrRepo(),
            $this->makeEm($conn),
            null,
        );
    }

    public function testYearItselfIsRemoved(): void
    {
        $year = $this->makeYear();

        $em = $this->makeEm();
        $em->expects($this->once())->method('remove')->with($year);

        $this->service->execute($year, $this->makeHospital(), $this->makeYrRepo(), $em, null);
    }

    public function testAuditLogWrittenWhenActorProvided(): void
    {
        $actor = $this->createMock(HospitalAdmin::class);

        $this->auditService->expects($this->once())->method('log');

        $this->service->execute(
            $this->makeYear(),
            $this->makeHospital(),
            $this->makeYrRepo(),
            $this->makeEm(),
            $actor,
        );
    }

    public function testNoAuditLogWhenActorIsNull(): void
    {
        $this->auditService->expects($this->never())->method('log');

        $this->service->execute(
            $this->makeYear(),
            $this->makeHospital(),
            $this->makeYrRepo(),
            $this->makeEm(),
            null,
        );
    }

    public function testEmailsSentToResidentsManagersAndAdmins(): void
    {
        $yr    = $this->makeYearsResident('resident@chu.be', 'Alice');
        $my    = $this->makeManagerYears('manager@chu.be', 'Bob');
        $admin = $this->makeAdmin('admin@chu.be', 'Carol');

        $year = $this->createMock(Years::class);
        $year->method('getTitle')->willReturn('Test Year');
        $year->method('getId')->willReturn(1);
        $year->method('getResidents')->willReturn(new \Doctrine\Common\Collections\ArrayCollection([$yr]));
        $year->method('getManagers')->willReturn(new \Doctrine\Common\Collections\ArrayCollection([$my]));

        $hospital = $this->createMock(Hospital::class);
        $hospital->method('getId')->willReturn(1);
        $hospital->method('getName')->willReturn('CHU Test');
        $hospital->method('getHospitalAdmins')->willReturn(new \Doctrine\Common\Collections\ArrayCollection([$admin]));

        // Expect 3 emails: 1 resident + 1 manager + 1 admin
        $this->mailer->expects($this->exactly(3))->method('sendEmail');

        $this->service->execute($year, $hospital, $this->makeYrRepo(), $this->makeEm(), null);
    }

    public function testEmailFailureDoesNotPropagate(): void
    {
        $yr = $this->makeYearsResident('resident@chu.be', 'Alice');

        $year = $this->createMock(Years::class);
        $year->method('getTitle')->willReturn('Test Year');
        $year->method('getId')->willReturn(1);
        $year->method('getResidents')->willReturn(new \Doctrine\Common\Collections\ArrayCollection([$yr]));
        $year->method('getManagers')->willReturn(new \Doctrine\Common\Collections\ArrayCollection());

        $hospital = $this->createMock(Hospital::class);
        $hospital->method('getId')->willReturn(1);
        $hospital->method('getName')->willReturn('CHU Test');
        $hospital->method('getHospitalAdmins')->willReturn(new \Doctrine\Common\Collections\ArrayCollection());

        $this->mailer->method('sendEmail')->willThrowException(new \RuntimeException('SMTP error'));

        // Must not throw
        $this->service->execute($year, $hospital, $this->makeYrRepo(), $this->makeEm(), null);
        $this->addToAssertionCount(1);
    }

    public function testWorksWithEmptyCollections(): void
    {
        $this->mailer->expects($this->never())->method('sendEmail');

        $this->service->execute(
            $this->makeYear(),
            $this->makeHospital(),
            $this->makeYrRepo(),
            $this->makeEm(),
            null,
        );
    }
}
