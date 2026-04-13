<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\PeriodValidation;
use App\Entity\Years;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<PeriodValidation>
 */
class PeriodValidationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PeriodValidation::class);
    }

    /**
     * Find previous month that havent been validated
     *
     * @return array<int,mixed>
     */
    public function findMonthToValidate(Years $year, string $today, string $validationLimit): array
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('p.validatedBy', 'manager')
            ->andWhere('p.year = :year')
            ->andWhere('(p.endLimite < :today)')
            ->andWhere('p.validated = :condition OR p.validatedAt >=:limit')
            ->setParameter('year', $year)
            ->setParameter('today', $today)
            ->setParameter('condition', false)
            ->setParameter('limit', $validationLimit)
            ->orderBy('p.endLimite', 'ASC')
            ->select('p.id, p.month, p.yearNb as year,p.validated, p.validatedAt, p.unvalidatedAt, manager.firstname, manager.lastname')
            ->getQuery()
            ->getResult()
        ;
    }

    /** @return list<array<string, mixed>> */
    public function fetchInWaitingPeriodForActiveYear(Years $year, string $today): array
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('p.validatedBy', 'manager')
            ->leftJoin('p.year', 'y')
            ->andWhere('y.id = :year')
            ->andWhere('(y.dateOfStart <= :today AND  y.dateOfEnd >=:today)')
            ->andWhere('p.validated = false')
            ->setParameter('today', $today)
            ->setParameter('year', $year)
            ->select('y.title, p.id as periodId, p.month, p.yearNb as year, p.validated, p.validatedAt, p.unvalidatedAt, manager.firstname, manager.lastname')
            ->getQuery()
            ->getResult()
        ;
    }

    /** @return list<array<string, mixed>> */
    public function fetchInWaitingPeriod(Years $year): array
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('p.validatedBy', 'manager')
            ->leftJoin('p.year', 'y')
            ->andWhere('y.id = :year')
            ->andWhere('p.validated = false')
            ->setParameter('year', $year)
            ->select('y.title, p.id as periodId, p.month, p.yearNb as year, p.validated, p.validatedAt, p.unvalidatedAt, manager.firstname, manager.lastname')
            ->getQuery()
            ->getResult()
        ;
    }

    /** @return list<array<string, mixed>> */
    public function fetchValidatedPeriodForActiveYear(Years $year, string $today): array
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('p.validatedBy', 'manager')
            ->leftJoin('p.year', 'y')
            ->andWhere('y.id = :year')
            ->andWhere('(y.dateOfStart <= :today AND  y.dateOfEnd >=:today)')
            ->andWhere('p.validated = true')
            ->setParameter('today', $today)
            ->setParameter('year', $year)
            ->select('y.title, p.id as periodId, p.month, p.yearNb as year, p.validated, p.validatedAt, p.unvalidatedAt, manager.firstname, manager.lastname')
            ->getQuery()
            ->getResult()
        ;
    }


    /** @return list<array<string, mixed>> */
    public function fetchValidatedPeriod(Years $year): array
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('p.validatedBy', 'manager')
            ->leftJoin('p.year', 'y')
            ->andWhere('y.id = :year')
            ->andWhere('p.validated = true')
            ->setParameter('year', $year)
            ->select('y.title, p.id as periodId, p.month, p.yearNb as year, p.validated, p.validatedAt, p.unvalidatedAt, manager.firstname, manager.lastname')
            ->getQuery()
            ->getResult()
        ;
    }


    /*
    public function findOneBySomeField($value): ?PeriodValidation
    {
        return $this->createQueryBuilder('p')
            ->andWhere('p.exampleField = :val')
            ->setParameter('val', $value)
            ->getQuery()
            ->getOneOrNullResult()
        ;
    }
    */
}
