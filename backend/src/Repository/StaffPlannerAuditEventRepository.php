<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\StaffPlannerAuditEvent;
use App\Entity\Years;
use App\Entity\YearsResident;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<StaffPlannerAuditEvent>
 */
class StaffPlannerAuditEventRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, StaffPlannerAuditEvent::class);
    }

    /**
     * Returns all audit events for a specific MACCS × month, newest first.
     *
     * @return StaffPlannerAuditEvent[]
     */
    public function findByMaccs(YearsResident $yr, int $month, int $calendarYear): array
    {
        return $this->createQueryBuilder('e')
            ->where('e.yearsResident = :yr')
            ->andWhere('e.month = :month')
            ->andWhere('e.calendarYear = :calYear')
            ->setParameter('yr', $yr)
            ->setParameter('month', $month)
            ->setParameter('calYear', $calendarYear)
            ->orderBy('e.occurredAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Returns all audit events for a MACCS (all months), newest first.
     *
     * @return StaffPlannerAuditEvent[]
     */
    public function findAllByYearsResident(YearsResident $yr): array
    {
        return $this->createQueryBuilder('e')
            ->where('e.yearsResident = :yr')
            ->setParameter('yr', $yr)
            ->orderBy('e.occurredAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Returns all audit events linked to an export batch, newest first.
     *
     * @return StaffPlannerAuditEvent[]
     */
    public function findAllByBatch(int $batchId): array
    {
        return $this->createQueryBuilder('e')
            ->where('e.batch = :batchId')
            ->setParameter('batchId', $batchId)
            ->orderBy('e.occurredAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Paginated global timeline for a year with optional filters.
     *
     * @param array{
     *   eventType?: string,
     *   actorType?: string,
     *   actorId?: int,
     *   month?: int,
     *   calendarYear?: int,
     *   yearResidentId?: int,
     *   batchId?: int,
     *   from?: string,
     *   to?: string,
     * } $filters
     * @return StaffPlannerAuditEvent[]
     */
    public function findByYearPaginated(Years $year, array $filters, int $page, int $limit): array
    {
        $qb = $this->baseByYear($year);
        $this->applyFilters($qb, $filters);

        return $qb
            ->orderBy('e.occurredAt', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /** @param array<string, mixed> $filters */
    public function countByYear(Years $year, array $filters): int
    {
        $qb = $this->baseByYear($year)->select('COUNT(e.id)');
        $this->applyFilters($qb, $filters);

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function baseByYear(Years $year): QueryBuilder
    {
        return $this->createQueryBuilder('e')
            ->where('e.year = :year')
            ->setParameter('year', $year);
    }

    /** @param array<string, mixed> $filters */
    private function applyFilters(QueryBuilder $qb, array $filters): void
    {
        if (!empty($filters['eventType'])) {
            $qb->andWhere('e.eventType = :eventType')
               ->setParameter('eventType', $filters['eventType']);
        }
        if (!empty($filters['actorType'])) {
            $qb->andWhere('e.actorType = :actorType')
               ->setParameter('actorType', $filters['actorType']);
        }
        if (!empty($filters['actorId'])) {
            $qb->andWhere('e.actorId = :actorId')
               ->setParameter('actorId', (int) $filters['actorId']);
        }
        if (!empty($filters['month'])) {
            $qb->andWhere('e.month = :month')
               ->setParameter('month', (int) $filters['month']);
        }
        if (!empty($filters['calendarYear'])) {
            $qb->andWhere('e.calendarYear = :calendarYear')
               ->setParameter('calendarYear', (int) $filters['calendarYear']);
        }
        if (!empty($filters['yearResidentId'])) {
            $qb->andWhere('e.yearsResident = :yrId')
               ->setParameter('yrId', (int) $filters['yearResidentId']);
        }
        if (!empty($filters['batchId'])) {
            $qb->andWhere('e.batch = :batchId')
               ->setParameter('batchId', (int) $filters['batchId']);
        }
        if (!empty($filters['from'])) {
            $qb->andWhere('e.occurredAt >= :from')
               ->setParameter('from', new \DateTime($filters['from']));
        }
        if (!empty($filters['to'])) {
            $qb->andWhere('e.occurredAt <= :to')
               ->setParameter('to', new \DateTime($filters['to']));
        }
    }
}
