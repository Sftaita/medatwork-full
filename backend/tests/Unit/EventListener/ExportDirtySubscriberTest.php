<?php

declare(strict_types=1);

namespace App\Tests\Unit\EventListener;

use App\Entity\Absence;
use App\Entity\Garde;
use App\Entity\Resident;
use App\Entity\StaffPlannerExportStatus;
use App\Entity\Timesheet;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\EventListener\ExportDirtySubscriber;
use App\Repository\StaffPlannerExportStatusRepository;
use App\Repository\YearsResidentRepository;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Event\PostFlushEventArgs;
use Doctrine\ORM\Event\PostPersistEventArgs;
use Doctrine\ORM\Event\PostRemoveEventArgs;
use Doctrine\ORM\Event\PostUpdateEventArgs;
use Doctrine\ORM\UnitOfWork;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

/**
 * Tests for ExportDirtySubscriber.
 *
 * Doctrine event arg classes are final — they cannot be mocked with createMock().
 * We instantiate them directly with real constructors instead.
 */
final class ExportDirtySubscriberTest extends TestCase
{
    private StaffPlannerExportStatusRepository&MockObject $statusRepo;
    private YearsResidentRepository&MockObject $yrRepo;
    private EntityManagerInterface&MockObject $em;
    private ExportDirtySubscriber $subscriber;

