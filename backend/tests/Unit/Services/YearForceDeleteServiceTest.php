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
use Doctrine\ORM\AbstractQuery;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for YearForceDeleteService.
 *
 * Covers:
 * - All YearsResident rows are removed via EntityManager
 * - 7 DQL DELETE statements are executed (one per dependent entity)
 * - The year itself is removed
 * - Audit log is written when actor is provided
 * - Emails are sent to residents, managers and hospital admins
 * - Email failures do not propagate (no exception thrown)
 * - No audit log written when actor is null
 * - Works with empty collections (no YearsResidents, no managers, no admins)
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
        $this->service      = new YearForceDeleteService($this->mailer, $this->auditService, 'http://localhost:3000');
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

    private function makeEm(int $expectedFlushCalls = 2): EntityManagerInterface
    {
        $query = $this->createMock(AbstractQuery::class);
        $query->method('execute')->willReturn(0);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('createQuery')->willReturn($query);
        $em->expects($this->exactly($expectedFlushCalls))->method('flush');
        return $em;
    }

    private function makeYrRepo(array $yearResidents = []): YearsResidentRepository
    {
        $repo = $this->createMock(YearsResidentRepository::class);
        $repo->method('findBy')->willReturn($yearResidents);
        return $repo;
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

    public function testRemovesAllYearsResidentsViaORM(): void
    {
        $yr1 = $this->makeYearsResident('r1@chu.be', 'Alice');
        $yr2 = $this->makeYearsResident('r2@chu.be', 'Bob');

        $em = $this->createMock(EntityManagerInterface::class);
        // 2 YearsResident + 1 year itself
        $em->expects($this->exactly(3))->method('remove');
        $em->method('flush');

        $query = $this->createMock(AbstractQuery::class);
        $query->method('execute')->willReturn(0);
        $em->method('createQuery')->willReturn($query);

        $this->service->execute(
            $this->makeYear(),
            $this->makeHospital(),
            $this->makeYrRepo([$yr1, $yr2]),
            $em,
            null,
        );
    }

    public function testExecutes7DqlBulkDeletes(): void
    {
        $query = $this->createMock(AbstractQuery::class);
        $query->expects($this->exactly(7))->method('execute');

        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('createQuery')->willReturn($query);
        $em->method('flush');

        $this->service->execute(
            $this->makeYear(),
            $this->makeHospital(),
            $this->makeYrRepo(),
            $em,
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
        // Year with 1 resident and 1 manager
        $yr = $this->makeYearsResident('resident@chu.be', 'Alice');
        $my = $this->makeManagerYears('manager@chu.be', 'Bob');
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
