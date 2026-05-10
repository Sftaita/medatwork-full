<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\StaffPlannerAuditEvent;
use App\Entity\YearsResident;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
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
}
