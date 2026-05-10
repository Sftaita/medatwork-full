<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\StaffPlannerExportBatch;
use App\Entity\StaffPlannerExportItemSnapshot;
use App\Entity\YearsResident;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<StaffPlannerExportItemSnapshot>
 */
class StaffPlannerExportItemSnapshotRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, StaffPlannerExportItemSnapshot::class);
    }

    /**
     * Returns snapshots for a batch WITHOUT payloadLines (light list for UI).
     * Uses JOIN FETCH to avoid N+1 on yearsResident → resident.
     *
     * Note: DQL cannot select a subset of fields on an entity with associations;
     * we fetch the full entities but keep payloadLines in DB (not excluded at query level).
     * The controller is responsible for NOT serializing payloadLines in list responses.
     *
     * @return StaffPlannerExportItemSnapshot[]
     */
    public function findByBatchWithResident(StaffPlannerExportBatch $batch): array
    {
        return $this->createQueryBuilder('s')
            ->addSelect('yr', 'r')
            ->join('s.yearsResident', 'yr')
            ->join('yr.resident', 'r')
            ->where('s.batch = :batch')
            ->setParameter('batch', $batch)
            ->orderBy('s.calendarYear', 'ASC')
            ->addOrderBy('s.month', 'ASC')
            ->addOrderBy('r.lastname', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Returns all snapshots for a batch (legacy, no JOIN FETCH).
     * Kept for backward compatibility — prefer findByBatchWithResident() for new code.
     *
     * @return StaffPlannerExportItemSnapshot[]
     */
    public function findByBatch(StaffPlannerExportBatch $batch): array
    {
        return $this->findByBatchWithResident($batch);
    }

    /**
     * Returns a single snapshot with its batch, yearsResident and resident eagerly loaded.
     * Used for the detail endpoint (includes payloadLines).
     */
    public function findByIdWithDetails(int $id): ?StaffPlannerExportItemSnapshot
    {
        return $this->createQueryBuilder('s')
            ->addSelect('b', 'yr', 'r')
            ->join('s.batch', 'b')
            ->join('s.yearsResident', 'yr')
            ->join('yr.resident', 'r')
            ->where('s.id = :id')
            ->setParameter('id', $id)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Returns all snapshots for a specific MACCS across all batches, newest batch first.
     * Used to reconstruct the export history for one MACCS.
     *
     * @return StaffPlannerExportItemSnapshot[]
     */
    public function findByYearsResidentNewestFirst(YearsResident $yr, int $month, int $calendarYear): array
    {
        return $this->createQueryBuilder('s')
            ->join('s.batch', 'b')
            ->where('s.yearsResident = :yr')
            ->andWhere('s.month = :month')
            ->andWhere('s.calendarYear = :calYear')
            ->setParameter('yr', $yr)
            ->setParameter('month', $month)
            ->setParameter('calYear', $calendarYear)
            ->orderBy('b.batchNumber', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Count of snapshots for a batch — used for pagination metadata.
     */
    public function countByBatch(StaffPlannerExportBatch $batch): int
    {
        return (int) $this->createQueryBuilder('s')
            ->select('COUNT(s.id)')
            ->where('s.batch = :batch')
            ->setParameter('batch', $batch)
            ->getQuery()
            ->getSingleScalarResult();
    }
}
