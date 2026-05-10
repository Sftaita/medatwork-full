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
     * Returns all snapshots for a batch, ordered by (calendarYear, month, yearsResident).
     *
     * @return StaffPlannerExportItemSnapshot[]
     */
    public function findByBatch(StaffPlannerExportBatch $batch): array
    {
        return $this->createQueryBuilder('s')
            ->where('s.batch = :batch')
            ->setParameter('batch', $batch)
            ->orderBy('s.calendarYear', 'ASC')
            ->addOrderBy('s.month', 'ASC')
            ->getQuery()
            ->getResult();
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
}
