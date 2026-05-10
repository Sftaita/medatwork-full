<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\StaffPlannerExportBatch;
use App\Entity\Years;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<StaffPlannerExportBatch>
 */
class StaffPlannerExportBatchRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, StaffPlannerExportBatch::class);
    }

    /**
     * Returns all batches for a year, newest first.
     *
     * @return StaffPlannerExportBatch[]
     */
    public function findByYearNewestFirst(Years $year): array
    {
        return $this->createQueryBuilder('b')
            ->where('b.year = :year')
            ->setParameter('year', $year)
            ->orderBy('b.batchNumber', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Returns the next batch number for a year (MAX + 1, or 1 if none).
     * This is used as input to INSERT — the unique constraint (year_id, batch_number)
     * acts as the final safety net against race conditions.
     */
    public function nextBatchNumber(Years $year): int
    {
        $conn   = $this->getEntityManager()->getConnection();
        $result = $conn->executeQuery(
            'SELECT COALESCE(MAX(batch_number), 0) + 1 FROM staff_planner_export_batch WHERE year_id = ?',
            [$year->getId()],
        );
        return (int) $result->fetchOne();
    }
}
