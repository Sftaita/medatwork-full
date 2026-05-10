<?php

declare(strict_types=1);

namespace App\EventListener;

use App\Entity\Absence;
use App\Entity\Garde;
use App\Entity\StaffPlannerExportStatus;
use App\Entity\Timesheet;
use App\Repository\StaffPlannerExportStatusRepository;
use App\Repository\YearsResidentRepository;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Events;
use Doctrine\ORM\Event\PostFlushEventArgs;
use Doctrine\ORM\Event\PostPersistEventArgs;
use Doctrine\ORM\Event\PostRemoveEventArgs;
use Doctrine\ORM\Event\PostUpdateEventArgs;

/**
 * Marks StaffPlannerExportStatus as dirty when Timesheet, Garde, or Absence data
 * changes after a first export has occurred.
 *
 * Pattern: queue in postPersist/postUpdate/postRemove, then process + flush once in
 * postFlush. This avoids flushing inside a Doctrine event callback (which causes
 * recursion issues). The queue is cleared BEFORE the second flush to prevent loops.
 *
 * Only entities that have been exported at least once (downloadCount > 0 OR
 * lastGeneratedAt != null) are marked dirty. Entities with no export history
 * are silently skipped.
 */
#[AsDoctrineListener(event: Events::postPersist)]
#[AsDoctrineListener(event: Events::postUpdate)]
#[AsDoctrineListener(event: Events::postRemove)]
#[AsDoctrineListener(event: Events::postFlush)]
class ExportDirtySubscriber
{
    /** @var list<array{0: object, 1: string}> */
    private array $queue = [];

    public function __construct(
        private readonly StaffPlannerExportStatusRepository $statusRepo,
        private readonly YearsResidentRepository $yrRepo,
    ) {
    }

    public function postPersist(PostPersistEventArgs $args): void
    {
        $this->enqueue($args->getObject(), 'added');
    }

    public function postUpdate(PostUpdateEventArgs $args): void
    {
        $entity = $args->getObject();

        // Skip if the only changed field is isEditable — that's a system-level lock,
        // not a data modification (set by the validation workflow).
        $changeSet = $args->getObjectManager()->getUnitOfWork()->getEntityChangeSet($entity);
        if ($changeSet !== [] && array_keys($changeSet) === ['isEditable']) {
            return;
        }

        $this->enqueue($entity, 'modified');
    }

    public function postRemove(PostRemoveEventArgs $args): void
    {
        $this->enqueue($args->getObject(), 'deleted');
    }

    public function postFlush(PostFlushEventArgs $args): void
    {
        if ($this->queue === []) {
            return;
        }

        // Drain the queue BEFORE flushing to prevent re-entry.
        $toProcess   = $this->queue;
        $this->queue = [];

        $em          = $args->getObjectManager();
        $needsFlush  = false;

        foreach ($toProcess as [$entity, $verb]) {
            $status = $this->resolveStatus($entity);
            if ($status === null) {
                continue;
            }

            // Only mark dirty if there has been at least one export.
            if (!$status->hasBeenExported()) {
                continue;
            }

            $reason = $this->buildReason($entity, $verb);
            $status->markDirty($reason);
            $needsFlush = true;
        }

        if ($needsFlush) {
            $em->flush();
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function enqueue(object $entity, string $verb): void
    {
        if (!($entity instanceof Timesheet || $entity instanceof Garde || $entity instanceof Absence)) {
            return;
        }
        $this->queue[] = [$entity, $verb];
    }

    private function resolveStatus(object $entity): ?StaffPlannerExportStatus
    {
        $resident = $entity->getResident();
        $year     = $entity->getYear();

        if ($resident === null || $year === null) {
            return null;
        }

        // Pick the representative date: for Absence dateOfStart may be the day itself.
        $date = $entity->getDateOfStart();
        if ($date === null) {
            return null;
        }

        $month   = (int) $date->format('n');
        $calYear = (int) $date->format('Y');

        $yr = $this->yrRepo->findOneBy(['resident' => $resident, 'year' => $year]);
        if ($yr === null) {
            return null;
        }

        return $this->statusRepo->findForItem($yr, $month, $calYear);
    }

    private function buildReason(object $entity, string $verb): string
    {
        return match (true) {
            $entity instanceof Timesheet => 'timesheet_' . $verb,
            $entity instanceof Garde     => 'garde_' . $verb,
            $entity instanceof Absence   => 'absence_' . $verb,
            default                      => 'data_' . $verb,
        };
    }
}
