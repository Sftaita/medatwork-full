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
}
