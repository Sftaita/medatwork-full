<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ComplianceAlert;
use App\Entity\Resident;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ComplianceAlert>
 */
class ComplianceAlertRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ComplianceAlert::class);
    }

    public function findByFingerprint(string $fingerprint): ?ComplianceAlert
    {
        return $this->findOneBy(['fingerprint' => $fingerprint]);
    }

    /** @return ComplianceAlert[] */
    public function findOpenByResident(Resident $resident): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.resident = :resident')
            ->andWhere('a.status = :status')
            ->setParameter('resident', $resident)
            ->setParameter('status', 'open')
            ->orderBy('a.weekStart', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /** @return ComplianceAlert[] */
    public function findByResidentAndPeriod(Resident $resident, string $from, string $to): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.resident = :resident')
            ->andWhere('a.weekStart >= :from')
            ->andWhere('a.weekStart <= :to')
            ->setParameter('resident', $resident)
            ->setParameter('from', $from)
            ->setParameter('to', $to)
            ->orderBy('a.weekStart', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