    protected function setUp(): void
    {
        $this->statusRepo = $this->createMock(StaffPlannerExportStatusRepository::class);
        $this->yrRepo     = $this->createMock(YearsResidentRepository::class);
        $this->em         = $this->createMock(EntityManagerInterface::class);

        $this->subscriber = new ExportDirtySubscriber(
            $this->statusRepo,
            $this->yrRepo,
        );
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private function makeResident(): Resident&MockObject
    {
        $r = $this->createMock(Resident::class);
        $r->method('getId')->willReturn(1);
        return $r;
    }

    private function makeYear(): Years&MockObject
    {
        $y = $this->createMock(Years::class);
        $y->method('getId')->willReturn(10);
        return $y;
    }

    private function makeYr(): YearsResident&MockObject
    {
        $yr = $this->createMock(YearsResident::class);
        $yr->method('getId')->willReturn(100);
        return $yr;
    }

    private function makeStatus(int $downloadCount = 0): StaffPlannerExportStatus
    {
        $s = new StaffPlannerExportStatus();
        for ($i = 0; $i < $downloadCount; $i++) {
            $s->recordGeneration();
        }
        return $s;
    }

    private function makeTimesheet(): Timesheet&MockObject
    {
        $t = $this->createMock(Timesheet::class);
        $t->method('getResident')->willReturn($this->makeResident());
        $t->method('getYear')->willReturn($this->makeYear());
        $t->method('getDateOfStart')->willReturn(new \DateTime('2024-11-04 08:00:00'));
        return $t;
    }

    private function makeGarde(): Garde&MockObject
    {
        $g = $this->createMock(Garde::class);
        $g->method('getResident')->willReturn($this->makeResident());
        $g->method('getYear')->willReturn($this->makeYear());
        $g->method('getDateOfStart')->willReturn(new \DateTime('2024-11-10 20:00:00'));
        return $g;
    }

    private function makeAbsence(): Absence&MockObject
    {
        $a = $this->createMock(Absence::class);
        $a->method('getResident')->willReturn($this->makeResident());
        $a->method('getYear')->willReturn($this->makeYear());
        $a->method('getDateOfStart')->willReturn(new \DateTime('2024-11-20'));
        return $a;
    }

    // Doctrine event args are final — instantiate directly, do NOT mock.
    private function persist(object $entity): PostPersistEventArgs
    {
        return new PostPersistEventArgs($entity, $this->em);
    }

    private function update(object $entity, array $changeSet = []): PostUpdateEventArgs
    {
        $uow = $this->createMock(UnitOfWork::class);
        $uow->method('getEntityChangeSet')->willReturn($changeSet);
        $this->em->method('getUnitOfWork')->willReturn($uow);
        return new PostUpdateEventArgs($entity, $this->em);
    }

    private function remove(object $entity): PostRemoveEventArgs
    {
        return new PostRemoveEventArgs($entity, $this->em);
    }

    private function flush(): PostFlushEventArgs
    {
        return new PostFlushEventArgs($this->em);
    }

    private function wireStatus(StaffPlannerExportStatus $status): void
    {
        $yr = $this->makeYr();
        $this->yrRepo->method('findOneBy')->willReturn($yr);
        $this->statusRepo->method('findForItem')->willReturn($status);
    }

    // ── Timesheet added after export → dirty ─────────────────────────────────

    public function testTimesheetAddedAfterExportMarksDirty(): void
    {
        $status = $this->makeStatus(downloadCount: 1);
        $this->wireStatus($status);

        $this->subscriber->postPersist($this->persist($this->makeTimesheet()));
        $this->em->expects($this->once())->method('flush');
        $this->subscriber->postFlush($this->flush());

        $this->assertTrue($status->isDirtySinceExport());
        $this->assertSame('timesheet_added', $status->getDirtyReason());
    }

    // ── Garde added after export → dirty ─────────────────────────────────────

    public function testGardeAddedAfterExportMarksDirty(): void
    {
        $status = $this->makeStatus(downloadCount: 1);
        $this->wireStatus($status);

        $this->subscriber->postPersist($this->persist($this->makeGarde()));
        $this->em->expects($this->once())->method('flush');
        $this->subscriber->postFlush($this->flush());

        $this->assertTrue($status->isDirtySinceExport());
        $this->assertSame('garde_added', $status->getDirtyReason());
    }

    // ── Absence deleted after export → dirty ─────────────────────────────────

    public function testAbsenceDeletedAfterExportMarksDirty(): void
    {
        $status = $this->makeStatus(downloadCount: 1);
        $this->wireStatus($status);

        $this->subscriber->postRemove($this->remove($this->makeAbsence()));
        $this->em->expects($this->once())->method('flush');
        $this->subscriber->postFlush($this->flush());

        $this->assertTrue($status->isDirtySinceExport());
        $this->assertSame('absence_deleted', $status->getDirtyReason());
    }

    // ── No dirty before first export ──────────────────────────────────────────

    public function testTimesheetAddedBeforeFirstExportDoesNotMarkDirty(): void
    {
        $status = $this->makeStatus(downloadCount: 0);
        $this->wireStatus($status);

        $this->subscriber->postPersist($this->persist($this->makeTimesheet()));
        $this->em->expects($this->never())->method('flush');
        $this->subscriber->postFlush($this->flush());

        $this->assertFalse($status->isDirtySinceExport());
    }

    public function testGardeAddedBeforeFirstExportDoesNotMarkDirty(): void
    {
        $status = $this->makeStatus(downloadCount: 0);
        $this->wireStatus($status);

        $this->subscriber->postPersist($this->persist($this->makeGarde()));
        $this->em->expects($this->never())->method('flush');
        $this->subscriber->postFlush($this->flush());

        $this->assertFalse($status->isDirtySinceExport());
    }

    public function testAbsenceAddedBeforeFirstExportDoesNotMarkDirty(): void
    {
        $status = $this->makeStatus(downloadCount: 0);
        $this->wireStatus($status);

        $this->subscriber->postPersist($this->persist($this->makeAbsence()));
        $this->em->expects($this->never())->method('flush');
        $this->subscriber->postFlush($this->flush());

        $this->assertFalse($status->isDirtySinceExport());
    }

    public function testNoStatusFoundDoesNotMarkDirty(): void
    {
        $yr = $this->makeYr();
        $this->yrRepo->method('findOneBy')->willReturn($yr);
        $this->statusRepo->method('findForItem')->willReturn(null);

        $this->subscriber->postPersist($this->persist($this->makeTimesheet()));
        $this->em->expects($this->never())->method('flush');
        $this->subscriber->postFlush($this->flush());
    }

    // ── isEditable-only change is NOT dirty ───────────────────────────────────

    public function testIsEditableOnlyChangeDoesNotMarkDirty(): void
    {
        $status = $this->makeStatus(downloadCount: 1);
        $this->wireStatus($status);

        $timesheet = $this->makeTimesheet();
        $this->subscriber->postUpdate($this->update($timesheet, ['isEditable' => [true, false]]));
        $this->em->expects($this->never())->method('flush');
        $this->subscriber->postFlush($this->flush());

        $this->assertFalse($status->isDirtySinceExport());
    }

    // ── Timesheet modified (real change) IS dirty ─────────────────────────────

    public function testTimesheetModifiedAfterExportMarksDirty(): void
    {
        $status = $this->makeStatus(downloadCount: 1);
        $this->wireStatus($status);

        $timesheet = $this->makeTimesheet();
        // changeSet has pause AND isEditable — should still be dirty
        $this->subscriber->postUpdate($this->update($timesheet, ['pause' => [30, 60], 'isEditable' => [true, true]]));
        $this->em->expects($this->once())->method('flush');
        $this->subscriber->postFlush($this->flush());

        $this->assertTrue($status->isDirtySinceExport());
        $this->assertSame('timesheet_modified', $status->getDirtyReason());
    }

    // ── Non-tracked entity is ignored ────────────────────────────────────────

    public function testNonTrackedEntityIsIgnored(): void
    {
        $other = new class {};
        $this->yrRepo->expects($this->never())->method('findOneBy');

        $this->subscriber->postPersist($this->persist($other));
        $this->em->expects($this->never())->method('flush');
        $this->subscriber->postFlush($this->flush());
    }

    // ── Empty postFlush does not flush ────────────────────────────────────────

    public function testPostFlushDoesNothingWhenQueueIsEmpty(): void
    {
        $this->em->expects($this->never())->method('flush');
        $this->subscriber->postFlush($this->flush());
    }

    // ── Queue drained before flush → no recursion ────────────────────────────

    public function testQueueIsDrainedBeforeFlushToPreventRecursion(): void
    {
        $status = $this->makeStatus(downloadCount: 1);
        $this->wireStatus($status);

        $this->subscriber->postPersist($this->persist($this->makeTimesheet()));

        // First postFlush — should flush once
        $this->em->expects($this->once())->method('flush');
        $this->subscriber->postFlush($this->flush());

        // Second postFlush — queue already empty, must NOT flush again
        // (expects once() above already covers this, but we confirm no exception)
        $this->subscriber->postFlush($this->flush());
    }
}
