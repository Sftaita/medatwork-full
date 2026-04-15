<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\HospitalAdminAuditLog;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<HospitalAdminAuditLog>
 */
class HospitalAdminAuditLogRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, HospitalAdminAuditLog::class);
    }

    /**
     * @return HospitalAdminAuditLog[]
     */
    public function findByHospital(int $hospitalId, int $limit = 100, int $offset = 0): array
    {
        return $this->createQueryBuilder('l')
            ->where('l.hospitalId = :hospitalId')
            ->setParameter('hospitalId', $hospitalId)
            ->orderBy('l.createdAt', 'DESC')
            ->setMaxResults($limit)
            ->setFirstResult($offset)
            ->getQuery()
            ->getResult();
    }

    public function countByHospital(int $hospitalId): int
    {
        return (int) $this->createQueryBuilder('l')
            ->select('COUNT(l.id)')
            ->where('l.hospitalId = :hospitalId')
            ->setParameter('hospitalId', $hospitalId)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Fetch all logs across all hospitals (super-admin view), with optional filters.
     *
     * @param array{hospitalId?: int, action?: string, entityType?: string, status?: string, dateFrom?: string, dateTo?: string} $filters
     * @return HospitalAdminAuditLog[]
     */
    public function findWithFilters(array $filters, int $limit = 100, int $offset = 0): array
    {
        $qb = $this->createQueryBuilder('l')->orderBy('l.createdAt', 'DESC');
        $this->applyFilters($qb, $filters);

        return $qb
            ->setMaxResults($limit)
            ->setFirstResult($offset)
            ->getQuery()
            ->getResult();
    }

    /** @param array{hospitalId?: int, action?: string, entityType?: string, status?: string, dateFrom?: string, dateTo?: string} $filters */
    public function countWithFilters(array $filters): int
    {
        $qb = $this->createQueryBuilder('l')->select('COUNT(l.id)');
        $this->applyFilters($qb, $filters);

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    private function applyFilters(\Doctrine\ORM\QueryBuilder $qb, array $filters): void
    {
        if (!empty($filters['hospitalId'])) {
            $qb->andWhere('l.hospitalId = :hospitalId')
               ->setParameter('hospitalId', $filters['hospitalId']);
        }
        if (!empty($filters['action'])) {
            $qb->andWhere('l.action = :action')
               ->setParameter('action', $filters['action']);
        }
        if (!empty($filters['entityType'])) {
            $qb->andWhere('l.entityType = :entityType')
               ->setParameter('entityType', $filters['entityType']);
        }
        if (!empty($filters['status'])) {
            $qb->andWhere('l.status = :status')
               ->setParameter('status', $filters['status']);
        }
        if (!empty($filters['dateFrom'])) {
            $from = \DateTime::createFromFormat('Y-m-d', $filters['dateFrom']);
            if ($from !== false) {
                $from->setTime(0, 0, 0);
                $qb->andWhere('l.createdAt >= :dateFrom')->setParameter('dateFrom', $from);
            }
        }
        if (!empty($filters['dateTo'])) {
            $to = \DateTime::createFromFormat('Y-m-d', $filters['dateTo']);
            if ($to !== false) {
                $to->setTime(23, 59, 59);
                $qb->andWhere('l.createdAt <= :dateTo')->setParameter('dateTo', $to);
            }
        }
    }
}
