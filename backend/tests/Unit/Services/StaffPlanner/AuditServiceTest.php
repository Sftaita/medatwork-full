<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\StaffPlanner;

use App\Entity\Absence;
use App\Entity\Garde;
use App\Enum\GardeType;
use App\Entity\Resident;
use App\Entity\StaffPlannerAuditEvent;
use App\Entity\StaffPlannerExportBatch;
use App\Entity\Timesheet;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\YearsResidentRepository;
use App\Services\StaffPlanner\AuditService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

/**
 * Tests for AuditService (Phase 6).
 *
 * Covers:
 * - Each record* method creates a StaffPlannerAuditEvent with correct eventType
 * - Context JSON contains expected keys
 * - year field is always set
 * - yearsResident FK is set when YR is resolved
 * - month / calendarYear are extracted from dates
 * - em->persist + em->flush called for every event
 */
final class AuditServiceTest extends TestCase
{
    private EntityManagerInterface&MockObject $em;
    private YearsResidentRepository&MockObject $yrRepo;
    private AuditService $service;

    protected function setUp(): void
    {
        $this->em     = $this->createMock(EntityManagerInterface::class);
        $this->yrRepo = $this->createMock(YearsResidentRepository::class);
        $this->service = new AuditService($this->em, $this->yrRepo);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function makeResident(int $id = 45): Resident&MockObject
    {
        $r = $this->createMock(Resident::class);
        $r->method('getId')->willReturn($id);
        return $r;
    }

    private function makeYear(int $id = 10): Years&MockObject
    {
        $y = $this->createMock(Years::class);
        $y->method('getId')->willReturn($id);
        return $y;
    }

    private function makeYr(): YearsResident&MockObject
    {
        return $this->createMock(YearsResident::class);
    }

    private function makeBatch(): StaffPlannerExportBatch&MockObject
    {
        $b = $this->createMock(StaffPlannerExportBatch::class);
        $b->method('getId')->willReturn(15);
        $b->method('getBatchNumber')->willReturn(3);
        $b->method('getItemCount')->willReturn(5);
        $b->method('getFileSizeBytes')->willReturn(12345);
        $b->method('getYear')->willReturn($this->makeYear());
        return $b;
    }

    private function date(string $d = '2024-11-04 08:00:00'): \DateTime
    {
        return new \DateTime($d);
    }

    private function capturePersistedEvent(): StaffPlannerAuditEvent
    {
        $captured = null;
        $this->em->expects($this->once())->method('persist')
            ->with($this->isInstanceOf(StaffPlannerAuditEvent::class))
            ->willReturnCallback(function ($e) use (&$captured) { $captured = $e; });
        $this->em->expects($this->once())->method('flush');

        return $captured ?? $this->createStub(StaffPlannerAuditEvent::class);
    }

    // ── export_generated ─────────────────────────────────────────────────────

    public function testRecordExportGeneratedSetsCorrectEventType(): void
    {
        $batch = $this->makeBatch();

        $persisted = null;
        $this->em->method('persist')->willReturnCallback(function ($e) use (&$persisted) { $persisted = $e; });
        $this->em->method('flush');

        $this->service->recordExportGenerated($batch, 'manager', 7);

        $this->assertInstanceOf(StaffPlannerAuditEvent::class, $persisted);
        $this->assertSame('export_generated', $persisted->getEventType());
        $this->assertSame('manager', $persisted->getActorType());
        $this->assertSame(7, $persisted->getActorId());
        $this->assertSame($batch, $persisted->getBatch());
        $this->assertNotNull($persisted->getYear());
        $ctx = $persisted->getContext();
        $this->assertSame(15, $ctx['batchId']);
        $this->assertSame(3, $ctx['batchNumber']);
        $this->assertSame(5, $ctx['itemCount']);
    }

    // ── timesheet_created ─────────────────────────────────────────────────────

    public function testRecordTimesheetCreatedSetsEventType(): void
    {
        $resident = $this->makeResident();
        $year     = $this->makeYear();

        $ts = $this->createMock(Timesheet::class);
        $ts->method('getId')->willReturn(1234);
        $ts->method('getDateOfStart')->willReturn($this->date('2024-11-04 08:00:00'));
        $ts->method('getDateOfEnd')->willReturn($this->date('2024-11-04 18:00:00'));

        $this->yrRepo->method('findOneBy')->willReturn($this->makeYr());

        $persisted = null;
        $this->em->method('persist')->willReturnCallback(function ($e) use (&$persisted) { $persisted = $e; });
        $this->em->method('flush');

        $this->service->recordTimesheetCreated($resident, $year, $ts);

        $this->assertSame('timesheet_created', $persisted->getEventType());
        $this->assertSame('resident', $persisted->getActorType());
        $this->assertSame(45, $persisted->getActorId());
        $this->assertSame(11, $persisted->getMonth());
        $this->assertSame(2024, $persisted->getCalendarYear());
        $this->assertNotNull($persisted->getYear());
        $this->assertNotNull($persisted->getYearsResident());
        $this->assertSame('2024-11-04 08:00', $persisted->getContext()['dateOfStart']);
    }

    // ── timesheet_modified ────────────────────────────────────────────────────

    public function testRecordTimesheetModifiedSetsCorrectType(): void
    {
        $resident = $this->makeResident();
        $year     = $this->makeYear();

        $ts = $this->createMock(Timesheet::class);
        $ts->method('getId')->willReturn(1234);
        $ts->method('getDateOfStart')->willReturn($this->date('2024-11-04 08:00:00'));
        $ts->method('getDateOfEnd')->willReturn($this->date('2024-11-04 18:00:00'));

        $this->yrRepo->method('findOneBy')->willReturn(null);

        $persisted = null;
        $this->em->method('persist')->willReturnCallback(function ($e) use (&$persisted) { $persisted = $e; });
        $this->em->method('flush');

        $this->service->recordTimesheetModified($resident, $year, $ts);

        $this->assertSame('timesheet_modified', $persisted->getEventType());
        $this->assertNull($persisted->getYearsResident()); // not found
    }

    // ── timesheet_deleted ─────────────────────────────────────────────────────

    public function testRecordTimesheetDeletedExtractsMonthFromDate(): void
    {
        $resident = $this->makeResident();
        $year     = $this->makeYear();
        $this->yrRepo->method('findOneBy')->willReturn(null);

        $persisted = null;
        $this->em->method('persist')->willReturnCallback(function ($e) use (&$persisted) { $persisted = $e; });
        $this->em->method('flush');

        $this->service->recordTimesheetDeleted($resident, $year, 999, $this->date('2024-12-15 09:00:00'));

        $this->assertSame('timesheet_deleted', $persisted->getEventType());
        $this->assertSame(12, $persisted->getMonth());
        $this->assertSame(2024, $persisted->getCalendarYear());
        $this->assertSame(999, $persisted->getContext()['timesheetId']);
    }

    // ── garde_created ─────────────────────────────────────────────────────────

    public function testRecordGardeCreatedSetsEventType(): void
    {
        $resident = $this->makeResident();
        $year     = $this->makeYear();
        $this->yrRepo->method('findOneBy')->willReturn(null);

        $garde = $this->createMock(Garde::class);
        $garde->method('getId')->willReturn(567);
        $garde->method('getDateOfStart')->willReturn($this->date('2024-11-10'));
        $garde->method('getType')->willReturn(GardeType::Hospital);

        $persisted = null;
        $this->em->method('persist')->willReturnCallback(function ($e) use (&$persisted) { $persisted = $e; });
        $this->em->method('flush');

        $this->service->recordGardeCreated($resident, $year, $garde);

        $this->assertSame('garde_created', $persisted->getEventType());
        $this->assertSame(GardeType::Hospital->value, $persisted->getContext()['type']);
    }

    // ── garde_deleted ─────────────────────────────────────────────────────────

    public function testRecordGardeDeletedSetsGardeIdInContext(): void
    {
        $resident = $this->makeResident();
        $year     = $this->makeYear();
        $this->yrRepo->method('findOneBy')->willReturn(null);

        $persisted = null;
        $this->em->method('persist')->willReturnCallback(function ($e) use (&$persisted) { $persisted = $e; });
        $this->em->method('flush');

        $this->service->recordGardeDeleted($resident, $year, 789, $this->date('2024-11-10'));

        $this->assertSame('garde_deleted', $persisted->getEventType());
        $this->assertSame(789, $persisted->getContext()['gardeId']);
    }

    // ── absence_created ───────────────────────────────────────────────────────

    public function testRecordAbsenceCreatedSetsEventType(): void
    {
        $resident = $this->makeResident();
        $year     = $this->makeYear();
        $this->yrRepo->method('findOneBy')->willReturn(null);

        $absence = $this->createMock(Absence::class);
        $absence->method('getId')->willReturn(89);
        $absence->method('getDateOfStart')->willReturn($this->date('2024-11-10'));
        $absence->method('getDateOfEnd')->willReturn($this->date('2024-11-12'));
        $absence->method('getType')->willReturn(null);

        $persisted = null;
        $this->em->method('persist')->willReturnCallback(function ($e) use (&$persisted) { $persisted = $e; });
        $this->em->method('flush');

        $this->service->recordAbsenceCreated($resident, $year, $absence);

        $this->assertSame('absence_created', $persisted->getEventType());
    }

    // ── absence_deleted ───────────────────────────────────────────────────────

    public function testRecordAbsenceDeletedSetsAbsenceIdInContext(): void
    {
        $resident = $this->makeResident();
        $year     = $this->makeYear();
        $this->yrRepo->method('findOneBy')->willReturn(null);

        $persisted = null;
        $this->em->method('persist')->willReturnCallback(function ($e) use (&$persisted) { $persisted = $e; });
        $this->em->method('flush');

        $this->service->recordAbsenceDeleted($resident, $year, 321, $this->date('2024-11-10'));

        $this->assertSame('absence_deleted', $persisted->getEventType());
        $this->assertSame(321, $persisted->getContext()['absenceId']);
    }

    // ── validation_accepted ───────────────────────────────────────────────────

    public function testRecordValidationAcceptedSetsManagerActorType(): void
    {
        $resident = $this->makeResident();
        $year     = $this->makeYear();
        $this->yrRepo->method('findOneBy')->willReturn(null);

        $persisted = null;
        $this->em->method('persist')->willReturnCallback(function ($e) use (&$persisted) { $persisted = $e; });
        $this->em->method('flush');

        $this->service->recordValidationAccepted($resident, $year, 11, 2024, 7, 'Bien travaillé');

        $this->assertSame('validation_accepted', $persisted->getEventType());
        $this->assertSame('manager', $persisted->getActorType());
        $this->assertSame(7, $persisted->getActorId());
        $this->assertSame(11, $persisted->getMonth());
        $this->assertSame('Bien travaillé', $persisted->getContext()['managerComment']);
    }

    // ── validation_rejected ───────────────────────────────────────────────────

    public function testRecordValidationRejectedSetsCorrectType(): void
    {
        $resident = $this->makeResident();
        $year     = $this->makeYear();
        $this->yrRepo->method('findOneBy')->willReturn(null);

        $persisted = null;
        $this->em->method('persist')->willReturnCallback(function ($e) use (&$persisted) { $persisted = $e; });
        $this->em->method('flush');

        $this->service->recordValidationRejected($resident, $year, 11, 2024, 7, 'Vérifier gardes');

        $this->assertSame('validation_rejected', $persisted->getEventType());
        $this->assertSame('Vérifier gardes', $persisted->getContext()['residentNotification']);
    }

    // ── validation_blocked_by_lock ────────────────────────────────────────────

    public function testRecordValidationBlockedByLockSetsEventType(): void
    {
        $resident = $this->makeResident();
        $year     = $this->makeYear();
        $this->yrRepo->method('findOneBy')->willReturn(null);

        $persisted = null;
        $this->em->method('persist')->willReturnCallback(function ($e) use (&$persisted) { $persisted = $e; });
        $this->em->method('flush');

        $this->service->recordValidationBlockedByLock($resident, $year, 11, 2024, 7);

        $this->assertSame('validation_blocked_by_lock', $persisted->getEventType());
        $this->assertSame(7, $persisted->getContext()['managerId']);
    }

    // ── blocked_modification_attempt ──────────────────────────────────────────

    public function testRecordBlockedModificationAttemptSetsEntityTypeInContext(): void
    {
        $resident = $this->makeResident();
        $year     = $this->makeYear();
        $this->yrRepo->method('findOneBy')->willReturn(null);

        $persisted = null;
        $this->em->method('persist')->willReturnCallback(function ($e) use (&$persisted) { $persisted = $e; });
        $this->em->method('flush');

        $this->service->recordBlockedModificationAttempt($resident, $year, 11, 2024, 'timesheet');

        $this->assertSame('blocked_modification_attempt', $persisted->getEventType());
        $this->assertSame('resident', $persisted->getActorType());
        $this->assertSame('timesheet', $persisted->getContext()['entityType']);
    }

    // ── persist + flush always called ─────────────────────────────────────────

    public function testPersistAndFlushAlwaysCalled(): void
    {
        $resident = $this->makeResident();
        $year     = $this->makeYear();
        $this->yrRepo->method('findOneBy')->willReturn(null);

        $this->em->expects($this->once())->method('persist');
        $this->em->expects($this->once())->method('flush');

        $this->service->recordBlockedModificationAttempt($resident, $year, 11, 2024, 'garde');
    }
}
