<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Years;
use App\Entity\YearsResident;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<YearsResident>
 */
class YearsResidentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, YearsResident::class);
    }

    /**
     * Return years of the current resident.
     *
     * @return array<int,array<string,mixed>>
     */
    public function findYearList(\App\Entity\Resident $user): array
    {
        return $this->createQueryBuilder('y')
                    ->leftJoin('y.year', 'year')
                    ->andWhere('y.resident = :val')
                    ->setParameter('val', $user)
                    ->select('year.id,y.allowed, year.title, year.dateOfStart, year.dateOfEnd, year.location, year.period, year.master, year.token')
                    ->orderBy('year.id', 'DESC')
                    ->getQuery()
                    ->getResult();
    }

    /**
     * List of all residents (allowed and not allowed) linked to the given year
     *
     * @return list<array<string, mixed>>
     */
    public function findYearResidents(int $year): array
    {
        return $this->createQueryBuilder('y')
            ->andWhere('y.year = :val')
            ->setParameter('val', $year)
            ->leftJoin('y.resident', 'resident')
            ->select('y.id, y.allowed, resident.id as residentId, resident.firstname, resident.lastname, resident.email,y.dateOfStart, y.allowed, y.optingOut')
            ->orderBy('y.allowed', 'DESC')
            ->addOrderBy('resident.lastname', 'ASC')
            ->getQuery()
            ->getResult();
        ;
    }

    /**
     * List of residents linked to the given year that where accepted by Managers
     *
     * @return list<array<string, mixed>>
     */
    public function findYearAllowedResidents(Years|int $year): array
    {
        return $this->createQueryBuilder('y')
            ->andWhere('y.year = :val')
            ->andWhere('y.allowed = true')
            ->setParameter('val', $year)
            ->leftJoin('y.resident', 'resident')
            ->select('y.id, y.allowed, resident.id as residentId, resident.firstname, resident.lastname, resident.email,y.dateOfStart, y.allowed, y.optingOut')
            ->orderBy('resident.lastname', 'ASC')
            ->getQuery()
            ->getResult();
        ;
    }

    /**
     * Check if the resident↔year link exists.
     */
    public function checkLink(\App\Entity\Resident $user, \App\Entity\Years $year): bool
    {
        $check = $this->createQueryBuilder('y')
            ->andWhere('y.year = :year')
            ->andWhere('y.resident = :resident')
            ->setParameter('year', $year)
            ->setParameter('resident', $user)
            ->select('y')
            ->getQuery()
            ->getOneOrNullResult();
        ;

        if ($check) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Get the total number of leave days for a given yearsResident ID.
     *
     * @param int $yearsResidentId The ID of the yearsResident entity.
     * @return int The total number of leave days.
     */
    public function getTotalLeaveDays(int $yearsResidentId): int
    {
        $qb = $this->createQueryBuilder('yr')
            ->select('SUM(COALESCE(yr.legalLeaves, 0)) + SUM(COALESCE(yr.scientificLeaves, 0)) + SUM(COALESCE(yr.paternityLeave, 0)) + SUM(COALESCE(yr.maternityLeave, 0)) + SUM(COALESCE(yr.unpaidLeave, 0)) as total_leave_days')
            ->where('yr.id = :yearsResidentId')
            ->setParameter('yearsResidentId', $yearsResidentId);

        $result = $qb->getQuery()->getSingleResult();

        return (int) $result['total_leave_days'];
    }




    // /**
    //  * @return YearsResident[] Returns an array of YearsResident objects
    //  */
    /*
    public function findByExampleField($value)
    {
        return $this->createQueryBuilder('y')
            ->andWhere('y.exampleField = :val')
            ->setParameter('val', $value)
            ->orderBy('y.id', 'ASC')
            ->setMaxResults(10)
            ->getQuery()
            ->getResult()
        ;
    }
    */

    /*
    public function findOneBySomeField($value): ?YearsResident
    {
        return $this->createQueryBuilder('y')
            ->andWhere('y.exampleField = :val')
            ->setParameter('val', $value)
            ->getQuery()
            ->getOneOrNullResult()
        ;
    }
    */

    /**
     * Find the YearsResident record for a resident whose academic year overlaps a given period.
     * Returns the most recent one if multiple years overlap (edge case).
     */
    public function findOneForResidentInPeriod(
        \App\Entity\Resident $resident,
        \DateTimeImmutable $periodStart,
        \DateTimeImmutable $periodEnd,
    ): ?YearsResident {
        return $this->createQueryBuilder('yr')
            ->join('yr.year', 'y')
            ->where('yr.resident = :resident')
            ->andWhere('y.dateOfStart <= :periodEnd')
            ->andWhere('y.dateOfEnd >= :periodStart')
            ->setParameter('resident', $resident)
            ->setParameter('periodStart', $periodStart->format('Y-m-d'))
            ->setParameter('periodEnd', $periodEnd->format('Y-m-d'))
            ->orderBy('y.dateOfStart', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Returns all distinct hospital IDs associated with a resident via their academic years.
     * Used for scoping communication messages to the resident's hospital(s).
     *
     * @return int[]
     */
    public function findHospitalIdsByResident(int $residentId): array
    {
        $rows = $this->createQueryBuilder('yr')
            ->join('yr.year', 'y')
            ->join('y.hospital', 'h')
            ->where('yr.resident = :residentId')
            ->setParameter('residentId', $residentId)
            ->select('h.id')
            ->distinct()
            ->getQuery()
            ->getScalarResult();

        return array_column($rows, 'id');
    }

    /**
     * Load multiple YearsResident entities by primary key in a single query
     * and return them indexed by their ID — eliminates the N+1 find() per
     * resident in the statistics controllers.
     *
     * @param int[] $ids
     * @return array<int, YearsResident>
     */
    public function findByIds(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        $results = $this->findBy(['id' => $ids]);
        $indexed = [];
        foreach ($results as $yearResident) {
            $indexed[$yearResident->getId()] = $yearResident;
        }

        return $indexed;
    }
}
