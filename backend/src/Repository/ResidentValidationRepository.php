<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Resident;
use App\Entity\ResidentValidation;
use App\Entity\Years;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ResidentValidation>
 */
class ResidentValidationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ResidentValidation::class);
    }

    /** @return list<array<string, mixed>> */
    public function fetchPeriodsForActiveYear(Years $year, string $today): array
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('p.periodValidation', 'period')
            ->leftJoin('p.validatedBy', 'manager')
            ->leftJoin('p.resident', 'resident')
            ->leftJoin('period.year', 'y')
            ->andWhere('y.id = :year')
            ->andWhere('(y.dateOfStart <= :today AND  y.dateOfEnd >=:today)')
            ->andWhere('p.validated = true')
            ->setParameter('today', $today)
            ->setParameter('year', $year)
            ->select('p')
            ->select('y.title as yearTitle, p.id as residentValidationId,resident.id as residentId, resident.firstname as residentFirstname, resident.lastname as residentLastname, period.month, period.yearNb as year, p.validated, p.validationHistory, manager.firstname, manager.lastname')
            ->getQuery()
            ->getResult()
        ;
    }

    /** @return list<array<string, mixed>> */
    public function fetchAllPeriodsYear(Years $year): array
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('p.periodValidation', 'period')
            ->leftJoin('p.validatedBy', 'manager')
            ->leftJoin('p.resident', 'resident')
            ->leftJoin('period.year', 'y')
            ->andWhere('y.id = :year')
            ->andWhere('p.validated = true')
            ->setParameter('year', $year)
            ->select('p')
            ->select('y.title as yearTitle, p.id as residentValidationId,resident.id as residentId, resident.firstname as residentFirstname, resident.lastname as residentLastname, period.month, period.yearNb as year, p.validated, p.validationHistory, manager.firstname, manager.lastname')
            ->getQuery()
            ->getResult()
        ;
    }

    public function checkIfMonthHasBeenValidated(int $monthNb, int $yearNb, Resident $residentId): bool
    {
        $result = $this->createQueryBuilder('p')
            ->select('COUNT(p)')
            ->leftJoin('p.periodValidation', 'period')
            ->where('p.resident = :residentId')
            ->andWhere('p.validated = true')
            ->andWhere('period.month = :monthNb')
            ->andWhere('period.yearNb = :yearNb')
            ->setParameters([
                'residentId' => $residentId,
                'monthNb' => $monthNb,
                'yearNb' => $yearNb,
            ])
            ->getQuery()
            ->getSingleScalarResult();

        return $result > 0;
    }



    /*
    public function findOneBySomeField($value): ?ResidentValidation
    {
        return $this->createQueryBuilder('r')
            ->andWhere('r.exampleField = :val')
            ->setParameter('val', $value)
            ->getQuery()
            ->getOneOrNullResult()
        ;
    }
    */
}
