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
     * Returns all batches for a year, newest first (no pagination).
     * Used internally — do NOT expose without pagination on large datasets.
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
     * Paginated batch list for a year with optional filters.
     *
     * @param array{
     *   batchNumber?: int|null,
     *   generatedByType?: string|null,
     *   from?: string|null,
     *   to?: string|null,
     * } $filters
     * @return StaffPlannerExportBatch[]
     */
    public function findByYearPaginated(Years $year, int $page, int $limit, array $filters = []): array
    {
        $qb = $this->createQueryBuilder('b')
            ->where('b.year = :year')
            ->setParameter('year', $year)
            ->orderBy('b.batchNumber', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit);

        $this->applyFilters($qb, $filters);

        return $qb->getQuery()->getResult();
    }

    /**
     * Total count for pagination metadata.
     *
     * @param array<string, mixed> $filters
     */
    public function countByYear(Years $year, array $filters = []): int
    {
        $qb = $this->createQueryBuilder('b')
            ->select('COUNT(b.id)')
            ->where('b.year = :year')
            ->setParameter('year', $year);

        $this->applyFilters($qb, $filters);

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    /**
     * Returns the next batch number for a year (MAX + 1, or 1 if none).
     * The unique constraint (year_id, batch_number) is the final safety net.
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

    // ── Private helpers ───────────────────────────────────────────────────────

    /** @param array<string, mixed> $filters */
    private function applyFilters(\Doctrine\ORM\QueryBuilder $qb, array $filters): void
    {
        if (!empty($filters['batchNumber'])) {
            $qb->andWhere('b.batchNumber = :batchNumber')
                ->setParameter('batchNumber', (int) $filters['batchNumber']);
        }

        if (!empty($filters['generatedByType'])) {
            $qb->andWhere('b.generatedByType = :generatedByType')
                ->setParameter('generatedByType', $filters['generatedByType']);
        }

        if (!empty($filters['from'])) {
            $qb->andWhere('b.generatedAt >= :from')
                ->setParameter('from', new \DateTimeImmutable($filters['from']));
        }

        if (!empty($filters['to'])) {
            $qb->andWhere('b.generatedAt <= :to')
                ->setParameter('to', new \DateTimeImmutable($filters['to'] . ' 23:59:59'));
        }
    }
}
